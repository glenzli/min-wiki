import test from 'node:test';import assert from 'node:assert/strict';import {frequency} from '../model.ts';test('quadruple ideal tension doubles pitch and zero tension is rejected',()=>{assert.equal(frequency(4),2*frequency(1));assert.throws(()=>frequency(0));});
import { DISPLAY_SPEED, DURATION, RECEIVER_DISTANCE, packetSpan, receiverArrival, parcelDisplacement, relativeDensity, sourceDisplacement, stringProjection } from '../model.ts';

test('the taut-string supports stay fixed and tension vectors encode force independently of displacement',()=>{
  const low=stringProjection(0,1),high=stringProjection(0,4);
  assert.deepEqual(low.left,high.left);assert.deepEqual(low.right,high.right);
  assert.equal(high.length,4*low.length);
  for(const tension of [1,2,4])for(const displacement of [-32,-8,0,8,32]){
    const s=stringProjection(displacement,tension);
    for(const [origin,end] of [[s.left,s.pullLeft],[s.right,s.pullRight]]){
      assert.ok(Math.abs(Math.hypot(end[0]-origin[0],end[1]-origin[1])-s.length)<1e-10);
      assert.ok((end[1]-origin[1])*displacement<=0);
    }
    assert.equal(s.middle[1]-230,displacement);
  }
  assert.throws(()=>stringProjection(0,0));
});

test('the finite packet reaches the receiver before its trailing edge leaves the path',()=>{
  assert.equal(receiverArrival,RECEIVER_DISTANCE/DISPLAY_SPEED);
  assert.deepEqual(packetSpan(0),{head:0,tail:0,visible:false});
  assert.ok(packetSpan(receiverArrival-.01).head<RECEIVER_DISTANCE);
  assert.equal(packetSpan(receiverArrival).head,RECEIVER_DISTANCE);
  assert.equal(packetSpan(10).head,RECEIVER_DISTANCE);
  assert.ok(packetSpan(10).tail>0);
  assert.deepEqual(packetSpan(DURATION),{head:RECEIVER_DISTANCE,tail:RECEIVER_DISTANCE,visible:false});
});
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
