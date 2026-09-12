import test from 'node:test';
import assert from 'node:assert/strict';
import { impactEnergy, ejectaPosition, LUNAR_GRAVITY, terrain, craterRadius } from '../model.ts';
test('impact energy follows velocity squared and diameter cubed', () => {
  const base = impactEnergy(100, 20);
  assert.equal(impactEnergy(100, 40) / base, 4); assert.equal(impactEnergy(200, 20) / base, 8);
});
test('lunar ejecta return to their launch level with no atmospheric drag', () => {
  const speed = 20, angle = Math.PI / 4, flight = 2 * speed * Math.sin(angle) / LUNAR_GRAVITY;
  const [x, y] = ejectaPosition(speed, angle, flight); assert.ok(x > 0); assert.ok(Math.abs(y) < 1e-9);
});
test('final simple crater has a depressed center and elevated rim', () => {
  const settings = { diameter: 100, speed: 20 }, radius = craterRadius(settings);
  assert.equal(terrain(0, 0, settings), 64);
  assert.ok(terrain(0, 1, settings) > 64); assert.ok(terrain(radius * 1.04, 1, settings) < 64);
});
