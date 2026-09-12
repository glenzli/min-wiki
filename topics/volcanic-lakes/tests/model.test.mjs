import test from 'node:test';
import assert from 'node:assert/strict';
import { waterFraction, netSupply, terrain, basinDimensions } from '../model.ts';
test('water needs input and is bounded by basin capacity', () => {
  for (const basin of ['crater', 'caldera']) { const s = { basin, supply: 0, leak: 'low' }; assert.equal(waterFraction(1, s), 0); assert.equal(waterFraction(.4, { ...s, supply: 1 }), 0); for (let p = 0; p <= 1; p += .01) assert.ok(waterFraction(p, { ...s, supply: 1 }) <= 1); }
});
test('higher leakage can prevent the same basin from filling', () => {
  const s = { basin: 'caldera', supply: .75, leak: 'low' }; assert.ok(netSupply(s) > 0); assert.ok(waterFraction(1, s) > .9); assert.equal(waterFraction(1, { ...s, leak: 'high' }), 0);
});
test('collapse produces a depression with a floor below its rim', () => {
  for (const kind of ['crater', 'caldera']) { const d = basinDimensions(kind); assert.ok(terrain(0, 0, kind) < terrain(0, 1, kind)); assert.ok(terrain(0, 1, kind) > terrain(d.radius, 1, kind)); }
});

test('withdrawal and fractures precede caldera subsidence; water comes afterward', async () => {
  const { calderaState, formationProgress } = await import('../model.ts');
  assert.ok(calderaState(.13).withdrawal > 0);
  assert.equal(calderaState(.13).fracture, 0);
  assert.equal(calderaState(.23).subsidence, 0);
  assert.ok(calderaState(.23).fracture > 0);
  assert.equal(terrain(0, .23, 'caldera'), terrain(0, 0, 'caldera'));
  assert.ok(terrain(0, .36, 'caldera') > terrain(0, .23, 'caldera'));
  assert.equal(formationProgress(.46, 'caldera'), 1);
  const settings = {basin:'caldera',supply:1,leak:'low'};
  assert.equal(waterFraction(.46,settings),0);
  assert.ok(waterFraction(.62,settings)>0);
  for (let p = 0; p < 1; p += .001) {
    for (const key of ['withdrawal','fracture','subsidence']) {
      assert.ok(calderaState(p+.001)[key]>=calderaState(p)[key]);
      assert.ok(calderaState(p+.001)[key]-calderaState(p)[key]<.014);
    }
  }
  assert.ok(formationProgress(.23,'crater')>0);
});
test('caldera subsidence preserves the outer flanks and water stays below the rim', () => {
 const d=basinDimensions('caldera');
 for(const x of [-375,-220,-180,180,220,375]) assert.equal(terrain(x,1,'caldera'),terrain(x,0,'caldera'));
 assert.ok(d.floor-d.maxDepth>d.rim);
});
