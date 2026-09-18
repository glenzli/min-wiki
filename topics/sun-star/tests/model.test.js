import test from 'node:test';import assert from 'node:assert/strict';import {angularRatio} from '../model.ts';test('fixed-size Sun angular diameter falls with distance',()=>{assert.equal(angularRatio(1),1);assert.ok(Math.abs(angularRatio(2)-.5)<.00001);assert.ok(angularRatio(1000)<.00101);assert.throws(()=>angularRatio(.1));});
import { solarObservation } from '../model.ts';
test('one AU agrees with observed angular size and approximate eight-minute sunlight delay',()=>{
  const observation=solarObservation(1);assert.ok(observation.angularDiameterDegrees>.53&&observation.angularDiameterDegrees<.54);assert.ok(observation.lightTravelSeconds>498&&observation.lightTravelSeconds<500);assert.equal(observation.relativeIrradiance,1);
});
test('doubling distance doubles light delay but quarters irradiance without changing the Sun',()=>{
  const a=solarObservation(1),b=solarObservation(2);assert.equal(b.lightTravelSeconds,a.lightTravelSeconds*2);assert.equal(b.relativeIrradiance,a.relativeIrradiance/4);
  for(const d of [1,10,100,1000])assert.ok(Object.values(solarObservation(d)).every(n=>Number.isFinite(n)&&n>0));
  assert.throws(()=>solarObservation(Infinity));assert.throws(()=>angularRatio(NaN));
});
