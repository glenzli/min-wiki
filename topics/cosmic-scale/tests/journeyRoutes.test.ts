import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonRoutes,lessonSteps,routeNames,readLesson,saveLesson,stepInRoute,scaleParent,lessonCue} from '../journeyRoutes.ts';
import {readExploration} from '../comparisonModel.ts';
import {readGalacticState,GALAXY_DIAMETER_LY,GALAXY_PAIR_UNIT,galacticObjects} from '../galacticModel.ts';

test('four learning routes separate sky, inward, outward and the final physical flight',()=>{
 assert.deepEqual(lessonRoutes,['sky','inward','outward','flight']);
 for(const lang of ['zh','en'] as const)for(const [i,route] of lessonRoutes.entries())assert.ok(routeNames[route][lang].startsWith(String(i+1).padStart(2,'0')));
 assert.deepEqual(lessonSteps.sky.map(step=>step.id),['night','stars','milky','neighbours']);
 const inward=lessonSteps.inward.filter(step=>!step.parent&&step.scale!==undefined).map(step=>step.scale!);
 assert.ok(inward.every((value,i)=>i===0||value<inward[i-1]!),'the physical inward branch actually approaches Earth');assert.equal(inward.at(-1),0);
 assert.deepEqual(lessonSteps.inward.filter(step=>!step.parent).map(step=>step.id),['galaxy','nearby','solar','moon','earth']);
 for(const id of ['families','sun','sizes'])assert.equal(scaleParent({route:'inward',step:id}).id,'solar');
 assert.equal(scaleParent({route:'inward',step:'clusters'}).id,'galaxy');
 for(const step of lessonSteps.inward)if(step.parent)assert.ok(lessonSteps.inward.some(parent=>parent.id===step.parent&&!parent.parent),'comparisons have one valid, non-nested scale parent');
 for(const language of ['zh','en'])assert.notEqual(lessonCue({route:'inward',step:'sun'},language),lessonCue({route:'inward',step:'galaxy'},language),'the Sun close-up does not claim to show an Earth locator');
 assert.deepEqual(lessonSteps.outward.map(step=>step.id),['galaxy','group','cluster','flows','web','observable']);
 assert.equal(lessonSteps.flight.length,1);
});

test('legacy links preserve their scientific view while gaining an unambiguous lesson location',()=>{
 const examples=[['mode=galaxies&galaxy=orion','sky','stars'],['mode=galaxies&galaxy=star-cluster','inward','clusters'],['mode=galaxies&galaxy=kepler-16','inward','families'],['mode=homes&home=3','outward','cluster'],['mode=homes&home=6','outward','observable'],['mode=compare&pair=2','inward','sizes'],['mode=zoom&scale=.65','flight','continuous']] as const;
 for(const [query,route,step] of examples){const p=new URLSearchParams(query),exploration=readExploration(query),galaxy=readGalacticState(query),before=p.toString();const lesson=readLesson(p,exploration.chapter,galaxy.selected,exploration.home);assert.deepEqual(lesson,{route,step});assert.equal(p.toString(),before);saveLesson(p,lesson);assert.deepEqual(readLesson(p,exploration.chapter,galaxy.selected,exploration.home),lesson);assert.equal(p.get('mode'),new URLSearchParams(query).get('mode'));}
 assert.deepEqual(readLesson(new URLSearchParams('lang=zh'),'compare','milky-way'),{route:'sky',step:'night'});
 assert.equal(stepInRoute({route:'inward',step:'invalid'}).id,'galaxy');
});

test('galaxy comparisons use one length conversion, including a genuinely smaller irregular body',()=>{
 for(const kind of ['spiral','elliptical','irregular'] as const){const [milky,other]=galacticObjects('galaxy-comparison',kind);assert.equal(milky!.scale,GALAXY_PAIR_UNIT);assert.ok(Math.abs(other!.scale/milky!.scale-GALAXY_DIAMETER_LY[kind]/GALAXY_DIAMETER_LY['milky-way'])<1e-12);}
 const milky=galacticObjects('milky-way')[0]!,m31=galacticObjects('spiral')[0]!;
 assert.notDeepEqual(milky.clouds[1]!.positions,m31.clouds[1]!.positions);
 const dust=m31.clouds.find(cloud=>cloud.part==='dust')!;let ring=0;
 for(let i=0;i<dust.positions.length;i+=3){const r=Math.hypot(dust.positions[i]!-.055,dust.positions[i+1]!);if(Math.abs(r-.53)<.08||Math.abs(r-.78)<.08)ring++;}
 assert.ok(ring/(dust.positions.length/3)>.95,'M31 dust follows its own offset rings rather than the Milky Way four-arm template');
});
