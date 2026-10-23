import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { islandVentOrigin, oceanGeometryFrame, surfaceHeight, type SolidBuffers } from '../geometry3d.ts';
import { burstCrust, burstEpisodes, burstFlash, burstShard, BURST_PIECES, extrusionEnvelope, extrusionRind, extrusionState, LIP_PIECES, submergedOutletCover, updateVentPocket, updateVentPocketDetail, updateVentRim, ventMorphology, ventOrigin, ventPocket, ventPocketDetail, ventRegime, ventRim, VENT_POCKET_RINGS, VENT_SECTORS } from '../ventMechanics.ts';
import { OceanVent3D } from '../vent3d.ts';
import { oceanUniforms, stoneNoise } from '../materials3d.ts';
import { pillowState } from '../model.ts';
import { islandRouteBearing } from '../coastalFlow.ts';

function geometry(data: SolidBuffers) {
  const result = new THREE.BufferGeometry(); result.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  result.setIndex(data.indices); result.computeVertexNormals(); return result;
}

function patchClearance(frame: ReturnType<typeof oceanGeometryFrame>, piece: number, pose: ReturnType<typeof burstShard>) {
  const object = new THREE.Object3D(), point = new THREE.Vector3(), data = burstCrust(piece);
  object.position.set(...pose.position); object.rotation.set(...pose.rotation); object.scale.set(...pose.dimensions); object.updateMatrix();
  let low = Infinity, high = -Infinity;
  for (let i = 0; i < data.positions.length; i += 3) {
    point.fromArray(data.positions, i).applyMatrix4(object.matrix);
    const clearance = point.y - surfaceHeight(frame, point.x, point.z);
    low = Math.min(low, clearance); high = Math.max(high, clearance);
  }
  return { low, high };
}

test('rind pieces are finite closed-thickness solids while the assembled outlet has a real opening', () => {
  const ray = new THREE.Raycaster(new THREE.Vector3(3, 0, 0), new THREE.Vector3(-1, 0, 0));
  for (let variant = 0; variant < 4; variant++) {
    for (let piece = -1; piece < LIP_PIECES; piece++) {
      const data = extrusionRind(variant, piece), edges = new Map<string, number>();
      assert.ok(data.positions.length < 6500); assert.ok(data.positions.every(Number.isFinite));
      for (let i = 0; i < data.indices.length; i += 3) for (let j = 0; j < 3; j++) {
        const a = data.indices[i + j], b = data.indices[i + (j + 1) % 3], key = `${Math.min(a, b)},${Math.max(a, b)}`;
        assert.ok(a >= 0 && a < data.positions.length / 3); edges.set(key, (edges.get(key) ?? 0) + 1);
      }
      assert.ok([...edges.values()].every(count => count === 2), 'every patch has inner, outer and fracture faces');
      const g = geometry(data), m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.position.set(...data.pivot); m.updateMatrixWorld();
      assert.equal(ray.intersectObject(m).length, 0, 'the crust cannot seal the emission axis'); g.dispose(); m.material.dispose();
    }
  }
  const rim = geometry(ventRim()), m = new THREE.Mesh(rim, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.updateMatrixWorld();
  assert.equal(new THREE.Raycaster(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0)).intersectObject(m).length, 0);
  rim.dispose(); m.material.dispose();
});

test('crust flex has a bounded periodic detail phase and cannot change retained extrusion', () => {
  const early = extrusionState(.04, .02, .5), open = extrusionState(.65, .35, 1), cold = extrusionState(1, 1, 0);
  assert.ok(open.opening > early.opening); assert.ok(cold.opening < open.opening);
  assert.equal(cold.hot, 0); assert.equal(cold.flex, 0);
  for (let variant = 0; variant < 4; variant++) {
    const start = extrusionState(.6, .3, 1, 0, variant), end = extrusionState(.6, .3, 1, Math.PI * 2, variant);
    assert.ok(Math.abs(start.flex - end.flex) < 1e-12);
    for (let step = 0; step < 200; step++) {
      const detail = extrusionState(.6, .3, 1, step / 199 * Math.PI * 2, variant);
      assert.ok(Math.abs(detail.flex) <= .025); assert.equal(detail.advance, start.advance);
      assert.equal(detail.opening, start.opening); assert.equal(detail.retained, start.retained);
    }
  }
});

