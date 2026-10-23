import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COASTAL_PIECES, coastalParcels, coastalPiece, FLOW_SEGMENTS, FLOW_SIDES, islandFlowBuffers, islandFlows, islandFlowSurfaceAge, updateIslandFlow } from '../coastalFlow.ts';
import { OceanCoastalFlow3D } from '../coastalFlow3d.ts';
import { depositBuffers, islandVentOrigin, oceanGeometryFrame, surfaceHeight, updateDeposit, WATER_Y } from '../geometry3d.ts';
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

test('early island bodies have broad attached undersides and closed thickness on the actual deposit triangles', () => {
  assert.equal(islandFlows(oceanGeometryFrame(.04, 'island', 'sustained')).length, 0, 'no extrusion precedes the first existing supply');
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  for (const p of [.041, .08, .12, .20, .35]) {
    const frame = oceanGeometryFrame(p, 'island', 'sustained'), terrain = depositBuffers();
    updateDeposit(terrain.positions, frame, frame.history.units.length - 1);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(terrain.positions, 3)); geometry.setIndex(terrain.indices);
    const ground = new THREE.Mesh(geometry, material);
    const rockAt = (x: number, z: number) => {
      ray.set(new THREE.Vector3(x, 20, z), down); const hit = ray.intersectObject(ground, false)[0];
      assert.ok(hit, 'every underside sample has a real supporting deposit triangle'); return hit.point.y;
    };
    const active = islandFlows(frame).filter(flow => flow.unit.growth < 1);
    assert.ok(active.length > 0 && active.length <= 2);
    for (const flow of active) {
      const data = islandFlowBuffers(); updateIslandFlow(data, flow, frame);
      const emplacement = new THREE.BufferGeometry();
      const previous = new Float32Array(terrain.positions);
      flow.route.ground.forEach((height, i) => {
        previous[i * 3 + 1] = height;
        previous[(i + flow.route.ground.length) * 3 + 1] = -1;
      });
      emplacement.setAttribute('position', new THREE.BufferAttribute(previous, 3)); emplacement.setIndex(terrain.indices);
      const oldRock = new THREE.Mesh(emplacement, material);
      const parentGeometry = flow.route.branch ? new THREE.BufferGeometry() : undefined;
      if (parentGeometry) {
        const vertices = previous.slice(), heights = flow.route.branch!.ground;
        heights.forEach((height, i) => { vertices[i * 3 + 1] = height; });
        parentGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3)); parentGeometry.setIndex(terrain.indices);
      }
      const parentRock = parentGeometry ? new THREE.Mesh(parentGeometry, material) : undefined;
      const supportAt = (x: number, z: number) => {
        const present = rockAt(x, z);
        ray.set(new THREE.Vector3(x, 20, z), down);
        const hit = ray.intersectObject(oldRock, false)[0]; assert.ok(hit);
        return Math.min(present, hit.point.y);
      };
      const floorAt = (x: number, z: number) => {
        const support = supportAt(x, z);
        if (!parentRock) return support;
        ray.set(new THREE.Vector3(x, 20, z), down);
        const hit = ray.intersectObject(parentRock, false)[0]; assert.ok(hit);
        return Math.min(support, hit.point.y);
      };
      assert.ok(data.positions.every(Number.isFinite)); assert.equal(flow.stage, 0);
      const edges = new Map<string, number>(); let volume = 0;
      for (let i = 0; i < data.indices.length; i += 3) {
        const triangle = data.indices.slice(i, i + 3), [a, b, c] = triangle.map(n => n * 3), v = data.positions;
        volume += (v[a] * (v[b + 1] * v[c + 2] - v[b + 2] * v[c + 1]) + v[a + 1] * (v[b + 2] * v[c] - v[b] * v[c + 2]) + v[a + 2] * (v[b] * v[c + 1] - v[b + 1] * v[c])) / 6;
        for (let k = 0; k < 3; k++) {
          const a = triangle[k], b = triangle[(k + 1) % 3], key = `${Math.min(a, b)},${Math.max(a, b)}`;
          edges.set(key, (edges.get(key) ?? 0) + 1);
        }
        // Face interiors matter: merely seating the centreline or even every
        // vertex can leave a floating lower triangle across a terrain crease.
        if (i % 9 || triangle.some(n => data.source[n * 3 + 2] > .001)) continue;
        const x = (v[a] + v[b] + v[c]) / 3, y = (v[a + 1] + v[b + 1] + v[c + 1]) / 3, z = (v[a + 2] + v[b + 2] + v[c + 2]) / 3;
        const contact = y - supportAt(x, z);
        assert.ok(contact <= .000002 && y - floorAt(x, z) > -.09, `complete underside stays seated at progress ${p}, deposit ${flow.unit.index}`);
      }
      assert.ok([...edges.values()].every(n => n === 2), 'one connected closed solid retains both end caps'); assert.ok(volume > 0);
      for (let row = 0; row <= FLOW_SEGMENTS; row += 8) for (let side = 0; side < FLOW_SIDES; side++) {
        const i = row * FLOW_SIDES + side;
        if (data.source[i * 3 + 2] > .001) continue;
        const x = data.positions[i * 3], y = data.positions[i * 3 + 1], z = data.positions[i * 3 + 2];
        assert.ok(y <= supportAt(x, z) && y >= floorAt(x, z) - .040002,
          'the lower width stays inside the real rock between the buried parent connector and its new emplacement');
        if (!flow.route.branch || data.distance[i] > .42) assert.ok(Math.abs(y - supportAt(x, z) + .04) < .000002);
        assert.ok(y <= rockAt(x, z), 'later deposits can bury the lobe but cannot leave it floating');
        assert.equal(data.quench[i], 1, 'the submerged underside cannot be a luminous ribbon');
      }
      for (let row = 0; row <= FLOW_SEGMENTS; row++) {
        const bottom = row * FLOW_SIDES, top = bottom + FLOW_SIDES / 2;
        assert.ok(data.positions[top * 3 + 1] - data.positions[bottom * 3 + 1] > .025, 'the retained solid never becomes a zero-thickness sheet');
      }
      if (p === .08 && flow.unit.index === 0) {
        const row = Math.round(FLOW_SEGMENTS * .4), first = row * FLOW_SIDES;
        const left = first + FLOW_SIDES / 4, right = first + FLOW_SIDES * 3 / 4;
        const width = Math.hypot(data.positions[left * 3] - data.positions[right * 3], data.positions[left * 3 + 2] - data.positions[right * 3 + 2]);
        assert.ok(width > .45 && width < .7, 'the reported early state shows a broad lobe');
        assert.ok(data.positions[(first + FLOW_SIDES / 2) * 3 + 1] - data.positions[first * 3 + 1] > .10, 'its crown has visible solid thickness');
        assert.ok(flow.widths[0] > .20 && flow.widths[0] < .26, 'the connected root fits the same roughly quarter-unit-radius outlet pocket');
      }
      emplacement.dispose();
      parentGeometry?.dispose();
    }
    geometry.dispose();
  }
  material.dispose();
});

