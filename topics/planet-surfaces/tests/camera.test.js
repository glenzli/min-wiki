import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraPreset, boundPose, tourPose, cameraPosition } from '../camera.ts';
import { terrainHeight } from '../terrain3d.ts';
import { WORLDS } from '../model.ts';

test('requested patrol moves a camera around persistent geometry with visible parallax', () => {
 for (const view of ['landscape', 'globe', 'section']) {
  const origin = cameraPreset(view), start = cameraPosition(origin), later = cameraPosition(tourPose(view, origin, 4));
  assert.deepEqual(tourPose(view, origin, 0), origin, 'starting a tour does not snap');
  assert.ok(Math.hypot(...later.map((v, i) => v - start[i])) > origin.distance * .3);
  const a = cameraPosition(tourPose(view, origin, 4)), b = cameraPosition(tourPose(view, origin, 4.016));
  assert.ok(Math.hypot(...b.map((v, i) => v - a[i])) < origin.distance * .01, 'continuous motion between frames');
 }
});
test('camera bounds keep the cut face visible and stay finite under invalid controls', () => {
 for (const view of ['landscape', 'globe', 'section']) {
  for (const value of [-Infinity, -1e6, 0, 1e6, Infinity, NaN]) {
   const pose = boundPose(view, { yaw: value, pitch: value, distance: value });
   assert.ok(cameraPosition(pose).every(Number.isFinite));
   assert.ok(pose.distance > 2);
   if (view === 'section') assert.ok(cameraPosition(pose)[2] > 0);
  }
  for (const angle of ['front', 'oblique', 'overhead']) assert.ok(cameraPosition(cameraPreset(view, angle)).every(Number.isFinite));
 }
});
test('long cutaway tours never turn the exposed face away or change descent progress', () => {
 for (let t = 0; t < 600; t += .2) {
  const point = cameraPosition(tourPose('section', cameraPreset('section'), t));
  assert.ok(point[2] > 0);
 }
});
test('all eight terrain fields are deterministic finite surfaces without per-frame randomness', () => {
 for (const world of WORLDS) for (let i = 0; i < 500; i++) {
  const x = Math.sin(i) * 30, z = Math.cos(i * .83) * 30;
  const value = terrainHeight(world, x, z);
  assert.ok(Number.isFinite(value)); assert.ok(Math.abs(value) < 8);
  assert.equal(value, terrainHeight(world, x, z));
 }
});
