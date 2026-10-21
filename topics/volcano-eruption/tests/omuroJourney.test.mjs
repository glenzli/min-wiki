import test from 'node:test';
import assert from 'node:assert/strict';
import { ecologyState, HABITATS } from '../ecologyModel.ts';
import { seed } from '../magmaGeometry.ts';
import { OMURO_MILESTONES, OMURO_SITES, omuroFrame, omuroJourney, omuroSiteState } from '../omuroJourney.ts';

test('the journey builds a mountain before its separate ecological clock starts', () => {
  assert.equal(omuroJourney(0).landGrowth, 0);
  for (let i = 0; i <= 32; i++) {
    const state = omuroJourney(i / 100);
    assert.equal(state.ecology.p, 0);
    assert.equal(state.ecology.vegetation, 0);
  }
  assert.equal(omuroJourney(.32).landGrowth, 1);
  assert.equal(omuroJourney(.49).ecology.cooling, 1);
  for (const habitat of HABITATS) {
    assert.equal(omuroJourney(1, habitat).landGrowth, 1);
    assert.equal(omuroJourney(1, habitat).deposition, 0);
    assert.equal(omuroJourney(1, habitat).land.activity, 0);
  }
  OMURO_MILESTONES.forEach((p, stage) => assert.equal(omuroJourney(p).stage, stage));
});

test('the life lens retains the original ecology clock and comparison conditions', () => {
  for (const habitat of HABITATS) for (const p of [0, .17, .42, .58, .72, 1]) {
    const frame = omuroFrame(p, habitat, 'life');
    assert.equal(frame.landGrowth, 1);
    assert.equal(frame.deposition, 0);
    assert.equal(frame.land.activity, 0);
    assert.deepEqual(frame.ecology, ecologyState(p, habitat));
    assert.equal(frame.ecology, frame.ecologyState);
  }
  const wet = omuroJourney(1, 'wet').ecology;
  for (const habitat of ['dry', 'cold', 'buried']) {
    const limited = omuroJourney(1, habitat).ecology;
    assert.equal(limited.seeds, wet.seeds);
    assert.ok(limited.vegetation < wet.vegetation * .2);
  }
});

test('sites retain original ecological identities while lifting the finite sample into 3D', () => {
  assert.equal(OMURO_SITES.length, 100);
  assert.equal(new Set(OMURO_SITES.map(s => s.index)).size, 100);
  for (const site of OMURO_SITES) {
    assert.equal(site.fertility, seed(site.index + 113));
    assert.equal(site.retention, .4 + seed(site.index + 63) * .6);
    assert.equal(site.arrivalStart, .28 + seed(site.index + 21) * .15);
  }
  assert.ok(OMURO_SITES.some(s => s.radius < .15));
  assert.ok(OMURO_SITES.some(s => Math.sin(s.angle) < 0));
  assert.ok(OMURO_SITES.some(s => Math.sin(s.angle) > 0));
});

test('vegetation establishes locally after cooling and seeds, rather than as one uniform coat', () => {
  for (let i = 0; i <= 40; i++) for (const site of OMURO_SITES) {
    assert.equal(omuroSiteState(site, ecologyState(i / 100, 'wet')).cover, 0);
  }
  const middle = OMURO_SITES.map(site => omuroSiteState(site, omuroJourney(.77).ecology));
  assert.ok(middle.some(s => s.cover === 0));
  assert.ok(middle.some(s => s.cover > .9));
  assert.ok(middle.some(s => s.cover > .05 && s.cover < .9));
  assert.ok(new Set(middle.map(s => s.soil)).size > 50);
});

test('seeking is bounded and deterministic; renewed ash can reverse established local cover', () => {
  for (const habitat of HABITATS) {
    for (let i = 0; i < 1000; i++) {
      const a = omuroJourney(i / 1000, habitat), b = omuroJourney((i + 1) / 1000, habitat);
      for (const key of ['landGrowth', 'deposition', 'heat']) {
        assert.ok(a[key] >= 0 && a[key] <= 1);
        assert.ok(Math.abs(a[key] - b[key]) < .04, `${key} remains continuous`);
      }
    }
    const frame = omuroJourney(.77, habitat); omuroJourney(1, habitat); omuroJourney(.13, habitat);
    assert.deepEqual(omuroJourney(.77, habitat), frame);
  }
  assert.deepEqual(omuroJourney(NaN), omuroJourney(0));
  assert.deepEqual(omuroJourney(-1), omuroJourney(0));
  assert.deepEqual(omuroJourney(2), omuroJourney(1));
  const before = OMURO_SITES.map(s => omuroSiteState(s, ecologyState(.65, 'buried')).cover).reduce((a, b) => a + b, 0);
  const after = OMURO_SITES.map(s => omuroSiteState(s, ecologyState(.8, 'buried')).cover).reduce((a, b) => a + b, 0);
  assert.ok(after < before);
});
