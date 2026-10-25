import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWaptiaAsset } from '../burgessGeometry.ts';

function meshes(group) {
  const result = []; group.traverse(o => { if (o instanceof THREE.Mesh) result.push(o); }); return result;
}
function transforms(group) {
  group.updateMatrixWorld(true); const result = [];
  group.traverse(o => result.push([o.uuid, ...o.matrixWorld.elements])); return result;
}

test('Waptia has finite solid surfaces, outward winding and bounded mobile/desktop draw budgets', () => {
  for (const mobile of [true, false]) {
    const asset = createWaptiaAsset(mobile), objects = meshes(asset.group); let count = 0;
    for (const mesh of objects) {
      const g = mesh.geometry, p = g.getAttribute('position'), indices = g.index.array;
      for (const name of ['position', 'normal', 'color']) assert.ok([...g.getAttribute(name).array].every(Number.isFinite), `${mesh.name}/${name}`);
      let signedVolume = 0;
      for (let i = 0; i < indices.length; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(p, indices[i]);
        const b = new THREE.Vector3().fromBufferAttribute(p, indices[i + 1]);
        const c = new THREE.Vector3().fromBufferAttribute(p, indices[i + 2]);
        assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() > 1e-20, `${mesh.name}: degenerate triangle`);
        signedVolume += a.dot(b.clone().cross(c)) / 6;
      }
      assert.ok(signedVolume > 0, `${mesh.name}: surface winding faces inward`);
      assert.equal(mesh.material.side, THREE.FrontSide, 'closed morphology is visible through correct winding');
      count += indices.length / 3;
    }
    assert.equal(count, asset.group.userData.triangles);
    assert.equal(objects.length, asset.group.userData.drawMeshes);
    assert.ok(count > 40000 && count < (mobile ? 60000 : 100000), `${mobile}: ${count}`);
    assert.ok(objects.length < (mobile ? 45 : 60));
    asset.dispose();
  }
});

test('reference length follows a five-unit centreline, excludes antennae, and records reconstruction limits', () => {
  const { group, dispose } = createWaptiaAsset(true), data = group.userData, path = data.neutralLengthPath;
  let length = 0;
  for (let i = 1; i < path.length; i++) length += new THREE.Vector3(...path[i - 1]).distanceTo(new THREE.Vector3(...path[i]));
  assert.ok(Math.abs(length - 5) < 1e-12);
  assert.equal(data.scale.millimetersPerWorldUnit, 10);
  assert.equal(data.scale.representativeBodyLengthMm, 50);
  assert.equal(data.specimenScan, false); assert.equal(data.externalAssets, false);
  assert.match(data.lengthDefinition, /antennules excluded/);
  assert.match(data.shapeBoundaries, /colours/); assert.match(data.visibilityExaggerations, /setae/);
  const all = new THREE.Box3().setFromObject(group);
  assert.ok(all.min.x < path[0][0] - 1, 'antennae extend beyond the defined body length');
  dispose();
});

test('appendage pairs and external rings implement the 2018 body plan without extra antennae or abdominal legs', () => {
  const { group, dispose } = createWaptiaAsset(true), data = group.userData;
  assert.deepEqual(data.anatomy, {
    antennulePairs: 1, antennulePodomeres: 10, secondAntennulePairs: 0, mandiblePairs: 1, mandibularPalpPodomeres: 3,
    maxillulePairs: 1, enditicLimbPairs: 3, transitionalLimbPairs: 1, lamellateLimbPairs: 6,
    appendagePairs: 13, postCephalothoracicExternalRings: 5, abdominalSegments: 6, caudalRami: 2, ramusPseudoSegments: 3,
  });
  const antennas = meshes(group).filter(m => m instanceof THREE.SkinnedMesh);
  assert.equal(antennas.length, 2);
  for (const antenna of antennas) { assert.equal(antenna.skeleton.bones.length, 10); assert.equal(antenna.userData.podomeres, 10); }
  for (const side of ['L', 'R']) {
    for (let pma = 1; pma <= 4; pma++) {
      const appendage = group.getObjectByName(`post-maxillular-${pma}-${side}`);
      assert.equal(appendage.userData.appendagePair, pma + 3); assert.equal(appendage.userData.endopodSegments, 5);
      assert.equal(appendage.userData.basisSegments, pma === 4 ? null : 4);
    }
    for (let la = 1; la <= 6; la++) {
      const appendage = group.getObjectByName(`lamellate-${la}-${side}`);
      assert.equal(appendage.userData.appendagePair, la + 7);
      assert.equal(appendage.userData.postCephalothoracicRing, Math.min(5, la));
      assert.equal(appendage.userData.lamellaRows, 1); assert.equal(appendage.userData.annulated, true);
    }
    const ramus = group.getObjectByName(`caudal-ramus-${side}`);
    assert.equal(ramus.userData.pseudoSegments, 3); assert.equal(ramus.userData.transverseBoundaries, 2);
    assert.equal(ramus.userData.articulatedSegments, false); assert.equal(ramus.userData.longFringe, false);
  }
  assert.equal(group.getObjectByName('six-limbless-abdominal-segments').userData.appendages, 0);
  assert.equal(new Set(data.partIds.whole).size, data.partIds.whole.length);
  dispose();
});

