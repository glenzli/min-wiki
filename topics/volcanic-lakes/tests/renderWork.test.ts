import test from 'node:test';
import assert from 'node:assert/strict';
import { Lake3DScene } from '../scene3d.ts';
import { lakeFrame, type LakeFrame } from '../geometry3d.ts';
import type { Settings } from '../model.ts';

const settings: Settings = { basin: 'caldera', supply: .75, leak: 'low' };
/** Use the actual draw dependency gate; GPU/geometry correctness is covered
 * separately. No constructor, browser, process timer or WebGL is created. */
function owner() {
  const calls = { geology: 0, fracture: 0, water: 0, withdrawal: 0, render: 0, fit: 0 };
  const canvas = { dataset: {} as Record<string, string> };
  const scene = Object.assign(Object.create(Lake3DScene.prototype), {
    canvas, frame: lakeFrame(0, settings), disposed: false, prepared: false,
    hasSize: true, manualCamera: false, movingCamera: false, view: 'section',
    geologyUpdates: 0, waterUpdates: 0, lastGeologyMs: 0,
    renderer: { shadowMap: { needsUpdate: false } },
    updateGeology(_frame: LakeFrame) { calls.geology++; },
    updateFracture(_frame: LakeFrame) { calls.fracture++; },
    updateWithdrawal(_frame: LakeFrame) { calls.withdrawal++; },
    updateWater(_frame: LakeFrame) { calls.water++; },
    render() { calls.render++; }, fitCamera() { calls.fit++; },
  });
  return { scene, calls, canvas };
}

test('filling and repeated stable frames never rebuild the settled rock', () => {
  const { scene, calls, canvas } = owner(); scene.draw(.48, settings);
  const rocks = calls.geology, cracks = calls.fracture; scene.renderer.shadowMap.needsUpdate = false;
  for (const p of [.51, .65, .85, 1]) scene.draw(p, settings);
  assert.equal(calls.geology, rocks); assert.equal(calls.fracture, cracks);
  assert.equal(scene.renderer.shadowMap.needsUpdate, false);
  const stable = { ...calls };
  for (let i = 0; i < 100; i++) scene.draw(1, { ...settings });
  assert.deepEqual(calls, stable); assert.equal(canvas.dataset.progress, '1.00000');
  assert.equal(canvas.dataset.geologyUpdates, String(rocks)); assert.equal(canvas.dataset.waterUpdates, String(stable.water));
  assert.equal(canvas.dataset.lastDrawMs, '0.000');
  assert.equal(canvas.dataset.lastGeologyMs, '0.000');
});

test('withdrawal and fracture updates do not deform the roof before subsidence', () => {
  const { scene, calls } = owner(); scene.draw(.13, settings); const rocks = calls.geology;
  scene.draw(.23, settings); scene.draw(.26, settings);
  assert.equal(calls.geology, rocks); assert.ok(calls.fracture > 1); assert.ok(calls.withdrawal > 1);
  assert.equal(scene.frame.subsidence, 0); assert.equal(calls.fit, 0);
  scene.draw(.33, settings); assert.equal(calls.geology, rocks + 1); assert.equal(calls.fit, 0);
});

test('water-condition changes keep rock and camera identity, including mutated input objects', () => {
  const { scene, calls } = owner(), input = { ...settings }; scene.draw(.85, input); const before = { ...calls };
  input.supply = 0; scene.draw(.85, input); assert.equal(scene.frame.fraction, 0);
  input.supply = .75; input.leak = 'high'; scene.draw(.85, input); assert.equal(scene.frame.fraction, 0);
  assert.equal(calls.geology, before.geology); assert.equal(calls.fracture, before.fracture); assert.equal(calls.fit, before.fit);
  assert.equal(calls.water, before.water + 2);
});

test('rapid seek uses the latest frame without queued process work and replays exactly', () => {
  const { scene, calls } = owner(); scene.draw(.36, settings); const target = structuredClone(scene.frame);
  for (const p of [.85, .23, .48, .13, 1, .36]) scene.draw(p, settings);
  assert.deepEqual(scene.frame, target); assert.equal(calls.geology, 7); assert.equal(calls.render, 7);
  scene.disposed = true; const stopped = { ...calls }; scene.draw(.85, settings); assert.deepEqual(calls, stopped);
});

test('branch switching invalidates shape work while diagnostic mutations cannot steer state', () => {
  const { scene, calls, canvas } = owner(); scene.draw(.85, settings); const before = calls.geology;
  canvas.dataset.progress = '0'; canvas.dataset.geologyUpdates = '999';
  scene.draw(.85, { ...settings, basin: 'crater' }); assert.equal(calls.geology, before + 1); assert.equal(calls.fit, 1);
  assert.equal(scene.frame.kind, 'crater'); assert.equal(scene.frame.subsidence, 0); assert.equal(canvas.dataset.progress, '0.85000');
  scene.draw(.85, settings); assert.equal(calls.geology, before + 2); assert.equal(scene.frame.kind, 'caldera');
});
