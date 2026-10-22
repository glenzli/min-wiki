import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COASTAL_PIECES, coastalParcels, coastalPiece, islandFlows } from '../coastalFlow.ts';
import { OceanCoastalFlow3D } from '../coastalFlow3d.ts';
import { islandVentOrigin, oceanGeometryFrame, surfaceHeight, WATER_Y } from '../geometry3d.ts';
import { oceanUniforms, stoneNoise } from '../materials3d.ts';

test('air condensation requires an advancing hot flow to cross the actual sea plane', () => {
  let seenEntry = false, seenEmergenceBeforeEntry = false;
  for (let step = 0; step <= 400; step++) {
    const p = step / 400, frame = oceanGeometryFrame(p, 'island', 'sustained'), flows = islandFlows(frame);
    const contacts = flows.filter(f => f.entry);
    const air = coastalParcels(frame, flows).filter(p => p.medium === 'air' && p.density > .001);
    const unreached = flows.filter(f => !f.entry && f.route.source[1] > WATER_Y && f.heat > .1);
    if (unreached.length) {
      seenEmergenceBeforeEntry = true;
      assert.ok(coastalParcels(frame, unreached).filter(p => p.medium === 'air').every(p => p.density === 0));
    }
    if (!contacts.length) assert.equal(air.length, 0);
    else {
      seenEntry = true; assert.ok(air.length > 0 && air.length <= 8);
      for (const flow of contacts) {
        const entry = flow.entry!;
        assert.ok(flow.heat > .001); assert.ok(flow.front > entry.distance);
        assert.equal(entry.point[1], WATER_Y);
        assert.ok(Math.abs(surfaceHeight(frame, entry.point[0], entry.point[2]) + .018 - WATER_Y) < .00002);
      }
    }
    assert.equal(coastalParcels(frame, flows).length, 16);
  }
  assert.equal(seenEntry, true); assert.equal(seenEmergenceBeforeEntry, true);
});

test('limited submerged supply has no coastal condensate, cap flow or invented ocean-entry explosion', () => {
  for (let step = 0; step <= 50; step++) {
    const frame = oceanGeometryFrame(step / 50, 'island', 'limited'), flows = islandFlows(frame);
    assert.ok(flows.every(f => !f.entry && f.unit.index < 13));
    assert.ok(coastalParcels(frame, flows).filter(p => p.medium === 'air').every(p => p.density === 0));
    assert.equal(Array.from({ length: COASTAL_PIECES }, (_, i) => coastalPiece(flows, i)).filter(p => p.visible).length, 0);
  }
});

test('cold flows retain emplacement through deposition and erode with their supporting rock', () => {
  const sample = (p: number) => islandFlows(oceanGeometryFrame(p, 'island', 'sustained'));
  const active = sample(.68), frozen = structuredClone(active);
  sample(1); sample(.10); assert.deepEqual(sample(.68), frozen);
  const settled = sample(.79), unchanged = sample(.81), eroded = sample(1), erodedFrame = oceanGeometryFrame(1, 'island', 'sustained');
  assert.equal(settled.length, 19); assert.equal(eroded.length, 19);
  for (const flow of settled) {
    const end = eroded.find(f => f.unit.index === flow.unit.index)!;
    assert.equal(flow.heat < .001, true); assert.deepEqual(flow.points, unchanged.find(f => f.unit.index === flow.unit.index)!.points);
    flow.points.forEach((p, i) => {
      assert.equal(end.points[i][0], p[0]); assert.equal(end.points[i][2], p[2]);
      assert.ok(end.points[i][1] <= p[1] + 1e-10);
      assert.ok(end.points[i][1] <= surfaceHeight(erodedFrame, p[0], p[2]) + .01800001);
    });
    assert.deepEqual(flow.route.fragments, end.route.fragments);
    assert.ok(flow.points.every(p => p.every(Number.isFinite)));
  }
  const pieces = Array.from({ length: COASTAL_PIECES }, (_, i) => coastalPiece(settled, i));
  assert.equal(pieces.filter(p => p.visible).length, 50);
  pieces.forEach((piece, i) => {
    const after = coastalPiece(eroded, i);
    assert.equal(after.position[0], piece.position[0]); assert.equal(after.position[2], piece.position[2]);
    assert.ok(after.position[1] <= piece.position[1] + 1e-10); assert.equal(after.scale, piece.scale);
  });
  assert.ok(coastalParcels(oceanGeometryFrame(1, 'island', 'sustained'), eroded).every(p => p.density === 0));
});

test('active channels share the current outlet while wet portions quench behind their advancing tips', () => {
  const frame = oceanGeometryFrame(.68, 'island', 'sustained'), flows = islandFlows(frame), source = islandVentOrigin(frame);
  for (const flow of flows.filter(f => f.heat > .01)) {
    assert.deepEqual(flow.route.source, source);
    assert.ok(flow.quench.some(q => q === 0));
    if (flow.entry) assert.ok(flow.quench.some(q => q > .98));
    else assert.ok(flow.points.every(p => p[1] > WATER_Y));
    assert.ok(flow.quench.every(q => q >= 0 && q <= 1));
    assert.ok(flow.points.every(p => p.every(Number.isFinite)));
  }
});

