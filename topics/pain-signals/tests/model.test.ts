import test from 'node:test';
import assert from 'node:assert/strict';
import { painSequence } from '../model.ts';

test('the shared afferent route reaches the spinal relay before either branch', () => {
  for (const p of [0, .1, .3, .43]) {
    const s = painSequence(p);
    assert.equal(s.reflex, 0);
    assert.equal(s.ascending, 0);
    assert.equal(s.withdrawal, 0);
  }
  const fork = painSequence(.55);
  assert.equal(fork.incoming, 1);
  assert.ok(fork.reflex > 0 && fork.ascending > 0);
});
test('withdrawal need not wait for the drawn brain-processing stage', () => {
  const s = painSequence(.84);
  assert.equal(s.reflex, 1);
  assert.equal(s.withdrawal, 1);
  assert.ok(s.ascending < 1);
  assert.equal(s.processing, 0);
});
test('finite bounded and monotone presentation states have stable endpoints', () => {
  const fields = ['ending', 'incoming', 'reflex', 'ascending', 'withdrawal', 'processing'] as const;
  for (const field of fields) {
    let previous = 0;
    for (let i = 0; i <= 100; i++) {
      const value = painSequence(i / 100)[field];
      assert.ok(value >= previous && value <= 1);
      previous = value;
    }
    assert.equal(painSequence(-1)[field], 0);
    assert.equal(painSequence(2)[field], 1);
    assert.equal(painSequence(NaN)[field], 0);
  }
});
