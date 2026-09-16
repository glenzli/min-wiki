import test from 'node:test';
import assert from 'node:assert/strict';
import { redCell,oxygenPacket,defenceState,repairState,vesselGap,engulfedTarget } from '../model.ts';
import { renderBlood } from '../scene.ts';

test('oxygen moves continuously from its carrier to tissue while the carrier stays in the vessel',()=>{
  for(let i=0;i<6;i++){
    const release=.34+i*.045,a=oxygenPacket(i,release-1e-7),b=oxygenPacket(i,release+1e-7);
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001);
    assert.ok(oxygenPacket(i,1).y>400);
  }
  for(let k=0;k<=100;k++)assert.ok(redCell(k/100).y>180&&redCell(k/100).y<310);
});
test('white-cell exit precedes engulfment and deformation vanishes after exit',()=>{
  assert.equal(defenceState(0).exit,0);assert.equal(defenceState(.5).engulf,0);
  assert.equal(defenceState(.76).exit,1);assert.equal(defenceState(1).engulf,1);
  assert.ok(Math.abs(defenceState(1).squeeze)<1e-12);
});
test('platelets accumulate before fibrin reinforces the plug',()=>{
  assert.equal(repairState(.58).fibrin,0);
  assert.ok(repairState(.58).platelets.some(p=>p.attached));
  assert.equal(repairState(1).fibrin,1);assert.ok(repairState(1).platelets.every(p=>p.attached));
});
test('all three rendered processes have finite geometry across the complete scrub range',()=>{
  for(const kind of ['oxygen','defence','repair'])for(let k=0;k<=40;k++){
    const svg=renderBlood(kind,k/40,s=>s);assert.doesNotMatch(svg,/NaN|Infinity|undefined/);
    if(kind==='oxygen')assert.equal([...svg.matchAll(/data-oxygen=/g)].length,6);
    if(kind==='repair')assert.equal([...svg.matchAll(/data-platelet=/g)].length,12);
  }
});

test('endothelial junction closes after migration and the target remains within its cell',()=>{
  assert.equal(vesselGap('defence',0).halfWidth,0);
  assert.ok(vesselGap('defence',.36).halfWidth>30);
  assert.ok(Math.abs(vesselGap('defence',1).halfWidth)<1e-10);
  assert.ok(vesselGap('repair',1).center-vesselGap('repair',1).halfWidth>=479);
  assert.ok(vesselGap('repair',1).center+vesselGap('repair',1).halfWidth<=570);
  const target=engulfedTarget(1),cell=defenceState(1);
  assert.ok(target.inside);assert.ok(Math.hypot(target.x-cell.x,target.y-cell.y)<30);
  const svg=renderBlood('defence',1,s=>s);
  assert.ok(svg.indexOf('data-bacterium')>svg.indexOf('data-phagosome'));
});
