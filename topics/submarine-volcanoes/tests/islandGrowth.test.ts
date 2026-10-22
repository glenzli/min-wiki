import test from 'node:test';
import assert from 'node:assert/strict';
import { islandAccretion } from '../model.ts';
import { islandDepositWeight, islandFlowBearing, islandVentSite } from '../islandGrowth.ts';

test('the shared island vent follows continuous deposited history across episode boundaries and seeking', () => {
  for (const supply of ['sustained', 'limited'] as const) {
    let prior = islandVentSite(islandAccretion(0, supply)), distance = 0;
    for (let step = 1; step <= 1000; step++) {
      const history = islandAccretion(step / 1000, supply), site = islandVentSite(history);
      const movement = Math.hypot(site[0] - prior[0], site[1] - prior[1]);
      assert.ok(site.every(Number.isFinite) && Math.abs(site[0]) < .45 && site[1] > .2 && site[1] < .85);
      assert.ok(movement < .025, 'an episode change cannot teleport the common source');
      assert.deepEqual(islandVentSite({ ...history, currentIndex: -1 }), site, 'the selected episode is not the source position');
      distance += movement; prior = site;
    }
    assert.ok(distance > 2, 'the source has an observable history rather than a constant anchor');
    const at = islandVentSite(islandAccretion(.58, supply));
    islandVentSite(islandAccretion(.12, supply));
    assert.deepEqual(islandVentSite(islandAccretion(.58, supply)), at);
  }
  const stopped = islandVentSite(islandAccretion(.5, 'limited'));
  assert.deepEqual(islandVentSite(islandAccretion(1, 'limited')), stopped);
});

test('every island deposit has a finite positive thickness field with retained directional identity', () => {
  const history = islandAccretion(.8);
  for (const unit of history.units) {
    let minimum = Infinity, maximum = -Infinity;
    for (let x = -3; x <= 3; x += .3) for (let z = -3; z <= 3; z += .3) {
      const value = islandDepositWeight(unit, x, z);
      assert.ok(Number.isFinite(value) && value > 0 && value < 2);
      minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
    }
    assert.ok(maximum - minimum > .2, 'new material has spatial structure instead of one uniform scale');
  }
  assert.ok(new Set(history.units.map(unit => islandFlowBearing(unit.index))).size > 12);
});

test('fragment packages retain an incomplete unequal rim and their original overflow bearing', () => {
  const history = islandAccretion(.8);
  for (const unit of history.units.filter(unit => unit.phase === 'shallow-fragments')) {
    const [x, z] = islandVentSite({ ...history, units: history.units.slice(0, unit.index + 1) });
    const bearing = islandFlowBearing(unit.index), c = Math.cos(bearing), s = Math.sin(bearing);
    const gap = islandDepositWeight(unit, x + c * .82, z + s * .82);
    const rimA = islandDepositWeight(unit, x - s * .82, z + c * .82);
    const rimB = islandDepositWeight(unit, x + s * .82, z - c * .82);
    assert.ok(Math.max(rimA, rimB) > gap + .35, 'the rim stays broken in the outflow direction');
    assert.ok(Math.abs(rimA - rimB) > .015, 'the two shoulders are unequal');
  }
});
