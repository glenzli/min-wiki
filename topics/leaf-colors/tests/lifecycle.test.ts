import test from 'node:test';
import assert from 'node:assert/strict';
import { leafLifeAt, leafPoint, legacyWaterURL, readLeafRoute } from '../lifecycle.ts';
import { pigmentsAt } from '../model.ts';
import { waterAt } from '../../plant-water/model.ts';
import { LeafScene } from '../scene.ts';

test('one leaf expands at a fixed attachment before separation and fall', () => {
  for (let i = 0; i <= 87; i++) {
    const state = leafLifeAt(i / 100);
    assert.equal(state.fall, 0);
    assert.deepEqual(leafPoint(19, 246, i / 100), { x: 19, y: 246 });
  }
  assert.ok(leafLifeAt(.34).size > leafLifeAt(0).size);
  assert.ok(leafLifeAt(.34).unfold > leafLifeAt(0).unfold);
  const final = leafLifeAt(1);
  assert.equal(final.separation, 1); assert.equal(final.transport, 0); assert.equal(final.stage, 'fallen');
  assert.notDeepEqual(leafPoint(19, 246, 1), { x: 19, y: 246 });
});
test('growth, resource recovery and separation have causal order and continuous geometry', () => {
  for (let i = 0; i <= 1000; i++) {
    const state = leafLifeAt(i / 1000);
    if (state.senescence > 0) assert.equal(state.growth, 1);
    if (state.separation > 0) assert.ok(state.recovery > 0);
    if (state.fall > 0) assert.equal(state.separation, 1);
  }
  for (const p of [.22, .28, .46, .48, .77, .81, .86, .87]) {
    const a = leafPoint(35, -12, p - 1e-7), b = leafPoint(35, -12, p + 1e-7);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .002);
  }
});
test('leaf age, water progress and yellow/red comparisons are independent', () => {
  const age = .71, state = leafLifeAt(age), tracked = leafPoint(35, -12, age), water = waterAt(.74);
  const yellow = pigmentsAt(state.senescence, 'yellow'), red = pigmentsAt(state.senescence, 'red');
  assert.equal(yellow.anthocyanins, 0); assert.ok(red.anthocyanins > 0);
  assert.equal(red.chlorophyll, yellow.chlorophyll);
  for (const p of [0, 1, .74]) { waterAt(p); assert.deepEqual(leafLifeAt(age), state); assert.deepEqual(leafPoint(35, -12, age), tracked); }
  assert.deepEqual(waterAt(.74), water);
  for (const p of [NaN, Infinity, -1, 0, .34, .7, 1, 2]) for (const value of Object.values(leafLifeAt(p))) if (typeof value === 'number') assert.ok(Number.isFinite(value));
});
test('legacy root-water links preserve language, base, hash and precise leaf view', () => {
  const target = legacyWaterURL('https://wiki.test/demo/topics/plant-water/?lang=en&view=leaf#sources', '/demo/');
  assert.equal(target.pathname, '/demo/topics/leaf-colors/');
  assert.equal(target.searchParams.get('lang'), 'en'); assert.equal(target.searchParams.get('view'), 'water'); assert.equal(target.hash, '#sources');
  assert.deepEqual(readLeafRoute('?view=water&age=.7'), { view: 'water', age: .7 });
  assert.deepEqual(readLeafRoute('?view=bad&age=oops'), { view: 'life', age: 0 });
});
test('retained mature water progress is hidden on both young and detached leaves', () => {
  const sceneState = { age: .34, waterVisible: true, waterProgress: .78, lifeDirty: false };
  for (const age of [.34, .15, .34, .86, 1, .34]) {
    LeafScene.prototype.setLife.call(sceneState as unknown as LeafScene, age, true, .78);
    assert.equal(sceneState.waterVisible, leafLifeAt(age).waterAvailable);
    assert.equal(sceneState.waterProgress, .78);
    assert.equal(sceneState.age, age);
  }
  assert.equal(leafLifeAt(.15).waterAvailable, false);
  assert.equal(leafLifeAt(.34).waterAvailable, true);
  assert.equal(leafLifeAt(.86).waterAvailable, false);
  assert.equal(leafLifeAt(1).waterAvailable, false);
  LeafScene.prototype.setLife.call(sceneState as unknown as LeafScene, .34, false, .78);
  assert.equal(sceneState.waterVisible, false);
});
