import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HistoryFlowSurface, HistoryClastCloud, HistoryStorageProjection, LandHistoryScene, historyGeometryKeys, historyStorageMaterial, historyDetailHot, historyUndergroundDetail, historyCameraReference, followHistoryReference } from '../landscape3d.ts';
import { historyFlow, historyFrame, historyClasts, historyStorage, historyStorageBody, historySurface, historyIntrusion, historyField } from '../landscapeGeometry.ts';
import { MagmaDetailMotion, DETAIL_PERIOD } from '../magmaMotion.ts';
import { storageComplex, feederCenterline, intrusionSolid } from '../sectionGeometry.ts';

const close = (a, b, epsilon = 1e-6) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const copy = attribute => [...attribute.array];
test('late storage withdrawal invalidates the main dike and reproduces direct geometry through both seek directions', () => {
  for (const kind of ['shield', 'composite']) {
    let key = '', retained;
    for (const p of [.59, .60, .61, .68, .61, .59, .70, .59]) {
      const frame = historyFrame(p, 'landscape'), next = historyGeometryKeys(frame);
      if (next.section !== key) { retained = historyIntrusion(kind, frame); key = next.section; }
      assert.deepEqual(retained.positions, historyIntrusion(kind, historyFrame(p, 'landscape')).positions);
      assert.ok(retained.positions.every(Number.isFinite));
    }
    const a = historyFrame(.59, 'landscape'), b = historyFrame(.61, 'landscape');
    assert.equal(a.land.growth, b.land.growth); assert.deepEqual(a.contacts, b.contacts);
    assert.equal(historyGeometryKeys(a).terrain, historyGeometryKeys(b).terrain);
    assert.notEqual(historyGeometryKeys(a).storage, historyGeometryKeys(b).storage);
    assert.notEqual(historyGeometryKeys(a).section, historyGeometryKeys(b).section);
  }
  assert.equal(historyGeometryKeys(historyFrame(.70, 'landscape')).storage, historyGeometryKeys(historyFrame(.72, 'landscape')).storage, 'heat-only cooling cannot rebuild an unchanged solid');
});

test('history ecological field cache follows cover, soil and burial while geological building leaves it unchanged', () => {
  for (const kind of ['shield', 'composite']) {
    const fields = new Map();
    for (const [p, chapter, habitat] of [[0, 'landscape', 'wet'], [.3538, 'landscape', 'wet'], [.61, 'landscape', 'wet'], [.3, 'life', 'wet'], [.8, 'life', 'wet'], [1, 'life', 'dry'], [1, 'life', 'buried'], [.8, 'life', 'wet']]) {
      const frame = historyFrame(p, chapter, 'green', habitat), key = historyGeometryKeys(frame).ecology, direct = historyField(kind, frame);
      if (!fields.has(key)) fields.set(key, direct);
      assert.deepEqual(fields.get(key), direct);
    }
    const a = historyFrame(.1, 'landscape'), b = historyFrame(.61, 'landscape');
    assert.equal(historyGeometryKeys(a).ecology, historyGeometryKeys(b).ecology);
    assert.equal(a.vegetation, 0); assert.equal(b.vegetation, 0);
  }
});
function environment() {
  let sequence = 0, hidden = false, reduced = false;
  const pending = new Map(), visibility = new Set(), preferences = new Set();
  return {
    requestFrame(callback) { const id = ++sequence; pending.set(id, callback); return id; },
    cancelFrame(id) { pending.delete(id); }, hidden: () => hidden, reducedMotion: () => reduced,
    onVisibilityChange(callback) { visibility.add(callback); return () => visibility.delete(callback); },
    onReducedMotionChange(callback) { preferences.add(callback); return () => preferences.delete(callback); },
    tick(time) { assert.ok(pending.size <= 1); const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); },
    setHidden(value) { hidden = value; visibility.forEach(callback => callback()); },
    setReduced(value) { reduced = value; preferences.forEach(callback => callback()); },
    get pending() { return pending.size; }, get listeners() { return visibility.size + preferences.size; },
  };
}

