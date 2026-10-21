import test from 'node:test';
import assert from 'node:assert/strict';
import { historyFrame, historyHeight, historyTerrain, historyStratum, historyFlow, historyIntrusion, historySites, historyField, HISTORY_FIELD_SIZE, HISTORY_UNITS } from '../landscapeGeometry.ts';
import { surfaceHeight } from '../eruptionGeometry.ts';
import { landState } from '../projectModel.ts';

test('3D history retains the original 18 deposit births and independent ecological clock', () => {
  for (const p of [0, .08, .22, .43, .61, .8, 1]) {
    const frame = historyFrame(p, 'landscape');
    assert.deepEqual(frame.land, landState(p));
    for (let i = 0; i < 18; i++) assert.ok(Math.abs(frame.contacts[i + 1] - frame.contacts[i] - frame.land.deposits[i].growth / 18) < 1e-12);
  }
  assert.deepEqual(historyFrame(.12, 'life').contacts, historyFrame(1, 'life').contacts);
  assert.equal(historyFrame(.12, 'life').land.activity, 0);
  assert.equal(historyFrame(1, 'landscape', 'eroded').vegetation, 0);
});
test('mature history and the single-episode view retain exactly the same mountain surface', () => {
  for (const kind of ['shield', 'composite']) for (let x = -8.4; x <= 8.4; x += .23) for (const z of [-2.7, 0, 3.3]) {
    assert.equal(historyHeight(x, z, kind), surfaceHeight(x, z, kind));
    assert.ok(historyHeight(x, z, kind, 1, 1) <= surfaceHeight(x, z, kind) + 1e-12);
  }
});
test('completed contacts persist when later layers enter; closed units have finite stable buffers', () => {
  for (const kind of ['shield', 'composite']) {
    const a = historyFrame(.3, 'landscape'), b = historyFrame(.45, 'landscape');
    assert.deepEqual(historyStratum(4, kind, a, 24, 4).positions, historyStratum(4, kind, b, 24, 4).positions);
    for (const p of [0, .08, .43, 1]) for (let unit = 0; unit < HISTORY_UNITS; unit++) {
      const data = historyStratum(unit, kind, historyFrame(p, 'landscape'), 24, 4);
      assert.ok(data.positions.every(Number.isFinite)); assert.ok(data.uvs.every(Number.isFinite));
      assert.ok(data.indices.every(i => i >= 0 && i < data.positions.length / 3));
      const row = 5, plane = 25 * row;
      for (let i = 0; i < plane; i++) assert.ok(data.positions[(i + plane) * 3 + 1] >= data.positions[i * 3 + 1] - 1e-9, `inverted bed: ${kind},${p},${unit},${i}`);
    }
  }
});
test('history flow strips cool in place and remain grounded when progress is reversed', () => {
  const frame = historyFrame(.5, 'landscape');
  for (const kind of ['shield', 'composite']) for (let i = 0; i < 6; i++) {
    const data = historyFlow(i, kind, frame, 20, 4);
    for (let j = 0; j < data.positions.length; j += 3) {
      const [x, y, z] = data.positions.slice(j, j + 3);
      assert.ok(y >= historyHeight(x, z, kind, frame.land.growth) - 1e-9);
    }
    assert.equal(historyFlow(i, kind, historyFrame(1, 'life')).visible, false);
    assert.deepEqual(historyFlow(i, kind, frame, 20, 4), data);
  }
});
test('erosion truncates upper contacts without compressing the buried deposit stack', () => {
  for (const kind of ['shield', 'composite']) {
    const before = historyStratum(4, kind, historyFrame(.74, 'landscape', 'eroded'), 24, 4);
    const after = historyStratum(4, kind, historyFrame(1, 'landscape', 'eroded'), 24, 4);
    for (let i = 1; i < before.positions.length; i += 3) assert.equal(after.positions[i], before.positions[i]);
  }
});
test('exposed intrusive sheets retain finite thickness below the current roof', () => {
  for (const kind of ['shield', 'composite']) for (const p of [.1, .43, 1]) {
    const frame = historyFrame(p, 'landscape'), data = historyIntrusion(kind, frame);
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < data.positions.length; i += 3) {
      const [x, y, z] = data.positions.slice(i, i + 3); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      assert.ok(y < historyHeight(x, z, kind, frame.land.growth) + 1e-9);
    }
    assert.ok(maxZ - minZ > .6);
  }
});
test('ecological sites stay on the same surface across environments and cover responds to limitations', () => {
  const wet = historyFrame(1, 'life', 'green', 'wet');
  for (const kind of ['shield', 'composite']) {
    const sites = historySites(kind, wet);
    for (const habitat of ['dry', 'cold', 'buried']) {
      const limited = historySites(kind, historyFrame(1, 'life', 'green', habitat));
      assert.deepEqual(limited.map(s => [s.index, s.x, s.y, s.z]), sites.map(s => [s.index, s.x, s.y, s.z]));
      assert.ok(limited.reduce((sum, s) => sum + s.cover, 0) < sites.reduce((sum, s) => sum + s.cover, 0));
    }
    const field = historyField(kind, wet); assert.equal(field.length, HISTORY_FIELD_SIZE ** 2 * 4);
    assert.deepEqual(historyField(kind, wet), field);
    assert.equal(historyField(kind, historyFrame(0, 'life')).some((v, i) => i % 4 === 0 && v > 0), false);
  }
});