test('an extrusion advances from one attached neck and retains the supplied growth proxy', () => {
  let tip = -Infinity;
  for (let step = 0; step <= 100; step++) {
    const growth = step / 100, envelope = extrusionEnvelope(growth);
    assert.ok(Math.abs(-1.3 * envelope.axial + envelope.offset + 1.3) < 1e-12, 'the feeding neck stays fixed');
    assert.ok(Math.abs(envelope.axial * envelope.radial ** 2 - growth) < 1e-12);
    const next = 1.4 * envelope.axial + envelope.offset;
    assert.ok(next > tip); tip = next;
  }
  assert.deepEqual(extrusionEnvelope(1), { axial: 1, radial: 1, offset: -0 });
});

test('a quenched opaque rind does not instantly solidify the supplied hot core or flex a completed shell', () => {
  const state = pillowState(.24, 0);
  assert.equal(state.crust, 1); assert.ok(state.coreHeat > .9);
  const warm = extrusionState(state.growth, state.crust, state.coreHeat, 1.3);
  assert.ok(warm.hot > .30, 'an exposed nose retains the independently supplied interior heat');
  assert.equal(warm.flex, 0, 'a completed shell cannot keep rocking merely because its interior is warm');
  const later = pillowState(.40, 0), cooler = extrusionState(later.growth, later.crust, later.coreHeat);
  assert.ok(cooler.hot > 0 && cooler.hot < warm.hot);
  const end = pillowState(1, 0); assert.equal(extrusionState(end.growth, end.crust, end.coreHeat).hot, 0);
});

test('explosive episodes belong to their selected mechanism and retain the original shallow count', () => {
  assert.equal(burstEpisodes('deep', 'sustained').length, 0);
  assert.equal(burstEpisodes('shallow', 'sustained').length, 7);
  assert.deepEqual(burstEpisodes('shallow', 'limited'), burstEpisodes('shallow', 'sustained'));
  assert.equal(burstEpisodes('island', 'sustained').length, 5); assert.equal(burstEpisodes('island', 'limited').length, 0);
  assert.equal(ventRegime(oceanGeometryFrame(.35, 'deep', 'sustained')), 'effusive');
  assert.equal(ventRegime(oceanGeometryFrame(.35, 'shallow', 'sustained')), 'explosive');
  assert.equal(ventRegime(oceanGeometryFrame(.51, 'island', 'sustained')), 'explosive');
});

test('early island outlet cover follows its selected history and leaves the distinct shallow and deep mechanisms intact', () => {
  const early = oceanGeometryFrame(.08, 'island', 'sustained');
  assert.equal(submergedOutletCover(early), 1);
  const start = early.history.units.find(unit => unit.phase === 'shallow-fragments')!.start;
  let previous = 1;
  for (let i = 0; i <= 20; i++) {
    const p = start - .04 + i * .002, cover = submergedOutletCover(oceanGeometryFrame(p, 'island', 'sustained'));
    assert.ok(cover >= 0 && cover <= previous); assert.ok(previous - cover < .1); previous = cover;
  }
  assert.equal(previous, 0);
  for (const environment of ['deep', 'shallow'] as const) {
    assert.equal(submergedOutletCover(oceanGeometryFrame(.08, environment, 'sustained')), 0);
  }
  assert.equal(submergedOutletCover(oceanGeometryFrame(.70, 'island', 'sustained')), 0);
  assert.equal(submergedOutletCover(early), 1, 'seeking back restores the same covered outlet');
});

