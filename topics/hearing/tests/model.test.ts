import test from 'node:test';
import assert from 'node:assert/strict';
import { hearingSequence, responsePlace, membraneDisplacement, selectedHairCell } from '../model.ts';
test('a sound packet reaches mechanical stages before neural transmission',()=>{
 for(let p=0;p<=1;p+=.01){const s=hearingSequence(p);if(s.nerve>0)assert.ok(s.transduction>0);if(s.transduction>0)assert.ok(s.cochlea>0);if(s.cochlea>0)assert.ok(s.middle>0);if(s.brain>0)assert.ok(s.nerve>0);}
 assert.equal(hearingSequence(0).brain,0);assert.equal(hearingSequence(1).brain,1);
});
test('higher frequency favors the base; amplitude does not move the place code',()=>{
 assert.ok(responsePlace(1)<responsePlace(0));
 for(const pitch of [0,.2,.5,1]){assert.equal(hearingSequence(.62,pitch,0).place,hearingSequence(.62,pitch,1).place);}
});
test('bounded display values survive invalid and out-of-range input',()=>{
 for(const p of [-10,NaN,Infinity,0,.4,1,10])for(const pitch of [-3,NaN,1,9]){
 const s=hearingSequence(p,pitch,NaN);for(const value of Object.values(s))assert.ok(Number.isFinite(value));assert.ok(s.place>=.2&&s.place<=.8);}
});
test('wave displacement starts at rest and remains finite through both pitch comparisons',()=>{
 for(let x=0;x<=1;x+=.05){assert.ok(Math.abs(membraneDisplacement(x,0,0,.5))===0);for(const pitch of [0,1])for(let p=0;p<=1;p+=.05)assert.ok(Math.abs(membraneDisplacement(x,p,pitch,1))<=1);}
});
test('selected cells wait for their own wavefront, including the later low-pitch region',()=>{
 for(const pitch of [0,.25,.5,.75,1])for(let p=0;p<=1;p+=.005){
  const cell=selectedHairCell(p,pitch,.55),s=hearingSequence(p,pitch,.55);
  assert.equal(cell.arrived,s.cochlea*1.45>=cell.x);
  if(!cell.arrived){assert.equal(Math.abs(cell.displacement),0);assert.equal(cell.transduction,0);assert.equal(cell.nerve,0);}
 }
 assert.equal(selectedHairCell(.44,0,.55).arrived,false);
 assert.equal(selectedHairCell(.44,1,.55).arrived,true);
});
test('arrival survives a displacement zero crossing and the completed packet',()=>{
 const x=selectedHairCell(.6,0,.55).x,zeroCrossing=(x*24+Math.PI)/37;
 const cell=selectedHairCell(zeroCrossing,0,.55);
 assert.ok(Math.abs(cell.displacement)<1e-12);assert.equal(cell.arrived,true);assert.ok(cell.transduction>0);
 const end=selectedHairCell(1,0,.55);
 assert.equal(Math.abs(end.displacement),0);assert.equal(end.arrived,true);assert.equal(end.nerve,1);
});
test('zero input produces no mechanical packet or stimulus-evoked neural sequence',()=>{
 for(const pitch of [0,.5,1])for(let i=0;i<=100;i++){
  const p=i/100,s=hearingSequence(p,pitch,0),cell=selectedHairCell(p,pitch,0);
  for(const key of ['amplitude','air','middle','cochlea','transduction','nerve','brain','deflection'] as const)assert.equal(Math.abs(s[key]),0);
  assert.equal(cell.arrived,false);assert.equal(cell.active,0);assert.equal(Math.abs(cell.displacement),0);
  assert.equal(cell.transduction,0);assert.equal(cell.nerve,0);
  for(const x of [0,.2,.5,.8,1])assert.equal(Math.abs(membraneDisplacement(x,p,pitch,0)),0);
 }
});
test('positive amplitude scales displacement without introducing a neural detection threshold',()=>{
 for(const pitch of [0,1]){
  const full=selectedHairCell(.62,pitch,1);
  for(const strength of [.0001,.25,.5]){
   const cell=selectedHairCell(.62,pitch,strength);
   assert.ok(Math.abs(cell.displacement-full.displacement*strength)<1e-12);
   assert.equal(cell.x,full.x);assert.equal(cell.transduction,full.transduction);
   assert.equal(hearingSequence(1,pitch,strength).brain,1);
  }
 }
});
