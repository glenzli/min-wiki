import test from 'node:test';
import assert from 'node:assert/strict';
import { sandGrain } from '../model.ts';
test('rock and shell histories use distinct connected routes and retain every grain at deposition',()=>{
 assert.ok(sandGrain(0,0,1).x>550);assert.ok(sandGrain(0,0,0).x<250);
 for(let source=0;source<2;source++)for(let i=0;i<16;i++){
  let old=sandGrain(0,i,source);
  for(let k=1;k<=1000;k++){const next=sandGrain(k/1000,i,source);assert.ok(Math.hypot(next.x-old.x,next.y-old.y)<3);assert.ok(next.size<=old.size);old=next;}
  assert.equal(old.deposited,true);assert.deepEqual(old,sandGrain(5,i,source));
 }
});

import { draw } from '../scene.ts';
test('following view stays centered on the persistent marked grain in either source',()=>{
 for(const source of [0,1])for(const p of [0,.28,.57,.82,1]){
  const state=draw(p,source),grain=sandGrain(p,0,source);
  assert.equal((state.scene.match(/data-grain=/g)||[]).length,16);
  assert.ok(Math.abs(state.focus[0]!+state.focus[2]!/2-grain.x)<1e-10);
  assert.ok(!/NaN|Infinity|<text\b/.test(state.scene));assert.deepEqual(state,draw(p,source));
 }
});
