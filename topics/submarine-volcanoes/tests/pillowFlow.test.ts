import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { oceanGeometryFrame, surfaceHeight } from '../geometry3d.ts';
import { pillowFlow, pillowFlowBuffers, pillowFlowCorridor, pillowSurfaceAge, updatePillowFlow, PILLOW_FLOW_ROWS, PILLOW_FLOW_SIDES } from '../pillowFlow.ts';
import { OceanPillowFlow3D } from '../pillowFlow3d.ts';
import { oceanUniforms, stoneNoise } from '../materials3d.ts';

test('each finite extrusion stays attached to one neck while its front advances along a downhill path', () => {
  for (let index = 0; index < 14; index++) {
    const born = .06 + index * .043, complete = pillowFlow(oceanGeometryFrame(born + .09, 'deep', 'sustained'), index);
    let previous = .035;
    for (let step = 0; step <= 24; step++) {
      const flow = pillowFlow(oceanGeometryFrame(born + step / 24 * .09, 'deep', 'sustained'), index);
      assert.ok(flow.distance >= previous - 1e-10); previous = flow.distance;
      assert.equal(flow.source[0], complete.source[0]); assert.equal(flow.source[2], complete.source[2]);
      assert.ok(Math.abs(flow.source[1] - surfaceHeight(flow.support, flow.source[0], flow.source[2])) < 1e-10);
    }
    assert.ok(previous > 1.1 && previous < 2, 'the supplied lobe visibly extends rather than just inflating a round core');
    assert.ok(complete.front[1] < complete.source[1] - .05, 'the tongue drains down the selected flank');
    assert.ok(Math.hypot(complete.front[0]-complete.source[0],complete.front[2]-complete.source[2]) > complete.length * .5,
      'the advancing front cannot loop back and inflate over the same spot');
    for (let i = 1; i < complete.rows.length; i++) assert.ok(complete.rows[i].center[1] <= complete.rows[i - 1].center[1] + .025,
      'small rock roughness stays below the supplied flow thickness');
  }
});

test('crust is ordered by arrival, leaving a fresh advancing head and an older quenched wake', () => {
  const index = 5, p = .06 + index * .043 + .067, flow = pillowFlow(oceanGeometryFrame(p, 'deep', 'sustained'), index);
  assert.ok(flow.rows[0].crust > .95); assert.ok(flow.rows.at(-1)!.crust < .01);
  for (let i = 1; i < flow.rows.length; i++) {
    assert.ok(flow.rows[i].arrival >= flow.rows[i - 1].arrival);
    assert.ok(flow.rows[i].crust <= flow.rows[i - 1].crust + 1e-12);
  }
  const distance = flow.rows[32].distance, at = pillowSurfaceAge(p, index, distance, flow.length);
  assert.equal(pillowSurfaceAge(at.arrival, index, distance, flow.length).crust, 0);
  const later = pillowSurfaceAge(at.arrival + .026, index, distance, flow.length);
  assert.ok(later.crust > 0 && later.crust < 1); assert.equal(pillowSurfaceAge(at.arrival + .06, index, distance, flow.length).crust, 1);
});

test('interior supply keeps an advancing tongue open but ends before the retained lobe cools through', () => {
  for (let index = 0; index < 14; index++) {
    const born = .06 + index * .043;
    const at = (p:number) => pillowFlow(oceanGeometryFrame(p,'deep','sustained'),index);
    assert.equal(at(born).feed,0);
    const growing = at(born+.06), placed = at(born+.091), cold = at(1);
    assert.ok(growing.feed>.9 && growing.rows[0].crust>.8,
      'older surface can be quenched while the interior is still supplying an opening');
    assert.equal(placed.feed,0); assert.ok(placed.coreHeat>.9);
    assert.equal(cold.feed,0); assert.equal(cold.coreHeat,0);
    const section = growing.rows[32];
    assert.ok(section.width*2>section.height*2.5,'the body spreads as a low tongue instead of round beads');
  }
});

test('background-rock clearances belong to the complete fixed routes rather than the current hot front', () => {
  const early = pillowFlow(oceanGeometryFrame(.28,'deep','sustained'),5), complete=pillowFlow(oceanGeometryFrame(.60,'deep','sustained'),5);
  assert.ok(early.distance < complete.distance);
  for (const row of complete.rows) assert.equal(pillowFlowCorridor(row.center[0],row.center[2],.15),true);
  assert.equal(pillowFlowCorridor(8,8,.4),false);
});

