import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIMEN_IDS, parseRockState, serializeRockState } from '../model.ts';
import { buildSpecimenGeometry } from '../specimenGeometry.ts';

test('fractured specimen surfaces are deterministic, finite, bounded and support device detail tiers', () => {
  for (const id of SPECIMEN_IDS) {
    const low = buildSpecimenGeometry(id, false), high = buildSpecimenGeometry(id, true);
    const lowCount = low.index.count, highCount = high.index.count;
    assert.ok(lowCount < highCount);
    assert.ok(highCount / 3 <= 13000);
    assert.ok(lowCount / 3 <= 5000);
    for (const geometry of [low, high]) {
      for (const name of ['position', 'normal']) assert.ok([...geometry.getAttribute(name).array].every(Number.isFinite));
      assert.ok(geometry.boundingSphere.radius < 2);
      assert.ok(geometry.boundingBox.max.x - geometry.boundingBox.min.x > 1.5);
    }
    const again = buildSpecimenGeometry(id, false);
    assert.deepEqual(again.getAttribute('position').array, low.getAttribute('position').array);
    again.dispose(); low.dispose(); high.dispose();
  }
});

test('slate has specimen-specific thin slab morphology rather than identical shapes for every material', () => {
  const slate = buildSpecimenGeometry('slate', false), granite = buildSpecimenGeometry('granite', false);
  const height = geometry => geometry.boundingBox.max.y - geometry.boundingBox.min.y;
  assert.ok(height(slate) < height(granite) * .6);
  slate.dispose(); granite.dispose();
});

test('camera restoration accepts bounded numeric positions and rejects unsafe or malformed input', () => {
  const valid = parseRockState({ rockRenderer: '2d', rockCamera: '[3,2,4]' });
  assert.deepEqual(valid.camera, { x: 3, y: 2, z: 4 });
  assert.deepEqual(parseRockState(serializeRockState(valid)), valid);
  const initial = parseRockState({}).camera;
  for (const raw of ['null', '{}', '[0,0,0]', '[100,0,0]', '["3",2,4]', '[1,2]', '[1,2,3,4]', '[NaN,2,3]']) {
    assert.deepEqual(parseRockState({ rockCamera: raw }).camera, initial);
  }
});
