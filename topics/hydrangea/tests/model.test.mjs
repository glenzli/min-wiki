import test from 'node:test';
import assert from 'node:assert/strict';
import { availableAluminum, flowerOutcome, newBloom, bloomState } from '../model.ts';
const blue = { ph: 5.2, aluminum: 1, cultivar: 'pigmented' };
test('acidity helps aluminum become available but cannot supply missing aluminum', () => {
  assert.ok(availableAluminum(blue) > availableAluminum({ ...blue, ph: 6.8 }));
  assert.equal(flowerOutcome({ ...blue, aluminum: 0 }).color, 'pink');
  assert.equal(flowerOutcome(blue).color, 'blue');
});
test('a white cultivar does not become blue in acidic aluminum-rich conditions', () => {
  const result = flowerOutcome({ ...blue, cultivar: 'white' });
  assert.equal(result.color, 'white'); assert.equal(result.blue, 0);
});
test('changing future soil controls does not recolor a bloom already being grown', () => {
  const settings = { ...blue }, planted = newBloom(settings);
  settings.ph = 7; settings.aluminum = 0;
  assert.equal(flowerOutcome(planted).color, 'blue');
  assert.equal(flowerOutcome(newBloom(settings)).color, 'pink');
});
test('color develops with bloom maturation and outputs remain bounded', () => {
  assert.equal(bloomState(0, blue).maturity, 0);
  assert.equal(bloomState(1, blue).maturity, 1);
  for (const ph of [4.5, 5.5, 6.5, 7]) for (const aluminum of [0, .5, 1]) {
    const r = flowerOutcome({ ...blue, ph, aluminum });
    assert.ok(r.available >= 0 && r.available <= 1); assert.ok(r.blue >= 0 && r.blue <= 1);
  }
});
test('a pink bloom without aluminum never passes through a false blue stage', () => {
  const pink = { ph: 7, aluminum: 0, cultivar: 'pigmented' };
  for (let i = 0; i <= 100; i++) {
    const state = bloomState(i / 100, pink);
    assert.equal(state.color, 'pink');
    assert.ok(state.hue < 150 || state.hue > 300, `unexpected hue ${state.hue} at ${i / 100}`);
  }
  assert.equal(bloomState(1, pink).hue, flowerOutcome(pink).hue);
});
