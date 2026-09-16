import test from 'node:test';
import assert from 'node:assert/strict';
import { meteorState, positionAt, wakeParcel, LIGHT_END, ENTRY, GROUND_Y } from '../model.ts';

test('luminous and dark paths join with continuous position and tangent', () => {
  const e = 1e-6, a = positionAt(LIGHT_END - e, 'stone'), b = positionAt(LIGHT_END, 'stone'), c = positionAt(LIGHT_END + e, 'stone');
  assert.ok(Math.hypot(c.x - a.x, c.y - a.y) < .002);
  for (const axis of ['x', 'y']) assert.ok(Math.abs((b[axis] - a[axis]) / e - (c[axis] - b[axis]) / e) < .02);
});
test('both journeys lose mass continuously; only one leaves a solid remnant', () => {
  for (const kind of ['stone', 'dust']) {
    let mass = 1, y = 0;
    for (let i = 0; i <= 1000; i++) {
      const state = meteorState(i / 1000, kind);
      assert.ok(state.mass <= mass + 1e-12 && state.mass >= 0);
      assert.ok(state.y >= y && state.y < GROUND_Y);
      assert.ok(Math.abs(state.mass - mass) < .004);
      mass = state.mass; y = state.y;
    }
  }
  assert.equal(meteorState(1, 'dust').visible, false);
  assert.equal(meteorState(1, 'dust').stage, 'lost');
  assert.equal(meteorState(1, 'stone').stage, 'landed');
  assert.ok(meteorState(1, 'stone').mass > 0);
});
test('the solid remains dark throughout its final fall, with no glow in space', () => {
  for (const p of [0, ENTRY, LIGHT_END, .8, 1]) assert.equal(meteorState(p, 'stone').glow, 0);
  assert.ok(meteorState(.4, 'stone').glow > .9);
  assert.ok(positionAt(.8, 'stone').y < positionAt(.9, 'stone').y);
  const state = meteorState(1, 'stone');
  assert.ok(Math.abs(state.y + state.radius - GROUND_Y) < .01);
});
test('wake stays near its birth position, expands and outlives its moving head', () => {
  const a = wakeParcel(.57, .61), b = wakeParcel(.57, .71);
  assert.deepEqual(a.anchor, b.anchor);
  assert.ok(Math.abs(b.x - a.x) < 3);
  assert.ok(positionAt(.71, 'stone').x - positionAt(.61, 'stone').x > 30);
  assert.ok(b.radius > a.radius && b.opacity > 0);
  assert.equal(meteorState(.71, 'dust').visible, false);
  assert.equal(wakeParcel(.57, .56).opacity, 0);
  assert.equal(wakeParcel(.57, 1).opacity, 0);
});
test('scrubbing and changing scenario preserve a deterministic shared entry', () => {
  for (const p of [0, .2, .4, .6]) assert.deepEqual(positionAt(p, 'dust'), positionAt(p, 'stone'));
  const first = meteorState(.53, 'stone');
  meteorState(1, 'dust');
  assert.deepEqual(meteorState(.53, 'stone'), first);
});
