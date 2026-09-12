import test from 'node:test';
import assert from 'node:assert/strict';
import { litFraction, moonPosition, SYNODIC_DAYS, SIDEREAL_DAYS, DISTANCE_EARTH_RADII, MOON_EARTH_RADIUS_RATIO } from '../model.ts';
test('phase geometry matches new, quarter and full Moon', () => {
  for (const [p, expected] of [[0, 0], [.25, .5], [.5, 1], [.75, .5], [1, 0]]) assert.ok(Math.abs(litFraction(p) - expected) < 1e-12);
});
test('illustrative orbit is continuous and separate from true display scale', () => {
  for (let i = 0; i <= 100; i++) assert.ok(Math.abs(Math.hypot(...moonPosition(i / 100)) - 11) < 1e-10);
  assert.ok(DISTANCE_EARTH_RADII > 60 && DISTANCE_EARTH_RADII < 61);
  assert.ok(MOON_EARTH_RADIUS_RATIO > .27 && MOON_EARTH_RADIUS_RATIO < .28);
  assert.ok(SYNODIC_DAYS > SIDEREAL_DAYS);
});

// Continuous scrubbing must wrap to the next new Moon, not leave the last-quarter story selected.
test('phase neighborhoods agree with quarter landmarks and wrap at a full cycle', async () => {
  const { phaseIndex } = await import('../model.ts');
  assert.deepEqual([0, .125, .25, .375, .5, .625, .75, .875, 1].map(phaseIndex), [0,1,2,3,4,5,6,7,0]);
});
