import test from 'node:test';
import assert from 'node:assert/strict';
import {wheelContact,readMotionChapter,motionHref,legacyCarChapter} from '../projectModel.ts';
test('a rigid rolling wheel preserves its marked tread radius and no-slip geometry',()=>{
 for(let i=0;i<=100;i++){
  const p=i/100,s=wheelContact(p,'rolling');
  assert.ok(Math.abs(s.distance-s.radius*s.angle)<1e-10);
  assert.ok(Math.abs(Math.hypot(s.markX-s.centerX,s.markY-125)-s.radius)<1e-10);
  assert.equal(s.slipRatio,0);
  const locked=wheelContact(p,'sliding');assert.equal(locked.angle,0);
  assert.equal(locked.markX,locked.centerX);assert.equal(locked.markY,185);assert.equal(locked.slipRatio,1);
 }
 assert.deepEqual(wheelContact(NaN,'rolling'),wheelContact(0,'rolling'));
});
test('motion routes select exact chapter while preserving language and legacy anchor',()=>{
 assert.equal(readMotionChapter('?chapter=contact'),'contact');assert.equal(readMotionChapter('?chapter=bad'),'slide');
 const url=new URL(motionHref('restraints','?lang=en&road=wet&speed=60','#seat-symbol'),'https://wiki.test');
 assert.equal(url.searchParams.get('road'),'wet');assert.equal(url.searchParams.get('lang'),'en');assert.equal(url.hash,'#seat-symbol');
 assert.equal(legacyCarChapter('#seat-symbol'),'restraints');assert.equal(legacyCarChapter('#belt-lap'),'restraints');
 assert.equal(legacyCarChapter('#braking'),'braking');assert.equal(legacyCarChapter(''),'braking');
});