test('pose is reversible and persistent, moves paired lamellate appendages synchronously, and never beats the tail', () => {
  const asset = createWaptiaAsset(true), original = transforms(asset.group), objects = meshes(asset.group);
  const geometryIdentity = objects.map(m => m.geometry.uuid), buffers = objects.map(m => [...m.geometry.getAttribute('position').array]);
  const tail = asset.group.getObjectByName('caudal-ramus-L'), initialTail = tail.matrixWorld.elements.slice();
  asset.setPose(.41, true); const middle = transforms(asset.group);
  assert.notDeepEqual(middle, original);
  for (let i = 1; i <= 6; i++) {
    const l = asset.group.getObjectByName(`lamellate-${i}-L`), r = asset.group.getObjectByName(`lamellate-${i}-R`);
    assert.ok(Math.abs(l.rotation.x + r.rotation.x) < 1e-12);
    const normalized = l.rotation.x / (.16 - (i - 1) * .005);
    const first = asset.group.getObjectByName('lamellate-1-L').rotation.x / .16;
    assert.ok(Math.abs(normalized - first) < 1e-12, 'six pairs share the same stroke phase');
  }
  assert.deepEqual(tail.matrixWorld.elements, initialTail);
  asset.setPose(.78, true); asset.setPose(.41, true); assert.deepEqual(transforms(asset.group), middle);
  asset.setPose(.41, false); assert.deepEqual(transforms(asset.group), original);
  asset.setPose(1, true);
  for (let i = 0; i < original.length; i++) for (let j = 1; j < original[i].length; j++) assert.ok(Math.abs(transforms(asset.group)[i][j] - original[i][j]) < 1e-12);
  asset.setPose(Number.NaN, true); assert.equal(asset.group.userData.pose.progress, 0);
  asset.setPose(-2, true); assert.equal(asset.group.userData.pose.progress, 0);
  asset.setPose(3, true); assert.equal(asset.group.userData.pose.progress, 1);
  assert.deepEqual(objects.map(m => m.geometry.uuid), geometryIdentity);
  assert.deepEqual(objects.map(m => [...m.geometry.getAttribute('position').array]), buffers);
  asset.dispose();
});

test('evidence changes material emphasis and observational opacity while retaining every organ and pose', () => {
  const asset = createWaptiaAsset(true), group = asset.group;
  asset.setPose(.56, true); const pose = transforms(group), geometryIds = meshes(group).map(m => m.geometry.uuid);
  const shell = group.getObjectByName('carapace-continuous-saddle');
  assert.equal(shell.userData.continuousDorsum, true); assert.equal(shell.userData.hinge, false);
  for (const part of ['whole', 'shield', 'head', 'limbs', 'tail']) {
    asset.setEvidence(part, true);
    assert.deepEqual(transforms(group), pose); assert.deepEqual(meshes(group).map(m => m.geometry.uuid), geometryIds);
    assert.ok(meshes(group).every(m => m.visible));
    assert.equal(shell.material.opacity, ['head', 'limbs'].includes(part) ? .24 : 1);
    asset.setEvidence(part, false); assert.equal(shell.material.opacity, 1);
  }
  asset.dispose();
});

test('regeneration is deterministic and disposal releases each owned resource once', () => {
  const a = createWaptiaAsset(true), b = createWaptiaAsset(true), ma = meshes(a.group), mb = meshes(b.group);
  assert.deepEqual(ma.map(m => [...m.geometry.getAttribute('position').array]), mb.map(m => [...m.geometry.getAttribute('position').array]));
  assert.deepEqual(ma.map(m => [...m.geometry.getAttribute('color').array]), mb.map(m => [...m.geometry.getAttribute('color').array]));
  let disposedGeometry = 0, disposedMaterial = 0;
  const uniqueMaterials = new Set(ma.map(m => m.material));
  ma.forEach(m => m.geometry.addEventListener('dispose', () => disposedGeometry++));
  uniqueMaterials.forEach(m => m.addEventListener('dispose', () => disposedMaterial++));
  const scene = new THREE.Scene(); scene.add(a.group); a.dispose(); a.dispose();
  assert.equal(a.group.parent, null); assert.equal(a.group.children.length, 0);
  assert.equal(disposedGeometry, ma.length); assert.equal(disposedMaterial, uniqueMaterials.size);
  a.setPose(.4, true); a.setEvidence('head', true); assert.equal(a.group.children.length, 0);
  b.dispose();
});
