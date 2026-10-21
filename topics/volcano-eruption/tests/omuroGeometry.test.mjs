import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { surfaceHeight } from '../eruptionGeometry.ts';
import { OMURO_SITES, omuroFrame } from '../omuroJourney.ts';
import { OMURO_BLADES_PER_SITE, OMURO_GROUND_RADIUS, OmuroFieldProjection, omuroBlade, omuroCoverAt, omuroField, omuroNormal, omuroPatches, omuroSection, omuroSeed, omuroSitePoint, omuroSurface, omuroSurroundings, omuroTerrain } from '../omuroGeometry.ts';
import { omuroTextures } from '../omuroMaterials.ts';
import { Omuro3D } from '../omuroScene.ts';

test('scene-owned sparse field is byte-identical to the original formula through habitat changes and rewind', () => {
  const projection = new OmuroFieldProjection(), target = new Uint8Array(192 * 192 * 4);
  for (const [p, habitat, mode] of [[.23, 'wet', 'journey'], [.72, 'wet', 'journey'], [1, 'wet', 'journey'], [1, 'dry', 'journey'], [.66, 'cold', 'life'], [1, 'buried', 'life'], [.72, 'wet', 'journey']]) {
    const patches = omuroPatches(omuroFrame(p, habitat, mode));
    assert.equal(projection.update(patches, target), true);
    assert.deepEqual(target, omuroField(patches));
    const updates = projection.updates, preparations = projection.preparations;
    assert.equal(projection.update(patches, target), false); assert.equal(projection.updates, updates); assert.equal(projection.preparations, preparations);
  }
  assert.ok(projection.byteLength > 0 && projection.byteLength <= 100 * 4096 * 20);
  assert.ok(projection.preparations <= 100, 'fixed sites prepare each sparse spatial footprint at most once');
  const second = new OmuroFieldProjection(); assert.equal(second.byteLength, 0);
  projection.dispose(); assert.equal(projection.byteLength, 0); assert.equal(projection.update(omuroPatches(omuroFrame(1)), target), false);
  assert.equal(second.update(omuroPatches(omuroFrame(1)), target), true); second.dispose();
});

test('actual Omuro draw skips hidden formation blades and stable frames but restores the same visible grass', () => {
  // Exercise the production draw with real instance buffers and field math,
  // while omitting WebGL, cameras and separately tested terrain generation.
  const scene = Object.create(Omuro3D.prototype), shape = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial();
  const instances = count => new THREE.InstancedMesh(shape, material, count), slots = () => ({ cooling: { value: 0 }, footprint: { value: 0 }, burial: { value: 0 } });
  Object.assign(scene, { disposed: false, frame: omuroFrame(.23), view: 'section', lastFrameKey: '', lastGrowth: omuroFrame(.23).landGrowth,
    sectionGrowth: omuroFrame(.23).landGrowth, framingScale: 1, fieldProjection: new OmuroFieldProjection(),
    textures: { field: new THREE.DataTexture(new Uint8Array(192 * 192 * 4), 192, 192) }, surfaceStyle: slots(), surroundingsStyle: slots(), sectionStyle: slots(),
    grass: instances(9600), rocks: instances(360), seeds: instances(25), deposits: instances(72), roots: instances(128),
    depositHeat: new THREE.InstancedBufferAttribute(new Float32Array(72), 1), dummy: new THREE.Object3D(), color: new THREE.Color(),
    vent: new THREE.Mesh(shape, material), ventRim: new THREE.Mesh(shape, material), warmLight: new THREE.PointLight(),
    controls: { target: new THREE.Vector3() }, camera: { position: new THREE.Vector3() }, renderer: { shadowMap: {} }, canvas: { dataset: {} },
    sectionDetail() {}, moveCamera() {}, stopMotion() {} });
  let renders = 0; scene.render = () => renders++;
  const draw = p => { scene.lastGrowth = scene.sectionGrowth = omuroFrame(p).landGrowth; scene.draw(p, 'wet', 'journey'); };
  draw(.23); assert.equal(scene.grass.count, 0); assert.equal(scene.fieldProjection.preparations, 0);
  const version = scene.grass.instanceMatrix.version, updates = scene.fieldProjection.updates; draw(.23);
  assert.equal(renders, 1); assert.equal(scene.grass.instanceMatrix.version, version); assert.equal(scene.fieldProjection.updates, updates);
  draw(.9); const green = [...scene.grass.instanceMatrix.array]; assert.equal(scene.grass.count, 9600); assert.ok(green.some(value => value !== 0));
  draw(.23); assert.equal(scene.grass.count, 0); draw(.9); assert.deepEqual([...scene.grass.instanceMatrix.array], green);
  scene.view = 'landscape'; draw(.9); assert.equal(scene.grass.count, 0);
  scene.view = 'section'; draw(.9); assert.deepEqual([...scene.grass.instanceMatrix.array], green);
  scene.fieldProjection.dispose(); scene.textures.field.dispose();
  for (const mesh of [scene.grass, scene.rocks, scene.seeds, scene.deposits, scene.roots]) mesh.dispose();
  shape.dispose(); material.dispose();
});

