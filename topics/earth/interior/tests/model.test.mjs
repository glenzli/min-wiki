import test from 'node:test';
import assert from 'node:assert/strict';
import { EARTH, DEFAULT_STATE, restoreState, serializeState, radialPosition, compositionAtDepth, plateFrame, waveObservation } from '../model.ts';
import { readFileSync } from 'node:fs';

test('the whole-Earth cutaway uses one radius scale, including a genuinely thin crust', () => {
  const r = 171;
  assert.equal(radialPosition(0, r), r);
  assert.equal(radialPosition(EARTH.radiusKm, r), 0);
  const crustPixels = r - radialPosition(EARTH.referenceContinentalCrustKm, r);
  assert.ok(crustPixels > 0 && crustPixels < 1);
  assert.equal(radialPosition(EARTH.radiusKm - EARTH.coreRadiusKm, r), EARTH.coreRadiusKm / EARTH.radiusKm * r);
  assert.equal(radialPosition(EARTH.radiusKm - EARTH.innerCoreRadiusKm, r), EARTH.innerCoreRadiusKm / EARTH.radiusKm * r);
  assert.ok(EARTH.referenceOceanicCrustKm < EARTH.referenceContinentalCrustKm);
  assert.ok(EARTH.referenceContinentalCrustKm < EARTH.referenceLithosphereKm);
});

test('composition boundaries do not mistake the lithosphere for a separate compositional shell', () => {
  assert.equal(compositionAtDepth(0), 'crust');
  assert.equal(compositionAtDepth(29), 'crust');
  assert.equal(compositionAtDepth(30), 'mantle');
  assert.equal(compositionAtDepth(70), 'mantle');
  assert.equal(compositionAtDepth(2885), 'mantle');
  assert.equal(compositionAtDepth(2886), 'outerCore');
  assert.equal(compositionAtDepth(5149), 'outerCore');
  assert.equal(compositionAtDepth(5150), 'innerCore');
});

test('introductory wave evidence distinguishes liquid transmission from refraction shadows', () => {
  assert.equal(waveObservation('P', 60).arrives, true);
  assert.equal(waveObservation('S', 60).arrives, true);
  assert.equal(waveObservation('P', 120).arrives, false);
  assert.equal(waveObservation('P', 120).inPShadow, true);
  assert.equal(waveObservation('P', 120).blockedByLiquid, false);
  assert.equal(waveObservation('P', 160).arrives, true);
  assert.equal(waveObservation('P', 160).crossesLiquidCore, true);
  for (const angle of [120, 160]) {
    assert.equal(waveObservation('S', angle).arrives, false);
    assert.equal(waveObservation('S', angle).blockedByLiquid, true);
  }
});

test('all four no-relative-motion controls preserve geometry at every retained progress', () => {
  for (const boundary of ['divergent', 'subduction', 'collision', 'transform']) {
    for (const progress of [0, 25, 50, 100]) {
      const frame = plateFrame(boundary, 'still', progress);
      assert.equal(frame.progress, progress / 100);
      assert.equal(frame.effectiveProgress, 0);
      for (const key of ['leftShift', 'rightShift', 'opening', 'slabDepth', 'crustalThickening', 'alongFaultOffset']) assert.ok(frame[key] === 0);
      assert.equal(frame.newCrust, false);
      assert.equal(frame.mantleMelt, false);
    }
  }
});

test('different boundary prerequisites yield different outcomes, with reversible progress', () => {
  const divergent = plateFrame('divergent', 'moving', 100);
  assert.equal(divergent.opening, 120);
  assert.equal(divergent.rightShift - divergent.leftShift, divergent.opening);
  assert.equal(divergent.newCrust, true);
  assert.equal(divergent.slabDepth, 0);
  const subduction = plateFrame('subduction', 'moving', 100);
  assert.equal(subduction.slabDepth, 148);
  assert.equal(subduction.mantleMelt, true);
  assert.equal(plateFrame('subduction', 'moving', 50).mantleMelt, false);
  assert.equal(subduction.newCrust, false);
  const collision = plateFrame('collision', 'moving', 100);
  assert.equal(collision.crustalThickening, 90);
  assert.equal(collision.mantleMelt, false);
  const transform = plateFrame('transform', 'moving', 100);
  assert.equal(transform.alongFaultOffset, 110);
  assert.equal(transform.slabDepth, 0);
  assert.equal(transform.newCrust, false);
  for (const boundary of ['divergent', 'subduction', 'collision', 'transform']) {
    const middle = plateFrame(boundary, 'moving', 50);
    plateFrame(boundary, 'moving', 100);
    plateFrame(boundary, 'moving', 0);
    assert.deepEqual(plateFrame(boundary, 'moving', 50), middle);
  }
});

test('restoration rejects malformed, nonfinite, excessive, and unrecognized state values', () => {
  const state = restoreState({ interiorDepth: '4000km', interiorProgress: 'Infinity', interiorStation: '90', interiorWave: 'X', interiorBoundary: 'earthquake', interiorMotion: 'fast', interiorView: '<script>', interiorExplain: 'true' });
  assert.deepEqual(state, DEFAULT_STATE);
  for (const value of ['-1', '6372', '001', '1.5', '1e2', ' 30 ', 'NaN']) assert.equal(restoreState({ interiorDepth: value }).interiorDepth, DEFAULT_STATE.interiorDepth);
  const example = { ...DEFAULT_STATE, interiorView: 'plates', interiorDepth: 4000, interiorLayer: 'outerCore', interiorProgress: 63, interiorBoundary: 'subduction', interiorExplain: true };
  assert.deepEqual(restoreState(serializeState(example)), example);
  assert.equal(restoreState({ interiorLayer: 'lithosphere', interiorLens: 'composition' }).interiorLayer, 'crust');
  assert.equal(restoreState({ interiorLayer: 'innerCore' }).interiorDepth, 5800);
  assert.equal(restoreState({ interiorLayer: 'crust', interiorDepth: '4000' }).interiorLayer, 'outerCore');
  assert.equal(restoreState({ interiorDepth: '70', interiorLens: 'mechanical' }).interiorLayer, 'lithosphere');
  assert.equal(restoreState({ interiorYaw: '-181', interiorPitch: '66', interiorZoom: '161', interiorRenderer: 'video' }).interiorYaw, DEFAULT_STATE.interiorYaw);
  const cameraState = { ...DEFAULT_STATE, interiorRenderer: 'section', interiorYaw: 123, interiorPitch: -40, interiorZoom: 67 };
  assert.deepEqual(restoreState(serializeState(cameraState)), cameraState);
});

test('Chinese and English expose equivalent scientific content structure', () => {
  const { zh, en } = JSON.parse(readFileSync(new URL('../content.json', import.meta.url), 'utf8'));
  function shape(value) { return Array.isArray(value) ? value.map(shape) : typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)])) : typeof value; }
  assert.deepEqual(shape(zh), shape(en));
  for (const lang of [zh, en]) {
    assert.equal(Object.keys(lang.views).length, 4);
    assert.equal(Object.keys(lang.boundaries).length, 4);
    for (const boundary of Object.values(lang.boundaries)) assert.equal(boundary.stages.length, 3);
  }
});
