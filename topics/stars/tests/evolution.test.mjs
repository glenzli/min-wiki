import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TRACKS,PHASES,PHASE_PROGRESS,REMNANT_START,RSUN_AU,evolutionPosition,evolutionState,recognitionRadius} from '../evolutionModel.ts';
import {drawEvolution} from '../evolutionScene.ts';

test('the four paths retain one identity and distinct remnants through forward, reverse and repeat',()=>{
 const expected={'low-mass':'white-dwarf',solar:'white-dwarf',massive:'neutron-star','very-massive':'black-hole'};
 for(const track of Object.keys(TRACKS)){const values=[];for(let i=0;i<=60;i++)values.push(evolutionState(track,i/60));
  assert.ok(values.every(v=>v.track===track&&Number.isFinite(v.ageYears)&&Number.isFinite(v.radiusSolar)&&v.radiusSolar>=0));
  assert.ok(values.every((v,i)=>i===0||v.ageYears>=values[i-1].ageYears));
  assert.equal(evolutionState(track,1).remnant,expected[track]);
  for(const progress of [.12,.49,.83,1])assert.deepEqual(evolutionState(track,progress),evolutionState(track,progress));
 }
});
test('Solar giant envelope crosses Mercury and Venus on one physical radius scale, without reappearing after ejection',()=>{
 assert.equal(PHASES.length,7);assert.ok(TRACKS.solar.anchors[4].radiusSolar*RSUN_AU>.723);assert.ok(TRACKS.solar.anchors[4].radiusSolar*RSUN_AU<1);
 const before=evolutionState('solar',.5),giant=evolutionState('solar',4/6),remnant=evolutionState('solar',1);
 assert.equal(before.mercuryEngulfed,false);assert.equal(giant.mercuryEngulfed,true);assert.equal(giant.venusEngulfed,true);
 assert.equal(remnant.mercuryEngulfed,true);assert.equal(remnant.venusEngulfed,true);
});
test('the separate recognition view preserves giants and the distinct low-mass future',()=>{
 for(const [track,path] of Object.entries(TRACKS)){
  const size=path.anchors.map(anchor=>recognitionRadius(track,anchor.radiusSolar));
  if(track==='low-mass')assert.ok(path.anchors[4].radiusSolar<1,`the theoretical red-dwarf future must not acquire a giant envelope`);
  else assert.ok(size[4]>size[2]*1.7,`${track} giant expansion should be visible`);
  assert.ok(size[5]<size[2],`${track} collapse should be visible`);
  assert.ok(size[4]<=146&&size[0]>=9);
 }
});
test('legacy selected phases retain their anchors and the final button begins a reversible cooling interval',()=>{
 for(const track of Object.keys(TRACKS)){
  for(let phase=0;phase<6;phase++){
   const state=evolutionState(track,Number((phase/6).toFixed(5)));
   assert.equal(state.phaseIndex,phase);assert.equal(state.radiusSolar,TRACKS[track].anchors[phase].radiusSolar);
  }
  assert.equal(PHASE_PROGRESS[4],4/6);assert.equal(PHASE_PROGRESS[6],REMNANT_START);
  const first=evolutionState(track,REMNANT_START),middle=evolutionState(track,.95),end=evolutionState(track,1);
  assert.equal(first.phaseIndex,6);assert.equal(first.remnantProgress,0);assert.ok(middle.remnantProgress>0&&middle.remnantProgress<1);assert.equal(end.remnantProgress,1);
  assert.equal(first.radiusSolar,end.radiusSolar);assert.equal(first.ageYears,end.ageYears);
  if(first.remnant==='white-dwarf'){
   assert.ok(first.emission>middle.emission&&middle.emission>end.emission&&end.emission>.1);
   assert.ok(first.glare>middle.glare&&middle.glare>end.glare&&end.glare>0);
   assert.notEqual(first.surfaceColor,end.surfaceColor);assert.equal(end.surfaceProfile,'compact');
  }
  assert.deepEqual(evolutionState(track,.95),middle);
 }
 assert.equal(evolutionPosition(NaN).phaseIndex,0);assert.equal(evolutionPosition(Infinity).remnantProgress,0);
});
test('the Canvas comparison consumes the same deterministic remnant color, emission and size through cooling',()=>{
 const context=new Proxy({globalAlpha:1},{get:(target,key)=>key in target?target[key]:()=>{}});
 for(const track of ['solar','low-mass','massive']){
  const samples=[];
  for(const progress of [REMNANT_START,.95,1,.95]){
   const calls=[],surface={draw(...args){calls.push(args);}};
   drawEvolution(context,track,progress,0,word=>word.en,surface,16);
   const call=calls.at(-1),state=evolutionState(track,progress);
   assert.ok(call);assert.equal(call[4],state.surfaceColor);assert.equal(call[8],'compact');assert.equal(call[9],state.emission);assert.equal(call[10],state.glare);
   samples.push(call.slice(1));
  }
  assert.equal(samples[0][2],samples[2][2]);assert.deepEqual(samples[1],samples[3]);
 }
});
test('the recognition-radius joins continuously while the white dwarf crosses the detail threshold',()=>{
 for(const track of Object.keys(TRACKS))assert.ok(Math.abs(recognitionRadius(track,.10000001)-recognitionRadius(track,.09999999))<1e-4);
});
test('all evolutionary paths and surface mechanisms have bilingual cause, boundary and source',()=>{
 const evolution=JSON.parse(readFileSync(new URL('../evolutionContent.json',import.meta.url))),anatomy=JSON.parse(readFileSync(new URL('../anatomyContent.json',import.meta.url)));
 for(const track of Object.keys(TRACKS)){assert.equal(evolution.tracks[track].stages.length,PHASES.length);for(const stage of evolution.tracks[track].stages)for(const language of ['zh','en']){assert.ok(stage.name[language].length);assert.ok(stage.body[language].length>15);}}
 assert.equal(anatomy.features.length,6);for(const feature of anatomy.features){assert.match(feature.source,/^https:\/\//);for(const language of ['zh','en']){assert.ok(feature.body[language].length>15);assert.ok(feature.boundary[language].length>15);}}
 const chapters=JSON.parse(readFileSync(new URL('../content.json',import.meta.url))).chapters.map(chapter=>chapter.id);
 assert.deepEqual(chapters,['nebulae','evolution','types','anatomy','orbits','three-body']);
 for(const language of ['zh','en'])assert.match(evolution.tracks['very-massive'].stages[6].body[language],language==='zh'?/吸积盘/:/accretion disk/);
});
