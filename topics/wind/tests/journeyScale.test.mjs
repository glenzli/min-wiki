import test from 'node:test';
import assert from 'node:assert/strict';
import { guidePoint,guidePhase,journeyOrder } from '../journeyModel.ts';
import { scaleProjection,scaleRatios,rulerKm,SCALE_SPANS,PLAYGROUND_KM,CITY_KM } from '../scaleModel.ts';
import { createSession,advanceSession } from '../session.ts';

test('the coast route closes but storm routes exchange air with their surroundings',()=>{
  for(const world of journeyOrder){
    const start=guidePoint(world,0),end=guidePoint(world,1),distance=Math.hypot(end.x-start.x,end.y-start.y);
    if(world==='coast'){assert.equal(distance,0);assert.equal(start.opacity,1);}
    else{assert.ok(distance>400);assert.equal(start.opacity,0);assert.equal(end.opacity,0);}
    for(const joint of [1/3,2/3]){const a=guidePoint(world,joint-1e-7),b=guidePoint(world,joint+1e-7);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.002);}
  }
});
test('night reverses the coastal schematic spatially without reversing entry/upward/return meanings',()=>{
  for(let u=0;u<=1;u+=.01){const day=guidePoint('coast',u,1),night=guidePoint('coast',u,-1);assert.ok(Math.abs(day.x+night.x-560)<1e-9);assert.equal(day.y,night.y);assert.equal(day.stage,night.stage);}
  const s=createSession();s.playing=true;s.coast.heat=-.6;advanceSession(s,.05);assert.ok(s.coast.phase<0);assert.ok(s.coast.travel>0);
  const travel=s.coast.travel;s.coast.heat=0;advanceSession(s,.05);assert.equal(s.coast.travel,travel);
  s.playing=false;const before=structuredClone(s);advanceSession(s,.05);assert.deepEqual(s,before);
  assert.equal(guidePhase('typhoon',12,0),0);
});
test('all guide points are finite and within the visible diagram at every segment',()=>{
  for(const world of journeyOrder)for(let i=0;i<=1000;i++){
    const p=guidePoint(world,i/1000);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x>=0&&p.x<=600&&p.y>=0&&p.y<=205);assert.ok(p.opacity>=0&&p.opacity<=1);assert.ok([0,1,2].includes(p.stage));
  }
});
test('scale references compare lengths, and doubling a storm doubles its visible diameter in one frame',()=>{
  assert.deepEqual(scaleRatios(500),{playgrounds:5000,cities:25});assert.deepEqual(scaleRatios(1000),{playgrounds:10000,cities:50});
  const p=scaleProjection(800,425,SCALE_SPANS.storm);assert.equal(p.size(1000),2*p.size(500));assert.equal(CITY_KM/PLAYGROUND_KM,200);
  assert.ok(p.size(1000)<425);
});
test('every zoom frame uses one metric conversion and preserves the same central playground',()=>{
  for(const [w,h] of [[800,425],[330,340]])for(const span of [.22,.5,2,32,100,500,1400]){
    const p=scaleProjection(w,h,span);assert.equal(p.x(0),w/2);assert.equal(p.y(0),h/2);
    assert.ok(Math.abs(p.size(CITY_KM)/p.size(PLAYGROUND_KM)-200)<1e-9);
    assert.ok(Math.abs(p.x(10)-p.x(-10)-p.size(20))<1e-8);
    assert.ok(rulerKm(span)>0&&rulerKm(span)<=span*.22);assert.ok(p.size(rulerKm(span))<=Math.min(w,h)*.22+1e-9);
  }
});
