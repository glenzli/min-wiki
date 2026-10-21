import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import * as THREE from 'three';
const path = new URL('../hydrothermalModel.ts', import.meta.url);
const source = await readFile(path, 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
const m = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const sceneSource = await readFile(new URL('../hydrothermalScene.ts', import.meta.url), 'utf8');
const compiledScene = ts.transpileModule(sceneSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace("'three'", JSON.stringify(import.meta.resolve('three')))
  .replace("'three/addons/controls/OrbitControls.js'", JSON.stringify(import.meta.resolve('three/addons/controls/OrbitControls.js')))
  .replace("'./hydrothermalModel.ts'", JSON.stringify(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`));
const { HydrothermalScene, hydrothermalLandscapeGeometry } = await import(`data:text/javascript;base64,${Buffer.from(compiledScene).toString('base64')}`);
const input = { supply: .75, connected: true };
const near = (a, b, eps = 1e-7) => assert.ok(Math.abs(a - b) <= eps, `${a} differs from ${b}`);

// Exercise the actual scene scheduler and key handler without creating a GPU
// context. Geometry, visual quality and context-loss behavior need browser QA.
function withScene(run, { lifecycle = false, initialDataset = {} } = {}) {
  const keys = ['document', 'matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'CustomEvent'];
  const previous = keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const doc = Object.assign(new EventTarget(), { hidden: false }), media = Object.assign(new EventTarget(), { matches: false });
  const callbacks = new Map(); let sequence = 0;
  class Canvas extends EventTarget {
    dataset = {}; attributes = new Map([['id', 'heat-scene'], ['aria-label', 'Hot spring'], ['tabindex', '0'], ['class', 'scene-canvas'], ['style', 'width:100%;height:100%']]);
    getBoundingClientRect() { return { width: 800, height: 500 }; }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    cloneNode() { const next = new Canvas(); next.attributes = new Map(this.attributes); next.dataset = { ...this.dataset }; return next; }
    replaceWith(next) { this.replacement = next; }
    getContext(kind) {
      if (this.context && this.context.kind !== kind) return null;
      this.context ??= { kind, lost: false }; return this.context;
    }
  }
  const originalCanvas = new Canvas(); Object.assign(originalCanvas.dataset, initialDataset);
  Object.assign(globalThis, { document: doc, matchMedia: () => media, getComputedStyle: () => ({ visibility: 'visible' }),
    requestAnimationFrame: callback => { const id = ++sequence; callbacks.set(id, callback); return id; },
    cancelAnimationFrame: id => callbacks.delete(id),
    CustomEvent: globalThis.CustomEvent ?? class extends Event { constructor(type, init) { super(type, init); this.detail = init.detail; } } });
  const overrides = ['initialize', 'observe', 'create3D', 'drawCanvas', 'updatePool', 'updateSamples', 'applyView'];
  const previousMethods = overrides.map(name => [name, HydrothermalScene.prototype[name]]);
  const attempts = [], renderers = [], notifications = [], scenes = []; let failure;
  if (lifecycle) {
    // Real initialize/replace/notify/release/retry code, with GPU creation alone
    // replaced by a context that refuses reuse after forceContextLoss.
    HydrothermalScene.prototype.create3D = function () {
      const canvas = this.canvas, context = canvas.getContext('webgl2'); attempts.push(canvas);
      if (failure) { const error = failure; failure = undefined; throw error; }
      if (!context || context.lost) throw new Error('Cannot reuse an incompatible or lost context');
      const renderer = { canvas, released: false, render() {}, dispose() { this.released = true; }, forceContextLoss() { context.lost = true; } };
      this.renderer = renderer; renderers.push(renderer); this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(37, 1.6, .1, 170);
      this.controls = { target: new THREE.Vector3(), minDistance: 5, maxDistance: 60, update() {}, removeEventListener() {}, dispose() {} };
      this.wetFilm = { geometry: { setDrawRange() {} } }; this.plug = {};
    };
    for (const name of ['drawCanvas', 'updatePool', 'updateSamples', 'applyView']) HydrothermalScene.prototype[name] = function () {};
  } else HydrothermalScene.prototype.initialize = function () {};
  HydrothermalScene.prototype.observe = function () {};
  const makeScene = canvas => { const scene = new HydrothermalScene(canvas, (mode, active) => notifications.push({ mode, canvas: active })); scenes.push(scene); return scene; };
  try {
    const scene = makeScene(originalCanvas);
    run({ scene, canvas: scene.canvas, originalCanvas, makeScene, attempts, renderers, notifications, failNext: error => { failure = error; }, doc, media, pending: () => callbacks.size,
      advance: time => { const batch = [...callbacks.values()]; callbacks.clear(); batch.forEach(callback => callback(time)); } });
  } finally {
    for (const scene of scenes) scene.dispose(); for (const [name, method] of previousMethods) HydrothermalScene.prototype[name] = method;
    for (const [key, descriptor] of previous) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key];
  }
}

test('rain infiltration precedes warming, ascent and spring water', () => {
  const early = m.hydrothermalFrame(.23, input), warm = m.hydrothermalFrame(.50, input), rising = m.hydrothermalFrame(.70, input), final = m.hydrothermalFrame(1, input);
  assert.ok(early.recharge > 0); assert.equal(early.heating, 0); assert.equal(early.ascent, 0); assert.equal(early.pool, 0);
  assert.ok(warm.heating > 0); assert.equal(warm.ascent, 0); assert.equal(warm.pool, 0);
  assert.ok(rising.ascent > 0); assert.equal(rising.pool, 0);
  assert.ok(final.discharge > 0); assert.ok(final.pool > .8); assert.equal(final.stage, 3);
});

test('zero water keeps a hot but dry system; low supply cannot sustain the pool', () => {
  for (const supply of [0, .05, .12]) {
    const frame = m.hydrothermalFrame(1, { supply, connected: true });
    assert.equal(frame.pool, 0); assert.equal(frame.hotRock, 1); assert.equal(frame.reason, 'low-supply');
    if (supply === 0) {
      assert.equal(frame.recharge, 0); assert.equal(frame.heating, 0); assert.equal(frame.discharge, 0);
      for (let id = 0; id < m.HYDROTHERMAL_SAMPLES; id++) for (const phase of [0, .2, .8]) assert.equal(m.hydrothermalSample(id, frame, phase).visible, false);
    }
  }
});

test('a sealed fracture allows infiltration and heating but no ascent or spring', () => {
  const frame = m.hydrothermalFrame(1, { supply: 1, connected: false });
  assert.ok(frame.recharge > 0); assert.ok(frame.heating > 0); assert.equal(frame.wetFront, .655);
  assert.equal(frame.ascent, 0); assert.equal(frame.discharge, 0); assert.equal(frame.pool, 0); assert.equal(frame.reason, 'disconnected');
  for (let id = 0; id < m.HYDROTHERMAL_SAMPLES; id++) for (const phase of [0, .13, .52, .91]) {
    const sample = m.hydrothermalSample(id, frame, phase); if (sample.visible) assert.ok(sample.t <= .655);
  }
});

test('water samples keep rain origin and liquid identity outside the hot rock body', () => {
  const frame = m.hydrothermalFrame(1, input);
  for (let id = 0; id < m.HYDROTHERMAL_SAMPLES; id++) {
    const a = m.hydrothermalSample(id, frame, 0), b = m.hydrothermalSample(id, frame, .24);
    assert.equal(a.id, id); assert.equal(b.id, id); assert.equal(a.source, 'precipitation'); assert.equal(b.source, a.source); assert.equal(a.phase, 'liquid');
    assert.ok(m.hotRockDistance(...a.position) > 0); assert.ok(m.hotRockDistance(...b.position) > 0);
    assert.ok(a.heat >= 0 && a.heat <= 1); assert.ok(a.position.every(Number.isFinite));
  }
  for (let i = 0; i <= 1000; i++) {
    const t = i / 1000, p = m.hydrothermalRoute(t); assert.ok(m.hotRockDistance(...p) > 0);
    if (t >= .11 && t <= .94) assert.ok(p[1] < m.hydrothermalTerrain(p[0], p[2]), 'underground liquid escaped above its host');
  }
});

test('detail flow changes tracer positions without changing water or heat results', () => {
  const frame = m.hydrothermalFrame(.88, input), snapshot = structuredClone(frame);
  const a = m.hydrothermalSample(3, frame, 0), b = m.hydrothermalSample(3, frame, .27);
  assert.notDeepEqual(a.position, b.position);
  for (let i = 0; i < 500; i++) m.hydrothermalSample(i % m.HYDROTHERMAL_SAMPLES, frame, i / 73);
  assert.deepEqual(frame, snapshot); assert.deepEqual(m.hydrothermalFrame(.88, input), frame);
  assert.deepEqual(a, m.hydrothermalSample(3, frame, 1));
});

test('rewind and replay reconstruct identical states and samples without history', () => {
  const settings = Object.freeze({ ...input }), frame = m.hydrothermalFrame(.84, settings);
  const samples = Array.from({ length: m.HYDROTHERMAL_SAMPLES }, (_, id) => m.hydrothermalSample(id, frame, .31));
  m.hydrothermalFrame(.3, { supply: 0, connected: false }); m.hydrothermalFrame(1, { supply: 1, connected: true });
  const replay = m.hydrothermalFrame(.84, settings); assert.deepEqual(replay, frame);
  assert.deepEqual(samples, samples.map((_, id) => m.hydrothermalSample(id, replay, .31))); assert.deepEqual(settings, input);
});

test('the horizontal pool meets its own concave rock bed at every water level', () => {
  for (const p of [.82, .9, 1]) for (const supply of [.3, .75, 1]) {
    const frame = m.hydrothermalFrame(p, { supply, connected: true }); if (frame.pool === 0) continue;
    for (let j = 0; j < 128; j++) {
      const angle = j / 128 * Math.PI * 2, edge = m.poolShore(angle, frame); near(m.hydrothermalTerrain(edge[0], edge[2]), frame.waterLevel);
      for (const u of [0, .25, .5, .9, .99]) {
        const x = m.POOL.x + (edge[0] - m.POOL.x) * u, z = m.POOL.z + (edge[2] - m.POOL.z) * u;
        assert.ok(m.hydrothermalTerrain(x, z) <= frame.waterLevel + 1e-7);
      }
      assert.ok(frame.waterLevel < m.POOL.rim);
    }
  }
});

test('normalized inputs remain bounded and do not turn absent water into a spring', () => {
  for (const p of [NaN, -10, 0, .4, 1, Infinity]) for (const supply of [NaN, -1, 0, .3, 1, 8]) {
    const frame = m.hydrothermalFrame(p, { supply, connected: true });
    for (const key of ['p', 'front', 'recharge', 'heating', 'ascent', 'discharge', 'pool', 'relativeHeat']) assert.ok(frame[key] >= 0 && frame[key] <= 1);
    if (!(supply > 0)) assert.equal(frame.pool, 0);
  }
});

test('scene suspension resumes the enabled choice and publishes a separate display phase', () => withScene(({ scene, canvas, doc, media, advance, pending }) => {
  scene.draw(.88, input); scene.setDetailMotion(true); const scientific = structuredClone(scene.frame), pool = canvas.dataset.poolFill;
  assert.equal(canvas.dataset.detailMotion, 'running'); assert.equal(pending(), 1);
  advance(1000); advance(1050); assert.notEqual(canvas.dataset.detailPhase, '0.000000');
  assert.deepEqual(scene.frame, scientific); assert.equal(canvas.dataset.poolFill, pool);
  scene.stopMotion(); assert.equal(pending(), 0); assert.equal(canvas.dataset.detailEnabled, 'true');
  doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(canvas.dataset.detailMotion, 'hidden'); assert.equal(pending(), 0);
  doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(canvas.dataset.detailMotion, 'running'); assert.equal(pending(), 1);
  media.matches = true; media.dispatchEvent(new Event('change')); assert.equal(canvas.dataset.detailMotion, 'reduced'); assert.equal(pending(), 0);
  media.matches = false; media.dispatchEvent(new Event('change')); assert.equal(pending(), 1);
  scene.setDetailMotion(false); doc.dispatchEvent(new Event('visibilitychange')); assert.equal(canvas.dataset.detailMotion, 'paused'); assert.equal(pending(), 0);
  scene.setView('landscape'); assert.equal(canvas.dataset.projection, 'landscape'); assert.equal(canvas.dataset.progress, '0.8800');
  canvas.dataset.progress = '0'; scene.syncMotion(); assert.equal(scene.frame.p, .88); assert.equal(canvas.dataset.progress, '0.8800');
  scene.dispose(); assert.equal(canvas.dataset.detailMotion, 'disposed'); assert.equal(pending(), 0);
}));

test('dry or unreached water paths stop detail work and resume without a phase reset', () => withScene(({ scene, canvas, pending, advance }) => {
  scene.draw(.88, input); scene.setDetailMotion(true); advance(1000); advance(1050);
  const phase = scene.phase; assert.ok(phase > 0);
  scene.draw(1, { supply: 0, connected: true });
  assert.equal(pending(), 0); assert.equal(canvas.dataset.detailMotion, 'idle');
  advance(5000); assert.equal(scene.phase, phase);
  scene.draw(0, input); assert.equal(pending(), 0);
  // A blocked return still has supplied infiltration; it is not a dry route.
  scene.draw(.5, { supply: .75, connected: false }); assert.equal(pending(), 1);
  advance(6000); assert.equal(scene.phase, phase, 'no catch-up after the dry interval');
  advance(6050); assert.ok(scene.phase > phase);
  scene.draw(1, { supply: 0, connected: false }); assert.equal(pending(), 0);
  scene.draw(1, input); assert.equal(pending(), 1);
}));

test('keyboard zoom is bounded and progress updates retain the reader camera', () => withScene(({ scene }) => {
  scene.renderer = { render() {}, dispose() {}, forceContextLoss() {} }; scene.scene = new THREE.Scene();
  scene.camera = new THREE.PerspectiveCamera(37, 1.6, .1, 170); scene.camera.position.set(0, 2, 12);
  scene.controls = { target: new THREE.Vector3(), minDistance: 5, maxDistance: 60, update() {}, removeEventListener() {}, dispose() {} };
  scene.wetFilm = { geometry: { setDrawRange() {} } }; scene.plug = {};
  scene.updatePool = scene.updateSamples = () => {};
  const press = key => scene.keydown({ key, preventDefault() {} });
  const before = scene.camera.position.length(); press('+'); assert.ok(scene.camera.position.length() < before);
  for (let i = 0; i < 100; i++) press('='); near(scene.camera.position.length(), 5);
  for (let i = 0; i < 100; i++) press('-'); near(scene.camera.position.length(), 60);
  press('−'); near(scene.camera.position.length(), 60);
  const position = scene.camera.position.clone(), target = scene.controls.target.clone(); scene.draw(.23, input); scene.draw(1, input); scene.fitCamera();
  assert.ok(scene.camera.position.equals(position)); assert.ok(scene.controls.target.equals(target)); assert.equal(scene.manualCamera, true);
}));

test('leaving and reentering mounts a fresh canvas after the old context is disposed', () => withScene(({ scene, canvas, originalCanvas, makeScene, attempts, renderers }) => {
  assert.notEqual(canvas, originalCanvas); assert.equal(originalCanvas.replacement, canvas);
  for (const name of ['id', 'aria-label', 'tabindex', 'class', 'style']) assert.equal(canvas.getAttribute(name), originalCanvas.getAttribute(name));
  assert.equal(canvas.dataset.staleObservation, undefined); assert.equal(canvas.dataset.renderer, 'webgl'); assert.equal(canvas.dataset.rendererError, undefined);
  scene.draw(.88, input); scene.dispose(); assert.equal(renderers[0].released, true); assert.equal(canvas.context.lost, true);
  const returned = makeScene(canvas); assert.notEqual(returned.canvas, canvas); assert.equal(canvas.replacement, returned.canvas);
  assert.equal(returned.is3D, true); assert.equal(returned.canvas.dataset.renderer, 'webgl'); assert.equal(returned.canvas.dataset.rendererError, undefined);
  assert.notEqual(attempts[0], attempts[1]); assert.equal(returned.canvas.context.lost, false);
  returned.draw(.88, input); assert.equal(returned.canvas.dataset.progress, '0.8800');
  canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); assert.equal(returned.is3D, true);
}, { lifecycle: true, initialDataset: { renderer: 'canvas', rendererError: 'stale', detailMotion: 'disposed', staleObservation: 'discard' } }));

test('context loss and failed retry keep diagnostics and scientific state until fresh retry succeeds', () => withScene(({ scene, attempts, notifications, failNext, advance }) => {
  scene.draw(.88, input); scene.setView('landscape'); scene.setDetailMotion(true); advance(1000); advance(1050);
  const frame = structuredClone(scene.frame), phase = scene.phase, first = scene.canvas;
  const loss = new Event('webglcontextlost', { cancelable: true }); first.dispatchEvent(loss);
  assert.equal(loss.defaultPrevented, true); assert.equal(first.context.lost, true); assert.notEqual(scene.canvas, first);
  assert.equal(scene.is3D, false); assert.equal(scene.canvas.context.kind, '2d'); assert.equal(scene.canvas.dataset.renderer, 'canvas');
  assert.equal(scene.canvas.dataset.rendererError, 'webglcontextlost');
  failNext(new Error('Synthetic allocation failure')); const fallback = scene.canvas; scene.retry3D();
  assert.equal(scene.is3D, false); assert.notEqual(scene.canvas, fallback); assert.equal(scene.canvas.dataset.renderer, 'canvas');
  assert.equal(scene.canvas.dataset.rendererError, 'Error: Synthetic allocation failure');
  const failed = scene.canvas; scene.retry3D();
  assert.equal(scene.is3D, true); assert.notEqual(scene.canvas, failed); assert.equal(scene.canvas.dataset.renderer, 'webgl'); assert.equal(scene.canvas.dataset.rendererError, undefined);
  assert.equal(new Set(attempts).size, attempts.length); assert.deepEqual(scene.frame, frame); assert.equal(scene.phase, phase);
  assert.equal(scene.canvas.dataset.progress, '0.8800'); assert.equal(scene.canvas.dataset.projection, 'landscape'); assert.equal(scene.canvas.dataset.detailEnabled, 'true');
  assert.deepEqual(notifications.map(n => n.mode), ['webgl', 'canvas', 'canvas', 'webgl']); assert.equal(notifications.at(-1).canvas, scene.canvas);
}, { lifecycle: true }));

test('spring camera frames the real pool and wet shore on portrait and desktop', () => withScene(({ scene }) => {
  scene.draw(1, input); scene.setView('landscape'); const frame = structuredClone(scene.frame);
  for (const aspect of [.72, 1.6]) {
    scene.camera.aspect = aspect; scene.camera.updateProjectionMatrix(); scene.manualCamera = false; scene.fitCamera();
    scene.camera.lookAt(scene.controls.target); scene.camera.updateMatrixWorld();
    near(scene.controls.target.x, m.POOL.x); near(scene.controls.target.z, m.POOL.z);
    const projected = Array.from({ length: 128 }, (_, i) => new THREE.Vector3(...m.poolShore(i / 128 * Math.PI * 2, frame)).project(scene.camera));
    const width = (Math.max(...projected.map(p => p.x)) - Math.min(...projected.map(p => p.x))) / 2;
    assert.ok(width > (aspect < 1 ? .48 : .30) && width < .9, `pool covers ${width} of stage at aspect ${aspect}`);
    assert.ok(projected.every(p => Math.abs(p.x) < .9 && Math.abs(p.y) < .85 && p.z > -1 && p.z < 1));
    const pose = scene.camera.position.clone(); scene.draw(.23, input); scene.draw(1, input);
    assert.ok(scene.camera.position.equals(pose)); assert.deepEqual(scene.frame, frame);
  }
}, { lifecycle: true }));

test('continuous landscape geometry covers near pool to far ground without overlapping sheets', () => {
  const geometry = hydrothermalLandscapeGeometry(), p = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), index = geometry.getIndex(), locations = new Set();
  assert.ok(p.count < 30000); let nearPool = 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), key = `${x},${z}`;
    assert.equal(locations.has(key), false); locations.add(key); near(y, m.hydrothermalTerrain(x, z), 2e-6);
    assert.ok(Number.isFinite(normal.getX(i)) && normal.getY(i) > .05 && Number.isFinite(normal.getZ(i)));
    if (Math.abs(x - m.POOL.x) < 1.5 && Math.abs(z - m.POOL.z) < 1.1) nearPool++;
  }
  assert.ok(nearPool > 600); assert.equal(index.count, (187 - 1) * (155 - 1) * 6);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(p, index.getX(i)); b.fromBufferAttribute(p, index.getX(i + 1)); c.fromBufferAttribute(p, index.getX(i + 2));
    assert.ok(b.sub(a).cross(c.sub(a)).y > 0, 'every terrain triangle has positive horizontal area');
  }
  geometry.dispose();
});

test('view changes give a single ground owner and retain the section reference frame', () => withScene(({ scene }) => {
  const meshes = Array.from({ length: 4 }, () => new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()));
  [scene.ground, scene.outside, scene.rim, scene.pool] = meshes; scene.section = new THREE.Group(); scene.underground = new THREE.Group();
  scene.renderer = { shadowMap: { needsUpdate: false }, render() {}, dispose() {}, forceContextLoss() {} }; scene.scene = new THREE.Scene();
  scene.camera = new THREE.PerspectiveCamera(37, .72, .1, 170);
  scene.controls = { target: new THREE.Vector3(), update() {}, removeEventListener() {}, dispose() {} };
  scene.applyView(); const sectionPose = scene.camera.position.clone(), sectionTarget = scene.controls.target.clone();
  scene.setView('landscape'); assert.equal(scene.ground.visible, false); assert.equal(scene.outside.visible, true); assert.equal(scene.renderer.shadowMap.needsUpdate, true);
  scene.setView('section'); assert.equal(scene.ground.visible, true); assert.equal(scene.outside.visible, false); assert.equal(scene.controls.minDistance, 5);
  assert.ok(scene.camera.position.equals(sectionPose)); assert.ok(scene.controls.target.equals(sectionTarget));
  assert.deepEqual(sectionTarget.toArray(), [0, -.1, -1]);
  meshes.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
}));

// Source contract: lifecycle and view ownership remain in the scene, while
// the clock-free scientific result above stays independent of any renderer.
test('scene owns reduced-motion visibility cancellation and complete GPU release', () => {
  const scene = sceneSource;
  for (const api of ['setView(', 'resetCamera(', 'setDetailMotion(', 'stopMotion(', 'retry3D(', 'dispose(']) assert.ok(scene.includes(api));
  assert.match(scene, /prefers-reduced-motion/); assert.match(scene, /visibilitychange/); assert.match(scene, /IntersectionObserver/);
  assert.match(scene, /cancelAnimationFrame/); assert.match(scene, /forceContextLoss/); assert.match(scene, /webglcontextlost/);
  assert.doesNotMatch(source, /requestAnimationFrame|performance\.now|Date\.now|Math\.random/);
});