test('the retained flow adapter allocates fixed buffers and disposes only its own resources once', () => {
  const noise = stoneNoise(), ocean = oceanUniforms(), rock = new THREE.MeshStandardMaterial();
  const adapter = new OceanCoastalFlow3D(noise, ocean, rock), meshes = [...adapter.group.children] as THREE.Mesh[];
  assert.equal(meshes.length, 25); const channels = meshes.filter(m => m.geometry.hasAttribute('oceanSource'));
  assert.equal(channels.length, 19); assert.ok(channels.every(m => m.geometry.getAttribute('oceanQuench')));
  const buffers = meshes.map(m => m.geometry.getAttribute('position').array);
  let geometryDisposals = 0, ownMaterialDisposals = 0, borrowedDisposals = 0;
  meshes.forEach(m => m.geometry.addEventListener('dispose', () => geometryDisposals++));
  const ownMaterials = new Set(meshes.map(m => m.material as THREE.Material).filter(m => m !== rock));
  ownMaterials.forEach(m => m.addEventListener('dispose', () => ownMaterialDisposals++));
  rock.addEventListener('dispose', () => borrowedDisposals++);
  for (const p of [.68, 1, .08, .74]) adapter.draw(oceanGeometryFrame(p, 'island', 'sustained'));
  assert.ok(adapter.state.contacts > 0); assert.equal(adapter.state.fragments, 50);
  meshes.forEach((m, i) => assert.equal(m.geometry.getAttribute('position').array, buffers[i]));
  const cut = new THREE.Plane(new THREE.Vector3(0, 0, -1)); adapter.setCutaway(cut);
  assert.ok(channels.every(m => (m.material as THREE.Material).clippingPlanes?.[0] === cut));
  adapter.dispose(); adapter.dispose(); assert.equal(geometryDisposals, 25); assert.equal(ownMaterialDisposals, 20); assert.equal(borrowedDisposals, 0);
  rock.dispose(); noise.dispose();
});

test('erosion updates actual cooled skin buffers so no unsupported antenna survives at the summit', () => {
  const noise = stoneNoise(), rock = new THREE.MeshStandardMaterial(), adapter = new OceanCoastalFlow3D(noise, oceanUniforms(), rock);
  const channels = adapter.group.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && o.geometry.hasAttribute('oceanSource'));
  let sawErosion = false;
  adapter.draw(oceanGeometryFrame(.8, 'island', 'sustained'));
  const before = channels.map(mesh => new Float32Array(mesh.geometry.getAttribute('position').array));
  for (const p of [.85, .90, 1]) {
    const frame = oceanGeometryFrame(p, 'island', 'sustained'); adapter.draw(frame);
    channels.forEach((mesh, unit) => {
      const vertices = mesh.geometry.getAttribute('position'), source = mesh.geometry.getAttribute('oceanSource');
      for (let i = 0; i < vertices.count; i++) {
        const ground = surfaceHeight(frame, vertices.getX(i), vertices.getZ(i));
        assert.ok(vertices.getY(i) - ground < .04, 'cold display skin keeps low relief on supporting rock');
        if (source.getY(i) < -.45) assert.ok(vertices.getY(i) - ground < .06, 'the old summit end cannot remain in the air');
        if (vertices.getY(i) < before[unit][i * 3 + 1] - .1) sawErosion = true;
      }
    });
  }
  assert.equal(sawErosion, true);
  const aprons = adapter.group.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh) && !o.geometry.hasAttribute('oceanSource'));
  assert.equal(aprons.length, 5);
  for (const mesh of aprons) {
    const edges = new Map<string, number>(), index = mesh.geometry.getIndex()!;
    for (let i = 0; i < index.count; i += 3) for (let k = 0; k < 3; k++) {
      const a = index.getX(i + k), b = index.getX(i + (k + 1) % 3), key = `${Math.min(a, b)},${Math.max(a, b)}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
    assert.ok([...edges.values()].every(n => n === 2), 'cooled coastal facies has closed finite thickness');
    assert.ok([...mesh.geometry.getAttribute('position').array].every(Number.isFinite));
  }
  adapter.dispose(); rock.dispose(); noise.dispose();
});

test('condensation starts at sea level and bends over the sea rather than up the hillside', () => {
  const frame = oceanGeometryFrame(.68, 'island', 'sustained'), flows = islandFlows(frame), entry = flows.find(f => f.entry)!.entry!;
  const air = coastalParcels(frame, flows).filter(p => p.medium === 'air');
  assert.ok(Math.hypot(air[0].center[0] - entry.point[0], air[0].center[2] - entry.point[2]) < .00001);
  assert.ok(air[0].center[1] - WATER_Y < .05);
  for (let i = 1; i < air.length; i++) {
    const p = air[i];
    const seaward = (p.center[0] - entry.point[0]) * entry.seaward[0] + (p.center[2] - entry.point[2]) * entry.seaward[1];
    assert.ok(seaward > 0);
    assert.ok(surfaceHeight(frame, p.center[0], p.center[2]) < WATER_Y);
  }
});
