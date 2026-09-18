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

import { aluminumRoute, complexBinding } from '../model.ts';
test('white and aluminum-free blooms never assemble blue complexes, but white plants can have available aluminum',()=>{
  const white={...blue,cultivar:'white'};assert.ok(availableAluminum(white)>.8);
  for(let p=0;p<=1;p+=.01)for(let i=0;i<13;i++){assert.equal(complexBinding(p,white,i),0);assert.equal(complexBinding(p,{...blue,aluminum:0},i),0);}
});
test('complex assembly and root transport are continuous and reversible on the timeline',()=>{
  for(let i=0;i<13;i++){
    let previous=0;
    for(let p=0;p<=1;p+=.005){const value=complexBinding(p,blue,i);assert.ok(value>=previous-1e-10&&value<=1);assert.ok(value-previous<.2);previous=value;}
  }
  for(let i=0;i<12;i++){
    const start=aluminumRoute(0,i),end=aluminumRoute(1,i);assert.ok(start.y>100&&end.y<-80);
    let previous=start;
    for(let n=0;n<=1000;n++){const pos=aluminumRoute(n/1000,i);assert.ok(Object.values(pos).every(Number.isFinite));assert.ok(Math.hypot(pos.x-previous.x,pos.y-previous.y)<3);previous=pos;}
    const middle=aluminumRoute(.4,i);aluminumRoute(.9,i);assert.deepEqual(aluminumRoute(.4,i),middle);
  }
});
