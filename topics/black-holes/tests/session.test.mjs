import test from 'node:test';
import assert from 'node:assert/strict';
import { SceneSlot } from '../session.ts';
import { CHAPTERS, LEGACY_CHAPTERS, chapterHref, readChapter } from '../routes.ts';

test('chapter routes preserve language and deployment base, rejecting unknown chapters', () => {
  assert.equal(readChapter('?chapter=planet&lang=en'), 'planet');
  assert.equal(readChapter('?chapter=not-a-chapter'), 'anatomy');
  assert.equal(readChapter(''), 'anatomy');
  for (const id of CHAPTERS) assert.equal(readChapter(new URL(chapterHref(id, '?lang=en', '/encyclopedia/'), 'https://example.test').search), id);
  assert.equal(chapterHref('companion', '?lang=en&chapter=bad', '/encyclopedia/'), '/encyclopedia/topics/black-holes/?lang=en&chapter=companion');
  assert.deepEqual(LEGACY_CHAPTERS, { 'black-hole': 'star', 'planet-black-hole': 'planet', 'galactic-center': 'companion' });
});
test('rapid chapter switching never instantiates a stale scene and disposes the previous one once', async () => {
  const slot = new SceneSlot(); let disposed = 0, staleMounted = 0, resolve;
  await slot.activate(async () => 'first', () => ({ dispose() { disposed++; } }));
  const pending = slot.activate(() => new Promise(done => { resolve = done; }), () => { staleMounted++; return { dispose() {} }; });
  assert.equal(disposed, 1); assert.equal(slot.current, null);
  const current = await slot.activate(async () => 'latest', () => ({ dispose() { disposed++; } }));
  resolve('obsolete'); assert.equal(await pending, null); assert.equal(staleMounted, 0); assert.equal(slot.current, current);
  slot.clear(); slot.clear(); assert.equal(disposed, 2);
});
test('leaving during an import prevents mounting, while current load failures are retryable', async () => {
  const slot = new SceneSlot(); let resolve;
  const pending = slot.activate(() => new Promise(done => { resolve = done; }), () => { throw new Error('must not mount'); });
  slot.clear(); resolve('late'); assert.equal(await pending, null);
  await assert.rejects(slot.activate(async () => { throw new Error('offline'); }, () => ({ dispose() {} })), /offline/);
  assert.equal(slot.current, null);
  const scene = await slot.activate(async () => 'retry', () => ({ dispose() {} })); assert.equal(slot.current, scene); slot.clear();
});
