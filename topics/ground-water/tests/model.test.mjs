import test from 'node:test';import assert from 'node:assert/strict';import {partition} from '../model.ts';
test('all illustrative rainfall is conserved across infiltration runoff and storage',()=>{for(let s=0;s<3;s++)for(let n=0;n<=100;n++){const r=partition(n,s);assert.equal(r.soaked+r.flowed+r.stored,n);assert.ok(r.stored>=0);}});
test('selected soil comparison changes infiltration while retaining the same rain input',()=>{const a=partition(100,0),b=partition(100,1),c=partition(100,2);assert.ok(a.soaked>b.soaked&&b.soaked>c.soaked);assert.equal(a.total,c.total);});

import { rainParcel, rainJourney } from '../model.ts';
test('the same hundred parcels persist and account for rain in flight and all destinations',()=>{
 for(let surface=0;surface<3;surface++)for(let k=0;k<=100;k++){
  const state=rainJourney(k/100,surface);
  assert.equal(state.parcels.length,100);
  assert.equal(new Set(state.parcels.map(p=>p.id)).size,100);
  assert.equal(state.airborne+state.soaked+state.flowed+state.stored,100);
 }
 for(let surface=0;surface<3;surface++){
  const state=rainJourney(1,surface),expected=partition(100,surface);
  for(const key of ['soaked','flowed','stored'])assert.equal(state[key],expected[key]);
  assert.equal(state.collected,expected.flowed);
  assert.deepEqual(state,rainJourney(2,surface));
 }
});
test('rainfall joins pore and gutter paths continuously without respawning',()=>{
 for(let surface=0;surface<3;surface++)for(let i=0;i<100;i++){
  let old=rainParcel(0,i,surface);
  for(let k=1;k<=1000;k++){
   const next=rainParcel(k/1000,i,surface);
   assert.ok(Number.isFinite(next.x)&&Number.isFinite(next.y));
   assert.ok(Math.hypot(next.x-old.x,next.y-old.y)<5);
   old=next;
  }
 }
});

import { draw } from '../scene.ts';
test('every ground-water projection retains the complete batch and labels outside the picture',()=>{
 for(const surface of [0,1,2])for(const p of [0,.25,.55,1]){
  const state=draw(p,surface);
  assert.equal((state.scene.match(/data-parcel=/g)||[]).length,100);
  assert.ok(!/NaN|Infinity|<text\b/.test(state.scene));assert.deepEqual(state,draw(p,surface));
 }
});
