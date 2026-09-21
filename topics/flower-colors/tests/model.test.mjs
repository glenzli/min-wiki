import test from 'node:test';
import assert from 'node:assert/strict';
import {readFlowerState,morningState,roses} from '../model.ts';
import {readFileSync} from 'node:fs';
import {findTopics} from '../../../src/catalog/model.ts';
test('new entry begins with pigments while legacy hydrangea remains reachable',()=>{
 assert.equal(readFlowerState('').case,'pigments');assert.equal(readFlowerState('',true).case,'hydrangea');
 assert.equal(readFlowerState('?case=guides',true).case,'guides');
 assert.deepEqual(readFlowerState('?rose=99&opening=NaN&case=unknown&uv=1'),{case:'pigments',rose:3,opening:0,uv:true,close:false});
 const catalog=JSON.parse(readFileSync(new URL('../../../content/catalog.json',import.meta.url)));
 const matches=findTopics(catalog,{query:'绣球'});assert.ok(matches.some(t=>t.id==='flower-colors'));assert.ok(!matches.some(t=>t.id==='hydrangea'));
});
test('opening and coloration stay coupled, reversible and bounded for the specific morning glory',()=>{
 let prev=morningState(0);for(let i=0;i<=1000;i++){const s=morningState(i/1000);assert.ok(s.opening>=prev.opening&&s.hue<=prev.hue);assert.ok(s.environment>=0&&s.environment<=1);assert.deepEqual(s,morningState(i/1000));prev=s;}
 assert.deepEqual(morningState(-4),morningState(0));assert.deepEqual(morningState(8),morningState(1));
 assert.ok(roses[0].anthocyanin>roses[1].anthocyanin);assert.ok(roses[1].carotenoid>roses[0].carotenoid);assert.ok(roses[3].anthocyanin>0);
});
