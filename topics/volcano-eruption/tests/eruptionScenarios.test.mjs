import test from 'node:test';
import assert from 'node:assert/strict';
import { CLAST_BUDGET, PRESETS, eruptionAppearance, flowBranches } from '../model.ts';
import { magmaState } from '../magmaSystem.ts';
import { ashParcels, eruptionFrame, fragmentAt, fragmentSchedule, lavaBranches, lavaRibbon, surfaceHeight, terrainBuffers } from '../eruptionGeometry.ts';
import { ERUPTION_SCENARIOS, scenarioSettings } from '../eruptionScenarios.ts';

const weights = ['jetScale', 'clastActivity', 'clastRise', 'clastSpread', 'ashHeight', 'ashRadius', 'ashDensity', 'lavaFlux', 'lavaWidth', 'lavaSpread'];
const sameSource = (style, strength, landform = 'composite') => ({ ...PRESETS[style], resistance: .35, landform, strength });

test('omitted strength is exactly the legacy full-strength setting', () => {
  for (const preset of Object.values(PRESETS)) {
    const omitted = { ...preset, landform: 'composite' }, explicit = { ...omitted, strength: 1 };
    assert.deepEqual(eruptionAppearance(omitted), eruptionAppearance(explicit));
    assert.equal(eruptionAppearance(omitted).strength, 1);
    for (const weight of weights) assert.equal(eruptionAppearance(omitted)[weight], 1, weight);
    assert.deepEqual(fragmentSchedule(omitted), fragmentSchedule(explicit));
    for (const p of [.3, .6, .83, 1]) {
      assert.deepEqual(ashParcels(p, omitted), ashParcels(p, explicit));
      assert.deepEqual(eruptionFrame(p, omitted), eruptionFrame(p, explicit));
      for (const branch of lavaBranches(omitted)) assert.deepEqual(lavaRibbon(p, omitted, branch, 20, 4), lavaRibbon(p, explicit, branch, 20, 4));
    }
  }
});

test('strength is bounded and monotone without relabelling the gas/viscosity form', () => {
  for (const style of ['flow', 'fountain', 'ash']) {
    let previous = null;
    for (const strength of [0, .1, .32, .65, 1]) {
      const appearance = eruptionAppearance(sameSource(style, strength));
      assert.equal(appearance.style, style);
      const reference = eruptionAppearance(PRESETS[style]);
      for (const form of ['ash', 'fountain', 'lava']) assert.equal(appearance[form], reference[form]);
      for (const key of ['strength', ...weights]) {
        assert.ok(Number.isFinite(appearance[key]) && appearance[key] >= 0 && appearance[key] <= 1, key);
        if (previous) assert.ok(appearance[key] >= previous[key], key);
      }
      previous = appearance;
    }
    assert.equal(eruptionAppearance(sameSource(style, -2)).strength, 0);
    assert.equal(eruptionAppearance(sameSource(style, 4)).strength, 1);
    assert.equal(eruptionAppearance(sameSource(style, NaN)).strength, 0);
    assert.equal(eruptionAppearance(sameSource(style, Infinity)).strength, 0);
  }
});

test('same-time strength comparisons preserve the underground gate and existing mountain', () => {
  for (const landform of ['shield', 'composite', 'scoria']) {
    const small = sameSource('ash', .32, landform), large = sameSource('ash', 1, landform);
    const terrain = terrainBuffers(landform, 12, 24);
    for (const p of [0, .14, .28, .46, .62, .8, 1]) {
      assert.deepEqual(magmaState(p, small), magmaState(p, large));
      assert.deepEqual(eruptionFrame(p, small).mechanism, eruptionFrame(p, large).mechanism);
      assert.equal(eruptionFrame(p, small).clock, eruptionFrame(p, large).clock);
    }
    eruptionFrame(.7, large); eruptionFrame(.4, small);
    assert.deepEqual(terrainBuffers(landform, 12, 24), terrain);
  }
  const stalled = { ...sameSource('fountain', 1), supply: .2, resistance: .9 };
  for (const strength of [0, .32, 1]) for (const p of [.3, .6, 1]) {
    const frame = eruptionFrame(p, { ...stalled, strength });
    assert.equal(frame.mechanism.connected, false); assert.equal(frame.intensity, 0);
    assert.equal(frame.lavaVisible, false); assert.deepEqual(frame.ash, []);
  }
});

