import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneMarkup, plumeParcel, type SceneFrame } from '../scene.ts';
import { SEA_LEVEL } from '../model.ts';
import { islandVentOrigin, oceanGeometryFrame, RADIUS, surfaceHeight } from '../geometry3d.ts';
import { islandBasalPillow, ISLAND_BASAL_PILLOWS, oceanVentGlow } from '../scene3d.ts';
import { oceanEcologyClearance } from '../oceanEcology.ts';
import { islandFlows } from '../coastalFlow.ts';
const frame: SceneFrame = { progress: .35, weights: [1, 0, 0], supplyMix: 0, camera: [325, 226, 350, 233.333], section: .65 };

test('deep projection uses local ROV lighting and never sunlight shafts', () => {
  const deep = sceneMarkup(frame);
  assert.ok(deep.includes('data-lighting="rov"'));
  assert.ok(deep.includes('data-lighting="deep"'));
  assert.equal(deep.includes('data-lighting="sunlit-shallows"'), false);
  assert.ok(sceneMarkup({ ...frame, weights: [0, 1, 0] }).includes('data-lighting="sunlit-shallows"'));
});

test('underwater particulate parcels stay below the surface and finish without looping', () => {
  for (const environment of ['deep', 'shallow'] as const) for (let i = 0; i < 30; i++) {
    for (const progress of [0, .2, .45, .8, 1]) {
      const packet = plumeParcel(progress, i, environment === 'deep' ? 345 : 184, environment);
      assert.ok(packet.y > SEA_LEVEL);
      assert.ok(packet.opacity >= 0 && packet.opacity <= .46);
    }
    assert.equal(plumeParcel(0, i, 345, environment).opacity, 0);
    assert.equal(plumeParcel(1, i, 345, environment).opacity, 0);
  }
});

test('suspended particles and above-water condensation have different clipped projections', () => {
  const deep = sceneMarkup(frame), shallow = sceneMarkup({ ...frame, weights: [0, 1, 0] });
  assert.ok(deep.includes('data-material="suspended-particles" clip-path="url(#underwater)"'));
  assert.equal(deep.includes('data-material="condensation"'), false);
  assert.ok(shallow.includes('data-material="condensation" clip-path="url(#above-water)"'));
});

test('text-free deterministic detail remains stable at pause and at all scenario endpoints', () => {
  for (const weights of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as [number, number, number][]) {
    for (const progress of [.35, 1]) {
      const state = { ...frame, weights, progress };
      const a = sceneMarkup(state), b = sceneMarkup(state);
      assert.equal(a, b);
      assert.equal(/<text[ >]/.test(a), false);
      assert.equal(/NaN|Infinity/.test(a), false);
    }
  }
});

test('island cold basalt forms unequal overlapping patches with static flow and ecological clearance', () => {
  const frame = oceanGeometryFrame(.08, 'island', 'sustained');
  const pillows = Array.from({ length: ISLAND_BASAL_PILLOWS }, (_, i) => islandBasalPillow(frame, i));
  const routes = islandFlows(oceanGeometryFrame(.8, 'island', 'sustained'))
    .flatMap(flow => flow.points.map((position, i) => ({ position, width: flow.widths[i] })));
  assert.equal(pillows.length, 120, 'the four retained instance buffers keep their existing island count');
  let shortest = Infinity, longest = 0, shallowest = Infinity, deepest = 0, connected = 0;
  for (let i = 0; i < pillows.length; i++) {
    const pillow = pillows[i], [x, y, z] = pillow.position;
    assert.ok([...pillow.position, ...pillow.rotation, ...pillow.dimensions].every(Number.isFinite));
    const margin = Math.hypot(pillow.dimensions[0] * 1.5, pillow.dimensions[2] * 1.25);
    assert.ok(Math.hypot(x, z) + margin < RADIUS, 'the complete fixed lobe remains on the basal field');
    assert.equal(oceanEcologyClearance(x, z, margin, 'island'), false, 'later habitat footprints were reserved before playback');
    assert.ok(routes.every(point => Math.hypot(x - point.position[0], z - point.position[2]) > margin + point.width),
      'the complete lobe footprint clears the retained production flow routes');
    assert.ok(y < surfaceHeight(frame, x, z, 7), 'the lower shell enters its supporting rock');
    shortest = Math.min(shortest, pillow.dimensions[0]); longest = Math.max(longest, pillow.dimensions[0]);
    const burial = (surfaceHeight(frame, x, z, 7) - y) / pillow.dimensions[1];
    shallowest = Math.min(shallowest, burial); deepest = Math.max(deepest, burial);
    // Discontinuous short patches may have exposed ends; most lobes still
    // meet a nearby old lobe instead of returning to isolated random pebbles.
    if (pillows.some((other, j) => j !== i && Math.hypot(x - other.position[0], z - other.position[2])
      < (pillow.dimensions[0] + other.dimensions[0]) * 1.17 * Math.cos(.65))) connected++;
  }
  assert.ok(longest > shortest * 1.5, 'neighbouring retained shapes do not all have pebble-like equal lengths');
  assert.ok(deepest - shallowest > .25, 'unequal static burial interrupts the repeated ridge silhouette');
  assert.ok(connected > pillows.length * .9, 'short interrupted patches retain mostly adjoining lobes');
});

