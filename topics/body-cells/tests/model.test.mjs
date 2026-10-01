import test from 'node:test';
import assert from 'node:assert/strict';
import { muscleState,nerveSignal,barrierParticle,MUSCLE_APPARATUS } from '../model.ts';
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

test('external spring, total muscle tension and clamp reaction balance on the same junction',()=>{
  const a=MUSCLE_APPARATUS;
  for(const mode of ['shortening','isometric'])for(const load of [0,.25,.5,.75,1])for(let i=0;i<=100;i++){
    const s=muscleState(i/100,{mode,load});
    assert.ok(Math.abs(s.tension-s.springForce-s.clampForce)<1e-12);
    assert.equal(s.junction,s.right+a.tendonLength);
    assert.equal(s.springLength,a.springAnchor-s.junction);
    assert.ok(s.springLength>a.springRestLength);
    assert.ok(s.tension>0); // The apparatus is already preloaded, even at zero activation.
    assert.ok(s.springForce>0);assert.ok(s.clampForce>=0);
    assert.equal(s.left,a.left);
    assert.equal(s.filamentLength,178);
  }
});
test('isometric constraint fixes muscle and spring length while increasing tension',()=>{
  for(const load of [0,.5,1]){
    const rest=muscleState(0,{mode:'isometric',load});
    for(let i=0;i<=100;i++){
      const s=muscleState(i/100,{mode:'isometric',load});
      assert.equal(s.right,rest.right);assert.equal(s.length,rest.length);
      assert.equal(s.springLength,rest.springLength);assert.equal(s.springForce,rest.springForce);
      assert.ok(Math.abs(s.clampForce-.88*s.activation)<1e-12);
      assert.ok(Math.abs(s.tension-rest.tension-.88*s.activation)<1e-12);
      assert.equal(s.shortening,0);
    }
  }
});
test('stiffer elastic loads reduce shortening and increase force without pretending to be overload',()=>{
  const soft=muscleState(.5,{mode:'shortening',load:0}),middle=muscleState(.5,{mode:'shortening',load:.5}),stiff=muscleState(.5,{mode:'shortening',load:1});
  assert.ok(soft.shortening>middle.shortening);assert.ok(middle.shortening>stiff.shortening);
  assert.ok(soft.tension<middle.tension);assert.ok(middle.tension<stiff.tension);
  assert.ok(stiff.shortening>0);assert.ok(soft.restLength<middle.restLength);assert.ok(middle.restLength<stiff.restLength);
  for(const load of [0,.5,1]){
    const rest=muscleState(0,{mode:'shortening',load}),peak=muscleState(.5,{mode:'shortening',load});
    assert.ok(peak.springLength>rest.springLength);
    assert.ok(peak.springForce>rest.springForce); // This is not a constant-force load.
  }
});
test('relaxation revisits the externally preloaded equilibrium and scrubbing is deterministic',()=>{
  for(const mode of ['shortening','isometric'])for(const load of [0,.5,1]){
    const rest=muscleState(0,{mode,load}),end=muscleState(1,{mode,load});
    for(const key of ['right','length','tension','springForce','springLength'])assert.equal(end[key],rest[key]);
    const before=muscleState(.25,{mode,load}),after=muscleState(.75,{mode,load});
    for(const key of ['right','length','tension','springForce'])assert.ok(Math.abs(after[key]-before[key])<1e-12);
    const revisited=muscleState(.38,{mode,load});muscleState(.9,{mode,load});assert.deepEqual(muscleState(.38,{mode,load}),revisited);
  }
});
test('muscle model bounds malformed progress and stiffness without invalid geometry',()=>{
  for(const progress of [NaN,Infinity,-1,0,.5,1,2])for(const load of [NaN,Infinity,-1,0,.5,1,2]){
    const s=muscleState(progress,{mode:'shortening',load});
    for(const value of Object.values(s))if(typeof value==='number')assert.ok(Number.isFinite(value));
    assert.ok(s.right>s.left);assert.ok(s.junction<MUSCLE_APPARATUS.springAnchor);
  }
});
