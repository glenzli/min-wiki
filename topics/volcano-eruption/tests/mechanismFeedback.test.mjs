import test from 'node:test';
import assert from 'node:assert/strict';
import { magmaState } from '../magmaSystem.ts';
import { PRESETS } from '../model.ts';
import { mechanismLabel, mechanismCue } from '../mechanismContent.ts';

test('a stalled episode reports its own underground outcome, without attributing the old cone to it', () => {
  for (const settings of [
    { ...PRESETS.fountain, supply: .2, resistance: .9 },
    { ...PRESETS.fountain, resistance: 1 },
  ]) {
    const state = magmaState(1, settings);
    assert.equal(state.connected, false);
    assert.equal(state.surfaceClock, 0);
    assert.match(mechanismLabel(state), /本次未喷发/);
    assert.match(mechanismCue(state), /山体原先就存在/);
    assert.match(mechanismCue(state), /没有新的地表喷出物/);
    const earlier = magmaState(.3, settings);
    assert.doesNotMatch(mechanismLabel(earlier), /本次未喷发/);
    assert.match(mechanismCue(earlier), /贯通之前/);
  }
});

test('rewinding or choosing a connected episode removes the stalled result', () => {
  magmaState(1, { ...PRESETS.fountain, supply: .2, resistance: .9 });
  const connected = magmaState(1, PRESETS.fountain);
  assert.equal(connected.connected, true);
  assert.equal(mechanismLabel(connected), '留下的岩石');
  assert.match(mechanismCue(connected), /通道已经贯通/);
  assert.doesNotMatch(mechanismCue(connected), /没有新的/);
  const start = magmaState(.08, PRESETS.fountain);
  assert.equal(mechanismLabel(start), '深部补给');
  assert.match(mechanismCue(start), /贯通之前/);
});
