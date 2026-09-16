import test from 'node:test';
import assert from 'node:assert/strict';
import { muscleState,nerveSignal,barrierParticle } from '../model.ts';
import { renderCell } from '../scene.ts';

test('muscle contracts and relaxes without shortening either filament',()=>{
  const a=muscleState(0),b=muscleState(.5),c=muscleState(1);
  assert.ok(b.right-b.left<a.right-a.left);assert.equal(a.right-a.left,c.right-c.left);
  for(let k=0;k<=100;k++)assert.equal(muscleState(k/100).filamentLength,178);
});
test('axon signal arrives before transmitter and downstream response',()=>{
  assert.equal(nerveSignal(.5).transmitter,0);assert.equal(nerveSignal(.8).response,0);
  assert.equal(nerveSignal(1).transmitter,1);assert.equal(nerveSignal(1).response,1);
});
test('illustrated outside particles stop above the intact skin barrier',()=>{
  for(let i=0;i<8;i++)for(let k=0;k<=100;k++)assert.ok(barrierParticle(i,k/100).y<=181);
  assert.deepEqual(barrierParticle(0,.6).y,barrierParticle(0,1).y);
});
test('three tissue renderers stay finite and preserve the muscle filament span',()=>{
  for(const kind of ['barrier','muscle','neuron'])for(let k=0;k<=40;k++){
    const svg=renderCell(kind,k/40,s=>s);assert.doesNotMatch(svg,/NaN|Infinity|undefined/);
    if(kind==='muscle')assert.equal([...svg.matchAll(/h178M/g)].length,3);
  }
});

test('muscle contraction preserves the number of visible repeating bands',()=>{
  for(let i=0;i<=20;i++)assert.equal([...renderCell('muscle',i/20,s=>s).matchAll(/data-muscle-band=/g)].length,102);
});
