import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { islandSurfaceY, SEA_FLOOR, submarineState } from '../model.ts';
import { deepVentFraming, depositBuffers, oceanGeometryFrame, oceanParcels, pillowPose, pillowShape, plumeOrigin, RADIUS, RINGS, SCALE, SECTORS, sectionBuffers, settledFragment, surfaceHeight, updateDeposit, WATER_Y, worldY, type XYZ } from '../geometry3d.ts';

test('3D deposit contacts retain the authored section and the supply comparison', () => {
  for (const supply of ['sustained', 'limited'] as const) for (const p of [0, .08, .35, .64, .78, .9, 1]) {
    const frame = oceanGeometryFrame(p, 'island', supply);
    for (let i = -RINGS + 1; i < RINGS; i++) {
      const x = i / RINGS * RADIUS;
      assert.ok(Math.abs(surfaceHeight(frame, x, 0) - (SEA_FLOOR - islandSurfaceY(500 + x / SCALE, p, supply)) * SCALE) < 1e-10);
    }
    if (supply === 'limited') for (let x = -5; x <= 5; x += .2) for (let z = -5; z <= 5; z += .2) assert.ok(surfaceHeight(frame, x, z) < WATER_Y);
    assert.equal(frame.state.emerged, submarineState(p, 'island', supply).emerged);
  }
});

test('deposit solids have a closed oriented topology with a bounded buffer size', () => {
  const data = depositBuffers(), frame = oceanGeometryFrame(.78, 'island', 'sustained');
  updateDeposit(data.positions, frame, 9);
  const edges = new Map<string, { count: number; orientation: number }>();
  let volume = 0;
  for (let i = 0; i < data.indices.length; i += 3) {
    const [a, b, c] = data.indices.slice(i, i + 3);
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const key = `${Math.min(u, v)},${Math.max(u, v)}`, prior = edges.get(key) ?? { count: 0, orientation: 0 };
      prior.count++; prior.orientation += u < v ? 1 : -1; edges.set(key, prior);
    }
    const p = data.positions;
    volume += (p[a * 3] * (p[b * 3 + 1] * p[c * 3 + 2] - p[b * 3 + 2] * p[c * 3 + 1])
      + p[a * 3 + 1] * (p[b * 3 + 2] * p[c * 3] - p[b * 3] * p[c * 3 + 2])
      + p[a * 3 + 2] * (p[b * 3] * p[c * 3 + 1] - p[b * 3 + 1] * p[c * 3])) / 6;
  }
  assert.ok([...edges.values()].every(e => e.count === 2 && e.orientation === 0));
  assert.ok(volume > 0);
  assert.ok((data.positions.byteLength + data.uvs.byteLength + data.indices.length * 2) * 25 < 5 * 1024 ** 2);
});

test('buried contacts remain ordered and shared through growth and erosion', () => {
  for (const p of [.11, .36, .65, .78, .88, 1]) {
    const frame = oceanGeometryFrame(p, 'island', 'sustained');
    let previous: Float32Array | undefined;
    for (const unit of frame.history.units) {
      const { positions } = depositBuffers(); updateDeposit(positions, frame, unit.index);
      const count = positions.length / 6;
      for (let i = 0; i < count; i++) {
        const upper = positions[i * 3 + 1], lower = positions[(i + count) * 3 + 1];
        assert.ok(Number.isFinite(upper) && upper >= lower - 1e-7);
        if (previous) assert.equal(lower, previous[i * 3 + 1]);
      }
      previous = positions;
    }
  }
});

test('the exposed face and full solid use the same contact; seeking is repeatable', () => {
  const render = (p: number) => {
    const frame = oceanGeometryFrame(p, 'island', 'sustained'), data = depositBuffers();
    updateDeposit(data.positions, frame, 18);
    const section = sectionBuffers(frame, 18);
    for (let i = 0; i < section.positions.length; i += 6) {
      const x = section.positions[i];
      assert.ok(Math.abs(section.positions[i + 1] - surfaceHeight(frame, x, 0, 19)) < 2e-6);
    }
    return data.positions;
  };
  const first = render(.68); render(.22); assert.deepEqual(render(.68), first);
});

