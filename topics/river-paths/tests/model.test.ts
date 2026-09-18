import test from 'node:test';
import assert from 'node:assert/strict';
import { riverGrain, riverParcel } from '../model.ts';
test('river grains remain visible identities that leave a bank and settle in the same bend',()=>{
 for(let c=0;c<3;c++)for(let i=0;i<16;i++){
  const start=riverGrain(0,i,c),end=riverGrain(1,i,c);
  assert.equal(start.departed,false);assert.equal(end.deposited,true);
  assert.ok(Math.hypot(end.x-start.x,end.y-start.y)>10);
  assert.deepEqual(end,riverGrain(2,i,c));
  let previous=start;
  for(let k=1;k<=1000;k++){const next=riverGrain(k/1000,i,c);assert.ok(Math.hypot(next.x-previous.x,next.y-previous.y)<2);previous=next;}
 }
});
test('water markers advance downstream without modulo resets',()=>{
 for(let c=0;c<3;c++)for(let i=0;i<22;i++){
  let old=riverParcel(0,i,c);
  for(let k=1;k<=200;k++){const next=riverParcel(k/200,i,c);assert.ok(next.y>=old.y);old=next;}
 }
});

import { draw } from '../scene.ts';
test('every river frame projects persistent sediment and water identities with a bounded focus',()=>{
 for(const condition of [0,1,2])for(const p of [0,.35,.7,1]){
  const state=draw(p,condition);
  assert.equal((state.scene.match(/data-grain=/g)||[]).length,16);
  assert.equal((state.scene.match(/data-water=/g)||[]).length,22);
  assert.ok(!/NaN|Infinity|<text\b/.test(state.scene));
  assert.deepEqual(state,draw(p,condition));assert.ok(state.focus.every(Number.isFinite));
 }
});
