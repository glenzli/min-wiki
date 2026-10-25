import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  defaults, observations, conditionKeys, parseState, serializeState, surfaceDensity,
  waterFrame, waterPresets, skyFrame, relativeSunlight, skyCameraPosition, cameraStateFromPosition,
} from '../model.ts';

test('surface EOS reproduces independent published EOS-80 check values with temperature-scale conversion', () => {
  // UNESCO 1983 check values, IPTS-68 temperatures; our API takes ITS-90.
  assert.ok(Math.abs(surfaceDensity(0, 0) - 999.842594) < 1e-6);
  assert.ok(Math.abs(surfaceDensity(0, 35) - 1028.10633141) < 1e-6);
  assert.ok(Math.abs(surfaceDensity(30 / 1.00024, 35) - 1021.72863949) < 1e-6);
  for (const bad of [NaN, Infinity, -1, 41]) assert.throws(() => surfaceDensity(bad,35), RangeError);
  for (const bad of [NaN, Infinity, -1, 41]) assert.throws(() => surfaceDensity(15,bad), RangeError);
});

test('temperature and salt can reinforce or oppose each other; cold water need not be denser', () => {
  const frame = preset => waterFrame({...defaults,...waterPresets[preset],waterProgress:1});
  assert.equal(frame('warmFreshened').tendency,'rise');
  assert.equal(frame('coldSalty').tendency,'sink');
  assert.equal(frame('coldFreshened').tendency,'rise');
  assert.equal(frame('warmSalty').tendency,'sink');
  assert.equal(frame('matched').tendency,'neutral');
  assert.equal(frame('matched').delta,0);
  for (let t=5;t<25;t++) assert.ok(surfaceDensity(t,34)>surfaceDensity(t+1,34));
  for (let s=30;s<38;s+=.5) assert.ok(surfaceDensity(15,s)<surfaceDensity(15,s+.5));
});

test('A/B identities, tracer count and bounds survive forward, backward and renewed observation', () => {
  for (const preset of Object.values(waterPresets)) {
    const initial=waterFrame({...defaults,...preset,waterProgress:0});
    const ids=initial.parcels.flatMap(p=>p.tracers.map(q=>q.id));
    assert.equal(new Set(ids).size,32);
    let remembered;
    for (const progress of [0,.2,.63,1,.63,.2,0,.63]) {
      const f=waterFrame({...defaults,...preset,waterProgress:progress});
      assert.deepEqual(f.parcels.map(p=>p.id),['A','B']);
      assert.deepEqual(f.parcels.flatMap(p=>p.tracers.map(q=>q.id)),ids);
      assert.equal(f.densityB,initial.densityB);
      for (const p of f.parcels) for (const tracer of p.tracers) {
        assert.ok(tracer.x>=80 && tracer.x<=520);
        assert.ok(tracer.y>=72 && tracer.y<=300);
        assert.ok(Number.isFinite(tracer.x)&&Number.isFinite(tracer.y));
      }
      if(progress===.63) { if(remembered)assert.deepEqual(f,remembered); remembered=f; }
    }
    const end=waterFrame({...defaults,...preset,waterProgress:1});
    const [a,b]=end.parcels;
    if(end.tendency==='sink')assert.ok(a.y>b.y);
    else if(end.tendency==='rise')assert.ok(a.y<b.y);
    else { assert.equal(a.y,b.y); assert.equal(a.x,initial.parcels[0].x); }
  }
});

test('solar time follows a retained site, with geometric dawn/dusk independent of magnetic layers', () => {
  assert.equal(skyFrame(0).phase,'night');
  assert.equal(skyFrame(6).phase,'horizon');
  assert.equal(skyFrame(12).phase,'day');
  assert.equal(skyFrame(18).phase,'horizon');
  assert.equal(skyFrame(24).phase,'night');
  for(let h=0;h<=24;h+=.25) {
    const f=skyFrame(h);
    assert.equal(f.site,'EQ-A');
    assert.ok(Math.abs(Math.hypot(f.x,f.y)-1)<1e-12);
    assert.equal(f.sunAboveHorizon,-f.x);
    const raw={...serializeState(defaults),observation:'sky',skyHour:String(h)};
    const withLayers=parseState({...raw,skyField:'1',skyWind:'1',skyAurora:'1'});
    const withoutLayers=parseState({...raw,skyField:'0',skyWind:'0',skyAurora:'0'});
    assert.deepEqual(skyFrame(withLayers.skyHour),skyFrame(withoutLayers.skyHour));
  }
  assert.ok(skyFrame(.5).y<skyFrame(0).y); // Counterclockwise in a north-pole view.
  for(const h of [NaN,Infinity,-1,25])assert.throws(()=>skyFrame(h),RangeError);
});

