import test from 'node:test';
import assert from 'node:assert/strict';
import { hearingSequence, responsePlace, membraneDisplacement } from '../model.ts';
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
