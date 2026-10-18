import {readCatalog} from '../src/catalog/data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { projectLearning } from '../src/platform/learning/buildProjection.ts';
import { narrationText, narrationStoryboard } from '../src/platform/learning/model.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = readCatalog();

test('every published learning projection preserves its locale, references and exact narration exports', () => {
  for (const topic of catalog.topics.filter(topic => topic.status === 'published')) {
    const data = JSON.parse(readFileSync(new URL(`../topics/${topic.id}/learning.json`, import.meta.url), 'utf8'));
    const original = JSON.stringify(data);
    for (const locale of ['zh', 'en']) {
      const projected = projectLearning(data, locale);
      assert.deepEqual(Object.keys(projected).sort(), ['content', 'locale', 'references', 'topicId', 'version']);
      assert.equal(projected.locale, locale);
      assert.equal(projected.topicId, topic.id);
      assert.deepEqual(projected.content, data[locale]);
      assert.deepEqual(projected.references, data.references);
      assert.equal(narrationText(projected.content), narrationText(data[locale]));
      assert.equal(narrationStoryboard(projected.content), narrationStoryboard(data[locale]));
    }
    assert.equal(JSON.stringify(data), original, `${topic.id}: authored document was not changed`);
  }
});

test('each lazy reading loader selects one locale without a Vite runtime',()=>{
  const source=readFileSync(new URL('../src/platform/learning/resources.ts',import.meta.url),'utf8');
  for(const topic of catalog.topics.filter(t=>t.status==='published'))for(const locale of ['zh','en'])assert.ok(source.includes(`topics/${topic.id}/learning.json?pick=version,topicId,references,${locale}`));
  assert.doesNotMatch(source,/import\.meta\.glob|from ['"]vite/);
});
