import * as THREE from 'three';
import { LAND_BOUNDS, glacierPoint, iceShape, lerp, noise2, smooth, terrainHeight, valleyCenter, type IceShape } from './landform';

export interface DetailTier { terrainX: number; terrainZ: number; iceX: number; iceZ: number; river: number }
export const DETAIL: DetailTier = { terrainX: 160, terrainZ: 136, iceX: 32, iceZ: 152, river: 72 };
export const SMALL_DETAIL: DetailTier = { terrainX: 96, terrainZ: 88, iceX: 20, iceZ: 96, river: 48 };

function surface(cols: number, rows: number, sample: (u: number, v: number) => [number, number, number]) {
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3), indices: number[] = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) positions.set(sample(j / rows, i / cols), (j * (cols + 1) + i) * 3);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function fillGeometry(geometry: THREE.BufferGeometry, positions: number[], indices: number[]) {
  const existing = geometry.getAttribute('position');
  if (existing && existing.array.length === positions.length) {
    (existing.array as Float32Array).set(positions); existing.needsUpdate = true;
  } else geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (!geometry.index) geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
}

export function buildTerrain(tier: DetailTier) {
  const { halfWidth, halfLength } = LAND_BOUNDS;
  return surface(tier.terrainX, tier.terrainZ, (u, v) => {
    const x = lerp(-halfWidth, halfWidth, v), z = lerp(-halfLength, halfLength, u);
    return [x, terrainHeight(x, z), z];
  });
}

