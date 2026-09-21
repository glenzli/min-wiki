import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allowedGrowth,canGerminate,cycleEvidence,plantDestination,readPlantRoute } from '../lifecycleModel.ts';
import { pollinationFrame } from '../../flower-fruit/model.ts';
import { burrJourney,windFlight } from '../../seed-travel/model.ts';
test('germination needs all three represented conditions and preserves already observed growth',()=>{
  assert.equal(canGerminate('damp','yes','warm'),true);
  for(const c of [['dry','yes','warm'],['flood','yes','warm'],['damp','no','warm'],['damp','yes','cold']])assert.equal(canGerminate(...c),false);
  assert.equal(allowedGrowth(3,1.25,false),1.25);assert.equal(allowedGrowth(.5,1.25,false),.5);assert.equal(allowedGrowth(3,1.25,true),3);assert.equal(allowedGrowth(NaN,NaN,false),0);
});
test('incompatible pollen is deposited but the actual tube and reproductive outcome stop',()=>{
  for(const p of [0,.2,.42,.6,1,2,3]){const okay=pollinationFrame(p,true),blocked=pollinationFrame(p,false);assert.equal(blocked.pollenX,okay.pollenX);assert.equal(blocked.pollenY,okay.pollenY);assert.equal(blocked.deposited,okay.deposited);assert.ok(blocked.tube<=.22);assert.equal(blocked.fertilized,false);assert.equal(blocked.fruitDevelopment,0);}
  assert.equal(pollinationFrame(3,true).fertilized,true);assert.equal(pollinationFrame(3,true).fruitDevelopment,2);
});
test('the condition map consumes real case outcomes without making landing germination',()=>{
  const b={progress:3,water:'dry',air:'yes',temp:'warm'},f={progress:3,compatible:false},d={progress:1,kind:'fur',wind:1};const evidence=cycleEvidence(b,f,d);
  assert.equal(evidence.germination,'blocked');assert.equal(evidence.reproduction,'incompatible');assert.equal(evidence.dispersal,'landed');assert.equal(b.progress,3);assert.equal(burrJourney(1).attached,false);assert.equal(windFlight(1,1).landed,true);
});
test('legacy chapters retain valid parameters, language, fragment and subpath once',()=>{
  assert.equal(plantDestination('reproduction','?lang=en&chapter=dispersal&journey=1.2&pollen=incompatible&wind=2','#notes','/wiki/'),'/wiki/topics/seed-sprouting/?lang=en&chapter=reproduction&journey=1.2&pollen=incompatible#notes');
  assert.equal(plantDestination('dispersal','?kind=fur&wind=2&progress=.7'),'/topics/seed-sprouting/?chapter=dispersal&progress=0.7&kind=fur&wind=2');
  const r=readPlantRoute('?chapter=bogus&stage=Infinity&kind=missing&wind=NaN&journey=9');assert.equal(r.chapter,'germination');assert.equal(r.bean.progress,0);assert.equal(r.travel.kind,'wind');assert.equal(r.travel.wind,1);assert.equal(r.flower.progress,3);
});
test('topic study adapters own pause/dispose and no page-level background handlers or iframe',()=>{
  for(const path of ['../study.ts','../../flower-fruit/study.ts','../../seed-travel/study.ts']){const source=readFileSync(new URL(path,import.meta.url),'utf8');assert.ok(source.includes('export function mountStudy'));assert.ok(source.includes('return {read,pause()'));assert.ok(!source.includes("document.addEventListener('visibilitychange'"));assert.ok(!source.includes('mountTopicNavigation'));}
  const main=readFileSync(new URL('../main.ts',import.meta.url),'utf8');assert.ok(main.includes("replaceChildren(value.root)"));assert.ok(main.includes('studies.get(chapter)?.study.pause()'));assert.ok(!main.includes('iframe'));
});
test('integrated learning keeps three academic notes and four narration pieces in both languages',()=>{const learning=JSON.parse(readFileSync(new URL('../learning.json',import.meta.url),'utf8'));for(const lang of ['zh','en']){assert.equal(learning[lang].academic.length,3);assert.equal(learning[lang].narration.length,4);for(const note of learning[lang].academic)assert.ok(note.body.length>100);}assert.ok(learning.en.boundary.includes('incompatible'));assert.ok(learning.en.misconception.includes('species'));});
