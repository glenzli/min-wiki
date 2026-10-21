import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DETAIL_PERIOD, MagmaDetailMotion } from '../magmaMotion.ts';
import { lavaMaterial, storageMaterial, transportMaterial } from '../eruptionMaterials.ts';
import { CRUST_PERIOD, MeltTransport } from '../meltTransport.ts';
import { lavaBranches, lavaRibbon, sectionPoint } from '../eruptionGeometry.ts';
import { intrusionSolid } from '../sectionGeometry.ts';
import { dike } from '../magmaGeometry.ts';

function environment() {
  let next = 0, hidden = false, reduced = false;
  const pending = new Map(), visibilityListeners = new Set(), reducedListeners = new Set();
  return {
    requestFrame(callback) { const id = ++next; pending.set(id, callback); return id; },
    cancelFrame(id) { pending.delete(id); },
    hidden: () => hidden,
    reducedMotion: () => reduced,
    onVisibilityChange(callback) { visibilityListeners.add(callback); return () => visibilityListeners.delete(callback); },
    onReducedMotionChange(callback) { reducedListeners.add(callback); return () => reducedListeners.delete(callback); },
    setHidden(value) { hidden = value; visibilityListeners.forEach(callback => callback()); },
    setReduced(value) { reduced = value; reducedListeners.forEach(callback => callback()); },
    tick(timestamp) {
      assert.ok(pending.size <= 1, 'at most one detail RAF is pending');
      const callbacks = [...pending.values()]; pending.clear();
      callbacks.forEach(callback => callback(timestamp));
    },
    get pending() { return pending.size; },
    get callback() { return [...pending.values()][0]; },
    get listeners() { return visibilityListeners.size + reducedListeners.size; },
  };
}

test('liquid detail pauses at the exact phase and retains user intent across geological draws', () => {
  const env = environment(), samples = [];
  const motion = new MagmaDetailMotion(phase => samples.push(phase), undefined, env);
  assert.equal(env.pending, 0, 'a cold scene has no animation request');
  motion.setHot(true); env.tick(0); env.tick(50);
  assert.ok(motion.state.phase > 0);
  motion.setEnabled(false);
  const paused = motion.state.phase, count = samples.length;
  // Repeated heat admission represents ordinary draw calls, not a new user choice.
  motion.setHot(true); motion.setHot(false); motion.setHot(true); env.tick(2000);
  assert.equal(motion.state.enabled, false);
  assert.equal(motion.state.phase, paused);
  assert.equal(samples.length, count);
  assert.equal(env.pending, 0);
  motion.setEnabled(true); env.tick(3000);
  assert.equal(motion.state.phase, paused, 'resume starts without elapsed catch-up');
  env.tick(3050); assert.ok(motion.state.phase > paused);
  motion.dispose();
});

test('hidden and reduced-motion intervals stop scheduling without resetting the preference or phase', () => {
  const env = environment();
  const motion = new MagmaDetailMotion(() => {}, undefined, env);
  motion.setHot(true); env.tick(0); env.tick(50);
  const phase = motion.state.phase;
  env.setHidden(true); assert.equal(env.pending, 0); assert.equal(motion.state.running, false);
  env.setReduced(true); env.setHidden(false);
  assert.equal(env.pending, 0); assert.equal(motion.state.enabled, true);
  env.setReduced(false); assert.equal(env.pending, 1);
  env.tick(900000); assert.equal(motion.state.phase, phase);
  env.tick(900050); assert.ok(motion.state.phase > phase);
  motion.dispose();
});

test('deliberate seek gives the same material phase while paused and never enables motion', () => {
  const env = environment(), samples = [];
  const motion = new MagmaDetailMotion(phase => samples.push(phase), undefined, env);
  motion.setHot(true); env.tick(0); env.tick(100); motion.setEnabled(false);
  motion.resetPhase(); assert.equal(motion.state.phase, 0);
  assert.equal(motion.state.enabled, false); assert.equal(env.pending, 0);
  motion.resetPhase(); assert.deepEqual(samples.slice(-2), [0, 0]);
  motion.dispose();
});