test('history projects exactly six bounded flow surfaces; only current supply can move', () => {
  const grain = new THREE.Texture(), frame = historyFrame(.3538, 'landscape');
  const sources = Array.from({ length: 6 }, (_, i) => historyFlow(i, 'composite', frame));
  const originals = sources.map(source => [...source.positions]);
  const flows = sources.map(source => new HistoryFlowSurface(source, grain));
  assert.equal(flows.reduce((sum, flow) => sum + flow.transport.positions.length / 3, 0), 6 * 65 * 9);
  assert.equal(flows.filter(flow => flow.active).length, 2);
  for (let i = 0; i < flows.length; i++) {
    const flow = flows[i], buffers = [flow.transport.positions, flow.transport.uvs, flow.transport.waves, flow.transport.crust];
    const body = copy(flow.mesh.geometry.getAttribute('position')), initial = [...flow.transport.positions];
    flow.applyPhase(1.4);
    assert.deepEqual(copy(flow.mesh.geometry.getAttribute('position')), body);
    assert.deepEqual(sources[i].positions, originals[i], 'source and cold banks are immutable on a detail frame');
    assert.deepEqual([flow.transport.positions, flow.transport.uvs, flow.transport.waves, flow.transport.crust], buffers);
    assert.ok(flow.movingMesh.geometry.getAttribute('normal').array.every(Number.isFinite));
    if (flow.active) assert.ok(flow.transport.positions.some((value, at) => Math.abs(value - initial[at]) > .01));
    else assert.deepEqual([...flow.transport.positions], initial);
    flow.dispose();
  }
  grain.dispose();
});

test('completed warm flows are rigid dark crust and stay buried at their emitted coordinates', () => {
  const grain = new THREE.Texture(), index = 2;
  const emitted = historyFlow(index, 'composite', historyFrame(.31 + 1e-10, 'landscape'));
  const warm = historyFlow(index, 'composite', historyFrame(.3538, 'landscape'));
  assert.ok(warm.heat > .1); assert.equal(warm.mobility, 0); assert.equal(warm.flux, 0);
  const flow = new HistoryFlowSurface(warm, grain), before = copy(flow.mesh.geometry.getAttribute('position'));
  assert.equal(flow.active, false); assert.equal(flow.movingMesh.visible, false);
  assert.ok(flow.body.heat.value < .01); assert.equal(flow.body.detail.value, 0); assert.equal(flow.skin.heat.value, 0);
  for (const phase of [1, 3, 6]) flow.applyPhase(phase);
  assert.deepEqual(copy(flow.mesh.geometry.getAttribute('position')), before);
  const final = historyFlow(index, 'composite', historyFrame(1, 'landscape'));
  flow.setFrame(final, 5);
  assert.deepEqual(copy(flow.mesh.geometry.getAttribute('position')), before);
  assert.deepEqual(final.positions, emitted.positions); assert.equal(flow.body.heat.value, 0);
  assert.ok(final.positions.some((y, at) => at % 3 === 1 && y < historySurface(final.positions[at - 1], final.positions[at + 1], 'composite', historyFrame(1, 'landscape')) - .02));
  flow.dispose(); grain.dispose();
});

test('seeking a history flow back to the same progress and phase reproduces its skin and relief', () => {
  const grain = new THREE.Texture(), source = historyFlow(3, 'shield', historyFrame(.33, 'landscape'));
  const flow = new HistoryFlowSurface(source, grain);
  flow.applyPhase(.72); const positions = [...flow.transport.positions], crust = [...flow.transport.crust];
  flow.setFrame(historyFlow(3, 'shield', historyFrame(.9, 'landscape')), 2.6);
  flow.setFrame(historyFlow(3, 'shield', historyFrame(.33, 'landscape')), .72);
  assert.deepEqual([...flow.transport.positions], positions); assert.deepEqual([...flow.transport.crust], crust);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1)); flow.setClipping([plane]);
  assert.equal(flow.body.material.clippingPlanes[0], plane); assert.equal(flow.skin.material.clippingPlanes[0], plane);
  flow.dispose(); grain.dispose();
});

