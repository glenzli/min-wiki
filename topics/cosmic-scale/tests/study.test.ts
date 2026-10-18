import test from 'node:test';
import assert from 'node:assert/strict';
import { originStart, stageFor, OBSERVABLE_RADIUS_KM, LIGHT_YEAR_KM } from '../model.ts';
import { zoomStudy, homeStudy } from '../study.ts';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('both close-up origins explain the object that actually occupies the physical ruler',()=>{
  for(const origin of ['earth','sun'] as const){
    const stage=stageFor(originStart(origin));assert.equal(stage,0);
    const study=zoomStudy(stage,origin);
    for(const language of ['zh','en'] as const){
      const name=origin==='sun'?(language==='zh'?/\u592a\u9633/u:/Sun/):(language==='zh'?/\u5730\u7403/u:/Earth/);
      assert.match(study.child[language],name);
      assert.match(study.limits[language],language==='zh'?/\u7ebf\u6027/u:/linear/);
    }
    if(origin==='sun'){
      assert.match(study.formula!,/1\.39/);
      assert.match(study.child.en,/glow does not count/);
      assert.equal(study.sources[0]!.url,'https://science.nasa.gov/sun/facts/');
      assert.doesNotMatch(study.child.en,/Earth/);
    }
  }
  // Returning to either origin must not alter the larger-scale explanation.
  for(let stage=1;stage<=8;stage++)assert.deepEqual(zoomStudy(stage,'sun'),zoomStudy(stage,'earth'));
});

test('the production reading cache refreshes when the close-up origin changes within stage zero',()=>{
  const source=readFileSync(new URL('../main.ts',import.meta.url),'utf8');
  const parsed=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const sync=parsed.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='syncStudy');assert.ok(sync);
  const code=ts.transpileModule('let studyKey="";'+sync.getText(parsed),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const state={origin:'earth',progress:originStart('earth')},studies:ReturnType<typeof zoomStudy>[]=[];
  const context=vm.createContext({state,stageFor,zoomStudy,exploration:{chapter:'zoom'},comparisonNote:{},el:()=>({}),
    reading:{setChildTarget(){},set(study:ReturnType<typeof zoomStudy>){studies.push(study);}}});
  vm.runInContext(code,context);vm.runInContext('syncStudy()',context);assert.equal(studies.length,1);
  state.origin='sun';state.progress=originStart('sun');vm.runInContext('syncStudy()',context);
  assert.equal(studies.length,2);assert.match(studies[1]!.child.en,/Sun/);
  vm.runInContext('syncStudy()',context);assert.equal(studies.length,2);
  state.origin='earth';state.progress=originStart('earth');vm.runInContext('syncStudy()',context);
  assert.equal(studies.length,3);assert.match(studies[2]!.child.en,/Earth/);
});

test('observable explanation uses the same rounded diameter as the physical endpoint',()=>{
  assert.equal(OBSERVABLE_RADIUS_KM/LIGHT_YEAR_KM*2,93e9);
  assert.match(homeStudy(6).theory.en,/93-billion/);
  assert.match(homeStudy(6).theory.zh,/930/);
});