test('the existing finite supplies advance one front with arrival-ordered rind and then stop', () => {
  for (let index = 0; index < 14; index++) {
    let previous = 0;
    for (let step = 1; step <= 24; step++) {
      const p = .04 + index * .029 + step / 24 * .055;
      const frame = oceanGeometryFrame(p, 'island', 'sustained'), flow = islandFlows(frame).find(f => f.unit.index === index)!;
      assert.ok(flow.front >= previous - 1e-10); previous = flow.front;
      assert.ok(flow.widths.every(width => width > 0), 'lobes are joined throughout their length');
      if (flow.unit.growth < 1 && !flow.route.branch) assert.deepEqual(flow.route.source, islandVentOrigin(frame));
      assert.ok(flow.points.every(p => p.every(Number.isFinite)));
      for (let row = 1; row <= FLOW_SEGMENTS; row++) {
        assert.ok(flow.arrivals[row] >= flow.arrivals[row - 1] - 1e-12);
        assert.ok(flow.quench[row] <= flow.quench[row - 1] + 1e-12, 'a submerged head is younger than its upstream skin');
      }
    }
    const completed = islandFlows(oceanGeometryFrame(.04 + index * .029 + .056, 'island', 'sustained')).find(f => f.unit.index === index)!;
    assert.equal(completed.feed, 0); assert.ok(completed.heat < .00001);
    assert.ok(completed.points.at(-1)![1] < completed.points[0][1], 'the completed route drains down its actual flank');
  }
  const frame = oceanGeometryFrame(.08, 'island', 'sustained'), flow = islandFlows(frame)[0];
  assert.ok(flow.feed > .9 && flow.heat > .5 && flow.quench[0] > .99 && flow.quench.at(-1)! < .01,
    'a quenched older root can contain the same hot finite supply that opens a fresh head');
  const row = 48, distance = flow.front * row / FLOW_SEGMENTS, age = islandFlowSurfaceAge(frame.p, flow.unit, distance, flow.route.length);
  assert.equal(islandFlowSurfaceAge(age.arrival, flow.unit, distance, flow.route.length).crust, 0);
  const partial = islandFlowSurfaceAge(age.arrival + .006, flow.unit, distance, flow.route.length).crust;
  assert.ok(partial > 0 && partial < 1); assert.equal(islandFlowSurfaceAge(age.arrival + .02, flow.unit, distance, flow.route.length).crust, 1);
  for (const supply of ['sustained', 'limited'] as const) {
    const end = oceanGeometryFrame(1, 'island', supply), flows = islandFlows(end);
    assert.equal(end.history.units.length, supply === 'sustained' ? 24 : 13);
    assert.equal(flows.length, supply === 'sustained' ? 19 : 13);
    assert.ok(flows.every(f => f.feed === 0 && f.heat < .00001));
    assert.ok(flows.every(f => (f.stage === 1) === (f.unit.phase === 'lava-cap')));
  }
});

