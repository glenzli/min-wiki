import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** These are recognizable, illustrative specimens, not calibrated volumes.
 * Local Y is up. Every finished mesh has a centered unit bounding box so the
 * scene can retain its draft, placement and scale contract. No random state or
 * clock is involved; turning the specimen never changes its surface. */
function normalized(geometry: THREE.BufferGeometry, name: string) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(1 / size.x, 1 / size.y, 1 / size.z);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = name;
  return geometry;
}

function mesh(positions: number[], indices: number[], uv: number[]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  return geometry;
}

/** A split length of timber: one exposed upper split, rounded bark below and
 * along the sides, and two uneven broken ends. Fibres run along local X. */
export function createWoodShape() {
  const around = 96, along = 48, capRings = 12;
  const positions: number[] = [], indices: number[] = [], uv: number[] = [];
  const center = (t: number) => ({
    y: -.018 + .028 * Math.sin(t * 3.2 + .3),
    z: .025 * Math.sin(t * 3.7 - .5),
  });
  const section = (t: number, angle: number) => {
    const c = Math.cos(angle), s = Math.sin(angle), middle = center(t);
    const taper = 1.045 - .105 * t + .025 * Math.sin(t * 5.1 + .4);
    // Clipping the upper arc leaves a broad split surface, rather than a
    // rounded rectangular block. Its shallow ridges follow the same fibres.
    const split = .154 + .013 * Math.sin(t * 7.3 + s * 2.4)
      + .010 * Math.sin(s * 24. + .8) + .006 * Math.cos(s * 39. - t * 1.9);
    const bark = .010 * Math.sin(angle * 9. + .3 * Math.sin(t * 4.))
      + .006 * Math.cos(angle * 17. - t * 2.1);
    return {
      y: middle.y + Math.min(.47 * c * taper + bark, split),
      z: middle.z + .49 * s * taper * (1 + .075 * c + .035 * Math.sin(angle * 3. + .8))
        + bark * s,
    };
  };
  const endX = (right: boolean, angle: number, radial: number) => {
    const splinter = Math.exp(-((Math.sin((angle - .92) / 2) / .22) ** 2));
    const notch = Math.exp(-((Math.sin((angle - 5.39) / 2) / .30) ** 2));
    const broken = right
      ? .030 * Math.sin(angle * 3. + .5) + .018 * Math.cos(angle * 7. - .3)
        + .075 * splinter - .063 * notch
      : .024 * Math.sin(angle * 2. - .9) + .012 * Math.cos(angle * 5. + .4);
    return (right ? .49 : -.51) + broken * radial
      + (right ? .027 : -.016) * radial * (1 - radial) * Math.sin(angle * 4. + .7);
  };
  for (let j = 0; j <= along; j++) {
    const t = j / along;
    for (let i = 0; i < around; i++) {
      const angle = i / around * Math.PI * 2, p = section(t, angle);
      const x = THREE.MathUtils.lerp(endX(false, angle, 1), endX(true, angle, 1), t)
        + .008 * Math.sin(angle * 2. + .7) * Math.sin(t * Math.PI);
      positions.push(x, p.y, p.z);
      uv.push(t, i / around);
    }
  }
  for (let j = 0; j < along; j++) for (let i = 0; i < around; i++) {
    const a = j * around + i, next = j * around + (i + 1) % around;
    indices.push(a, next, a + around, next, next + around, a + around);
  }
  // Separate cap vertices retain the sharper broken-end shoulder. Cap and
  // side positions meet exactly, so the surface remains closed geometrically.
  for (const right of [false, true]) {
    const t = right ? 1 : 0, middle = center(t), start = positions.length / 3;
    positions.push(endX(right, 0, 0), middle.y, middle.z);
    uv.push(.5, .5);
    for (let j = 1; j <= capRings; j++) for (let i = 0; i < around; i++) {
      const angle = i / around * Math.PI * 2, radial = j / capRings, edge = section(t, angle);
      positions.push(endX(right, angle, radial),
        THREE.MathUtils.lerp(middle.y, edge.y, radial),
        THREE.MathUtils.lerp(middle.z, edge.z, radial));
      uv.push(.5 + .5 * radial * Math.sin(angle), .5 + .5 * radial * Math.cos(angle));
    }
    const triangle = (a: number, b: number, c: number) => {
      if (right) indices.push(a, b, c); else indices.push(a, c, b);
    };
    for (let i = 0; i < around; i++) {
      const next = (i + 1) % around;
      triangle(start, start + 1 + i, start + 1 + next);
    }
    for (let j = 0; j < capRings - 1; j++) for (let i = 0; i < around; i++) {
      const a = start + 1 + j * around + i, next = start + 1 + j * around + (i + 1) % around;
      triangle(a, a + around, next);
      triangle(next, a + around, next + around);
    }
  }
  return normalized(mesh(positions, indices, uv), 'buoyancy-split-timber');
}

type RoundedPoint = (x: number, y: number, z: number) => [number, number, number];

/** Shared tessellation only; the individual shapes own their deformation. A
 * single vertex at each pole avoids degenerate triangles and polar pinholes. */
