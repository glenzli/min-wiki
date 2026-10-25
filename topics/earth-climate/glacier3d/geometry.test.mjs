import test from 'node:test';
import assert from 'node:assert/strict';
import { BufferGeometry } from 'three';
import { DETAIL, SMALL_DETAIL, buildTerrain, buildCutEdge, createIceGeometry, materialShape, updateIceTop, updateIceEnvelope, updateMoraine, updateRiver } from './geometry.ts';
import { LAND_BOUNDS, glacierPoint, terrainHeight, valleyCenter } from './landform.ts';

test('the fixed valley has a broad lower trough, higher flanks, a joined cut edge and deterministic detail', () => {
  for (const z of [-3.2, -1, 1.8]) {
    const center = valleyCenter(z), bed = terrainHeight(center, z);
    assert.ok(terrainHeight(center - 2.7, z) > bed + .6);
    assert.ok(terrainHeight(center + 2.7, z) > bed + .6);
    assert.ok(Math.abs(terrainHeight(center - .3, z) - bed) < .12);
    assert.ok(Math.abs(terrainHeight(center + .3, z) - bed) < .12);
  }
  assert.ok(terrainHeight(LAND_BOUNDS.halfWidth, 0) > LAND_BOUNDS.base);
  const a = buildTerrain(SMALL_DETAIL), b = buildTerrain(SMALL_DETAIL);
  assert.deepEqual(a.getAttribute('position').array, b.getAttribute('position').array);
  a.dispose(); b.dispose();
});

test('one bounded material shape grows in length and thickness while its underlying bed stays fixed', () => {
  const masses = [0, 1, 10, 42, 60, 120, 180], heights = [];
  let previous = null;
  for (const mass of masses) {
    const shape = materialShape(mass);
    if (previous) { assert.ok(shape.end >= previous.end); assert.ok(shape.thickness >= previous.thickness); }
    for (let j = 0; j <= 20; j++) for (let i = -10; i <= 10; i++) {
      const point = glacierPoint(shape, j / 20, i / 10);
      assert.ok([point.x, point.y, point.z, point.bed].every(Number.isFinite));
      assert.ok(point.y >= point.bed);
      assert.equal(point.bed, terrainHeight(point.x, point.z));
    }
    heights.push(terrainHeight(.6, .4)); previous = shape;
  }
  assert.equal(new Set(heights).size, 1);
  assert.equal(materialShape(-100).mass, 0); assert.equal(materialShape(300).mass, 180);
  assert.equal(materialShape(NaN).mass, 0);
});

function populate(tier, mass) {
  const geometry = [buildTerrain(tier), buildCutEdge(tier), createIceGeometry(tier).geometry, ...Array.from({ length: 4 }, () => new BufferGeometry())];
  const update = value => {
    const shape = materialShape(value);
    updateIceTop(geometry[2], tier, shape); updateIceEnvelope(geometry[3], tier, shape);
    updateMoraine(geometry[4], tier, shape, -1); updateMoraine(geometry[5], tier, shape, 1); updateRiver(geometry[6], tier, shape);
  };
  update(mass); return { geometry, update };
}

test('all terrain, ice envelope and debris surfaces remain within the scene budget and have finite normals', () => {
  for (const tier of [DETAIL, SMALL_DETAIL]) {
    const { geometry, update } = populate(tier, 42);
    const triangles = geometry.reduce((sum, item) => sum + item.index.count / 3, 0);
    assert.ok(triangles <= 60000);
    if (tier === SMALL_DETAIL) assert.ok(triangles < 25000);
    for (const mass of [1, 180, 60, 42]) {
      update(mass);
      for (const item of geometry) for (const attribute of ['position', 'normal']) assert.ok([...item.getAttribute(attribute).array].every(Number.isFinite));
    }
    geometry.forEach(item => item.dispose());
  }
});

test('mass changes reuse dynamic GPU attributes and rewind produces the same positions', () => {
  const { geometry, update } = populate(SMALL_DETAIL, 42);
  const buffers = geometry.map(item => item.getAttribute('position').array);
  const initial = geometry.map(item => Float32Array.from(item.getAttribute('position').array));
  update(180); update(1); update(42);
  geometry.forEach((item, i) => {
    assert.equal(item.getAttribute('position').array, buffers[i]);
    assert.deepEqual(item.getAttribute('position').array, initial[i]);
  });
  geometry.forEach(item => item.dispose());
});

test('the visible snout faces downstream instead of being culled as an inward-facing paper sheet', () => {
  const tier = SMALL_DETAIL, { geometry } = populate(tier, 60);
  const envelope = geometry[3], firstFrontVertex = tier.iceZ * 12 + tier.iceX * 4;
  const middleFront = firstFrontVertex + Math.floor(tier.iceX / 2) * 4;
  assert.ok(envelope.getAttribute('normal').getZ(middleFront) > .75);
  geometry.forEach(item => item.dispose());
});
