import test from 'node:test';
import assert from 'node:assert/strict';
import { ecologyState, HABITATS } from '../ecologyModel.ts';
import { ecologyMarkup, soilMarkup } from '../ecologyScene.ts';

test('vegetation waits for cooling and seed arrival instead of appearing with age alone', () => {
  for (const habitat of HABITATS) {
    for (let i = 0; i <= 40; i++) assert.equal(ecologyState(i / 100, habitat).vegetation, 0);
    assert.ok(ecologyState(.32, habitat).weathering > 0);
    assert.ok(ecologyState(.57, habitat).seeds > 0);
  }
});
test('the same seed supply gives different outcomes under drought and cold', () => {
  const wet = ecologyState(1, 'wet');
  for (const habitat of ['dry','cold']) {
    const state = ecologyState(1, habitat);
    assert.equal(state.seeds, wet.seeds);
    assert.ok(state.vegetation < wet.vegetation * .2);
    assert.ok(state.soil > 0);
  }
});
test('fresh thick ash reverses established vegetation and covers the old soil', () => {
  const before = ecologyState(.65, 'buried'), after = ecologyState(.8, 'buried');
  assert.ok(before.vegetation > 0);
  assert.ok(after.vegetation < before.vegetation);
  assert.ok(after.soil < before.soil);
  assert.ok(ecologyState(.8, 'wet').vegetation > after.vegetation * 5);
});
test('recovery stays bounded, continuous and deterministic when seeking', () => {
  for (const habitat of HABITATS) {
    for (let i = 0; i < 1000; i++) {
      const a=ecologyState(i/1000,habitat), b=ecologyState((i+1)/1000,habitat);
      for (const key of ['cooling','weathering','seeds','soil','vegetation','burial']) {
        assert.ok(b[key]>=0 && b[key]<=1);
        assert.ok(Math.abs(b[key]-a[key])<.02);
      }
    }
    assert.deepEqual(ecologyState(NaN,habitat), ecologyState(0,habitat));
  }
});
test('fixed sites persist through different environments and the close-up remains valid', () => {
  for (const kind of ['scoria','shield','composite']) for (const habitat of HABITATS) {
    const state=ecologyState(1,habitat), svg=ecologyMarkup(kind,state);
    assert.equal((svg.match(/data-site=/g)??[]).length,100);
    assert.ok(!/NaN|Infinity/.test(svg+soilMarkup(state)));
    assert.equal(svg,ecologyMarkup(kind,state));
  }
});