test('detail work is paced, phase is bounded and cold intervals admit no RAF', () => {
  const env = environment(); let frames = 0;
  const motion = new MagmaDetailMotion(() => frames++, undefined, env);
  motion.setHot(true);
  for (let frame = 0; frame <= 120; frame++) env.tick(frame * 1000 / 120);
  assert.ok(frames <= 24, 'material updates are capped at 24 per second');
  for (let frame = 1; frame <= 2500; frame++) env.tick(1000 + frame * 100);
  assert.ok(motion.state.phase >= 0 && motion.state.phase < DETAIL_PERIOD);
  motion.setHot(false); const phase = motion.state.phase;
  assert.equal(env.pending, 0); env.tick(600000); assert.equal(motion.state.phase, phase);
  motion.dispose();
});

test('stale callbacks cannot restart a stopped generation and disposal removes every listener', () => {
  const env = environment(); let frames = 0;
  const motion = new MagmaDetailMotion(() => frames++, undefined, env);
  motion.setHot(true); const stale = env.callback;
  motion.setEnabled(false); motion.setEnabled(true);
  stale(500); assert.equal(frames, 0); assert.equal(env.pending, 1);
  const last = env.callback;
  motion.dispose(); motion.dispose(); last(1000);
  env.setHidden(true); env.setHidden(false); motion.setEnabled(true); motion.setHot(true); motion.resetPhase();
  assert.equal(env.listeners, 0); assert.equal(env.pending, 0); assert.equal(frames, 0);
  assert.equal(motion.state.disposed, true); assert.equal(motion.state.running, false);
});

test('disposal during a render callback cannot enqueue another detail frame', () => {
  const env = environment(); let motion;
  motion = new MagmaDetailMotion(() => motion.dispose(), undefined, env);
  motion.setHot(true); env.tick(0); env.tick(50);
  assert.equal(env.pending, 0); assert.equal(env.listeners, 0);
  assert.equal(motion.state.disposed, true);
});

test('melt materials expose mutable detail uniforms without opting other consumers into motion', () => {
  const texture = new THREE.Texture();
  for (const [factory, prefix] of [[storageMaterial, 'Storage'], [lavaMaterial, 'Lava']]) {
    for (const variant of [false, true]) {
      const style = factory(texture, variant);
      assert.equal(style.detail.value, 0, 'history consumers keep the prior static material');
      const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
      style.material.onBeforeCompile(shader, {});
      assert.equal(shader.uniforms[`u${prefix}DetailPhase`], style.detailPhase);
      assert.equal(shader.uniforms[`u${prefix}Detail`], style.detail);
      const shaderText = shader.fragmentShader;
      style.detail.value = 1; style.detailPhase.value = .75;
      assert.equal(shader.uniforms[`u${prefix}DetailPhase`].value, .75);
      assert.equal(shader.fragmentShader, shaderText, 'phase changes require no shader rebuild');
      style.material.dispose();
    }
  }
  texture.dispose();
});

function crest(transport, phase, low, high) {
  transport.update(phase, 1);
  let best = { distance: 0, row: 0, strength: -1 };
  for (let row = 0; row < transport.uvs.length / 2 / 9; row++) {
    const vertex = row * 9 + 4, distance = transport.uvs[vertex * 2], strength = transport.waves[vertex * 2];
    if (distance >= low && distance <= high && strength > best.strength) best = { distance, row, strength };
  }
  return best;
}