test('summit sampling resolves local outlets while the exposed face matches actual solid vertices', () => {
  for (const environment of ['deep', 'shallow', 'island'] as const) {
    const frame = oceanGeometryFrame(.65, environment, 'sustained'), data = depositBuffers();
    const unit = environment === 'island' ? 18 : -1;
    updateDeposit(data.positions, frame, unit);
    const section = sectionBuffers(frame, unit);
    for (let i = 0; i <= RINGS * 2; i++) {
      const signed = i - RINGS, ring = Math.abs(signed);
      const vertex = ring === 0 ? 0 : 1 + (ring - 1) * SECTORS + (signed < 0 ? SECTORS / 2 : 0);
      assert.ok(Math.abs(section.positions[i * 6] - data.positions[vertex * 3]) < 1e-6);
      assert.ok(Math.abs(section.positions[i * 6 + 1] - data.positions[vertex * 3 + 1]) < 1e-6);
    }
    assert.ok(data.positions[3] > 0 && data.positions[3] < RADIUS / RINGS * .3);
  }
});

test('selected deep and shallow summits have different local outlet geometry without a universal circular pit', () => {
  const deep = oceanGeometryFrame(.35, 'deep', 'sustained');
  const at = (u: number, v: number) => surfaceHeight(deep, .91 * u + .42 * v, -.42 * u + .91 * v);
  assert.ok(Math.max(at(0, .26), at(0, -.26)) > at(0, 0) + .14, 'a narrow cleft lies between unequal extrusion shoulders');
  assert.ok(Math.abs(at(0, .26) - at(0, -.26)) > .03);
  const shallow = oceanGeometryFrame(.35, 'shallow', 'sustained');
  const floor = surfaceHeight(shallow, -.06, .08), back = surfaceHeight(shallow, -.06, -.41), breach = surfaceHeight(shallow, -.06, .57);
  assert.ok(floor > 0 && back > floor + .1, 'the selected fragment lip surrounds a solid local floor');
  assert.ok(breach < back - .1, 'the near-side lip stays broken rather than becoming a complete symmetric ring');
  for (let i = 0; i < 14; i++) {
    const pose = pillowPose(deep, i), [x, y, z] = pose.center;
    assert.ok(Number.isFinite(pose.pitch) && Math.abs(pose.pitch) <= .65);
    assert.ok(y - surfaceHeight(deep, x, z) < pose.radius * .25, 'current extrusions contact the slope instead of forming raised ball tiers');
  }
});

test('later fragment and lava-cap deposits bury the early pillow base without lifting or reshaping it', () => {
  const early = oceanGeometryFrame(.35, 'island', 'sustained');
  for (const progress of [.58, .74, .80]) {
    const later = oceanGeometryFrame(progress, 'island', 'sustained');
    for (let x = -1.5; x <= 1.5; x += .3) for (let z = .1; z <= 1.6; z += .3) {
      assert.equal(surfaceHeight(later, x, z, 7), surfaceHeight(early, x, z, 7));
      assert.ok(surfaceHeight(later, x, z) >= surfaceHeight(later, x, z, 7));
    }
  }
});

test('pillow skins cool and finite shallow fragments rest on the same 3D terrain', () => {
  const frame = oceanGeometryFrame(1, 'shallow', 'sustained');
  for (let i = 0; i < 49; i++) {
    const fragment = settledFragment(frame, i), [x, y, z] = fragment.position;
    assert.equal(fragment.settled, true); assert.ok(Math.abs(y - surfaceHeight(frame, x, z) - .045) < 1e-10);
  }
  for (let i = 0; i < 14; i++) {
    const cold = pillowPose(oceanGeometryFrame(1, 'deep', 'sustained'), i);
    assert.equal(cold.growth, 1); assert.equal(cold.skinHeat, 0); assert.equal(cold.coreHeat, 0);
    assert.ok(cold.center.every(Number.isFinite));
  }
});

test('fixed pillow reconstructions have a swollen extrusion front and continuous closed sphere seams', () => {
  const r = Math.sqrt(1 - .65 ** 2), shapes = new Set<string>();
  for (let variant = 0; variant < 4; variant++) {
    const neck = pillowShape([-.65, r, 0], variant), nose = pillowShape([.65, r, 0], variant);
    assert.ok(nose[1] > neck[1] * 1.15, 'the new end is fuller than the pinched feeding end');
    const all: XYZ[] = [];
    for (let ring = 0; ring <= 28; ring++) for (let sector = 0; sector <= 48; sector++) {
      const u = ring / 28 * Math.PI, v = sector / 48 * Math.PI * 2;
      const point: XYZ = [Math.sin(u) * Math.cos(v), Math.cos(u), Math.sin(u) * Math.sin(v)];
      const sample = pillowShape(point, variant); all.push(sample);
      assert.ok(sample.every(Number.isFinite));
      assert.ok(Math.abs(sample[0]) < 1.5 && Math.abs(sample[1]) < 1.3 && Math.abs(sample[2]) < 1.3);
      if (sector === 48) {
        const first = all[all.length - 49];
        assert.ok(sample.every((value, axis) => Math.abs(value - first[axis]) < 1e-12));
      }
    }
    shapes.add(JSON.stringify(all));
    assert.deepEqual(pillowShape([.65, r, 0], variant), nose);
  }
  assert.equal(shapes.size, 4);
});

