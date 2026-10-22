import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cloudFrame, cloudEncounters, ICE_CONTACT_RADIUS, GRAUPEL_CONTACT_RADIUS } from '../cloudModel.ts';
import { createCloudParticleGeometry, cloudParticleRotation } from '../cloudParticleGeometry.ts';

const tolerance = 2e-8;
const particle = (state, id) => state.particles.find(p => p.id === id);
function pose(p, progress) {
  return new THREE.Matrix4().compose(new THREE.Vector3(...p.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...cloudParticleRotation(p, progress))), new THREE.Vector3(1, 1, 1));
}
function triangleDistance(point, geometry, matrix) {
  const vertices = geometry.attributes.position, index = geometry.index;
  const triangle = new THREE.Triangle(), closest = new THREE.Vector3(); let distance = Infinity;
  for (let i = 0; i < (index ? index.count : vertices.count); i += 3) {
    [triangle.a, triangle.b, triangle.c].forEach((vertex, j) => vertex.fromBufferAttribute(vertices, index ? index.getX(i + j) : i + j).applyMatrix4(matrix));
    triangle.closestPointToPoint(point, closest); distance = Math.min(distance, point.distanceTo(closest));
  }
  return distance;
}
function xExtents(geometries, matrix) {
  const point = new THREE.Vector3(); let min = Infinity, max = -Infinity;
  for (const geometry of geometries) for (let i = 0; i < geometry.attributes.position.count; i++) {
    point.fromBufferAttribute(geometry.attributes.position, i).applyMatrix4(matrix); min = Math.min(min, point.x); max = Math.max(max, point.x);
  }
  return { min, max };
}

test('every charge-transfer anchor lies on both actual production triangle surfaces', () => {
  const geometry = createCloudParticleGeometry();
  try {
    for (const condition of ['sustained', 'limited']) for (const encounter of cloudEncounters) {
      const state = cloudFrame(encounter.progress, condition), a = particle(state, `ice-${encounter.pair}`), b = particle(state, `graupel-${encounter.pair}`);
      const anchor = new THREE.Vector3(a.position[0] + ICE_CONTACT_RADIUS, a.position[1], a.position[2]);
      assert.deepEqual([a.charge, b.charge], [1, -1]);
      assert.ok(triangleDistance(anchor, geometry.ice, pose(a, encounter.progress)) < tolerance, `ice-${encounter.pair} misses its charge-transfer site`);
      assert.ok(Math.min(triangleDistance(anchor, geometry.graupel, pose(b, encounter.progress)), triangleDistance(anchor, geometry.rime, pose(b, encounter.progress))) < tolerance,
        `graupel-${encounter.pair} misses its charge-transfer site`);
    }
  } finally { Object.values(geometry).forEach(buffer => buffer.dispose()); }
});

test('actual bodies stay disjoint before contact and while separating, including rimed detail and rendered poses', () => {
  const geometry = createCloudParticleGeometry();
  try {
    for (const condition of ['sustained', 'limited']) for (const encounter of cloudEncounters) {
      for (const p of [0, encounter.progress * .8, encounter.progress - .0001, encounter.progress, encounter.progress + .001,
        ...Array.from({ length: 80 }, (_, i) => .14 + i * .86 / 79)]) {
        const state = cloudFrame(p, condition), a = particle(state, `ice-${encounter.pair}`), b = particle(state, `graupel-${encounter.pair}`);
        const ice = xExtents([geometry.ice], pose(a, p)), graupel = xExtents([geometry.graupel, geometry.rime], pose(b, p));
        assert.ok(graupel.min - ice.max >= -tolerance, `pair ${encounter.pair} overlaps along its contact normal at ${p}`);
        if (p < encounter.progress) {
          assert.deepEqual([a.charge, b.charge], [0, 0]); assert.ok(graupel.min > ice.max, 'uncharged approach must retain an actual surface gap');
        }
      }
    }
  } finally { Object.values(geometry).forEach(buffer => buffer.dispose()); }
});

test('rimed geometry is bounded by its contact support and both particles hold orientation through encounters', () => {
  const geometry = createCloudParticleGeometry(), vector = new THREE.Vector3();
  try {
    for (const buffer of [geometry.graupel, geometry.rime]) for (let i = 0; i < buffer.attributes.position.count; i++) {
      assert.ok(vector.fromBufferAttribute(buffer.attributes.position, i).length() <= GRAUPEL_CONTACT_RADIUS + tolerance);
    }
    for (const encounter of cloudEncounters) {
      const state = cloudFrame(encounter.progress);
      assert.deepEqual(cloudParticleRotation(particle(state, `ice-${encounter.pair}`), encounter.progress), [0, 0, 0]);
      assert.deepEqual(cloudParticleRotation(particle(state, `graupel-${encounter.pair}`), encounter.progress), [0, 0, 0]);
    }
  } finally { Object.values(geometry).forEach(buffer => buffer.dispose()); }
});