test('selected lateral lobes emerge from an already reached parent, remain smaller and retain their own history', () => {
  const end = oceanGeometryFrame(.8, 'island', 'sustained');
  const branches = islandFlows(end).filter(flow => flow.route.branch);
  assert.equal(branches.length, 4);
  for (const supplied of branches) {
    for (const t of [.04, .35, .68, .99]) {
      const p = supplied.unit.start + (supplied.unit.end - supplied.unit.start) * t;
      const frame = oceanGeometryFrame(p, 'island', 'sustained'), flows = islandFlows(frame);
      const branch = flows.find(flow => flow.unit.index === supplied.unit.index)!;
      const anchor = branch.route.branch!, parent = flows.find(flow => flow.unit.index === anchor.parent)!;
      assert.ok(parent.front > anchor.distance, 'no child appears beyond the actual parent front');
      const q = anchor.distance / parent.route.length * FLOW_SEGMENTS;
      const i = Math.min(FLOW_SEGMENTS - 1, Math.floor(q)), fraction = q - i;
      const source = parent.route.points[i].map((v, axis) => v * (1 - fraction) + parent.route.points[i + 1][axis] * fraction);
      assert.deepEqual(branch.route.source, source, 'the side supply remains connected to that same retained parent');
      assert.ok(branch.route.length < parent.route.length * .60);
      const parentRow = Math.min(FLOW_SEGMENTS, Math.round(anchor.distance / parent.front * FLOW_SEGMENTS));
      assert.ok(branch.widths[0] < parent.widths[parentRow] * .8, 'the child neck fits inside the local parent body');
      assert.ok(Math.hypot(source[0] - parent.route.source[0], source[2] - parent.route.source[2]) > .35,
        'a side breakout cannot masquerade as another summit outlet');
      if (t === .04) assert.ok(parent.feed > .9 && parent.heat > .8, 'branch birth has a still-fed parent');
    }
    const sample = (p: number) => islandFlows(oceanGeometryFrame(p, 'island', 'sustained')).find(f => f.unit.index === supplied.unit.index)!;
    const cooled = sample(supplied.unit.end + .001), next = sample(.8);
    assert.deepEqual(cooled.route, next.route);
    assert.equal(next.feed, 0); assert.ok(next.heat < .00001);
  }
});