test('basal chains retain their sites and early support while later island deposits bury them', () => {
  const initial = oceanGeometryFrame(.08, 'island', 'sustained');
  const finished = oceanGeometryFrame(.8, 'island', 'sustained');
  const earlyEnd = finished.history.units[6].end;
  const early = oceanGeometryFrame(earlyEnd, 'island', 'sustained');
  let buried = 0;
  for (let i = 0; i < ISLAND_BASAL_PILLOWS; i++) {
    const a = islandBasalPillow(initial, i), b = islandBasalPillow(early, i), c = islandBasalPillow(finished, i);
    assert.deepEqual([a.position[0], a.position[2], a.rotation[0], a.rotation[1], a.dimensions],
      [c.position[0], c.position[2], c.rotation[0], c.rotation[1], c.dimensions]);
    assert.deepEqual(b, c, 'completed basal support cannot rise with later cap deposits');
    if (surfaceHeight(finished, c.position[0], c.position[2]) > c.position[1] + c.dimensions[1]) buried++;
    islandBasalPillow(oceanGeometryFrame(.48, 'island', 'limited'), i);
    assert.deepEqual(islandBasalPillow(initial, i), a, 'seeking another supply history does not mutate retained sites');
  }
  assert.ok(buried > 0, 'later terrain really covers part of the old basalt rather than moving all dressing to its surface');
});

test('early island melt gives a short local reflection while deep and shallow lighting keep their range', () => {
  const early = oceanGeometryFrame(.08, 'island', 'sustained'), origin = islandVentOrigin(early);
  const glow = oceanVentGlow(early, 1);
  assert.deepEqual([glow.position[0], glow.position[2]], [origin[0], origin[2]]);
  assert.ok(glow.position[1] > origin[1] && glow.position[1] - origin[1] < .05);
  assert.ok(glow.intensity <= .36 && glow.distance < 1, 'deeply submerged island heat cannot illuminate a broad lamp-like halo');
  assert.equal(oceanVentGlow(early, 0).intensity, 0);
  const later = oceanVentGlow(oceanGeometryFrame(.62, 'island', 'sustained'), 1);
  assert.equal(later.intensity, 6); assert.equal(later.distance, 3);
  const focus: [number, number, number] = [.4, .8, -.1];
  const deep = oceanVentGlow(oceanGeometryFrame(.4, 'deep', 'sustained'), .5, focus);
  assert.deepEqual(deep.position, [.4, .8 + .12, -.1]);
  assert.equal(deep.intensity, 3); assert.equal(deep.distance, 3);
  const shallow = oceanVentGlow(oceanGeometryFrame(.4, 'shallow', 'sustained'), .5);
  assert.equal(shallow.intensity, 3); assert.equal(shallow.distance, 3);
});
