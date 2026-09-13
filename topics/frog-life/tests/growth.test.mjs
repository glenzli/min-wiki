import { test } from 'node:test';
import assert from 'node:assert/strict';
import { growthState, bodyPath } from '../model.ts';
test('development overlaps, hind limbs precede forelimbs, tail is absorbed', () => {
  assert.equal(growthState(0).tail, 0);
  assert.equal(growthState(1).hind, 0);
  assert.ok(growthState(2).hind > 0);
  assert.equal(growthState(2).front, 0);
  assert.ok(growthState(2.8).front > 0 && growthState(2.8).tail > 0);
  assert.equal(growthState(4).tail, 0);
  assert.equal(growthState(4).front, 1);
  for(let p=2.5;p<4;p+=0.01) assert.ok(growthState(p+0.01).tail <= growthState(p).tail);
});
test('all geometry stays continuous across milestones and reverses exactly', () => {
  for(let p=0.001;p<4;p+=0.001) {
    const a=growthState(p-0.001), b=growthState(p);
    for(const key of Object.keys(a)) assert.ok(Math.abs(a[key]-b[key])<1, `${key} jumps at ${p}`);
    assert.ok(!bodyPath(b.body).includes('NaN'));
  }
  const middle=growthState(2.71);
  growthState(4); growthState(0);
  assert.deepEqual(growthState(2.71), middle);
});