test('3D plume packets remain finite and distinguish underwater particles from condensation', () => {
  for (const environment of ['deep', 'shallow', 'island'] as const) {
    for (const progress of [0, .2, .45, .65, 1]) {
      const frame = oceanGeometryFrame(progress, environment, 'sustained'), parcels = oceanParcels(frame);
      assert.equal(parcels.length, 16);
      for (const p of parcels) {
        assert.ok(p.center.every(Number.isFinite) && Number.isFinite(p.density));
        assert.ok(p.radius > 0 && p.radius < 2);
        assert.ok(p.axes.every(axis => Number.isFinite(axis) && axis >= .8 && axis <= 2.8));
        if (p.density) assert.ok(p.medium === 'water' ? p.center[1] < WATER_Y : p.center[1] > WATER_Y);
        if (environment === 'deep' && p.medium === 'air') assert.equal(p.density, 0);
        if (progress === 0 || progress === 1) assert.equal(p.density, 0);
      }
      assert.deepEqual(oceanParcels(frame), parcels);
    }
  }
});

test('stretched plume supports and all finite packet histories repeat after seeking backward', () => {
  const sample = (progress: number) => oceanParcels(oceanGeometryFrame(progress, 'shallow', 'sustained'));
  const before = sample(.35); sample(.12); assert.deepEqual(sample(.35), before);
  for (const p of before.filter(p => p.density > .001)) {
    const bounds = p.axes.map(axis => p.radius * axis + .12);
    assert.ok(bounds.every(value => value > 0 && value < 2));
    assert.ok(p.axes[1] > p.axes[2], 'the finite support follows the rising parcel instead of a spherical puff');
  }
});

test('deep plume density support touches its current rock source and stays connected while rising', () => {
  for (const progress of [.2, .35, .6]) {
    const frame = oceanGeometryFrame(progress, 'deep', 'sustained'), origin = plumeOrigin(frame);
    const packets = oceanParcels(frame).slice(0, 8);
    assert.ok(packets.every(packet => packet.density > 0));
    const source = packets[0];
    assert.ok(source.center[1] - source.radius * source.axes[1] <= origin[1]);
    assert.ok(source.radius * source.axes[0] < .08, 'the source stays narrower than the rising body');
    for (let i = 1; i < packets.length; i++) {
      const a = packets[i - 1], b = packets[i];
      const separation = a.center.reduce((sum, coordinate, axis) => sum + ((coordinate - b.center[axis]) / (a.radius * a.axes[axis] + b.radius * b.axes[axis])) ** 2, 0);
      assert.ok(separation < .8, 'adjacent finite supports overlap rather than leaving a detached head');
      assert.ok(b.center[1] > a.center[1]);
    }
    const next = plumeOrigin(oceanGeometryFrame(progress + .001, 'deep', 'sustained'));
    assert.ok(Math.hypot(...next.map((value, axis) => value - origin[axis])) < .025);
  }
});

test('wide deep vent framing centers the ridge and retains the existing finite source-to-head core', () => {
  for (const progress of [.45, .65]) {
    const frame = oceanGeometryFrame(progress, 'deep', 'sustained'), aspect = 1160 / 464;
    const framing = deepVentFraming(frame, aspect), portrait = deepVentFraming(frame, 1.36);
    const camera = new THREE.PerspectiveCamera(37, aspect, .08, 220), target = new THREE.Vector3(...framing.target);
    camera.position.copy(target).add(new THREE.Vector3(...framing.offset)); camera.lookAt(target); camera.updateMatrixWorld();
    const source = new THREE.Vector3(...plumeOrigin(frame)).project(camera), ridge = new THREE.Vector3(0, worldY(frame.state.summit), .1).project(camera);
    assert.ok(source.y > -.55 && source.y < .1, 'the source cannot fall into the bottom of the wide stage');
    assert.ok(ridge.y > -.25 && ridge.y < .15, 'the local ridge remains near the stage center');
    assert.ok(framing.target[1] < portrait.target[1] - .25);
    assert.ok(Math.hypot(...framing.offset) < 6.4, 'the fix is a bounded close view, not a total-support AABB fit');
    for (const packet of oceanParcels(frame).filter(packet => packet.medium === 'water')) {
      assert.ok(packet.density > 0, 'these frames still contain the original finite plume');
      for (let corner = 0; corner < 8; corner++) {
        const point = new THREE.Vector3(...packet.center);
        for (let axis = 0; axis < 3; axis++) point.setComponent(axis, point.getComponent(axis) + (corner & 1 << axis ? 1 : -1) * packet.radius * packet.axes[axis] * .72);
        const projected = point.project(camera);
        assert.ok(Math.abs(projected.x) < .95 && projected.y > -.65 && projected.y < .97);
      }
    }
  }
});