test('the mature cone uses the eruption surface and retains a bowl below its rim', () => {
  for (let x = -5; x <= 5; x += .31) for (let z = -5; z <= 5; z += .37) {
    assert.equal(omuroSurface(x, z), surfaceHeight(x, z, 'scoria'));
    assert.equal(omuroSurface(x, z, 0), 0);
  }
  for (const angle of [0, .8, 1.7, 2.6, 3.5, 4.4, 5.3]) {
    const rim = omuroSurface(Math.cos(angle) * 1.25, Math.sin(angle) * 1.25);
    assert.ok(rim > omuroSurface(0, 0) + .2);
  }
});

test('terrain and cutaway share the same upper edge across forming and mature states', () => {
  for (const growth of [0, .13, .54, 1]) {
    const mesh = omuroTerrain(growth, 28, 56), cut = omuroSection(growth, 80);
    for (const data of [mesh, cut]) {
      assert.ok(data.positions.every(Number.isFinite));
      assert.ok(data.indices.every(i => i >= 0 && i < data.positions.length / 3));
      assert.equal(data.uvs.length / 2, data.positions.length / 3);
    }
    for (let i = 0; i < cut.positions.length; i += 6) {
      assert.equal(cut.positions[i + 4], omuroSurface(cut.positions[i + 3], 0, growth));
      assert.ok(cut.positions[i + 4] >= cut.positions[i + 1]);
    }
    assert.deepEqual(omuroTerrain(growth, 28, 56), mesh);
  }
  const normal = omuroNormal(3, 1);
  assert.ok(Math.abs(Math.hypot(...normal) - 1) < 1e-12);
  assert.ok(normal[1] > 0);
});

test('the ground continues into its surroundings without a raised circular display edge', () => {
  const surroundings = omuroSurroundings(24, 80), edgeLength = 81 * 3;
  assert.ok(surroundings.positions.every(Number.isFinite));
  for (const growth of [0, .3, 1]) {
    const terrain = omuroTerrain(growth, 32, 80);
    const edge = terrain.positions.slice(-edgeLength);
    assert.deepEqual(edge, surroundings.positions.slice(0, edgeLength));
  }
  assert.ok(surroundings.indices.every(i => i >= 0 && i < surroundings.positions.length / 3));
});

