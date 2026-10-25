import test from 'node:test';
import assert from 'node:assert/strict';
import {glacierBudget,parseClimateState,serializeClimateState} from '../model.ts';
import {glacierFrame,glacierRoundParts} from '../glacierPlayback.ts';

test('scrub coordinates retain fractional observations and restore at the finite endpoint',()=>{
  assert.deepEqual(glacierRoundParts(4.375),{steps:4,glacierPhase:375});
  assert.deepEqual(glacierRoundParts(12),{steps:12,glacierPhase:0});
  assert.deepEqual(glacierRoundParts(Infinity),{steps:0,glacierPhase:0});
  const state=parseClimateState({steps:'4',glacierPhase:'375'});
  assert.deepEqual(parseClimateState(serializeClimateState(state)),state);
  assert.equal(parseClimateState({steps:'12',glacierPhase:'999'}).glacierPhase,0);
  assert.equal(parseClimateState({steps:'4',glacierPhase:'NaN'}).glacierPhase,0);
});

test('the smooth observation exactly meets the authoritative budget at every completed round',()=>{
  for(const a of [0,4,8,10])for(const b of [0,4,7,10])for(let step=0;step<=12;step++){
    const frame=glacierFrame(a,b,step),budget=glacierBudget(a,b,step);
    for(const key of ['mass','totalAdded','totalLost'])assert.equal(frame[key],budget[key]);
    if(step<12)assert.equal(glacierFrame(a,b,step,1000).mass,glacierBudget(a,b,step+1).mass);
  }
});

test('intermediate geometry/readouts/history share one interpolated mass with no negative ice or extra source',()=>{
  for(const [a,b] of [[0,10],[3,10],[4,4],[8,4]])for(let step=0;step<12;step++)for(const phase of [1,250,500,999]){
    const frame=glacierFrame(a,b,step,phase),last=frame.trajectory.at(-1);
    assert.ok(frame.mass>=0);
    assert.ok(Math.abs(frame.initial+frame.totalAdded-frame.totalLost-frame.mass)<1e-10);
    assert.equal(last.mass,frame.mass);assert.equal(last.round,frame.round);
    const again=glacierFrame(a,b,step,phase);assert.deepEqual(again,frame);
  }
  assert.equal(glacierFrame(0,10,7,500).mass,0);
  assert.equal(glacierFrame(4,4,3,500).mass,60);
  assert.equal(glacierFrame(8,4,3,500).mass,74);
});
