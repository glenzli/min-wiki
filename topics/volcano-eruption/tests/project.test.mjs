import test from 'node:test';
import assert from 'node:assert/strict';
import { landState, landSurface, caseFromSearch, legacyDestination, landCamera } from '../projectModel.ts';
import { landscapeMarkup } from '../landscapeScene.ts';

test('accumulated deposits persist through cooling and both later landscapes', () => {
  let last = 0;
  for (let i = 0; i <= 100; i++) {
    const state = landState(i / 100);
    assert.ok(state.growth >= last); last = state.growth;
  }
  const deposited = landState(.7).deposits;
  for (const aftermath of ['green', 'eroded']) {
    assert.deepEqual(landState(1, aftermath).deposits, deposited);
    assert.equal(landState(1, aftermath).activity, 0);
  }
  assert.equal(landState(1, 'green').erosion, 0);
  assert.equal(landState(1, 'eroded').vegetation, 0);
});
test('landforms differ geometrically and erosion removes rather than adds relief', () => {
  assert.ok(landSurface(650, 'shield', 1) < landSurface(650, 'scoria', 1));
  assert.ok(landSurface(500, 'composite', 1) < landSurface(500, 'shield', 1));
  for (const kind of ['shield', 'composite', 'scoria']) for (let x = 50; x <= 950; x += 5) {
    const original = landSurface(x, kind, 1), worn = landSurface(x, kind, 1, 1);
    assert.ok(worn >= original && worn <= 426);
    assert.equal(landSurface(x, kind, 0), 426);
  }
});
test('case URL validation and legacy routes retain language under a hosting prefix', () => {
  assert.equal(caseFromSearch('?case=lake'), 'lake');
  assert.equal(caseFromSearch('?case=../../escape'), 'scoria');
  assert.equal(legacyDestination('?lang=en&case=shield', 'lake', '/encyclopedia/'), '/encyclopedia/topics/volcano-eruption/?lang=en&case=lake');
  assert.equal(legacyDestination('', 'submarine'), '/topics/volcano-eruption/?case=submarine');
});
test('scene output is deterministic and views do not mutate process state', () => {
  for (const kind of ['shield', 'composite', 'scoria']) {
    const state = landState(.45);
    for (const view of ['landscape', 'section', 'vent']) assert.ok(landCamera(view, kind, .45).every(Number.isFinite));
    assert.deepEqual(landState(.45), state);
    const surface = landscapeMarkup(kind, 1, 'green', 0), cutaway = landscapeMarkup(kind, 1, 'green', 1);
    assert.equal(surface, landscapeMarkup(kind, 1, 'green', 0));
    assert.equal((surface.match(/data-deposit=/g) ?? []).length, 18);
    assert.equal((cutaway.match(/data-deposit=/g) ?? []).length, 18);
    assert.ok(!/NaN|Infinity/.test(surface));
  }
});

test('the scoria summit is a depressed bowl rather than a pointed cone', () => {
  for (const growth of [.3, .6, 1]) {
    const radius = 260 * (.22 + .78 * Math.sqrt(growth));
    const floor = landSurface(500, 'scoria', growth);
    const rim = landSurface(500 + radius * .24, 'scoria', growth);
    assert.ok(floor > rim);
    assert.ok(Math.abs((floor - rim) - 25 * growth) < 1e-8);
  }
});
