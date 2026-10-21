import test from 'node:test';
import assert from 'node:assert/strict';
import { historyFrame, historyHeight, historySurface, historyDeformedY, historyTerrain, historyStratum, historyFlow, historyClasts, historyStorage, historyStorageDeform, historyStorageBody, historyStorageContour, historyStorageField, historyIntrusion, historySites, historyField, HISTORY_FIELD_SIZE, HISTORY_UNITS } from '../landscapeGeometry.ts';
import { sectionPoint, surfaceHeight, ROCK_BOTTOM, WORLD_SCALE } from '../eruptionGeometry.ts';
import { dike } from '../magmaGeometry.ts';
import { feederCenterline, intrusionSolid, storageComplex } from '../sectionGeometry.ts';
import { landDepositWindow, landState } from '../projectModel.ts';

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
test('history flow emplacement freezes material coordinates while later layers bury and cool it', () => {
  for (const kind of ['shield', 'composite']) for (let i = 0; i < 6; i++) {
    const birth = .08 + i * .065, end = birth + .10, active = historyFrame(birth + .04, 'landscape');
    const moving = historyFlow(i, kind, active, 20, 4), emitted = historyFlow(i, kind, historyFrame(end, 'landscape'), 20, 4);
    assert.ok(moving.mobility > 0 && moving.flux > 0 && moving.heat > 0); assert.ok(moving.length < emitted.length);
    for (let j = 0; j < moving.positions.length; j += 3) {
      const [x, y, z] = moving.positions.slice(j, j + 3); assert.ok(y > historySurface(x, z, kind, active));
    }
    for (const p of [end, Math.min(1, end + .12), .74, 1]) {
      const retained = historyFlow(i, kind, historyFrame(p, 'landscape'), 20, 4);
      assert.deepEqual(retained.positions, emitted.positions); assert.deepEqual(retained.uvs, emitted.uvs); assert.deepEqual(retained.indices, emitted.indices);
      assert.equal(retained.mobility, 0); assert.equal(retained.flux, 0);
    }
    const later = historyFlow(i, kind, historyFrame(1, 'landscape'), 20, 4);
    assert.equal(later.heat, 0); assert.ok(later.positions.some((y, at) => at % 3 === 1 && y < historySurface(later.positions[at - 1], later.positions[at + 1], kind, historyFrame(1, 'landscape')) - .02));
    assert.equal(historyFlow(i, kind, historyFrame(1, 'life')).visible, false);
    historyFlow(i, kind, historyFrame(.01, 'landscape'), 20, 4);
    assert.deepEqual(historyFlow(i, kind, active, 20, 4), moving);
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
      assert.ok(y < historySurface(x, z, kind, frame) + 1e-9);
    }
    assert.ok(maxZ - minZ > .6);
  }
});

test('flow tops retain full-course width, domed thickness and rounded noses with transport rows', () => {
  for (const kind of ['shield', 'composite']) for (let index = 0; index < 6; index++) {
    const frame = historyFrame(.18 + index * .065 + 1e-10, 'landscape'), data = historyFlow(index, kind, frame);
    assert.equal(data.positions.length, 65 * 11 * 3); assert.equal(data.uvs.length, 65 * 11 * 2);
    for (const row of [0, 8, 24, 40, 52, 60]) {
      const left = row * 11 * 3, right = left + 30;
      assert.ok(Math.hypot(data.positions[right] - data.positions[left], data.positions[right + 2] - data.positions[left + 2]) > .14, 'the body must not collapse to a line before its tip');
    }
    const angle = .32 + index * 2.399, along = vertex => data.positions[vertex * 3] * Math.cos(angle) + data.positions[vertex * 3 + 2] * Math.sin(angle);
    const nose = 64 * 11; assert.ok(along(nose + 5) > along(nose) + .05); assert.ok(Math.abs(along(nose + 5) - data.length) < 1e-9);
    for (const [segments, across] of [[20, 4], [13, 3], [8, 12]]) {
      const custom = historyFlow(index, kind, frame, segments, across);
      assert.equal(custom.positions.length, (segments + 1) * (across + 1) * 3); assert.ok(custom.positions.every(Number.isFinite));
      assert.ok(custom.indices.every(i => i >= 0 && i < custom.positions.length / 3));
    }
  }
});

