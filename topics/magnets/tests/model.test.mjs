import test from 'node:test';
import assert from 'node:assert/strict';
import { initialMotion, stepMotion, magnetEdge, homeX } from '../model.ts';
const evolve = (settings, seconds=4, start=initialMotion(), dt=1/60) => {
  let state=start;
  for(let i=0;i<seconds/dt;i++) state=stepMotion(state,settings,dt);
  return state;
};
test('iron closes the gap, snaps at contact and follows a retreating magnet',()=>{
  const settings={kind:'iron',near:1,flipped:false};
  const early=evolve(settings,.2);
  assert.ok(early.x < homeX && early.x > magnetEdge(1));
  assert.equal(early.attached,false);
  const attached=evolve(settings);
  assert.equal(attached.attached,true);
  assert.equal(attached.x,magnetEdge(1)+2);
  const retreat=stepMotion(attached,{...settings,near:.1},1/60);
  assert.equal(retreat.x,magnetEdge(.1)+2);
  assert.equal(retreat.attached,true);
});
test('same poles push a free magnet and flipping an attached magnet releases it',()=>{
  const settings={kind:'magnet',near:1,flipped:false};
  const attached=evolve(settings);
  assert.equal(attached.attached,true);
  const released=stepMotion(attached,{...settings,flipped:true},1/60);
  assert.equal(released.attached,false);
  assert.ok(released.velocity>0);
  const pushed=evolve({...settings,flipped:true},3,released);
  assert.ok(pushed.x > attached.x+100);
  assert.ok(pushed.x<=750);
  const recaught=evolve(settings,5,pushed);
  assert.equal(recaught.attached,true);
});
test('wood, copper and aluminum remain still; distant iron remains still on the tray',()=>{
  for(const kind of ['wood','copper','aluminum']){
    const state=evolve({kind,near:1,flipped:false});
    assert.equal(state.x,homeX); assert.equal(state.phase,'unaffected');
  }
  assert.equal(evolve({kind:'iron',near:0,flipped:false}).x,homeX);
});
test('snap and push reach the same bounded outcome at common frame rates',()=>{
  for(const dt of [1/30,1/60,1/120]){
    assert.equal(evolve({kind:'magnet',near:1,flipped:false},5,initialMotion(),dt).attached,true);
    const pushed=evolve({kind:'magnet',near:1,flipped:true},5,initialMotion(),dt);
    assert.ok(Number.isFinite(pushed.x) && pushed.x<=750 && pushed.x>homeX);
  }
});