test('inverse-square calculation changes incident energy only and agrees with the 5% example', () => {
  assert.equal(relativeSunlight(1),1);
  assert.ok(Math.abs(relativeSunlight(.95)-1.10803324099723)<1e-12);
  assert.ok(Math.abs(relativeSunlight(1.05)-.90702947845805)<1e-12);
  let previous=Infinity;
  for(let i=90;i<=110;i++) {
    const r=i/100, value=relativeSunlight(r);
    assert.ok(value<previous); previous=value;
    assert.ok(Math.abs(value*r*r-1)<1e-12);
  }
  for(const r of [NaN,Infinity,0,.89,1.11])assert.throws(()=>relativeSunlight(r),RangeError);
});

test('strict initial state rejects partial numbers, non-finite values, out-of-range and unsupported steps', () => {
  for (const value of ['1oops',' 1','1 ','1e0','Infinity','NaN','','+1','01','0x1','0.999','1.11']) {
    assert.equal(parseState({orbitDistance:value}).orbitDistance,1,value);
  }
  assert.equal(parseState({waterTemp:'26'}).waterTemp,defaults.waterTemp);
  assert.equal(parseState({waterTemp:'5.5'}).waterTemp,defaults.waterTemp);
  assert.equal(parseState({waterSalt:'31.1'}).waterSalt,defaults.waterSalt);
  assert.equal(parseState({waterProgress:'0.333'}).waterProgress,defaults.waterProgress);
  assert.equal(parseState({skyHour:'12.25'}).skyHour,defaults.skyHour);
  assert.deepEqual(parseState({observation:'__proto__',condition:'toString',skyWind:'false',skyField:'yes',skyAurora:'2'}),defaults);
});

test('full canonical state round trips without leaking unrelated chapter or query keys', () => {
  for(const observation of observations)for(const condition of conditionKeys) {
    const state={...defaults,observation,condition,waterTemp:7,waterSalt:37.5,waterProgress:.63,skyHour:18.5,skyWind:false,skyField:false,skyAurora:false,orbitDistance:.95};
    const raw=serializeState(state);
    assert.deepEqual(parseState({...raw,chapter:'systems',bogus:'1'}),state);
    assert.equal(Object.keys(raw).length,13);
    assert.equal(raw.skyField,'0');
    assert.ok(!('chapter' in raw));
    const returned=parseState({...raw,observation:'water'});
    assert.deepEqual({...returned,observation},state);
  }
  const raw={observation:'water',waterTemp:'6'};
  parseState(raw);
  assert.deepEqual(raw,{observation:'water',waterTemp:'6'});
});

test('camera orbit restores independently of Earth rotation and shares the day/night Sun direction', () => {
  for(const skyAzimuth of [0,80.3,180,322,359.9])for(const skyElevation of [-80,-13.6,0,18,80]) {
    const camera={skyAzimuth,skyElevation,skyDistance:4.25};
    const xyz=skyCameraPosition(camera);
    assert.deepEqual(cameraStateFromPosition(...xyz),camera);
    assert.deepEqual(parseState({...serializeState(defaults),...Object.fromEntries(Object.entries(camera).map(([k,v])=>[k,String(v)]))}),{...defaults,...camera});
  }
  for(let hour=0;hour<=24;hour+=.5) {
    const f=skyFrame(hour),angle=f.rotationRadians;
    // Three's +Y rotation takes local +X to (cos(angle),0,-sin(angle)).
    assert.ok(Math.abs(Math.cos(angle)-f.x)<1e-12);
    assert.ok(Math.abs(-Math.sin(angle)-f.y)<1e-12);
    assert.equal(-Math.cos(angle)>1e-8,f.phase==='day');
  }
  assert.throws(()=>cameraStateFromPosition(0,0,0),RangeError);
  assert.throws(()=>cameraStateFromPosition(NaN,0,1),RangeError);
});

test('authored Chinese and English cover the same scientific content structure', () => {
  const content=JSON.parse(readFileSync(new URL('../content.json',import.meta.url),'utf8'));
  function shape(value) {
    if(Array.isArray(value))return value.map(shape);
    if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,shape(v)]));
    assert.equal(typeof value,'string'); assert.ok(value.trim()); return 'text';
  }
  assert.deepEqual(shape(content.zh),shape(content.en));
  function english(value) {
    if(typeof value==='string')assert.ok(!/[\u3400-\u9fff]/.test(value),value);
    else Object.values(value).forEach(english);
  }
  english(content.en);
  for(const key of conditionKeys) {
    assert.equal(content.zh.conditions[key].chain.length,3);
    for(const field of ['ask','robust','unknown','evidence','connection'])assert.ok(content.en.conditions[key][field].length>20);
  }
});
