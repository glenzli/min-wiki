import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COASTLINE_SAMPLES, COASTLINE_SURF_LIFT, createCoastlineSample, sampleCoastline } from '../coastline.ts';
import { OceanCoastline3D } from '../coastline3d.ts';
import { oceanGeometryFrame, RADIUS, RINGS, surfaceHeight, WATER_Y } from '../geometry3d.ts';
import { oceanUniforms, stoneNoise } from '../materials3d.ts';

test('shoreline samples the actual unequal sea-plane contour, including the first off-axis emergence', () => {
  let partial = false;
  for (const p of [.6, .63, .67, .8, 1]) {
    const frame = oceanGeometryFrame(p, 'island', 'sustained'), coast = sampleCoastline(frame);
    const points = coast.points.filter(point => point.active);
    assert.equal(coast.points.length, COASTLINE_SAMPLES); assert.equal(coast.active, true);
    assert.ok(Math.abs(coast.exposure - points.length / COASTLINE_SAMPLES) < .000000001);
    if (points.length < COASTLINE_SAMPLES) partial = true;
    for (const point of points) {
      assert.equal(point.y, WATER_Y);
      assert.ok(Math.abs(surfaceHeight(frame, point.x, point.z) - WATER_Y) < .00001);
      assert.ok(point.width >= .05 && point.width <= .13);
      assert.ok(Object.values(point).every(value => typeof value !== 'number' || Number.isFinite(value)));
      const outward = (point.radius + point.width) / point.radius;
      assert.ok(surfaceHeight(frame, point.x * outward, point.z * outward) < WATER_Y);
    }
    const radii = points.map(point => point.radius);
    assert.ok(Math.max(...radii) - Math.min(...radii) > .15);
  }
  assert.equal(partial, true);
});

test('a nonmonotonic ray selects its outermost coast rather than the inner shoulder', () => {
  const frame = oceanGeometryFrame(.8, 'island', 'sustained'), top = frame.contacts.at(-1)!;
  for (let ring = 0; ring <= RINGS; ring++) {
    const radius = ring / RINGS * RADIUS;
    const height = 5.5 + 3 * Math.exp(-(((radius - .9) / .45) ** 2)) + 3 * Math.exp(-(((radius - 3) / .5) ** 2));
    top[ring][0] = top[ring][1] = height;
  }
  const point = sampleCoastline(frame).points[0];
  assert.equal(point.active, true); assert.ok(point.radius > 3 && point.radius < 3.7);
  assert.ok(Math.abs(surfaceHeight(frame, point.x, point.z) - WATER_Y) < .00001);
  assert.ok(surfaceHeight(frame, 1.8, 0) < WATER_Y);
});

test('submerged and limited cases have no air coast and seeking reuses deterministic slots', () => {
  const coast = createCoastlineSample(), points = [...coast.points];
  const limited = oceanGeometryFrame(1, 'island', 'limited');
  for (let i = 0; i < COASTLINE_SAMPLES; i++) for (let ring = 0; ring <= RINGS; ring++) {
    const angle = i / COASTLINE_SAMPLES * Math.PI * 2, radius = ring / RINGS * RADIUS;
    assert.ok(surfaceHeight(limited, Math.cos(angle) * radius, Math.sin(angle) * radius) < WATER_Y);
  }
  for (const environment of ['deep', 'shallow', 'island'] as const) for (const supply of ['limited', 'sustained'] as const) {
    if (environment === 'island' && supply === 'sustained') continue;
    for (const p of [0, .6, 1]) {
      assert.equal(sampleCoastline(oceanGeometryFrame(p, environment, supply), coast), coast);
      assert.equal(coast.active, false); assert.equal(coast.exposure, 0); assert.ok(coast.points.every(point => !point.active));
    }
  }
  for (const p of [0, .3, .58]) assert.equal(sampleCoastline(oceanGeometryFrame(p, 'island', 'sustained'), coast).active, false);
  sampleCoastline(oceanGeometryFrame(.67, 'island', 'sustained'), coast);
  const expected = structuredClone(coast);
  sampleCoastline(oceanGeometryFrame(1, 'island', 'sustained'), coast);
  sampleCoastline(oceanGeometryFrame(.08, 'island', 'sustained'), coast);
  sampleCoastline(oceanGeometryFrame(.67, 'island', 'sustained'), coast);
  assert.deepEqual(coast, expected); assert.ok(coast.points.every((point, i) => point === points[i]));
});

