import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseState, serializeState } from '../model.ts';
import { parseBurgessState, parseBurgessJSON, serializeBurgessState, WAPTIA_SCALE } from '../burgess/model.ts';

test('legacy life URLs retain their meaning and gain a paused neutral-start Waptia observation', () => {
  const legacy = parseState({ view: 'plants', plant: 'seedfern', detail: 'surface', fossilProgress: '67' });
  assert.equal(legacy.view, 'plants'); assert.equal(legacy.plant, 'seedfern'); assert.equal(legacy.fossilProgress, 67);
  assert.equal(legacy.animal.progress, 0);
  assert.ok(!('playing' in legacy.animal));
  assert.deepEqual(parseState(serializeState(legacy)), legacy);
});
test('the same anatomical selection and paused pose survive gallery, language and URL snapshots', () => {
  const source = { part: 'limbs', camera: 'ventral', evidence: true, activity: 'paddle', progress: 67 };
  const animal = parseState({ view: 'animal', animal: JSON.stringify(source) });
  const other = parseState({ ...serializeState(animal), view: 'community' });
  const returned = parseState({ ...serializeState(other), view: 'animal' });
  assert.deepEqual(returned.animal, source);
  assert.equal(Object.keys(serializeState(returned)).length, 12);
  assert.ok(Object.keys(serializeState(returned)).length <= 20);
  assert.deepEqual(parseBurgessJSON(serializeBurgessState(source)), source);
});
test('untrusted nested URL data cannot inject anatomy, auto-play or non-finite motion', () => {
  for (const bad of ['[', 'x'.repeat(1025), '[]', 'null', '42', '{"progress":"50"}', '{"progress":1.5}', '{"progress":1e999}']) {
    assert.equal(parseBurgessJSON(bad).progress, 0);
  }
  const parsed = parseBurgessState({ part: '__proto__', camera: 'inside', evidence: 'true', activity: 'feeding', progress: 999, playing: true, limbs: 25 });
  assert.equal(parsed.part, 'whole'); assert.equal(parsed.camera, 'oblique'); assert.equal(parsed.evidence, false);
  assert.equal(parsed.activity, 'paddle'); assert.equal(parsed.progress, 100);
  assert.equal(Object.keys(parsed).length, 5);
  assert.equal(parseBurgessState({ progress: -5 }).progress, 0);
});
test('published dimensional and anatomical contract distinguishes fused segments from appendage pairs', () => {
  assert.equal(WAPTIA_SCALE.representativeBodyMm / WAPTIA_SCALE.millimetresPerUnit, 5);
  assert.equal(WAPTIA_SCALE.appendagePairs, 3 + WAPTIA_SCALE.postMaxillularPairs + WAPTIA_SCALE.lamellatePairs);
  assert.equal(WAPTIA_SCALE.visibleLamellateSegments, 5);
  assert.equal(WAPTIA_SCALE.limblessAbdominalSomites, 6);
  assert.equal(WAPTIA_SCALE.caudalRamusPseudosegments, 3);
});
test('the licensed fossil plate remains the exact original bytes, with attribution and bilingual constraints', () => {
  const bytes = readFileSync(new URL('../assets/waptia-fossils-fig1.jpg', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'ea1673e1a7f5d0399a17363079bd3839a6f75f3be720891db0a530349702bf18');
  const provenance = readFileSync(new URL('../assets/WAPTIA-PROVENANCE.md', import.meta.url), 'utf8');
  assert.match(provenance, /CC BY|Creative Commons Attribution/); assert.match(provenance, /USNM 139214/);
  const data = JSON.parse(readFileSync(new URL('../burgess/content.json', import.meta.url), 'utf8'));
  for (const part of Object.values(data.parts)) for (const field of ['name', 'record', 'reconstruction', 'unknown', 'detail']) {
    assert.ok(part[field].zh.length > 0); assert.ok(part[field].en.length > 0);
    assert.doesNotMatch(part[field].en, /[\u3400-\u9fff]/);
  }
});
