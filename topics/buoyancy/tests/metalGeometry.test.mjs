import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMetalGeometry, updateMetalGeometry, createMetalEnvelopeGeometry, updateMetalEnvelopeGeometry,
  metalDimensions, metalProfile, metalDisplacementMl, metalDraftForDisplacement,
  METAL_WORLD_VOLUME, METAL_ML_PER_WORLD_VOLUME, METAL_VOLUME_ML, METAL_CAPACITY_ML,
} from '../metalGeometry.ts';

const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${actual} should equal ${expected} within ${tolerance}`);
const determinant = (a, b, c) => a[0] * (b[1] * c[2] - b[2] * c[1])
  - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);

// Independent volume measurement from the actual closed triangle mesh. For a
// clipped mesh, tetrahedra use an origin on the clipping plane, so the cap adds 0.
function measuredVolume(geometry, waterDepth = Infinity) {
  const positions = geometry.getAttribute('position');
  const indices = geometry.getIndex();
  const offset = Number.isFinite(waterDepth) ? waterDepth : 0;
  let volume = 0;
  const point = index => [positions.getX(index), positions.getY(index), positions.getZ(index)];
  for (let index = 0; index < indices.count; index += 3) {
    let polygon = [point(indices.getX(index)), point(indices.getX(index + 1)), point(indices.getX(index + 2))];
    if (Number.isFinite(waterDepth)) {
      const clipped = [];
      for (let vertex = 0; vertex < polygon.length; vertex++) {
        const a = polygon[vertex], b = polygon[(vertex + 1) % polygon.length];
        const insideA = a[1] <= waterDepth, insideB = b[1] <= waterDepth;
        if (insideA) clipped.push(a);
        if (insideA !== insideB) {
          const amount = (waterDepth - a[1]) / (b[1] - a[1]);
          clipped.push(a.map((value, axis) => value + (b[axis] - value) * amount));
        }
      }
      polygon = clipped;
    }
    const shifted = polygon.map(value => [value[0], value[1] - offset, value[2]]);
    for (let vertex = 1; vertex + 1 < shifted.length; vertex++) {
      volume += determinant(shifted[0], shifted[vertex], shifted[vertex + 1]) / 6;
    }
  }
  return volume;
}

test('one closed outward-facing metal mesh conserves its measured volume through every form', () => {
  const geometry = createMetalGeometry();
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv'), index = geometry.getIndex();
  const originalUv = Array.from(uv.array);
  const originalIndex = Array.from(index.array);
  try {
    for (let sample = 0; sample <= 40; sample++) {
      const form = sample / 40;
      updateMetalGeometry(geometry, form);
      // GPU positions use Float32, so this is a sub-0.0001mL measured tolerance.
      near(measuredVolume(geometry), METAL_WORLD_VOLUME, 1e-7);
      near(geometry.boundingBox.min.y, 0);
      near(geometry.boundingBox.max.y, metalDimensions(form).height);
      assert.equal(geometry.getAttribute('position'), position, 'retained vertices');
      assert.equal(geometry.getAttribute('uv'), uv, 'retained material coordinates');
      assert.equal(geometry.getIndex(), index, 'retained topology');
      assert.ok(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite));
    }
    assert.deepEqual(Array.from(uv.array), originalUv);
    assert.deepEqual(Array.from(index.array), originalIndex);
    const edges = new Map();
    for (let triangle = 0; triangle < index.count; triangle += 3) {
      const vertices = [index.getX(triangle), index.getX(triangle + 1), index.getX(triangle + 2)];
      for (let edge = 0; edge < 3; edge++) {
        const a = vertices[edge], b = vertices[(edge + 1) % 3], key = `${Math.min(a, b)}:${Math.max(a, b)}`;
        const previous = edges.get(key) ?? { count: 0, direction: 0 };
        edges.set(key, { count: previous.count + 1, direction: previous.direction + (a < b ? 1 : -1) });
      }
    }
    for (const edge of edges.values()) assert.deepEqual(edge, { count: 2, direction: 0 });
  } finally { geometry.dispose(); }
});

test('current immersed metal and dry-envelope integrals agree with independently clipped mesh volumes', () => {
  const metal = createMetalGeometry(), envelope = createMetalEnvelopeGeometry();
  try {
    for (const form of [0, 0.2, 0.5, 0.65, 0.8, 1]) {
      updateMetalGeometry(metal, form);
      updateMetalEnvelopeGeometry(envelope, form);
      const dimensions = metalDimensions(form);
      near(measuredVolume(envelope) * METAL_ML_PER_WORLD_VOLUME, dimensions.capacityMl, 0.0002);
      for (const fraction of [0, 0.05, 0.25, 0.5, 0.8, 1, 1.2]) {
        const depth = dimensions.height * fraction;
        near(metalDisplacementMl(form, depth), measuredVolume(metal, depth) * METAL_ML_PER_WORLD_VOLUME, 0.0002);
        near(metalDisplacementMl(form, depth, true), measuredVolume(envelope, depth) * METAL_ML_PER_WORLD_VOLUME, 0.0002);
      }
    }
  } finally { metal.dispose(); envelope.dispose(); }
});

test('forming spreads a flat plate first and then raises a rim without creating metal', () => {
  const solid = metalDimensions(0), flat = metalDimensions(0.5), bowl = metalDimensions(1);
  assert.ok(flat.width > solid.width && flat.depth > solid.depth && flat.thickness < solid.thickness);
  near(flat.height, flat.thickness);
  assert.ok(bowl.height > flat.height);
  near(bowl.thickness, flat.thickness);
  near(solid.capacityMl, METAL_VOLUME_ML);
  near(flat.capacityMl, METAL_VOLUME_ML);
  near(bowl.capacityMl, METAL_CAPACITY_ML);
  for (const form of [0, 0.25, 0.5, 0.75, 1]) {
    const dimensions = metalDimensions(form);
    near(dimensions.solidVolume, METAL_WORLD_VOLUME);
    for (const radius of [0, 0.2, 0.5, 0.8, 1]) {
      const profile = metalProfile(form, radius);
      near(profile.top - profile.bottom, dimensions.thickness);
    }
    near(metalProfile(form, 0).bottom, 0);
    near(metalProfile(form, 1).top, dimensions.height);
  }
});

test('dry draft inversion and flooding distinguish excluded air from solid material', () => {
  const dimensions = metalDimensions(1);
  for (const volume of [1, 100, 300, 780, 1380, 1400]) {
    const draft = metalDraftForDisplacement(1, volume);
    near(metalDisplacementMl(1, draft, true), volume);
    assert.ok(draft > 0 && draft <= dimensions.height);
  }
  near(metalDisplacementMl(1, dimensions.height, true), 1400);
  near(metalDisplacementMl(1, dimensions.height), 100);
  near(metalDisplacementMl(1, -1, true), 0);
  near(metalDisplacementMl(1, -1), 0);
  near(metalDisplacementMl(1, dimensions.height * 3), 100);
});
