import test from 'node:test';
import assert from 'node:assert/strict';
import { cutFaceGeometry } from '../scene3d.ts';
import { EARTH } from '../model.ts';

test('each 3D section face stays on its radial plane and preserves true inner/outer radii', () => {
  const shells = [
    [(EARTH.radiusKm - EARTH.referenceContinentalCrustKm) / EARTH.radiusKm, 1],
    [EARTH.coreRadiusKm / EARTH.radiusKm, (EARTH.radiusKm - EARTH.referenceContinentalCrustKm) / EARTH.radiusKm],
    [EARTH.innerCoreRadiusKm / EARTH.radiusKm, EARTH.coreRadiusKm / EARTH.radiusKm],
    [0, EARTH.innerCoreRadiusKm / EARTH.radiusKm],
  ];
  for (const angle of [0, Math.PI / 2]) for (const [inner, outer] of shells) {
    const geometry = cutFaceGeometry(inner, outer, angle, 72);
    const positions = geometry.getAttribute('position');
    assert.equal(geometry.index.count, 72 * 6);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const actual = Math.hypot(x, y, z);
      assert.ok(Math.abs(actual - (i % 2 ? outer : inner)) < 1e-7);
      assert.ok(Math.abs(angle === 0 ? z : x) < 1e-12);
      assert.ok(angle === 0 ? x <= 1e-10 : z >= -1e-10);
    }
    geometry.dispose();
  }
});
