import test from 'node:test';
import assert from 'node:assert/strict';
import { painSequence, withdrawalLinkage } from '../model.ts';

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

test('shortening pulls the same far attachment closer without stretching the drawn tendons', () => {
  const initial = withdrawalLinkage(0);
  for (let i = 0; i <= 200; i++) {
    const linkage = withdrawalLinkage(i / 200);
    assert.equal(linkage.origin, initial.origin);
    assert.equal(linkage.bellyStart - linkage.origin, 36);
    assert.equal(linkage.attachment - linkage.bellyEnd, 37);
    assert.ok(Math.abs(linkage.bellyCenter - linkage.bellyRadius - linkage.bellyStart) < 1e-10);
    assert.ok(Math.abs(linkage.bellyCenter + linkage.bellyRadius - linkage.bellyEnd) < 1e-10);
    assert.ok(Math.abs(linkage.attachment - initial.attachment - linkage.handOffset) < 1e-10);
    assert.ok(linkage.attachment <= initial.attachment);
    assert.ok(Math.abs(632 * linkage.fiberScale + linkage.fiberOffset - linkage.bellyCenter) < 1e-10);
  }
  const shortened = withdrawalLinkage(1);
  assert.equal(shortened.bellyEnd - shortened.bellyStart, 92);
  assert.equal(shortened.attachment, 705);
  assert.equal(shortened.handOffset, -20);
});

test('linkage remains bounded for invalid progress and returns to the same geometry on replay', () => {
  assert.deepEqual(withdrawalLinkage(NaN), withdrawalLinkage(0));
  assert.deepEqual(withdrawalLinkage(-1), withdrawalLinkage(0));
  assert.deepEqual(withdrawalLinkage(2), withdrawalLinkage(1));
  for (const p of [.68, .76, .84, 1, .76, 0, .76]) {
    const state = painSequence(p);
    assert.deepEqual(state.linkage, withdrawalLinkage(state.withdrawal));
  }
});
