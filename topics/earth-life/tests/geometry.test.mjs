import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPlantGeometry, disposePlantGeometry, triangleCount } from '../geometry.ts';

test('all authored exhibits have finite nondegenerate surfaces within mobile/desktop triangle budgets', () => {
  for (const mobile of [true,false]) for (const plant of ['lycopsid','calamite','seedfern']) for (const detail of ['whole','surface']) {
    const group = createPlantGeometry(plant, detail, mobile), triangles = triangleCount(group);
    assert.ok(triangles > 1000); assert.ok(triangles <= (mobile ? 25000 : 60000), `${plant}/${detail}/${mobile}: ${triangles}`);
    assert.equal(group.userData.authoredReconstruction,true); assert.equal(group.userData.calibratedScale,false);
    group.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      for (const name of ['position','normal','color']) assert.ok([...obj.geometry.getAttribute(name).array].every(Number.isFinite));
      obj.geometry.computeBoundingBox(); const box = obj.geometry.boundingBox;
      assert.ok(box && box.max.y > box.min.y);
    });
    group.updateMatrixWorld(); const bounds = new THREE.Box3().setFromObject(group);
    assert.ok(bounds.max.y - bounds.min.y > 3.5);
    disposePlantGeometry(group); assert.equal(group.parent,null);
  }
});
test('deterministic regeneration preserves morphology rather than randomizing details on view changes', () => {
  const a = createPlantGeometry('lycopsid','surface',true), b = createPlantGeometry('lycopsid','surface',true);
  assert.deepEqual(a.children[1].geometry.getAttribute('position').array, b.children[1].geometry.getAttribute('position').array);
  assert.ok(a.children.length >= 4, 'bark, leaf cushions, leaf scars and laminae remain separate visible surface classes');
  disposePlantGeometry(a); disposePlantGeometry(b);
});
test('stem side normals face outward, so opaque bark is visible from an exterior viewpoint', () => {
  const group = createPlantGeometry('lycopsid','surface',true), stem = group.children[0].geometry;
  const positions = stem.getAttribute('position'), normals = stem.getAttribute('normal');
  let sum = 0, count = 0;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (y > .2 && y < 3.5) { sum += positions.getX(i)*normals.getX(i)+positions.getZ(i)*normals.getZ(i); count++; }
  }
  assert.ok(sum/count > .3, 'outward winding must survive welding and normal generation');
  disposePlantGeometry(group);
});
