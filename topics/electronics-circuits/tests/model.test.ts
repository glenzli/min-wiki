import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCircuit, observeCircuit, circuitModeFromQuery } from '../model.ts';

test('a closed supply switch and intact return are both necessary for the manual lamp', () => {
  for (const switchClosed of [false, true]) for (const returnIntact of [false, true]) {
    const observation = observeCircuit({ ...initialCircuit(), switchClosed, returnIntact });
    assert.equal(observation.lampOn, switchClosed && returnIntact);
    assert.equal(observation.electronicConducting, true);
  }
});

test('automatic dark rule has an explicit strict threshold; equality stays off', () => {
  const state = { ...initialCircuit(), mode: 'automatic' as const, switchClosed: true };
  assert.equal(observeCircuit({ ...state, lightLevel: 39 }).lampOn, true);
  assert.equal(observeCircuit({ ...state, lightLevel: 40 }).lampOn, false);
  assert.equal(observeCircuit({ ...state, lightLevel: 41 }).lampOn, false);
});

test('changing a rule reverses the decision without changing the environment', () => {
  const state = { ...initialCircuit(), mode: 'automatic' as const, switchClosed: true, lightLevel: 20 };
  assert.equal(observeCircuit(state).lampOn, true);
  const reversed = observeCircuit({ ...state, rule: 'bright' });
  assert.equal(reversed.lampOn, false);
  assert.equal(reversed.sensorReading, 20);
});

test('a valid ON control signal cannot power a lamp across a broken return wire', () => {
  const observation = observeCircuit({ ...initialCircuit(), mode: 'automatic', switchClosed: true, returnIntact: false, lightLevel: 10 });
  assert.equal(observation.sensorReading, 10);
  assert.equal(observation.commandOn, true);
  assert.equal(observation.electronicConducting, true);
  assert.equal(observation.lampOn, false);
  assert.deepEqual(observation.blockers, ['return']);
});

test('sensor loss is unavailable input, not an invented reading of zero', () => {
  for (const rule of ['dark', 'bright'] as const) {
    const observation = observeCircuit({ ...initialCircuit(), mode: 'automatic', switchClosed: true, sensorConnected: false, lightLevel: 0, rule });
    assert.equal(observation.sensorReading, null);
    assert.equal(observation.belowThreshold, null);
    assert.equal(observation.lampOn, false);
    assert.deepEqual(observation.blockers, ['sensor']);
  }
});

test('manual operation does not depend on a disconnected sensor', () => {
  assert.equal(observeCircuit({ ...initialCircuit(), switchClosed: true, sensorConnected: false }).lampOn, true);
});

test('state projection is repeatable and does not consume stored conditions', () => {
  const state = { ...initialCircuit(), switchClosed: true, lightLevel: 15 };
  const manual = observeCircuit(state);
  observeCircuit({ ...state, mode: 'automatic' });
  assert.deepEqual(observeCircuit(state), manual);
  assert.equal(state.lightLevel, 15);
  assert.equal(state.mode, 'manual');
});

test('input extremes are bounded, and invalid routes have a useful default', () => {
  const observation = observeCircuit({ ...initialCircuit(), lightLevel: -10, threshold: 500 });
  assert.equal(observation.state.lightLevel, 0);
  assert.equal(observation.state.threshold, 100);
  assert.equal(observeCircuit({ ...initialCircuit(), lightLevel: NaN }).state.lightLevel, 70);
  assert.equal(circuitModeFromQuery('automatic'), 'automatic');
  assert.equal(circuitModeFromQuery('mystery'), 'manual');
});
