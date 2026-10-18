import test from 'node:test';
import assert from 'node:assert/strict';
import { RenderQueue } from '../renderQueue.ts';

function harness(draw, interval = 0) {
  const pending = new Map();
  let id = 0;
  const queue = new RenderQueue(draw, callback => {
    pending.set(id, callback);
    return id++;
  }, frame => pending.delete(frame), interval);
  return {queue, pending, frame(now = 0) {
    const callbacks = [...pending.values()]; pending.clear();
    callbacks.forEach(callback => callback(now));
  }};
}

test('startup, camera and state changes share one draw of the latest scene', () => {
  let state = 'initial'; const draws = [];
  const h = harness(() => draws.push(state));
  for (const change of ['resize', 'camera', 'mature cloud', 'airflow', 'caption update', 'observer']) {
    state = change; h.queue.request();
  }
  assert.equal(h.pending.size, 1);
  h.frame(); assert.deepEqual(draws, ['observer']);
  state = 'next observation'; h.queue.request(); h.frame();
  assert.deepEqual(draws, ['observer', 'next observation']);
});

test('software playback cannot flood the GPU and renders the latest paused state', () => {
  let state = 'first'; const draws = [];
  const h = harness(() => draws.push(state), 1500);
  h.queue.request(); h.frame(0);
  for (let now = 16; now < 1500; now += 16) {
    state = `playing ${now}`; h.queue.request(); h.frame(now);
  }
  assert.deepEqual(draws, ['first']);
  state = 'paused final'; h.queue.request(); h.frame(1500);
  assert.deepEqual(draws, ['first', 'paused final']);
  assert.equal(h.pending.size, 0);
});

test('disposal cancels pending GPU work and ignores later resize or camera events', () => {
  let draws = 0; const h = harness(() => draws++);
  h.queue.request(); h.queue.dispose(); h.queue.request(); h.frame();
  assert.equal(h.pending.size, 0); assert.equal(draws, 0);
});

test('a cancelled callback already captured by the browser cannot draw a disposed scene', () => {
  let draws = 0; const h = harness(() => draws++);
  h.queue.request(); const callback = [...h.pending.values()][0];
  h.queue.dispose(); callback(0);
  assert.equal(draws, 0);
});

test('default browser frame APIs are called without the queue as their receiver', () => {
  const oldRequest = globalThis.requestAnimationFrame, oldCancel = globalThis.cancelAnimationFrame;
  let cancelled = null;
  globalThis.requestAnimationFrame = function () {
    assert.ok(this === undefined || this === globalThis);
    return 7;
  };
  globalThis.cancelAnimationFrame = function (id) {
    assert.ok(this === undefined || this === globalThis);
    cancelled = id;
  };
  try {
    const queue = new RenderQueue(() => assert.fail('disposed draw'));
    queue.request(); queue.dispose(); assert.equal(cancelled, 7);
  } finally {
    if (oldRequest) globalThis.requestAnimationFrame = oldRequest; else delete globalThis.requestAnimationFrame;
    if (oldCancel) globalThis.cancelAnimationFrame = oldCancel; else delete globalThis.cancelAnimationFrame;
  }
});
