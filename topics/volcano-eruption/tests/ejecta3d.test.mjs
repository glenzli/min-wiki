import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Ejecta3D, EJECTA_LIMITS, ejectaSample, fountainMaterial } from '../ejecta3d.ts';
import { CLAST_BUDGET, PRESETS } from '../model.ts';
import { fragmentAt, fragmentSchedule } from '../eruptionGeometry.ts';

const settings = { ...PRESETS.fountain, landform: 'composite', strength: 1 };
const fragments = fragmentSchedule(settings);
const atFlightAge = (fragment, u) => fragment.birth + fragment.trajectory.impactTime * u / 24;
const pose = sample => ({ position: sample.position, rotation: sample.rotation, radius: sample.radius,
  shape: sample.shape, stretch: sample.stretch, phase: sample.phase, taper: sample.taper });

test('morphology sampling preserves every upstream birth, flight, landing and radius', () => {
  for (let index = 0; index < fragments.length; index++) {
    const fragment = fragments[index];
    for (const clock of [fragment.birth - .001, atFlightAge(fragment, .15), atFlightAge(fragment, .8), atFlightAge(fragment, 1.5)]) {
      const expected = fragmentAt(fragment, clock), sample = ejectaSample(fragment, index, clock, settings);
      assert.deepEqual(sample.position, expected.position); assert.equal(sample.visible, expected.visible);
      assert.equal(sample.landed, expected.landed); assert.equal(sample.afterImpact, expected.afterImpact);
      assert.equal(sample.radius, fragment.radius);
      assert.ok(Math.abs(Math.hypot(...sample.rotation) - 1) < 1e-12);
    }
  }
  const original = JSON.stringify(fragments); ejectaSample(fragments[7], 7, .7, settings);
  assert.equal(JSON.stringify(fragments), original);
});

test('fluid-dominated examples have varied rounded forms and a retained hard subset', () => {
  const types = new Set(fragments.map((fragment, index) => ejectaSample(fragment, index, atFlightAge(fragment, .1), settings).shape));
  assert.deepEqual(types, new Set(['drop', 'spindle', 'rope', 'block']));
  const ashSettings = { ...PRESETS.ash, landform: 'composite' };
  fragmentSchedule(ashSettings).forEach((fragment, index) => {
    const sample = ejectaSample(fragment, index, atFlightAge(fragment, .1), ashSettings);
    assert.ok(sample.hard); assert.equal(sample.shape, 'block'); assert.equal(sample.heat, 0); assert.equal(sample.spread, 0);
  });
});

test('most soft clasts cool during flight while only a finite subset can spread after impact', () => {
  let soft = 0, coldAtImpact = 0, plastic = 0;
  fragments.forEach((fragment, index) => {
    const early = ejectaSample(fragment, index, atFlightAge(fragment, .02), settings);
    if (early.hard) return;
    soft++;
    const impact = ejectaSample(fragment, index, atFlightAge(fragment, 1) + 1e-7, settings);
    assert.ok(early.heat > impact.heat); assert.ok(impact.skin >= early.skin);
    if (impact.heat === 0) coldAtImpact++;
    const later = ejectaSample(fragment, index, atFlightAge(fragment, 1) + .02, settings);
    if (early.plasticLanding) { plastic++; assert.ok(later.spread > 0 && later.spread <= .85); }
    else assert.equal(later.spread, 0);
  });
  assert.ok(coldAtImpact > soft * .5);
  assert.ok(plastic > 0 && plastic < soft * .4, 'the mixture is illustrative; not every bomb is liquid at impact');
});