test('one admitted display clock moves only retained liquid; clast flight and deposition remain fixed', () => {
  const grain = new THREE.Texture(), frame = historyFrame(.3538, 'landscape'), env = environment();
  const flow = new HistoryFlowSurface(historyFlow(3, 'composite', frame), grain), cloud = new HistoryClastCloud(grain);
  cloud.setFrame(historyClasts('composite', frame));
  const fixedClasts = copy(cloud.mesh.instanceMatrix), fixedHeat = copy(cloud.heat), source = copy(flow.mesh.geometry.getAttribute('position'));
  let renders = 0;
  const motion = new MagmaDetailMotion(phase => { flow.applyPhase(phase); renders++; }, undefined, env);
  motion.setHot(historyDetailHot(frame, 'landscape', 1)); env.tick(0); env.tick(50); env.tick(100);
  assert.ok(renders > 0); assert.equal(env.pending, 1);
  assert.deepEqual(copy(cloud.mesh.instanceMatrix), fixedClasts); assert.deepEqual(copy(cloud.heat), fixedHeat);
  assert.deepEqual(copy(flow.mesh.geometry.getAttribute('position')), source);
  motion.setEnabled(false); const phase = motion.state.phase, paused = [...flow.transport.positions];
  env.tick(900000); assert.equal(env.pending, 0); assert.equal(motion.state.phase, phase); assert.deepEqual([...flow.transport.positions], paused);
  motion.setHot(false); motion.setHot(true); assert.equal(env.pending, 0, 'geological draws cannot undo the user pause');
  motion.resetPhase(); const reset = [...flow.transport.positions]; motion.resetPhase(); assert.deepEqual([...flow.transport.positions], reset);
  assert.equal(motion.state.enabled, false);
  motion.setEnabled(true); env.tick(900000); env.tick(900050); const beforeHide = motion.state.phase;
  env.setHidden(true); assert.equal(env.pending, 0); env.setHidden(false); env.tick(99999999); assert.equal(motion.state.phase, beforeHide);
  env.setReduced(true); assert.equal(env.pending, 0); env.setReduced(false); assert.equal(env.pending, 1);
  motion.setHot(false); assert.equal(env.pending, 0); motion.dispose(); assert.equal(env.listeners, 0);
  flow.dispose(); cloud.dispose(); grain.dispose();
});

test('history motion admission stops for ecology, cold surfaces and hidden underground views', () => {
  assert.equal(historyDetailHot(historyFrame(0, 'landscape'), 'section', 0), false);
  assert.equal(historyDetailHot(historyFrame(.04, 'landscape'), 'landscape', 0), false);
  assert.equal(historyDetailHot(historyFrame(.04, 'landscape'), 'section', 0), true);
  const warm = historyFrame(.70, 'landscape');
  assert.equal(warm.construction.supply, 0); assert.ok(warm.construction.heat > .01);
  assert.equal(historyDetailHot(warm, 'section', 0), true, 'residual hot melt need not stop with supply');
  const weak = historyUndergroundDetail(warm), supplied = historyUndergroundDetail(historyFrame(.25, 'landscape'));
  assert.ok(weak.storage > 0 && weak.storage < supplied.storage); assert.ok(weak.intrusion > 0 && weak.intrusion < supplied.intrusion);
  assert.deepEqual(historyUndergroundDetail(historyFrame(.8, 'landscape')), { storage: 0, intrusion: 0 });
  assert.deepEqual(historyUndergroundDetail(historyFrame(.3, 'life')), { storage: 0, intrusion: 0 });
  for (const view of ['landscape', 'section', 'vent']) {
    assert.equal(historyDetailHot(historyFrame(.8, 'landscape'), view, 0), false);
    assert.equal(historyDetailHot(historyFrame(.3, 'life'), view, 2), false);
  }
});

