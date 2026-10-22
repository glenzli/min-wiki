import test from 'node:test';
import assert from 'node:assert/strict';
import { oceanGeometryFrame } from '../geometry3d.ts';
import { oceanMeltVisible } from '../scene3d.ts';
import { MagmaDetailMotion, type DetailMotionEnvironment } from '../../volcano-eruption/magmaMotion.ts';
import { oceanUniforms } from '../materials3d.ts';
import { pillowState } from '../model.ts';

test('ambient admission follows exposed hot products and the retained cutaway reservoir', () => {
  for (const environment of ['deep', 'shallow', 'island'] as const) {
    const untouched = oceanGeometryFrame(0, environment, 'sustained');
    const cold = oceanGeometryFrame(1, environment, 'sustained');
    for (const view of ['landscape', 'vent', 'ocean'] as const) {
      assert.equal(oceanMeltVisible(untouched, view), false);
      assert.equal(oceanMeltVisible(cold, view), false);
      assert.equal(oceanMeltVisible(oceanGeometryFrame(.08, environment, 'sustained'), view), true);
    }
    assert.equal(oceanMeltVisible(cold, 'section'), true);
    assert.equal(oceanMeltVisible(untouched, 'section'), true);
  }
  // Fragment-rich episodes expose a molten throat, without acquiring the
  // effusive stream of the separate deep or island-flow mechanism.
  const fragmented = oceanGeometryFrame(.51, 'island', 'sustained');
  assert.equal(fragmented.history.phase, 'shallow-fragments');
  assert.equal(oceanMeltVisible(fragmented, 'landscape'), true);
  const stopped = oceanGeometryFrame(.70, 'island', 'limited');
  assert.equal(oceanMeltVisible(stopped, 'landscape'), false);
  // A new, barely born deposit cannot stop the older overlapping hot stream.
  const overlap = oceanGeometryFrame(.04 + 22 * .029 + .000001, 'island', 'sustained');
  assert.equal(oceanMeltVisible(overlap, 'vent'), true);
  const warmCores = oceanGeometryFrame(.80, 'deep', 'sustained');
  assert.ok(Array.from({length:14},(_,i)=>pillowState(.80,i)).every(p=>p.crust===1));
  assert.equal(oceanMeltVisible(warmCores, 'vent'), true, 'quenched skins cannot stop motion inside still-exposed warm noses');
});

test('the reused detail clock changes only the material phase of a frozen ocean frame', () => {
  const ocean = oceanUniforms(), frame = oceanGeometryFrame(.35, 'deep', 'sustained');
  const original = structuredClone(frame); ocean.clock.value = frame.p;
  let callback: FrameRequestCallback | undefined, hidden = false, reduced = false;
  let visibility = () => {}, preference = () => {}, cancelled = 0, cleaned = 0;
  const environment: DetailMotionEnvironment = {
    requestFrame(fn) { callback = fn; return 1; },
    cancelFrame() { callback = undefined; cancelled++; },
    hidden: () => hidden, reducedMotion: () => reduced,
    onVisibilityChange(fn) { visibility = fn; return () => { cleaned++; }; },
    onReducedMotionChange(fn) { preference = fn; return () => { cleaned++; }; },
  };
  const motion = new MagmaDetailMotion(phase => { ocean.detailPhase.value = phase; }, undefined, environment);
  const tick = (time: number) => { const fn = callback; callback = undefined; fn?.(time); };
  motion.setHot(oceanMeltVisible(frame, 'vent')); tick(100); tick(160); tick(220);
  assert.ok(ocean.detailPhase.value > 0); assert.equal(ocean.clock.value, .35); assert.deepEqual(frame, original);
  const paused = ocean.detailPhase.value;
  hidden = true; visibility(); tick(10000); assert.equal(ocean.detailPhase.value, paused);
  hidden = false; visibility(); tick(10060); assert.equal(ocean.detailPhase.value, paused);
  reduced = true; preference(); tick(20000); assert.equal(ocean.detailPhase.value, paused);
  reduced = false; preference(); tick(20100); tick(20160); assert.ok(ocean.detailPhase.value > paused);
  motion.setHot(oceanMeltVisible(oceanGeometryFrame(1, 'deep', 'sustained'), 'vent'));
  assert.equal(callback, undefined); assert.equal(motion.state.running, false);
  motion.dispose(); assert.equal(cleaned, 2); assert.ok(cancelled >= 3);
  assert.equal(ocean.clock.value, .35); assert.deepEqual(frame, original);
});
