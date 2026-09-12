import test from 'node:test';
import assert from 'node:assert/strict';
import { leafletFold, signalArrival, response } from '../model.ts';
const local = { pinna: 1, extent: 'local' };
test('local touch affects the selected pinna while adjacent pinnae stay open', () => {
  assert.ok(leafletFold(.6, 1, 6, local) > .99);
  assert.equal(leafletFold(.6, 0, 6, local), 0);
});
test('propagation reaches the tip before the base and precedes closure', () => {
  assert.ok(signalArrival(1, 11, local) < signalArrival(1, 0, local));
  assert.equal(leafletFold(signalArrival(1, 6, local), 1, 6, local), 0);
  assert.ok(leafletFold(.22, 1, 11, local) > leafletFold(.22, 1, 0, local));
});
test('wider stimulation can reach the other pinnae and bend the petiole', () => {
  const whole = { ...local, extent: 'whole' };
  assert.ok(leafletFold(.6, 3, 6, whole) > .99);
  assert.ok(response(.6, whole).droop > .99);
  assert.equal(response(.6, local).droop, 0);
});
test('turgor loss is temporary and recovery reopens every leaflet', () => {
  assert.ok(response(.6, local).water < .4);
  assert.equal(response(1, local).water, 1);
  for (let pair = 0; pair < 12; pair++) assert.equal(leafletFold(1, 1, pair, local), 0);
});
