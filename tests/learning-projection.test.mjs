import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { learningProjectionPlugin, projectLearning } from '../src/platform/learning/buildProjection.ts';
import { narrationText, narrationStoryboard } from '../src/platform/learning/model.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(readFileSync(new URL('../content/catalog.json', import.meta.url), 'utf8'));

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

test('Vite emits separate executable locale chunks and leaves ordinary JSON imports bilingual', async () => {
  const entry = '\0learning-projection-test-entry';
  const document = JSON.parse(readFileSync(new URL('../topics/typhoon/learning.json', import.meta.url), 'utf8'));
  const result = await build({
    root, configFile: false, logLevel: 'silent',
    plugins: [learningProjectionPlugin(), {
      name: 'learning-projection-test-entry',
      resolveId(id) { if (id === entry) return id; },
      load(id) {
        if (id === entry) return `export const loaders = {
          zh: () => import('/topics/typhoon/learning.json?learning-locale=zh'),
          en: () => import('/topics/typhoon/learning.json?learning-locale=en'),
          original: () => import('/topics/typhoon/learning.json')
        };`;
      },
    }],
    build: { write: false, minify: true, rollupOptions: { input: entry, preserveEntrySignatures: 'strict' } },
  });
  const chunks = result.output.filter(item => item.type === 'chunk' && !item.isEntry);
  assert.equal(chunks.length, 3, 'two locale projections plus the unchanged original JSON');
  for (const locale of ['zh', 'en']) {
    const chunk = chunks.find(item => item.facadeModuleId?.includes(`learning-locale:${locale}:`));
    assert.ok(chunk, `${locale}: projected dynamic entry exists`);
    assert.equal(chunk.imports.length, 0, 'one complete payload, with no bilingual dependency');
    const loaded = await import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`);
    assert.deepEqual(loaded.default, projectLearning(document, locale));
    assert.ok(!chunk.code.includes(document[locale === 'en' ? 'zh' : 'en'].question), 'opposite-language content is absent');
  }
  const original = chunks.find(item => item.facadeModuleId?.endsWith('/topics/typhoon/learning.json'));
  assert.ok(original);
  const loaded = await import(`data:text/javascript;base64,${Buffer.from(original.code).toString('base64')}`);
  assert.deepEqual(loaded.default, document);
});