test('small eruptions activate a subset of fixed clast slots with lower rises and landing ranges', () => {
  const small = fragmentSchedule(sameSource('fountain', .32)), large = fragmentSchedule(sameSource('fountain', 1));
  assert.equal(small.length, CLAST_BUDGET); assert.equal(large.length, CLAST_BUDGET);
  let common = 0, smallRange = 0, largeRange = 0;
  assert.ok(small.filter(f => f.active).length > 0);
  assert.ok(small.filter(f => f.active).length < large.filter(f => f.active).length * .5);
  for (let i = 0; i < small.length; i++) {
    const a = small[i], b = large[i];
    assert.equal(a.birth, b.birth); assert.equal(a.dx, b.dx); assert.equal(a.dz, b.dz); assert.equal(a.x, b.x);
    assert.ok(a.trajectory.vx < b.trajectory.vx);
    assert.ok(Math.abs(a.trajectory.vy) < Math.abs(b.trajectory.vy));
    if (a.active) {
      assert.ok(b.active); common++; smallRange += a.trajectory.impactX; largeRange += b.trajectory.impactX;
      const landedAt = a.birth + a.trajectory.impactTime / 24 + 1e-6;
      const landed = fragmentAt(a, landedAt);
      assert.ok(Math.abs(landed.position[1] - surfaceHeight(landed.position[0], landed.position[2], 'composite')) < 1e-7);
      assert.deepEqual(fragmentAt(a, landedAt + .2).position, landed.position);
    }
  }
  assert.ok(common > 30); assert.ok(smallRange < largeRange * .7);
});

test('ash-rich small and large cases differ in height, parcel volume and density at the same time', () => {
  const small = ashParcels(.7, sameSource('ash', .32)), large = ashParcels(.7, sameSource('ash', 1));
  assert.equal(small.length, large.length);
  let smallVolume = 0, largeVolume = 0, smallDensity = 0, largeDensity = 0;
  for (let i = 0; i < small.length; i++) {
    assert.ok(small[i].position[1] <= large[i].position[1]);
    assert.ok(small[i].radius <= large[i].radius); assert.ok(small[i].density <= large[i].density);
    smallVolume += small[i].radius ** 3; largeVolume += large[i].radius ** 3;
    smallDensity += small[i].density; largeDensity += large[i].density;
  }
  assert.ok(smallVolume > 0 && smallVolume < largeVolume * .4);
  assert.ok(smallDensity > 0 && smallDensity < largeDensity * .6);
  assert.equal(eruptionAppearance(sameSource('ash', .32)).style, 'ash', 'ash-rich does not imply the large preset');
});

test('lava strength changes normalized flux, width and spread on the same terrain', () => {
  for (const landform of ['shield', 'composite', 'scoria']) {
    const smallSettings = sameSource('flow', .32, landform), largeSettings = sameSource('flow', 1, landform);
    for (const branch of lavaBranches(smallSettings)) {
      const small = lavaRibbon(.72, smallSettings, branch, 24, 6), large = lavaRibbon(.72, largeSettings, branch, 24, 6);
      assert.ok(small.visible && large.visible); assert.ok(small.length < large.length);
      assert.ok(small.flux > 0 && small.flux < large.flux);
      const width = ribbon => Math.hypot(ribbon.positions[18] - ribbon.positions[0], ribbon.positions[20] - ribbon.positions[2]);
      assert.ok(width(small) < width(large));
      for (let i = 0; i < small.positions.length; i += 3) {
        const [x, y, z] = small.positions.slice(i, i + 3);
        assert.ok(y >= surfaceHeight(x, z, landform) + .007);
      }
      const end = lavaRibbon(1, smallSettings, branch, 24, 6);
      assert.equal(end.flux, 0); assert.ok(end.visible, 'cooling retains deposited lava');
      assert.deepEqual(end.positions, lavaRibbon(.85, smallSettings, branch, 24, 6).positions);
    }
  }
});

