import test from 'node:test';
import assert from 'node:assert/strict';
import {hasPart,processFor,processState,respirationState,respirationFrame,focusBox,wholeBox,mixBox,curvePoint,hitPart,cellOffset,type Cell,type Part} from '../model.ts';
test('shared structures and genuinely absent structures stay distinct',()=>{
 for(const cell of ['animal','plant','bacterium'] as Cell[]){assert.ok(hasPart(cell,'dna'));assert.ok(hasPart(cell,'membrane'));}
 for(const part of ['nucleus','mitochondrion','chloroplast','vacuole'] as Part[])assert.equal(hasPart('bacterium',part),false);
 assert.equal(hasPart('animal','chloroplast'),false);assert.equal(hasPart('animal','vacuole'),false);assert.ok(hasPart('plant','mitochondrion'));
});
test('plants can be examined in both processes; neither is imposed on all bacteria',()=>{
 assert.equal(processFor('animal','photosynthesis'),'respiration');
 assert.equal(processFor('plant','photosynthesis'),'photosynthesis');assert.equal(processFor('plant','respiration'),'respiration');
 assert.equal(processFor('bacterium','photosynthesis'),null);assert.equal(processFor('bacterium','respiration'),null);
});
test('an absent organelle returns the inspection to the same whole specimen',()=>{
 assert.deepEqual(focusBox('bacterium','nucleus'),wholeBox('bacterium'));assert.deepEqual(focusBox('animal','chloroplast'),wholeBox('animal'));
 assert.ok(focusBox('plant','chloroplast').width<wholeBox('plant').width);
});
test('camera interpolation is continuous and keeps the viewport aspect',()=>{
 const start=focusBox('animal','membrane'),end=focusBox('plant','mitochondrion');
 assert.deepEqual(mixBox(start,end,0),start);assert.deepEqual(mixBox(start,end,1),end);
 for(let i=0;i<=100;i++){const b=mixBox(start,end,i/100);assert.ok(Math.abs(b.width/b.height-720/490)<1e-10);}
 const before=mixBox(start,end,.49),after=mixBox(start,end,.5);assert.ok(Math.abs(after.x-before.x)<20);
});
test('input reaches the cell before products travel; replay has finite bounds',()=>{
 assert.equal(processState(.4).outgoing,0);assert.equal(processState(.4).conversion,0);
 assert.equal(processState(.7).incoming,1);assert.ok(Math.abs(processState(.7).conversion-1)<1e-12);assert.equal(processState(1).outgoing,1);
 for(const p of [-1,0,.5,1,3,Infinity,NaN])for(const v of Object.values(processState(p)))if(typeof v==='number')assert.ok(Number.isFinite(v)&&v>=0&&v<=1);
});
test('material trajectories are continuous with unchanged endpoints',()=>{
 const a={x:20,y:90},c={x:300,y:130},b={x:470,y:320};assert.deepEqual(curvePoint(a,c,b,0),a);assert.deepEqual(curvePoint(a,c,b,1),b);
 const near=curvePoint(a,c,b,.50001),mid=curvePoint(a,c,b,.5);assert.ok(Math.hypot(near.x-mid.x,near.y-mid.y)<.01);
});
test('diagram hit testing respects organelles and specimen offsets',()=>{
 assert.equal(hitPart('animal',{x:345,y:248}),'dna');assert.equal(hitPart('animal',{x:478,y:331}),'mitochondrion');
 assert.equal(hitPart('plant',{x:cellOffset.plant+484,y:110}),'chloroplast');assert.equal(hitPart('plant',{x:cellOffset.plant+400,y:250}),'vacuole');
 assert.equal(hitPart('bacterium',{x:cellOffset.bacterium+361,y:245}),'dna');
});
test('respiration consumes both inputs only after arrival in the same mitochondrial region',()=>{
 for(const cell of ['animal','plant'] as const){
  for(let i=0;i<=100;i++){
   const {state:s,layout:g,nutrient,oxygen}=respirationFrame(cell,i/100);
   if(s.conversion>0){
    assert.equal(s.transfer,1);assert.equal(s.oxygen,1);
    for(const p of [nutrient,oxygen])assert.ok(Math.hypot(p.x-g.reaction.x,p.y-g.reaction.y)<20);
   }
   if(s.transfer>0)assert.equal(s.breakdown,1);
  }
 }
});
test('sugar fragments keep a continuous path when breakdown becomes transport',()=>{
 for(const cell of ['animal','plant'] as const){
  for(const boundary of [.22,.32,.5,.52,.7,.86]){
   const a=respirationFrame(cell,boundary-1e-7),b=respirationFrame(cell,boundary+1e-7);
   for(const key of ['nutrient','oxygen','energy'] as const)assert.ok(Math.hypot(a[key].x-b[key].x,a[key].y-b[key].y)<.001);
  }
  const f=respirationFrame(cell,.32);assert.deepEqual(f.nutrient,f.layout.breakdown);
 }
});
test('ATP formation precedes delivery and cell work; replay restores the start',()=>{
 for(let i=0;i<=100;i++){
  const s=respirationState(i/100);
  if(s.supply>0)assert.equal(s.conversion,1);
  if(s.work>0)assert.equal(s.supply,1);
  if(s.outgoing>0)assert.equal(s.conversion,1);
 }
 for(const cell of ['animal','plant'] as const){
  const end=respirationFrame(cell,1);assert.deepEqual(end.energy,end.layout.work);assert.equal(end.state.work,1);
  const start=respirationFrame(cell,0);assert.equal(start.state.conversion,0);assert.equal(start.state.work,0);assert.deepEqual(start.nutrient,start.layout.start);
 }
 for(const p of [-1,0,.5,1,3,Infinity,NaN])for(const v of Object.values(respirationState(p)))if(typeof v==='number')assert.ok(Number.isFinite(v)&&v>=0&&v<=1);
});
