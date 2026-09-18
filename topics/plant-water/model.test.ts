import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waterAt } from './model.ts';
test('water remains liquid from roots through xylem before the leaf departure',()=>{
 assert.equal(waterAt(0).x,259);assert.equal(waterAt(.4).x,375);assert.equal(waterAt(.7).vapour,0);assert.equal(waterAt(1).vapour,1);
 assert.ok(waterAt(.64).leafProgress>0);assert.equal(waterAt(.5).leafProgress,0);
});
test('the marked water parcel crosses every segment boundary continuously',()=>{
 for(const p of [.24,.61,.8,.9]){const a=waterAt(p-1e-7),b=waterAt(p+1e-7);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001);}
});
test('backward scrubbing deterministically revisits the same water state',()=>{
 const samples=[.93,.11,.72,.45];const expected=samples.map(waterAt);[...samples].reverse().forEach(waterAt);assert.deepEqual(samples.map(waterAt),expected);assert.deepEqual(waterAt(-1),waterAt(0));assert.deepEqual(waterAt(2),waterAt(1));
});
