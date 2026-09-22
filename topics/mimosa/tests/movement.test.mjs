import test from 'node:test';
import assert from 'node:assert/strict';
import {flytrapFrame,flytrapDuration,growthFrame,growthPoint,plantCase,SIGNAL_THRESHOLD} from '../movementModel.ts';
test('one touch and widely separated touches leave the trap open',()=>{
 for(const [pattern,gap] of [['once',5],['twice',40]]) for(let i=0;i<=100;i++) assert.equal(flytrapFrame(i/100,pattern,gap).closure,0);
});
test('two close stimuli precede closure and the signal decays while waiting',()=>{
 const duration=flytrapDuration('twice',5);
 assert.equal(flytrapFrame(6.99/duration,'twice',5).closure,0);
 assert.ok(flytrapFrame(7/duration,'twice',5).signal>SIGNAL_THRESHOLD);
 assert.equal(flytrapFrame(7/duration,'twice',5).stage,'triggered');
 assert.equal(flytrapFrame(7.1/duration,'twice',5).closure,0);
 assert.equal(flytrapFrame(8/duration,'twice',5).stage,'closing');
 assert.equal(flytrapFrame(1,'twice',40).stage,'late');
 assert.equal(flytrapFrame(1,'twice',5).closure,1);
 assert.ok(flytrapFrame(3/40,'once',5).signal>flytrapFrame(25/40,'once',5).signal);
 assert.deepEqual(flytrapFrame(.5,'twice',5),flytrapFrame(.5,'twice',5));
});
test('sided shoot growth curves toward light; opposite lights mirror the same plant',()=>{
 const left=growthFrame(1,'left'),right=growthFrame(1,'right'),both=growthFrame(1,'both');
 assert.ok(left.right>left.left); assert.ok(right.left>right.right); assert.equal(both.left,both.right);
 const a=growthPoint(left,1),b=growthPoint(right,1);
 assert.ok(a[0]<0); assert.ok(b[0]>0); assert.ok(Math.abs(a[0]+b[0])<1e-8); assert.equal(a[1],b[1]);
 assert.equal(growthPoint(both,1)[0],0); assert.equal(growthPoint(growthFrame(0,'left'),1)[0],0);
});
test('growth keeps the base anchored and both sides grow without shrinking',()=>{
 for(const direction of ['left','right','both']) {
  let previous=growthFrame(0,direction);
  for(let i=1;i<=100;i++) {const next=growthFrame(i/100,direction); assert.ok(growthPoint(next,0).every(value=>value===0)); assert.ok(next.left>=previous.left&&next.right>=previous.right);previous=next;}
 }
});
test('legacy and invalid links retain the original mimosa entry',()=>{
 assert.equal(plantCase(null),'mimosa'); assert.equal(plantCase('unknown'),'mimosa'); assert.equal(plantCase('flytrap'),'flytrap');assert.equal(plantCase('seedling'),'seedling');
});
