import test from 'node:test';
import assert from 'node:assert/strict';
import { gaugePressure, samplePressure, specimenSection } from '../pressure.ts';

const rectangle=[[0,0],[100,0],[100,100],[0,100]];
test('wet-face pressure points normally inward, including top downward and bottom upward',()=>{
 const samples=samplePressure(rectangle,-20,1);
 const top=samples.filter(s=>s.point[1]===0),bottom=samples.filter(s=>s.point[1]===100);
 assert.ok(top.length&&bottom.length);
 for(const sample of top){assert.ok(Math.abs(sample.inward[0])<1e-12);assert.equal(sample.inward[1],1);}
 for(const sample of bottom){assert.ok(Math.abs(sample.inward[0])<1e-12);assert.equal(sample.inward[1],-1);}
 for(const sample of samples){
  const toCenter=[50-sample.point[0],50-sample.point[1]];
  assert.ok(sample.inward[0]*toCenter[0]+sample.inward[1]*toCenter[1]>0);
 }
});
test('equal-depth opposite side pressures cancel and deeper patches have larger pressure',()=>{
 const samples=samplePressure(rectangle,20,1);
 const left=samples.filter(s=>s.point[0]===0),right=samples.filter(s=>s.point[0]===100).reverse();
 assert.equal(left.length,right.length);
 left.forEach((sample,i)=>{assert.equal(sample.depth,right[i].depth);assert.equal(sample.relativePressure,right[i].relativePressure);assert.equal(sample.inward[0],-right[i].inward[0]);});
 assert.ok(left.every(s=>s.depth>0));
 assert.ok(Math.max(...left.map(s=>s.relativePressure))>Math.min(...left.map(s=>s.relativePressure)));
 assert.ok(samples.every(s=>s.point[1]>20));
});
test('full immersion deeper raises both pressures while keeping their difference unchanged',()=>{
 const shallowTop=gaugePressure(1000,.2),shallowBottom=gaugePressure(1000,.5);
 const deepTop=gaugePressure(1000,.8),deepBottom=gaugePressure(1000,1.1);
 assert.ok(deepTop>shallowTop&&deepBottom>shallowBottom);
 assert.ok(Math.abs((deepBottom-deepTop)-(shallowBottom-shallowTop))<1e-10);
 assert.ok(gaugePressure(1025,.5)>gaugePressure(1000,.5));
 assert.equal(gaugePressure(1000,-.1),0);
});
test('reversed polygon winding preserves inward pressure; flooding wets the hull interior',()=>{
 const original=samplePressure(rectangle,-20,1),reversed=samplePressure([...rectangle].reverse(),-20,1);
 for(const sample of reversed){assert.ok(original.some(s=>s.point.every((v,i)=>Math.abs(v-sample.point[i])<1e-10)&&s.inward.every((v,i)=>Math.abs(v-sample.inward[i])<1e-10)));}
 const state={experiment:'boat',object:'clay',boat:true,cargo:4,salt:false,depth:50};
 const g={width:260,height:94,bottom:440,water:200,cup:300};
 const dry=specimenSection(state,g,false),wet=specimenSection(state,g,true);
 assert.ok(wet.length>dry.length);
 assert.ok(samplePressure(wet,200,1).some(s=>s.inward[1]>.5&&s.point[1]>g.bottom-g.height));
});
