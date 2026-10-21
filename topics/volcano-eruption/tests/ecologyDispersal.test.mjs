import test from 'node:test';
import assert from 'node:assert/strict';
import { seedDispersal, seedHiddenByTerrain } from '../ecologyDispersal.ts';
import { OMURO_SITES } from '../omuroJourney.ts';

test('seed projection keeps the original finite identities and arrival thresholds', () => {
  for (const site of OMURO_SITES) {
    const sample = seedDispersal(site.index, .6, [2, .5, 1]);
    assert.equal(sample.index, site.index);
    assert.equal(sample.arrivalStart, site.arrivalStart);
    assert.equal(sample.arrivalEnd, site.arrivalEnd);
    assert.equal(sample.settled, .6 >= site.arrivalEnd);
  }
  const observed = new Set(); let maximum = 0;
  for (let step = 0; step <= 1000; step++) {
    let active = 0;
    for (let index = 0; index < 100; index++) {
      const sample = seedDispersal(index, step / 1000, [0, 0, 0]);
      if (sample.visible) { active++; observed.add(index); }
    }
    maximum = Math.max(maximum, active);
  }
  assert.equal(observed.size, 25, 'the same selected seeds remain represented over the sequence');
  assert.ok([...observed].every(index => index % 4 === 0));
  assert.ok(maximum <= 8, 'short staggered approaches remain a sparse sample rather than a seed shower');
});

test('visible seed routes stay low over the actual local terrain and settle at their own sites', () => {
  const surface = (x, z) => .35 * x + .035 * Math.sin(x * 8) + .025 * Math.sin(z * 7);
  const routes = new Set(), headings = new Set(), lengths = new Set();
  for (let index = 0; index < 100; index += 4) {
    const target = [index / 40, 0, .7]; target[1] = surface(target[0], target[2]);
    const end = seedDispersal(index, .6, target, surface).arrivalEnd;
    for (let i = 0; i <= 60; i++) {
      const sample = seedDispersal(index, end - .06 + i / 1000, target, surface);
      const clearance = sample.position[1] - surface(sample.position[0], sample.position[2]);
      assert.ok(clearance >= -1e-12 && clearance < .06, 'not a long drop from above the mountain');
      assert.ok(Math.hypot(sample.position[0] - target[0], sample.position[2] - target[2]) < .64);
      assert.ok(sample.size >= .003 && sample.size <= .0055);
      assert.ok(sample.opacity >= 0 && sample.opacity <= 1);
      assert.ok(sample.position.every(Number.isFinite));
    }
    const landed = seedDispersal(index, end, target, surface);
    assert.equal(landed.settled, true); assert.deepEqual(landed.position, target);
    assert.equal(seedDispersal(index, 1, target, surface).visible, false);
    routes.add(landed.route); headings.add(landed.angle); lengths.add(landed.size);
  }
  assert.equal(routes.size, 2); assert.ok(headings.size > 10); assert.ok(lengths.size > 10);
});

test('projection can be sought backward and forward without moving site or changing transport history', () => {
  const target = [1.2, .5, -.3], surface = (x, z) => .5 + (x - 1.2) * .3 + (z + .3) * .2;
  for (const index of [0, 8, 32, 72, 96]) {
    const p = seedDispersal(index, 0, target).arrivalEnd - .014;
    const sample = seedDispersal(index, p, target, surface);
    seedDispersal(index, 1, target, surface); seedDispersal(index, .2, target, surface);
    assert.deepEqual(seedDispersal(index, p, target, surface), sample);
    assert.equal(seedDispersal(index, NaN, target, surface).visible, false);
  }
  assert.deepEqual(target, [1.2, .5, -.3]);
});

test('the SVG sightline hides seeds behind a near ridge while leaving unobstructed paths visible', () => {
  const ridge = (_x, z) => z >= 1 && z <= 2 ? 1 : 0;
  assert.equal(seedHiddenByTerrain([0, .03, 0], ridge, [0, .1, 1]), true);
  assert.equal(seedHiddenByTerrain([0, .03, 0], ridge, [0, 1.2, 1]), false);
  assert.equal(seedHiddenByTerrain([0, .02, 0], () => 0, [0, .4, 1]), false);
});
