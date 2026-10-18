import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waterAt, WATER_ROUTE, LEAF_WATER_ROUTE } from './model.ts';
test('water remains liquid from roots through xylem before the leaf departure',()=>{
 assert.equal(waterAt(0).x,259);assert.equal(waterAt(.4).x,375);assert.equal(waterAt(.7).vapour,0);assert.equal(waterAt(1).vapour,1);
 assert.ok(waterAt(.64).leafProgress>0);assert.equal(waterAt(.5).leafProgress,0);
});
test('the marked water parcel crosses every segment boundary continuously',()=>{
 for(const p of [...new Set([...WATER_ROUTE,...LEAF_WATER_ROUTE].map(([p])=>p))].filter(p=>p>0&&p<1)){
  const a=waterAt(p-1e-7),b=waterAt(p+1e-7);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001);
  assert.ok(Math.hypot(a.detailX-b.detailX,a.detailY-b.detailY)<.001);
  assert.ok(Math.abs(a.vapour-b.vapour)<.00001);
 }
});
test('liquid evaporates inside the leaf before vapour passes the same lower pore in both views',()=>{
 const liquid=waterAt(.74), vapour=waterAt(.8), pore=waterAt(.88), air=waterAt(1);
 assert.equal(liquid.vapour,0);assert.equal(liquid.leftLeaf,false);
 assert.equal(vapour.vapour,1);assert.equal(vapour.leftLeaf,false);
 assert.deepEqual([pore.x,pore.y,pore.detailX,pore.detailY],[471,165,614,370]);
 assert.equal(pore.vapour,1);assert.equal(pore.leftLeaf,true);
 assert.ok(air.y>pore.y);assert.ok(air.detailY>pore.detailY);
 for(let i=0;i<=1000;i++){
  const state=waterAt(i/1000);
  if(state.leftLeaf) assert.equal(state.vapour,1);
 }
});
test('backward scrubbing deterministically revisits the same water state',()=>{
 const samples=[.93,.11,.72,.45];const expected=samples.map(waterAt);[...samples].reverse().forEach(waterAt);assert.deepEqual(samples.map(waterAt),expected);assert.deepEqual(waterAt(-1),waterAt(0));assert.deepEqual(waterAt(2),waterAt(1));
});