test('habitat and ecological seeking keep all plant bases on the same mountain', () => {
  const before = omuroFrame(.45, 'wet', 'life'), after = omuroFrame(1, 'dry', 'life');
  for (const site of OMURO_SITES) {
    const sitePoint = omuroSitePoint(site);
    assert.equal(sitePoint[1], omuroSurface(sitePoint[0], sitePoint[2]));
    for (let i = 0; i < OMURO_BLADES_PER_SITE; i++) {
      const a = omuroBlade(site, i, before), b = omuroBlade(site, i, after);
      assert.deepEqual(a.position, b.position);
      assert.equal(a.position[1], omuroSurface(a.position[0], a.position[2]) + .003);
      assert.ok(a.height >= 0 && b.height >= 0);
    }
  }
});

test('arriving seeds approach their own sites and do not appear before the ecological clock', () => {
  for (const site of OMURO_SITES.filter(s => s.index % 4 === 0)) {
    assert.equal(omuroSeed(site, omuroFrame(.2)).visible, false);
    const travelling = omuroSeed(site, omuroFrame(.5, 'dry', 'life'));
    const landed = omuroSeed(site, omuroFrame(.8, 'dry', 'life'));
    const end = omuroSitePoint(site);
    const distance = sample => Math.hypot(...sample.position.map((v, i) => v - end[i]));
    assert.ok(distance(landed) <= distance(travelling));
    assert.deepEqual(landed.position, end);
    assert.ok(landed.size <= .0055);
    assert.equal(landed.visible, false, 'settled seeds do not persist as a field of large balls');
  }
});

test('local soil and grass field is bounded, reversible and preserves environmental differences', () => {
  const middle = omuroPatches(omuroFrame(.77)), wet = omuroPatches(omuroFrame(1)), dry = omuroPatches(omuroFrame(1, 'dry'));
  let wetMean = 0, dryMean = 0, count = 0, min = 1, max = 0;
  for (let x = -4.8; x <= 4.8; x += .3) for (let z = -4.8; z <= 4.8; z += .3) {
    if (x * x + z * z > 25) continue;
    const a = omuroCoverAt(x, z, wet), b = omuroCoverAt(x, z, dry), m = omuroCoverAt(x, z, middle);
    for (const value of [a.cover, a.soil, b.cover, b.soil, m.cover, m.soil]) assert.ok(value >= 0 && value <= 1);
    wetMean += a.cover; dryMean += b.cover; count++; min = Math.min(min, m.cover); max = Math.max(max, m.cover);
  }
  assert.ok(wetMean / count > .7);
  assert.ok(wetMean / count < .95, 'mature grassland still has local gaps and outcrops');
  assert.ok(dryMean < wetMean * .2);
  assert.ok(min < .01 && max > .9, 'the intermediate surface is a mosaic');
  const data = omuroField(middle, 96), clone = new Uint8Array(data.length);
  assert.equal(omuroField(middle, 96, clone), clone);
  assert.deepEqual(data, clone);
  omuroField(wet, 96, clone); assert.deepEqual(omuroField(middle, 96, clone), data);
  assert.throws(() => omuroField(middle, 96, new Uint8Array(4)), RangeError);
  // A texel samples the same field as a soil/roots cutaway observation.
  const ix = 44, iz = 57, step = OMURO_GROUND_RADIUS * 2 / 95;
  const sample = omuroCoverAt(ix * step - OMURO_GROUND_RADIUS, iz * step - OMURO_GROUND_RADIUS, middle);
  assert.ok(Math.abs(data[(iz * 96 + ix) * 4] / 255 - sample.cover) < .025);
});

test('each scene can dispose its grass/soil textures without mutating another scene', () => {
  const a = omuroTextures(), b = omuroTextures();
  assert.notEqual(a.field, b.field); assert.notEqual(a.field.image.data, b.field.image.data);
  assert.ok(a.field.image.data.byteLength <= 256 * 1024);
  assert.deepEqual(a.grain.image.data, b.grain.image.data);
  let disposed = 0; a.field.addEventListener('dispose', () => disposed++);
  a.field.dispose(); a.grain.dispose();
  assert.equal(disposed, 1); assert.equal(b.field.image.data[0], 0);
  b.field.dispose(); b.grain.dispose();
});