test('one retained seaward surf ribbon shares clocks and noise and releases its own resources once', () => {
  const noise = stoneNoise(), ocean = oceanUniforms(), owner = new OceanCoastline3D(noise, ocean);
  assert.equal(owner.group.children.length, 1); assert.equal(owner.group.visible, false);
  const mesh = owner.group.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  const position = mesh.geometry.getAttribute('position'), uvs = mesh.geometry.getAttribute('uv'), index = mesh.geometry.getIndex()!;
  const positions = position.array, indices = index.array;
  assert.equal(position.count, (COASTLINE_SAMPLES + 1) * 2); assert.equal(index.count, COASTLINE_SAMPLES * 6);
  assert.equal(mesh.material.uniforms.uStone.value, noise);
  assert.equal(mesh.material.uniforms.uClock, ocean.clock); assert.equal(mesh.material.uniforms.uDetailPhase, ocean.detailPhase);
  assert.equal(mesh.material.transparent, true); assert.equal(mesh.material.depthWrite, false); assert.equal(mesh.material.clipping, true);
  let geometryDisposals = 0, materialDisposals = 0, noiseDisposals = 0;
  mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  mesh.material.addEventListener('dispose', () => materialDisposals++); noise.addEventListener('dispose', () => noiseDisposals++);
  owner.draw(oceanGeometryFrame(.6, 'island', 'sustained'));
  assert.equal(owner.group.visible, true);
  for (let i = 0; i < COASTLINE_SAMPLES; i++) {
    if (!owner.state.points[i].active || !owner.state.points[(i + 1) % COASTLINE_SAMPLES].active)
      assert.ok(Array.from({ length: 6 }, (_, corner) => index.getX(i * 6 + corner)).every(value => value === i * 2));
  }
  owner.draw(oceanGeometryFrame(.8, 'island', 'sustained'));
  const expected = positions.slice(), version = (position as THREE.BufferAttribute).version;
  ocean.detailPhase.value = Math.PI; owner.draw(oceanGeometryFrame(.8, 'island', 'sustained'));
  assert.equal((position as THREE.BufferAttribute).version, version);
  for (let i = 0; i < position.count; i++) {
    assert.ok(Math.abs(position.getY(i) - WATER_Y - COASTLINE_SURF_LIFT) < .000001);
    assert.equal(uvs.getY(i), i % 2);
    if (i % 2) assert.ok(Math.hypot(position.getX(i), position.getZ(i)) > Math.hypot(position.getX(i - 1), position.getZ(i - 1)));
  }
  owner.draw(oceanGeometryFrame(.8, 'island', 'limited')); assert.equal(owner.group.visible, false);
  owner.draw(oceanGeometryFrame(.8, 'island', 'sustained')); assert.equal(owner.group.visible, true);
  assert.deepEqual(position.array, expected); assert.equal(position.array, positions); assert.equal(index.array, indices);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1)); owner.setCutaway(plane);
  assert.equal(mesh.material.clippingPlanes?.[0], plane);
  owner.setCutaway(); assert.equal(mesh.material.clippingPlanes?.length, 0);
  owner.dispose(); owner.dispose(); owner.draw(oceanGeometryFrame(.7, 'island', 'sustained'));
  assert.equal(owner.group.children.length, 0); assert.equal(owner.group.visible, false);
  assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1); assert.equal(noiseDisposals, 0);
  noise.dispose();
});
