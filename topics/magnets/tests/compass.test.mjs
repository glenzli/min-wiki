import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compassAt} from '../compassModel.ts';
test('the needle leaves N and approaches S along the axis and reverses above the magnet',()=>{
 assert.ok(compassAt(180,false).nx<-.99);
 assert.ok(compassAt(0,false).nx<-.99);
 assert.ok(compassAt(270,false).nx>.99);
});
test('flipping reverses every field direction without moving the probe',()=>{
 for(let a=0;a<=360;a++){
  const original=compassAt(a,false),flipped=compassAt(a,true);
  assert.equal(original.x,flipped.x);assert.equal(original.y,flipped.y);
  assert.ok(Math.abs(original.nx+flipped.nx)<1e-12);
  assert.ok(Math.abs(original.ny+flipped.ny)<1e-12);
  assert.ok(Math.abs(Math.hypot(original.nx,original.ny)-1)<1e-12);
 }
});