test('successive main flows reach different flanks while a born heading stays fixed through growth and replay', () => {
  const end = islandFlows(oceanGeometryFrame(.8, 'island', 'sustained'));
  const main = end.filter(flow => !flow.route.branch && flow.unit.index < 14);
  assert.ok(main.some(flow => flow.points.at(-1)![2] > 1));
  assert.ok(main.some(flow => flow.points.at(-1)![2] < -1), 'later supplies no longer remain in the original narrow forward fan');
  for (const flow of main) {
    const headings = [.004, .35, .75, 1.001].map(t => {
      const p = flow.unit.start + (flow.unit.end - flow.unit.start) * t;
      return islandFlows(oceanGeometryFrame(p, 'island', 'sustained')).find(f => f.unit.index === flow.unit.index)!.route.bearing;
    });
    assert.ok(headings.every(heading => heading === flow.route.bearing), 'advancing fronts do not rotate with the process or material phase');
  }
  const at = islandFlows(oceanGeometryFrame(.2, 'island', 'sustained'));
  islandFlows(oceanGeometryFrame(.47, 'island', 'limited'));
  assert.deepEqual(islandFlows(oceanGeometryFrame(.2, 'island', 'sustained')), at);
});

test('actual flow buffers keep ancestry through early, cap, erosion and return with bounded resources', () => {
  const noise = stoneNoise(), rock = new THREE.MeshStandardMaterial(), ocean = oceanUniforms(), owner = new OceanCoastalFlow3D(noise, ocean, rock);
  const objects = [...owner.group.children], meshes = objects.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && o.geometry.hasAttribute('oceanSource'));
  let bytes = 0;
  for (const mesh of objects as THREE.Mesh[]) {
    for (const attribute of Object.values(mesh.geometry.attributes)) bytes += attribute.array.byteLength;
    bytes += mesh.geometry.index?.array.byteLength ?? 0;
    if (mesh instanceof THREE.InstancedMesh) bytes += mesh.instanceMatrix.array.byteLength;
  }
  assert.ok(bytes < 4 * 1024 ** 2, 'all nineteen channels, five aprons and fifty fragments have a finite GPU budget');
  owner.draw(oceanGeometryFrame(.08, 'island', 'sustained'));
  const snapshot = meshes.map(m => ({ position: new Float32Array(m.geometry.getAttribute('position').array), quench: new Float32Array(m.geometry.getAttribute('oceanQuench').array), visible: m.visible }));
  for (const p of [.35, .62, .68, 1, .04, .08]) owner.draw(oceanGeometryFrame(p, 'island', 'sustained'));
  assert.deepEqual([...owner.group.children], objects);
  meshes.forEach((m, i) => {
    assert.equal(m.visible, snapshot[i].visible);
    if (m.visible) {
      assert.deepEqual(m.geometry.getAttribute('position').array, snapshot[i].position);
      assert.deepEqual(m.geometry.getAttribute('oceanQuench').array, snapshot[i].quench);
    }
  });
  for (const mesh of meshes.filter(m => m.visible)) {
    const distance = mesh.geometry.getAttribute('oceanDistance'), stage = mesh.geometry.getAttribute('oceanFlowStage'), uv = mesh.geometry.getAttribute('uv');
    assert.ok([...stage.array].every(value => value === 0));
    assert.ok(distance.getX(FLOW_SEGMENTS * FLOW_SIDES) > distance.getX(0));
    assert.ok(Math.cos(uv.getX(FLOW_SIDES / 2) * Math.PI * 2) > .99);
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader } as Parameters<THREE.Material['onBeforeCompile']>[0];
    (mesh.material as THREE.Material).onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    assert.ok((shader.uniforms.uFlowFeed as THREE.IUniform<number>).value > .9);
  }
  owner.draw(oceanGeometryFrame(.68, 'island', 'sustained')); assert.ok(owner.state.contacts > 0 && owner.state.fragments > 0);
  assert.ok(meshes.filter(m => m.visible && m.userData.unit >= 19).every(m => [...m.geometry.getAttribute('oceanFlowStage').array].every(value => value === 1)));
  owner.draw(oceanGeometryFrame(1, 'island', 'limited')); assert.equal(owner.state.retained, 13); assert.equal(owner.state.contacts, 0); assert.equal(owner.state.fragments, 0);
  owner.dispose(); rock.dispose(); noise.dispose();
});
