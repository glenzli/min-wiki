import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneMarkup, plumeParcel, type SceneFrame } from '../scene.ts';
import { SEA_LEVEL } from '../model.ts';
const frame: SceneFrame = { progress: .35, weights: [1, 0, 0], supplyMix: 0, camera: [325, 226, 350, 233.333], section: .65 };

test('deep projection uses local ROV lighting and never sunlight shafts', () => {
  const deep = sceneMarkup(frame);
  assert.ok(deep.includes('data-lighting="rov"'));
  assert.ok(deep.includes('data-lighting="deep"'));
  assert.equal(deep.includes('data-lighting="sunlit-shallows"'), false);
  assert.ok(sceneMarkup({ ...frame, weights: [0, 1, 0] }).includes('data-lighting="sunlit-shallows"'));
});

test('underwater particulate parcels stay below the surface and finish without looping', () => {
  for (const environment of ['deep', 'shallow'] as const) for (let i = 0; i < 30; i++) {
    for (const progress of [0, .2, .45, .8, 1]) {
      const packet = plumeParcel(progress, i, environment === 'deep' ? 345 : 184, environment);
      assert.ok(packet.y > SEA_LEVEL);
      assert.ok(packet.opacity >= 0 && packet.opacity <= .46);
    }
    assert.equal(plumeParcel(0, i, 345, environment).opacity, 0);
    assert.equal(plumeParcel(1, i, 345, environment).opacity, 0);
  }
});

test('suspended particles and above-water condensation have different clipped projections', () => {
  const deep = sceneMarkup(frame), shallow = sceneMarkup({ ...frame, weights: [0, 1, 0] });
  assert.ok(deep.includes('data-material="suspended-particles" clip-path="url(#underwater)"'));
  assert.equal(deep.includes('data-material="condensation"'), false);
  assert.ok(shallow.includes('data-material="condensation" clip-path="url(#above-water)"'));
});

test('text-free deterministic detail remains stable at pause and at all scenario endpoints', () => {
  for (const weights of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as [number, number, number][]) {
    for (const progress of [.35, 1]) {
      const state = { ...frame, weights, progress };
      const a = sceneMarkup(state), b = sceneMarkup(state);
      assert.equal(a, b);
      assert.equal(/<text[ >]/.test(a), false);
      assert.equal(/NaN|Infinity/.test(a), false);
    }
  }
});
