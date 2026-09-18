import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cactusAt } from './model.ts';
test('rain must reach roots and stem before stored water increases',()=>{
 assert.equal(cactusAt('rain',.45,1).reserve,1);assert.ok(cactusAt('rain',.45,1).uptake>0);assert.ok(cactusAt('rain',.8,1).reserve>1);assert.equal(cactusAt('rain',1,1).reserve,3);
});
test('dry periods use only available storage and exchange does not invent water',()=>{
 for(const initial of [0,.3,1,2,3]){assert.equal(cactusAt('dry',1,initial).reserve,Math.max(0,initial-1));assert.equal(cactusAt('exchange',.7,initial).reserve,initial);}
});
test('reserve changes are bounded and monotonic within a selected event',()=>{
 for(const event of ['rain','dry'] as const){let previous=cactusAt(event,0,1).reserve;for(let i=1;i<=1000;i++){const next=cactusAt(event,i/1000,1).reserve;assert.ok(next>=0&&next<=3);assert.ok(event==='rain'?next>=previous:next<=previous);previous=next;}}
});