test('clast instances are finite, replayable and do not allocate a new geometry on history draws', () => {
  const grain = new THREE.Texture(), cloud = new HistoryClastCloud(grain);
  const geometry = cloud.mesh.geometry, matrices = cloud.mesh.instanceMatrix, heat = cloud.heat;
  cloud.setFrame(historyClasts('composite', historyFrame(.3538, 'landscape')));
  const first = copy(matrices), firstHeat = copy(heat); assert.equal(cloud.mesh.count, 108);
  cloud.setFrame(historyClasts('shield', historyFrame(.8, 'landscape'))); assert.equal(cloud.mesh.count, 36);
  cloud.setFrame(historyClasts('composite', historyFrame(.3538, 'landscape')));
  assert.equal(cloud.mesh.geometry, geometry); assert.equal(cloud.mesh.instanceMatrix, matrices); assert.equal(cloud.heat, heat);
  assert.deepEqual(copy(matrices), first); assert.deepEqual(copy(heat), firstHeat);
  cloud.setFrame(historyClasts('composite', historyFrame(.1, 'life'))); assert.ok([...matrices.array].every(Number.isFinite)); assert.ok([...heat.array].every(value => value === 0));
  cloud.dispose(); grain.dispose();
});

test('organic storage material consumes the same nine pockets and keeps crystals in stable rest coordinates', () => {
  const grain = new THREE.Texture(), style = historyStorageMaterial(grain), centers = style.centers.value, radii = style.radii.value;
  const pockets = style.pockets.value, pocketObjects = [...pockets], angles = style.pocketAngles.value;
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  style.material.onBeforeCompile(shader, {});
  assert.equal(shader.uniforms.uHistoryPockets, style.pockets); assert.equal(shader.uniforms.uHistoryHeat, style.domainHeat);
  assert.match(shader.vertexShader, /attribute vec3 historyRest/); assert.match(shader.vertexShader, /vStorage=historyRest/);
  assert.doesNotMatch(shader.vertexShader, /vStorage=position/);
  assert.match(shader.fragmentShader, /melt\*=historyOccupancy/); assert.match(shader.fragmentShader, /uStorageHeat\*historyDomainHeat/);
  assert.doesNotMatch(shader.fragmentShader, /localTop|uHistoryFill|uHistoryTransfer/, 'no horizontal liquid plane survives');
  assert.match(shader.fragmentShader, /1\.-crystalCore\*\.90/, 'dark fixed crystal cores remain within connected melt');
  assert.doesNotMatch(shader.fragmentShader, /\.2\+melt\*\.45/, 'cold framework has no uniform warm skin tint');
  const shapes = [];
  for (const p of [.02, .055, .25, .58]) {
    const frame = historyFrame(p, 'landscape'); style.setFrame(frame); shapes.push(pockets.flatMap(pocket => pocket.toArray()));
    assert.equal(style.heat.value, 1);
    for (let i = 0; i < 3; i++) {
      const state = historyStorage(i, frame);
      assert.deepEqual(style.centers.value[i].toArray(), state.center); assert.deepEqual(style.radii.value[i].toArray(), state.radii);
      close(style.domainHeat.value.getComponent(i), state.heat);
      for (let j = 0; j < 3; j++) {
        const pocket = state.organic.pockets[j], k = i * 3 + j;
        assert.deepEqual(pockets[k].toArray(), [pocket.center[0], pocket.center[1], pocket.radii[0], pocket.radii[1]]);
        close(angles[k], pocket.angle);
      }
    }
  }
  assert.notDeepEqual(shapes[0], shapes[1]); assert.notDeepEqual(shapes[1], shapes[3]);
  assert.equal(style.centers.value, centers); assert.equal(style.radii.value, radii); assert.equal(style.pockets.value, pockets); assert.equal(style.pocketAngles.value, angles);
  for (let i = 0; i < 9; i++) assert.equal(pockets[i], pocketObjects[i]);
  style.setFrame(historyFrame(.8, 'life')); assert.equal(style.heat.value, 0); assert.deepEqual(style.domainHeat.value.toArray(), [0, 0, 0]);
  style.material.dispose(); grain.dispose();
});

