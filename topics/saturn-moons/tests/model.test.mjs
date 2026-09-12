import test from 'node:test';
import assert from 'node:assert/strict';
import { MOONS, orbitalAngle, comparisonRadius } from '../model.ts';
test('satellite periods and physical sizes retain their observed ordering', () => {
  assert.equal(MOONS.length, 7);
  for (let i = 1; i < MOONS.length; i++) { assert.ok(MOONS[i].distance > MOONS[i - 1].distance); assert.ok(MOONS[i].period > MOONS[i - 1].period); }
  assert.equal(MOONS.reduce((largest, m) => m.radius > largest.radius ? m : largest).id, 'titan');
});
test('one elapsed orbital period returns to the same direction', () => {
  MOONS.forEach((moon, i) => assert.ok(Math.abs(orbitalAngle(moon.period / 16, i) - orbitalAngle(0, i) - Math.PI * 2) < 1e-10));
});
test('size comparison uses one physical radius scale even for small moons', () => {
  for (let i = 0; i < MOONS.length; i++) assert.ok(Math.abs(comparisonRadius(i) / comparisonRadius(5) - MOONS[i].radius / MOONS[5].radius) < 1e-12);
});
