import test from 'node:test';import assert from 'node:assert/strict';import {frequency} from '../model.ts';test('quadruple ideal tension doubles pitch and zero tension is rejected',()=>{assert.equal(frequency(4),2*frequency(1));assert.throws(()=>frequency(0));});
import { DISPLAY_SPEED, DURATION, parcelDisplacement, relativeDensity, sourceDisplacement } from '../model.ts';
test('distant parcels wait for arrival, then follow the same delayed source displacement',()=>{
  const distance=580,delay=distance/DISPLAY_SPEED;
  assert.equal(parcelDisplacement(distance,delay-.1,1,50),0);
  for (const time of [.1,.4,1,3,5,8,10]) assert.ok(Math.abs(parcelDisplacement(distance,time+delay,1,50)-sourceDisplacement(time,1,50))<1e-10);
});
test('a finite packet continues after its source stops and every parcel returns home',()=>{
  assert.equal(sourceDisplacement(10,1,50),0);
  assert.ok(Math.abs(parcelDisplacement(580,10,1,50))>.5);
  for (let x=0;x<=700;x+=10) assert.equal(parcelDisplacement(x,DURATION,4,50),0);
});
test('air parcels never cross and relative density stays positive at all allowed settings',()=>{
  for(const tension of [1,2,4])for(const amplitude of [10,28,50])for(let time=0;time<=DURATION;time+=.15){
    let previous=-Infinity;
    for(let x=0;x<=700;x+=8){const position=x+parcelDisplacement(x,time,tension,amplitude),density=relativeDensity(x,time,tension,amplitude);assert.ok(position>previous);assert.ok(Number.isFinite(density)&&density>0);assert.ok(Math.abs(position-x)<=16);previous=position;}
  }
});
