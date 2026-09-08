import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { findTopics, readFilters, validateCatalog, topicHref, PAGE_SIZE } from '../src/catalog/model.ts';
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
  assert.deepEqual(findTopics(fixture,{query:' 恒星  引力 '}).map(item=>item.id),['black-hole']);
  assert.equal(findTopics(fixture,{category:'life',query:'黑洞'}).length,0);
  assert.equal(findTopics(fixture,{query:'不存在的问题'}).length,0);
  assert.equal(findTopics(fixture).length, catalog.topics.filter(item => item.status === 'published').length);
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
