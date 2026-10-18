import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialState, selectDemo, selectTask, answerTask, selectClaim, checkClaim, taskMatches, evidenceMatches } from '../model.ts';

test('AI activities retain distinct histories when switching examples and returning', () => {
  let s = answerTask(initialState(), 'help');
  s = checkClaim(s, 'count');
  s = selectTask(s, 3); s = answerTask(s, 'keep');
  s = selectClaim(s, 1); s = checkClaim(s, 'count');
  assert.equal(evidenceMatches(s), false);
  s = selectDemo(s, 'image');
  s = selectTask(s, 0); s = selectClaim(s, 0);
  assert.equal(taskMatches(s), true); assert.equal(evidenceMatches(s), true);
  assert.equal(s.answers[3], 'keep');
  assert.equal(initialState().answers[0], null);
});
test('creative work allows human-first choices; privacy has direct disclosure choices', () => {
  for (const task of [0, 1]) {
    assert.equal(taskMatches(answerTask(selectTask(initialState(), task), 'observe')), true);
    assert.equal(taskMatches(answerTask(selectTask(initialState(), task), 'help')), true);
  }
  const privacy = selectTask(initialState(), 3);
  assert.equal(answerTask(privacy, 'help'), privacy);
  assert.equal(taskMatches(answerTask(privacy, 'keep')), true);
  assert.equal(taskMatches(answerTask(privacy, 'share')), false);
});
test('evidence is claim-specific; confidence and repeated selection never verify an unsupported claim', () => {
  let s = selectClaim(initialState(), 2);
  s = checkClaim(s, 'count'); assert.equal(evidenceMatches(s), false);
  s = checkClaim(s, 'test'); assert.equal(evidenceMatches(s), false);
  s = checkClaim(s, 'adult'); assert.equal(evidenceMatches(s), true);
  assert.equal(selectClaim(s, Infinity), s);
  assert.equal(selectTask(s, -1), s);
});
test('editorial activity data provides paired text and explicit finite examples', () => {
  const data = JSON.parse(readFileSync(new URL('../content.json', import.meta.url), 'utf8'));
  function pairs(value: unknown) {
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    if ('zh' in object || 'en' in object) {
      assert.equal(typeof object.zh, 'string'); assert.equal(typeof object.en, 'string');
      assert.ok(String(object.zh).trim()); assert.ok(String(object.en).trim());
      assert.ok(!/[\u3400-\u9fff]/.test(String(object.en)));
    } else Object.values(object).forEach(pairs);
  }
  pairs(data);
  assert.deepEqual(Object.keys(data.demos), ['chat', 'image', 'recognize']);
  assert.equal(data.tasks.length, initialState().answers.length);
  assert.equal(data.claims.length, initialState().checked.length);
});
