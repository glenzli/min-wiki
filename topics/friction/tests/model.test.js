import test from 'node:test';import assert from 'node:assert/strict';import {sliding} from '../model.ts';test('block never reverses after stopping and stronger friction shortens travel',()=>{const a=sliding(2,.2,10);assert.equal(a.speed,0);assert.ok(Math.abs(a.distance-4/(2*.2*9.81))<1e-10);assert.deepEqual(a,sliding(2,.2,20));assert.ok(sliding(2,.5,10).distance<a.distance);assert.ok(Math.abs(sliding(4,.2,10).distance/a.distance-4)<1e-10);assert.equal(sliding(0,.2,10).distance,0);});
import { energyState } from '../model.ts';
test('friction transfers the lost kinetic energy without creating or deleting energy',()=>{
 for(const mu of [.12,.28,.5])for(const speed of [1,2.5,3])for(let k=0;k<=200;k++){
  const state=energyState(speed,mu,k/50);
  assert.ok(state.kinetic>=0&&state.transferred>=0);
  assert.ok(Math.abs(state.kinetic+state.transferred-1)<1e-12);
 }
 const stopped=energyState(2.5,.28,4);
 assert.equal(stopped.kinetic,0);assert.ok(Math.abs(stopped.transferred-1)<1e-12);
 assert.deepEqual(stopped,energyState(2.5,.28,20));
});