test('representative clasts share deposit growth and stay within fixed total and airborne budgets', () => {
  for (const kind of ['shield', 'composite']) {
    const perLayer = kind === 'shield' ? 2 : 6;
    let maxAirborne = 0;
    for (let sample = 0; sample <= 1000; sample++) {
      const frame = historyFrame(sample / 1000, 'landscape'), clasts = historyClasts(kind, frame);
      assert.equal(clasts.length, 18 * perLayer);
      maxAirborne = Math.max(maxAirborne, clasts.filter(c => c.visible && !c.landed).length);
      for (const c of clasts) {
        assert.equal(c.index, c.layer * perLayer + c.rank); assert.equal(c.flight, frame.land.deposits[c.layer].growth);
        assert.ok(c.position.every(Number.isFinite)); assert.ok(c.radius >= .035 && c.radius <= .075);
        assert.ok(c.heat >= 0 && c.heat <= .56); assert.equal(c.landed, c.flight === 1);
        if (c.visible && !c.landed) {
          const [x, y, z] = c.position;
          assert.ok(y >= historySurface(x, z, kind, frame) + c.radius * .7 - 1e-10, 'flight must stay above the growing surface until its finite-radius landing contact');
        }
      }
    }
    assert.equal(maxAirborne, perLayer * 2); assert.ok(maxAirborne <= 12);
  }
});

test('clasts leave the common vent, meet their landing surface and retain actual material coordinates', () => {
  for (const kind of ['shield', 'composite']) {
    let covered = 0;
    for (let layer = 0; layer < 18; layer++) {
      const window = landDepositWindow(layer), launch = historyFrame(window.birth, 'landscape'), landing = historyFrame(window.end, 'landscape');
      const source = historyClasts(kind, launch).filter(c => c.layer === layer);
      for (const c of source) {
        assert.equal(c.visible, false); assert.equal(c.landed, false); assert.equal(c.birth, window.birth); assert.equal(c.landing, window.end);
        assert.equal(Math.abs(c.position[0]), 0); assert.equal(Math.abs(c.position[2]), 0);
        assert.equal(c.position[1], historySurface(0, 0, kind, launch) + c.radius);
      }
      const retained = historyClasts(kind, landing).filter(c => c.layer === layer);
      for (const c of retained) {
        const [x, y, z] = c.position, ground = historySurface(x, z, kind, landing);
        assert.ok(c.landed && c.visible); assert.ok(y - c.radius <= ground && y > ground);
        for (const p of [window.end, window.end + .02, .74, 1]) {
          const later = historyClasts(kind, historyFrame(p, 'landscape'))[c.index];
          assert.deepEqual(later.position, c.position); assert.equal(later.index, c.index); assert.equal(later.radius, c.radius);
        }
        const mature = historyFrame(1, 'landscape');
        if (y + c.radius < historySurface(x, z, kind, mature)) covered++;
      }
    }
    const mature = historyClasts(kind, historyFrame(1, 'landscape'));
    assert.ok(covered > mature.length * .75); assert.ok(mature.every(c => c.heat === 0));
    assert.ok(historyClasts(kind, historyFrame(1, 'life')).every(c => !c.visible));
    const target = historyClasts(kind, historyFrame(.27, 'landscape'));
    historyClasts(kind, historyFrame(1, 'landscape')); historyClasts(kind, historyFrame(0, 'landscape'));
    assert.deepEqual(historyClasts(kind, historyFrame(.27, 'landscape')), target);
  }
});

