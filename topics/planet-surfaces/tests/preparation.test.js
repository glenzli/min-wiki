import test from 'node:test';
import assert from 'node:assert/strict';
import { TopicScene } from '../scene.ts';
import { WORLDS } from '../model.ts';

function environment(t) {
 const workers = [], uploads = [], draws = [], gradient = { addColorStop() {} };
 const canvas = () => {
  const target = { clientWidth: 900, clientHeight: 560, width: 0, height: 0 };
  const context = new Proxy({
   createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
   createLinearGradient: () => gradient, createRadialGradient: () => gradient,
   putImageData(image) { target.pixels = image.data.slice(); uploads.push(target); },
   drawImage(source) { draws.push(source); },
  }, { get: (object, key) => object[key] ?? (() => {}) });
  return Object.assign(target, { getContext: () => context });
 };
 const substitutes = {
  document: { hidden: false, createElement: canvas, addEventListener() {}, removeEventListener() {} },
  window: { matchMedia: () => ({ matches: true, removeEventListener() {} }), addEventListener() {}, removeEventListener() {} },
  devicePixelRatio: 1, cancelAnimationFrame() {},
  ResizeObserver: class { observe() {} disconnect() {} },
  Worker: class { constructor() { workers.push(this); this.terminated = false; } postMessage(world) { this.world = world; } terminate() { this.terminated = true; } },
 };
 const restore = [];
 for (const [key, value] of Object.entries(substitutes)) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  restore.push(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]);
 }
 const scene = new TopicScene(canvas()); t.after(() => { scene.dispose(); restore.forEach(fn => fn()); });
 return { scene, workers, uploads, draws };
}
function result(id) { return { id, landscape: { width: 2, height: 1, data: new Uint8ClampedArray([24, 85, 119, 255, 198, 218, 222, 255]) }, texture: { width: 1, height: 1, data: new Uint8ClampedArray([80, 110, 140, 255]) } }; }

test('rapid world switching terminates stale work and rejects stale material images', t => {
 const { scene, workers, uploads } = environment(t);
 scene.draw(WORLDS[2], 'landscape', 0); assert.equal(scene.preparing, true);
 scene.draw(WORLDS[6], 'landscape', 0); assert.equal(workers[0].terminated, true);
 const stale = result('earth'); workers[0].onmessage({ data: stale });
 assert.equal(uploads.length, 0); assert.equal(scene.preparing, true);
 const latest = result('titan'); workers[1].onmessage({ data: latest });
 assert.equal(scene.preparing, false); assert.equal(scene.failed, false);
 const count = workers.length; scene.draw(WORLDS[6], 'landscape', .7);
 assert.equal(workers.length, count, 'prepared worlds reuse the transferred cache');
 scene.dispose(); assert.equal(uploads[0].width, 0); assert.equal(uploads[0].height, 0);
});
test('every world materializes worker pixels into a page-owned drawable canvas', t => {
 const { scene, workers, uploads, draws } = environment(t);
 for (const world of WORLDS) {
  scene.draw(world, 'landscape', 0);
  const reply = result(world.id), worker = workers.at(-1);
  worker.onmessage({ data: reply });
  assert.equal(worker.terminated, true);
  const image = uploads.at(-1);
  assert.equal(image.width, 2); assert.equal(image.height, 1);
  assert.deepEqual(image.pixels, reply.landscape.data);
  assert.ok(draws.includes(image), 'render the copied pixels rather than a transferred GPU handle');
  reply.landscape.data.fill(0);
  assert.equal(image.pixels[3], 255, 'the cached canvas owns its pixels after the message is released');
 }
 const jobCount = workers.length;
 scene.draw(WORLDS[0], 'landscape', 0, 20);
 assert.equal(workers.length, jobCount);
});
test('transparent or truncated images do not silently become a prepared landscape', t => {
 const { scene, workers, uploads } = environment(t);
 scene.draw(WORLDS[5], 'landscape', 0);
 const blank = result('neptune'); blank.landscape.data.fill(0);
 workers[0].onmessage({ data: blank });
 assert.equal(scene.failed, true); assert.equal(scene.preparing, false); assert.equal(uploads.length, 0);
 scene.draw(WORLDS[3], 'landscape', 0);
 const truncated = result('mars'); truncated.landscape.width = 3;
 workers[1].onmessage({ data: truncated });
 assert.equal(scene.failed, true); assert.equal(uploads.length, 0);
});
test('preparation errors resolve loading and never create an automatic retry loop', t => {
 const { scene, workers } = environment(t); let changes = 0;
 scene.onPreparationChange(() => changes++);
 scene.draw(WORLDS[7], 'landscape', 0); workers[0].onmessage({ data: { id: 'cancri', error: true } });
 assert.equal(scene.preparing, false); assert.equal(scene.failed, true); assert.equal(changes, 1);
 scene.draw(WORLDS[7], 'landscape', 0); assert.equal(workers.length, 1);
});
test('late worker completion after disposal cannot redraw or retain image resources', t => {
 const { scene, workers, uploads } = environment(t); let changes = 0;
 scene.onPreparationChange(() => changes++); scene.draw(WORLDS[0], 'landscape', 0);
 scene.dispose(); const late = result('mercury'); workers[0].onmessage({ data: late });
 assert.equal(uploads.length, 0); assert.equal(changes, 0);
});
