import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {families,readGuide,selectFamily,partnerOf} from '../topics/universe-guide/model.ts';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const {residents,paths}=read('topics/universe-guide/content.json');
const wiki=read('wiki.json');

test('guide restores object identity independently of presentation and falls back safely',()=>{
  assert.deepEqual(readGuide('?lang=en&object=meteor',residents),{selected:'meteor',family:'events'});
  assert.equal(readGuide('?object=not-a-body',residents).selected,'sun');
  assert.equal(selectFamily(residents,'comet','worlds').id,'comet');
  assert.equal(selectFamily(residents,'sun','events').kind,'event');
  for(const family of families)assert.ok(residents.some(item=>item.family===family));
});
test('classification keeps phenomena, material, bodies and observer-defined regions distinct',()=>{
  const kind=id=>residents.find(item=>item.id===id).kind;
  assert.equal(kind('supernova'),'event');assert.equal(kind('meteor'),'event');
  assert.equal(kind('remnant'),'material');assert.equal(kind('nebula'),'material');
  assert.equal(kind('comet'),'body');assert.equal(kind('galaxy'),'system');assert.equal(kind('observable'),'region');
  for(const item of residents){assert.notEqual(item.partner,item.id);assert.ok(partnerOf(residents,item));}
});
test('each learning path reaches registered native studies while retaining language-independent routes',()=>{
  for(const item of [...residents,...paths.flatMap(path=>path.steps)]){
    const url=new URL(item.route,'https://local.invalid');
    const id=url.pathname.match(/^\/topics\/([a-z0-9-]+)\/$/)?.[1];
    const entry=wiki.entries.find(entry=>entry.id===id);
    assert.ok(entry,`Unregistered guide route ${item.route}`);
    assert.ok(entry.document,`${id} needs its native study`);
    assert.ok(existsSync(new URL('../'+entry.document.entry,import.meta.url)));
    assert.equal(url.searchParams.has('lang'),false);
  }
  assert.equal(paths.length,4);
});
test('new guide and physical studies have separate ownership rather than nested parentTopic chains',()=>{
  for(const id of ['universe-guide','stars','cosmic-scale','solar-system','black-holes'])assert.equal(wiki.entries.find(entry=>entry.id===id).parentTopic,undefined);
  for(const id of ['sun-star','black-hole','galactic-center','planet-black-hole','saturn-moons','planet-surfaces'])assert.ok(wiki.entries.some(entry=>entry.id===id&&entry.document));
});
