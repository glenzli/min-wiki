import test from 'node:test';
import assert from 'node:assert/strict';
import {readState} from '../model.ts';
import {evolutionState,PHASE_PROGRESS,REMNANT_START} from '../evolutionModel.ts';
import {advanceEvolution,evolutionPlaybackProgress,evolutionPlaybackSeconds,EVOLUTION_DURATION_SECONDS,REMNANT_OBSERVATION_SECONDS} from '../evolutionPlayback.ts';

test('one finite user-started traversal gives late remnants 22 of its 84 screen seconds',()=>{
 assert.equal(EVOLUTION_DURATION_SECONDS,84);assert.equal(REMNANT_OBSERVATION_SECONDS,22);
 const arrival=EVOLUTION_DURATION_SECONDS-REMNANT_OBSERVATION_SECONDS;
 assert.equal(evolutionPlaybackProgress(arrival),REMNANT_START);
 assert.equal(advanceEvolution(0,arrival).progress,REMNANT_START);
 assert.equal(advanceEvolution(0,EVOLUTION_DURATION_SECONDS-1).ended,false);
 assert.deepEqual(advanceEvolution(0,EVOLUTION_DURATION_SECONDS),{progress:1,ended:true});
 assert.deepEqual(advanceEvolution(1,EVOLUTION_DURATION_SECONDS,-1),{progress:0,ended:true});
});
test('scrub, reverse and resume use one timeline with stable URL restoration in both views',()=>{
 for(const progress of [...PHASE_PROGRESS,.12,.49,.87,.925,.95,.99,1]){
  assert.ok(Math.abs(evolutionPlaybackProgress(evolutionPlaybackSeconds(progress))-progress)<1e-12);
  const forward=advanceEvolution(progress,.7),reverse=advanceEvolution(forward.progress,.7,-1);
  if(!forward.ended)assert.ok(Math.abs(reverse.progress-progress)<2e-5);
 }
 const same=readState('?chapter=evolution&track=solar&evolution=0.95000&view=comparison');
 assert.equal(same.evolutionProgress,.95);assert.equal(same.spaceView,false);
 assert.deepEqual(evolutionState(same.evolutionTrack,same.evolutionProgress),evolutionState('solar',.95));
 assert.equal(advanceEvolution(.95,0).progress,.95);
 assert.equal(advanceEvolution(.95,NaN).progress,.95);
 assert.equal(advanceEvolution(.95,-10).progress,.95);
 assert.equal(advanceEvolution(.95,1e9).progress,1);
 assert.equal(advanceEvolution(.95,1e9,-1).progress,0);
});
test('small animation callbacks cannot get stuck by URL anchor rounding',()=>{
 let progress=REMNANT_START;
 for(let step=0;step<22000;step++)progress=advanceEvolution(progress,.001).progress;
 assert.ok(progress>.99999);
 for(let step=0;step<22000;step++)progress=advanceEvolution(progress,.001,-1).progress;
 assert.ok(Math.abs(progress-REMNANT_START)<1e-8);
});
