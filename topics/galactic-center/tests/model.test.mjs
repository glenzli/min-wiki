import test from 'node:test';
import assert from 'node:assert/strict';
import {binaryAt,DONOR_MASS,BLACK_HOLE_MASS,SEPARATION,DONOR_X,HOLE_X,donorRadius,rocheLobe,transferPath,streamParcel,windCaptureParcel,seedValue} from '../model.ts';
test('both bodies orbit their common barycenter at constant separation',()=>{
 for(let i=0;i<=100;i++){
  const {star,hole}=binaryAt(i/100);
  assert.ok(Math.abs(star.x*DONOR_MASS+hole.x*BLACK_HOLE_MASS)<1e-10);
  assert.ok(Math.abs(star.y*DONOR_MASS+hole.y*BLACK_HOLE_MASS)<1e-10);
  assert.ok(Math.abs(Math.hypot(star.x-hole.x,star.y-hole.y)-SEPARATION)<1e-10);
 }
});
test('actual captured wind parcels join the disk without position, heat or opacity jumps',()=>{
 let captured=0;
 for(let index=0;index<300;index++){
  if(seedValue(index+9173)>=.24)continue;
  captured++;
  const time=(1+.58-seedValue(index+3141))/.075;
  const before=windCaptureParcel(index,time-1e-6),after=windCaptureParcel(index,time+1e-6);
  assert.ok(Math.hypot(before.x-after.x,before.y-after.y,before.z-after.z)<1e-5,'parcel '+index+' position');
  assert.ok(Math.abs(before.alpha-after.alpha)<1e-6,'parcel '+index+' opacity');
  assert.ok(Math.abs(before.heat-after.heat)<1e-6,'parcel '+index+' heat');
  assert.ok(Math.abs(after.x-(HOLE_X-.96))<1e-5);
 }
 assert.ok(captured>50);
});
test('wind selection and reversible age keep finite states and leave uncaptured parcels hidden',()=>{
 for(let index=0;index<100;index++){
  const times=[0,1,10,32,10,0,1];
  const saved=new Map();
  for(const time of times){
   const parcel=windCaptureParcel(index,time);
   assert.ok(Object.values(parcel).every(Number.isFinite));assert.ok(parcel.alpha>=0&&parcel.alpha<=1);
   if(saved.has(time))assert.deepEqual(parcel,saved.get(time));else saved.set(time,parcel);
   if(seedValue(index+9173)>=.24)assert.deepEqual(parcel,{x:DONOR_X,y:0,z:0,heat:0,alpha:0});
  }
 }
});
test('Roche radius is bounded and detached donor remains smaller than overflow donor',()=>{
 assert.ok(Math.abs(rocheLobe(1)-.37892)<.0001);
 assert.ok(donorRadius('detached')<donorRadius('overflow'));
});
test('gas path starts at the donor and joins the disk continuously',()=>{
 for(const scenario of ['overflow','wind']){
  const p=transferPath(0,scenario);assert.ok(Math.abs(p.x-(DONOR_X+donorRadius(scenario)*1.1))<1e-12);
  const a=transferPath(.4-1e-7,scenario),b=transferPath(.4+1e-7,scenario);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-5);
  const end=transferPath(1,scenario);assert.ok(Math.abs(Math.hypot(end.x-HOLE_X,end.y)-.075)<1e-9);
  for(let i=0;i<100;i++){const p=streamParcel(i,12,scenario);assert.ok(p.alpha>=0&&p.alpha<=1);assert.ok(Number.isFinite(p.x+p.y+p.z));assert.deepEqual(p,streamParcel(i,12,scenario));}
 }
});
