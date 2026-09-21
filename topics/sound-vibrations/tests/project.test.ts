import test from 'node:test';
import assert from 'node:assert/strict';
import {soundConditions,comparisonSample,readSoundChapter,soundHref} from '../projectModel.ts';
import {hearingSequence} from '../../hearing/model.ts';
test('shared pitch and amplitude remain independently controlled across source and ear',()=>{
 const base=soundConditions(1,28),high=soundConditions(4,28),large=soundConditions(1,50);
 assert.equal(high.frequency,2*base.frequency);assert.equal(high.strength,base.strength);
 assert.equal(large.frequency,base.frequency);assert.ok(large.strength>base.strength);
 assert.equal(hearingSequence(.62,base.pitch,base.strength).place,hearingSequence(.62,large.pitch,large.strength).place);
 assert.ok(hearingSequence(.62,high.pitch,high.strength).place<hearingSequence(.62,base.pitch,base.strength).place);
 for(const n of [NaN,Infinity,-1,100])for(const value of Object.values(soundConditions(n,n)))assert.ok(Number.isFinite(value));
});
test('vacuum changes transmission without stopping the source; fixed frequency preserves zero crossings',()=>{
 for(let time=0;time<20;time+=.13){const air=comparisonSample(time,1,28),vacuum=comparisonSample(time,1,28,'vacuum');assert.equal(air.source,vacuum.source);assert.equal(vacuum.transmitted,0);assert.equal(air.source,air.transmitted);assert.ok(Math.abs(comparisonSample(time,1,50).source*28/50-air.source)<1e-12);}
});
test('legacy and chapter routes retain unknown parameters and fragments',()=>{
 assert.equal(readSoundChapter('?chapter=ear'),'ear');assert.equal(readSoundChapter('?chapter=bad'),'source');
 const url=new URL(soundHref('ear','?lang=en&keep=1&chapter=source','#detail-scene'),'https://example.test');assert.equal(url.searchParams.get('chapter'),'ear');assert.equal(url.searchParams.get('keep'),'1');assert.equal(url.hash,'#detail-scene');
});
