import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readWorkspace, writeWorkspace, microbialHref, currentProgress, currentLimit, seekWorkspace, WorkspaceClock } from '../workspaceModel.ts';
import { SceneLease } from '../sceneLifecycle.ts';
import { namespaceSvg } from '../workspaceRenderer.ts';
import { divisionState } from '../../bacteria/model.ts';
import { sampleCycle } from '../../viruses/model.ts';
const advance = (clock, state, count = 2000) => { for (let i = 0; i < count; i++) clock.tick(state, .03); };

test('old routes enter exact chapters and retain base, language, applicable parameters and hash', () => {
  const bacteria = microbialHref('bacteria', '?lang=en&chapter=viruses&part=dna&process=division&bp=.5', '/wiki/', '#mechanism');
  const url = new URL(bacteria, 'https://example.test');
  assert.equal(url.pathname, '/wiki/topics/microbes-everywhere/'); assert.equal(url.hash, '#mechanism'); assert.equal(url.searchParams.get('lang'), 'en');
  const state = readWorkspace(url.search); assert.equal(state.chapter, 'bacteria'); assert.equal(state.part, 'dna'); assert.equal(state.bacteria.ready.division, .5);
  const virus = new URL(microbialHref('viruses', '?host=defended&p=3&view=inside', '/'), 'https://example.test');
  const v = readWorkspace(virus.search); assert.equal(v.chapter, 'viruses'); assert.equal(v.view, 'inside'); assert.equal(v.viruses.defended, 2);
});
test('route validation rejects malformed identifiers and nonfinite process inputs', () => {
  const state = readWorkspace('?chapter=bad&habitat=bad&resources=bad&part=bad&host=bad&view=bad&bp=NaN&exchange=Infinity&p=-6');
  assert.equal(state.chapter, 'environment'); assert.equal(state.habitat, 'soil'); assert.equal(state.part, 'membrane'); assert.equal(state.bacteria.ready.division, 0); assert.equal(state.bacteria.ready.exchange, 0); assert.equal(state.viruses.compatible, 0);
  assert.equal(readWorkspace('?resources=limited&bp=4').bacteria.limited.division, .18);
});
test('current chapter state survives URL serialization without deleting foreign valid parameters', () => {
  const before = readWorkspace('?chapter=viruses&habitat=air&host=mismatch&view=attachment&p=.8&part=ribosomes&close=1');
  const query = writeWorkspace(before, '?lang=en&reference=kept');
  const after = readWorkspace(query); assert.deepEqual(after, before); assert.ok(query.includes('reference=kept')); assert.ok(query.includes('lang=en'));
});
test('chapters and camera selection preserve the meaningful process state and identities', () => {
  const state = readWorkspace('?chapter=bacteria&process=division&bp=.6&habitat=water');
  state.chapter = 'viruses'; seekWorkspace(state, 1.67);
  const original = sampleCycle(state.viruses.compatible, state.host);
  state.view = 'attachment'; assert.deepEqual(sampleCycle(state.viruses.compatible, state.host), original);
  state.chapter = 'environment'; state.closer = true; state.chapter = 'bacteria';
  assert.equal(currentProgress(state), .6); assert.equal(state.habitat, 'water');
});
test('resource conditions are distinct remembered comparisons, not an impossible reverse division', () => {
  const state = readWorkspace('?chapter=bacteria&process=division&bp=.75');
  state.resources = 'limited'; assert.equal(currentProgress(state), 0); seekWorkspace(state, 1); assert.equal(currentProgress(state), .18);
  assert.equal(divisionState(currentProgress(state)).copy, 0);
  state.resources = 'ready'; assert.equal(currentProgress(state), .75); assert.equal(currentLimit(state), 1);
});
test('finite playback respects growth limitation and does not claim actual species-specific rates', () => {
  const state = readWorkspace('?chapter=bacteria&process=division&resources=limited');
  const clock = new WorkspaceClock(); clock.ready = true; clock.start(state); advance(clock, state);
  assert.equal(currentProgress(state), .18); assert.equal(clock.playing, false); assert.equal(divisionState(currentProgress(state)).copy, 0);
  state.resources = 'ready'; clock.start(state); advance(clock, state);
  assert.equal(currentProgress(state), 1); assert.equal(divisionState(currentProgress(state)).copy, 1);
});
test('host mismatch and defense have different barriers and cannot create offspring', () => {
  const state = readWorkspace('?chapter=viruses'); const clock = new WorkspaceClock(); clock.ready = true;
  for (const host of ['mismatch', 'defended']) {
    state.host = host; clock.start(state); advance(clock, state);
    const result = sampleCycle(currentProgress(state), state.host); assert.ok(result.offspring.every(child => child.birth === 0 && child.release === 0));
    assert.equal(result.entry, host === 'mismatch' ? 0 : 1);
  }
  state.host = 'compatible'; clock.start(state); advance(clock, state); assert.equal(currentProgress(state), 5);
  state.host = 'defended'; assert.equal(currentProgress(state), 2);
});
test('resource comparison is not silently mapped into the distinct virus-host model', () => {
  const state = readWorkspace('?chapter=viruses&p=3.5'); const before = sampleCycle(currentProgress(state), state.host);
  state.resources = 'limited'; assert.deepEqual(sampleCycle(currentProgress(state), state.host), before);
});
test('user start, readiness, hidden pause and disposal prevent background progress', () => {
  const state = readWorkspace('?chapter=bacteria&process=division'); const clock = new WorkspaceClock();
  clock.start(state); assert.equal(clock.playing, false); clock.ready = true; assert.equal(clock.playing, false);
  clock.start(state); clock.tick(state, .1); clock.hide(); const p = currentProgress(state); advance(clock, state); assert.equal(currentProgress(state), p);
  clock.visible = true; assert.equal(clock.playing, false); clock.start(state); clock.dispose(); advance(clock, state); assert.equal(currentProgress(state), p);
});
test('latest scene admission rejects stale completion and preserves retry after failure', async () => {
  const lease = new SceneLease(); const accepted = []; let first;
  const pending = lease.request(() => new Promise(resolve => { first = resolve; }), value => accepted.push(value), () => accepted.push('error'));
  await lease.request(async () => 'new', value => accepted.push(value), () => accepted.push('error')); first('old'); await pending; assert.deepEqual(accepted, ['new']);
  await lease.request(async () => { throw new Error('load'); }, value => accepted.push(value), () => accepted.push('error'));
  await lease.request(async () => 'retry', value => accepted.push(value), () => accepted.push('error')); assert.deepEqual(accepted, ['new', 'error', 'retry']);
});
test('cancelled or disposed asynchronous scenes cannot mount late', async () => {
  for (const action of ['cancel', 'dispose']) {
    const lease = new SceneLease(); let resolve; let accepted = false;
    const pending = lease.request(() => new Promise(done => { resolve = done; }), () => { accepted = true; }, () => assert.fail());
    lease[action](); resolve('late'); await pending; assert.equal(accepted, false);
  }
});
test('context reference owns a separate SVG namespace without duplicating scene IDs', () => {
  assert.equal(namespaceSvg('<g id="cell"><use href="#shape" fill="url(#light)"/></g>', 'context-'), '<g id="context-cell"><use href="#context-shape" fill="url(#context-light)"/></g>');
});
test('local bilingual content preserves separate specimens, limitations and all control keys', () => {
  const content = JSON.parse(readFileSync(new URL('../workspaceContent.json', import.meta.url), 'utf8'));
  const keys = (value, prefix = '') => Object.entries(value).flatMap(([key, item]) => typeof item === 'object' ? keys(item, `${prefix}${key}.`) : [`${prefix}${key}`]);
  assert.deepEqual(keys(content.zh), keys(content.en)); assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(content.en)));
  assert.ok(content.en.identities.bacteria.includes('thick')); assert.ok(content.en.identities.viruses.includes('thin'));
  assert.ok(content.en.resourceNote.includes('no universal growth rate'));
  assert.ok(content.en.limits.includes('safety'));
});
