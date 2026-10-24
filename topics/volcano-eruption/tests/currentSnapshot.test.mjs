import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import * as THREE from 'three';
import * as history from '../landscapeGeometry.ts';
import { historyGeometryKeys, historyCameraReference, historyUndergroundDetail, historyDetailHot, HistoryFlowSurface, HistoryClastCloud } from '../landscape3d.ts';
import { seed } from '../magmaGeometry.ts';
import { seedDispersal } from '../ecologyDispersal.ts';
import { oceanGeometryFrame } from '../../submarine-volcanoes/geometry3d.ts';
import { oceanMeltVisible } from '../../submarine-volcanoes/scene3d.ts';
import { oceanUniforms } from '../../submarine-volcanoes/materials3d.ts';
import { OceanEcology3D } from '../../submarine-volcanoes/oceanEcology3d.ts';
import { IslandEpilogue3D } from '../../submarine-volcanoes/islandEpilogue3d.ts';

/** Exercise production draw gates and retained GPU owners without a WebGL
 * context. Only camera placement and bulk rock upload are replaced by spies. */
async function ownerMethods(path, name, names, bindings) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.ES2022, true);
  const owner = parsed.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === name);
  const members = owner.members.filter(member => member.name && names.includes(member.name.getText(parsed)));
  const compiled = ts.transpileModule(`class Projection { ${members.map(member => member.getText(parsed)).join('\n')} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(bindings), `${compiled}\nreturn Projection;`)(...Object.values(bindings));
}

const historySettings = { chapter: 'landscape', aftermath: 'green', habitat: 'wet' };
async function landOwner(kind = 'composite') {
  const calls = { frame: 0, positions: 0, flows: 0, clasts: 0, camera: 0, render: 0 };
  const Projection = await ownerMethods('../landscape3d.ts', 'LandHistory3D', ['draw', 'setView', 'updateLiquidPhase'], {
    ...history, THREE, seed, seedDispersal, historyGeometryKeys, historyCameraReference, historyUndergroundDetail, historyDetailHot,
    historyFrame(...args) { calls.frame++; return history.historyFrame(...args); },
    replacePositions(target, data) { calls.positions++; target.positions = Float32Array.from(data); },
  });
  const owner = new Projection(), grain = new THREE.Texture(), frame = history.historyFrame(.08, 'landscape');
  const flows = Array.from({ length: 6 }, (_, i) => new HistoryFlowSurface(history.historyFlow(i, kind, frame), grain));
  for (const flow of flows) { const draw = flow.setFrame.bind(flow); flow.setFrame = (...args) => { calls.flows++; draw(...args); }; }
  const clasts = new HistoryClastCloud(grain), drawClasts = clasts.setFrame.bind(clasts);
  clasts.setFrame = (...args) => { calls.clasts++; drawClasts(...args); };
  const material = new THREE.MeshBasicMaterial(), shape = new THREE.PlaneGeometry(1, 1);
  const grass = new THREE.InstancedMesh(shape, material, 2200), seeds = new THREE.InstancedMesh(shape, material, 25);
  const storage = () => ({ setFrame() {}, applyPhase() {} });
  Object.assign(owner, {
    kind, frame, settings: { ...historySettings }, view: 'landscape', disposed: false, lastTerrain: '', lastSection: '', lastField: '', lastSnapshot: '',
    surface: { geometry: {} }, strata: Array.from({ length: 22 }, () => ({ geometry: {} })), dike: { geometry: {} },
    field: { image: { data: new Uint8Array(history.HISTORY_FIELD_SIZE ** 2 * 4) } },
    storageStyle: { setFrame() {}, detail: {}, detailPhase: {} }, storageBody: storage(), feeders: [storage(), storage(), storage()],
    intrusionStyle: { heat: {}, detail: {}, detailPhase: {} },
    detailMotion: { state: { phase: .7 }, setHot(hot) { this.hot = hot; } }, flows, clasts, grass, seeds,
    dummy: new THREE.Object3D(), color: new THREE.Color(), prior: {}, canvas: { dataset: {} },
    camera: { aspect: 1.5 }, controls: {}, groundMaterial: {}, farGround: {}, geology: {}, stopMotion() {}, moveCamera() {},
    followReference() { calls.camera++; }, render() { calls.render++; },
  });
  const snapshot = () => ({
    frame: structuredClone(owner.frame), ground: [...owner.surface.geometry.positions], field: [...owner.field.image.data],
    grass: [...grass.instanceMatrix.array.slice(0, grass.count * 16)], seeds: [...seeds.instanceMatrix.array.slice(0, seeds.count * 16)],
    flows: flows.map(flow => [...flow.mesh.geometry.getAttribute('position').array]),
    clasts: [...clasts.mesh.instanceMatrix.array.slice(0, clasts.mesh.count * 16)],
  });
  return { owner, calls, snapshot, dispose() { flows.forEach(flow => flow.dispose()); clasts.dispose(); grass.dispose(); seeds.dispose(); shape.dispose(); material.dispose(); grain.dispose(); } };
}

test('shield and composite repeat draws retain exact geometry, ecology and current detail phase', async () => {
  for (const kind of ['shield', 'composite']) {
    const h = await landOwner(kind), { owner, calls } = h;
    try {
      owner.draw(.3538, historySettings); const frame = owner.frame, before = h.snapshot(), work = { ...calls };
      for (let i = 0; i < 16; i++) owner.draw(.3538, { ...historySettings });
      assert.equal(owner.frame, frame); assert.deepEqual(h.snapshot(), before);
      for (const key of ['frame', 'positions', 'flows', 'clasts', 'camera']) assert.equal(calls[key], work[key]);
      owner.updateLiquidPhase(1.4); owner.draw(.3538, historySettings);
      assert.equal(owner.intrusionStyle.detailPhase.value, 1.4); assert.equal(owner.frame, frame);
      const exact = .3538 + Number.EPSILON; owner.draw(exact, historySettings);
      assert.equal(owner.frame.p, exact); assert.equal(calls.frame, work.frame + 1, 'no progress quantization');
    } finally { h.dispose(); }
  }
});

test('history snapshot invalidates for every setting and lens, and replay matches a fresh projection', async () => {
  const h = await landOwner(), direct = await landOwner(), settings = { chapter: 'life', aftermath: 'green', habitat: 'wet' };
  try {
    h.owner.draw(.8, settings); const wet = [...h.owner.grass.instanceMatrix.array];
    settings.habitat = 'dry'; h.owner.draw(.8, settings); assert.notDeepEqual([...h.owner.grass.instanceMatrix.array], wet);
    settings.aftermath = 'eroded'; const count = h.calls.frame; h.owner.draw(.8, settings); assert.equal(h.calls.frame, count + 1);
    h.owner.setView('section', false); assert.ok(h.owner.strata[0].geometry.positions); assert.equal(h.owner.seeds.count, 0);
    h.owner.setView('vent', false); assert.equal(h.owner.seeds.count, 25);
    for (const p of [.3, .9, .1, .8]) h.owner.draw(p, settings);
    direct.owner.setView('vent', false); direct.owner.draw(.8, settings);
    assert.deepEqual(h.snapshot(), direct.snapshot());
    const before = { ...h.calls }; h.owner.disposed = true; h.owner.draw(.4, settings); assert.deepEqual(h.calls, before);
  } finally { h.dispose(); direct.dispose(); }
});

async function oceanOwner() {
  const calls = { frame: 0, rock: 0, camera: 0, follow: 0, epilogue: 0, render: 0 };
  const Projection = await ownerMethods('../../submarine-volcanoes/scene3d.ts', 'Ocean3D', ['draw', 'setView', 'seaActive', 'publishVisitors', 'updateLiquidPhase'], {
    oceanGeometryFrame(...args) { calls.frame++; return oceanGeometryFrame(...args); }, oceanMeltVisible,
  });
  const owner = new Projection(), noise = new THREE.Texture(), uniforms = oceanUniforms();
  const ecology = new OceanEcology3D(noise, uniforms), epilogue = new IslandEpilogue3D(), drawEpilogue = epilogue.draw.bind(epilogue);
  epilogue.draw = (...args) => { calls.epilogue++; drawEpilogue(...args); };
  const camera = new THREE.PerspectiveCamera(37, 1.5, .08, 220); camera.position.set(2.4, 10.7, 8.7); camera.lookAt(0, 7.7, .3); camera.updateMatrixWorld();
  const clipped = () => ({ material: {}, setCutaway() {}, updateDetail() {} });
  Object.assign(owner, {
    current: oceanGeometryFrame(.08, 'island', 'sustained'), ecologyCase: 'bare', environmentKey: '', view: 'landscape', disposed: false, hasSize: true,
    uniforms, camera, ecology, epilogue, canvas: { dataset: {} }, deposits: [], geologyUpdates: 0,
    water: { visible: true }, sectionGroup: {}, sun: {}, rov: {}, controls: {}, renderer: { shadowMap: {} }, cut: {},
    rock: clipped(), tuff: clipped(), oldPillowRock: clipped(), vent: clipped(), coastal: clipped(), shoreline: clipped(),
    detailMotion: { setHot(hot) { this.hot = hot; } }, hotLight: {}, lightLevel: 0,
    cameraFrame() { calls.camera++; return { frame: this.current, ecology: this.ecologyCase }; },
    cameraMotion: { draw() { calls.follow++; } }, moveCamera() {},
    rebuild() { this.deposits = [{ key: '' }]; },
    geometry() { calls.rock++; this.deposits[0].key = 'prepared'; }, products() {}, packets() {}, render() { calls.render++; },
  });
  return { owner, calls, dispose() { ecology.dispose(); epilogue.dispose(); noise.dispose(); } };
}

test('ocean redraws retain one exact current frame and do not repeat camera or visitor projection', async () => {
  const h = await oceanOwner(), { owner, calls } = h;
  try {
    owner.draw(.97, 'island', 'sustained', 'suitable'); const frame = owner.current, visitors = owner.epilogue.state, before = { ...calls };
    assert.equal(owner.ecology.state.visible, true);
    for (let i = 0; i < 16; i++) { owner.camera.position.x += .01; owner.draw(.97, 'island', 'sustained', 'suitable'); }
    assert.equal(owner.current, frame); assert.equal(owner.epilogue.state, visitors);
    for (const key of ['frame', 'rock', 'camera', 'follow', 'epilogue']) assert.equal(calls[key], before[key]);
    owner.draw(.97, 'island', 'sustained', 'bare'); assert.equal(owner.current, frame); assert.equal(calls.frame, before.frame); assert.equal(calls.follow, before.follow + 1);
    owner.setView('section'); owner.draw(.97, 'island', 'sustained', 'bare'); assert.equal(owner.epilogue.active, false); assert.equal(owner.sectionGroup.visible, true);
    owner.setView('landscape'); assert.equal(owner.epilogue.active, true);
    const exact = .97 + Number.EPSILON; owner.draw(exact, 'island', 'sustained', 'bare'); assert.equal(owner.current.p, exact); assert.notEqual(owner.current, frame);
    owner.draw(.4, 'island', 'limited'); assert.equal(owner.current.supply, 'limited'); assert.equal(owner.epilogue.active, false);
    owner.draw(.97, 'island', 'sustained', 'suitable'); assert.deepEqual(owner.current, frame); assert.equal(owner.ecology.state.visible, true);
  } finally { h.dispose(); }
});

test('a frozen ocean snapshot still advances sea detail and admits later birds and fish across quiet gaps', async () => {
  const h = await oceanOwner(), { owner, calls } = h;
  try {
    owner.draw(1, 'island', 'sustained'); const frame = owner.current, count = { ...calls };
    let birdAbsent = false, birdReturned = false, fishAbsent = false, fishReturned = false;
    for (let i = 1; i <= 1200; i++) {
      const phase = (i * .05) % (Math.PI * 2); owner.updateLiquidPhase(phase); owner.draw(1, 'island', 'sustained');
      const state = owner.epilogue.state;
      if (!state.bird.visible) birdAbsent = true; else if (birdAbsent) birdReturned = true;
      if (state.fish.every(fish => !fish.visible)) fishAbsent = true; else if (fishAbsent) fishReturned = true;
      assert.equal(owner.detailMotion.hot, true); assert.equal(owner.current, frame); assert.equal(owner.uniforms.seaPhase.value, phase);
    }
    assert.ok(birdAbsent && birdReturned && fishAbsent && fishReturned); assert.equal(calls.epilogue, count.epilogue); assert.equal(calls.frame, count.frame);
    owner.draw(.8, 'island', 'sustained'); owner.draw(1, 'island', 'sustained');
    assert.ok(owner.epilogue.state.bird.visible, 'rewinding out of admission restarts the existing entrance');
  } finally { h.dispose(); }
});
