import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWaterContactSampler } from '../waterContact.ts';
import { createWoodShape, createPebbleShape, createMetalShape, createClayShape } from '../specimenGeometry.ts';

function specimen(geometry) {
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
}

function assertSurfaceContact(mesh, contact, water) {
  assert.ok(contact);
  const origin = new THREE.Vector3(contact.center.x, water, contact.center.y);
  const point = new THREE.Vector3(), direction = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  for (let i = 0; i < contact.points.length; i += 3) {
    point.fromArray(contact.points, i);
    assert.ok(point.toArray().every(Number.isFinite));
    assert.ok(Math.abs(point.y - water) < 1e-6);
    direction.subVectors(point, origin).normalize();
    ray.set(origin, direction);
    const hits = ray.intersectObject(mesh, false);
    assert.ok(hits.length > 0, `missing surface at sample ${i / 3}`);
    assert.ok(point.distanceTo(hits.at(-1).point) < 2e-5, `off the outer surface at sample ${i / 3}`);
  }
}

test('indexed and nonindexed box contacts follow all four straight sides, not a fitted ellipse', () => {
  for (const indexed of [true, false]) {
    const source = new THREE.BoxGeometry();
    const geometry = indexed ? source : source.toNonIndexed();
    const mesh = specimen(geometry);
    mesh.position.set(.37, 1.4, -.26); mesh.scale.set(2, 3, 4);
    const contact = createWaterContactSampler(geometry).sample(mesh, 1.9);
    assertSurfaceContact(mesh, contact, 1.9);
    assert.equal(contact.points.length, 128 * 3);
    for (let i = 0; i < contact.points.length; i += 3) {
      const x = contact.points[i] - .37, z = contact.points[i + 2] + .26;
      assert.ok(Math.min(Math.abs(Math.abs(x) - 1), Math.abs(Math.abs(z) - 2)) < 1e-6);
    }
    geometry.dispose(); if (!indexed) source.dispose(); mesh.material.dispose();
  }
});

test('outside and tangent planes have no contact, while a thin intersecting slice remains finite', () => {
  const geometry = new THREE.OctahedronGeometry(.5), mesh = specimen(geometry);
  const sampler = createWaterContactSampler(geometry);
  for (const level of [-2, -.5, .5, 2, NaN, Infinity]) assert.equal(sampler.sample(mesh, level), null);
  for (const level of [-.4999, 0, .4999]) {
    const contact = sampler.sample(mesh, level);
    assertSurfaceContact(mesh, contact, level);
    for (let i = 0; i < contact.points.length; i += 3) {
      assert.ok(Math.abs(Math.abs(contact.points[i]) + Math.abs(contact.points[i + 2]) - (.5 - Math.abs(level))) < 1e-6);
    }
  }
  geometry.dispose(); mesh.material.dispose();
});

test('water contact follows parent transforms, specimen roll and changes in the sampled level', () => {
  const geometry = new THREE.BoxGeometry(), mesh = specimen(geometry), parent = new THREE.Group();
  parent.position.set(.6, .9, -.4); parent.rotation.set(.12, .24, -.08); parent.add(mesh);
  mesh.position.set(.2, .1, -.15); mesh.rotation.set(.04, .3, .11); mesh.scale.set(1.6, .9, .7);
  const sampler = createWaterContactSampler(geometry);
  for (const level of [.75, 1, 1.22]) assertSurfaceContact(mesh, sampler.sample(mesh, level), level);
  parent.rotation.z += .19; parent.position.x -= .3;
  assertSurfaceContact(mesh, sampler.sample(mesh, .94), .94);
  geometry.dispose(); mesh.material.dispose();
});

test('a nut bore keeps inner crossings separate from the actual outer hexagonal contact', () => {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 6; i++) {
    const angle = i / 6 * Math.PI * 2;
    if (i === 0) shape.moveTo(Math.cos(angle) * .5, Math.sin(angle) * .5);
    else shape.lineTo(Math.cos(angle) * .5, Math.sin(angle) * .5);
  }
  const bore = new THREE.Path(); bore.absarc(0, 0, .18, 0, Math.PI * 2, true); shape.holes.push(bore);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .8, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2); geometry.translate(0, -.4, 0);
  const mesh = specimen(geometry), sampler = createWaterContactSampler(geometry);
  const contact = sampler.sample(mesh, .03);
  assertSurfaceContact(mesh, contact, .03);
  for (let i = 0; i < contact.points.length; i += 3) assert.ok(Math.hypot(contact.points[i], contact.points[i + 2]) > .43);
  geometry.dispose(); mesh.material.dispose();
});

test('irregular off-center slices retain the sampled storage and stay on the mesh', () => {
  const geometry = new THREE.IcosahedronGeometry(.5, 2), positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    positions.setXYZ(i, x * (1 + .12 * y) + .18 * y, y, z * (1 - .08 * x));
  }
  const mesh = specimen(geometry), sampler = createWaterContactSampler(geometry);
  const first = sampler.sample(mesh, -.35), storage = first.points;
  assertSurfaceContact(mesh, first, -.35);
  const second = sampler.sample(mesh, .35);
  assert.equal(second.points, storage); assert.equal(first, second);
  assert.ok(second.center.x > 0);
  assertSurfaceContact(mesh, second, .35);
  assert.equal(sampler.sample(mesh, .35), second);
  assert.equal(sampler.sample(mesh, 2), null);
  assertSurfaceContact(mesh, sampler.sample(mesh, 0), 0);
  geometry.dispose(); mesh.material.dispose();
});

test('the production natural specimens meet the same surface contract at ordinary submerged levels', () => {
  for (const make of [createWoodShape, createPebbleShape, createMetalShape, createClayShape]) {
    const geometry = make(), mesh = specimen(geometry);
    mesh.position.set(.07, 1.2, -.04); mesh.rotation.y = .21;
    if (make === createWoodShape) mesh.rotation.z = .065;
    mesh.scale.set(1.1, .8, .7);
    const sampler = createWaterContactSampler(geometry);
    for (const level of [1.0, 1.2, 1.4]) assertSurfaceContact(mesh, sampler.sample(mesh, level), level);
    geometry.dispose(); mesh.material.dispose();
  }
});
