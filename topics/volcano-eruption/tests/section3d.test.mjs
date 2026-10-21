import test from 'node:test';
import assert from 'node:assert/strict';
import { dike, STORAGE } from '../magmaGeometry.ts';
import { sectionPoint, surfaceHeight, ROCK_BOTTOM, WORLD_SCALE } from '../eruptionGeometry.ts';
import { bedHeight, feederCenterline, intrusionSolid, SECTION_UNITS, STORAGE_GRID_BYTES, storageComplex, storageDistance, stratumSolid } from '../sectionGeometry.ts';

function checkSolid(data) {
  const { positions, uvs, indices } = data, count = positions.length / 3;
  assert.equal(uvs.length, count * 2);
  assert.ok(positions.every(Number.isFinite));
  assert.ok(indices.every(i => Number.isInteger(i) && i >= 0 && i < count));
  const edges = new Map(); let volume = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const ids = indices.slice(i, i + 3), p = ids.map(index => positions.slice(index * 3, index * 3 + 3));
    volume += (p[0][0] * (p[1][1] * p[2][2] - p[1][2] * p[2][1])
      + p[0][1] * (p[1][2] * p[2][0] - p[1][0] * p[2][2])
      + p[0][2] * (p[1][0] * p[2][1] - p[1][1] * p[2][0])) / 6;
    for (let edge = 0; edge < 3; edge++) {
      const a = ids[edge], b = ids[(edge + 1) % 3], key = Math.min(a, b) * count + Math.max(a, b);
      const prior = edges.get(key) ?? { count: 0, direction: 0 };
      prior.count++; prior.direction += a < b ? 1 : -1; edges.set(key, prior);
    }
  }
  assert.ok([...edges.values()].every(edge => edge.count === 2 && edge.direction === 0), 'closed, consistently oriented manifold');
  assert.ok(volume > 0, 'outward-facing solid with positive volume');
  return volume;
}

test('geological units are closed solids with ordered contacts under the same mountain', () => {
  for (const kind of ['shield', 'composite', 'scoria']) {
    for (let x = -8.5; x <= 8.5; x += .43) for (let z = -4; z <= 0; z += .5) {
      let below = ROCK_BOTTOM;
      for (let contact = 0; contact <= SECTION_UNITS; contact++) {
        const y = bedHeight(contact, x, z, kind);
        assert.ok(y >= below - 1e-10, 'contacts never cross');
        assert.ok(y <= surfaceHeight(x, z, kind) + 1e-10);
        below = y;
      }
    }
    let volume = 0;
    for (let unit = 0; unit < SECTION_UNITS; unit++) volume += checkSolid(stratumSolid(unit, kind, 32, 6));
    assert.ok(volume > 100, 'actual depth behind the section');
    assert.equal(bedHeight(SECTION_UNITS, 1, 0, kind), surfaceHeight(1, 0, kind), 'exposed roof meets the same terrain');
  }
  const a = bedHeight(2, -3, 0, 'composite') - bedHeight(1, -3, 0, 'composite');
  const b = bedHeight(2, 3, 0, 'composite') - bedHeight(1, 3, 0, 'composite');
  assert.ok(Math.abs(a - b) > .02, 'unequal contact thickness');
});

test('the storage complex is a closed volumetric region containing every original storage anchor', () => {
  const body = storageComplex(), rind = storageComplex(.085);
  const volume = checkSolid(body), rindVolume = checkSolid(rind);
  assert.ok(volume > 2 && rindVolume > volume);
  assert.ok(STORAGE_GRID_BYTES < 1024 * 1024);
  assert.ok(body.positions.length / 3 < 60000, 'bounded isosurface');
  const depths = body.positions.filter((_, i) => i % 3 === 2);
  assert.ok(Math.max(...depths) - Math.min(...depths) > 1.6, 'no flattened front/back extrusion');
  for (const s of STORAGE) assert.ok(storageDistance(...sectionPoint([s.x, s.y])) < 0);
  for (let i = 0; i < body.positions.length; i += 3) {
    const [x, y, z] = body.positions.slice(i, i + 3);
    assert.ok(y > ROCK_BOTTOM);
    for (const kind of ['shield', 'composite', 'scoria']) assert.ok(y < surfaceHeight(x, z, kind), 'storage stays underground');
  }
  const again = storageComplex();
  assert.deepEqual(again, body);
  body.positions[0] += 1;
  assert.notEqual(body.positions[0], again.positions[0], 'independent mutable scene buffers');
});

test('closed intrusive sheets keep fractional tips on the original path and do not reset on seeking', () => {
  for (const vent of [-80, 0, 80]) {
    const end = 115 - surfaceHeight(vent * WORLD_SCALE, 0, 'composite') / WORLD_SCALE;
    const path = dike(vent, end).map(point => sectionPoint(point, .06));
    let previousVolume = 0;
    for (const front of [.01, .173, .529, .87, 1]) {
      const sheet = intrusionSolid(path, .07, .57, front), volume = checkSolid(sheet);
      assert.ok(volume > previousVolume); previousVolume = volume;
      const expected = sectionPoint(dike(vent, end, front).at(-1), .06), tip = sheet.positions.slice(-3);
      for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(expected[axis] - tip[axis]) < 1e-10);
      const depths = sheet.positions.filter((_, i) => i % 3 === 2);
      assert.ok(Math.max(...depths) - Math.min(...depths) > .8);
    }
    const forward = intrusionSolid(path, .07, .57, .529);
    intrusionSolid(path, .07, .57, 1);
    assert.deepEqual(intrusionSolid(path, .07, .57, .529), forward);
  }
});

test('revealed intrusion remains below the terrain and its deep feeder enters through the base', () => {
  for (const kind of ['shield', 'composite', 'scoria']) {
    const end = 115 - surfaceHeight(0, 0, kind) / WORLD_SCALE;
    const path = dike(0, end).map(point => sectionPoint(point, .06));
    const sheet = intrusionSolid(path, .07, .57, 1, (x, z) => surfaceHeight(x, z, kind));
    for (let i = 0; i < sheet.positions.length; i += 3) {
      const [x, y, z] = sheet.positions.slice(i, i + 3);
      assert.ok(y <= surfaceHeight(x, z, kind) - .0119);
    }
  }
  assert.ok(feederCenterline(0)[0][1] < ROCK_BOTTOM);
});
