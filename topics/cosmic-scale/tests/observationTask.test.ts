import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {bodies,lastPair,diameterComparison,comparisonFrame} from '../comparisonModel.ts';
import {originStart} from '../model.ts';
import {readGalacticState} from '../galacticModel.ts';
import {readCaseMemory,rememberCase,isSceneChapter} from '../explorationNavigation.ts';
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

test('new-journey action resets only the physical progress; resume and ordinary chapters retain it',()=>{
 const source=readFileSync(new URL('../main.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true);
 const functions=['enterZoom','setChapter'].map(name=>{const found=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.ok(found);return found.getText(ast);}).join('\n');
 const code=ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const origin of ['earth','sun'] as const){
  const state={origin,progress:.86},exploration={chapter:'galaxies',pair:3,home:4},flight={progress:.86,seek(value:number){this.progress=value;}};
  const galacticState=readGalacticState(''),caseMemory=readCaseMemory(new URLSearchParams(),galacticState.selected);
  const context=vm.createContext({state,exploration,flight,galacticState,caseMemory,rememberCase,isSceneChapter,originStart,previous:7,chapterFocusFrame:0,stop(){},comparison:{stop(){}},physicalInput:{cancel(){}},update(){},cancelAnimationFrame(){},releaseChapterFocus(){},requestAnimationFrame(){return 1;}});
  vm.runInContext(code,context);vm.runInContext('enterZoom(false)',context);assert.equal(state.progress,.86);assert.equal(state.origin,origin);
  vm.runInContext("setChapter('galaxies')",context);assert.equal(state.progress,.86);assert.equal(exploration.pair,3);assert.equal(exploration.home,4);
  vm.runInContext('enterZoom(true)',context);assert.equal(state.progress,originStart(origin));assert.equal(flight.progress,state.progress);assert.equal(exploration.chapter,'zoom');assert.equal(context.previous,-1);
 }
});
