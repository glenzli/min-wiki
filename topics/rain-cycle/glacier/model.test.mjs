import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { glacierState, iceTracers, materialFractions, columnVolumes, presets, MAX_YEARS, normalizeClimate } from './model.ts';
import { glacierPicture, budgetPicture, layerPicture } from './scene.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('every season and year accounts for snowfall as retained water plus actual loss',()=>{
 for(const climate of Object.values(presets))for(let i=0;i<=MAX_YEARS*20;i++){
  const s=glacierState(i/20,climate);near(s.input,s.total+s.loss);near(s.total,s.stores.snow+s.stores.firn+s.stores.ice);
  assert.ok(Object.values(s.stores).every(n=>n>=-1e-9&&Number.isFinite(n)));assert.ok(s.loss>=0&&s.input>=0);
  for(const annual of s.history)near(annual.net,annual.input-annual.loss);
 }
});
test('surviving snow becomes firn before ice and compaction does not delete water',()=>{
 assert.deepEqual(materialFractions(0),{snow:1,firn:0,ice:0});assert.deepEqual(materialFractions(1),{snow:0,firn:1,ice:0});assert.deepEqual(materialFractions(5),{snow:0,firn:0,ice:1});
 for(let i=0;i<=500;i++){const f=materialFractions(i/100);near(f.snow+f.firn+f.ice,1);}
 const before=glacierState(4.85,presets.growth),after=glacierState(5,presets.growth);near(before.total,after.total);near(before.loss,after.loss);assert.ok(after.stores.ice>before.stores.ice);
 const totalVolume=s=>Object.values(columnVolumes(s.stores)).reduce((a,b)=>a+b,0);assert.ok(totalVolume(after)<totalVolume(before));
});
test('warm summers remove the snow before multiyear ice forms',()=>{
 for(let y=1;y<=40;y++){const s=glacierState(y,presets['no-ice']);near(s.total,0);near(s.stores.ice,0);assert.equal(s.activeIce,false);}
 const winter=glacierState(.4,presets['no-ice']);assert.ok(winter.stores.snow>0);
});
test('positive accumulation yields old ice and a growing geometric extent',()=>{
 assert.equal(glacierState(1,presets.growth).stores.ice,0);assert.ok(glacierState(5,presets.growth).stores.ice>0);
 const a=glacierState(15,presets.growth),b=glacierState(20,presets.growth);assert.ok(b.total>a.total);assert.ok(b.extent>a.extent);assert.ok(b.history.every(y=>y.net>0));
});
test('the warming case shares its first twenty years, then retreats without upstream ice motion',()=>{
 assert.deepEqual(glacierState(20,presets.retreat).stores,glacierState(20,presets.growth).stores);
 const a=glacierState(25,presets.retreat),b=glacierState(26,presets.retreat);assert.ok(a.activeIce&&b.activeIce);assert.ok(b.total<a.total);assert.ok(b.extent<a.extent);assert.ok(b.iceTravel>a.iceTravel);assert.equal(b.retreating,true);
 assert.ok(b.current.net<0);const ta=iceTracers(25,presets.retreat),tb=iceTracers(26,presets.retreat);for(let i=0;i<ta.length;i++)assert.ok(tb[i].distance>=ta[i].distance);
});
test('annual transitions are continuous and scrubbing reconstructs exact state',()=>{
 for(const climate of Object.values(presets)){
  let previous=glacierState(0,climate);
  for(let i=1;i<=4000;i++){const s=glacierState(i/100,climate);assert.ok(Math.abs(s.total-previous.total)<.25);assert.ok(s.iceTravel>=previous.iceTravel-1e-12);previous=s;}
  const a=glacierState(24.7,climate);glacierState(10,climate);assert.deepEqual(a,glacierState(24.7,climate));
 }
});
test('renderers consume one source state without nonfinite geometry or random detail',()=>{
 for(const climate of Object.values(presets))for(const time of [0,.4,1,5,12,25,32,40]){const s=glacierState(time,climate);for(const svg of [glacierPicture(s,climate),budgetPicture(s),layerPicture(s)])assert.ok(!/NaN|Infinity/.test(svg));assert.equal(glacierPicture(s,climate),glacierPicture(s,climate));}
});
test('the mounted study has equivalent authored Chinese and English controls and limits',()=>{
 const data=JSON.parse(readFileSync(new URL('./content.json',import.meta.url),'utf8'));
 const keys=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v,p+k+'.'):[p+k]);assert.deepEqual(keys(data.zh),keys(data.en));assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(data.en)));
 assert.ok(data.en.boundary.includes('lag'));assert.ok(data.en.intro.includes('100'));
});
test('invalid external conditions and times remain bounded',()=>{
 assert.deepEqual(normalizeClimate({snowfall:NaN,warmth:Infinity,warmAfterTwenty:false}),presets.growth);
 assert.deepEqual(glacierState(-4,presets.growth),glacierState(0,presets.growth));assert.deepEqual(glacierState(90,presets.growth),glacierState(40,presets.growth));
});
