import test from 'node:test';
import assert from 'node:assert/strict';
import { createInspectionMotion, createCutawayMotion } from '../inspectionMotion.ts';
import { focusBox, wholeBox, type Box } from '../model.ts';

test('sampled inspection keeps exact camera endpoints, aspect and replay without another clock', () => {
  const motion = createInspectionMotion();
  try {
    for (const [from, to] of [
      [wholeBox('animal'), focusBox('animal', 'mitochondrion')],
      [focusBox('plant', 'nucleus'), focusBox('plant', 'chloroplast')],
      [{ x: 0, y: 0, width: 980, height: 550 }, { x: 550, y: 76, width: 378, height: 274 }],
    ] as [Box, Box][]) {
      assert.deepEqual(motion.sample(from, to, 0), from);
      assert.deepEqual(motion.sample(from, to, 1), to);
      const middle = motion.sample(from, to, .43);
      motion.sample(from, to, .91); motion.sample(from, to, .08);
      assert.deepEqual(motion.sample(from, to, .43), middle);
      for (let i = 0; i <= 100; i++) {
        const p = i / 100, box = motion.sample(from, to, p);
        assert.ok(Object.values(box).every(Number.isFinite));
        assert.ok(box.width > 0 && box.height > 0);
        const expected = from.height / from.width * (1 - p) + to.height / to.width * p;
        assert.ok(Math.abs(box.height / box.width - expected) < 1e-10);
        assert.ok(box.width <= Math.max(from.width, to.width) * 1.14);
      }
    }
  } finally { motion.dispose(); motion.dispose(); }
});

test('a reversible cutaway veil retains bounded opacity and the selected final state', () => {
  for (const [from, to] of [[0, 1], [.63, 0], [.21, .87]]) {
    const motion = createCutawayMotion(from!, to!);
    try {
      const middle = motion.sample(.35);
      motion.sample(1); motion.sample(0);
      assert.equal(motion.sample(.35), middle);
      assert.equal(motion.sample(0), from);
      assert.equal(motion.sample(1), to);
      for (let i = 0; i <= 50; i++) assert.ok(motion.sample(i / 50) >= Math.min(from!, to!) && motion.sample(i / 50) <= Math.max(from!, to!));
    } finally { motion.dispose(); }
  }
});
