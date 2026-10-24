import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Lake3DScene } from '../scene3d.ts';
import { LAYER_FACIES, lakeUniforms, rockMaterial, supportMaterial } from '../materials3d.ts';
import { COLLAPSE_BLOCKS, LAYERS, PISTON_UNITS, basementBuffers, blockBuffers, blockOffset, cutRelief, lakeFrame, mushFloor, pistonBase, pistonRadius, sectionBuffers, storageLayerBuffers, updateBlocks, updateStorage, type Buffers } from '../geometry3d.ts';

const settings = { basin: 'caldera' as const, supply: .75, leak: 'low' as const };
const close = (a: number, b: number, epsilon = 2e-5) => assert.ok(Math.abs(a - b) <= epsilon, `${a} differs from ${b}`);

function frontRange(data: Buffers, edge: number) {
  const ys: number[] = [], used = new Set(data.indices);
  for (const index of used) {
    if (!data.samples || !data.samples[index * 4 + 3] || Math.abs(data.samples[index * 4] - edge) > 1e-5 || Math.abs(data.samples[index * 4 + 1]) > 1e-7) continue;
    const x = data.positions[index * 3], y = data.positions[index * 3 + 1], z = data.positions[index * 3 + 2];
    close(z, cutRelief(x, y)); ys.push(y);
  }
  return ys.length ? { lo: Math.min(...ys), hi: Math.max(...ys) } : undefined;
}

test('initial roof, layered support and basement join the same host strata and cut surface', () => {
  for (const progress of [0, .08, .16]) {
    const frame = lakeFrame(progress, settings), support = Array.from({ length: LAYERS }, (_, unit) => storageLayerBuffers(unit, frame));
    for (const side of [-1, 1]) {
      const edge = side * pistonRadius(side < 0 ? Math.PI : 0);
      for (let unit = 0; unit < LAYERS; unit++) {
        const host = frontRange(sectionBuffers(unit, frame), edge)!;
        const parts = [frontRange(support[unit], edge)];
        if (unit < PISTON_UNITS) for (let id = 0; id < COLLAPSE_BLOCKS.length; id++) {
          const body = blockBuffers(unit, id); updateBlocks(body, frame); parts.push(frontRange(body, edge));
        }
        if (unit === LAYERS - 1) parts.push(frontRange(basementBuffers(), edge));
        const spans = parts.filter(part => part && part.hi - part.lo > 1e-6).sort((a, b) => a!.lo - b!.lo) as { lo: number; hi: number }[];
        assert.ok(spans.length > 0, `source stratum ${unit} disappeared at its central seam`);
        close(spans[0].lo, host.lo); close(Math.max(...spans.map(part => part.hi)), host.hi);
        let covered = spans[0].hi;
        for (const span of spans.slice(1)) { assert.ok(span.lo <= covered + 2e-5, 'roof/support split introduced a gap before failure'); covered = Math.max(covered, span.hi); }
      }
    }
  }
});

test('actual layered support retains local opening, final closure and material identity during seek', () => {
  const bodies = Array.from({ length: LAYERS }, (_, unit) => storageLayerBuffers(unit, lakeFrame(0, settings)));
  const identities = bodies.map(data => ({ positions: data.positions, indices: data.indices, samples: data.samples, source: data.source!.slice(), uv: data.uvs.slice() }));
  for (const p of [.23, .30, .36, .44, .48, .85, .16, .36]) {
    const frame = lakeFrame(p, settings); let gap = 0;
    bodies.forEach((data, unit) => {
      updateStorage(data, frame); assert.strictEqual(data.positions, identities[unit].positions); assert.strictEqual(data.indices, identities[unit].indices); assert.strictEqual(data.samples, identities[unit].samples);
      assert.deepEqual(data.source, identities[unit].source); assert.deepEqual(data.uvs, identities[unit].uv);
      for (let i = 0; i < data.positions.length; i += 3) {
        const x = data.samples![i / 3 * 4], z = data.samples![i / 3 * 4 + 1], y = data.positions[i + 1];
        assert.ok(y >= mushFloor(x, z) - 1e-5); assert.ok(Number.isFinite(y));
        if (Math.abs(data.source![i + 1] - pistonBase(x, z)) < 1e-5) {
          const roof = pistonBase(x, z) + blockOffset(data.blockIds![i / 3], x, z, frame); gap = Math.max(gap, roof - y);
        }
      }
    });
    if (p === .36) assert.ok(gap > .4, 'new strata must not fill the retained explanatory openings');
    if (p >= .48) assert.ok(gap < 2e-5, 'settled contacts must close without residual cavities');
  }
});

