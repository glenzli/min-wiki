import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import * as THREE from 'three';
import { FrameRender } from '../../../src/visuals/frameRender.ts';

const owners = [
  ['land history', '../landscape3d.ts', 'LandHistory3D'],
  ['Omuro', '../omuroScene.ts', 'Omuro3D'],
  ['hydrothermal', '../hydrothermalScene.ts', 'HydrothermalScene'],
  ['lake', '../../volcanic-lakes/scene3d.ts', 'Lake3DScene'],
  ['submarine', '../../submarine-volcanoes/scene3d.ts', 'Ocean3D'],
];

/** Run the production presentation and teardown members without constructing
 * terrain or a GPU. Private wrapper owners remain private in their modules. */
async function projection(path, name) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.ES2022, true);
  const owner = parsed.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === name);
  assert.ok(owner, name);
  const names = new Set(['presentation', 'render', 'renderNow', 'dispose', 'releaseGPU']);
  const members = owner.members.filter(member => member.name && names.has(member.name.getText(parsed)));
  const compiled = ts.transpileModule(`class Projection { ${members.map(member => member.getText(parsed)).join('\n')} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return (frames, document) => {
    class Presentation extends FrameRender { constructor(draw) { super(draw, frames); } }
    const Projection = new Function('FrameRender', 'THREE', 'document', `${compiled}\nreturn Projection;`)(Presentation, THREE, document);
    const owner = new Projection();
    // Hydrothermal allocates its presentation with each new WebGL attempt.
    owner.presentation ??= new Presentation(() => owner.renderNow());
    return owner;
  };
}

function fixture(create) {
  let sequence = 0, disposed = 0;
  const pending = new Map(), calls = [], document = { hidden: false, removeEventListener() {} };
  const frames = { request(callback) { const id = ++sequence; pending.set(id, callback); return id; }, cancel(id) { pending.delete(id); } };
  const owner = create(frames, document), noop = () => {}, resource = () => ({ dispose: noop });
  const camera = new THREE.PerspectiveCamera(); camera.position.set(8, 5, 10);
  Object.assign(owner, {
    disposed: false, hasSize: true, updatingFrame: false, view: 'landscape', camera,
    scene: { snapshot: 0, clear: noop, traverse: noop },
    controls: { target: new THREE.Vector3(), dispose: noop, removeEventListener: noop },
    renderer: {
      render(scene, camera) { calls.push({ scene, snapshot: scene.snapshot, camera: camera.position?.toArray() }); },
      setRenderTarget(target) { calls.push({ target }); }, setClearColor: noop, clear: noop,
      shadowMap: { needsUpdate: false },
      dispose() { assert.equal(pending.size, 0, 'presentation is cancelled before GPU release'); disposed++; }, forceContextLoss: noop,
    },
    stopMotion: noop, cancelFrame: noop, publishState: noop,
    observer: { disconnect: noop }, intersection: { disconnect: noop },
    canvas: { dataset: {}, removeEventListener: noop }, reduced: { removeEventListener: noop },
    geometries: new Set(), materials: new Set(), flows: [], feeders: [], oldPillows: [],
    grass: { ...resource(), visible: true }, seeds: { ...resource(), visible: true },
    rocks: resource(), deposits: resource(), roots: resource(), rubble: resource(),
    clasts: resource(), storageBody: resource(), field: resource(), grain: resource(),
    textures: { field: resource(), grain: resource() }, fieldProjection: resource(),
    detailMotion: resource(), vent: resource(), coastal: resource(), shoreline: resource(), epilogue: resource(),
    ecology: { ...resource(), state: { visible: false } },
    sun: { shadow: { ...resource(), map: resource() } }, rov: new THREE.SpotLight(),
    fill: new THREE.PointLight(), ambient: new THREE.HemisphereLight(),
    current: { environment: 'deep' }, litCamera: new THREE.Vector3(Infinity, Infinity, Infinity), litTarget: new THREE.Vector3(Infinity, Infinity, Infinity),
    noise: resource(), sceneTarget: { ...resource(), depthTexture: resource() }, plumeTarget: resource(),
    plume: { uniforms: { uLamp: { value: new THREE.Vector3() }, uLampTarget: { value: new THREE.Vector3() }, uInverse: { value: new THREE.Matrix4() } } },
    plumeScene: { name: 'plume' }, composite: { name: 'composite' }, screenCamera: {}, hasPlume: false,
    wetFilms: [], texture: resource(),
  });
  return {
    owner, document, pending, calls, get disposed() { return disposed; },
    tick() { const batch = [...pending.values()]; pending.clear(); batch.forEach(callback => callback(16)); },
  };
}

for (const [label, path, name] of owners) {
  const create = await projection(path, name);
  test(`${label} coalesces camera/process/detail requests and presents the latest retained state`, () => {
    const h = fixture(create), { owner } = h;
    for (let snapshot = 1; snapshot <= 5; snapshot++) {
      owner.scene.snapshot = snapshot; owner.camera.position.x = snapshot;
      owner.render(); owner.render();
    }
    assert.equal(h.pending.size, 1); assert.equal(h.calls.length, 0);
    h.tick();
    const renders = h.calls.filter(call => call.scene);
    assert.equal(renders.length, 1); assert.equal(renders[0].snapshot, 5); assert.equal(renders[0].camera[0], 5);
    assert.equal(h.pending.size, 0, 'presentation never starts an animation loop');
    owner.render(); owner.dispose(); owner.dispose();
    assert.equal(h.disposed, 1); assert.equal(h.pending.size, 0);
    owner.render(); h.tick(); assert.equal(h.calls.filter(call => call.scene).length, 1);
  });
}

test('submarine presentation retains ROV lighting, shadow reuse and ordered plume passes', async () => {
  const create = await projection('../../submarine-volcanoes/scene3d.ts', 'Ocean3D'), h = fixture(create), { owner } = h;
  owner.view = 'vent'; owner.ecology.state.visible = true; owner.hasPlume = true;
  owner.render(); owner.controls.target.set(1, 2, 3); owner.camera.position.set(4, 5, 6); owner.render(); h.tick();
  assert.deepEqual(h.calls.filter(call => call.scene).map(call => call.scene), [owner.scene, owner.plumeScene, owner.composite]);
  assert.deepEqual(h.calls.filter(call => 'target' in call).map(call => call.target), [owner.sceneTarget, owner.plumeTarget, null]);
  assert.ok(owner.rov.position.distanceTo(new THREE.Vector3(.05, 2.78, 3.2)) < 1e-12);
  assert.equal(owner.rov.intensity, 7.5); assert.equal(owner.fill.intensity, 1.1); assert.equal(owner.rov.shadow.camera.near, .08);
  assert.equal(owner.renderer.shadowMap.needsUpdate, true);
  owner.renderer.shadowMap.needsUpdate = false; owner.render(); h.tick();
  assert.equal(owner.renderer.shadowMap.needsUpdate, false, 'unchanged camera reuses the existing shadow');
  owner.dispose();
});
