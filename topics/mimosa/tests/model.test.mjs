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

const { primaryPulvinus, tissuePoint, createMotorTissue } = await import('../anatomy.ts');
test('local leaflet folding does not deform or dehydrate the primary pulvinus', () => {
  assert.equal(response(.6, local).fold, 1);
  for (let i = 0; i <= 100; i++) {
    const primary = primaryPulvinus(i / 100, local);
    assert.equal(primary.contraction, 0);
    assert.equal(primary.lowerWater, 1);
    assert.equal(primary.flux, 0);
  }
});
test('primary lower-side support falls after the signal and restores with recovery', () => {
  const whole = {...local, extent: 'whole'};
  assert.equal(primaryPulvinus(.3, whole).contraction, 0);
  const bent = primaryPulvinus(.6, whole);
  assert.ok(bent.lowerTurgor < bent.upperTurgor);
  assert.ok(bent.lowerWater < bent.upperWater);
  assert.equal(bent.flux, 0, 'a paused held state must not imply continuing flow');
  assert.ok(primaryPulvinus(.45, whole).flux > 0);
  assert.ok(primaryPulvinus(.85, whole).recovering);
  assert.equal(primaryPulvinus(1, whole).lowerWater, 1);
});
test('one continuous deformation maps cell walls, vascular core and petiole downward', () => {
  assert.deepEqual(tissuePoint(40, 50, 0), [40, 50]);
  assert.ok(tissuePoint(320, 0, 1)[1] > 100, 'positive canvas y means petiole droops');
  for (const joint of [-190, 190]) {
    const a=tissuePoint(joint-.000001,0,1),b=tissuePoint(joint+.000001,0,1);
    assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1]) < .000003);
  }
  const cells = createMotorTissue();
  assert.deepEqual(cells,createMotorTissue(), 'cell identities are stable between draws and zooms');
  assert.ok(cells.every(cell=>cell.outline.length>=3));
  for (let bend=0;bend<=1;bend+=.05) for(const cell of cells) for(const [x,y] of cell.outline) {
    assert.ok(tissuePoint(x,y,bend).every(Number.isFinite));
  }
});