test('zero strength has no surface products while leaving a connected system connected', () => {
  const settings = sameSource('ash', 0), frame = eruptionFrame(.7, settings);
  assert.ok(frame.mechanism.connected); assert.equal(frame.intensity, 0); assert.equal(frame.relativeIntensity, 0);
  assert.equal(frame.lavaVisible, false);
  assert.ok(fragmentSchedule(settings).every(f => !f.active));
  assert.ok(frame.ash.every(parcel => parcel.radius === 0 && parcel.density === 0));
  for (const branch of lavaBranches(settings)) {
    const ribbon = lavaRibbon(.7, settings, branch);
    assert.equal(ribbon.visible, false); assert.equal(ribbon.flux, 0);
    assert.ok(ribbon.positions.every(Number.isFinite));
  }
});

test('six pure scenarios separate material style, strength, discrete vents and surface view', () => {
  assert.equal(ERUPTION_SCENARIOS.length, 6);
  assert.equal(new Set(ERUPTION_SCENARIOS.map(s => s.id)).size, 6);
  for (const scenario of ERUPTION_SCENARIOS) {
    assert.deepEqual(Object.keys(scenario).sort(), ['id', 'style', 'strength', 'vents', 'view'].sort());
    assert.ok(['exterior', 'vent', 'flow', 'plume'].includes(scenario.view));
    assert.equal(eruptionAppearance(scenarioSettings(scenario.id)).style, scenario.style);
    assert.equal(scenarioSettings(scenario.id).resistance, .35);
  }
  for (const [small, large] of [['low-spatter', 'high-fountain'], ['small-ash', 'strong-ash']]) {
    const { strength: a, ...smallSettings } = scenarioSettings(small), { strength: b, ...largeSettings } = scenarioSettings(large);
    assert.equal(a, .32); assert.equal(b, 1); assert.deepEqual(smallSettings, largeSettings);
  }
  const multiple = scenarioSettings('fissure-flow'); assert.equal(multiple.vents, 3);
  assert.equal(multiple.strength, scenarioSettings('gentle-flow').strength);
  assert.ok(Math.abs(flowBranches(multiple.vents).reduce((sum, branch) => sum + branch.share, 0) - 1) < 1e-12);
  assert.equal(scenarioSettings('small-ash', { strength: 4 }).strength, 1);
  assert.equal(scenarioSettings('small-ash', { resistance: .8 }).resistance, .8);
  assert.deepEqual(scenarioSettings('unknown'), scenarioSettings('gentle-flow'));
});

test('strength changes and seeking are deterministic and do not mutate caller settings', () => {
  const settings = Object.freeze(sameSource('ash', .32));
  const before = eruptionFrame(.74, settings), fragments = fragmentSchedule(settings);
  eruptionFrame(.99, sameSource('ash', 1)); fragmentSchedule(sameSource('fountain', 1)); eruptionFrame(.1, settings);
  assert.deepEqual(eruptionFrame(.74, settings), before); assert.deepEqual(fragmentSchedule(settings), fragments);
  assert.equal(settings.strength, .32); assert.equal(eruptionFrame(.74, settings).intensity, eruptionFrame(.74, { ...settings, strength: 1 }).intensity);
  assert.ok(before.relativeIntensity < eruptionFrame(.74, { ...settings, strength: 1 }).relativeIntensity);
});
