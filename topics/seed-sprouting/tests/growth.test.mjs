import test from 'node:test';
import assert from 'node:assert/strict';
import {beanGeometry,primaryRootPoint} from '../growthGeometry.ts';
import {GrowthPlayback} from '../growthPlayback.ts';
import {allowedGrowth} from '../lifecycleModel.ts';
import {fruitGeometry} from '../../flower-fruit/model.ts';

function numbers(value){return typeof value==='number'?[value]:Array.isArray(value)?value.flatMap(numbers):value&&typeof value==='object'?Object.values(value).flatMap(numbers):[];}
function clock(){let id=0,time=0;const pending=new Map();return {request(callback){pending.set(++id,callback);return id;},cancel(key){pending.delete(key);},get count(){return pending.size;},step(ms=50){time+=ms;const callbacks=[...pending.values()];pending.clear();for(const cb of callbacks)cb(time);}};}
function makePlayback(options={}){const fake=clock(),updates=[];const playback=new GrowthPlayback({initial:0,clock:fake,reduced:()=>false,update:(value,playing)=>updates.push({value,playing}),...options});return {fake,updates,playback};}

test('bean organs share stable attachments through lift, opening and true-leaf unfolding',()=>{
  assert.deepEqual(primaryRootPoint(0),{x:380,y:350});
  for(let p=0;p<=3;p+=.01){const g=beanGeometry(p);assert.deepEqual(g.rootOrigin,primaryRootPoint(0));assert.equal(g.leafNode.x,g.cot.x);assert.ok(g.leafNode.y<=g.cot.y);assert.ok(g.root>=0&&g.root<=1);assert.ok(g.leafLeft>=g.leafRight);assert.ok(g.coats.every(c=>Number.isFinite(c.x)&&c.scale>0));}
  assert.equal(beanGeometry(.2).root,0);assert.equal(beanGeometry(1).leafLeft,0);assert.equal(beanGeometry(3).leafLeft,1);assert.equal(beanGeometry(3).leafRight,1);assert.equal(beanGeometry(3).cot.y,247);
});
test('both morphology projections have bounded, continuous intermediate geometry at every phase boundary',()=>{
  for(const model of [beanGeometry,fruitGeometry])for(const p of [0,.22,.3,.42,.49,.95,1,1.18,1.55,1.7,1.78,1.9,2,2.05,2.15,2.18,2.2,2.45,2.5,2.65,2.85,2.9,3]){
    const before=numbers(model(Math.max(0,p-1e-6))),after=numbers(model(Math.min(3,p+1e-6)));
    // phase is categorical text only; all positions, widths, scales and angles stay continuous.
    if(model===beanGeometry){before.pop();after.pop();}
    assert.equal(before.length,after.length);assert.ok(before.every(Number.isFinite));
    for(let i=0;i<before.length;i++)assert.ok(Math.abs(before[i]-after[i])<.01,`${model.name} jumps at ${p}, field ${i}`);
  }
  assert.deepEqual(beanGeometry(NaN),beanGeometry(0));assert.deepEqual(fruitGeometry(Infinity),fruitGeometry(0));
});
test('cherry stalk insertion and cutaway ovule identity stay fixed as ovary wall enlarges',()=>{
  for(let p=0;p<=3;p+=.01){const g=fruitGeometry(p);assert.ok(Math.abs(g.center.x+6*g.scale-g.attachment.x)<1e-10);assert.ok(Math.abs(g.center.y-67*g.scale-g.attachment.y)<1e-10);assert.deepEqual(g.sectionCenter,{x:601,y:323});assert.ok(g.petals.every(part=>part.opacity>=0&&part.opacity<=1));}
  const start=fruitGeometry(0),end=fruitGeometry(3);assert.ok(end.scale>start.scale);assert.equal(end.ripe,1);assert.equal(end.stone,1);assert.ok(end.petals.every(p=>p.opacity===0));
  for(const p of [.5,1,2,3]){const g=fruitGeometry(p,false);assert.equal(g.development,0);assert.equal(g.grow,0);assert.equal(g.ripe,0);assert.equal(g.stone,0);assert.equal(g.seedScale,1);}
});
test('continuous playback runs one finite clock, can pause fractionally and cannot complete a cancelled seek',()=>{
 const {fake,playback}=makePlayback();playback.play();for(let i=0;i<23;i++)fake.step();const observed=playback.read().progress;assert.ok(observed>0&&observed<1);assert.equal(fake.count,1);
 playback.pause();fake.step(50000);assert.equal(playback.read().progress,observed);assert.equal(fake.count,0);
 playback.seek(2);fake.step();fake.step(100);const intermediate=playback.read().progress;playback.pause();fake.step(50000);assert.equal(playback.read().progress,intermediate);assert.ok(intermediate<2);
 playback.seek(3);playback.seek(.4);assert.equal(fake.count,1);for(let i=0;i<25;i++)fake.step();assert.equal(playback.read().progress,.4);assert.equal(fake.count,0);
 playback.scrub(0);playback.play();for(let i=0;i<500;i++)fake.step();assert.equal(playback.read().progress,3);assert.equal(playback.read().playing,false);assert.equal(fake.count,0);
 playback.dispose();playback.play();fake.step();assert.equal(fake.count,0);
});
test('condition failure freezes the actual displayed extent, while reviews never manufacture later organs',()=>{
 let reached=0,okay=true;const {fake,playback}=makePlayback({allowed:p=>allowedGrowth(p,reached,okay),update:p=>{reached=Math.max(reached,p);}});
 playback.play();for(let i=0;i<38;i++)fake.step();okay=false;playback.pause();const stop=playback.read().progress;
 assert.ok(stop>0&&stop<1);playback.scrub(3);assert.equal(playback.read().progress,stop);
 playback.scrub(0);playback.seek(3);for(let i=0;i<30;i++)fake.step();assert.equal(playback.read().progress,stop);
 okay=true;fake.step();assert.equal(playback.read().progress,stop);playback.play();for(let i=0;i<5;i++)fake.step();assert.ok(playback.read().progress>stop);
});
test('reduced motion steps immediately without a frame loop; long gaps cannot skip development',()=>{
 const reduced=makePlayback({reduced:()=>true});reduced.playback.play();assert.equal(reduced.playback.read().progress,1);assert.equal(reduced.fake.count,0);reduced.playback.seek(2.3);assert.equal(reduced.playback.read().progress,2.3);
 const {fake,playback}=makePlayback();playback.play();fake.step();fake.step(60000);assert.ok(playback.read().progress<=.0125);playback.pause();
});
