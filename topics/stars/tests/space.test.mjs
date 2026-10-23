import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TRACKS,evolutionState,REMNANT_START,PHASE_PROGRESS} from '../evolutionModel.ts';
import {readState} from '../model.ts';
import {NEBULAE,ILLUMINATIONS,shellPathLength} from '../nebulaModel.ts';
import {SPACE_PARTICLES,stellarSpaceFrame,stellarObservationZoom,writeSpaceParticles} from '../spaceModel.ts';
import {nebulaStudy} from '../nebulaStudy.ts';
import {evolutionStudy} from '../study.ts';
const base={chapter:'evolution',track:'solar',progress:0,nebula:'nursery',illumination:'emission'};
const particles=frame=>{const position=new Float32Array(SPACE_PARTICLES*3),alpha=new Float32Array(SPACE_PARTICLES);writeSpaceParticles(frame,position,alpha);return {position,alpha};};
const progressAtPhase=phase=>phase<=5?phase/6:PHASE_PROGRESS[5]+(phase-5)*(REMNANT_START-PHASE_PROGRESS[5]);

test('new routes validate nebula, illumination, geometry and all mass branches while preserving old entries',()=>{
 const s=readState('?chapter=nebulae&nebula=supernova&light=dark&cutaway=1&track=low-mass&view=comparison&type=100');
 assert.equal(s.chapter,'nebulae');assert.equal(s.nebulaKind,'supernova');assert.equal(s.illumination,'dark');assert.equal(s.cutaway,true);assert.equal(s.spaceView,false);assert.equal(s.evolutionTrack,'low-mass');assert.equal(s.type,4);
 for(const chapter of ['sun','types','anatomy','orbits','three-body','evolution'])assert.equal(readState('?chapter='+chapter).chapter,chapter);
 const fallback=readState('?chapter=wrong&nebula=wrong&light=wrong&cutaway=yes&track=wrong');assert.equal(fallback.chapter,'evolution');assert.equal(fallback.nebulaKind,'nursery');assert.equal(fallback.illumination,'emission');assert.equal(fallback.cutaway,false);assert.equal(fallback.evolutionTrack,'solar');
});

test('red dwarf future lies beyond the current Universe without a giant or an explosion shell',()=>{
 assert.ok(TRACKS['low-mass'].anchors[3].ageYears>13.8e9);
 for(const progress of [2/6,.6,4/6,5/6,1]){
  const f=stellarSpaceFrame({...base,track:'low-mass',progress});
  assert.equal(f.shellOpacity,0);assert.equal(f.blackHole,false);assert.ok(f.starRadius<1);
  assert.equal(evolutionState('low-mass',progress).mercuryEngulfed,false);
 }
 const study=evolutionStudy('low-mass',4);assert.match(study.evidence.en,/theoretical/);assert.match(study.limits.en,/Universe is too young/);
});

test('formation preserves a centered, flattened disk and deterministic parcel identities through replay',()=>{
 const cloud=particles(stellarSpaceFrame(base)),disk=particles(stellarSpaceFrame({...base,progress:1.2/6}));
 const extent=(position,axis)=>Math.max(...Array.from({length:SPACE_PARTICLES},(_,i)=>Math.abs(position[i*3+axis])));
 assert.ok(extent(cloud.position,1)>1.5);assert.ok(extent(disk.position,1)<.25);assert.ok(extent(disk.position,0)>2);
 for(const track of Object.keys(TRACKS))for(const progress of [.04,.2,.48,.75,.91,1]){
  const f=stellarSpaceFrame({...base,track,progress}),first=particles(f),position=first.position,alpha=first.alpha;
  writeSpaceParticles(stellarSpaceFrame({...base,track,progress:1}),position,alpha);writeSpaceParticles(f,position,alpha);
  assert.deepEqual({position,alpha},particles(f));
  assert.ok(position.every(Number.isFinite));assert.ok(alpha.every(a=>a>=0&&a<=1));
 }
});

