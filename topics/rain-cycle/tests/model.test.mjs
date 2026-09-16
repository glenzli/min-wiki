import test from 'node:test';
import assert from 'node:assert/strict';
import { waterJourney, cycleRainDrop, evaporationCue, mountainSurface, stageStops } from '../model.ts';

test('the representative journey joins continuously and closes at the ocean',()=>{
 assert.deepEqual(waterJourney(0),[635,366]);
 assert.deepEqual(waterJourney(1),waterJourney(0));
 for(const boundary of [.25,.5,.75,.8,.85,.9,.95]){
  const a=waterJourney(boundary-1e-8),b=waterJourney(boundary+1e-8);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<.0001,`jump at ${boundary}`);
 }
 let previous=waterJourney(0);
 for(let i=1;i<=10000;i++){
  const point=waterJourney(i/10000);
  assert.ok(point.every(Number.isFinite));
  assert.ok(Math.hypot(point[0]-previous[0],point[1]-previous[1])<.5);
  previous=point;
 }
 assert.deepEqual(stageStops.map(p=>Math.floor(p*4)),[0,1,2,3]);
});

test('the tracked river route reaches its bends and then moves through the ocean',()=>{
 const stops=[[.75,[265,305]],[.8,[287,375]],[.85,[365,415]],[.9,[457,442]],[.95,[601,442]]];
 for(const [p,expected] of stops){const actual=waterJourney(p);assert.ok(Math.hypot(actual[0]-expected[0],actual[1]-expected[1])<1e-8);}
 for(let step=950;step<=1000;step++){
  const [x,y]=waterJourney(step/1000);assert.ok(x>=600&&x<=680&&y>=365&&y<=443);
 }
});

test('rain reaches the visible mountain once and retains its ground contact',()=>{
 for(let index=0;index<13;index++){
  let lastY=-Infinity,landed=false;
  for(let step=0;step<=1000;step++){
   const d=cycleRainDrop(step/1000,index);
   assert.ok(d.y>=lastY);lastY=d.y;
   if(landed)assert.equal(d.outcome,'landed');
   if(d.outcome==='landed'){
    landed=true;assert.equal(d.x,d.groundX);assert.equal(d.y,mountainSurface(d.groundX));
   }
  }
  assert.ok(landed);
 }
});

test('warm and cool cues change density without teleporting water molecules',()=>{
 for(let step=0;step<=1000;step+=5)for(let index=0;index<12;index++){
  const p=step/1000,warm=evaporationCue(p,index,0),cool=evaporationCue(p,index,1);
  assert.equal(warm.x,cool.x);assert.equal(warm.y,cool.y);
  assert.ok(warm.opacity>=cool.opacity);
  for(const coolness of [0,.5,1]){
   const d=evaporationCue(p,index,coolness);assert.ok(d.opacity>=0&&d.opacity<=1);
  }
 }
 assert.equal(evaporationCue(0,0,0).opacity,0);
 assert.equal(evaporationCue(1,0,0).opacity,0);
});
