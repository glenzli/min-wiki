import test from 'node:test';
import assert from 'node:assert/strict';
import { magmaState } from '../magmaSystem.ts';
import { PRESETS } from '../model.ts';
import { dike, ribbon } from '../magmaGeometry.ts';

test('surface material cannot appear until the same advancing dike connects', () => {
  for (const preset of Object.values(PRESETS)) {
    let lastFront = 0, lastClock = 0;
    for (let i = 0; i <= 1000; i++) {
      const state = magmaState(i / 1000, preset);
      assert.ok(state.front >= lastFront);
      assert.ok(state.surfaceClock >= lastClock);
      if (!state.connected) assert.equal(state.surfaceClock, 0);
      if (state.surfaceClock > 0) assert.equal(state.front, 1);
      lastFront = state.front; lastClock = state.surfaceClock;
    }
    assert.equal(magmaState(1, preset).surfaceClock, 1);
  }
});
test('weak supply and strong barriers can leave magma underground for the whole episode', () => {
  for (const settings of [{ ...PRESETS.fountain, supply: .1 }, { ...PRESETS.fountain, resistance: 1 }]) {
    for (let i = 0; i <= 100; i++) {
      const state = magmaState(i / 100, settings);
      assert.equal(state.connectedAt, null);
      assert.equal(state.surfaceClock, 0);
      assert.equal(state.release, 0);
    }
    assert.ok(magmaState(1, settings).stored > 0);
  }
  const intrusion = magmaState(1, { ...PRESETS.fountain, resistance: 1 });
  assert.ok(intrusion.front > 0 && intrusion.front < 1);
});
test('recharge raises overpressure before breakthrough and discharge lowers it afterward', () => {
  const settings = PRESETS.fountain;
  const breach = magmaState(1, settings).connectedAt;
  assert.ok(breach > .3 && breach < .6);
  assert.ok(magmaState(breach, settings).pressure > magmaState(.1, settings).pressure);
  assert.ok(magmaState(breach + .2, settings).pressure < magmaState(breach, settings).pressure);
  assert.ok(magmaState(1, settings).pressure < magmaState(breach + .2, settings).pressure);
  assert.equal(magmaState(1, settings).recharge, 0);
  assert.equal(magmaState(1, settings).front, 1);
});
test('a propagating tip stays continuous and the geometry has no invalid points', () => {
  for (const vent of [-126, 0, 126]) {
    let previous = dike(vent, -80, 0).at(-1);
    for (let i = 1; i <= 1000; i++) {
      const path = dike(vent, -80, i / 1000), tip = path.at(-1);
      assert.ok(Math.hypot(tip[0] - previous[0], tip[1] - previous[1]) < 1);
      assert.ok(ribbon(path, 4).flat().every(Number.isFinite));
      previous = tip;
    }
    assert.deepEqual(previous, [vent, -80]);
  }
});
test('seeking is history independent and all indicators stay finite and bounded', () => {
  const expected = magmaState(.42, PRESETS.fountain);
  magmaState(1, { ...PRESETS.fountain, resistance: 1 });
  assert.deepEqual(magmaState(.42, PRESETS.fountain), expected);
  for (const p of [NaN, -1, 0, .3, .5, 1, 2]) for (const supply of [NaN, -.4, .4, 1, 2]) {
    const state = magmaState(p, { ...PRESETS.fountain, supply });
    for (const key of ['p', 'front', 'pressure', 'recharge', 'stored', 'gasExpansion', 'surfaceClock']) assert.ok(state[key] >= 0 && state[key] <= 1, key);
  }
});