function roundedSurface(point: RoundedPoint, name: string) {
  const around = 96, latitude = 64;
  const positions: number[] = [], indices: number[] = [], uv: number[] = [];
  positions.push(...point(0, 1, 0));
  uv.push(.5, 0);
  for (let j = 1; j < latitude; j++) {
    const phi = j / latitude * Math.PI, radial = Math.sin(phi), y = Math.cos(phi);
    for (let i = 0; i < around; i++) {
      const angle = i / around * Math.PI * 2;
      positions.push(...point(radial * Math.cos(angle), y, radial * Math.sin(angle)));
      uv.push(i / around, j / latitude);
    }
  }
  const bottom = positions.length / 3;
  positions.push(...point(0, -1, 0));
  uv.push(.5, 1);
  for (let i = 0; i < around; i++) {
    indices.push(0, 1 + (i + 1) % around, 1 + i);
  }
  for (let j = 0; j < latitude - 2; j++) for (let i = 0; i < around; i++) {
    const a = 1 + j * around + i, next = 1 + j * around + (i + 1) % around;
    indices.push(a, next, a + around, next, next + around, a + around);
  }
  const last = 1 + (latitude - 2) * around;
  for (let i = 0; i < around; i++) indices.push(bottom, last + i, last + (i + 1) % around);
  return normalized(mesh(positions, indices, uv), name);
}

function roundedBase(y: number, floor: number, softness: number) {
  return floor + softness * Math.log1p(Math.exp((y - floor) / softness));
}

/** Broad, water-worn stone with an off-centre crown and a smooth resting base.
 * Low-frequency lobes change the silhouette without making a faceted rock. */
export function createPebbleShape() {
  return roundedSurface((x, y, z) => {
    const radial = 1 + .075 * x - .035 * y + .055 * x * z
      + .032 * Math.sin(x * 4.1 + z * 3.6 + .7) * (1 - y * y);
    return [
      .51 * x * radial + .038 * y + .026 * y * z,
      roundedBase(.49 * y * radial + .026 * x - .018 * z, -.355, .052),
      .48 * z * radial * (1 - .085 * x + .035 * y) + .025 * x * y,
    ];
  }, 'buoyancy-waterworn-pebble');
}

/** A real open hexagonal nut. The Y-axis bore, bevels, flat underside and a
 * shallow helical thread are all geometry; no dark painted circle closes it. */
export function createMetalShape() {
  const around = 72;
  const positions: number[] = [], indices: number[] = [], uv: number[] = [];
  const profile = (angle: number) => {
    const sector = ((angle + Math.PI / 6) % (Math.PI / 3)) - Math.PI / 6;
    const hex = .43 / Math.cos(sector);
    const rings: [number, number][] = [
      [hex * .94, -.245], [hex, -.205], [hex, .178],
      [Math.min(hex * .98, .455), .231], [Math.min(hex * .96, .445), .245],
      [.254, .245],
    ];
    for (let j = 0; j <= 24; j++) {
      const y = .205 - .410 * j / 24;
      // Five shallow turns in the visible bore, with unbroken lead-in bevels.
      const thread = Math.sin((y / .082) * Math.PI * 2 - angle);
      const lead = Math.sin(j / 24 * Math.PI) ** .4;
      rings.push([.218 + .007 * thread * lead, y]);
    }
    rings.push([.254, -.245]);
    return rings;
  };
  const count = profile(0).length;
  for (let j = 0; j < count; j++) for (let i = 0; i < around; i++) {
    const angle = i / around * Math.PI * 2, [r, y] = profile(angle)[j];
    positions.push(r * Math.cos(angle), y, r * Math.sin(angle));
    uv.push(i / around, j / count);
  }
  for (let j = 0; j < count; j++) for (let i = 0; i < around; i++) {
    const a = j * around + i, next = j * around + (i + 1) % around;
    const b = ((j + 1) % count) * around + i, bNext = ((j + 1) % count) * around + (i + 1) % around;
    indices.push(a, b, next, b, bNext, next);
  }
  const source = normalized(mesh(positions, indices, uv), 'buoyancy-open-steel-nut');
  // Preserve actual planar hex faces, rather than smoothing the corners into
  // a cylinder. The resulting 13,824 vertices stay below the specimen budget.
  const geometry = toCreasedNormals(source, .46);
  source.dispose();
  geometry.name = 'buoyancy-open-steel-nut';
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

const fingerDents = [
  { x: .19, y: .76, z: .62, width: .25, depth: .155 },
  { x: -.59, y: .57, z: .57, width: .19, depth: .095 },
  { x: .83, y: .35, z: .43, width: .18, depth: .085 },
  { x: -.90, y: .16, z: -.40, width: .21, depth: .075 },
  { x: .27, y: .45, z: -.85, width: .23, depth: .065 },
];

/** A hand-pinched lump, with one broad thumb hollow and several softer finger
 * impressions. The material remains the same clay used by the reshaped hull. */
export function createClayShape() {
  return roundedSurface((x, y, z) => {
    let radial = 1 + .060 * x - .045 * z + .035 * x * y - .025 * y * z;
    for (const dent of fingerDents) {
      const distance = (x - dent.x) ** 2 + (y - dent.y) ** 2 + (z - dent.z) ** 2;
      radial -= dent.depth * Math.exp(-distance / (2 * dent.width * dent.width));
    }
    const pinch = .068 * Math.exp(-((x + .48) ** 2 + (y - .70) ** 2 + (z + .52) ** 2) / .20);
    return [
      .49 * x * (radial + pinch) + .028 * y,
      roundedBase(.49 * y * radial + pinch + .020 * x * z, -.345, .040),
      .47 * z * (radial + pinch) * (1 + .045 * y) - .018 * x * y,
    ];
  }, 'buoyancy-hand-pinched-clay');
}