test('opening a flank branch retains the summit mouth toward its feeding primary flow', () => {
  const frame = oceanGeometryFrame(.10, 'island', 'sustained');
  const units = structuredClone(frame.history.units.slice(0, 2)); units[0].growth = 1;
  for (const growth of [0, .25, .7, 1]) {
    units[1].growth = growth;
    const supplied = { ...frame, history: { ...frame.history, units } };
    assert.ok(Math.abs(ventMorphology(supplied).bearing - islandRouteBearing(frame, 0)) < 1e-12);
  }
  assert.ok(Math.abs(islandRouteBearing(frame, 1) - islandRouteBearing(frame, 0)) > .6,
    'the lateral flow really has a separate heading while the summit remains attached to the primary');
});

test('unequal curved fragments retain real variable thickness and closed angular fracture faces', () => {
  const thicknesses: number[] = [];
  for (let piece = 0; piece < BURST_PIECES; piece++) {
    const data = burstCrust(piece), count = data.fresh.findIndex(exposure => exposure > .9);
    const welded = new Map<string, number>(), vertexIds: number[] = [], edges = new Map<string, number>();
    assert.ok(count > 0);
    let low = Infinity, high = -Infinity, topLow = Infinity, topHigh = -Infinity;
    for (let i = 0; i < data.positions.length; i += 3) {
      const key = [...data.positions.slice(i, i + 3)].map(v => v.toFixed(7)).join(',');
      if (!welded.has(key)) welded.set(key, welded.size);
      vertexIds.push(welded.get(key)!);
    }
    for (let i = 0; i < count; i++) {
      const thickness = data.positions[i * 3 + 1] - data.positions[(i + count) * 3 + 1];
      assert.ok(thickness >= .0519 && thickness <= .0881, 'skin separation cannot degenerate into a card');
      low = Math.min(low, thickness); high = Math.max(high, thickness);
      topLow = Math.min(topLow, data.positions[i * 3 + 1]); topHigh = Math.max(topHigh, data.positions[i * 3 + 1]);
    }
    assert.ok(high - low > .015); assert.ok(topHigh - topLow > .025, 'each patch retains curved, uneven relief');
    thicknesses.push(high - low);
    for (let i = 0; i < data.indices.length; i += 3) for (let j = 0; j < 3; j++) {
      const a = vertexIds[data.indices[i + j]], b = vertexIds[data.indices[i + (j + 1) % 3]];
      const key = `${Math.min(a, b)},${Math.max(a, b)}`; edges.set(key, (edges.get(key) ?? 0) + 1);
    }
    assert.ok([...edges.values()].every(n => n === 2), 'top, underside and sharp duplicate-normal fracture faces close one solid');
  }
  assert.ok(new Set(thicknesses.map(n => n.toFixed(3))).size > 3);
});

test('each shard starts attached to the same finite crust, detaches continuously and cools during flight', () => {
  for (const environment of ['shallow', 'island'] as const) for (const episode of burstEpisodes(environment, 'sustained')) {
    for (let piece = 0; piece < BURST_PIECES; piece++) {
      const data = burstCrust(piece); assert.ok(data.positions.every(Number.isFinite)); assert.ok(data.positions.length < 3500);
      assert.ok(data.fresh.some(n => n < .01)); assert.ok(data.fresh.some(n => n > .9));
      const at = burstShard(oceanGeometryFrame(episode.start, environment, 'sustained'), episode, piece);
      let prior = at;
      for (let step = 1; step <= 120; step++) {
        const p = episode.start + step / 120 * (episode.duration + .003), frame = oceanGeometryFrame(p, environment, 'sustained');
        const shard = burstShard(frame, episode, piece);
        assert.equal(shard.visible, true); assert.equal(shard.scale, 1);
        assert.ok(shard.heat <= prior.heat + 1e-12); assert.ok(shard.position.every(Number.isFinite));
        if (shard.detached && !shard.settled && step % 12 === 0) {
          const support = patchClearance(frame, piece, shard);
          assert.ok(support.low >= .0078, 'the rotated thick solid, rather than its centre, clears the current terrain');
        }
        assert.ok(Math.hypot(...shard.position.map((n, i) => n - prior.position[i])) < .18, 'no detached replacement/teleport');
        prior = shard;
      }
      assert.equal(prior.settled, true); assert.equal(prior.heat, 0);
      assert.ok(Math.hypot(prior.position[0] - episode.origin[0], prior.position[2] - episode.origin[2]) > 1);
    }
  }
});

