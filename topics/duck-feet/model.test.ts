import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forceArrowsAt, strokeAt } from './model.ts';
test('recovery narrows the foot without reversing body displacement',()=>{
 assert.ok(strokeAt(.4).spread>strokeAt(.78).spread*2);
 let previous=strokeAt(0).bodyX;for(let i=1;i<=1000;i++){const s=strokeAt(i/1000);assert.ok(s.bodyX>=previous);previous=s.bodyX;}
 assert.ok(strokeAt(.4).thrust>.5);assert.equal(strokeAt(.8).thrust,0);
});
test('a complete stroke returns the foot pose while retaining forward travel',()=>{
 const a=strokeAt(0),b=strokeAt(1);for(const key of ['footX','footY','angle','spread'] as const)assert.ok(Math.abs(a[key]-b[key])<1e-8);assert.ok(b.bodyX>a.bodyX);
});
test('opening, propulsion and recovery are continuous at their boundaries',()=>{
 for(const p of [.12,.55,.58,.62,.68,.91,.93]){const a=strokeAt(p-1e-6),b=strokeAt(p+1e-6);for(const key of ['footX','footY','angle','spread','bodyX'] as const)assert.ok(Math.abs(a[key]-b[key])<.002);}
});
test('force arrows follow the foot below the surface and stay clear of the duck and lens',()=>{
 for(let i=0;i<=46;i++){
  const p=.12+i*.01,webbed=forceArrowsAt(p,false),toes=forceArrowsAt(p,true);
  assert.ok(webbed.water.to<webbed.water.from && webbed.water.to>0);
  assert.ok(webbed.foot.to>webbed.foot.from && webbed.foot.to<600);
  assert.ok(webbed.water.y>230 && webbed.foot.y>230);
  assert.ok(webbed.foot.to-webbed.foot.from>toes.foot.to-toes.foot.from);
  assert.ok(webbed.water.from-webbed.water.to>toes.water.from-toes.water.to);
  assert.ok(toes.emphasis<=webbed.emphasis);
 }
});
