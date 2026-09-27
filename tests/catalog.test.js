import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { findTopics, readFilters, validateCatalog, topicHref, PAGE_SIZE, paginate, readPage } from '../src/catalog/model.ts';
import { resolveTheme, themePreference } from '../src/platform/theme.ts';
const catalog=JSON.parse(readFileSync(new URL('../content/catalog.json',import.meta.url),'utf8'));

test('published topics have unique safe routes, known categories and deployable pages',()=>{
  assert.equal(validateCatalog(catalog),catalog);
  for(const topic of catalog.topics.filter(item=>item.status==='published')) {
    assert.ok(existsSync(new URL(`..${topicHref(topic)}index.html`,import.meta.url)));
  }
  for(const patch of [{id:'../escape'}, {category:'missing'}, {theme:'purple'}]) {
    const invalid=structuredClone(catalog); Object.assign(invalid.topics[0],patch);
    assert.throws(()=>validateCatalog(invalid),/Invalid topic/);
  }
  const duplicate=structuredClone(catalog);duplicate.topics.push(duplicate.topics[0]);
  assert.throws(()=>validateCatalog(duplicate),/Invalid topic/);
});
test('search combines terms and category, excludes drafts, and handles empty results',()=>{
  const fixture=structuredClone(catalog);fixture.topics.push({...fixture.topics[0],id:'draft-example',status:'draft'});
  assert.deepEqual(findTopics(fixture,{query:' 恒星  引力 '}).map(item=>item.id),['black-holes']);
  assert.equal(findTopics(fixture,{category:'life',query:'黑洞'}).length,0);
  assert.equal(findTopics(fixture,{query:'不存在的问题'}).length,0);
  assert.equal(findTopics(fixture).length, catalog.topics.filter(item => item.status === 'published' && !item.parentTopic && item.listed !== false).length);
});
test('published but unlisted topics keep their direct routes without appearing in discovery',()=>{
  const fixture=structuredClone(catalog);
  fixture.topics[0].listed=false;
  assert.equal(validateCatalog(fixture),fixture);
  assert.ok(existsSync(new URL(`..${topicHref(fixture.topics[0])}index.html`,import.meta.url)));
  assert.ok(!findTopics(fixture).some(item=>item.id===fixture.topics[0].id));
  assert.deepEqual(findTopics(fixture,{query:fixture.topics[0].title}),[]);
  for(const listed of ['false',null,0]) {
    const invalid=structuredClone(fixture);invalid.topics[0].listed=listed;
    assert.throws(()=>validateCatalog(invalid),/Invalid topic/);
  }
  const child=structuredClone(fixture);child.topics.find(item=>item.parentTopic).listed=false;
  assert.throws(()=>validateCatalog(child),/Invalid topic/);
});
test('editorial curation retains five published legacy pages outside discovery',()=>{
  const ids=['lunar-craters','meteors','sand-journey','camouflage','tap-water'];
  for(const id of ids) {
    const topic=catalog.topics.find(item=>item.id===id);
    assert.equal(topic.status,'published');
    assert.equal(topic.listed,false);
    assert.ok(existsSync(new URL(`..${topicHref(topic)}index.html`,import.meta.url)));
    assert.ok(!findTopics(catalog,{query:topic.title}).some(item=>item.id===id));
  }
  assert.equal(findTopics(catalog).length,36);
});
test('shared links recover filters and tolerate unknown categories and long input',()=>{
  assert.deepEqual(readFilters('?category=universe&q=%E9%BB%91%E6%B4%9E',catalog),{category:'universe',query:'黑洞'});
  assert.equal(readFilters('?category=missing',catalog).category,'all');
  assert.equal(readFilters('?q='+ 'a'.repeat(300),catalog).query.length,160);
});
test('the catalog supports more than one page without loading topic implementations',()=>{
  const fixture=structuredClone(catalog);fixture.topics=Array.from({length:PAGE_SIZE+7},(_,i)=>({...fixture.topics[0],id:`example-${i}`}));
  validateCatalog(fixture);
  const matches=findTopics(fixture);
  assert.equal(matches.slice(0,PAGE_SIZE).length,24);
  assert.equal(matches.slice(PAGE_SIZE).length,7);
  assert.equal(new Set(matches.map(topicHref)).size,matches.length);
});
test('appearance preference overrides content and invalid saved values fall back safely',()=>{
  assert.equal(resolveTheme('auto','dark'),'dark');
  assert.equal(resolveTheme('auto','light'),'light');
  assert.equal(resolveTheme('light','dark'),'light');
  assert.equal(resolveTheme('dark','light'),'dark');
  assert.equal(resolveTheme('invalid','dark'),'dark');
  assert.equal(themePreference(null),'auto');
});

test('pagination clamps invalid URLs and returns adjacent pages with endpoints', () => {
  assert.equal(readPage('?page=-3'), 1);
  assert.equal(readPage('?page=2.5'), 1);
  assert.equal(readPage('?page=2'), 2);
  assert.equal(paginate(49, 999).page, 3);
  assert.deepEqual(paginate(49, 2), {page:2,pages:3,start:24,end:48,visible:[1,2,3]});
  assert.deepEqual(paginate(240, 5).visible, [1,4,5,6,10]);
  assert.equal(paginate(0, 5).page, 1);
});

test('chapter discovery returns one parent, searches child metadata and preserves chapter routes', () => {
  const base = {...catalog.topics[0], id:'collection', title:'Parent', summary:'Overview', tags:[]};
  delete base.parentTopic;
  const fixture = {...catalog, topics:[base,
    {...base, id:'chapter', parentTopic:'collection', title:'Distinct child', tags:['needle']},
    {...base, id:'hidden', parentTopic:'collection', status:'draft', tags:['secret']}]};
  assert.equal(validateCatalog(fixture), fixture);
  assert.deepEqual(findTopics(fixture).map(t=>t.id), ['collection']);
  assert.deepEqual(findTopics(fixture,{query:'needle'}).map(t=>t.id), ['collection']);
  assert.deepEqual(findTopics(fixture,{query:'Parent needle'}).map(t=>t.id), ['collection']);
  assert.deepEqual(findTopics(fixture,{query:'secret'}), []);
  assert.equal(topicHref(fixture.topics[1]), '/topics/chapter/');
  for (const parentTopic of ['missing', 'chapter', '', null]) {
    const invalid=structuredClone(fixture); invalid.topics[1].parentTopic=parentTopic;
    assert.throws(()=>validateCatalog(invalid), /Invalid parent topic/);
  }
  const nested=structuredClone(fixture); nested.topics[2].parentTopic='chapter';
  assert.throws(()=>validateCatalog(nested), /Invalid parent topic/);
  const draft=structuredClone(fixture); draft.topics[0].status='draft';
  assert.throws(()=>validateCatalog(draft), /Invalid parent topic/);
  const category=structuredClone(fixture); category.topics[1].category=catalog.categories.find(c=>c.id!==base.category).id;
  assert.throws(()=>validateCatalog(category), /Invalid parent topic/);
});

test('absorbed Saturn and surface chapters resolve to one solar-system discovery entry',()=>{
  const ids=findTopics(catalog).map(t=>t.id);
  assert.ok(ids.includes('solar-system'));assert.ok(!ids.includes('saturn-moons'));assert.ok(!ids.includes('planet-surfaces'));
  assert.ok(ids.includes('earth-moon'));
  assert.deepEqual(findTopics(catalog,{query:'土星和它的卫星们'}).map(t=>t.id),['solar-system']);
});
