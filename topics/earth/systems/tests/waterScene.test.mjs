import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, waterFrame, waterPresets } from '../model.ts';
import { waterContactFaces } from '../waterScene.ts';

const area = points => Math.abs(points.reduce((sum, a, i) => {
  const b = points[(i + 1) % points.length];
  return sum + a.x * b.y - b.x * a.y;
}, 0)) / 2;

test('top and cut faces keep the same A/B contact and completely cover the section through reversal', () => {
  for (const preset of Object.values(waterPresets)) {
    for (let step = 0; step <= 100; step++) {
      const state = { ...defaults, ...preset, waterProgress: step / 100 };
      const frame = waterFrame(state), faces = waterContactFaces(frame);
      assert.deepEqual(faces.parcels.map(p => p.id), ['A', 'B']);
      assert.ok(Math.abs(faces.parcels.reduce((sum, p) => sum + area(p.top), 0) - 432 * 19) < 1e-6);
      assert.ok(Math.abs(faces.parcels.reduce((sum, p) => sum + area(p.side), 0) - 220 * 29) < 1e-6);
      for (const contact of [faces.top, faces.side]) {
        if (!contact.length) continue;
        assert.equal(contact.length, 2);
        assert.ok(frame.boundary.some(p => Math.hypot(p.x - contact[0].x, p.y - contact[0].y) < 1e-6));
        assert.ok(Math.abs(contact[1].x - contact[0].x - 29) < 1e-6);
        assert.ok(Math.abs(contact[1].y - contact[0].y + 19) < 1e-6);
      }
      assert.deepEqual(waterContactFaces(waterFrame(state)), faces);
    }
  }
  const dense = waterContactFaces(waterFrame({ ...defaults, waterTemp: 5, waterSalt: 38, waterProgress: 1 }));
  const lighter = waterContactFaces(waterFrame({ ...defaults, waterTemp: 5, waterSalt: 30, waterProgress: 1 }));
  assert.equal(area(dense.parcels[0].top), 0);
  assert.equal(area(dense.parcels[1].top), 432 * 19);
  assert.equal(area(lighter.parcels[1].top), 0);
  assert.equal(area(lighter.parcels[0].top), 432 * 19);
});
