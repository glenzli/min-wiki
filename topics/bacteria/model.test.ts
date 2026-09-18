import test from 'node:test';
import assert from 'node:assert/strict';
import { divisionState, exchangeState, selectionWeights, partNames } from './model.ts';

test('the division has one bounded endpoint, with a complete DNA copy before separation',()=>{
  for(let i=0;i<=1000;i++){
    const s=divisionState(i/1000);
    assert.ok(s.length>=330&&s.length<=480);
    assert.ok(s.neck>=0&&s.neck<=60);
    if(s.partition>0||s.gap>0)assert.equal(s.copy,1);
    if(s.gap>0){assert.equal(s.neck,0);assert.equal(s.partition,1);}
    if(s.neck<5)assert.ok(s.chromosomeOffset>60,'DNA must clear the closing partition');
  }
  assert.deepEqual(divisionState(-4),divisionState(0));
  assert.deepEqual(divisionState(2),divisionState(1));
  assert.deepEqual(divisionState(100),divisionState(1));
});

test('growth, copying and partition geometry remain continuous across every phase boundary',()=>{
  for(const p of [.2,.4,.48,.65,.68,.9]){
    const before=divisionState(p-1e-6),after=divisionState(p+1e-6);
    for(const key of ['length','copy','partition','neck','gap','chromosomeOffset'] as const){
      assert.ok(Math.abs(after[key]-before[key])<.01,`${key} jumped at ${p}`);
    }
  }
  let previous=divisionState(0);
  for(let i=1;i<=1000;i++){
    const next=divisionState(i/1000);
    assert.ok(next.length>=previous.length&&next.copy>=previous.copy&&next.partition>=previous.partition);
    assert.ok(next.neck<=previous.neck&&next.gap>=previous.gap);
    previous=next;
  }
});

test('one exchange crosses the membrane in opposite directions without teleporting or looping',()=>{
  const start=exchangeState(0),end=exchangeState(1);
  assert.ok(start.nutrient.y<82&&end.nutrient.y>132);
  assert.ok(start.product.y>132&&end.product.y<82);
  let previous=start;
  for(let i=1;i<=1000;i++){
    const next=exchangeState(i/1000);
    assert.equal(next.nutrient.x,138);assert.equal(next.product.x,245);
    assert.ok(next.nutrient.y>=previous.nutrient.y&&next.nutrient.y-previous.nutrient.y<1);
    assert.ok(next.product.y<=previous.product.y&&previous.product.y-next.product.y<1);
    previous=next;
  }
  assert.deepEqual(exchangeState(3),end);
});

test('an interrupted structure transition resumes from what was displayed and retains all four weights',()=>{
  const first=selectionWeights([0,1,0,0],'dna',.38);
  assert.deepEqual(selectionWeights(first,'wall',0),first);
  for(let i=0;i<=100;i++){
    const result=selectionWeights(first,'wall',i/100);
    assert.ok(result.every(w=>w>=0&&w<=1));
    assert.ok(Math.abs(result.reduce((a,b)=>a+b,0)-1)<1e-12);
  }
  for(const part of partNames)assert.deepEqual(selectionWeights(first,part,1),partNames.map(name=>Number(name===part)));
});