export function buildCutEdge(tier: DetailTier) {
  const boundary: THREE.Vector3[] = [], { halfWidth: w, halfLength: l, base } = LAND_BOUNDS;
  for (let i = 0; i <= tier.terrainX; i++) { const x = lerp(-w, w, i / tier.terrainX); boundary.push(new THREE.Vector3(x, terrainHeight(x, -l), -l)); }
  for (let i = 1; i <= tier.terrainZ; i++) { const z = lerp(-l, l, i / tier.terrainZ); boundary.push(new THREE.Vector3(w, terrainHeight(w, z), z)); }
  for (let i = 1; i <= tier.terrainX; i++) { const x = lerp(w, -w, i / tier.terrainX); boundary.push(new THREE.Vector3(x, terrainHeight(x, l), l)); }
  for (let i = 1; i < tier.terrainZ; i++) { const z = lerp(l, -l, i / tier.terrainZ); boundary.push(new THREE.Vector3(-w, terrainHeight(-w, z), z)); }
  const positions: number[] = [], indices: number[] = [];
  boundary.forEach(point => positions.push(point.x, point.y, point.z, point.x, base, point.z));
  boundary.forEach((_, i) => {
    const a = i * 2, b = ((i + 1) % boundary.length) * 2;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  });
  const floor = positions.length / 3;
  positions.push(-w, base, -l, w, base, -l, -w, base, l, w, base, l);
  indices.push(floor, floor + 1, floor + 2, floor + 1, floor + 3, floor + 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

const fractures = Array.from({ length: 9 }, (_, i) => ({
  row: .27 + i * .078 + (noise2(i + 7, 19) - .5) * .022,
  width: .0036 + noise2(i + 18, 8) * .0028,
  center: Math.sin(i * 2.4) * .48,
  span: .33 + noise2(i + 1, 6) * .4,
}));

function icePoint(shape: IceShape, u: number, v: number) {
  const point = glacierPoint(shape, u, v);
  const wave = Math.sin(v * 3.3 + u * 5.7) * .012 + Math.sin(v * 9.7 - u * 2.2) * .004;
  let incision = 0;
  // Bounded illustrative surface fractures, not a simulated stress or velocity field.
  for (const fracture of fractures) {
    const dx = (u - fracture.row + wave) / fracture.width;
    const reach = 1 - smooth(fracture.span * .7, fracture.span, Math.abs(v - fracture.center));
    incision = Math.max(incision, Math.exp(-dx * dx * 2.0) * reach);
  }
  const edge = Math.pow(Math.max(0, 1 - v * v), .7);
  const depth = incision * shape.thickness * .065 * edge * smooth(.12, .3, u);
  point.y = Math.max(point.bed + .014, point.y - depth);
  return { ...point, incision };
}

export function createIceGeometry(tier: DetailTier) {
  const cols = tier.iceX, rows = tier.iceZ;
  const topCount = (cols + 1) * (rows + 1);
  const top = new Float32Array(topCount * 3), colours = new Float32Array(topCount * 3), indices: number[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(top, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3)); geometry.setIndex(indices);
  return { geometry, topCount };
}

export function updateIceTop(geometry: THREE.BufferGeometry, tier: DetailTier, shape: IceShape) {
  const positions = geometry.getAttribute('position'), colours = geometry.getAttribute('color');
  for (let j = 0; j <= tier.iceZ; j++) for (let i = 0; i <= tier.iceX; i++) {
    const p = icePoint(shape, j / tier.iceZ, i / tier.iceX * 2 - 1), index = j * (tier.iceX + 1) + i;
    positions.setXYZ(index, p.x, p.y, p.z);
    const shade = 1 - p.incision * .78;
    colours.setXYZ(index, shade, shade + p.incision * .12, shade + p.incision * .19);
  }
  positions.needsUpdate = true; colours.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere();
}

/** Joined side/bottom/snout mesh exposes actual thickness instead of double-sided paper. */
export function updateIceEnvelope(geometry: THREE.BufferGeometry, tier: DetailTier, shape: IceShape) {
  const positions: number[] = [], indices: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => {
    const index = positions.length / 3; positions.push(...a, ...b, ...c, ...d); indices.push(index, index + 1, index + 2, index + 2, index + 1, index + 3);
  };
  for (let j = 0; j < tier.iceZ; j++) {
    const u0 = j / tier.iceZ, u1 = (j + 1) / tier.iceZ;
    const a = icePoint(shape, u0, -1), b = icePoint(shape, u1, -1), c = icePoint(shape, u0, 1), d = icePoint(shape, u1, 1);
    const bottom0 = terrainHeight(valleyCenter(a.z), a.z) - .12, bottom1 = terrainHeight(valleyCenter(b.z), b.z) - .12;
    quad([a.x, a.y, a.z], [a.x, bottom0, a.z], [b.x, b.y, b.z], [b.x, bottom1, b.z]);
    quad([d.x, d.y, d.z], [d.x, bottom1, d.z], [c.x, c.y, c.z], [c.x, bottom0, c.z]);
    quad([a.x, bottom0, a.z], [c.x, bottom0, c.z], [b.x, bottom1, b.z], [d.x, bottom1, d.z]);
  }
  for (const u of [0, 1]) for (let i = 0; i < tier.iceX; i++) {
    const a = icePoint(shape, u, i / tier.iceX * 2 - 1), b = icePoint(shape, u, (i + 1) / tier.iceX * 2 - 1);
    const bottomA = terrainHeight(valleyCenter(a.z), a.z) - .12, bottomB = terrainHeight(valleyCenter(b.z), b.z) - .12;
    if (u === 1) quad([a.x, a.y, a.z], [a.x, bottomA, a.z], [b.x, b.y, b.z], [b.x, bottomB, b.z]);
    else quad([b.x, b.y, b.z], [b.x, bottomB, b.z], [a.x, a.y, a.z], [a.x, bottomA, a.z]);
  }
  fillGeometry(geometry, positions, indices);
}

export function updateMoraine(geometry: THREE.BufferGeometry, tier: DetailTier, shape: IceShape, side: -1 | 1) {
  const positions: number[] = [], indices: number[] = [];
  const lowerReach = Math.max(.3, Math.min(.8, (-2.5 - shape.start) / shape.length));
  for (let j = 0; j <= tier.iceZ; j++) for (let k = 0; k < 2; k++) {
    const u = lowerReach + j / tier.iceZ * (1 - lowerReach);
    const edge = .87 + k * .115 + (noise2(j * .18, side + 7) - .5) * .03;
    const point = icePoint(shape, u, edge * side);
    positions.push(point.x, point.y + .013, point.z);
  }
  for (let j = 0; j < tier.iceZ; j++) { const i = j * 2; indices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
  fillGeometry(geometry, positions, indices);
}

export function updateRiver(geometry: THREE.BufferGeometry, tier: DetailTier, shape: IceShape) {
  const positions: number[] = [], indices: number[] = [];
  for (let i = 0; i <= tier.river; i++) for (let side = 0; side < 2; side++) {
    const z = lerp(shape.end + .045, 5.6, i / tier.river);
    const center = valleyCenter(z) + Math.sin(z * 2.7) * .075 + Math.sin(z * 5.4) * .025;
    const x = center + (side - .5) * (.055 + smooth(1.0, 5.5, z) * .035);
    positions.push(x, terrainHeight(x, z) + .014, z);
  }
  for (let i = 0; i < tier.river; i++) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  fillGeometry(geometry, positions, indices);
}

export function materialShape(mass: number) { return iceShape(mass); }
