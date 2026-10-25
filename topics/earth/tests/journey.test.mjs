import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, GALLERY_IDS, readEarthRoute, earthRouteURL, boundedStudyState, galleryChapter } from '../journey.ts';
import {readFileSync} from 'node:fs';

test('Earth routes validate chapters, isolate module state and reject oversized or malformed fields', () => {
  const route = readEarthRoute('?chapter=other&earth.interior.depth=42&earth.rocks.rockPath=%5B%22cool%22%5D&earth.bad.key=1&earth.interior.__proto__=bad&earth.interior.depth.extra=0&earth.history.ageMa=' + '9'.repeat(4000));
  assert.equal(route.chapter, 'interior');
  assert.equal(route.states.interior.depth, '42');
  assert.equal(route.states.rocks.rockPath, '["cool"]');
  assert.equal(Object.keys(route.states.history).length, 0);
  assert.deepEqual(Object.keys(route.states.interior), ['depth']);
});

test('Earth route writes retain the host base, language, static mode and reading anchor', () => {
  const route = readEarthRoute('?chapter=history&earth.history.ageMa=2400&earth.rocks.rockProgress=60');
  const url = earthRouteURL('https://example.test/encyclopedia/topics/earth/?lang=en&static=1&earth.old.invalid=1#narration', route);
  assert.equal(url.pathname, '/encyclopedia/topics/earth/');
  assert.equal(url.searchParams.get('lang'), 'en');
  assert.equal(url.searchParams.get('static'), '1');
  assert.equal(url.hash, '#narration');
  assert.equal(url.searchParams.has('earth.old.invalid'), false);
  const restored = readEarthRoute(url.search);
  assert.equal(restored.states.history.ageMa, '2400');
  assert.equal(restored.states.rocks.rockProgress, '60');
});

test('Serialized study state has finite input bounds', () => {
  assert.deepEqual(boundedStudyState({valid:'30', 'bad.name':'0', giant:'x'.repeat(3073), invalid:NaN}), {valid:'30'});
  assert.equal(Object.keys(boundedStudyState(Object.fromEntries(Array.from({length:40},(_,i)=>['key'+i,'0'])))).length,20);
});
test('all independent galleries and the museum can be recognized under a deployment base',()=>{
  for(const chapter of CHAPTERS)assert.equal(galleryChapter(`/encyclopedia/topics/${GALLERY_IDS[chapter]}/?lang=en`),chapter);
  assert.equal(galleryChapter('/topics/earth/'),'museum');
  assert.equal(galleryChapter('/topics/earth-moon/'),undefined);
});

test('all eight gallery states fit the bounded route and survive a reading-mode round trip',()=>{
  assert.deepEqual(CHAPTERS,['interior','history','life','rocks','minerals','ores','climate','systems']);
  const params=new URLSearchParams({chapter:'ores'});
  for(const chapter of CHAPTERS)for(let i=0;i<20;i++)params.set(`earth.${chapter}.key${i}`,String(i));
  const route=readEarthRoute('?'+params);
  for(const chapter of CHAPTERS)assert.equal(Object.keys(route.states[chapter]).length,20);
  const url=earthRouteURL('https://example.test/encyclopedia/topics/earth/?lang=en&static=1#narration',route);
  const restored=readEarthRoute(url.search);
  for(const chapter of CHAPTERS)assert.deepEqual(restored.states[chapter],route.states[chapter]);
  assert.equal(url.searchParams.get('static'),'1');assert.equal(url.hash,'#narration');
});

test('every gallery has the same bilingual bridge contract used by museum and independent navigation',()=>{
  const content=JSON.parse(readFileSync(new URL('../journeyContent.json',import.meta.url),'utf8'));
  for(const language of ['zh','en']){
    assert.deepEqual(Object.keys(content[language]),[...CHAPTERS]);
    for(const chapter of CHAPTERS)for(const key of ['title','question','bridge','next'])assert.ok(typeof content[language][chapter][key]==='string'&&content[language][chapter][key].trim(),`${language}/${chapter}/${key}`);
  }
});
