import test from 'node:test';
import assert from 'node:assert/strict';
import { coriolis, favorability, organization } from '../model.ts';
const favorable = { temperature: 29, shear: 5, hemisphere: 'north' };
test('Coriolis changes sign between hemispheres and vanishes at the equator', () => { assert.equal(coriolis(0), 0); assert.ok(coriolis(15) > 0); assert.equal(coriolis(-15), -coriolis(15)); });
test('warm water alone does not overcome strong shear or an equatorial position', () => {
  assert.equal(favorability(favorable), 1); assert.equal(favorability({ ...favorable, shear: 30 }), 0); assert.equal(favorability({ ...favorable, hemisphere: 'equator' }), 0); assert.ok(favorability({ ...favorable, temperature: 24 }) < .1);
});
test('storm organization develops continuously but only under the selected conditions', () => { assert.equal(organization(0, favorable), 0); assert.equal(organization(1, favorable), 1); assert.equal(organization(1, { ...favorable, shear: 30 }), 0); });

test('southern bands mirror northern geometry as well as reversing motion', async () => {
  const { spiralAngle } = await import('../model.ts');
  for (const radius of [35, 100, 180]) for (const p of [0, .5, 1]) {
    assert.ok(Math.abs(spiralAngle(radius, p, 0, 'north') + spiralAngle(radius, p, 0, 'south')) < 1e-12);
  }
  assert.ok(spiralAngle(100, .6, 0, 'north') < spiralAngle(100, .5, 0, 'north'));
});
