import test from 'node:test';
import assert from 'node:assert/strict';
import { wingPreparation } from './model.ts';
test('wing expansion is continuous and leaves a distinct final preparation interval',()=>{
  let last=wingPreparation(0);
  for(let i=1;i<=1000;i++){const next=wingPreparation(i/1000);assert.ok(next.width>=last.width);assert.ok(next.length>=last.length);assert.ok(next.width-last.width<.003);last=next;}
  assert.equal(wingPreparation(.72).width,1);assert.deepEqual(wingPreparation(.72),wingPreparation(1));
});
test('invalid observations remain finite and bounded',()=>{
  for(const p of [NaN,Infinity,-3,5]){const s=wingPreparation(p);assert.ok(s.width>=.22&&s.width<=1);assert.ok(s.length>=.46&&s.length<=1);}
});