test('seeking restores burst identity; completed pieces never recycle into another explosion', () => {
  const episodes = burstEpisodes('shallow', 'sustained'), first = episodes[0];
  const sample = (p: number) => burstShard(oceanGeometryFrame(p, 'shallow', 'sustained'), first, 3);
  const before = sample(.09), flying = sample(.19), settled = sample(.60);
  sample(.03); assert.deepEqual(sample(.09), before); assert.deepEqual(sample(.19), flying);
  assert.deepEqual(sample(1), settled); assert.equal(settled.detached, true); assert.equal(settled.settled, true);
  assert.equal(burstFlash(oceanGeometryFrame(0, 'shallow', 'sustained'), episodes), 0);
  assert.equal(burstFlash(oceanGeometryFrame(1, 'shallow', 'sustained'), episodes), 0);
});

test('a full-thickness rind emerges and quenches at fixed footprint only after the previous one leaves', () => {
  for (const environment of ['shallow', 'island'] as const) {
    const episodes = burstEpisodes(environment, 'sustained');
    for (const event of episodes) {
      for (const piece of [0, 3, 6]) {
        const birth = burstShard(oceanGeometryFrame(event.born, environment, 'sustained'), event, piece);
        const cold = burstShard(oceanGeometryFrame(event.start, environment, 'sustained'), event, piece);
        assert.equal(birth.quench, 0); assert.equal(cold.quench, 1);
        assert.equal(birth.dimensions[0], cold.dimensions[0]); assert.equal(birth.dimensions[2], cold.dimensions[2]);
        assert.deepEqual(birth.dimensions, cold.dimensions, 'birth never crushes a completed solid into paper');
        assert.ok(patchClearance(oceanGeometryFrame(event.born, environment, 'sustained'), piece, birth).high < 0,
          'the retained full-width patch starts below the melt/terrain instead of materialising above it');
        assert.equal(birth.heat, 1); assert.equal(cold.heat, 1);
      }
    }
    for (let i = 0; i <= 1000; i++) {
      const frame = oceanGeometryFrame(i / 1000, environment, 'sustained');
      const attached = episodes.flatMap(e => Array.from({ length: BURST_PIECES }, (_, piece) => burstShard(frame, e, piece)))
        .filter(s => s.visible && !s.detached);
      assert.ok(attached.length <= BURST_PIECES, 'successive complete lids cannot materialise on top of each other');
    }
    assert.ok(new Set(episodes.map(e => e.dimensions.join(','))).size > 1, 'each deposited rind has its own unequal outline');
  }
});