test('formation, envelope loss and remnant handoffs are continuous rather than replacing unrelated meshes',()=>{
 for(const track of Object.keys(TRACKS))for(const phase of [1.3,2,4.65,5.5]){
  const before=stellarSpaceFrame({...base,track,progress:progressAtPhase(phase-1e-4)}),after=stellarSpaceFrame({...base,track,progress:progressAtPhase(phase+1e-4)});
  assert.ok(Math.abs(before.starRadius-after.starRadius)<.001);
  const a=particles(before),b=particles(after);
  assert.ok(a.position.every((v,i)=>Math.abs(v-b.position[i])<.002),`${track} at ${phase}`);
 }
});
test('remnant cooling keeps the same body and dispersed parcel identities while radiance and shell visibility fall',()=>{
 for(const track of Object.keys(TRACKS)){
  const start=stellarSpaceFrame({...base,track,progress:REMNANT_START}),middle=stellarSpaceFrame({...base,track,progress:.95}),end=stellarSpaceFrame({...base,track,progress:1});
  for(const frame of [start,middle,end]){
   const model=evolutionState(track,frame===start?REMNANT_START:frame===middle?.95:1);
   assert.equal(frame.starRadius,start.starRadius);assert.equal(frame.starOpacity,1);assert.equal(frame.surfaceProfile,model.surfaceProfile);assert.equal(frame.emission,model.emission);assert.equal(frame.glare,model.glare);assert.equal(frame.coolingProgress,model.coolingProgress);
   assert.equal(frame.compactBlend,1);assert.equal(frame.blackHole,track==='very-massive');
  }
  if(track!=='low-mass'){
   assert.ok(start.shellOpacity>middle.shellOpacity&&middle.shellOpacity>end.shellOpacity&&end.shellOpacity>0);
   assert.ok(middle.shellOpacity<.1,'the foreground shell clears before the camera approaches');
   assert.equal(start.shellBlend,end.shellBlend);assert.ok(end.shellRadius>middle.shellRadius&&middle.shellRadius>start.shellRadius);
   const a=particles(start),b=particles(end);
   for(let i=0;i<SPACE_PARTICLES;i++){
    const oldRadius=Math.hypot(...a.position.slice(i*3,i*3+3)),newRadius=Math.hypot(...b.position.slice(i*3,i*3+3));
    assert.ok(newRadius>oldRadius);assert.ok(b.alpha[i]<a.alpha[i]);
   }
  }
  if(track!=='very-massive'){
   const main={...base,track,progress:2/6},last={...base,track,progress:1};
   assert.ok(stellarObservationZoom(last,1.5)>stellarObservationZoom({...base,track,progress:REMNANT_START},1.5));
   assert.ok(end.starRadius*stellarObservationZoom(last,1.5)<stellarSpaceFrame(main).starRadius*stellarObservationZoom(main,1.5));
  }else assert.equal(end.coolingProgress,0);
 }
 for(const progress of [REMNANT_START-1e-4,REMNANT_START,.95,1]){
  const before=stellarSpaceFrame({...base,progress:progress-2e-5}),after=stellarSpaceFrame({...base,progress:progress+2e-5});
  assert.ok(Math.abs(stellarObservationZoom({...base,progress:progress-2e-5},1.5)-stellarObservationZoom({...base,progress:progress+2e-5},1.5))<.01);
  for(const key of ['starRadius','emission','glare','compactBlend','shellOpacity','shellRadius'])assert.ok(Math.abs(before[key]-after[key])<.01,`${key} at ${progress}`);
 }
});

test('illumination changes the visibility mechanism while preserving the same cloud geometry',()=>{
 const frames=ILLUMINATIONS.map(illumination=>stellarSpaceFrame({...base,chapter:'nebulae',illumination}));
 for(const frame of frames)assert.deepEqual(particles(frame).position,particles(frames[0]).position);
 assert.equal(frames[2].starOpacity,0);assert.ok(frames[0].starOpacity>0);
 for(const kind of NEBULAE){const f=stellarSpaceFrame({...base,chapter:'nebulae',nebula:kind});assert.equal(f.shellOpacity,kind==='nursery'?0:1);assert.ok(particles(f).position.every(Number.isFinite));}
});

test('a hollow optically thin shell can appear brighter at its rim without being a flat ring',()=>{
 const center=shellPathLength(0),rim=shellPathLength(.8);
 assert.ok(rim>center*2.9);assert.equal(shellPathLength(1),0);assert.equal(shellPathLength(-.8),rim);assert.equal(shellPathLength(NaN),0);assert.equal(shellPathLength(0,2,1),0);
});

test('all observable nebula mechanisms have paired evidence, boundaries and specific primary sources',()=>{
 const content=JSON.parse(readFileSync(new URL('../nebulaContent.json',import.meta.url)));
 for(const kind of NEBULAE)for(const illumination of ILLUMINATIONS){const study=nebulaStudy(kind,illumination);for(const locale of ['zh','en'])for(const key of ['child','title','theory','evidence','limits'])assert.ok(study[key][locale].length>5);assert.ok(study.sources.every(s=>new URL(s.url).protocol==='https:'));}
 for(const language of ['zh','en']){
  assert.match(content.cases.supernova.boundary[language],language==='zh'?/Ia/:/Type Ia/);
  assert.match(content.cases.supernova.boundary[language],language==='zh'?/脉冲星/:/pulsars/);
  assert.match(content.cases.planetary.boundary[language],language==='zh'?/不是所有/:/one geometry/);
 }
});

test('expanded learning keeps three academic notes and four clean spoken sections in both languages',()=>{
 const learning=JSON.parse(readFileSync(new URL('../learning.json',import.meta.url)));
 for(const locale of ['zh','en']){
  const content=learning[locale];assert.equal(content.academic.length,3);assert.equal(content.narration.length,4);
  for(const key of ['question','observe','misconception','boundary'])assert.ok(content[key].length>15);
  for(const note of content.academic)assert.ok(note.body.length>55);
  for(const section of content.narration){assert.ok(section.label&&section.cue&&section.text);assert.doesNotMatch(section.text,/<\/?[a-z][^>]*>/i);}
 }
 assert.doesNotMatch(JSON.stringify(learning.en),/[\u3400-\u9fff]/);
 assert.ok(learning.references.some(s=>s.url.includes('supernova_remnants')));
 assert.ok(learning.references.every(s=>new URL(s.url).protocol==='https:'));
});
