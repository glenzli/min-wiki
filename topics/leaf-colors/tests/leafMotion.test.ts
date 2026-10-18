import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeafMotion, bladePoint } from '../leafMotion.ts';
import { leafLifeAt } from '../lifecycle.ts';

test('authored unfolding retains the petiole seam and ends before microscopy opens', () => {
  const motion = createLeafMotion();
  for (let i = 0; i <= 100; i++) {
    const pose = motion.sample(i / 100, 0);
    for (const x of [-6, 0, 6]) assert.deepEqual(bladePoint(x, 165, pose), [x, 165]);
    assert.ok(Object.values(pose).every(Number.isFinite));
    if (leafLifeAt(i / 100).growth > .9) assert.deepEqual(motion.sample(leafLifeAt(i / 100).growth, 0), motion.sample(1, 0));
  }
  motion.dispose();
});

test('unfolding and detached curl replay the same poses without a library clock', () => {
  const motion = createLeafMotion();
  const opening = motion.sample(.47, 0), curled = motion.sample(1, .62);
  motion.sample(0, 0); motion.sample(1, 1); motion.sample(.9, .2);
  assert.deepEqual(motion.sample(.47, 0), opening);
  assert.deepEqual(motion.sample(1, .62), curled);
  assert.deepEqual(motion.sample(NaN, Infinity), motion.sample(0, 0));
  motion.dispose(); motion.dispose();
  const frozen = motion.sample(0, 0);
  assert.deepEqual(motion.sample(1, 1), frozen);
});
