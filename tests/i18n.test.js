import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLanguage, languageHref, translator } from '../src/platform/i18n.ts';

test('language precedence is URL, saved preference, browser, then Chinese', () => {
  assert.equal(resolveLanguage('en', 'zh-CN', 'zh-TW'), 'en');
  assert.equal(resolveLanguage('zh', 'en', 'en-US'), 'zh-CN');
  assert.equal(resolveLanguage('zh-CN', 'en', 'en-US'), 'zh-CN');
  assert.equal(resolveLanguage('invalid', 'en', 'zh-CN'), 'en');
  assert.equal(resolveLanguage(null, null, 'en-GB'), 'en');
  assert.equal(resolveLanguage(null, null, 'zh-TW'), 'zh-CN');
  assert.equal(resolveLanguage(null, 'invalid', 'fr'), 'zh-CN');
});

test('language links retain filters, encoded input and anchors', () => {
  const href = languageHref('/?category=universe&q=black+hole&lang=zh-CN#explore', 'en');
  const url = new URL(href, 'https://example.test');
  assert.equal(url.searchParams.get('lang'), 'en');
  assert.equal(url.searchParams.get('q'), 'black hole');
  assert.equal(url.searchParams.get('category'), 'universe');
  assert.equal(url.hash, '#explore');
  assert.equal(languageHref('/topics/solar-system/', 'zh-CN'), '/topics/solar-system/?lang=zh');
});

test('translations interpolate, pluralize and stay scoped to their namespace and language', () => {
  const en = translator('common', undefined, 'en');
  const zh = translator('common', undefined, 'zh-CN');
  assert.equal(en('{{count}} 个演示', { count: 1 }), '1 demo');
  assert.equal(en('{{count}} 个演示', { count: 3 }), '3 demos');
  assert.equal(zh('{{count}} 个演示', { count: 1 }), '1 个演示');
  const topic = translator('test-topic', { '太阳': 'Sun', '第{{step}}步：{{label}}': 'Step {{step}}: {{label}}' }, 'en');
  assert.equal(topic('太阳'), 'Sun');
  assert.equal(topic('第{{step}}步：{{label}}', { step: 2, label: 'Earth' }), 'Step 2: Earth');
  assert.equal(topic('小小百科'), 'Little Encyclopedia');
  assert.equal(en('太阳'), '太阳');
  assert.equal(zh('小小百科'), '小小百科');
});

test('subpath hosting keeps catalog, topic and language-switch links inside the app', () => {
  assert.equal(languageHref('/', 'en', '/encyclopedia/'), '/encyclopedia/?lang=en');
  assert.equal(languageHref('/topics/solar-system/', 'zh-CN', '/encyclopedia/'), '/encyclopedia/topics/solar-system/?lang=zh');
  assert.equal(languageHref('/encyclopedia/?category=earth&q=day#explore', 'en', '/encyclopedia/'), '/encyclopedia/?category=earth&q=day&lang=en#explore');
  assert.equal(languageHref('https://example.test/encyclopedia/topics/black-hole/?lang=zh#references', 'en', '/encyclopedia/'), '/encyclopedia/topics/black-hole/?lang=en#references');
  assert.equal(languageHref('/encyclopedia-other/', 'en', '/encyclopedia/'), '/encyclopedia/encyclopedia-other/?lang=en');
});
