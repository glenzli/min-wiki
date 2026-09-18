import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windFlight,burrJourney } from './model.ts';
test('horizontal wind changes advection while the fruit continues settling',()=>{
 for(let i=0;i<=100;i++){const p=i/100;assert.equal(windFlight(p,0).x,185);assert.equal(windFlight(p,1).y,windFlight(p,2).y);if(i)assert.ok(windFlight(p,2).y>=windFlight(p-.01,2).y);}
 assert.ok(windFlight(1,2).x>windFlight(1,1).x);assert.equal(windFlight(1,0).landed,true);
});
test('a burr moves with the fur only after contact and separates after riding',()=>{
 assert.equal(burrJourney(.1).burrX,176);assert.equal(burrJourney(.1).attached,false);
 for(const p of [.23,.4,.74]){const s=burrJourney(p);assert.equal(s.burrX,s.animalX-30);assert.equal(s.burrY,338);assert.equal(s.attached,true);}
 const end=burrJourney(1);assert.equal(end.attached,false);assert.ok(end.burrY>338);assert.notEqual(end.burrX,end.animalX-30);
});
test('contact and release preserve position without replacement or teleportation',()=>{
 for(const p of [.22,.75]){const a=burrJourney(p-1e-7),b=burrJourney(p+1e-7);assert.ok(Math.hypot(a.burrX-b.burrX,a.burrY-b.burrY)<.001);}
});
