import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { narrationText, narrationStoryboard } from '../src/platform/learning/model.ts';

const catalog = JSON.parse(readFileSync(new URL('../content/catalog.json', import.meta.url), 'utf8'));

for (const topic of catalog.topics.filter(topic => topic.status === 'published')) {
  test(`${topic.id}: complete bilingual science notes and spoken narration`, () => {
    const content = JSON.parse(readFileSync(new URL(`../topics/${topic.id}/learning.json`, import.meta.url), 'utf8'));
    assert.equal(content.topicId, topic.id);
    assert.equal(content.version, 1);
    for (const locale of ['zh', 'en']) {
      const text = content[locale];
      for (const key of ['question', 'observe', 'misconception', 'boundary']) {
        assert.equal(typeof text[key], 'string', `${locale}.${key}`);
        assert.ok(text[key].trim().length > (key === 'question' ? 6 : 15), `${locale}.${key} needs a topic-specific explanation`);
      }
      assert.equal(text.academic.length, 3, `${locale} needs three mechanisms`);
      assert.equal(text.narration.length, 4, `${locale} needs four narration segments`);
      for (const note of text.academic) {
        assert.ok(note.title.trim().length > 0);
        assert.ok(note.body.trim().length > 55, `${locale} academic note needs an explanation`);
      }
      for (const segment of text.narration) {
        for (const key of ['label', 'text', 'cue']) assert.ok(segment[key].trim().length > 0, `${locale}.${key}`);
        assert.ok(!/<\/?[a-z][^>]*>/i.test(segment.text), 'spoken words must not contain markup');
      }
      if (locale === 'en') assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(text)), 'English notes must be fully translated');
    }
    assert.ok(content.references.length >= 2, 'references must accompany the deeper notes');
    for (const reference of content.references) {
      assert.equal(new URL(reference.url).protocol, 'https:');
      assert.ok(reference.title.trim());
    }
  });
}

test('voice export excludes labels and visual instructions; storyboard retains them', () => {
  const content = { narration: [
    { label: 'Before', text: '  Look at the seed.  ', cue: 'Show the dry seed.' },
    { label: 'After', text: 'A root grows down.', cue: 'Follow the root tip.' },
  ] };
  assert.equal(narrationText(content), 'Look at the seed.\n\nA root grows down.\n');
  const storyboard = narrationStoryboard(content);
  assert.ok(storyboard.includes('01 · Before\n[Show the dry seed.]'));
  assert.ok(storyboard.includes('02 · After\n[Follow the root tip.]'));
});