test('portrait/narrow vent framing and the finite plume endpoint are preserved', () => {
  const frame = oceanGeometryFrame(.35, 'deep', 'sustained');
  for (const aspect of [1.36, .7]) {
    const camera = deepVentFraming(frame, aspect), scale = Math.max(1, .98 / aspect);
    assert.ok(Math.abs(camera.target[1] - 3.344918510652084) < 1e-12);
    assert.deepEqual(camera.offset, [1.8 * 1.1 * scale, 1.45 * 1.1 * scale, 4.5 * 1.1 * scale]);
  }
  for (const progress of [.75, 1]) {
    const ended = oceanGeometryFrame(progress, 'deep', 'sustained'), camera = deepVentFraming(ended, 2.5);
    assert.ok(oceanParcels(ended).every(packet => packet.density === 0));
    assert.deepEqual(camera.target, [0, worldY(ended.state.summit) + .12, .35]);
    assert.deepEqual(camera.offset, [1.8, 1.45, 4.5]);
  }
});


test('emplaced deep pillows retain their actual support and orientation while later deposits bury them', () => {
  for (let index = 0; index < 14; index++) {
    const at = .15 + index * .043 + 1e-6, initial = pillowPose(oceanGeometryFrame(at, 'deep', 'sustained'), index);
    assert.equal(initial.growth, 1);
    for (const p of [Math.min(1, at + .1), 1]) {
      const later = pillowPose(oceanGeometryFrame(p, 'deep', 'sustained'), index);
      assert.deepEqual(later.center, initial.center); assert.equal(later.heading, initial.heading); assert.equal(later.pitch, initial.pitch);
    }
    pillowPose(oceanGeometryFrame(.02, 'deep', 'sustained'), index);
    assert.deepEqual(pillowPose(oceanGeometryFrame(at, 'deep', 'sustained'), index), initial);
  }
  const final = oceanGeometryFrame(1, 'deep', 'sustained'), first = pillowPose(final, 0);
  assert.ok(first.center[1] < surfaceHeight(final, first.center[0], first.center[2]) - .1);
  for (const p of [.2, .35, .6, .65]) {
    const frame = oceanGeometryFrame(p, 'deep', 'sustained'), source = plumeOrigin(frame);
    assert.ok(source[1] > surfaceHeight(frame, source[0], source[2]), 'optical source follows the still-hot pile instead of buried cold lobes');
  }
});


test('the deep source fallback occurs only after every finite water parcel has dispersed', () => {
  const maxDensity = (p: number) => Math.max(...oceanParcels(oceanGeometryFrame(p, 'deep', 'sustained')).map(parcel => parcel.density));
  assert.ok(maxDensity(.7449) > 0);
  assert.ok(maxDensity(.745) < 1e-12, 'round-off at the authored final boundary is below visible density');
  for (const p of [.745001, .80, .90, .98, .98999, .99, 1]) assert.equal(maxDensity(p), 0);
  for (const p of [.07, .35, .65, .7449, .98]) {
    const frame = oceanGeometryFrame(p, 'deep', 'sustained');
    const weight = Array.from({ length: 14 }, (_, i) => pillowPose(frame, i)).reduce((total, pose) => total + pose.growth * pose.coreHeat * (1 - pose.crust * .35), 0);
    assert.ok(weight > 1e-8, `weighted source remains admitted during and beyond the finite tail at ${p}`);
  }
  const end = oceanGeometryFrame(.99, 'deep', 'sustained');
  assert.deepEqual(plumeOrigin(end), [0, surfaceHeight(end, 0, 0) + .02, .04]);
  assert.deepEqual(oceanParcels(oceanGeometryFrame(.65, 'deep', 'sustained')), oceanParcels(oceanGeometryFrame(.65, 'deep', 'sustained')));
});
