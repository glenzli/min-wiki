import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {legacySaturnMoonTarget} from '../../solar-system/explorer/ringsModel.ts';
import {languageHref,resolveLanguage} from '../../../src/platform/i18n.ts';

test('the production legacy entry uses shared language resolution, deployment base and exact saved reading state',()=>{
  const source=readFileSync(new URL('../entry.ts',import.meta.url),'utf8');
  const parsed=ts.createSourceFile('entry.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const output=ts.transpileModule(ts.createPrinter().printFile(ts.factory.updateSourceFile(parsed,parsed.statements.filter(node=>!ts.isImportDeclaration(node)))),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [search,saved,browser,expected] of [
    ['?lang=en&reading=academic&body=jupiter&view=section&custom=keep',null,'zh-CN','en'],
    ['?reading=child',null,'en-US','en'],
    ['?lang=unknown','en','zh-CN','en'],
    ['?lang=zh','en','en-US','zh'],
  ]){
    const locale=resolveLanguage(new URLSearchParams(search).get('lang'),saved,browser),navigations=[];
    const location={search,hash:'#world-comparison',replace:target=>navigations.push(target)};
    vm.runInNewContext(output,{location,legacySaturnMoonTarget,languageHref:target=>languageHref(target,locale,'/encyclopedia/')});
    assert.equal(navigations.length,1);
    const target=new URL(navigations[0],'https://wiki.test');
    assert.equal(target.pathname,'/encyclopedia/topics/solar-system/');assert.equal(target.searchParams.get('lang'),expected);
    assert.equal(target.searchParams.get('body'),'saturn');assert.equal(target.searchParams.get('view'),'moons');
    assert.equal(target.hash,location.hash);
    for(const key of ['reading','custom'])assert.equal(target.searchParams.get(key),new URLSearchParams(search).get(key));
  }
});
