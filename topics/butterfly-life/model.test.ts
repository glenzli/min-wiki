import test from 'node:test';
import assert from 'node:assert/strict';
import { wingPreparation, butterflyGrowth } from './model.ts';
test('wing expansion is continuous and leaves a distinct final preparation interval',()=>{
  let last=wingPreparation(0);
  for(let i=1;i<=1000;i++){const next=wingPreparation(i/1000);assert.ok(next.width>=last.width);assert.ok(next.length>=last.length);assert.ok(next.width-last.width<.003);last=next;}
  assert.equal(wingPreparation(.72).width,1);assert.deepEqual(wingPreparation(.72),wingPreparation(1));
});
test('invalid observations remain finite and bounded',()=>{
  for(const p of [NaN,Infinity,-3,5]){const s=wingPreparation(p);assert.ok(s.width>=.22&&s.width<=1);assert.ok(s.length>=.46&&s.length<=1);}
});

test('growth itinerary preserves visible anatomy and continuous transforms across landmarks',()=>{
  for(let i=0;i<=4000;i++){
    const p=i/1000,s=butterflyGrowth(p),next=butterflyGrowth(p+.0001);
    assert.ok(Math.max(s.eggOpacity,s.larvaOpacity,s.pupaOpacity,s.adultOpacity)>.4);
    for(const key of ['larvaScale','larvaX','larvaY','larvaAngle','adultY','adultScale'] as const){assert.ok(Number.isFinite(s[key]));assert.ok(Math.abs(s[key]-next[key])<.1,key);}
    assert.deepEqual(s,butterflyGrowth(p));
  }
  assert.equal(butterflyGrowth(2).pupate,1);assert.equal(butterflyGrowth(3).emerge,1);
  assert.equal(butterflyGrowth(3).adultY,butterflyGrowth(4).adultY,'wing expansion must not teleport the body');
  assert.equal(butterflyGrowth(3).wing.width,.22);assert.equal(butterflyGrowth(4).wing.width,1);
  for(const p of [NaN,Infinity,-Infinity])assert.deepEqual(butterflyGrowth(p),butterflyGrowth(0));
});
