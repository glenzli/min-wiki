import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createStellarPortrait, createPhotosphereField, samplePhotosphere, stellarDisplayEmission, stellarProfileSettings, stellarSurfacePalette } from '../stellarPortrait.ts';

const named = (portrait, name) => portrait.group.getObjectByName(name);
const bodyOf = portrait => named(portrait, 'emitting-visible-surface');
const mapOf = portrait => bodyOf(portrait).material.uniforms.photosphere?.value;
function release(portrait) {
  portrait.group.traverse(object => {
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of materials) material.dispose();
  });
  portrait.dispose();
}

test('stellar exteriors are complete emissive surfaces; energy mode is reversible without replacing their identity', () => {
  for (const id of ['sun', 'red-dwarf', 'white-dwarf', 'neutron-star']) {
    const portrait = createStellarPortrait(id), body = bodyOf(portrait), map = mapOf(portrait);
    const positions = body.geometry.getAttribute('position').array.slice();
    assert.ok(body.material instanceof THREE.ShaderMaterial);
    assert.equal(body.material.lights, false);
    assert.equal(body.material.uniforms.energy.value, 0);
    assert.equal(body.material.side, THREE.FrontSide);
    assert.equal(body.geometry.parameters.radius, .85);
    portrait.setEnergy(true);
    assert.equal(body.material.uniforms.energy.value, id === 'neutron-star' ? 0 : 1);
    assert.equal(named(portrait, 'stored-heat-key')?.visible, id === 'white-dwarf' ? true : undefined);
    assert.equal(named(portrait, 'core-fusion-key')?.visible, ['sun', 'red-dwarf'].includes(id) ? true : undefined);
    portrait.setEnergy(false);
    assert.equal(body.material.uniforms.energy.value, 0);
    assert.equal(bodyOf(portrait), body);
    assert.equal(mapOf(portrait), map);
    assert.deepEqual(body.geometry.getAttribute('position').array, positions);
    release(portrait);
  }
});

test('granulation is repeatable, mipmapped and bounded; compact remnants have no invented photospheric map', () => {
  const first = createStellarPortrait('sun'), again = createStellarPortrait('sun');
  const red = createStellarPortrait('red-dwarf'), white = createStellarPortrait('white-dwarf'), neutron = createStellarPortrait('neutron-star');
  const map = mapOf(first);
  assert.deepEqual(map.image.data, mapOf(again).image.data);
  assert.notDeepEqual(map.image.data, mapOf(red).image.data);
  assert.equal(map.image.width, 256);
  assert.equal(map.image.height, 256);
  assert.equal(map.image.data.byteLength, 256 * 256 * 4);
  assert.equal(map.wrapS, THREE.RepeatWrapping);
  assert.equal(map.wrapT, THREE.RepeatWrapping);
  assert.equal(map.minFilter, THREE.LinearMipmapLinearFilter);
  assert.equal(map.generateMipmaps, true);
  assert.equal(map.colorSpace, THREE.NoColorSpace);
  assert.equal(mapOf(white), undefined);
  assert.equal(mapOf(neutron), undefined);
  assert.notDeepEqual(bodyOf(first).material.uniforms.hotColor.value, bodyOf(red).material.uniforms.hotColor.value);
  for (const portrait of [first, again, red, white, neutron]) {
    const glare = named(portrait, 'bounded-emission-glare');
    assert.equal(glare.geometry.parameters.radius, 1.15);
    assert.equal(glare.material.depthWrite, false);
    assert.ok(glare.material.uniforms.width.value > .02 && glare.material.uniforms.width.value < .1);
    assert.equal(glare.material.depthTest, true);
    release(portrait);
  }
});

test('hot-star appearance keeps a luminous radiative surface without solar spots or a new object',()=>{
 const portrait=createStellarPortrait('sun',{energySection:false}),body=bodyOf(portrait),map=mapOf(portrait),geometry=body.geometry;
 portrait.setAppearance({profile:'hot-star',color:'#d0e9ff',activeRegions:0,time:3});
 assert.equal(bodyOf(portrait),body);assert.equal(body.geometry,geometry);assert.equal(mapOf(portrait),map);assert.equal(body.material.lights,false);
 assert.equal(body.material.uniforms.spotStrength.value,0);assert.equal(body.material.uniforms.compactSurface.value,0);
 assert.ok(body.material.uniforms.granuleContrast.value<stellarProfileSettings('solar').contrast/2);
 assert.equal(body.material.uniforms.surfaceTime.value,3);assert.match(body.material.fragmentShader,/isOrthographic/);
 const radius=body.geometry.parameters.radius;portrait.setAppearance({time:4});assert.equal(body.geometry.parameters.radius,radius);assert.equal(body.material.uniforms.surfaceTime.value,4);release(portrait);
});

