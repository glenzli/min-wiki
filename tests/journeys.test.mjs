import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { findTopics, validateCatalog } from '../src/catalog/model.ts';
import { legacyCellURL, readCellRoute } from '../topics/cells/exploration.ts';
import { legacyWaterURL } from '../topics/leaf-colors/lifecycle.ts';
import { waterHref } from '../topics/rain-cycle/watershedModel.ts';
import { stellarDestination } from '../topics/sun-star/migration.ts';

const catalog = JSON.parse(readFileSync(new URL('../content/catalog.json', import.meta.url), 'utf8'));
const parents = { 'body-cells':'cells', 'blood-cells':'cells', 'plant-water':'leaf-colors', 'rain-formation':'rain-cycle', 'ground-water':'rain-cycle', 'river-paths':'rain-cycle', 'sun-star':'stars' };
test('learning journeys have one discoverable owner and retain buildable old entries', () => {
  validateCatalog(catalog);
  const visible = findTopics(catalog).map(t => t.id);
  for (const [child, parent] of Object.entries(parents)) {
    const topic = catalog.topics.find(t => t.id === child);
    assert.equal(topic.parentTopic, parent);
    assert.ok(!visible.includes(child)); assert.ok(visible.includes(parent));
    assert.ok(existsSync(new URL(`../topics/${child}/index.html`, import.meta.url)));
    assert.ok(findTopics(catalog, { query: topic.title }).some(t => t.id === parent));
  }
  for (const independent of ['atmosphere', 'cosmic-scale', 'wind', 'water-states', 'earth-moon', 'black-holes']) assert.ok(visible.includes(independent));
  assert.deepEqual(findTopics(catalog, { query:'血细胞' }).map(t => t.id), ['cells']);
  assert.deepEqual(findTopics(catalog, { query:'叶子的颜色' }).map(t => t.id), ['leaf-colors']);
});
test('cell and leaf redirects preserve base paths, language and anchors', () => {
  const cell = legacyCellURL('https://example.test/wiki/topics/blood-cells/?kind=repair&lang=en#narration', '/wiki/', 'blood-cells');
  assert.equal(cell.pathname, '/wiki/topics/cells/');
  assert.deepEqual(readCellRoute(cell.search), { chapter:'work', example:'repair' });
  assert.equal(cell.searchParams.get('lang'), 'en'); assert.equal(cell.hash, '#narration');
  const leaf = legacyWaterURL('https://example.test/wiki/topics/plant-water/?lang=zh#narration', '/wiki/');
  assert.equal(leaf.pathname, '/wiki/topics/leaf-colors/');
  assert.equal(leaf.searchParams.get('view'), 'water');
  assert.equal(leaf.searchParams.get('lang'), 'zh'); assert.equal(leaf.hash, '#narration');
});
test('water and Sun deep links preserve experiment parameters and land in the intended chapter', () => {
  const cloud = new URL(waterHref('cloud', '?humidity=0&route=ice&lang=en&p=.8'), 'https://example.test');
  assert.equal(cloud.pathname, '/topics/rain-cycle/'); assert.equal(cloud.searchParams.get('view'), 'cloud');
  assert.equal(cloud.searchParams.get('humidity'), '0'); assert.equal(cloud.searchParams.get('route'), 'ice');
  const star = new URL(stellarDestination('?distance=.6&lang=en', '#narration'), 'https://example.test');
  assert.equal(star.searchParams.get('chapter'), 'sun'); assert.equal(star.searchParams.get('distance'), '.6');
  assert.equal(star.searchParams.get('lang'), 'en'); assert.equal(star.hash, '#narration');
});
