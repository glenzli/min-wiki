import test from 'node:test';
import assert from 'node:assert/strict';
import { OMURO_DEPOSIT_LAYERS, OMURO_SITES, omuroFormationGrowth, omuroFrame, omuroJourney } from '../omuroJourney.ts';
import { OMURO_BLADES_PER_SITE, OMURO_CLAST_COUNT, omuroBlade, omuroClast, omuroLayerRadius, omuroSitePoint, omuroSurface } from '../omuroGeometry.ts';
import { omuroGroundMaterial, omuroTextures } from '../omuroMaterials.ts';

test('retained beds add thickness within fixed supports rather than stretching the finished cone', () => {
  for (let layer = 0; layer < OMURO_DEPOSIT_LAYERS; layer++) {
    const before = layer / OMURO_DEPOSIT_LAYERS, after = (layer + .9) / OMURO_DEPOSIT_LAYERS;
    for (let x = .2; x < 4.9; x += .19) {
      const a = omuroSurface(x, 0, before), b = omuroSurface(x, 0, after);
      assert.ok(b >= a - 1e-12, 'previous deposits do not retract');
      if (x > omuroLayerRadius(layer)) assert.equal(a, b, 'a bed cannot extend its fixed support');
    }
  }
  assert.equal(omuroSurface(3, 0, .1), 0);
  assert.ok(omuroSurface(.6, 0, .1) > 0);
  assert.ok(omuroSurface(3, 0, .8) > 0);
  for (const site of OMURO_SITES) {
    const early = omuroSitePoint(site, .1), later = omuroSitePoint(site, 1);
    assert.equal(early[0], later[0]); assert.equal(early[2], later[2]);
  }
  const frame = omuroJourney(.2);
  const retained = frame.land.deposits.reduce((sum, bed) => sum + bed.growth, 0) / OMURO_DEPOSIT_LAYERS;
  assert.ok(Math.abs(retained - frame.landGrowth) < 1e-12);
});

test('finite clasts travel from the vent above the contemporaneous surface to persistent landing sites', () => {
  let burialCount = 0;
  for (let index = 0; index < OMURO_CLAST_COUNT; index++) {
    const parcel = omuroClast(index, 0);
    assert.equal(parcel.visible, false);
    const launch = omuroClast(index, parcel.birth);
    assert.ok(launch.position[0] === 0 && launch.position[2] === 0);
    assert.ok(launch.visible && !launch.settled);
    assert.equal(launch.displayScale, 2.8);
    for (let k = 0; k < 100; k++) {
      const p = parcel.birth + parcel.flight * k / 100, sample = omuroClast(index, p);
      const ground = omuroSurface(sample.position[0], sample.position[2], omuroFormationGrowth(p));
      assert.ok(sample.position[1] > ground, 'an airborne parcel stays above the growing ground');
    }
    const impact = omuroClast(index, parcel.impact), cooled = omuroClast(index, parcel.impact + .012);
    assert.ok(impact.visible && impact.settled);
    assert.ok(Math.hypot(...impact.position.map((value, i) => value - parcel.landing[i])) < 1e-12);
    assert.deepEqual(cooled.position, parcel.landing, 'settled parcels do not lift with later terrain');
    assert.equal(cooled.heat, 0);
    assert.ok(cooled.displayScale >= 1.6 - 1e-12 && cooled.displayScale < launch.displayScale);
    const final = omuroClast(index, 1);
    assert.deepEqual(final.position, cooled.position);
    if (final.buried) { burialCount++; assert.equal(final.visible, false); }
    omuroClast(index, .13); assert.deepEqual(omuroClast(index, parcel.impact), impact);
  }
  assert.ok(burialCount > OMURO_CLAST_COUNT / 2);
});

test('a readable sparse material path replaces a whole-slope field of hot particles', () => {
  let maxAirborne = 0;
  for (let i = 0; i <= 320; i++) {
    const parcels = Array.from({ length: OMURO_CLAST_COUNT }, (_, index) => omuroClast(index, i / 1000));
    maxAirborne = Math.max(maxAirborne, parcels.filter(p => p.visible && !p.settled).length);
  }
  assert.ok(maxAirborne > 0 && maxAirborne <= 8);
  const textures = omuroTextures();
  for (const cut of [false, true]) {
    const { material } = omuroGroundMaterial(textures.grain, textures.field, cut);
    assert.equal(material.emissive.getHex(), 0, 'retained ground carries no whole-slope glow');
    material.dispose();
  }
  textures.grain.dispose(); textures.field.dispose();
});

test('close inspection leaves remain low turf while the original habitat contrast persists', () => {
  const wet = omuroFrame(1), dry = omuroFrame(1, 'dry');
  let wetLeaves = 0, dryLeaves = 0;
  for (const site of OMURO_SITES) for (let i = 0; i < OMURO_BLADES_PER_SITE; i++) {
    const a = omuroBlade(site, i, wet), b = omuroBlade(site, i, dry);
    assert.ok(a.height <= .0102 && a.width <= .003);
    assert.deepEqual(a.position, b.position);
    wetLeaves += a.growth; dryLeaves += b.growth;
  }
  assert.ok(dryLeaves < wetLeaves * .2);
});