test('the module releases generated textures once and leaves scene-owned geometry and materials to the caller', () => {
  const portrait = createStellarPortrait('sun'), body = bodyOf(portrait), texture = mapOf(portrait);
  let texturesDisposed = 0, geometryDisposed = 0, materialDisposed = 0;
  texture.addEventListener('dispose', () => texturesDisposed++);
  body.geometry.addEventListener('dispose', () => geometryDisposed++);
  body.material.addEventListener('dispose', () => materialDisposed++);
  portrait.dispose(); portrait.dispose(); portrait.setEnergy(true);
  assert.equal(texturesDisposed, 1);
  assert.equal(geometryDisposed, 0);
  assert.equal(materialDisposed, 0);
  assert.equal(body.material.uniforms.energy.value, 0);
  release(portrait);
  assert.equal(geometryDisposed, 1);
  assert.equal(materialDisposed, 1);
});

test('unsupported identity fails at the stellar owner boundary', () => {
  assert.throws(() => createStellarPortrait('earth'), /Unsupported stellar portrait/);
});

test('topic-supplied surface time and palette never replace a star, map, scale or energy selection', () => {
  const p = createStellarPortrait('sun', { energySection: false }), body = bodyOf(p), map = mapOf(p);
  try {
    p.group.scale.setScalar(7); p.group.position.set(2, 3, 4);
    p.setAppearance({ color: '#d2e6ff', time: 6.5, activeRegions: .25, opacity: .35, glare: .5 });
    assert.equal(bodyOf(p), body); assert.equal(mapOf(p), map);
    assert.equal(body.material.uniforms.surfaceTime.value, 6.5);
    assert.equal(body.material.uniforms.activeRegions.value, .25);
    assert.equal(body.material.uniforms.opacity.value, .35);
    assert.equal(body.material.transparent, true);
    assert.deepEqual(p.group.scale.toArray(), [7, 7, 7]);
    assert.deepEqual(p.group.position.toArray(), [2, 3, 4]);
    p.setEnergy(true); assert.equal(body.material.uniforms.energy.value, 0);
    p.setAppearance({ time: 0, opacity: 1, activeRegions: 0 });
    assert.equal(body.material.uniforms.surfaceTime.value, 0);
    assert.equal(body.material.transparent, false);
    assert.equal(body.material.uniforms.activeRegions.value, 0);
  } finally { release(p); }
});

test('Canvas sampling shares the periodic GPU field without seams or a history-dependent clock', () => {
  const field = createPhotosphereField(), sample = (p, time = 0) => Array.from(samplePhotosphere(field, ...p, new Float64Array(3), 1.25, time));
  const point = [.31, -.42, Math.sqrt(1 - .31 ** 2 - .42 ** 2)];
  const initial = sample(point), later = sample(point, 12);
  assert.notDeepEqual(initial, later);
  assert.deepEqual(sample(point), initial);
  for (const p of [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], point]) {
    const value = sample(p); assert.ok(value.every(v => v >= 0 && v <= 1));
    const nearby = sample([p[0] + 1e-7, p[1], p[2]]);
    assert.ok(value.every((v, i) => Math.abs(v - nearby[i]) < 1e-4));
  }
  assert.equal(field.data.byteLength, 256 * 256 * 4);
});

