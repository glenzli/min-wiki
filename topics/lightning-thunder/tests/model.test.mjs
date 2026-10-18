import test from 'node:test';import assert from 'node:assert/strict';
import {soundSpeed,thunderDelay,lightningState,leaderPath,connectorPath,pathThrough,mastTip,attachmentPoint} from '../model.ts';
test('light-sound delay is about three seconds per kilometre and scales with distance',()=>{assert.ok(Math.abs(thunderDelay(1)-2.912)<.01);assert.equal(thunderDelay(0),0);assert.equal(thunderDelay(6),2*thunderDelay(3));});
test('warm air increases sound speed and shortens delay',()=>{assert.ok(soundSpeed(30)>soundSpeed(0));assert.ok(thunderDelay(3,30)<thunderDelay(3,0));});
test('the return stroke begins only after the descending channel has connected',()=>{const settings={distanceKm:3,temperature:20};assert.equal(lightningState(.55,settings).returnStroke,0);assert.equal(lightningState(.6,settings).leader,1);assert.ok(lightningState(.6,settings).returnStroke>0);});
test('the sound front arrives according to physical distance, not animation stage alone',()=>{const near=lightningState(.78,{distanceKm:1,temperature:20}),far=lightningState(.78,{distanceKm:8,temperature:20});assert.equal(near.heard,true);assert.equal(far.heard,false);assert.equal(lightningState(1,{distanceKm:8,temperature:20}).heard,true);});
test('both leaders attach at one point above the mast and preserve a gap before attachment',()=>{
 const settings={distanceKm:3,temperature:20},down=leaderPath(),up=connectorPath();
 assert.deepEqual(down,leaderPath());assert.deepEqual(up[0],mastTip);
 assert.deepEqual(down.at(-1),attachmentPoint);assert.deepEqual(up.at(-1),attachmentPoint);
 assert.ok(attachmentPoint[1]<mastTip[1]);
 for(const p of [.51,.55,.58,.5899]){
  const s=lightningState(p,settings),a=pathThrough(down,s.leader).at(-1),b=pathThrough(up,s.connector).at(-1);
  assert.equal(s.connected,false);assert.equal(s.returnStroke,0);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>0);
 }
 const attached=lightningState(.6,settings);
 assert.equal(attached.connected,true);assert.ok(attached.returnStroke>0);
 assert.deepEqual(pathThrough(down,attached.leader).at(-1),pathThrough(up,attached.connector).at(-1));
 assert.equal(lightningState(.59,settings).connected,true);assert.equal(lightningState(.59,settings).returnStroke,0);
});
test('the return front advances upward along the attached channel while scrubbing reversibly',()=>{
 const settings={distanceKm:3,temperature:20},upward=[...leaderPath()].reverse();
 const earlier=pathThrough(upward,lightningState(.61,settings).returnStroke),later=pathThrough(upward,lightningState(.66,settings).returnStroke);
 assert.deepEqual(earlier[0],attachmentPoint);assert.ok(later.at(-1)[1]<earlier.at(-1)[1]);
 assert.deepEqual(pathThrough(upward,lightningState(.61,settings).returnStroke),earlier);
 assert.deepEqual(pathThrough(upward,lightningState(.675,settings).returnStroke).at(-1),leaderPath()[0]);
});
