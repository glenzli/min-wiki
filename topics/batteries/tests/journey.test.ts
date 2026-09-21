import test from 'node:test';
import assert from 'node:assert/strict';
import { BatteryExperiment, initialLab, transfer, admitted, packValues, readChapter, type Conditions } from '../journeyModel.ts';
import content from '../journeyContent.json';
const discharge:Conditions={mode:'discharge',closed:true,load:'motor',charger:'none',rechargeable:true};
test('load changes retain energy and earlier destinations rather than recalculate history',()=>{
 const e=new BatteryExperiment();e.configure({closed:true});e.replay(.3);const before={...e.state};e.configure({load:'led'});assert.deepEqual(e.state,before);e.replay(.2);assert.equal(e.state.work,before.work);assert.ok(e.state.light>0);assert.ok(Math.abs(e.state.energy-.56)<1e-12);
});
test('charging requires compatibility and external input, never reverses previous motor work',()=>{
 const used=transfer(initialLab(),discharge,.7),charging={...discharge,mode:'charge' as const,closed:false,charger:'matched' as const};
 for(const condition of [{...charging,charger:'none' as const},{...charging,charger:'wrong' as const},{...charging,rechargeable:false}]){assert.equal(admitted(used,condition),false);assert.deepEqual(transfer(used,condition,1),used);}
 const full=transfer(used,charging,1);assert.equal(full.energy,1);assert.equal(full.work,used.work);assert.equal(full.rotation,used.rotation);assert.ok(full.input>.7);assert.ok(full.heat>used.heat);assert.ok(full.travel<used.travel);assert.equal(admitted(full,charging),false);
});
test('all loads and repeated charge cycles close the normalized energy ledger',()=>{
 let s=initialLab();for(let n=0;n<80;n++){const c={...discharge,load:(['motor','bulb','led'] as const)[n%3]!};s=transfer(s,c,.23);s=transfer(s,{...c,mode:'charge',charger:'matched'},.13);assert.ok(Math.abs(1+s.input-s.energy-s.light-s.work-s.heat)<1e-10);assert.ok(s.energy>=0&&s.energy<=1);}
});
test('scrubbing is deterministic, reversible and bounded; open switch cannot spend energy',()=>{
 const e=new BatteryExperiment();e.replay(.5);assert.equal(e.state.energy,1);e.configure({closed:true});e.replay(.6);const middle={...e.state};e.replay(1);e.replay(.1);e.replay(.6);assert.deepEqual(e.state,middle);e.configure({closed:false});e.replay(1);assert.deepEqual(e.state,middle);for(const p of [NaN,Infinity,-1,7]){e.replay(p);assert.ok(Number.isFinite(e.state.energy));}
});
test('ideal series/parallel projection distinguishes voltage capacity and energy',()=>{
 assert.deepEqual(packValues(4,3),{series:4,parallel:3,cells:12,voltage:14.4,ampHours:6,wattHours:86.4});
 for(const a of [NaN,Infinity,-2,1,2,4,8])for(const b of [NaN,1,3,9]){const p=packValues(a,b);assert.ok(p.cells<=16&&p.cells>=1);assert.ok(Math.abs(p.voltage*p.ampHours-p.wattHours)<1e-12);}
});
test('family classification and route boundaries match the published content',()=>{
 assert.equal(content.families.length,6);const aa=content.families.filter(f=>f.shape==='aa');assert.equal(aa.length,2);assert.notEqual(aa[0]!.rechargeable,aa[1]!.rechargeable);
 for(const item of [...content.chapters,...content.families])for(const value of Object.values(item))if(value&&typeof value==='object'){assert.ok(value.zh.length>0);assert.ok(value.en.length>0);}
 assert.equal(readChapter('?chapter=charge'),'charge');assert.equal(readChapter('?chapter=bad'),'loads');assert.equal(readChapter(''),'loads');
});