test('a raised molten fold travels a visible distance downstream inside the fixed lava banks', () => {
  const settings = { vents: 1, gas: .12, viscosity: .16, supply: .65, landform: 'shield' };
  const source = lavaRibbon(.82, settings, lavaBranches(settings)[0]), original = [...source.positions];
  const transport = MeltTransport.surface(source), buffers = [transport.positions, transport.uvs, transport.waves];
  const first = crest(transport, 0, .4, 1.2), initial = [...transport.positions];
  const later = crest(transport, 1, first.distance + .2, first.distance + .7);
  assert.ok(first.strength > .8 && later.strength > .8);
  assert.ok(later.distance - first.distance > .3 && later.distance - first.distance < .6, 'same broad crest advances across seconds');
  let moved = 0;
  for (let row = 0; row < 101; row++) {
    const xs = [], zs = [], ys = [];
    for (let j = 0; j <= 10; j++) { const at = (row * 11 + j) * 3; xs.push(source.positions[at]); ys.push(source.positions[at + 1]); zs.push(source.positions[at + 2]); }
    for (let j = 0; j <= 8; j++) {
      const at = (row * 9 + j) * 3;
      assert.ok(transport.positions[at] >= Math.min(...xs) - 1e-6 && transport.positions[at] <= Math.max(...xs) + 1e-6);
      assert.ok(transport.positions[at + 2] >= Math.min(...zs) - 1e-6 && transport.positions[at + 2] <= Math.max(...zs) + 1e-6);
      assert.ok(transport.positions[at + 1] <= Math.max(...ys) + .115);
      moved = Math.max(moved, Math.abs(transport.positions[at + 1] - initial[at + 1]));
    }
  }
  assert.ok(moved > .045, 'motion changes surface geometry rather than only color');
  assert.deepEqual(source.positions, original, 'the retained flow and cold banks are untouched');
  assert.equal(transport.positions, buffers[0]); assert.equal(transport.uvs, buffers[1]); assert.equal(transport.waves, buffers[2]);
  transport.update(0, 1); assert.deepEqual([...transport.positions], initial, 'same phase replays exactly');
});

test('intrusive folds move upward on the original sheet while the fractional tip stays fixed', () => {
  const source = intrusionSolid(dike(0, 4).map(point => sectionPoint(point, .06)), .07, .57, .72);
  const original = [...source.positions];
  for (const face of [-1, 1]) {
    const transport = MeltTransport.sheet(source, face);
    const first = crest(transport, 0, .4, 1.2), y = transport.positions[(first.row * 9 + 4) * 3 + 1];
    const tip = [...transport.positions.slice(-27)];
    const later = crest(transport, 1, first.distance + .2, first.distance + .7);
    assert.ok(later.distance - first.distance > .3);
    assert.ok(transport.positions[(later.row * 9 + 4) * 3 + 1] > y, 'positive path is upward');
    assert.deepEqual([...transport.positions.slice(-27)], tip, 'detail cannot advance the geological tip');
  }
  assert.deepEqual(source.positions, original);
});

test('thin-layer transport is bounded for weak/multiple flows and freezes after cooling', () => {
  let vertices = 0;
  for (const branch of lavaBranches({ vents: 3 })) {
    const source = lavaRibbon(.85, { vents: 3, gas: .12, viscosity: .16, supply: .65, strength: .32 }, branch);
    const transport = MeltTransport.surface(source); vertices += transport.positions.length / 3;
    transport.update(0, 0); const cold = [...transport.positions];
    transport.update(2, 0); assert.deepEqual([...transport.positions], cold);
    transport.update(0, .6); const initial = [...transport.positions];
    transport.update(DETAIL_PERIOD, .6);
    assert.ok(transport.positions.every((value, i) => Number.isFinite(value) && Math.abs(value - initial[i]) < 1e-6));
  }
  assert.equal(vertices, 4 * 101 * 9);
});

