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

test('droplets approach at unchanged radius and transfer only after contact',async()=>{
 const {cloudStudy}=await import('../model.ts');
 for(let i=0;i<4;i++){
  const contact=.427+i*.065,before=cloudStudy(contact-.003),at=cloudStudy(contact),after=cloudStudy(contact+.005);
  assert.equal(before.transfers[i],0);assert.equal(before.remaining[i],7);
  const contactDistance=7*(1+Math.cbrt(i+1));
  assert.ok(Math.hypot(before.positions[i].x,before.positions[i].y)>contactDistance);
  assert.ok(Math.abs(Math.hypot(at.positions[i].x,at.positions[i].y)-contactDistance)<1e-10);
  assert.ok(after.transfers[i]>0);
 }
});

test('each precipitation particle descends once, then remains landed or evaporated',async()=>{
 const {rainParticle}=await import('../model.ts');
 for(const humidity of [20,75,100])for(let i=0;i<56;i++){
  let previous=-Infinity,terminal='';
  for(let step=0;step<=1000;step++){
   const p=rainParticle(step/1000,i,humidity);
   assert.ok(p.y>=previous);previous=p.y;
   if(terminal)assert.equal(p.outcome,terminal);
   if(['landed','evaporated'].includes(p.outcome))terminal=p.outcome;
  }
  assert.equal(rainParticle(1,i,humidity).outcome,humidity===20?'evaporated':'landed');
 }
});

test('final readout and visible rainfall agree near the evaporation threshold',async()=>{
 const {rainState,rainParticle}=await import('../model.ts');
 for(let humidity=40;humidity<=46;humidity+=.1){
  assert.equal(rainState(1,{route:'warm',humidity}).reachesGround,rainParticle(1,0,humidity).outcome==='landed');
 }
 assert.equal(rainParticle(1,0,41).outcome,'evaporated');
 assert.equal(rainParticle(1,0,42).outcome,'landed');
});
