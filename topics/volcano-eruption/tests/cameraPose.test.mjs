import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { flowCameraPose } from '../eruption3d.ts';
import { lavaBranches, lavaRibbon, surfaceHeight } from '../eruptionGeometry.ts';
import { scenarioSettings } from '../eruptionScenarios.ts';

function camera(pose, aspect) {
  const result = new THREE.PerspectiveCamera(38, aspect, .1, 200);
  result.position.fromArray(pose.position); result.lookAt(...pose.target); result.updateMatrixWorld();
  return result;
}

function point(source, row, across = 5, rise = 0) {
  const result = new THREE.Vector3().fromArray(source.positions, (row * 11 + across) * 3);
  result.y += rise; return result;
}

test('the flow lens fits its local folds and both banks on wide and390px stages', () => {
  for (const landform of ['shield', 'composite']) for (const [width, height] of [[1160, 374], [1160, 464], [310, 390], [310, 450]]) {
    const settings = scenarioSettings('gentle-flow', { landform, strength: 1 }), aspect = width / height;
    const pose = flowCameraPose(settings, aspect), view = camera(pose, aspect);
    const source = lavaRibbon(.84, settings, lavaBranches(settings)[pose.branch]);
    for (let row = 52; row <= 74; row += 2) for (const across of [0, 5, 10]) for (const rise of [0, .115]) {
      const projected = point(source, row, across, rise).project(view);
      assert.ok(Math.abs(projected.x) < .78 && projected.y > -.39 && projected.y < .83, 'local folds clear the viewport and lower controls');
      assert.ok(projected.z > -1 && projected.z < 1);
    }
    const a = point(source, 63, 0).project(view), b = point(source, 63, 10).project(view);
    const bankPixels = Math.hypot((a.x - b.x) * width / 2, (a.y - b.y) * height / 2);
    assert.ok(bankPixels > 70, 'flow inspection provides more than a thin whole-mountain stripe');
    assert.ok(pose.radius >= 2.5 && pose.radius < 4);
    assert.ok(pose.position[1] > surfaceHeight(pose.position[0], pose.position[2], landform) + .5);
  }
});

test('small and large lava share the same pose and the small head stays in the inspection', () => {
  for (const landform of ['shield', 'composite']) for (const [width, height] of [[1160, 374], [310, 390]]) {
    const settings = scenarioSettings('gentle-flow', { landform }), aspect = width / height, before = { ...settings };
    const pose = flowCameraPose(settings, aspect);
    assert.deepEqual(pose, flowCameraPose({ ...settings, strength: 1 }, aspect));
    assert.deepEqual(pose, flowCameraPose({ ...settings, strength: 0 }, aspect));
    assert.deepEqual(settings, before);
    const source = lavaRibbon(.84, settings, lavaBranches(settings)[pose.branch]), view = camera(pose, aspect);
    const head = point(source, 100).project(view);
    assert.ok(Math.abs(head.x) < .4 && head.y > -.1 && head.y < .4);
    const a = point(source, 85, 0).project(view), b = point(source, 85, 10).project(view);
    assert.ok(Math.hypot((a.x - b.x) * width / 2, (a.y - b.y) * height / 2) > 30);
  }
});

test('multi-vent and extreme-aspect flow poses remain finite and bounded', () => {
  for (const aspect of [.35, .65, 1, 2.5, 4, Number.NaN]) for (const id of ['gentle-flow', 'fissure-flow']) {
    const pose = flowCameraPose(scenarioSettings(id, { landform: 'composite' }), aspect);
    assert.ok([...pose.target, ...pose.position, pose.radius].every(Number.isFinite));
    assert.ok(pose.radius >= 2.5 && pose.radius < 7);
  }
});
