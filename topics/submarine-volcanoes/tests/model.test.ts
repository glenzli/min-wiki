import test from 'node:test';
import assert from 'node:assert/strict';
import { submarineState, pillowState, fragmentState, cameraBox, islandAccretion, islandSurfaceY, ISLAND_UNIT_COUNT, SEA_LEVEL } from '../model.ts';

test('finite display inputs produce bounded and deterministic scenarios', () => {
  for (const p of [-1, 0, .25, .7, 1, 2, NaN, Infinity]) {
    for (const environment of ['deep', 'shallow', 'island'] as const) {
      for (const supply of ['sustained', 'limited'] as const) {
        const s = submarineState(p, environment, supply);
        assert.deepEqual(s, submarineState(p, environment, supply));
        for (const value of Object.values(s)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
        assert.ok(s.p >= 0 && s.p <= 1);
        assert.ok(s.underwaterShare >= 0 && s.underwaterShare <= 1);
      }
    }
  }
});

test('limited supply never forms an island; the larger scenario emerges and retains most height underwater', () => {
  for (let i = 0; i <= 100; i++) assert.equal(submarineState(i / 100, 'island', 'limited').emerged, false);
  const large = submarineState(.8, 'island');
  assert.equal(large.emerged, true);
  assert.ok(large.underwaterShare > .8);
  assert.ok(submarineState(1, 'deep').summit > SEA_LEVEL);
  assert.ok(submarineState(1, 'shallow').summit > SEA_LEVEL);
});

test('erosion begins after deposition finishes and lowers the existing summit', () => {
  const peak = submarineState(.8, 'island'), final = submarineState(1, 'island');
  assert.equal(peak.addition, final.addition);
  assert.ok(final.summit > peak.summit);
  assert.equal(final.activity, 0);
  assert.equal(submarineState(.8, 'island').activity, 0);
  assert.equal(submarineState(.7, 'island').erosion, 0);
});

test('island growth is a bounded sequence of deposits that widens before emergence', () => {
  const early = islandAccretion(.24, 'sustained');
  const middle = islandAccretion(.5, 'sustained');
  const late = islandAccretion(.78, 'sustained');
  assert.ok(early.deposited > 1);
  assert.ok(middle.deposited > early.deposited);
  assert.equal(late.deposited, ISLAND_UNIT_COUNT);
  assert.equal(new Set(late.units.map(unit => unit.phase)).size, 4);
  assert.ok(islandSurfaceY(360, .58) < islandSurfaceY(360, .24));
  assert.ok(islandSurfaceY(640, .58) < islandSurfaceY(640, .24));
  assert.ok(submarineState(.58, 'island').summit < submarineState(.24, 'island').summit);
});

test('stopping supply preserves a submerged edifice instead of removing it', () => {
  const stopped = submarineState(1, 'island', 'limited');
  assert.ok(stopped.addition > 180);
  assert.ok(stopped.summit < 330);
  assert.ok(stopped.summit > SEA_LEVEL);
  assert.equal(islandAccretion(1, 'limited').available, 13);
});

test('a pillow rind solidifies while its core is still hot, then both settle', () => {
  const mid = pillowState(.25, 0);
  assert.equal(mid.growth, 1);
  assert.equal(mid.crust, 1);
  assert.ok(mid.coreHeat > .5);
  for (let i = 0; i < 14; i++) assert.deepEqual(pillowState(1, i), { growth: 1, crust: 1, coreHeat: 0 });
});

test('finite fragments settle instead of looping at the end', () => {
  for (let i = 0; i < 49; i++) {
    const final = fragmentState(1, i);
    assert.equal(final.visible, true);
    assert.equal(final.settled, true);
    assert.equal(final.heat, 0);
    assert.deepEqual(final, fragmentState(2, i));
  }
});

test('vent camera follows the changing summit and section includes the deeper conduit', () => {
  for (const progress of [0, .46, .8, 1]) {
    const { summit } = submarineState(progress, 'island');
    for (const view of ['ocean', 'vent', 'section'] as const) {
      const box = cameraBox(view, summit);
      assert.ok(box.every(Number.isFinite));
      assert.ok(Math.abs(box[2] / box[3] - 1.5) < 1e-6);
      if (view === 'vent') assert.ok(summit > box[1] && summit < box[1] + box[3]);
      if (view === 'section') assert.ok(box[1] + box[3] > 585);
    }
  }
});
