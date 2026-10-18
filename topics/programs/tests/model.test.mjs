import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgram, stepProgram, setObstacle, resetProgram, fixOrder, playProgram, pauseProgram, tickProgram, COMMAND_INTERVAL } from '../model.ts';
function finish(state) { for (let i = 0; i < 20 && !['error', 'finished'].includes(state.status); i++) state = stepProgram(state); return state; }
test('order: same cart picks up, crosses four squares and delivers the same parcel', () => {
  const initial = createProgram('sequence'); const loaded = stepProgram(initial);
  assert.deepEqual(initial.position, { x: 1, y: 1 }); assert.equal(initial.parcel, 'pickup');
  assert.equal(loaded.parcel, 'onboard'); assert.deepEqual(loaded.position, initial.position);
  const done = finish(loaded); assert.equal(done.status, 'finished'); assert.equal(done.parcel, 'delivered');
  assert.deepEqual(done.position, { x: 5, y: 1 }); assert.equal(done.executed, 6); assert.equal(done.trail.length, 5);
});
test('wrong order fails at pickup command without teleporting parcel to robot', () => {
  const first = stepProgram(createProgram('debug')); assert.deepEqual(first.position, { x: 2, y: 1 });
  const failure = stepProgram(first); assert.equal(failure.status, 'error'); assert.equal(failure.fault, 'not-at-pickup');
  assert.equal(failure.parcel, 'pickup'); assert.equal(failure.pc, 2); assert.equal(failure.last, 'base-1');
  assert.strictEqual(stepProgram(failure), failure); assert.strictEqual(playProgram(failure), failure);
});
test('fixing order explicitly starts a new test and successfully delivers', () => {
  const failed = finish(createProgram('debug')); const fixed = fixOrder(failed, true);
  assert.equal(fixed.executed, 0); assert.equal(fixed.parcel, 'pickup'); assert.equal(fixed.corrected, true);
  assert.equal(finish(fixed).parcel, 'delivered'); assert.equal(finish(fixOrder(fixed, false)).fault, 'not-at-pickup');
});
for (const blocked of [false, true]) test(`decision samples ${blocked ? 'blocked' : 'clear'} input and executes selected route`, () => {
  let s = createProgram('condition', false, blocked); s = stepProgram(stepProgram(s));
  assert.equal(s.sensor, null); assert.deepEqual(s.position, { x: 2, y: 1 });
  const selected = stepProgram(s); assert.equal(selected.sensor, blocked); assert.equal(selected.choice, blocked ? 'blocked' : 'clear');
  assert.equal(selected.instructions[3].operation, blocked ? 'north' : 'east');
  const done = finish(selected); assert.equal(done.status, 'finished'); assert.equal(done.parcel, 'delivered');
  assert.equal(done.executed, blocked ? 9 : 7);
  assert.equal(done.trail.some(p => p.x === 3 && p.y === 1), !blocked);
});
test('changing obstacle before the decision affects that decision', () => {
  let s = stepProgram(stepProgram(createProgram('condition'))); s = setObstacle(s, false); s = stepProgram(s);
  assert.equal(s.choice, 'clear'); assert.equal(finish(s).status, 'finished');
});
test('late box invokes screen overlap guard without resampling sensor or rewriting choice', () => {
  let s = createProgram('condition', false, false); for (let i = 0; i < 3; i++) s = stepProgram(s);
  s = setObstacle(s, true); assert.equal(s.sensor, false); assert.equal(s.choice, 'clear');
  s = stepProgram(s); assert.equal(s.fault, 'obstacle'); assert.deepEqual(s.position, { x: 2, y: 1 });
  assert.equal(s.parcel, 'onboard');
});
test('removing obstacle after blocked decision does not rewrite detour', () => {
  let s = createProgram('condition'); for (let i = 0; i < 3; i++) s = stepProgram(s);
  s = setObstacle(s, false); assert.equal(s.choice, 'blocked'); assert.equal(s.sensor, true);
  const done = finish(s); assert.equal(done.parcel, 'delivered'); assert.ok(done.trail.some(p => p.y === 0));
});
test('pause ignores elapsed time and resuming retains partial wait', () => {
  let s = playProgram(createProgram('sequence')); s = tickProgram(s, 200); const paused = pauseProgram(s);
  assert.strictEqual(tickProgram(paused, 90000), paused); assert.equal(paused.executed, 0);
  s = playProgram(paused); for (let i = 0; i < 4; i++) s = tickProgram(s, 200);
  assert.equal(s.executed, 0); s = tickProgram(s, COMMAND_INTERVAL - 1000);
  assert.equal(s.executed, 1); assert.equal(s.parcel, 'onboard');
});
test('large resume gap is capped and cannot skip multiple commands', () => {
  const s = tickProgram(playProgram(createProgram('sequence')), 100000);
  assert.equal(s.executed, 0); assert.equal(s.elapsed, 250);
});
test('invalid time and non-running states cannot advance program', () => {
  const ready = createProgram('sequence'); assert.strictEqual(tickProgram(ready, 1100), ready);
  const running = playProgram(ready); for (const n of [NaN, Infinity, -1, 0]) assert.strictEqual(tickProgram(running, n), running);
});
test('reset keeps chosen program and current input but clears sampled sensor/history', () => {
  const before = setObstacle(finish(createProgram('condition')), false); const s = resetProgram(before);
  assert.equal(s.obstacle, false); assert.equal(s.sensor, null); assert.equal(s.choice, null); assert.equal(s.status, 'ready');
  assert.equal(s.trail.length, 1); assert.equal(s.instructions.length, 4); assert.equal(s.parcel, 'pickup');
});
test('independent scenario objects retain their own experiment histories', () => {
  const states = { sequence: stepProgram(createProgram('sequence')), condition: createProgram('condition'), debug: createProgram('debug') };
  states.condition = finish(states.condition); assert.equal(states.sequence.pc, 1); assert.equal(states.sequence.parcel, 'onboard');
  assert.equal(states.debug.pc, 0); assert.equal(states.condition.parcel, 'delivered');
});
