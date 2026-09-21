import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readRoute, waterHref, waterParcel, watershedState, destination, tracerFor, basinRiver, basinGrain, views, focuses } from '../watershedModel.ts';
import { drawWatershed } from '../watershedScene.ts';
import { evaporatedRadius } from '../../rain-formation/model.ts';
const settings={humidity:75,surface:'soil',route:'warm'};
test('one hundred water identities remain in exactly one store in every view and time',()=>{
 for(const surface of ['soil','clay','paved'])for(const humidity of [0,30,75,100])for(let k=0;k<=100;k++){
  const s=watershedState(k/100,{...settings,surface,humidity},.6);
  assert.equal(s.total,100);assert.equal(new Set(s.parcels.map(p=>p.id)).size,100);
  assert.equal(Object.values(s.pools).reduce((a,b)=>a+b,0),100);
  assert.ok(s.parcels.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 }
});
test('paths and branch junctions are continuous; scrubbing reconstructs the same history',()=>{
 for(const humidity of [0,75])for(const id of [0,1,2,11,22,45,78,99]){
  let old=waterParcel(0,id,{...settings,humidity},.7);
  for(let k=1;k<=2000;k++){const next=waterParcel(k/2000,id,{...settings,humidity},.7);assert.ok(Math.hypot(next.x-old.x,next.y-old.y)<7,`id ${id} at ${k/2000}`);old=next;}
  assert.deepEqual(waterParcel(.72,id,settings),waterParcel(.72,id,settings));
 }
});
test('water has multiple destinations and no compulsory closed ocean loop',()=>{
 const final=watershedState(1,settings);assert.ok(final.pools.soil>0);assert.ok(final.pools.ice>0);assert.ok(final.pools.surface>0);assert.ok(final.pools.lake>0);assert.ok(final.pools.river>0);
 assert.ok(final.pools.ocean<100);assert.notDeepEqual(final,watershedState(0,settings));
 assert.ok(watershedState(1,{...settings,surface:'paved'}).pools.soil<final.pools.soil);
});
test('the large-scale dry-air outcome agrees with the existing cloud evaporation model',()=>{
 for(const humidity of [0,30,75,100]){const result=watershedState(1,{...settings,humidity});if(evaporatedRadius(.7,humidity,30)===0){assert.equal(result.pools.vapor,92);assert.equal(result.pools.soil,0);}else assert.equal(result.pools.vapor,0);}
});
test('the separate ice clock moves the same stored water as ice before releasing meltwater',()=>{
 const id=tracerFor('ice',settings),stored=waterParcel(1,id,settings,0),moving=waterParcel(1,id,settings,.2),melted=waterParcel(1,id,settings,1);
 assert.equal(stored.id,moving.id);assert.equal(moving.id,melted.id);assert.equal(stored.pool,'ice');assert.equal(moving.pool,'ice');assert.equal(melted.pool,'river');assert.ok(moving.x>stored.x&&moving.y>stored.y);
 let previous=stored;for(let k=1;k<=2000;k++){const next=waterParcel(1,id,settings,k/2000);assert.ok(Math.hypot(next.x-previous.x,next.y-previous.y)<1);previous=next;}
 assert.deepEqual(stored,waterParcel(1,id,settings,0));assert.deepEqual(waterParcel(.3,id,settings,0),waterParcel(.3,id,settings,1));
});
test('integrated river and sediment share the same projected geography',()=>{
 assert.deepEqual(basinRiver(0),[240,324]);assert.ok(basinRiver(1)[0]>600);
 const g0=basinGrain(0,5),g1=basinGrain(1,5);assert.equal(g0.id,g1.id);assert.equal(g0.deposited,false);assert.equal(g1.deposited,true);
});
test('routes validate inputs and old entry links retain language and deployment bases',()=>{
 assert.deepEqual(readRoute('?view=bogus&humidity=NaN&p=Infinity&surface=bad').settings,settings);
 assert.equal(readRoute('?view=cloud&humidity=101&p=-1&route=ice').settings.humidity,100);
 for(const view of views){assert.equal(readRoute(`?view=${view}`).view,view);assert.ok(focuses[view].every(Number.isFinite));}
 const url=waterHref('ground','?lang=en&surface=clay','/wiki/');assert.equal(url,'/wiki/topics/rain-cycle/?lang=en&surface=clay&view=ground');
 for(const [topic,view] of [['rain-formation','cloud'],['ground-water','ground'],['river-paths','river']]){const main=readFileSync(new URL(`../../${topic}/main.ts`,import.meta.url),'utf8');assert.ok(main.includes(`waterHref('${view}'`));assert.ok(main.includes('location.hash'));}
});
test('SVG stays deterministic with persistent water and sediment, and labels can be removed',()=>{
 for(const p of [0,.31,.55,.8,1]){const frame=drawWatershed(p,settings,.4,22,false);assert.equal((frame.scene.match(/data-water=/g)||[]).length,100);assert.equal((frame.scene.match(/data-grain=/g)||[]).length,16);assert.ok(!/NaN|Infinity|<text/.test(frame.scene));assert.deepEqual(frame,drawWatershed(p,settings,.4,22,false));}
 assert.ok(drawWatershed(.5,settings,0,22,true).scene.includes('<text'));
});
test('authored watershed controls and mechanism copy have matching bilingual keys',()=>{
 const content=JSON.parse(readFileSync(new URL('../watershedContent.json',import.meta.url),'utf8'));
 const keys=(object,prefix='')=>Object.entries(object).flatMap(([key,value])=>typeof value==='object'?keys(value,`${prefix}${key}.`):[`${prefix}${key}`]);
 assert.deepEqual(keys(content.zh),keys(content.en));assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(content.en)));
 for(const view of views){assert.ok(content.zh.descriptions[view].length>35);assert.ok(content.en.descriptions[view].length>80);}
});
