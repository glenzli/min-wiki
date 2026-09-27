import {test} from 'node:test';
import assert from 'node:assert/strict';
import {phaseState,moleculePosition,waterRoute,routeMoleculePosition} from '../model.ts';
test('freezing preserves water amount and one advancing interface; melting reverses it',()=>{
 for(let i=0;i<=100;i++){
  const p=i/100,s=phaseState('freeze',p),m=phaseState('melt',1-p);
  assert.ok(Math.abs(s.liquidDepth+s.iceDepth/1.09-164)<1e-10);
  assert.ok(Math.abs(s.front+s.liquidDepth-404)<1e-10);
  assert.ok(Math.abs(s.front-m.front)<1e-10);
  if(i>0)assert.ok(s.front>=phaseState('freeze',p-.01).front);
 }
});
test('molecules stay finite and move continuously without appearing or disappearing',()=>{
 for(const kind of ['freeze','melt','evaporate','condense'])for(let i=0;i<36;i++){
  let last=moleculePosition(i,kind,0);
  for(let step=1;step<=1000;step++){
   const current=moleculePosition(i,kind,step/1000);
   assert.ok(Number.isFinite(current.x+current.y));
   assert.ok(Math.hypot(current.x-last.x,current.y-last.y)<6);
   last=current;
  }
 }
 assert.equal(moleculePosition(0,'evaporate',1).gas,1);
 assert.equal(moleculePosition(35,'condense',1).gas,0);
});
test('the separate cup stays drawn down while persistent symbols reach a cold lid',()=>{
  assert.equal(waterRoute(0).condensation,0);
  assert.equal(waterRoute(1).evaporation,1);
  assert.equal(waterRoute(1).condensation,1);
  assert.equal(waterRoute(1).cup.top,waterRoute(.58).cup.top);
  assert.ok(waterRoute(1).cup.top>waterRoute(0).cup.top);
  for(let i=0;i<36;i++){
    let last=routeMoleculePosition(i,0);
    for(let step=1;step<=1000;step++){
      const next=routeMoleculePosition(i,step/1000);
      assert.ok(Number.isFinite(next.x+next.y+next.gas));
      assert.ok(Math.hypot(next.x-last.x,next.y-last.y)<8,`symbol ${i} jumps at ${step}`);
      last=next;
    }
  }
  for(let i=0;i<10;i++)assert.ok(routeMoleculePosition(i,1).y<160);
});
