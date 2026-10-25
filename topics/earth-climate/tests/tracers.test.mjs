import test from 'node:test';
import assert from 'node:assert/strict';
import {glacierFrame,glacierRoundParts} from '../glacierPlayback.ts';
import {glacierTracers} from '../glacierTracers.ts';

test('the same markers move down-valley while a negative budget independently retreats the front',()=>{
  let previous;
  for(let round=0;round<=12;round+=.25){
    const p=glacierRoundParts(round),budget=glacierFrame(4,7,p.steps,p.glacierPhase),snapshot=glacierTracers(budget.mass,round);
    assert.deepEqual(snapshot.markers.map(m=>m.id),['T1','T2','T3']);
    for(const marker of snapshot.markers){assert.ok(marker.direction.z>0);assert.ok(marker.direction.y<0);}
    if(previous){assert.ok(snapshot.front<previous.front);snapshot.markers.forEach((marker,i)=>assert.ok(marker.z>previous.markers[i].z));}
    previous=snapshot;
  }
});

test('balanced ice amount retains its front while the observation markers still advance',()=>{
  const a=glacierTracers(glacierFrame(4,4,0).mass,0),b=glacierTracers(glacierFrame(4,4,12).mass,12);
  assert.equal(a.shape.mass,60);assert.equal(b.shape.mass,60);assert.equal(a.front,b.front);
  b.markers.forEach((marker,i)=>{assert.ok(marker.z>a.markers[i].z);assert.ok(marker.tracked);});
  assert.deepEqual(glacierTracers(60,3.5),glacierTracers(60,3.5));
});

test('lost ice leaves explicitly untracked identities rather than relabeling markers as meltwater or respawning them',()=>{
  const present=glacierTracers(60,0),absent=glacierTracers(0,12);
  assert.deepEqual(absent.markers.map(m=>m.id),present.markers.map(m=>m.id));
  assert.ok(absent.markers.every(m=>!m.tracked));
  assert.ok(absent.markers.every(m=>Number.isFinite(m.x)&&Number.isFinite(m.y)&&Number.isFinite(m.z)));
  assert.deepEqual(glacierTracers(60,0),present);
});