test('closed flow solids have finite thickness, ground contact, coherent UV distance and a bounded buffer cost', () => {
  const flow = pillowFlow(oceanGeometryFrame(.35, 'deep', 'sustained'), 6), data = pillowFlowBuffers(); updatePillowFlow(data, flow);
  const edges = new Map<string, number>();
  for (let i = 0; i < data.indices.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = data.indices[i + j], b = data.indices[i + (j + 1) % 3], key = `${Math.min(a,b)},${Math.max(a,b)}`;
    assert.ok(a >= 0 && a < data.positions.length / 3); edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  assert.ok([...edges.values()].every(count => count === 2)); assert.ok(data.positions.every(Number.isFinite));
  let volume = 0;
  for (let i=0;i<data.indices.length;i+=3) {
    const [a,b,c]=data.indices.slice(i,i+3).map(n=>n*3),p=data.positions;
    volume+=(p[a]*(p[b+1]*p[c+2]-p[b+2]*p[c+1])+p[a+1]*(p[b+2]*p[c]-p[b]*p[c+2])+p[a+2]*(p[b]*p[c+1]-p[b+1]*p[c]))/6;
  }
  assert.ok(volume>0, 'the closed envelope has outward faces and positive volume');
  for (let row = 0; row <= PILLOW_FLOW_ROWS; row++) for (let side = 0; side < PILLOW_FLOW_SIDES; side++) {
    const i = row * PILLOW_FLOW_SIDES + side, x = data.positions[i*3], y = data.positions[i*3+1], z = data.positions[i*3+2];
    const ground = surfaceHeight(flow.support, x, z);
    assert.ok(y >= ground - .01601 && y <= ground + .18, 'neither a floating pipe nor a buried luminous sphere');
    assert.ok(Math.abs(data.uvs[i*2+1] * flow.length - data.distance[i]) < 1e-6);
  }
  const bytes = data.positions.byteLength + data.uvs.byteLength + data.crust.byteLength + data.distance.byteLength + data.indices.length * 2;
  assert.ok(bytes * 14 < 1024**2);
});

test('completed paths retain their original emplacement and seeking restores the same material ancestry', () => {
  const sample = (p:number) => { const flow = pillowFlow(oceanGeometryFrame(p,'deep','sustained'),2), data = pillowFlowBuffers(); updatePillowFlow(data,flow); return {flow,data}; };
  const forming=sample(.20), placed=sample(.24), older=sample(.35), cold=sample(1);
  sample(.10);assert.deepEqual(sample(.20),forming);
  assert.deepEqual(placed.data.positions,older.data.positions); assert.deepEqual(older.data.positions,cold.data.positions);
  assert.ok(older.flow.coreHeat > 0); assert.ok(cold.data.crust.every(q=>q===1));assert.equal(cold.flow.coreHeat,0);
});

test('the GPU owner reuses all finite buffers, isolates detail motion, clips and disposes exactly once', () => {
  const noise=stoneNoise(), ocean=oceanUniforms(), owner=new OceanPillowFlow3D(noise,ocean), resources=new Set<THREE.BufferGeometry|THREE.Material>();
  owner.group.traverse(o=>{if(o instanceof THREE.Mesh){resources.add(o.geometry);resources.add(o.material as THREE.Material);}});
  const objects=[...owner.group.children];owner.draw(oceanGeometryFrame(.35,'deep','sustained'));
  assert.ok(owner.state.focusWeight>0); assert.ok(owner.state.focus.every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(...owner.state.direction)-1)<1e-10);
  const skins=owner.group.children.filter((o):o is THREE.Mesh=>o instanceof THREE.Mesh);
  assert.equal(skins.length,14);assert.ok(owner.state.advancing>0);assert.ok(owner.state.distance>.035);
  const mesh=skins[6], positions=new Float32Array(mesh.geometry.getAttribute('position').array), crust=new Float32Array(mesh.geometry.getAttribute('oceanQuench').array);
  owner.updateDetail(1);owner.updateDetail(4);assert.deepEqual(mesh.geometry.getAttribute('position').array,positions);assert.deepEqual(mesh.geometry.getAttribute('oceanQuench').array,crust);
  owner.draw(oceanGeometryFrame(.10,'deep','sustained'));owner.draw(oceanGeometryFrame(.35,'deep','sustained'));
  assert.deepEqual(mesh.geometry.getAttribute('position').array,positions);assert.deepEqual([...owner.group.children],objects);
  const plane=new THREE.Plane(new THREE.Vector3(0,0,-1),0);owner.setCutaway(plane);
  resources.forEach(r=>{if(r instanceof THREE.Material)assert.deepEqual(r.clippingPlanes,[plane]);});
  owner.draw(oceanGeometryFrame(1,'deep','sustained'));assert.equal(owner.state.retained,14);assert.equal(owner.state.advancing,0);assert.equal(owner.state.exposedHeat,0);
  owner.draw(oceanGeometryFrame(.35,'shallow','sustained'));assert.equal(owner.group.visible,false);
  let disposed=0;resources.forEach(r=>r.addEventListener('dispose',()=>disposed++));owner.dispose();owner.dispose();assert.equal(disposed,resources.size);assert.equal(owner.group.children.length,0);noise.dispose();
});
