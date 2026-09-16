import test from 'node:test';
import assert from 'node:assert/strict';
import { flavorSequence } from '../model.ts';

test('comparison removes the displayed smell contribution without erasing taste', () => {
  for (let i = 0; i <= 100; i++) {
    const p = i / 100, a = flavorSequence(p, true), b = flavorSequence(p, false);
    assert.equal(a.dissolved, b.dissolved);
    assert.equal(a.tasteCell, b.tasteCell);
    assert.equal(a.tasteNerve, b.tasteNerve);
    assert.equal(b.aroma, 0);
    assert.equal(b.smellNerve, 0);
  }
});
test('taste-cell response precedes taste-nerve journey; aroma precedes smell-nerve journey', () => {
  assert.equal(flavorSequence(.2, true).tasteCell, 0);
  assert.equal(flavorSequence(.45, true).tasteNerve, 0);
  assert.equal(flavorSequence(.71, true).smellNerve, 0);
  assert.equal(flavorSequence(.8, true).aroma, 1);
});
test('all state channels clamp to finite endpoints', () => {
  for (const p of [-10, NaN, Infinity, 0, .5, 1, 10]) {
    for (const [key, value] of Object.entries(flavorSequence(p, true))) {
      if (key !== 'phase') assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    }
  }
  assert.equal(flavorSequence(1, true).tasteNerve, 1);
  assert.equal(flavorSequence(1, true).smellNerve, 1);
});
