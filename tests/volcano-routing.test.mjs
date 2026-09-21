import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findTopics } from '../src/catalog/model.ts';
import { legacyDestination, caseFromSearch } from '../topics/volcano-eruption/projectModel.ts';
const catalog = JSON.parse(readFileSync(new URL('../content/catalog.json', import.meta.url), 'utf8'));
test('all volcano search terms resolve to one published project while old URLs stay buildable', () => {
  for (const query of ['海底火山', '火山湖', '大室山']) {
    assert.deepEqual(findTopics(catalog, {query}).map(t => t.id), ['volcano-eruption']);
  }
  for (const [id, volcano] of [['submarine-volcanoes', 'submarine'], ['volcanic-lakes', 'lake']]) {
    const child = catalog.topics.find(t => t.id === id);
    assert.equal(child.parentTopic, 'volcano-eruption');
    assert.equal(child.status, 'published');
    const page = readFileSync(new URL(`../topics/${id}/index.html`, import.meta.url), 'utf8');
    assert.ok(page.includes(`../volcano-eruption/?case=${volcano}`));
    const destination = new URL(legacyDestination('?lang=en', volcano, '/encyclopedia/'), 'https://example.com');
    assert.equal(destination.pathname, '/encyclopedia/topics/volcano-eruption/');
    assert.equal(destination.searchParams.get('lang'), 'en');
    assert.equal(caseFromSearch(destination.search), volcano);
  }
});
