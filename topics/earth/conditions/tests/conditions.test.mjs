import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {energyBalance,realWorld,ALBEDO,SOLAR_FLUX,EARTH_ESCAPE,WORLD_IDS,tiltOutcome,CITIES} from '../model.ts';
import {readConditions,conditionsURL,destination} from '../route.ts';

const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);
test('solar input follows inverse square while averaging over the sphere and retaining albedo',()=>{
  const near=energyBalance(.75),far=energyBalance(1.5),earth=energyBalance(1);
  close(near.sunlight/far.sunlight,4);close(near.temperatureK/far.temperatureK,Math.sqrt(2));
  close(earth.sunlight,SOLAR_FLUX);close(earth.absorbed,SOLAR_FLUX*(1-ALBEDO)/4);
  assert.ok(earth.temperatureC>14&&earth.temperatureC<16);close(earth.imbalance,0);
});
test('the infrared control changes outgoing heat at fixed reference temperature, not solar input',()=>{
  const a=energyBalance(1,.4),b=energyBalance(1,1);
  close(a.absorbed,b.absorbed);close(a.sunlight,b.sunlight);assert.ok(a.temperatureK>b.temperatureK);
  assert.ok(a.imbalance>0);assert.ok(b.imbalance<0);
  for(const r of [.65,.723,1,1.524,1.7])for(const e of [.4,EARTH_ESCAPE,1]){
    const frame=energyBalance(r,e);close(frame.absorbed,frame.outgoingAtEquilibrium);
    assert.ok(frame.temperatureK>0&&frame.absorbed<600);
  }
});
test('invalid and extreme numerical inputs cannot create nonfinite model output',()=>{
  for(const v of [NaN,Infinity,-Infinity,-100,0,100,undefined,null,'bad']){
    const f=energyBalance(v,v);for(const n of Object.values(f))assert.ok(Number.isFinite(n));
    assert.ok(f.distance>=.65&&f.distance<=1.7);assert.ok(f.infraredEscape>=.4&&f.infraredEscape<=1);
  }
});
test('real worlds are independent reference data, never predictions from the hypothetical Earth',()=>{
  const original=WORLD_IDS.map(realWorld);energyBalance(.723,.4);
  assert.deepEqual(WORLD_IDS.map(realWorld),original);
  assert.ok(realWorld('venus').temperatureC>400);assert.ok(realWorld('mars').pressureHpa<10);
  assert.ok(Math.abs(energyBalance(realWorld('venus').distanceAU).temperatureC-realWorld('venus').temperatureC)>300);
});
test('all observation identities and both progress coordinates survive roundtrip serialization',()=>{
  const s=readConditions('');s.step='atmosphere';s.world='mars';s.distance=.812;s.escape=.48;
  s.observations.mars={site:'marineris',view:'descent',descent:.637,section:.82};
  s.observations.venus={site:'sif',view:'section',descent:.42,section:.91};
  const url=conditionsURL('https://test.invalid/museum/topics/earth/?lang=en&static=1&earth.history.era=4500#earth-conditions',s);
  assert.deepEqual(readConditions(url.search),s);assert.equal(url.searchParams.get('earth.history.era'),'4500');
  for(const topic of ['solar-system','atmosphere','earth']){
    const next=destination(url.href,topic,s);assert.equal(next.pathname,`/museum/topics/${topic}/`);
    assert.deepEqual(readConditions(next.search),s);assert.equal(next.searchParams.get('lang'),'en');assert.equal(next.searchParams.get('static'),'1');
  }
});
test('handoffs accept only bounded experiment fields and remove stale unrelated destinations',()=>{
  const s=readConditions('?if.step=bad&if.world=sun&if.au=Infinity&if.escape=-2&if.venus.site=marineris&if.mars.descent=NaN&if.mars.view=rings');
  assert.equal(s.step,'distance');assert.equal(s.world,'venus');assert.equal(s.distance,1);assert.equal(s.escape,.4);
  assert.equal(s.observations.venus.site,'sif');assert.equal(s.observations.mars.descent,0);assert.equal(s.observations.mars.view,'globe');
  const url=destination('https://test.invalid/wiki/topics/solar-system/?chapter=history&body=sun&return=https://evil.invalid', 'earth',s);
  assert.equal(url.origin,'https://test.invalid');assert.equal(url.pathname,'/wiki/topics/earth/');
  assert.equal(url.searchParams.get('chapter'),null);assert.equal(url.searchParams.get('return'),null);
  assert.equal(url.hash,'#earth-conditions');
});
test('Chinese and English retain equivalent complete authored fields',()=>{
  const words=JSON.parse(readFileSync(new URL('../content.json',import.meta.url)));
  function walk(a,b){assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());for(const key of Object.keys(a)){
    if(typeof a[key]==='object')walk(a[key],b[key]);else{assert.ok(a[key].trim());assert.ok(b[key].trim());assert.doesNotMatch(b[key],/[\u3400-\u9fff]/);}
  }}walk(words.zh,words.en);
});
test('daylight extension preserves its own place, orbital position and energy experiment on handoff',()=>{
  const state=readConditions('?if.step=tilt&if.au=1.524&if.escape=.42&if.tilt=97.77&if.city=london&if.season=.75');
  assert.equal(state.track,'seasons');assert.equal(state.city,'london');assert.equal(state.tilt,97.77);
  for(const topic of ['earth','solar-system','earth-seasons'])assert.deepEqual(readConditions(destination('https://test.invalid/wiki/topics/earth/?lang=en',topic,state).search),state);
  const safe=readConditions('?if.track=seasons&if.step=atmosphere&if.city=invalid&if.tilt=999&if.season=.123');
  assert.equal(safe.step,'tilt');assert.equal(safe.city,'beijing');assert.equal(safe.tilt,98);assert.equal(safe.season,.25);
});
test('zero tilt removes tilt-driven seasonality; high tilt and hemispheres remain finite',()=>{
  for(const city of CITIES){
    for(const season of [0,.25,.5,.75]){
      const zero=tiltOutcome(0,season,city.id);if(Math.abs(city.lat)===90)assert.equal(zero.daylight,null);else close(zero.daylight,12);close(zero.noonAltitude,90-Math.abs(city.lat));
      const tilted=tiltOutcome(97.77,season,city.id);assert.ok(Number.isFinite(tilted.noonAltitude));assert.ok(tilted.daylight===null||tilted.daylight>=0&&tilted.daylight<=24);
    }
  }
  assert.ok(tiltOutcome(23.44,.25,'beijing').daylight>tiltOutcome(23.44,.75,'beijing').daylight);
  const uranus=realWorld('uranus');assert.equal(uranus.pressureHpa,null);assert.equal(uranus.temperatureC,null);
});
