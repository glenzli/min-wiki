import test from 'node:test';import assert from 'node:assert/strict';
import {soundSpeed,thunderDelay,lightningState,leaderPath} from '../model.ts';
test('light-sound delay is about three seconds per kilometre and scales with distance',()=>{assert.ok(Math.abs(thunderDelay(1)-2.912)<.01);assert.equal(thunderDelay(0),0);assert.equal(thunderDelay(6),2*thunderDelay(3));});
test('warm air increases sound speed and shortens delay',()=>{assert.ok(soundSpeed(30)>soundSpeed(0));assert.ok(thunderDelay(3,30)<thunderDelay(3,0));});
test('the return stroke begins only after the descending channel has connected',()=>{const settings={distanceKm:3,temperature:20};assert.equal(lightningState(.55,settings).returnStroke,0);assert.equal(lightningState(.6,settings).leader,1);assert.ok(lightningState(.6,settings).returnStroke>0);});
test('the sound front arrives according to physical distance, not animation stage alone',()=>{const near=lightningState(.78,{distanceKm:1,temperature:20}),far=lightningState(.78,{distanceKm:8,temperature:20});assert.equal(near.heard,true);assert.equal(far.heard,false);assert.equal(lightningState(1,{distanceKm:8,temperature:20}).heard,true);});
test('channel geometry is deterministic and reaches its selected ground point',()=>{assert.deepEqual(leaderPath(),leaderPath());assert.deepEqual(leaderPath().at(-1),[15,141]);});
