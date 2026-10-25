import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {healthCases,careMethods,sampleHumanVirus,sampleInfection,sampleImmunity,sampleCare,sampleAssembly} from '../healthModel.ts';
import {readWorkspace,writeWorkspace,seekWorkspace,currentProgress,currentLimit,healthKey,canPlayWorkspace,WorkspaceClock} from '../workspaceModel.ts';
import {rendererKey} from '../healthRenderer.ts';
import {observationFor} from '../healthReading.ts';
const health=JSON.parse(readFileSync(new URL('../healthContent.json',import.meta.url),'utf8'));
const legacy=JSON.parse(readFileSync(new URL('../workspaceContent.json',import.meta.url),'utf8'));
test('human viruses are the default while specific legacy host/position links preserve the phage case',()=>{
 assert.equal(readWorkspace('?chapter=viruses').virus,'influenza');
 for(const query of ['host=defended&p=3&view=inside','p=1.6','host=mismatch','view=inside']){const s=readWorkspace('?chapter=viruses&'+query);assert.equal(s.virus,'phage');assert.equal(s.virusProcess,'cycle');assert.ok(currentProgress(s)<=currentLimit(s));}
 const s=readWorkspace('?chapter=viruses&virus=norovirus&virus-process=cycle&hp=.54');assert.equal(readWorkspace(writeWorkspace(s)).virus,'norovirus');assert.equal(currentProgress(readWorkspace(writeWorkspace(s))),.54);
});
test('new route conditions are bounded and reject invalid science-case identifiers',()=>{
 const s=readWorkspace('?chapter=immunity&case=unknown&entry=unknown&memory=0&care=bad&form=bad&hp=Infinity');assert.equal(s.healthCase,'airway');assert.equal(s.entry,'entered');assert.equal(s.care,'wash');assert.equal(s.form,'rod');assert.equal(currentProgress(s),0);
 for(const chapter of ['infection','immunity','care']){const s=readWorkspace(`?chapter=${chapter}&hp=99&memory=1&resistant=1`);assert.equal(currentProgress(s),1);assert.deepEqual(readWorkspace(writeWorkspace(s)),s);}
});
test('entry is required before copying and assembly; no offspring are released before assembly',()=>{
 for(const kind of ['influenza','norovirus'])for(let i=0;i<=100;i++){const q=sampleHumanVirus(kind,i/100);if(q.copied>0)assert.equal(q.entered,1);if(q.released>0)assert.equal(q.assembled,1);const no=sampleHumanVirus(kind,i/100,'blocked');assert.equal(no.entered+no.copied+no.assembled+no.released,0);}
 assert.equal(sampleHumanVirus('influenza',.6).copySite,'nucleus');assert.equal(sampleHumanVirus('norovirus',.6).copySite,'cytoplasm');
});
test('exposure is not forced into disease and blocked cases never multiply or inflame',()=>{
 for(const site of healthCases)for(const p of [0,.3,.5,.8,1]){const q=sampleInfection(site,p,'blocked');assert.equal(q.entry+q.multiplication+q.injury+q.inflammation,0);}
 assert.equal(sampleInfection('wound',1,'entered').viral,false);assert.equal(sampleInfection('gut',1,'entered').viral,true);
});
test('antibody marking and infected-cell clearance are different effectors; memory shifts response without changing identity',()=>{
 for(const p of [0,.3,.6,.9,1]){const b=sampleImmunity('wound',p,false,'entered');assert.equal(b.tCell,0);assert.equal(b.markedBacteria,b.antibodies);const v=sampleImmunity('airway',p,false,'entered');assert.equal(v.markedBacteria,0);const blocked=sampleImmunity('airway',p,true,'blocked');assert.equal(blocked.innate+blocked.antibodies+blocked.tCell,0);assert.ok(sampleImmunity('airway',p,true,'entered').antibodies>=v.antibodies);}
});
test('removal, inactivation, target inhibition, symptom relief and immune training are distinct',()=>{
 const wash=sampleCare('wash','gut',1);assert.equal(wash.removal,1);assert.equal(wash.inactivation,0);assert.equal(wash.killsExisting,false);
 const noro=sampleCare('alcohol','gut',1),flu=sampleCare('alcohol','airway',1);assert.equal(noro.targetMatches,false);assert.equal(noro.inactivation,0);assert.equal(flu.inactivation,1);assert.equal(flu.removal,0);
 for(const site of healthCases){const symptoms=sampleCare('symptoms',site,1);assert.equal(symptoms.symptomRelief,1);assert.equal(symptoms.removal+symptoms.inactivation+symptoms.releaseBlocked+symptoms.wallSynthesisBlocked,0);}
 assert.equal(sampleCare('vaccine','airway',1).memoryTrained,1);assert.equal(sampleCare('vaccine','airway',1).killsExisting,false);assert.equal(sampleCare('vaccine','gut',1).targetMatches,false);
});
test('antibiotics cannot target viruses, resistance blocks the chosen antibacterial target and antivirals remain specific',()=>{
 for(const site of ['airway','gut'])assert.equal(sampleCare('antibiotic',site,1).wallSynthesisBlocked,0);
 assert.equal(sampleCare('antibiotic','wound',1).wallSynthesisBlocked,1);assert.equal(sampleCare('antibiotic','wound',1,true).wallSynthesisBlocked,0);
 assert.equal(sampleCare('antiviral','airway',1).releaseBlocked,1);assert.equal(sampleCare('antiviral','gut',1).releaseBlocked,0);assert.equal(sampleCare('antiviral','wound',1).releaseBlocked,0);
});
test('each health contrast has separately remembered progress and view changes leave it intact',()=>{
 const s=readWorkspace('?chapter=care&case=wound&care=antibiotic&hp=.6');const original=healthKey(s);s.resistant=true;assert.equal(currentProgress(s),0);seekWorkspace(s,.3);s.resistant=false;assert.equal(currentProgress(s),.6);s.cutaway=false;s.flat=true;assert.equal(healthKey(s),original);assert.equal(currentProgress(s),.6);
 s.chapter='immunity';s.memory=true;seekWorkspace(s,.42);s.memory=false;assert.equal(currentProgress(s),0);s.chapter='care';assert.equal(currentProgress(s),.6);
});
test('all new finite processes require readiness/user start, terminate and stay stopped while hidden',()=>{
 for(const chapter of ['infection','immunity','care']){const s=readWorkspace(`?chapter=${chapter}`),clock=new WorkspaceClock();clock.start(s);assert.equal(clock.playing,false);clock.ready=true;clock.start(s);for(let i=0;i<3000;i++)clock.tick(s,.03);assert.equal(currentProgress(s),1);assert.equal(clock.playing,false);clock.start(s);clock.tick(s,.03);clock.hide();const p=currentProgress(s);for(let i=0;i<100;i++)clock.tick(s,.1);assert.equal(currentProgress(s),p);}
});
test('render admission distinguishes structural and process responsibilities without creating another clock',()=>{
 const s=readWorkspace('?chapter=viruses&virus=influenza');assert.equal(rendererKey(s),'structure:3d');s.flat=true;assert.equal(rendererKey(s),'structure:2d');s.virusProcess='cycle';assert.equal(rendererKey(s),'virus-cycle');s.virus='phage';assert.equal(rendererKey(s),'phage-cycle');s.virusProcess='structure';assert.equal(rendererKey(s),'phage-structure');s.chapter='bacteria';s.process='exchange';assert.equal(rendererKey(s),'bacteria-process');
});
test('bilingual content covers the same six questions and conditions; important limits survive translation',()=>{
 const keys=(v,p='')=>Object.entries(v).flatMap(([k,x])=>x&&typeof x==='object'?keys(x,p+k+'.'):[p+k]);assert.deepEqual(keys(health.zh),keys(health.en));assert.equal(Object.keys(health.en.chapters).length,6);assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(health.en)));
 for(const lang of ['zh','en'])for(const chapter of ['environment','bacteria','viruses','infection','immunity','care']){const s=readWorkspace('?chapter='+chapter);const copy=observationFor(s,health[lang],legacy[lang]);assert.ok(copy.child&&copy.title&&copy.scope);assert.ok(copy.sourceKeys.every(k=>health[lang].sources[k]?.url.startsWith('https://')));}
});
test('all case/method samples remain finite under scrub reversal and invalid progress',()=>{
 for(const site of healthCases)for(const method of careMethods)for(const p of [NaN,-8,0,.2,.9,1,Infinity]){const q=sampleCare(method,site,p);assert.ok(Object.values(q).filter(x=>typeof x==='number').every(Number.isFinite));assert.deepEqual(sampleCare(method,site,p),q);}
});

test('influenza offspring do not acquire an envelope before surface budding, while norovirus remains non-enveloped',()=>{for(const p of [0,.1,.3,.42])assert.equal(sampleAssembly('influenza',p).envelope,0);assert.equal(sampleAssembly('influenza',1).envelope,1);for(const p of [0,.5,1]){assert.equal(sampleAssembly('norovirus',p).envelope,0);assert.equal(sampleAssembly('norovirus',p).nonEnvelopedCapsid,1);}});

test('playback admission agrees with structural versus finite-process views',()=>{for(const chapter of ['environment','bacteria','viruses']){const s=readWorkspace('?chapter='+chapter),clock=new WorkspaceClock();clock.ready=true;assert.equal(canPlayWorkspace(s),false);clock.start(s);assert.equal(clock.playing,false);}const s=readWorkspace('?chapter=bacteria&process=exchange');assert.equal(canPlayWorkspace(s),true);});

test('irrelevant hidden conditions do not choose a different process history',()=>{const s=readWorkspace('?chapter=care&care=wash&hp=.65');s.resistant=true;assert.equal(currentProgress(s),.65);s.chapter='immunity';s.entry='blocked';seekWorkspace(s,.42);s.memory=true;assert.equal(currentProgress(s),.42);});