test('transported crust has bounded shear, thicker margins/downstream and stable cold output', () => {
  const settings = { vents: 1, gas: .12, viscosity: .16, supply: .65, strength: 1 };
  const source = lavaRibbon(.84, settings, lavaBranches(settings)[0]), original = [...source.positions];
  const transport = MeltTransport.surface(source), skin = transport.crust;
  assert.equal(skin.length, transport.positions.length / 3 * 4);
  const buffers = [transport.positions, transport.uvs, transport.waves, skin];
  transport.update(.1, 1);
  const before = [...skin], positions = [...transport.positions];
  transport.update(1.1, 1);
  for (let row = 0; row < 101; row++) for (let j = 0; j <= 8; j++) {
    const vertex = row * 9 + j, at = vertex * 4;
    assert.ok(Math.abs((skin[at] - before[at]) + CRUST_PERIOD / (Math.PI * 2)) < 1e-6, 'same skin moves downstream');
    assert.ok(Math.abs(skin[at + 1] - j / 8) <= .055, 'plastic shear stays inside the existing channel');
    assert.ok(skin[at + 2] >= 0 && skin[at + 2] <= 1 && skin[at + 3] >= 0 && skin[at + 3] <= 1);
    if (j === 0 || j === 8 || row === 0 || row === 100) {
      assert.deepEqual([...transport.positions.slice(vertex * 3, vertex * 3 + 3)], positions.slice(vertex * 3, vertex * 3 + 3));
      assert.ok(skin[at + 3] < 1e-10, 'fixed rind receives no mobile surface shading');
    }
  }
  assert.ok(skin[(85 * 9 + 4) * 4 + 2] > skin[(15 * 9 + 4) * 4 + 2]);
  assert.ok(skin[(50 * 9) * 4 + 2] > skin[(50 * 9 + 4) * 4 + 2]);
  assert.deepEqual(source.positions, original);
  assert.equal(transport.positions, buffers[0]); assert.equal(transport.uvs, buffers[1]); assert.equal(transport.waves, buffers[2]); assert.equal(transport.crust, buffers[3]);
  transport.update(.1, 1); assert.deepEqual([...transport.crust], before);
  transport.update(0, 0);
  const cold = [transport.positions, transport.uvs, transport.waves, skin].map(buffer => [...buffer]);
  transport.update(2.4, 0);
  [transport.positions, transport.uvs, transport.waves, skin].forEach((buffer, index) => assert.deepEqual([...buffer], cold[index]));
});

test('surface compression forms unequal folds instead of a regular scale train', () => {
  const settings = { vents: 1, gas: .12, viscosity: .16, supply: .65 };
  const source = lavaRibbon(.84, settings, lavaBranches(settings)[0]), transport = MeltTransport.surface(source);
  transport.update(0, 1);
  const peaks = [];
  for (let row = 2; row < 99; row++) {
    const vertex = row * 9 + 4, strength = transport.waves[vertex * 2];
    if (strength > .45 && strength > transport.waves[(vertex - 9) * 2] && strength >= transport.waves[(vertex + 9) * 2]) peaks.push(transport.uvs[vertex * 2]);
  }
  const gaps = peaks.slice(1).map((value, i) => value - peaks[i]);
  assert.ok(gaps.length >= 3);
  assert.ok(Math.max(...gaps) / Math.min(...gaps) > 1.5, 'spacing is deliberately unequal');
});

test('surface-only skin attributes have a fixed cost and leave intrusive materials separate', () => {
  let bytes = 0;
  for (const branch of lavaBranches({ vents: 3 })) bytes += MeltTransport.surface(lavaRibbon(.84, { vents: 3, gas: .12, viscosity: .16 }, branch)).crust.byteLength;
  assert.equal(bytes, 58176);
  const source = intrusionSolid(dike(0, 4).map(point => sectionPoint(point, .06)), .07, .57, .72);
  assert.equal(MeltTransport.sheet(source, 1).crust, undefined);
  const surface = transportMaterial(), intrusion = transportMaterial(false);
  for (const [style, hasSkin] of [[surface, true], [intrusion, false]]) {
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
    style.material.onBeforeCompile(shader, {});
    assert.equal(shader.uniforms.uTransportHeat, style.heat);
    assert.equal(shader.vertexShader.includes('attribute vec4 meltCrust'), hasSkin, 'only the surface requires the new buffer');
    style.material.dispose();
  }
  assert.notEqual(surface.material.customProgramCacheKey(), intrusion.material.customProgramCacheKey());
});