test('cold impacts retain a stable pose and seeking restores the same appearance', () => {
  fragments.forEach((fragment, index) => {
    const cold = ejectaSample(fragment, index, atFlightAge(fragment, 4), settings);
    const later = ejectaSample(fragment, index, atFlightAge(fragment, 6), settings);
    assert.equal(cold.heat, 0); assert.equal(later.heat, 0); assert.equal(cold.skin, 1);
    assert.deepEqual(pose(cold), pose(later)); assert.equal(cold.spread, later.spread);
    const before = ejectaSample(fragment, index, atFlightAge(fragment, .35), settings);
    ejectaSample(fragment, index, atFlightAge(fragment, 2), settings);
    assert.deepEqual(ejectaSample(fragment, index, atFlightAge(fragment, .35), settings), before);
  });
  const invalid = ejectaSample(fragments[0], 0, NaN, settings);
  assert.ok(invalid.rotation.every(Number.isFinite)); assert.ok(Number.isFinite(invalid.heat));
});

test('two bounded families use smooth volume for soft clasts and faceting for hard material', () => {
  const ejecta = new Ejecta3D(), [soft, hard] = ejecta.group.children;
  assert.equal(ejecta.group.children.length, 2); assert.equal(EJECTA_LIMITS.fragments, CLAST_BUDGET);
  assert.equal(soft.geometry.getAttribute('position').count, 187);
  assert.equal(soft.material.flatShading, false); assert.equal(hard.material.flatShading, true);
  const positions = soft.geometry.getAttribute('position'), normals = soft.geometry.getAttribute('normal');
  for (let i = 0; i < positions.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(positions, i), n = new THREE.Vector3().fromBufferAttribute(normals, i);
    assert.ok(Math.abs(p.length() - 1) < 1e-6); assert.ok(p.dot(n) > .999);
  }
  let bytes = 0;
  for (const mesh of [soft, hard]) {
    bytes += mesh.instanceMatrix.array.byteLength + (mesh.geometry.index?.array.byteLength ?? 0);
    for (const attribute of Object.values(mesh.geometry.attributes)) bytes += attribute.array.byteLength;
    for (const value of Object.values(mesh.material)) assert.ok(!value?.isTexture);
  }
  assert.ok(bytes < 96 * 1024, `typed geometry and instance arrays are bounded: ${bytes}`);
  ejecta.dispose();
});

test('renderer packs the same fragment identities without multiplying the source budget', () => {
  const ejecta = new Ejecta3D(), clock = .7;
  ejecta.update({ fragments, clock, settings, connected: true });
  const expected = [[], []];
  fragments.forEach((fragment, index) => {
    const sample = ejectaSample(fragment, index, clock, settings);
    if (sample.visible) expected[sample.hard ? 1 : 0].push(sample);
  });
  let count = 0;
  ejecta.group.children.forEach((mesh, family) => {
    assert.equal(mesh.count, expected[family].length); count += mesh.count;
    for (let slot = 0; slot < mesh.count; slot++) {
      const matrix = new THREE.Matrix4(); mesh.getMatrixAt(slot, matrix);
      const point = new THREE.Vector3().setFromMatrixPosition(matrix);
      assert.ok(point.distanceTo(new THREE.Vector3(...expected[family][slot].position)) < 1e-6);
      const state = mesh.geometry.getAttribute('aEjectaState');
      assert.ok(Math.abs(state.getX(slot) - expected[family][slot].heat) < 1e-6);
    }
  });
  assert.ok(count > 0 && count <= CLAST_BUDGET);
  ejecta.dispose();
});

test('connection and cutaway gates match the existing surface-product contract', () => {
  const ejecta = new Ejecta3D();
  ejecta.update({ fragments, clock: .7, settings, connected: false });
  assert.equal(ejecta.group.visible, false); assert.ok(ejecta.group.children.every(mesh => mesh.count === 0));
  ejecta.update({ fragments, clock: .9, settings, connected: true, cutaway: true });
  const expected = fragments.filter(fragment => {
    const sample = fragmentAt(fragment, .9);
    return sample.visible && !(sample.landed && sample.position[2] > .02);
  }).length;
  assert.equal(ejecta.group.children.reduce((sum, mesh) => sum + mesh.count, 0), expected);
  assert.throws(() => ejecta.update({ fragments: [...fragments, fragments[0]], clock: .9, settings, connected: true }), RangeError);
  ejecta.dispose();
});

