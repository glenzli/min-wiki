import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {bodies,lastPair,diameterComparison,comparisonFrame} from '../comparisonModel.ts';
import {originStart} from '../model.ts';
import {readGalacticState} from '../galacticModel.ts';
import {readCaseMemory,rememberCase,isSceneChapter} from '../explorationNavigation.ts';
import {lessonSteps} from '../journeyRoutes.ts';
import {stops} from '../model.ts';
import content from '../comparisonContent.json';

test('diameter trials use the canonical bodies and the renderer’s linear ratio at both viewport sizes',()=>{
 for(let pair=0;pair<=lastPair;pair++)for(const [width,height] of [[342,200],[1100,450]]){
  const trial=diameterComparison(pair),frame=comparisonFrame(pair,width,height);
  assert.equal(trial.small,bodies[pair]);assert.equal(trial.large,bodies[pair+1]);
  assert.equal(trial.ratio,trial.large.radius/trial.small.radius);
  assert.ok(Math.abs(frame[pair+1]!.radius/frame[pair]!.radius-trial.ratio)<1e-10);
  const smallTick=2*frame[pair]!.radius,largeSpan=2*frame[pair+1]!.radius;
  assert.ok(Math.abs(largeSpan/smallTick-trial.ratio)<1e-10);
  for(const language of ['zh','en'] as const){const words=content[language],result=words.ratioResult.replaceAll('{{small}}',words.names[pair]!).replaceAll('{{large}}',words.names[pair+1]!).replace('{{ratio}}',String(trial.ratio));assert.doesNotMatch(result,/\{\{/);assert.ok(words.ratioQuestion&&words.checkRatio&&words.estimateAgain);}
 }
 assert.equal(diameterComparison(-10).small.id,'earth');assert.equal(diameterComparison(100).large.id,'stephenson-2-18');
});

test('switching lesson routes restores the selected family, elapsed days and camera without resetting another route',()=>{
 const source=readFileSync(new URL('../main.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true);
 const functions=['rememberRoute','chooseLesson'].map(name=>ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name)!.getText(ast)).join('\n');
 const galacticState=readGalacticState('galaxy=kepler-16&keplerDays=54&galaxyZoom=1.5'),state={origin:'earth',progress:.4},exploration={chapter:'systems',pair:3,home:2};
 const context=vm.createContext({galacticState,state,exploration,lesson:{route:'inward',step:'families'},routeSnapshots:new Map(),visitedLessonSteps:new Set(['inward:families']),structuredClone,rememberCase,caseMemory:readCaseMemory(new URLSearchParams(),galacticState.selected),flight:{progress:.4,seek(value:number){this.progress=value;}},stops,originStart,scene:{},previous:0,stop(){},comparison:{stop(){}},galaxies:{pause(){}},setChapter(chapter:string){context.exploration.chapter=chapter;},travelTo(target:number){context.state.progress=target;},step:lessonSteps.outward[0]});
 vm.runInContext(ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 vm.runInContext("chooseLesson({route:'outward',step:'galaxy'},step,true); galacticState.pitch=1.3; exploration.home=5",context);
 assert.equal(context.galacticState.selected,'milky-way');
 context.step=lessonSteps.inward.find(step=>step.id==='families');vm.runInContext("chooseLesson({route:'inward',step:'families'},step,true)",context);
 assert.equal(context.galacticState.selected,'kepler-16');assert.equal(context.galacticState.familyDays['kepler-16'],54);assert.equal(context.galacticState.zoom,1.5);assert.equal(context.state.progress,.4);assert.equal(context.exploration.home,2);
 context.step=lessonSteps.outward[0];vm.runInContext("chooseLesson({route:'outward',step:'galaxy'},step,true)",context);assert.equal(context.galacticState.pitch,1.3);assert.equal(context.exploration.home,5);
 context.step=lessonSteps.inward.find(step=>step.id==='galaxy');vm.runInContext("chooseLesson({route:'inward',step:'galaxy'},step)",context);assert.equal(context.state.progress,stops[3]);
 context.state.progress=.1;vm.runInContext("chooseLesson({route:'inward',step:'galaxy'},step)",context);assert.equal(context.state.progress,stops[3],'a selected physical stop still recentres after manual magnification');
});

test('new-journey action resets only the physical progress; resume and ordinary chapters retain it',()=>{
 const source=readFileSync(new URL('../main.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true);
 const functions=['enterZoom','setChapter'].map(name=>{const found=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.ok(found);return found.getText(ast);}).join('\n');
 const code=ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const origin of ['earth','sun'] as const){
  const state={origin,progress:.86},exploration={chapter:'galaxies',pair:3,home:4},flight={progress:.86,seek(value:number){this.progress=value;}};
  const galacticState=readGalacticState(''),caseMemory=readCaseMemory(new URLSearchParams(),galacticState.selected);
  const context=vm.createContext({state,exploration,flight,galacticState,caseMemory,rememberCase,isSceneChapter,originStart,rememberRoute(){},previous:7,chapterFocusFrame:0,stop(){},comparison:{stop(){}},physicalInput:{cancel(){}},update(){},cancelAnimationFrame(){},releaseChapterFocus(){},requestAnimationFrame(){return 1;}});
  vm.runInContext(code,context);vm.runInContext('enterZoom(false)',context);assert.equal(state.progress,.86);assert.equal(state.origin,origin);
  vm.runInContext("setChapter('galaxies')",context);assert.equal(state.progress,.86);assert.equal(exploration.pair,3);assert.equal(exploration.home,4);
  vm.runInContext('enterZoom(true)',context);assert.equal(state.progress,originStart(origin));assert.equal(flight.progress,state.progress);assert.equal(exploration.chapter,'zoom');assert.equal(context.previous,-1);
 }
});
