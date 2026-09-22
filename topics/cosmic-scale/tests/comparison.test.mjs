import test from 'node:test';
import assert from 'node:assert/strict';
import {bodies,lastPair,comparisonFrame,readExploration,stellarOrbitFrame} from '../comparisonModel.ts';
test('comparison defaults and legacy zoom links remain distinct',()=>{
 assert.equal(readExploration('').chapter,'compare');
 assert.equal(readExploration('?origin=sun').chapter,'zoom');
 assert.equal(readExploration('?scale=.7').chapter,'zoom');
 assert.equal(readExploration('?mode=homes&scale=.7').chapter,'homes');
 assert.deepEqual(readExploration('?mode=bad&pair=99&home=-9'),{chapter:'compare',pair:lastPair,home:0});
 assert.deepEqual(readExploration('?mode=compare&pair=1.4&home=2'),{chapter:'compare',pair:1.4,home:2});
});
test('every moving comparison frame retains body identity and a single diameter ratio',()=>{
 for(const width of [342,1100])for(let n=0;n<=lastPair*100;n++){
  const frame=comparisonFrame(n/100,width);
  frame.forEach((b,i)=>{assert.equal(b.id,bodies[i].id);assert.ok(Number.isFinite(b.x)&&b.radius>0&&b.opacity>=0&&b.opacity<=1);assert.ok(Math.abs(b.radius/frame[0].radius-bodies[i].radius/bodies[0].radius)<1e-9);});
 }
 for(const q of [0,1,2,3,4,5,6]){const frame=comparisonFrame(q,342);assert.equal(frame[q].opacity,1);assert.equal(frame[q+1].opacity,1);assert.ok(frame[q].x-frame[q].radius>0);assert.ok(frame[q+1].x+frame[q+1].radius<342);}
 const a=comparisonFrame(1-1e-8,1000),b=comparisonFrame(1+1e-8,1000);a.forEach((v,i)=>assert.ok(Math.abs(v.radius-b[i].radius)/v.radius<1e-6));
});

test('Antares extends the sequence without changing legacy Arcturus stop',()=>{assert.equal(bodies[3].id,'arcturus');assert.equal(bodies[4].id,'antares');assert.equal(bodies[4].radius/bodies[2].radius,700);assert.equal(readExploration('?mode=compare&pair=2').pair,2);});

test('short and immersive canvases keep spherical diameter ratios within their available height', () => {
 for (const height of [140, 220, 600]) for (const width of [340, 1200]) for (const pair of [0, 1, 2, 3, 4, 5, 6]) {
  const frame = comparisonFrame(pair, width, height);
  const a = frame[pair], b = frame[pair + 1];
  assert.ok(Math.abs(a.radius / b.radius - bodies[pair].radius / bodies[pair + 1].radius) < 1e-10);
  assert.ok(b.radius * 2 < height - 30);
 }
});

test('estimated giant outlines and planetary orbits share one scale, not icon sizes',()=>{
 for(const [width,height] of [[342,250],[1000,160],[1200,520]]){
  const woh=stellarOrbitFrame(6,width,height),st=stellarOrbitFrame(7,width,height);
  assert.equal(woh.body.id,'woh-g64');assert.equal(st.body.id,'stephenson-2-18');
  assert.ok(woh.orbits[4].inside);assert.equal(woh.orbits[5].inside,false);assert.ok(st.orbits[5].inside);
  assert.ok(st.radius>st.orbits[5].radius&&st.radius/st.orbits[5].radius<1.06);
  assert.ok(st.radius*2<height-40);assert.ok(st.radius*2<width*.86);
  assert.ok(Math.abs(st.radius/woh.radius-2150/1540)<1e-10);
  for(const g of [woh,st]) assert.ok(Math.abs(g.radius/g.orbits[2].radius-g.body.radius/149597870.7)<1e-10);
 }
 assert.equal(bodies[5].id,'vy-canis-majoris');
 assert.equal(readExploration('?pair=6').pair,6);
});

test('short-viewport framing preserves the physical ruler and fits the Earth anchor', async () => {
 const {viewportScale,halfWidthKm,EARTH_RADIUS_KM} = await import('../model.ts');
 for (const [width,height] of [[1200,140],[1000,360],[340,300]]) {
  const half = halfWidthKm(0) * viewportScale(width,height);
  const diameter = EARTH_RADIUS_KM / half * width;
  assert.ok(diameter < height * .8);
  assert.equal(half, halfWidthKm(0) * Math.max(1,width/(2*height)));
 }
});


test('VY Canis Majoris extends Antares with an explicit representative photospheric estimate', () => {
 assert.equal(bodies[5].id, 'vy-canis-majoris');
 assert.equal(bodies[5].radius / bodies[2].radius, 1420);
 assert.ok(bodies[5].radius / bodies[4].radius > 2);
 assert.equal(readExploration('?mode=compare&pair=3').pair, 3);
 assert.equal(readExploration('?mode=compare&pair=4').pair, 4);
 const before = comparisonFrame(3-1e-8,1000), after = comparisonFrame(3+1e-8,1000);
 before.forEach((body,i)=>assert.ok(Math.abs(body.radius-after[i].radius)/body.radius<1e-6));
});