test('support facies share the host shader basis and source coordinates outside local melt', () => {
  const texture = new THREE.DataTexture(), uniforms = lakeUniforms();
  for (const facies of new Set(LAYER_FACIES)) {
    const host = rockMaterial(texture, uniforms, facies), support = supportMaterial(texture, uniforms, facies);
    const shader = () => ({ uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader });
    const hostShader = shader(), supportShader = shader();
    host.onBeforeCompile(hostShader as any, {} as THREE.WebGLRenderer); support.onBeforeCompile(supportShader as any, {} as THREE.WebGLRenderer);
    assert.equal((hostShader.uniforms as any).uFacies.value, (supportShader.uniforms as any).uFacies.value);
    assert.strictEqual((supportShader.uniforms as any).uWithdrawal, uniforms.uWithdrawal);
    assert.ok(supportShader.vertexShader.includes('vLakeStone=materialPosition;'));
    assert.equal((supportShader.fragmentShader.match(/float lakeCrystalGap\(/g) ?? []).length, 1);
    assert.ok(supportShader.fragmentShader.includes('supportMelt=0.;'));
    assert.equal(support.side, host.side); assert.equal(support.roughness, host.roughness);
    host.dispose(); support.dispose();
  }
  texture.dispose();
});

test('real underground composition has bounded retained strata and disposes each resource once', () => {
  const scene = Object.assign(Object.create(Lake3DScene.prototype), {
    scene: new THREE.Scene(), underground: new THREE.Group(), faults: new THREE.Group(), supportBodies: [], faultBodies: [],
    frame: lakeFrame(0, settings), texture: new THREE.DataTexture(), uniforms: lakeUniforms(), geometries: new Set<THREE.BufferGeometry>(), materials: new Set<THREE.Material>(),
    disposed: false, canvas: { removeEventListener() {} }, stopMotion() {}, presentation: { dispose() {} }, renderer: { dispose() {}, forceContextLoss() {} },
  });
  scene.scene.add(scene.underground, scene.faults); scene.createUnderground();
  assert.equal(scene.supportBodies.length, 11); assert.equal(scene.geometries.size, 15); assert.equal(scene.materials.size, 8);
  assert.equal(scene.supportBodies.reduce((n: number, body: any) => n + body.data.positions.length / 3, 0), 44260);
  const geos = [...scene.geometries] as THREE.BufferGeometry[], materials = [...scene.materials] as THREE.Material[];
  const disposed = new Map<object, number>();
  for (const resource of [...geos, ...materials, scene.texture]) resource.addEventListener('dispose', () => disposed.set(resource, (disposed.get(resource) ?? 0) + 1));
  for (const p of [.08, .16, .23, .36, .44, .48, .85, .36]) scene.updateSupport(lakeFrame(p, settings));
  assert.deepEqual([...scene.geometries], geos); assert.deepEqual([...scene.materials], materials);
  for (const { data } of scene.supportBodies) {
    assert.ok(data.positions.every(Number.isFinite));
    for (const index of data.indices) assert.ok(Number.isInteger(index) && index >= 0 && index < data.positions.length / 3);
    for (let i = 0; i < data.normals.length; i += 3) close(Math.hypot(data.normals[i], data.normals[i + 1], data.normals[i + 2]), 1);
  }
  scene.dispose(); scene.dispose();
  for (const resource of [...geos, ...materials, scene.texture]) assert.equal(disposed.get(resource), 1);
  assert.equal(scene.geometries.size, 0); assert.equal(scene.materials.size, 0);
});
