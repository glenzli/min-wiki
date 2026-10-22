import test from 'node:test';
import assert from 'node:assert/strict';
import { ISLAND_CLASTS, islandClast } from '../surfaceClasts.ts';
import { oceanGeometryFrame, surfaceHeight, WATER_Y } from '../geometry3d.ts';

test('emerged clasts belong to finite fragment/cap layers, with sparse low angular proportions', () => {
  assert.ok(ISLAND_CLASTS <= 160);
  for (const p of [.45, .50, .58, .64, .72, .80, 1]) {
    const frame = oceanGeometryFrame(p, 'island', 'sustained');
    for (let i = 0; i < ISLAND_CLASTS; i++) {
      const clast = islandClast(frame, i);
      assert.ok(clast.position.every(Number.isFinite));
      assert.ok(clast.dimensions[1] < clast.dimensions[0] * .34);
      if (clast.visible) {
        assert.ok(frame.history.units[clast.unit].growth > .08);
        assert.ok(clast.position[1] < surfaceHeight(frame, clast.position[0], clast.position[2]));
      }
    }
  }
  const limited = oceanGeometryFrame(1, 'island', 'limited');
  for (let i = 0; i < ISLAND_CLASTS; i++) assert.equal(islandClast(limited, i).visible, false);
});

test('later rock buries early clasts instead of lifting them onto the emerged surface', () => {
  const later = oceanGeometryFrame(.80, 'island', 'sustained');
  let buried = 0;
  for (let i = 0; i < ISLAND_CLASTS; i++) {
    const b = islandClast(later, i);
    const deposited = oceanGeometryFrame(later.history.units[b.unit].end, 'island', 'sustained');
    const a = islandClast(deposited, i);
    if (a.unit > 18) continue;
    assert.equal(a.position[0], b.position[0]); assert.equal(a.position[2], b.position[2]);
    assert.ok(b.position[1] <= a.position[1] + .000001);
    const exposed = islandClast(oceanGeometryFrame(later.history.units[b.unit].start + .024, 'island', 'sustained'), i);
    if (exposed.visible && b.buried) buried++;
    if (b.buried) assert.equal(b.visible, false);
  }
  assert.ok(buried > 5);
  const final = oceanGeometryFrame(1, 'island', 'sustained');
  for (let i = 0; i < ISLAND_CLASTS; i++) {
    const clast = islandClast(final, i);
    assert.ok(clast.position[1] <= islandClast(later, i).position[1] + 1e-6, 'erosion cannot suspend old clasts above the rock');
  }
  const sample = islandClast(later, 0); islandClast(oceanGeometryFrame(.50, 'island', 'sustained'), 0); assert.deepEqual(islandClast(later, 0), sample);
  assert.ok(surfaceHeight(later, sample.position[0], sample.position[2]) > WATER_Y);
});