test('the photosphere field resolves unequal bright upwellings with coherent soft gaps', () => {
  const field = createPhotosphereField(), grains = [];
  for (let index = 0; index < field.data.length; index += 4) grains.push(field.data[index] / 255);
  grains.sort((a, b) => a - b);
  const low = grains[Math.floor(grains.length * .05)], high = grains[Math.floor(grains.length * .95)];
  assert.ok(high - low > .32, 'the field retains enough range to show upwellings after display compression');
  assert.ok(high - low < .58, 'the field avoids binary bright plates and dark cracks');
  let changes = 0;
  for (let y = 0; y < field.size; y++) for (let x = 0; x < field.size; x++) {
    const index = (y * field.size + x) * 4, next = (y * field.size + (x + 1) % field.size) * 4;
    changes += Math.abs(field.data[index] - field.data[next]) / 255;
  }
  assert.ok(changes / (field.size ** 2) > .015, 'fine texture remains present within the subdued overall range');
  assert.ok(changes / (field.size ** 2) < .085, 'fine variation is coherent, without pixel-sharp bright/dark edges');
});

test('solar, giant and compact morphology are distinct while profile changes retain the same object and field', () => {
  const solar = stellarProfileSettings('solar'), giant = stellarProfileSettings('red-giant'), compact = stellarProfileSettings('compact');
  assert.ok(giant.granuleScale < solar.granuleScale / 3, 'giant convection is visibly coarser');
  assert.ok(compact.glareWidth < solar.glareWidth && giant.glareWidth > solar.glareWidth);
  assert.equal(compact.activity, 0);
  const sunPalette = stellarSurfacePalette('#fff0cf', 'solar'), giantPalette = stellarSurfacePalette('#fff0cf', 'red-giant');
  assert.ok(giantPalette.hot.g / giantPalette.hot.r < sunPalette.hot.g / sunPalette.hot.r);
  const portrait = createStellarPortrait('sun'), body = bodyOf(portrait), field = mapOf(portrait);
  try {
    const initialScale = body.material.uniforms.granuleScale.value;
    portrait.setAppearance({ profile: 'red-giant' });
    assert.ok(body.material.uniforms.granuleScale.value < initialScale / 3);
    assert.equal(body.material.uniforms.displayExponent.value, 1);
    portrait.setAppearance({ profile: 'solar' });
    assert.equal(body.material.uniforms.granuleScale.value, initialScale);
    assert.equal(bodyOf(portrait), body); assert.equal(mapOf(portrait), field);
    assert.equal(body.geometry.parameters.radius, .85);
  } finally { release(portrait); }
});

test('supplied cooling dims emission and tightens glare without hiding, shrinking or replacing the remnant', () => {
  const portrait = createStellarPortrait('white-dwarf'), body = bodyOf(portrait), glare = named(portrait, 'bounded-emission-glare');
  try {
    portrait.group.scale.setScalar(3);
    assert.equal(body.material.uniforms.displayExponent.value, .4);
    const exposures = [0, .08, .2, .45, .7, 1].map(value => stellarDisplayEmission(value, 'compact'));
    assert.equal(exposures[0], 0); assert.equal(exposures.at(-1), 1);
    assert.ok(exposures.every((value, index) => index === 0 || value > exposures[index - 1]));
    assert.ok(exposures[3] > .70 && exposures[3] < .75, 'the displayed warm remnant retains light while the supplied cooling value remains unchanged');
    assert.equal(stellarDisplayEmission(.45, 'solar'), .45);
    assert.equal(stellarDisplayEmission(.45, 'red-giant'), .45);
    const warmWidth = glare.material.uniforms.width.value, warmStrength = glare.material.uniforms.strength.value;
    portrait.setAppearance({ emission: .08, glare: .3 });
    assert.equal(body.material.uniforms.emissionStrength.value, .08);
    assert.equal(body.material.uniforms.opacity.value, 1);
    assert.equal(body.material.transparent, false);
    assert.ok(glare.material.uniforms.width.value < warmWidth);
    assert.ok(glare.material.uniforms.strength.value < warmStrength * .3);
    assert.deepEqual(portrait.group.scale.toArray(), [3, 3, 3]);
    portrait.setAppearance({ emission: NaN });
    assert.equal(body.material.uniforms.emissionStrength.value, .08);
    portrait.setAppearance({ emission: 2, glare: 1 });
    assert.equal(body.material.uniforms.emissionStrength.value, 1);
    assert.equal(glare.material.uniforms.width.value, warmWidth);
    assert.equal(glare.material.uniforms.strength.value, warmStrength);
    assert.equal(bodyOf(portrait), body); assert.equal(mapOf(portrait), undefined);
  } finally { release(portrait); }
});