test('the retained storage and feeders deform on geological frames while phase leaves all geometry untouched', () => {
  const grain = new THREE.Texture(), style = historyStorageMaterial(grain), source = storageComplex(), original = [...source.positions];
  const body = new HistoryStorageProjection(source, style, true), geometry = body.mesh.geometry;
  const attributes = { ...geometry.attributes }, index = geometry.index, reference = [...body.rest];
  assert.equal(geometry.getAttribute('historyRest').array, body.rest);
  assert.equal(body.rest.byteLength, 276240, 'one bounded vec3 reference attribute for the retained body');
  body.setFrame(historyFrame(.02, 'landscape')); const first = copy(attributes.position);
  body.setFrame(historyFrame(.055, 'landscape')); const second = copy(attributes.position);
  assert.ok(second.some((value, at) => Math.abs(value - first[at]) > .02));
  assert.deepEqual([...attributes.position.array], [...historyStorageBody(body.rest, historyFrame(.055, 'landscape'))]);
  const versions = [attributes.position.version, attributes.normal.version, attributes.historyRest.version];
  body.setFrame(historyFrame(.055, 'landscape'));
  assert.deepEqual([attributes.position.version, attributes.normal.version, attributes.historyRest.version], versions, 'an unchanged geological state does no body work');
  for (const phase of [0, .8, 2.2, DETAIL_PERIOD]) body.applyPhase(phase);
  assert.equal(style.detailPhase.value, DETAIL_PERIOD); assert.deepEqual(copy(attributes.position), second);
  assert.deepEqual([attributes.position.version, attributes.normal.version, attributes.historyRest.version], versions);
  assert.deepEqual([...body.rest], reference); assert.deepEqual(source.positions, original);
  assert.equal(body.mesh.geometry, geometry); assert.equal(geometry.index, index);
  for (const [key, value] of Object.entries(attributes)) assert.equal(geometry.getAttribute(key), value);
  assert.ok(attributes.normal.array.every(Number.isFinite));
  body.setFrame(historyFrame(.02, 'landscape')); assert.deepEqual(copy(attributes.position), first, 'deformation is from rest without accumulated drift');
  for (let i = 0; i < 3; i++) {
    const feeder = new HistoryStorageProjection(intrusionSolid(feederCenterline(i), .045, .18), style);
    feeder.setFrame(historyFrame(.055, 'landscape'));
    assert.deepEqual(copy(feeder.mesh.geometry.getAttribute('position')), [...historyStorageBody(feeder.rest, historyFrame(.055, 'landscape'))]);
    feeder.dispose();
  }
  let released = 0; geometry.addEventListener('dispose', () => released++);
  body.dispose(); body.dispose(); assert.equal(released, 1); body.applyPhase(.3); assert.equal(style.detailPhase.value, DETAIL_PERIOD);
  style.material.dispose(); grain.dispose();
});

test('storage ambient detail is spatial, bounded and closes over the same two-pi material phase', () => {
  const grain = new THREE.Texture(), style = historyStorageMaterial(grain);
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  style.material.onBeforeCompile(shader, {});
  assert.match(shader.fragmentShader, /\.035\*sin\([^)]*-uStorageDetailPhase\)/);
  assert.match(shader.fragmentShader, /\.022\*cos\([^)]*uStorageDetailPhase\*2\.\)/);
  assert.match(shader.fragmentShader, /historyLocalLight\*liquidMask/, 'fixed crystals and host rock cannot participate in the light change');
  assert.ok(.035 + .022 < .06, 'local radiance modulation stays below six percent');
  const env = environment(), frame = historyFrame(.70, 'landscape'), before = JSON.stringify(frame);
  const motion = new MagmaDetailMotion(phase => { style.detailPhase.value = phase; }, undefined, env);
  style.setFrame(frame); style.detail.value = historyUndergroundDetail(frame).storage;
  motion.setHot(historyDetailHot(frame, 'section', 0)); env.tick(0); env.tick(50); assert.ok(style.detailPhase.value > 0);
  assert.equal(JSON.stringify(frame), before, 'automatic detail never advances the long construction clock');
  env.setHidden(true); assert.equal(env.pending, 0); env.setHidden(false); env.tick(999999); const phase = motion.state.phase;
  assert.equal(style.detailPhase.value, phase); env.setReduced(true); assert.equal(env.pending, 0);
  motion.setHot(false); motion.dispose(); assert.equal(env.pending, 0); assert.equal(env.listeners, 0);
  style.material.dispose(); grain.dispose();
});

