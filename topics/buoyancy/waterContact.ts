import * as THREE from 'three';

export type WaterContact = {
  /** Reused world-space x/y/z positions, ordered by increasing azimuth. */
  points: Float32Array;
  /** World x/z coordinates of the radial sampling center. */
  center: THREE.Vector2;
};

export type WaterContactSampler = {
  /** Returns no contact for an empty or tangent intersection. The returned
   * storage remains owned by the sampler and changes on its next sample. */
  sample(object: THREE.Object3D, waterLevel: number): WaterContact | null;
};

/** Intersects a static specimen mesh with a horizontal world-space plane.
 * Each radial point lies on an actual triangle/plane segment, rather than an
 * ellipse fitted to the specimen's bounds. The outer contour must be radially
 * visible from its center, as with the lab's rounded and gently irregular
 * specimens. A bore may add inner crossings; the farthest crossing retains
 * only the outer contact. This does not reconstruct multiple disjoint loops.
 *
 * Local vertices, topology and work storage are cached. Recreate the sampler
 * after editing its geometry; ordinary object/parent transforms are sampled.
 * No mesh volume or displacement is inferred from this illustrative contour. */
export function createWaterContactSampler(geometry: THREE.BufferGeometry, sampleCount = 128): WaterContactSampler {
  if (!Number.isInteger(sampleCount) || sampleCount < 3) throw new RangeError('Water contact needs at least three samples');
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize < 3) throw new TypeError('Water contact needs a three-component position attribute');
  const local = new Float64Array(position.count * 3);
  const world = new Float64Array(local.length);
  for (let i = 0; i < position.count; i++) {
    local[i * 3] = position.getX(i);
    local[i * 3 + 1] = position.getY(i);
    local[i * 3 + 2] = position.getZ(i);
  }
  const index = geometry.getIndex();
  const triangleIndices = new Uint32Array(Math.floor((index?.count ?? position.count) / 3) * 3);
  for (let i = 0; i < triangleIndices.length; i++) triangleIndices[i] = index ? index.getX(i) : i;
  // One non-coplanar triangle produces at most one planar segment.
  const segments = new Float64Array(triangleIndices.length / 3 * 4);
  const directions = new Float64Array(sampleCount * 2);
  for (let i = 0; i < sampleCount; i++) {
    directions[i * 2] = Math.cos(i / sampleCount * Math.PI * 2);
    directions[i * 2 + 1] = Math.sin(i / sampleCount * Math.PI * 2);
  }
  const result: WaterContact = { points: new Float32Array(sampleCount * 3), center: new THREE.Vector2() };
  const lastMatrix = new Float64Array(16);
  let initialized = false, lastLevel = NaN, lastResult: WaterContact | null = null;
  let minY = Infinity, maxY = -Infinity, extent = 1;

  return {
    sample(object, waterLevel) {
      if (!Number.isFinite(waterLevel)) return null;
      object.updateWorldMatrix(true, false);
      const m = object.matrixWorld.elements;
      let matrixChanged = !initialized;
      for (let i = 0; i < 16; i++) {
        if (!Number.isFinite(m[i])) return null;
        if (m[i] !== lastMatrix[i]) matrixChanged = true;
      }
      if (!matrixChanged && waterLevel === lastLevel) return lastResult;
      if (matrixChanged) {
        minY = Infinity; maxY = -Infinity;
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (let i = 0; i < local.length; i += 3) {
          const x = local[i], y = local[i + 1], z = local[i + 2];
          const wx = m[0] * x + m[4] * y + m[8] * z + m[12];
          const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
          const wz = m[2] * x + m[6] * y + m[10] * z + m[14];
          if (!Number.isFinite(wx + wy + wz)) return null;
          world[i] = wx; world[i + 1] = wy; world[i + 2] = wz;
          minX = Math.min(minX, wx); maxX = Math.max(maxX, wx);
          minY = Math.min(minY, wy); maxY = Math.max(maxY, wy);
          minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
        }
        extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6);
        lastMatrix.set(m); initialized = true;
      }
      lastLevel = waterLevel; lastResult = null;
      const epsilon = extent * 1e-9;
      // Even a coplanar flat top is only touching: water must cut the solid.
      if (!(waterLevel > minY + epsilon && waterLevel < maxY - epsilon)) return null;

      let segmentCount = 0, totalLength = 0, centerX = 0, centerZ = 0;
      for (let i = 0; i < triangleIndices.length; i += 3) {
        let count = 0, ax = 0, az = 0, bx = 0, bz = 0;
        const a = triangleIndices[i] * 3, b = triangleIndices[i + 1] * 3, c = triangleIndices[i + 2] * 3;
        if (Math.abs(world[a + 1] - waterLevel) <= epsilon &&
            Math.abs(world[b + 1] - waterLevel) <= epsilon &&
            Math.abs(world[c + 1] - waterLevel) <= epsilon) continue;
        for (let edge = 0; edge < 3; edge++) {
          const ia = triangleIndices[i + edge] * 3, ib = triangleIndices[i + (edge + 1) % 3] * 3;
          const da = world[ia + 1] - waterLevel, db = world[ib + 1] - waterLevel;
          let x: number, z: number;
          if (Math.abs(da) <= epsilon) {
            x = world[ia]; z = world[ia + 2];
          } else if (da < -epsilon && db > epsilon || da > epsilon && db < -epsilon) {
            const t = da / (da - db);
            x = world[ia] + (world[ib] - world[ia]) * t;
            z = world[ia + 2] + (world[ib + 2] - world[ia + 2]) * t;
          } else continue;
          if (count === 0) { ax = x; az = z; count = 1; }
          else if (Math.hypot(x - ax, z - az) > epsilon) { bx = x; bz = z; count = 2; }
        }
        if (count !== 2) continue;
        const length = Math.hypot(bx - ax, bz - az);
        if (length <= epsilon) continue;
        const j = segmentCount++ * 4;
        segments[j] = ax; segments[j + 1] = az; segments[j + 2] = bx; segments[j + 3] = bz;
        // The boundary-length center follows off-center slices near rounded
        // tips. Unsupported sections with missing radial sectors fail below.
        centerX += (ax + bx) * .5 * length; centerZ += (az + bz) * .5 * length;
        totalLength += length;
      }
      if (totalLength <= epsilon) return null;
      centerX /= totalLength; centerZ /= totalLength;
      result.center.set(centerX, centerZ);
      for (let i = 0; i < sampleCount; i++) {
        const dx = directions[i * 2], dz = directions[i * 2 + 1];
        let farthest = -Infinity;
        for (let j = 0; j < segmentCount * 4; j += 4) {
          const ax = segments[j] - centerX, az = segments[j + 1] - centerZ;
          const ex = segments[j + 2] - segments[j], ez = segments[j + 3] - segments[j + 1];
          const determinant = dx * ez - dz * ex;
          if (Math.abs(determinant) <= epsilon) {
            if (Math.abs(ax * dz - az * dx) <= epsilon) {
              farthest = Math.max(farthest, ax * dx + az * dz, (ax + ex) * dx + (az + ez) * dz);
            }
            continue;
          }
          const alongEdge = (ax * dz - az * dx) / determinant;
          const distance = (ax * ez - az * ex) / determinant;
          if (alongEdge >= -1e-9 && alongEdge <= 1 + 1e-9 && distance >= 0) farthest = Math.max(farthest, distance);
        }
        // Do not bridge missing sectors of unsupported, disjoint geometry.
        if (!Number.isFinite(farthest) || farthest <= epsilon) return null;
        result.points[i * 3] = centerX + dx * farthest;
        result.points[i * 3 + 1] = waterLevel;
        result.points[i * 3 + 2] = centerZ + dz * farthest;
      }
      lastResult = result;
      return result;
    },
  };
}
