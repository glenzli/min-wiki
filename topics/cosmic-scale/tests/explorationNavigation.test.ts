import test from 'node:test';
import assert from 'node:assert/strict';
import {chapters,sceneCases,sceneChapter,isSceneChapter,readChapter,readCaseMemory,rememberCase,saveCaseMemory} from '../explorationNavigation.ts';
import {readExploration} from '../comparisonModel.ts';
import {galacticCases,readGalacticState,saveGalacticState} from '../galacticModel.ts';
import copy from '../explorationContent.json';
import comparisonCopy from '../comparisonContent.json';

test('six questions place every existing scene in exactly one meaningful family',()=>{
  assert.deepEqual(chapters,['compare','systems','galaxies','sky','homes','zoom']);
  assert.deepEqual(sceneCases.systems,['trappist-1']);assert.deepEqual(sceneCases.sky,['sky','orion']);
  const cases=Object.values(sceneCases).flat();assert.equal(new Set(cases).size,galacticCases.length);
  assert.deepEqual([...cases].sort(),[...galacticCases].sort());
  for(const selected of galacticCases)assert.ok(sceneCases[sceneChapter(selected)].includes(selected));
  for(const lang of ['zh','en'] as const){
    assert.equal(comparisonCopy[lang].chapters.length,chapters.length);
    for(const [i,title] of comparisonCopy[lang].chapters.entries())assert.ok(title.startsWith(String(i+1).padStart(2,'0')+' · '));
    for(const chapter of chapters)assert.ok(copy[lang].actions[chapter]);
    for(const selected of galacticCases)assert.ok(copy[lang].cases[selected]&&copy[lang].caseActions[selected]);
  }
});

test('legacy mixed menus route to the same object without changing science or progress',()=>{
  for(const selected of galacticCases){
    const query=`mode=galaxies&galaxy=${selected}&pair=2.3&pairVersion=2&home=4&scale=.8&systemDays=16.497&skyObserver=.27`;
    assert.equal(readExploration(query).chapter,sceneChapter(selected));
    assert.equal(readExploration(query).pair,2.3);assert.equal(readExploration(query).home,4);
    const state=readGalacticState(query),p=new URLSearchParams(query);saveGalacticState(p,state);
    assert.deepEqual(readGalacticState(p.toString()),state);assert.equal(state.sky.systemDays,16.497);
  }
  for(const chapter of chapters)assert.equal(readChapter(new URLSearchParams(`mode=${chapter}`)),chapter);
  assert.equal(readExploration('origin=sun&scale=.7').chapter,'zoom');
  assert.equal(readExploration('mode=homes&home=5&galaxy=orion').chapter,'homes');
});

test('returning between questions remembers separate structure and sky cases, including after refresh',()=>{
  let memory=readCaseMemory(new URLSearchParams('structureCase=elliptical&nightCase=orion'),'trappist-1');
  assert.equal(memory.galaxies,'elliptical');assert.equal(memory.sky,'orion');
  memory=rememberCase(memory,'galaxy-comparison');memory=rememberCase(memory,'sky');memory=rememberCase(memory,'trappist-1');
  assert.equal(memory.galaxies,'galaxy-comparison');assert.equal(memory.sky,'sky');
  const p=new URLSearchParams('mode=systems&galaxy=trappist-1');saveCaseMemory(p,memory);
  assert.deepEqual(readCaseMemory(p,'trappist-1'),memory);
  const invalid=readCaseMemory(new URLSearchParams('structureCase=orion&nightCase=elliptical'),'trappist-1');
  assert.equal(invalid.galaxies,'milky-way');assert.equal(invalid.sky,'sky');
  assert.ok(isSceneChapter('systems'));assert.ok(isSceneChapter('sky'));assert.ok(!isSceneChapter('homes'));
});