test('storage thermal windows fill and transfer locally while the crystal framework anchors stay fixed', () => {
  for (let index = 0; index < 3; index++) {
    const initial = historyStorage(index, historyFrame(0, 'landscape'));
    const charged = historyStorage(index, historyFrame(.06, 'landscape'));
    const transferring = historyStorage(index, historyFrame(.45, 'landscape'));
    const cold = historyStorage(index, historyFrame(.74, 'landscape'));
    assert.equal(initial.heat, 0); assert.equal(initial.transfer, 0); assert.equal(initial.visible, false);
    assert.ok(charged.fill > initial.fill && charged.heat > .9); assert.equal(charged.transfer, 0);
    assert.ok(transferring.fill < charged.fill && transferring.transfer > 0); assert.ok(transferring.heat > 0);
    assert.equal(cold.heat, 0); assert.equal(cold.visible, false); assert.equal(cold.transfer, 1);
    for (const p of [0, .01, .025, .04, .06, .2, .45, .61, .74, 1]) {
      const frame = historyFrame(p, 'landscape'), state = historyStorage(index, frame);
      assert.deepEqual(state.center, initial.center); assert.deepEqual(state.radii, initial.radii);
      assert.ok(state.center.every(Number.isFinite)); assert.ok(state.radii.every(r => r > 0 && Number.isFinite(r)));
      assert.ok(state.fill >= 0 && state.fill <= 1); assert.ok(state.heat >= 0 && state.heat <= 1);
      assert.equal(state.transfer, frame.construction.intrusionFront * frame.land.growth);
      assert.ok(state.heat <= frame.construction.heat + 1e-12);
    }
    assert.deepEqual(historyStorage(index, historyFrame(.06, 'landscape')), charged);
  }
});

