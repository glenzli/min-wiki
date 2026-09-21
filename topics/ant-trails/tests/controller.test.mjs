import test from 'node:test';
import assert from 'node:assert/strict';
import { createAntController } from '../controller.ts';
import { readState } from '../model.ts';

function harness(search = '?chapter=forage') {
  let index = 0, time = 0; const pending = new Map(), history = new Map(), paints = [];
  const scheduler = { request(callback) { pending.set(++index, callback); history.set(index, callback); return index; }, cancel(id) { pending.delete(id); } };
  const controller = createAntController(readState(search), scheduler, (state, playing) => paints.push({ state, playing }));
  return { controller, paints, pending, history, step(ms = 80) { time += ms; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); } };
}
test('real controller is user-started, finite, and retains one scheduler request', () => {
  const h = harness(); assert.equal(h.pending.size, 0); assert.equal(h.controller.state.time, 0);
  h.controller.play(); assert.equal(h.pending.size, 1);
  h.controller.play(); assert.equal(h.pending.size, 1);
  for (let i = 0; i < 500; i++) { h.step(); assert.ok(h.pending.size <= 1); }
  assert.equal(h.controller.state.time, 100); assert.equal(h.controller.playing, false); assert.equal(h.pending.size, 0);
});
test('seeking and hiding invalidate stale frames without losing model progress or auto-resuming', () => {
  const h = harness(); h.controller.play(); const stale = [...h.history.values()][0]; h.step(); h.step();
  h.controller.seek(64); const before = h.paints.length; stale(9000);
  assert.equal(h.controller.state.time, 64); assert.equal(h.paints.length, before); assert.equal(h.pending.size, 0);
  h.controller.play(); h.step(); h.step(); const saved = h.controller.state.time;
  h.controller.visible(false); assert.equal(h.pending.size, 0); h.step(10000); h.controller.visible(true);
  assert.equal(h.controller.state.time, saved); assert.equal(h.controller.playing, false); assert.equal(h.pending.size, 0);
});
test('chapters preserve W1 time and conditions have separate comparison histories', () => {
  const h = harness(); h.controller.seek(75); h.controller.chapter('nest');
  assert.equal(h.controller.state.time, 75); h.controller.patch({ brood: .62 }); assert.equal(h.controller.state.time, 75);
  h.controller.condition('blocked'); assert.equal(h.controller.state.time, 0); h.controller.seek(88);
  h.controller.condition('intact'); assert.equal(h.controller.state.time, 75); h.controller.condition('blocked'); assert.equal(h.controller.state.time, 88);
  h.controller.chapter('body'); h.controller.play(); assert.equal(h.pending.size, 0);
});
test('disposal makes running callbacks inert and cancels the active scheduler', () => {
  const h = harness(); h.controller.play(); const stale = [...h.history.values()][0]; h.controller.dispose();
  const length = h.paints.length; stale(30000); h.controller.play(); h.controller.dispose();
  assert.equal(h.pending.size, 0); assert.equal(h.paints.length, length);
});
