import test from 'node:test';
import assert from 'node:assert/strict';
import { stateAt, stopping } from '../model.ts';
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
test('doubling speed doubles reaction distance and quadruples braking distance', () => {
  const low = stopping(30, 'dry'), high = stopping(60, 'dry');
  close(high.reactionDistance, low.reactionDistance * 2);
  close(high.brakingDistance, low.brakingDistance * 4);
  assert.ok(high.totalDistance < low.totalDistance * 4);
});
test('wet comparison changes braking distance without altering reaction distance', () => {
  const dry = stopping(30, 'dry'), wet = stopping(30, 'wet');
  close(dry.reactionDistance, wet.reactionDistance);
  close(wet.brakingDistance, dry.brakingDistance * 2);
});
test('motion remains continuous through reaction, braking and stop; never reverses', () => {
  for (const road of ['dry', 'wet']) {
    const plan = stopping(60, road);
    close(stateAt(60, road, 1).distance, plan.reactionDistance);
    close(stateAt(60, road, 1).speed, plan.speed);
    const final = stateAt(60, road, plan.totalTime);
    close(final.distance, plan.totalDistance); close(final.speed, 0);
    assert.equal(final.phase, 'stopped');
    assert.deepEqual(stateAt(60, road, plan.totalTime + 100), final);
    let previousDistance = 0, previousSpeed = plan.speed;
    for (let time = 0; time <= plan.totalTime + 1; time += .03) {
      const state = stateAt(60, road, time);
      assert.ok(state.distance >= previousDistance - 1e-9);
      assert.ok(state.speed <= previousSpeed + 1e-9);
      previousDistance = state.distance; previousSpeed = state.speed;
    }
  }
});
