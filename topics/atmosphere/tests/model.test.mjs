import test from 'node:test';
import assert from 'node:assert/strict';
import { profile, layerAt, heightPosition, heightFromPosition, parseRoute, routeQuery, defaults, worlds, comparisonWorlds, APPROACH_END, EARTH_RADIUS, journeyFrame, journeyAtHeight, radialPoint } from '../model.ts';
test('reference pressure decreases; profile is continuous and not extrapolated upward', () => {
  assert.ok(Math.abs(profile(0).pressure-1013.25)<.001);
  assert.ok(Math.abs(profile(11).temperature+56.5)<.001);
  let prev=Infinity;
  for(let h=0;h<84.85;h+=.1){const p=profile(h);assert.ok(p.pressure>0&&p.pressure<prev);prev=p.pressure;}
  for(const h of [11,20,32,47,51,71])assert.ok(Math.abs(profile(h-.00001).pressure-profile(h+.00001).pressure)<.002);
  assert.equal(profile(100).pressure,null);assert.ok(profile(47).temperature>profile(20).temperature);
});
test('height mapping and journey stops preserve the selected reference layer', () => {
  for(const h of [0,3,11,25,50,65,85,300,600,850,1000]){
    assert.ok(Math.abs(heightFromPosition(heightPosition(h))-h)<1e-8);
    const f=journeyFrame(journeyAtHeight(h));assert.ok(Math.abs(f.height-h)<1e-8);
  }
  assert.equal(layerAt(5),0);assert.equal(layerAt(30),1);assert.equal(layerAt(700),4);
});
test('one globe and reference site remain inside the camera across approach and ascent', () => {
  let previousHeight=0;
  for(let i=0;i<=1000;i++){
    const f=journeyFrame(i/1000),site=radialPoint(0,0),probe=radialPoint(0,f.height);
    assert.equal(f.site,'illustrative-coast');assert.equal(site.y,-EARTH_RADIUS);
    assert.ok(Number.isFinite(f.halfSpan)&&f.halfSpan>0);
    assert.ok(Math.abs((site.y-f.centerY)/f.halfSpan)<1);
    assert.ok(Math.abs((probe.y-f.centerY)/f.halfSpan)<1);
    assert.ok(f.height>=previousHeight);previousHeight=f.height;
  }
  for(const key of ['height','halfSpan','centerY'])assert.ok(Math.abs(journeyFrame(APPROACH_END-1e-9)[key]-journeyFrame(APPROACH_END+1e-9)[key])<.001);
  assert.deepEqual(journeyFrame(.64),journeyFrame(.64));
  for(const h of [0,3,25,65,300,850]){const p=radialPoint(100,h);assert.ok(Math.abs(Math.hypot(p.x,p.y)-EARTH_RADIUS-h)<1e-8);}
});
test('legacy parcel and height routes migrate; Earth cannot be its own comparison', () => {
  assert.deepEqual(parseRoute(''),defaults);
  const old=parseRoute('?view=motion&lift=3&p=1&humidity=84&world=earth');
  assert.equal(old.view,'layers');assert.equal(old.world,'venus');assert.ok(Math.abs(journeyFrame(old.journey).height-3)<1e-9);
  assert.ok(Math.abs(journeyFrame(parseRoute('?height=65').journey).height-65)<1e-9);
  assert.equal(parseRoute('?view=worlds&world=earth').world,'venus');assert.ok(!comparisonWorlds.includes('earth'));
  assert.deepEqual(parseRoute('?view=nope&journey=NaN&world=x'),defaults);
  const good={...defaults,view:'worlds',world:'moon',journey:.72};assert.deepEqual(parseRoute('?'+routeQuery(good)),good);
  assert.ok(!routeQuery(good).has('humidity'));assert.ok(!routeQuery(good).has('p'));
});
test('near-vacuum worlds keep absence of ordinary pressure/air-temperature readings', () => {
  for(const world of comparisonWorlds){const s={...defaults,view:'worlds',world};assert.deepEqual(parseRoute('?'+routeQuery(s)),s);}
  for(const world of ['moon','mercury']){assert.equal(worlds[world].pressure,null);assert.equal(worlds[world].temperature,null);}
  assert.ok(worlds.venus.pressure>worlds.titan.pressure&&worlds.titan.pressure>worlds.earth.pressure&&worlds.earth.pressure>worlds.mars.pressure);
});

test('orientation rail is monotonic across layer boundaries; guided steps never skip a stop', async () => {
  const {railPosition,advanceJourney,layerStops,layerEdges}=await import('../model.ts');
  let previous=-1;
  for(let h=0;h<=1000;h++){const p=railPosition(h);assert.ok(p>previous);previous=p;}
  layerEdges.forEach((h,i)=>assert.ok(Math.abs(railPosition(h)-i/5)<1e-12));
  let p=0;
  for(const stop of [APPROACH_END,...layerStops.map(journeyAtHeight)]){
    const step=advanceJourney(p,1);assert.equal(step.hold,true);assert.equal(step.position,stop);p=step.position;
  }
  assert.deepEqual(advanceJourney(p,1),{position:1,hold:false});
  assert.deepEqual(advanceJourney(.5,0),{position:.5,hold:false});
});
