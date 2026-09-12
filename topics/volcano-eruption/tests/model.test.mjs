import test from 'node:test';
import assert from 'node:assert/strict';
import { ventPositions, supplyPerVent, explosivity, activity } from '../model.ts';
test('multiple vents divide a fixed supply without multiplying it', () => {
  for (const count of [1, 3]) assert.equal(ventPositions(count).length * supplyPerVent(count), 1);
  assert.ok(ventPositions(3).some(x => x < 0) && ventPositions(3).some(x => x > 0));
});
test('gas retention tendency and eruption activity remain bounded', () => {
  assert.ok(explosivity({ gas: .8, viscosity: .9, vents: 1 }) > explosivity({ gas: .8, viscosity: .1, vents: 1 }));
  assert.equal(activity(0), 0); assert.equal(activity(1), 0); assert.ok(activity(.6) > .99);
});