test('updates retain all buffers and disposal releases each owned resource exactly once', () => {
  const ejecta = new Ejecta3D(), scene = new THREE.Scene(); scene.add(ejecta.group);
  const meshes = ejecta.group.children.slice(), geometry = meshes.map(mesh => mesh.geometry), material = meshes.map(mesh => mesh.material);
  const arrays = meshes.map(mesh => [mesh.instanceMatrix.array, mesh.geometry.getAttribute('aEjectaForm').array, mesh.geometry.getAttribute('aEjectaState').array]);
  let disposed = 0;
  for (const resource of [...meshes, ...geometry, ...material]) resource.addEventListener('dispose', () => disposed++);
  for (const clock of [.4, .7, 1, .2, .75]) ejecta.update({ fragments, clock, settings, connected: true });
  meshes.forEach((mesh, i) => {
    assert.equal(mesh.geometry, geometry[i]); assert.equal(mesh.material, material[i]);
    assert.equal(mesh.instanceMatrix.array, arrays[i][0]);
    assert.equal(mesh.geometry.getAttribute('aEjectaForm').array, arrays[i][1]);
    assert.equal(mesh.geometry.getAttribute('aEjectaState').array, arrays[i][2]);
  });
  ejecta.dispose(); ejecta.dispose(); assert.equal(disposed, 6);
  assert.equal(scene.children.length, 0); assert.equal(ejecta.group.children.length, 0);
  assert.doesNotThrow(() => ejecta.update({ fragments, clock: .7, settings, connected: true }));
});

test('jet skin shares caller-controlled heat and phase without allocating a texture or a clock', () => {
  const first = fountainMaterial(), second = fountainMaterial();
  const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>',
    fragmentShader: '#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>' };
  first.material.onBeforeCompile(shader, {});
  assert.equal(shader.uniforms.uFountainHeat, first.heat); assert.equal(shader.uniforms.uFountainPhase, first.phase);
  first.heat.value = .3; first.phase.value = .8;
  assert.equal(shader.uniforms.uFountainHeat.value, .3); assert.equal(shader.uniforms.uFountainPhase.value, .8);
  assert.equal(second.heat.value, 1); assert.equal(second.phase.value, 0);
  assert.ok(shader.vertexShader.includes('*.0025*clamp(uFountainHeat,0.,1.)'));
  assert.ok(shader.fragmentShader.includes('ejHot'));
  for (const value of Object.values(first.material)) assert.ok(!value?.isTexture);
  first.material.dispose(); second.material.dispose();
});


test('all fountain vertex and skin phase samples close over the bounded two-pi display period', () => {
  const style = fountainMaterial(), shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  style.material.onBeforeCompile(shader, {});
  const neck = shader.vertexShader.match(/float ejNeck=(.*);/)[1];
  const angle = shader.fragmentShader.match(/float ejAngle=(.*);/)[1];
  const domain = shader.fragmentShader.match(/vec3 ejUV=(.*);/)[1];
  const evaluate = (expression, uv, phase, ejAngle = 0) => new Function('uv', 'vFountainUV', 'uFountainPhase', 'ejAngle', 'sin', 'cos', 'pow', 'clamp', 'vec3', `return ${expression}`)(uv, uv, phase, ejAngle, Math.sin, Math.cos, Math.pow, (v,a,b)=>Math.min(b,Math.max(a,v)), (...v)=>v);
  for (const x of [.03, .25, .5, .9]) for (const y of [.1, .4, .8]) for (const phase of [0, .7, 2.8, 5.9]) {
    const uv = { x, y }, period = Math.PI * 2;
    const a = evaluate(neck, uv, phase), b = evaluate(neck, uv, phase + period); assert.ok(Math.abs(a - b) < 1e-12);
    const first = evaluate(domain, uv, phase, evaluate(angle, uv, phase)), later = evaluate(domain, uv, phase + period, evaluate(angle, uv, phase + period));
    first.forEach((value, i) => assert.ok(Math.abs(value - later[i]) < 1e-12));
  }
  style.material.dispose();
});
