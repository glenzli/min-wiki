import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPractice, reviewRegion, advance, canAdvance, regions } from '../model.ts';

test('handwashing lesson cannot bypass the five coverage explanations', () => {
  let state = advance(advance(initialPractice()));
  assert.equal(state.stage, 'rub');
  assert.equal(canAdvance(state), false);
  for (const region of regions.slice(0, -1)) state = reviewRegion(state, region);
  assert.equal(advance(state).stage, 'rub');
  state = reviewRegion(state, regions.at(-1));
  assert.equal(advance(state).stage, 'rinse');
});

test('repeat selection does not inflate the coverage count; selection outside rubbing does not mark it', () => {
  const wet = reviewRegion(initialPractice(), 'thumb');
  assert.deepEqual(wet.reviewed, []);
  let state = advance(advance(wet));
  state = reviewRegion(reviewRegion(state, 'thumb'), 'thumb');
  assert.deepEqual(state.reviewed, ['thumb']);
});

test('rinsing precedes drying and final state is bounded', () => {
  let state = advance(advance(initialPractice()));
  for (const region of regions) state = reviewRegion(state, region);
  state = advance(state);
  assert.equal(state.stage, 'rinse');
  state = advance(state);
  assert.equal(state.stage, 'dry');
  assert.equal(canAdvance(state), false);
  assert.deepEqual(advance(state), state);
  assert.deepEqual(initialPractice().reviewed, []);
});
