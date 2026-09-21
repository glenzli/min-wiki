import test from 'node:test';
import assert from 'node:assert/strict';
import {bodies,comparisonFrame,readExploration} from '../comparisonModel.ts';
test('comparison defaults and legacy zoom links remain distinct',()=>{
 assert.equal(readExploration('').chapter,'compare');
 assert.equal(readExploration('?origin=sun').chapter,'zoom');
 assert.equal(readExploration('?scale=.7').chapter,'zoom');
 assert.equal(readExploration('?mode=homes&scale=.7').chapter,'homes');
 assert.deepEqual(readExploration('?mode=bad&pair=99&home=-9'),{chapter:'compare',pair:3,home:0});
 assert.deepEqual(readExploration('?mode=compare&pair=1.4&home=2'),{chapter:'compare',pair:1.4,home:2});
});
test('every moving comparison frame retains body identity and a single diameter ratio',()=>{
 for(const width of [342,1100])for(let n=0;n<=300;n++){
  const frame=comparisonFrame(n/100,width);
  frame.forEach((b,i)=>{assert.equal(b.id,bodies[i].id);assert.ok(Number.isFinite(b.x)&&b.radius>0&&b.opacity>=0&&b.opacity<=1);assert.ok(Math.abs(b.radius/frame[0].radius-bodies[i].radius/bodies[0].radius)<1e-9);});
 }
 for(const q of [0,1,2,3]){const frame=comparisonFrame(q,342);assert.equal(frame[q].opacity,1);assert.equal(frame[q+1].opacity,1);assert.ok(frame[q].x-frame[q].radius>0);assert.ok(frame[q+1].x+frame[q+1].radius<342);}
 const a=comparisonFrame(1-1e-8,1000),b=comparisonFrame(1+1e-8,1000);a.forEach((v,i)=>assert.ok(Math.abs(v.radius-b[i].radius)/v.radius<1e-6));
});

test('Antares extends the sequence without changing legacy Arcturus stop',()=>{assert.equal(bodies[3].id,'arcturus');assert.equal(bodies[4].id,'antares');assert.equal(bodies[4].radius/bodies[2].radius,700);assert.equal(readExploration('?mode=compare&pair=2').pair,2);});