test('piece-specific tumble meets terrain continuously and damps to retained rest without a final snap', () => {
  for (const environment of ['shallow', 'island'] as const) for (const episode of burstEpisodes(environment, 'sustained')) {
    const land = episode.start + episode.duration, frames = [land - episode.duration * .002, land - episode.duration * .001, land]
      .map(p => oceanGeometryFrame(p, environment, 'sustained'));
    const spins = new Set<string>();
    for (let piece = 0; piece < BURST_PIECES; piece++) {
      const states = frames.map(f => burstShard(f, episode, piece));
      const delta = (a: typeof states[number], b: typeof states[number]) => Math.hypot(...a.position.map((v, i) => v - b.position[i]), ...a.rotation.map((v, i) => v - b.rotation[i]));
      const settlingDelta = (a: typeof states[number], b: typeof states[number]) => Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2], ...a.rotation.map((v, i) => v - b.rotation[i]));
      assert.ok(settlingDelta(states[1], states[2]) < settlingDelta(states[0], states[2]) * .4, 'lateral travel and tumble slow smoothly; the supporting deposit can still grow vertically');
      assert.ok(settlingDelta(states[1], states[2]) < .0001);
      const epsilonEnd = episode.duration * 1e-6;
      const endBefore = burstShard(oceanGeometryFrame(land - epsilonEnd, environment, 'sustained'), episode, piece);
      const endAfter = burstShard(oceanGeometryFrame(land + epsilonEnd, environment, 'sustained'), episode, piece);
      assert.ok(delta(endBefore, endAfter) < .0001, 'freezing emplacement preserves position and orientation continuously');
      const contact = patchClearance(frames[2], piece, states[2]);
      assert.ok(contact.low >= .0078 && contact.low < .0082, 'some actual part of the solid is seated on its sloping emplacement');
      let left = episode.start, right = land;
      for (let i = 0; i < 25; i++) {
        const p = (left + right) / 2;
        if (burstShard(oceanGeometryFrame(p, environment, 'sustained'), episode, piece).contact) right = p; else left = p;
      }
      const epsilon = episode.duration * 1e-6;
      const before = burstShard(oceanGeometryFrame(left - epsilon, environment, 'sustained'), episode, piece);
      const after = burstShard(oceanGeometryFrame(right + epsilon, environment, 'sustained'), episode, piece);
      assert.ok(delta(before, after) < .0001, 'the actual first-contact boundary cannot replace or snap the solid');
      spins.add(burstShard(oceanGeometryFrame(episode.start + episode.duration * .40, environment, 'sustained'), episode, piece).rotation.map(v => v.toFixed(2)).join(','));
    }
    assert.equal(spins.size, BURST_PIECES);
  }
});

test('the island outlet keeps an open, reworked terrain-rooted rim across emergence and lava-cap transition', () => {
  const episodes = burstEpisodes('island', 'sustained');
  const a = ventRim(oceanGeometryFrame(.48, 'island', 'sustained'), episodes);
  const b = ventRim(oceanGeometryFrame(.70, 'island', 'sustained'), episodes);
  let footprintChange = 0;
  for (let i = 0; i < a.positions.length; i += 3) footprintChange = Math.max(footprintChange, Math.abs(a.positions[i] - b.positions[i]));
  assert.ok(footprintChange > .025, 'deposition reshapes geometry rather than translating the same shell');
  for (const p of [.445, .49, .56, .59099, .59101, .68, .82, 1]) {
    const frame = oceanGeometryFrame(p, 'island', 'sustained'), data = ventRim(frame, episodes), origin = islandVentOrigin(frame);
    assert.ok(data.positions.every(Number.isFinite));
    const n = 6 * 65;
    for (let i = 0; i < n; i++) {
      const [x, y, z] = data.positions.slice(i * 3, i * 3 + 3);
      const ground = surfaceHeight(frame, origin[0] + x, origin[2] + z);
      assert.ok(origin[1] + y >= ground - .009 && origin[1] + y < ground + .20);
    }
  }
  const before = ventRim(oceanGeometryFrame(.591 - 1e-6, 'island', 'sustained'), episodes);
  const after = ventRim(oceanGeometryFrame(.591 + 1e-6, 'island', 'sustained'), episodes);
  assert.ok(Math.max(...before.positions.map((v, i) => Math.abs(v - after.positions[i]))) < .001);
  assert.ok(ventMorphology(oceanGeometryFrame(.70, 'island', 'sustained')).build > ventMorphology(oceanGeometryFrame(.48, 'island', 'sustained')).build);
});

