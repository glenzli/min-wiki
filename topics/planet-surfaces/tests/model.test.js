import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, encounter, layersFor, markerY, SECTION, field, noise } from '../model.ts';
const world = id => WORLDS.find(w => w.id === id);

test('eight worlds distinguish planets, an icy moon, and an inferred exoplanet surface', () => {
 assert.equal(WORLDS.length, 8);
 assert.equal(world('titan').body, 'moon');
 assert.equal(world('titan').evidence, 'observed');
 assert.equal(world('cancri').body, 'exoplanet');
 assert.equal(world('cancri').evidence, 'inferred');
 assert.equal(new Set(WORLDS.map(w => w.id)).size, WORLDS.length);
});
test('water, hydrocarbons and molten rock have distinct encounters and endpoints', () => {
 assert.equal(world('earth').liquid, 'water');
 assert.deepEqual(layersFor(world('earth')), ['air', 'water', 'seabed']);
 assert.equal(world('titan').liquid, 'hydrocarbon');
 assert.deepEqual(layersFor(world('titan')), ['air', 'hydrocarbon', 'icy-bed']);
 assert.equal(world('cancri').liquid, 'silicate-melt');
 assert.deepEqual(layersFor(world('cancri')), ['air', 'melt']);
 assert.equal(encounter(world('cancri'), 1), 'melt', 'do not invent a measured magma-ocean floor');
 for (const id of ['titan', 'cancri']) assert.ok(!layersFor(world(id)).includes('water'));
});
test('giants remain deep fluid and never acquire a surface ocean or landing floor', () => {
 for (const id of ['jupiter', 'neptune']) {
  const w = world(id), layers = Array.from({ length: 101 }, (_, i) => encounter(w, i / 100));
  assert.equal(w.surface, false); assert.equal(w.liquid, 'none');
  assert.ok(layers.every(layer => ['clouds', 'dense-fluid'].includes(layer)));
  assert.equal(layers.at(-1), 'dense-fluid');
 }
});
test('descent marker crosses each material boundary continuously and rests on measured-type beds', () => {
 for (const w of WORLDS) {
  let previous = markerY(w, 0);
  for (let i = 1; i <= 1000; i++) {
   const value = markerY(w, i / 1000);
   assert.ok(Number.isFinite(value)); assert.ok(value >= previous);
   assert.ok(value - previous < 1); previous = value;
   assert.ok(layersFor(w).includes(encounter(w, i / 1000)));
  }
  if (w.liquid === 'water' || w.liquid === 'hydrocarbon') {
   assert.equal(markerY(w, .38), SECTION.interface);
   assert.equal(markerY(w, 1), SECTION.bed);
  } else if (w.surface && w.liquid === 'none') assert.equal(markerY(w, 1), SECTION.interface);
  else assert.equal(markerY(w, 1), SECTION.bottom);
 }
});
test('invalid progress cannot emit non-finite rendering state', () => {
 for (const w of WORLDS) for (const p of [-Infinity, -10, 0, .4, 1, 3, Infinity, NaN]) {
  assert.ok(Number.isFinite(markerY(w, p)));
  assert.ok(layersFor(w).includes(encounter(w, p)));
 }
});
test('deterministic bounded detail fields do not flicker for a fixed view', () => {
 for (let i = 0; i < 100; i++) {
  const x = Math.sin(i) * 310, y = Math.cos(i * .2) * 490;
  assert.equal(noise(x, y), noise(x, y));
  assert.ok(Math.abs(noise(x, y)) <= 1); assert.ok(Math.abs(field(x, y)) <= 1);
 }
});
