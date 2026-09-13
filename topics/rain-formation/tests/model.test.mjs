import test from 'node:test';import assert from 'node:assert/strict';
import {mergedRadius,equivalentCloudDrops,evaporatedRadius,rainState} from '../model.ts';
test('coalescence conserves liquid volume, not radius',()=>{const r=mergedRadius([1,1]);assert.ok(Math.abs(r**3-2)<1e-12);assert.ok(r<2);assert.equal(mergedRadius([]),0);});
test('millimetre-scale rain requires many cloud droplets worth of water',()=>{assert.ok(Math.abs(equivalentCloudDrops(1)-1e6)<1e-8);assert.equal(equivalentCloudDrops(.01),1);});
test('dry-air evaporation decreases radius and never makes negative water',()=>{assert.equal(evaporatedRadius(.7,100,30),.7);assert.equal(evaporatedRadius(.7,20,30),0);assert.ok(evaporatedRadius(.7,75,30)>evaporatedRadius(.7,55,30));});
test('cloud formation precedes growth and falling; warm and ice paths are distinct',()=>{assert.equal(rainState(.2,{route:'warm',humidity:75}).fall,0);assert.equal(rainState(.5,{route:'ice',humidity:75}).ice,true);assert.equal(rainState(.5,{route:'warm',humidity:75}).ice,false);assert.equal(rainState(1,{route:'ice',humidity:75}).ice,false);});
test('a cloud does not guarantee rain reaches the surface in this evaporation comparison',()=>{assert.equal(rainState(1,{route:'warm',humidity:75}).reachesGround,true);assert.equal(rainState(1,{route:'warm',humidity:20}).reachesGround,false);});

test('representative cloud droplets transfer volume continuously into the collector',async()=>{
 const {cloudStudy}=await import('../model.ts');
 let previous=cloudStudy(0);
 for(let i=0;i<=1000;i++){
  const state=cloudStudy(i/1000);
  assert.ok(Math.abs(state.radius**3+state.remaining.reduce((v,r)=>v+r**3,0)-5*7**3)<1e-8);
  assert.ok(Math.abs(state.radius-previous.radius)<.2);
  assert.ok(state.radius>=previous.radius);
  previous=state;
 }
 assert.ok(cloudStudy(0).condensation===0);
 assert.ok(cloudStudy(1).remaining.every(r=>r===0));
 assert.equal(cloudStudy(1).melt,1);
});
