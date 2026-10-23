import * as THREE from 'three';

/** The steel and the displayed volume scale stay fixed throughout the forming study. */
export const METAL_MASS_G = 780;
export const METAL_VOLUME_ML = 100;
export const METAL_CAPACITY_ML = 1400;
export const METAL_WORLD_VOLUME = 0.14;
export const METAL_ML_PER_WORLD_VOLUME = METAL_VOLUME_ML / METAL_WORLD_VOLUME;

const RADIAL_SEGMENTS = 24;
const ANGULAR_SEGMENTS = 96;
const LAYER_VERTICES = 1 + RADIAL_SEGMENTS * ANGULAR_SEGMENTS;
const FINAL_RADIUS_X = 1.35;
const FINAL_RADIUS_Z = 0.9;
const POLYGON_AREA_FACTOR = ANGULAR_SEGMENTS * Math.sin(2 * Math.PI / ANGULAR_SEGMENTS) / 2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const smooth = (value: number) => value * value * (3 - 2 * value);
const normalizedForm = (form: number) => clamp(finite(form), 0, 1);

// The same piecewise-linear radial profile is used by the indexed mesh and integrals.
// Along each homothetic polygon ring, a shell occupies 2 A r dr of the footprint.
function radialIntegral(r0: number, r1: number, value0: number, slope: number) {
  return value0 * (r1 * r1 - r0 * r0)
    + 2 * slope * ((r1 ** 3 - r0 ** 3) / 3 - r0 * (r1 * r1 - r0 * r0) / 2);
}

const MEAN_PROFILE = (() => {
  let integral = 0;
  for (let ring = 0; ring < RADIAL_SEGMENTS; ring++) {
    const r0 = ring / RADIAL_SEGMENTS, r1 = (ring + 1) / RADIAL_SEGMENTS;
    integral += radialIntegral(r0, r1, r0 ** 4, (r1 ** 4 - r0 ** 4) / (r1 - r0));
  }
  return integral;
})();
const FINAL_AREA = POLYGON_AREA_FACTOR * FINAL_RADIUS_X * FINAL_RADIUS_Z;
const FINAL_RIM_RISE = (METAL_CAPACITY_ML - METAL_VOLUME_ML)
  / (METAL_ML_PER_WORLD_VOLUME * FINAL_AREA * (1 - MEAN_PROFILE));

export interface MetalDimensions {
  width: number;
  height: number;
  depth: number;
  thickness: number;
  /** Height of the inner rim crest above the lowest exterior point. */
  rimHeight: number;
  /** Constant material volume in scene units cubed; scene lengths are illustrative. */
  solidVolume: number;
  /** Enclosed dry displacement at the rim, in the study's displayed mL scale. */
  capacityMl: number;
}

/** Form 0 is a compact puck, 0.5 a flat plate, and 1 a raised-rim bowl. */
export function metalDimensions(form: number): MetalDimensions {
  const normalized = normalizedForm(form);
  const spread = smooth(Math.min(1, normalized * 2));
  const radiusX = 0.38 + (FINAL_RADIUS_X - 0.38) * spread;
  const radiusZ = 0.32 + (FINAL_RADIUS_Z - 0.32) * spread;
  const area = POLYGON_AREA_FACTOR * radiusX * radiusZ;
  const thickness = METAL_WORLD_VOLUME / area;
  const rimRise = FINAL_RIM_RISE * smooth(Math.max(0, normalized * 2 - 1));
  const height = thickness + rimRise;
  return {
    width: 2 * radiusX, height, depth: 2 * radiusZ, thickness, rimHeight: height,
    solidVolume: METAL_WORLD_VOLUME,
    capacityMl: (METAL_WORLD_VOLUME + area * rimRise * (1 - MEAN_PROFILE)) * METAL_ML_PER_WORLD_VOLUME,
  };
}

/** Exact radial section of the mesh, with radius measured in its elliptical footprint. */
export function metalProfile(form: number, normalizedRadius: number) {
  const dimensions = metalDimensions(form);
  const radius = clamp(finite(normalizedRadius), 0, 1);
  const scaled = radius * RADIAL_SEGMENTS;
  const lower = Math.min(RADIAL_SEGMENTS - 1, Math.floor(scaled));
  const blend = scaled - lower;
  const profile = (lower / RADIAL_SEGMENTS) ** 4 * (1 - blend)
    + ((lower + 1) / RADIAL_SEGMENTS) ** 4 * blend;
  const bottom = (dimensions.height - dimensions.thickness) * profile;
  return { bottom, top: bottom + dimensions.thickness };
}

/** Integral below a water plane, before subtracting an open flooded cavity. */
function volumeBelowProfile(form: number, depth: number) {
  if (depth <= 0) return 0;
  const dimensions = metalDimensions(form);
  const area = POLYGON_AREA_FACTOR * dimensions.width * dimensions.depth / 4;
  const rimRise = dimensions.height - dimensions.thickness;
  if (rimRise === 0) return area * depth;
  let integral = 0;
  for (let ring = 0; ring < RADIAL_SEGMENTS; ring++) {
    const r0 = ring / RADIAL_SEGMENTS, r1 = (ring + 1) / RADIAL_SEGMENTS;
    const y0 = rimRise * r0 ** 4, y1 = rimRise * r1 ** 4;
    if (depth <= y0) break;
    const slope = (y1 - y0) / (r1 - r0);
    const end = depth >= y1 ? r1 : r0 + (depth - y0) / slope;
    integral += radialIntegral(r0, end, depth - y0, -slope);
  }
  return Math.max(0, area * integral);
}

/**
 * Current immersed volume, derived from the very same polygonal shell as the mesh.
 * A dry hull excludes its air cavity only below the rim. A flooded shell excludes
 * steel alone; water in the open cavity is not counted as displacement.
 */