test('camera references continuously reveal the prelude and retain the mature ecology mountain', () => {
  for (const kind of ['shield', 'composite']) for (const aspect of [.55, 1.36, 2.5]) for (const view of ['landscape', 'section', 'vent']) {
    let previous = historyCameraReference(kind, historyFrame(0, 'landscape'), view, aspect);
    for (let step = 1; step <= 500; step++) {
      const frame = historyFrame(step / 500, 'landscape'), next = historyCameraReference(kind, frame, view, aspect);
      assert.ok(Number.isFinite(next.scale) && next.scale > .15 && next.scale < 5);
      assert.ok(next.target.every(Number.isFinite)); assert.ok(Math.abs(next.scale / previous.scale - 1) < .08);
      assert.ok(Math.hypot(...next.target.map((value, i) => value - previous.target[i])) < .18);
      previous = next;
    }
    if (view !== 'vent') {
      assert.deepEqual(historyCameraReference(kind, historyFrame(.74, 'landscape'), view, aspect), historyCameraReference(kind, historyFrame(.3, 'life'), view, aspect));
      assert.ok(historyCameraReference(kind, historyFrame(.04, 'landscape'), view, aspect).scale < previous.scale);
    }
  }
});

test('following growth preserves orbit direction, user offset and zoom through a backward seek', () => {
  for (const kind of ['shield', 'composite']) for (const view of ['landscape', 'section', 'vent']) {
    const from = historyCameraReference(kind, historyFrame(.04, 'landscape'), view, 2.5), to = historyCameraReference(kind, historyFrame(.3538, 'landscape'), view, 2.5);
    const target = from.target.map((value, i) => value + [.1, -.07, .06][i]), position = target.map((value, i) => value + [4.2, 3.1, 8][i]);
    const followed = followHistoryReference(position, target, from, to), back = followHistoryReference(followed.position, followed.target, to, from);
    for (let i = 0; i < 3; i++) { close(back.position[i], position[i], 1e-10); close(back.target[i], target[i], 1e-10); close((followed.position[i] - followed.target[i]) / to.scale, (position[i] - target[i]) / from.scale, 1e-10); }
  }
});

test('the facade retains the detail preference in fallback and forwards explicit phase reset', () => {
  const facade = Object.create(LandHistoryScene.prototype), states = [];
  facade.disposed = false; facade.detailEnabled = true;
  facade.element = { dataset: { detailMotion: 'unavailable', detailEnabled: 'true', detailPhase: '.4' } };
  facade.setDetailMotion(false); assert.equal(facade.detailEnabled, false); assert.equal(facade.element.dataset.detailEnabled, 'false');
  facade.resetDetailPhase(); assert.equal(facade.element.dataset.detailPhase, '0.000000');
  facade.gpu = { setDetailMotion: enabled => states.push(enabled), resetDetailPhase: () => states.push('reset') };
  facade.setDetailMotion(true); facade.resetDetailPhase(); assert.deepEqual(states, [true, 'reset']);
  facade.disposed = true; facade.setDetailMotion(false); assert.deepEqual(states, [true, 'reset']);
});

test('flow and clast owners release every owned resource exactly once without disposing the shared grain', () => {
  const grain = new THREE.Texture(), flow = new HistoryFlowSurface(historyFlow(0, 'shield', historyFrame(.12, 'landscape')), grain), cloud = new HistoryClastCloud(grain);
  const resources = [flow.mesh.geometry, flow.movingMesh.geometry, flow.body.material, flow.skin.material, cloud.mesh, cloud.mesh.geometry, cloud.mesh.material];
  const counts = resources.map(() => 0); let sharedDisposed = 0;
  resources.forEach((resource, i) => resource.addEventListener('dispose', () => counts[i]++)); grain.addEventListener('dispose', () => sharedDisposed++);
  flow.dispose(); cloud.dispose(); flow.dispose(); cloud.dispose();
  assert.deepEqual(counts, resources.map(() => 1)); assert.equal(sharedDisposed, 0);
  assert.equal(flow.active, false); grain.dispose();
});
