import test from 'node:test';
import assert from 'node:assert/strict';
import { airPoint, coastHeight } from '../model.ts';
import { createSession, advanceSession, selectWorld, resetCurrent, readRoute, worldHref } from '../session.ts';

test('one continuous coastal path reverses without changing particle identity',()=>{
  const s=createSession();s.playing=true;const before=structuredClone(s.coast);
  advanceSession(s,.04);assert.ok(s.coast.phase>before.phase);
  s.coast.heat=-s.coast.heat;advanceSession(s,.04);assert.ok(Math.abs(s.coast.phase-before.phase)<1e-12);
  const bottom=airPoint(0,0,'open'),forward=airPoint(.001,0,'open'),reverse=airPoint(-.001,0,'open');
  assert.ok(forward.x>bottom.x&&reverse.x<bottom.x);
  assert.ok(airPoint(.501,0,'open').x<airPoint(.5,0,'open').x);
  s.coast.heat=0;const phase=s.coast.phase;advanceSession(s,.04);assert.equal(s.coast.phase,phase);
  for(let lane=0;lane<4;lane++){
    const a=airPoint(.12,lane,'hill'),b=airPoint(1.12,lane,'hill');
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-10);
  }
});
test('prescribed air paths clear actual terrain, hill and house geometry',()=>{
  for(const obstacle of ['open','hill','house'])for(let lane=0;lane<4;lane++)for(let i=0;i<=2000;i++){
    const p=airPoint(i/2000,lane,obstacle);
    assert.ok(p.y>coastHeight(p.x,p.z),`${obstacle}: air intersects terrain`);
    if(obstacle==='hill')assert.ok(((p.x-42)/29)**2+((p.y-2)/18)**2+((p.z-10)/28)**2>1);
    // Conservative envelope encloses the house's 22 x 18 walls and rotated conical roof.
    if(obstacle==='house'&&Math.abs(p.x-42)<14&&Math.abs(p.z-10)<14)assert.ok(p.y>coastHeight(42,10)+25);
  }
});
test('switching questions and environments retains the controls and independent clocks',()=>{
  const s=createSession();s.coast.heat=-.4;s.coast.phase=.3;s.typhoon.settings.temperature=26;s.typhoon.progress=.42;
  const coast=structuredClone(s.coast),storm=structuredClone(s.typhoon);
  s.lens='flow';selectWorld(s,'typhoon');assert.deepEqual(s.coast,coast);assert.deepEqual(s.typhoon,storm);assert.equal(s.lens,'flow');assert.equal(s.playing,false);
  s.playing=true;advanceSession(s,.08);assert.deepEqual(s.coast,coast);assert.ok(s.typhoon.time>storm.time);
  const matureTime=s.typhoon.time;s.typhoon.progress=1;advanceSession(s,.08);assert.equal(s.typhoon.progress,1);assert.ok(s.typhoon.time>matureTime);
  selectWorld(s,'coast');assert.deepEqual(s.coast,coast);assert.equal(s.typhoon.settings.temperature,26);
});
test('pause freezes all motion and a reset affects only the active environment',()=>{
  const s=createSession();s.typhoon.settings.shear=20;s.tornado.settings.condensation=false;s.coast.heat=-.3;
  const before=structuredClone(s);advanceSession(s,1);assert.deepEqual(s,before);
  resetCurrent(s);assert.deepEqual(s.coast,createSession().coast);assert.deepEqual(s.typhoon,before.typhoon);assert.deepEqual(s.tornado,before.tornado);
  selectWorld(s,'tornado');s.playing=true;advanceSession(s,100);assert.ok(s.tornado.time-before.tornado.time<=.080001);assert.equal(s.tornado.progress,1);
});
test('old links land within the workspace and preserve language without overriding explicit routes',()=>{
  assert.deepEqual(readRoute('','\u0023storms'),{world:'typhoon',lens:'cause'});
  assert.deepEqual(readRoute('','\u0023effects'),{world:'coast',lens:'effects'});
  assert.deepEqual(readRoute('?world=coast&lens=flow','\u0023tornado'),{world:'coast',lens:'flow'});
  assert.deepEqual(readRoute('?world=invalid&lens=invalid'),{world:'coast',lens:'cause'});
  assert.equal(worldHref('tornado','?lang=en&lens=effects'),'/topics/wind/?lang=en&lens=effects&world=tornado');
  assert.equal(worldHref('typhoon','?lang=zh','/encyclopedia/'),'/encyclopedia/topics/wind/?lang=zh&world=typhoon');
});
