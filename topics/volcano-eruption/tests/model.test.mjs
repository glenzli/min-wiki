import test from 'node:test';
import assert from 'node:assert/strict';
import { ventPositions, supplyPerVent, explosivity, activity, clastTrajectory, clastPosition, flowBranches, CLAST_BUDGET, emissionSlot } from '../model.ts';
test('multiple vents divide a fixed supply without multiplying it', () => {
  for (const count of [1, 3]) assert.equal(ventPositions(count).length * supplyPerVent(count), 1);
  assert.ok(ventPositions(3).some(x => x < 0) && ventPositions(3).some(x => x > 0));
});
test('gas retention tendency and eruption activity remain bounded', () => {
  assert.ok(explosivity({ gas: .8, viscosity: .9, vents: 1 }) > explosivity({ gas: .8, viscosity: .1, vents: 1 }));
  assert.equal(activity(0), 0); assert.equal(activity(1), 0); assert.ok(activity(.6) > .99);
});
test('ejecta land on the lower slope instead of disappearing at vent height', () => {
  const slope = x => x * .35;
  const trajectory = clastTrajectory(0, 55, 90, slope);
  const sameHeightTime = -2 * trajectory.vy / trajectory.gravity;
  assert.ok(trajectory.impactTime > sameHeightTime);
  assert.ok(trajectory.impactY > trajectory.y);
  for (let time = 0; time < trajectory.impactTime; time += .015) {
    const point = clastPosition(trajectory, time);
    assert.ok(point.y <= slope(point.x) + 1e-5);
    assert.equal(point.landed, false);
  }
  const landing = clastPosition(trajectory, trajectory.impactTime);
  const later = clastPosition(trajectory, trajectory.impactTime + 2);
  assert.equal(landing.y, slope(landing.x));
  assert.equal(later.x, landing.x); assert.equal(later.y, landing.y);
  assert.ok(later.afterImpact >= 2 - 1e-8);
});
test('first surface intersection also works on rising terrain', () => {
  const ground = x => -x * .5 + Math.sin(x * .03) * 3;
  const trajectory = clastTrajectory(0, 60, 30, ground);
  const at = clastPosition(trajectory, trajectory.impactTime);
  assert.ok(Number.isFinite(at.x) && trajectory.impactTime > 0);
  assert.ok(Math.abs(at.y - ground(at.x)) < 1e-5);
});
test('visible flow shares and emission schedules preserve one total source', () => {
  for (const count of [1, 3]) {
    assert.ok(Math.abs(flowBranches(count).reduce((sum, branch) => sum + branch.share, 0) - 1) < 1e-12);
    const slots = Array.from({ length: CLAST_BUDGET }, (_, i) => emissionSlot(i, count));
    assert.equal(slots.length, CLAST_BUDGET);
    assert.ok(slots.every(slot => ventPositions(count).includes(slot.x)));
    assert.deepEqual(slots.map(slot => slot.birth), Array.from({ length: CLAST_BUDGET }, (_, i) => emissionSlot(i, 1).birth));
  }
});

test('a darkening flow surface does not imply its interior is cold',async()=>{
  const {lavaThermalState}=await import('../model.ts');
  let previous=1;
  for(let p=.8;p<=1.0001;p+=.005){
    const heat=lavaThermalState(p);
    assert.ok(heat.interiorGlow>=heat.surfaceGlow);
    assert.ok(heat.surfaceGlow<=previous+1e-10);previous=heat.surfaceGlow;
    assert.ok(heat.crust>=.24&&heat.crust<=1);
  }
  const end=lavaThermalState(1);assert.ok(end.surfaceGlow<.05);assert.ok(end.interiorGlow>.5);
});
