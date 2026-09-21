import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkState, legacyCellURL, readCellRoute, SPECIALISMS, workPhase } from '../exploration.ts';
import { hasPart } from '../model.ts';

test('six specialised experiments keep distinct mutable progress and view states', () => {
  const states = createWorkState(); states.muscle.progress = .52; states.muscle.zoom = 1; states.oxygen.progress = .7;
  for (const kind of SPECIALISMS) if (kind !== 'muscle' && kind !== 'oxygen') assert.deepEqual(states[kind], { progress: 0, zoom: 0 });
  assert.equal(states.muscle.progress, .52); assert.equal(states.oxygen.zoom, 0);
  assert.deepEqual(createWorkState().muscle, { progress: 0, zoom: 0 });
});
test('specialist route does not broaden the typical animal cell checklist', () => {
  assert.deepEqual(readCellRoute('?chapter=work&case=oxygen'), { chapter: 'work', example: 'oxygen' });
  assert.deepEqual(readCellRoute('?chapter=nope&case=virus'), { chapter: 'structure', example: 'barrier' });
  assert.equal(hasPart('animal', 'nucleus'), true);
  assert.equal(workPhase('neuron', .79), 1); assert.equal(workPhase('neuron', .81), 2);
  assert.equal(workPhase('defence', .76), 1); assert.equal(workPhase('defence', .78), 2);
});
test('old body and blood URLs enter the corresponding experiment, not a generic landing', () => {
  for (const [source, kind] of [['body-cells', 'barrier'], ['blood-cells', 'oxygen']] as const) {
    const target = legacyCellURL(`https://wiki.test/base/topics/${source}/?lang=en#sources`, '/base/', source);
    assert.equal(target.pathname, '/base/topics/cells/'); assert.equal(target.searchParams.get('chapter'), 'work');
    assert.equal(target.searchParams.get('case'), kind); assert.equal(target.searchParams.get('lang'), 'en'); assert.equal(target.hash, '#sources');
  }
  assert.equal(legacyCellURL('https://wiki.test/topics/body-cells/?kind=neuron', '/', 'body-cells').searchParams.get('case'), 'neuron');
  assert.equal(legacyCellURL('https://wiki.test/topics/blood-cells/?case=muscle', '/', 'blood-cells').searchParams.get('case'), 'oxygen');
});
