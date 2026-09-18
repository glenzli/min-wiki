import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, field, noise } from '../model.ts';
const world = id => WORLDS.find(w => w.id === id);

test('eight worlds distinguish planets, an icy moon, and an inferred exoplanet surface', () => {
 assert.equal(WORLDS.length, 8);
 assert.equal(world('titan').body, 'moon');
 assert.equal(world('titan').evidence, 'observed');
 assert.equal(world('cancri').body, 'exoplanet');
 assert.equal(world('cancri').evidence, 'inferred');
 assert.equal(new Set(WORLDS.map(w => w.id)).size, WORLDS.length);
});
test('visible surface materials stay distinct from deep interior models', () => {
 assert.equal(world('earth').liquid, 'water');
 assert.equal(world('titan').liquid, 'hydrocarbon');
 assert.equal(world('cancri').liquid, 'silicate-melt');
 for (const id of ['jupiter', 'neptune']) {
  assert.equal(world(id).surface, false);
  assert.equal(world(id).liquid, 'none', 'deep fluids are not an exposed surface ocean');
 }
});
test('deterministic bounded detail fields do not flicker for a fixed view', () => {
 for (let i = 0; i < 100; i++) {
  const x = Math.sin(i) * 310, y = Math.cos(i * .2) * 490;
  assert.equal(noise(x, y), noise(x, y));
  assert.ok(Math.abs(noise(x, y)) <= 1); assert.ok(Math.abs(field(x, y)) <= 1);
 }
});