test('the closed melt pocket seats in the same irregular rim and only its active interior moves', () => {
  const pocket = ventPocket(), topology = pocket.indices, storage = pocket.positions, count = 1 + VENT_POCKET_RINGS * VENT_SECTORS;
  const detail = ventPocketDetail(), edges = new Map<string, number>();
  assert.equal(pocket.skin.length, count * 2);
  assert.ok(pocket.skin.slice(0, count).every(v => v === 1)); assert.ok(pocket.skin.slice(count).every(v => v === 0));
  for (let i = 0; i < pocket.indices.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = pocket.indices[i + j], b = pocket.indices[i + (j + 1) % 3], key = `${Math.min(a, b)},${Math.max(a, b)}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  assert.ok([...edges.values()].every(n => n === 2), 'top, bottom and perimeter make one closed pocket');
  for (const environment of ['shallow', 'island'] as const) {
    const episodes = burstEpisodes(environment, 'sustained');
    for (const p of [.10, .35, .49, .51, .59099, .59101, .65, .82, 1]) {
      const frame = oceanGeometryFrame(p, environment, 'sustained'), rim = ventRim(frame, episodes), origin = ventOrigin(frame);
      updateVentPocket(pocket.positions, frame, 0, episodes, detail);
      const before = pocket.positions.slice(); updateVentPocketDetail(pocket.positions, 1.37, detail);
      assert.equal(pocket.positions, storage); assert.equal(pocket.indices, topology);
      assert.ok(pocket.positions.every(Number.isFinite));
      for (let col = 0; col < VENT_SECTORS; col++) {
        const i = 1 + (VENT_POCKET_RINGS - 1) * VENT_SECTORS + col, r = VENT_SECTORS + 1 + col;
        assert.equal(pocket.positions[i * 3], rim.positions[r * 3]);
        assert.equal(pocket.positions[i * 3 + 2], rim.positions[r * 3 + 2]);
        assert.ok(Math.abs(pocket.positions[i * 3 + 1] - rim.positions[r * 3 + 1] + .007) < 1e-6,
          'the perimeter is embedded in its matching terrain-rooted rim ring');
        assert.equal(pocket.positions[i * 3 + 1], before[i * 3 + 1], 'the material phase cannot pulse the rim contact');
        assert.equal(pocket.uvs[i * 2], 1);
      }
      for (let i = 0; i < count; i++) {
        assert.ok(pocket.positions[i * 3 + 1] - pocket.positions[(i + count) * 3 + 1] > .065);
        assert.equal(pocket.positions[i * 3], before[i * 3]); assert.equal(pocket.positions[i * 3 + 2], before[i * 3 + 2]);
        assert.equal(pocket.positions[(i + count) * 3 + 1], before[(i + count) * 3 + 1]);
      }
      if (p === 1) {
        assert.deepEqual(pocket.positions, before, 'the attached cooled scar has no residual geometric pulse');
        for (let i = 0; i <= VENT_SECTORS * 4; i++) {
          const x = origin[0] + pocket.positions[i * 3], z = origin[2] + pocket.positions[i * 3 + 2];
          assert.ok(origin[1] + pocket.positions[i * 3 + 1] - surfaceHeight(frame, x, z) < .0101);
        }
      }
    }
    const hot = oceanGeometryFrame(environment === 'shallow' ? .35 : .65, environment, 'sustained');
    updateVentPocket(pocket.positions, hot, 0, episodes, detail); const phaseZero = pocket.positions.slice();
    updateVentPocketDetail(pocket.positions, 1.37, detail);
    assert.ok(Math.max(...pocket.positions.map((v, i) => Math.abs(v - phaseZero[i]))) > .002, 'active relief moves inside the seated boundary');
    updateVentPocketDetail(pocket.positions, Math.PI * 2, detail);
    assert.ok(Math.max(...pocket.positions.map((v, i) => Math.abs(v - phaseZero[i]))) < 1e-6);
    const rim = ventRim(), indices = rim.indices; updateVentRim(rim.positions, hot, episodes);
    assert.equal(rim.indices, indices);
  }
});

test('the GPU adapter retains fixed allocations, per-instance cooling, cutaway and one-time disposal', () => {
  const noise = stoneNoise(), uniforms = oceanUniforms();
  const vents = new OceanVent3D(noise, uniforms), all = [...vents.group.children], resources = new Set<THREE.BufferGeometry | THREE.Material>();
  vents.group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return; resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
  });
  const before = [...resources], frame = oceanGeometryFrame(.35, 'shallow', 'sustained'), copy = structuredClone(frame);
  vents.draw(frame); const detached = vents.state.detached;
  const shardMeshes = vents.group.children.filter((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh);
  assert.equal(shardMeshes.length, 7);
  assert.ok(shardMeshes.some(mesh => { const heat = mesh.geometry.getAttribute('oceanHeat'); return heat.getX(0) !== heat.getX(3); }));
  vents.updateDetail(1); vents.updateDetail(4); assert.deepEqual(frame, copy); assert.equal(vents.state.detached, detached);
  vents.draw(oceanGeometryFrame(.18, 'deep', 'sustained')); assert.equal(vents.state.detached, 0);
  vents.draw(frame); assert.equal(vents.state.detached, detached); assert.deepEqual([...vents.group.children], all);
  vents.draw(oceanGeometryFrame(1, 'shallow', 'sustained'));
  assert.equal(vents.state.exposedHeat, 0); assert.equal(vents.state.settled, 49);
  assert.ok(shardMeshes.every(mesh => [...mesh.geometry.getAttribute('oceanHeat').array].every(h => h === 0)));
  vents.draw(oceanGeometryFrame(1, 'deep', 'sustained')); assert.equal(vents.state.exposedHeat, 0);
  const island = oceanGeometryFrame(.68, 'island', 'sustained'); vents.draw(island);
  assert.ok(vents.state.opening > .9); assert.ok(vents.state.exposedHeat > .4);
  const outlet = vents.group.getObjectByName('ocean-retained-outlet')!;
  assert.deepEqual(outlet.position.toArray(), islandVentOrigin(island));
  const rim = vents.group.getObjectByName('ocean-reworked-rim') as THREE.Mesh;
  const pocket = vents.group.getObjectByName('ocean-attached-melt-pocket') as THREE.Mesh;
  const buffers = [rim.geometry, pocket.geometry].map(g => ({ position: g.getAttribute('position').array, index: g.index, normal: g.getAttribute('normal').array }));
  const shape = new Float32Array(rim.geometry.getAttribute('position').array);
  vents.updateDetail(1.6); assert.deepEqual(rim.geometry.getAttribute('position').array, shape);
  for (const progress of [.57, .5909, .5911, .65, .82, 1]) {
    vents.draw(oceanGeometryFrame(progress, 'island', 'sustained')); assert.equal(outlet.visible, true);
    [rim.geometry, pocket.geometry].forEach((g, i) => {
      assert.equal(g.getAttribute('position').array, buffers[i].position); assert.equal(g.index, buffers[i].index);
      assert.equal(g.getAttribute('normal').array, buffers[i].normal);
    });
  }
  const cooled = outlet.children.find(object => object instanceof THREE.Mesh && object !== rim) as THREE.Mesh;
  cooled.geometry.computeBoundingBox();
  assert.ok(cooled.position.y + cooled.geometry.boundingBox!.max.y * cooled.scale.y < .04,
    'after cooling, the retained melt becomes a flush skin rather than a round summit plug');
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0); vents.setCutaway(plane);
  vents.group.traverse(object => { if (object instanceof THREE.Mesh) assert.deepEqual(object.material.clippingPlanes, [plane]); });
  vents.setCutaway();
  let disposed = 0; before.forEach(r => r.addEventListener('dispose', () => disposed++));
  vents.dispose(); vents.dispose(); assert.equal(disposed, before.length);
  assert.equal(vents.group.children.length, 0); noise.dispose();
});
