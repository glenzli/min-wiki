import test from 'node:test';
import assert from 'node:assert/strict';
import { nearGroundRotation, readout } from '../model.ts';
const settings = { shear: .8, updraft: .85, condensation: true };
test('storm rotation precedes near-ground tornado circulation', () => { assert.equal(nearGroundRotation(.5, settings), 0); assert.equal(readout(.5, settings).value, 'storm'); assert.equal(readout(1, settings).value, 'tornado'); });
test('hiding condensation does not remove the dynamical vortex', () => { assert.equal(nearGroundRotation(1, settings), nearGroundRotation(1, { ...settings, condensation: false })); });
test('weak updraft or weak shear does not show a tornado in this teaching case', () => { assert.equal(nearGroundRotation(1, { ...settings, updraft: .1 }), 0); assert.equal(nearGroundRotation(1, { ...settings, shear: .1 }), 0); });

test('air traces remain aloft before the near-ground stage and stay aloft for a weak case', async () => {
  const { traceBottom } = await import('../model.ts');
  assert.ok(traceBottom(.58, settings) < 100);
  assert.ok(traceBottom(.7, settings) < 100);
  assert.equal(traceBottom(1, settings), 133);
  assert.ok(traceBottom(1, { ...settings, shear: 0 }) < 100);
  assert.equal(traceBottom(1, settings), traceBottom(1, { ...settings, condensation: false }));
});