export function metalDisplacementMl(form: number, immersedDepth: number, dryHull = false) {
  const dimensions = metalDimensions(form);
  const depth = clamp(finite(immersedDepth), 0, dimensions.height);
  const outer = volumeBelowProfile(form, depth);
  const volume = dryHull ? outer : outer - volumeBelowProfile(form, depth - dimensions.thickness);
  return clamp(volume * METAL_ML_PER_WORLD_VOLUME, 0,
    dryHull ? dimensions.capacityMl : METAL_VOLUME_ML);
}

/** A deterministic inverse of the dry-envelope integral, not a dynamics solver. */
export function metalDraftForDisplacement(form: number, displacedMl: number) {
  const dimensions = metalDimensions(form);
  const volume = clamp(finite(displacedMl), 0, dimensions.capacityMl);
  if (volume === 0) return 0;
  if (volume === dimensions.capacityMl) return dimensions.height;
  let lower = 0, upper = dimensions.height;
  for (let iteration = 0; iteration < 48; iteration++) {
    const middle = (lower + upper) / 2;
    if (metalDisplacementMl(form, middle, true) < volume) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

function makeGeometry(envelope: boolean) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(LAYER_VERTICES * 2 * 3);
  const uvs = new Float32Array(LAYER_VERTICES * 2 * 2);
  const indices: number[] = [];
  const at = (layer: number, ring: number, angle: number) => layer * LAYER_VERTICES
    + 1 + (ring - 1) * ANGULAR_SEGMENTS + (angle + ANGULAR_SEGMENTS) % ANGULAR_SEGMENTS;
  const triangle = (a: number, b: number, c: number, reverse: boolean) => {
    indices.push(a, reverse ? c : b, reverse ? b : c);
  };
  for (let layer = 0; layer < 2; layer++) {
    const reverse = layer === 0;
    const start = indices.length;
    for (let angle = 0; angle < ANGULAR_SEGMENTS; angle++) {
      triangle(layer * LAYER_VERTICES, at(layer, 1, angle + 1), at(layer, 1, angle), reverse);
      for (let ring = 1; ring < RADIAL_SEGMENTS; ring++) {
        triangle(at(layer, ring, angle), at(layer, ring, angle + 1), at(layer, ring + 1, angle), reverse);
        triangle(at(layer, ring, angle + 1), at(layer, ring + 1, angle + 1), at(layer, ring + 1, angle), reverse);
      }
    }
    geometry.addGroup(start, indices.length - start, 0);
  }
  const sideStart = indices.length;
  for (let angle = 0; angle < ANGULAR_SEGMENTS; angle++) {
    const a = at(0, RADIAL_SEGMENTS, angle), b = at(0, RADIAL_SEGMENTS, angle + 1);
    const c = at(1, RADIAL_SEGMENTS, angle), d = at(1, RADIAL_SEGMENTS, angle + 1);
    indices.push(a, c, b, b, c, d);
  }
  geometry.addGroup(sideStart, indices.length - sideStart, 0);
  for (let layer = 0; layer < 2; layer++) {
    uvs.set([0.5, 0.5], layer * LAYER_VERTICES * 2);
    for (let ring = 1; ring <= RADIAL_SEGMENTS; ring++) {
      const radius = ring / RADIAL_SEGMENTS;
      for (let angle = 0; angle < ANGULAR_SEGMENTS; angle++) {
        const theta = 2 * Math.PI * angle / ANGULAR_SEGMENTS;
        uvs.set([0.5 + radius * Math.cos(theta) / 2, 0.5 + radius * Math.sin(theta) / 2], at(layer, ring, angle) * 2);
      }
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.userData.buoyancyMetal = { envelope };
  updateGeometry(geometry, 0, envelope);
  return geometry;
}

function updateGeometry(geometry: THREE.BufferGeometry, form: number, envelope: boolean) {
  const positions = geometry.getAttribute('position');
  if (!positions || positions.count !== LAYER_VERTICES * 2) {
    throw new RangeError('Use geometry created by the buoyancy metal geometry factory.');
  }
  const dimensions = metalDimensions(form);
  for (let layer = 0; layer < 2; layer++) {
    positions.setXYZ(layer * LAYER_VERTICES, 0,
      layer === 0 ? 0 : envelope ? dimensions.height : dimensions.thickness, 0);
    for (let ring = 1; ring <= RADIAL_SEGMENTS; ring++) {
      const radius = ring / RADIAL_SEGMENTS;
      const profile = metalProfile(form, radius);
      const y = layer === 0 ? profile.bottom : envelope ? dimensions.height : profile.top;
      for (let angle = 0; angle < ANGULAR_SEGMENTS; angle++) {
        const theta = 2 * Math.PI * angle / ANGULAR_SEGMENTS;
        const index = layer * LAYER_VERTICES + 1 + (ring - 1) * ANGULAR_SEGMENTS + angle;
        positions.setXYZ(index, dimensions.width * radius * Math.cos(theta) / 2,
          y, dimensions.depth * radius * Math.sin(theta) / 2);
      }
    }
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

/** One closed indexed steel mesh; updating changes positions, never its identity or UVs. */
export function createMetalGeometry(): THREE.BufferGeometry { return makeGeometry(false); }
export function updateMetalGeometry(geometry: THREE.BufferGeometry, form: number): void {
  updateGeometry(geometry, form, false);
}

/** Full dry excluded envelope. Clip it at the shared water plane for a water parcel. */
export function createMetalEnvelopeGeometry(): THREE.BufferGeometry { return makeGeometry(true); }
export function updateMetalEnvelopeGeometry(geometry: THREE.BufferGeometry, form: number): void {
  updateGeometry(geometry, form, true);
}