test('organic storage retains closed topology, finite occupied volume and terrain clearance through replay', () => {
  const mesh = storageComplex(), rest = Float32Array.from(mesh.positions), retained = rest.slice(), target = new Float32Array(rest.length);
  const edges = new Map();
  for (let at = 0; at < mesh.indices.length; at += 3) for (let side = 0; side < 3; side++) {
    const a = mesh.indices[at + side], b = mesh.indices[at + (side + 1) % 3], key = a < b ? `${a}:${b}` : `${b}:${a}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  assert.ok([...edges.values()].every(n => n === 2), 'the immutable base must be a closed surface');
  const normal = (positions, at) => {
    const [a, b, c] = mesh.indices.slice(at, at + 3).map(i => i * 3);
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  };
  let largestMotion = 0;
  for (const p of [0, .01, .025, .04, .06, .10, .13, .2, .3, .4, .5, .6, .74, 1]) {
    const frame = historyFrame(p, 'landscape');
    assert.equal(historyStorageBody(rest, frame, target), target); assert.equal(target.length, rest.length);
    for (let at = 0; at < rest.length; at += 3) {
      assert.ok(Number.isFinite(target[at]) && Number.isFinite(target[at + 1]) && Number.isFinite(target[at + 2]));
      largestMotion = Math.max(largestMotion, Math.hypot(target[at] - rest[at], target[at + 1] - rest[at + 1], target[at + 2] - rest[at + 2]));
      for (const kind of ['shield', 'composite']) assert.ok(target[at + 1] < historySurface(target[at], target[at + 2], kind, frame) - .04);
    }
    for (let at = 0; at < mesh.indices.length; at += 3) {
      const a = normal(rest, at), b = normal(target, at), length = Math.hypot(...a) * Math.hypot(...b);
      if (length > 1e-16) assert.ok(a.reduce((sum, value, i) => sum + value * b[i], 0) / length > .5, 'a deformed triangle must not turn inside out');
    }
  }
  assert.ok(largestMotion > .2 && largestMotion < .35);
  assert.deepEqual(rest, retained); assert.equal(mesh.positions.length, rest.length);
  const a = historyStorageBody(rest, historyFrame(.33, 'landscape'));
  historyStorageBody(rest, historyFrame(1, 'landscape')); historyStorageBody(rest, historyFrame(0, 'landscape'));
  assert.deepEqual(historyStorageBody(rest, historyFrame(.33, 'landscape')), a);
  assert.deepEqual(historyStorageBody(rest, historyFrame(.74, 'landscape')), historyStorageBody(rest, historyFrame(1, 'landscape')));
  assert.throws(() => historyStorageBody(rest, historyFrame(.2, 'landscape'), rest), RangeError);
});

test('local storage mapping stays orientation preserving, fixes the basal plane and varies by pocket', () => {
  for (const p of [.025, .06, .13, .3, .55, .74]) {
    const frame = historyFrame(p, 'landscape');
    for (let x = -2.7; x < 2; x += .6) for (let y = -2.2; y < .1; y += .3) for (const z of [-1, -.5, 0, .5, 1]) {
      const point = [x, y, z], value = historyStorageDeform(point, frame), columns = [];
      for (let axis = 0; axis < 3; axis++) {
        const offset = [...point]; offset[axis] += 1e-4;
        columns.push(historyStorageDeform(offset, frame).map((v, i) => (v - value[i]) / 1e-4));
      }
      const [a, b, c] = columns, determinant = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
      assert.ok(determinant > .15, 'the sampled local material map must remain invertible');
    }
    for (const x of [-3, -1, 0, 2]) assert.deepEqual(historyStorageDeform([x, ROCK_BOTTOM, .06], frame), [x, ROCK_BOTTOM, .06]);
  }
  const frame = historyFrame(.13, 'landscape'), states = [0, 1, 2].map(i => historyStorage(i, frame));
  assert.ok(states[0].organic.early > states[1].organic.early && states[1].organic.early > states[2].organic.early);
  assert.ok(states.some(s => Math.abs(s.organic.dilation[0] - s.organic.dilation[1]) > .1));
  assert.notDeepEqual(states[0].organic.offset, states[1].organic.offset);
});

test('same mapping joins the storage, feeder sheets and main dike without moving their material identities', () => {
  for (const p of [.025, .06, .13, .4, .74]) {
    const frame = historyFrame(p, 'landscape');
    for (let index = 0; index < 3; index++) {
      const rest = intrusionSolid(feederCenterline(index), .045, .18), retained = [...rest.positions];
      const mapped = historyStorageBody(rest.positions, frame);
      for (let at = 0; at < rest.positions.length; at += 3) {
        const point = historyStorageDeform(rest.positions.slice(at, at + 3), frame);
        for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(mapped[at + axis] - point[axis]) < 2e-7);
      }
      assert.deepEqual(rest.positions, retained);
    }
    for (const kind of ['shield', 'composite']) {
      const ceiling = (x, z) => historyHeight(x, z, kind, frame.land.growth, frame.land.erosion);
      const path = dike(0, 115 - ceiling(0, 0) / WORLD_SCALE).map(point => sectionPoint(point, .06));
      const rest = intrusionSolid(path, .05, .43, frame.construction.intrusionFront, ceiling), actual = historyIntrusion(kind, frame);
      for (let at = 0; at < 8 * 3; at += 3) {
        const expected = historyStorageDeform(rest.positions.slice(at, at + 3), frame);
        for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(actual.positions[at + axis] - expected[axis]) < 1e-10, 'the lower main dike must share the storage/feeder material map');
      }
      assert.deepEqual(actual.indices, rest.indices);
    }
  }
});

test('organic melt contours share bounded connected material fields and avoid a horizontal fill plane', () => {
  for (const p of [0, .025, .06, .13, .3, .55, .74, 1]) for (let index = 0; index < 3; index++) {
    const frame = historyFrame(p, 'landscape'), state = historyStorage(index, frame);
    assert.equal(state.organic.pockets.length, 3);
    assert.ok(historyStorageField(state.center, state) > .5, 'the overlapping domains keep a shared neck');
    for (const point of [[0, 0, 0], [-3, -.5, .06], [2, -2.5, .06]]) {
      const value = historyStorageField(point, state); assert.ok(value >= 0 && value <= 1);
    }
    const outer = historyStorageContour(index, frame), inner = historyStorageContour(index, frame, true);
    assert.equal(outer.length, 97); assert.equal(inner.length, 97);
    for (const contour of [outer, inner]) {
      assert.ok(contour.flat().every(Number.isFinite));
      assert.ok(Math.hypot(...contour[0].map((v, i) => v - contour.at(-1)[i])) < 1e-9);
    }
    const center = historyStorageDeform(state.center, frame), ratios = inner.slice(0, 96).map((point, i) => Math.hypot(...point.map((v, j) => v - center[j])) / Math.hypot(...outer[i].map((v, j) => v - center[j])));
    assert.ok(Math.max(...ratios) - Math.min(...ratios) > .12, 'the inner domain must not be a uniformly scaled lens');
    assert.ok(new Set(inner.map(point => point[1].toFixed(5))).size > 70, 'organic boundaries must not contain a flat liquid level');
  }
  const a = historyStorageContour(1, historyFrame(.06, 'landscape'), true), b = historyStorageContour(1, historyFrame(.4, 'landscape'), true);
  assert.notDeepEqual(a, b);
  historyStorageContour(1, historyFrame(1, 'landscape'), true);
  assert.deepEqual(historyStorageContour(1, historyFrame(.06, 'landscape'), true), a);
});

test('one temporary deformation field moves surface and shared contacts while fixing the base', () => {
  for (const kind of ['shield', 'composite']) {
    const frame = historyFrame(.04, 'landscape'); assert.ok(frame.construction.uplift > 0);
    assert.equal(frame.land.growth, 0); assert.ok(historySurface(0, 0, kind, frame) > historyHeight(0, 0, kind, 0));
    assert.equal(historyDeformedY(0, ROCK_BOTTOM, 0, frame), ROCK_BOTTOM);
    assert.equal(historySurface(9, 0, kind, frame), historyHeight(9, 0, kind, 0));
    const terrain = historyTerrain(kind, frame, 12, 24);
    for (let at = 0; at < terrain.positions.length; at += 3) assert.equal(terrain.positions[at + 1], historySurface(terrain.positions[at], terrain.positions[at + 2], kind, frame));
    let previous;
    for (let unit = 0; unit < HISTORY_UNITS; unit++) {
      const data = historyStratum(unit, kind, frame, 24, 4), plane = 25 * 5;
      for (let i = 0; i < plane; i++) {
        assert.ok(data.positions[(i + plane) * 3 + 1] >= data.positions[i * 3 + 1] - 1e-12);
        if (previous) assert.equal(data.positions[i * 3 + 1], previous.positions[(i + plane) * 3 + 1]);
      }
      previous = data;
    }
    for (const p of [.16, .3, .45, 1]) {
      const settled = historyFrame(p, 'landscape');
      for (const [x, z] of [[0, 0], [1, -1], [3, 2]]) assert.equal(historySurface(x, z, kind, settled), historyHeight(x, z, kind, settled.land.growth, settled.land.erosion));
    }
  }
});

test('intrusion front grows from zero on the same construction state with fixed buffers and roof contact', () => {
  for (const kind of ['shield', 'composite']) {
    const absent = historyIntrusion(kind, historyFrame(0, 'landscape'));
    assert.equal(absent.visible, false); assert.equal(absent.front, 0);
    assert.equal(new Set(Array.from({ length: absent.positions.length / 3 }, (_, i) => absent.positions.slice(i * 3, i * 3 + 3).join(','))).size, 1);
    let oldFront = 0, oldRoof = -Infinity;
    for (const p of [.01, .025, .04, .06, .1, .16]) {
      const frame = historyFrame(p, 'landscape'), data = historyIntrusion(kind, frame);
      assert.equal(data.front, frame.construction.intrusionFront); assert.ok(data.front >= oldFront); oldFront = data.front;
      assert.equal(data.positions.length, absent.positions.length); assert.deepEqual(data.indices, absent.indices);
      for (let at = 0; at < data.positions.length; at += 3) assert.ok(data.positions[at + 1] < historySurface(data.positions[at], data.positions[at + 2], kind, frame));
      const roof = Math.max(...data.positions.filter((_, at) => at % 3 === 1));
      if (p <= .06) assert.ok(roof >= oldRoof - 1e-10); oldRoof = roof;
    }
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
