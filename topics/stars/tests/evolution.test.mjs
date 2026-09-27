import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TRACKS,PHASES,RSUN_AU,evolutionState,recognitionRadius} from '../evolutionModel.ts';

test('the three paths retain one identity and distinct remnants through forward, reverse and repeat',()=>{
 const expected={solar:'white-dwarf',massive:'neutron-star','very-massive':'black-hole'};
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
test('the separate recognition view preserves growth and collapse across all three paths',()=>{
 for(const [track,path] of Object.entries(TRACKS)){
  const size=path.anchors.map(anchor=>recognitionRadius(track,anchor.radiusSolar));
  assert.ok(size[4]>size[2]*1.7,`${track} giant expansion should be visible`);
  assert.ok(size[5]<size[2],`${track} collapse should be visible`);
  assert.ok(size[4]<=146&&size[0]>=9);
 }
});
test('all evolutionary paths and surface mechanisms have bilingual cause, boundary and source',()=>{
 const evolution=JSON.parse(readFileSync(new URL('../evolutionContent.json',import.meta.url))),anatomy=JSON.parse(readFileSync(new URL('../anatomyContent.json',import.meta.url)));
 for(const track of Object.keys(TRACKS)){assert.equal(evolution.tracks[track].stages.length,PHASES.length);for(const stage of evolution.tracks[track].stages)for(const language of ['zh','en']){assert.ok(stage.name[language].length);assert.ok(stage.body[language].length>15);}}
 assert.equal(anatomy.features.length,6);for(const feature of anatomy.features){assert.match(feature.source,/^https:\/\//);for(const language of ['zh','en']){assert.ok(feature.body[language].length>15);assert.ok(feature.boundary[language].length>15);}}
 const chapters=JSON.parse(readFileSync(new URL('../content.json',import.meta.url))).chapters.map(chapter=>chapter.id);
 assert.deepEqual(chapters,['evolution','anatomy','orbits','three-body']);
 for(const language of ['zh','en'])assert.match(evolution.tracks['very-massive'].stages[6].body[language],language==='zh'?/吸积盘/:/accretion disk/);
});
