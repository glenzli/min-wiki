import { FEEDERS, seed, STORAGE } from './magmaGeometry.ts';
import { landSurface, type Landform } from './projectModel.ts';
import { ROCK_BOTTOM, ROCK_RADIUS, sectionPoint, surfaceHeight, WORLD_SCALE, type XYZ } from './eruptionGeometry.ts';

/** Explanatory cutaway solids. The front host rock is removed while the
 * intrusive system retains its volume. Coordinates are illustrative, not a
 * tomographic reconstruction or additional state in the eruption model. */
export type SolidBuffers = { positions: number[]; uvs: number[]; indices: number[] };
export const SECTION_UNITS = 11;
const BASE_BEDS = [ROCK_BOTTOM, -2.54, -1.72, -.94, -.18];
const GROWTH = [.10, .23, .38, .55, .72, .88, 1];

function noise(x: number, y: number, z = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const curve = (a: number) => a * a * (3 - 2 * a);
  const u = curve(x - ix), v = curve(y - iy), w = curve(z - iz);
  let n = 0;
  for (let c = 0; c < 2; c++) for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++)
    n += seed((ix + a) * 157 + (iy + b) * 311 + (iz + c) * 631) * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
  return n;
}

/** Ordered basement contacts and nested deposits from the topic's existing
 * edifice profile. Units pinch out on the plain; they are not dated strata. */
export function bedHeight(boundary: number, x: number, z: number, kind: Landform): number {
  if (boundary === 0) return ROCK_BOTTOM;
  const top = surfaceHeight(x, z, kind);
  // Inset the buried roof to avoid coincident surfaces with the unchanged
  // terrain mesh; the exposed contact at z=0 still meets that same terrain.
  const roof = top - .04 * Math.min(1, -Math.min(0, z) * 4);
  if (boundary === SECTION_UNITS) return roof;
  if (boundary < BASE_BEDS.length) {
    const wave = .065 * Math.sin(x * .65 + boundary * .9) + .10 * (noise(x * 1.3, z * 1.1, boundary * 1.7) - .5);
    return Math.min(roof, BASE_BEDS[boundary] + wave);
  }
  const g = GROWTH[boundary - BASE_BEDS.length];
  const r = Math.hypot(x, z), angle = Math.atan2(z, x);
  const warp = 1 + .035 * Math.sin(angle * 3 + .8) + .022 * Math.cos(angle * 5);
  const height = (426 - landSurface(500 + r / warp / WORLD_SCALE, kind, g)) * .75 * WORLD_SCALE;
  const nested = -.12 + height * (.93 + .035 * Math.sin(angle * 5 + .7)
    + .075 * (noise(x * 1.1, z * 1.2, boundary * 2.7) - .5));
  const last = bedHeight(boundary - 1, x, z, kind);
  return Math.min(roof, Math.max(last, nested));
}

// The same exposed relief is used on both sides of a contact: no fake gaps
// between stacked layers. Grain-scale roughness is supplied by the material.
function cutDepth(x: number, y: number) {
  return .018 + .10 * noise(x * 2.7, y * 5.2) + .025 * noise(x * 12.1, y * 17.3);
}

/** A closed half-disc solid between two contacts, including its visible
 * rough cut face, back wall and top/bottom. A few depth samples retain real
 * layer thickness and occlusion when the reader orbits the section. */
export function stratumSolid(unit: number, kind: Landform, across = 96, depth = 12): SolidBuffers {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const row = depth + 1, plane = (across + 1) * row;
  for (let side = 0; side < 2; side++) for (let i = 0; i <= across; i++) for (let j = 0; j <= depth; j++) {
    const x = -ROCK_RADIUS + i / across * ROCK_RADIUS * 2;
    const back = -Math.sqrt(Math.max(0, ROCK_RADIUS ** 2 - x ** 2));
    const z = back * j / depth;
    const y = bedHeight(unit + side, x, z, kind);
    const topFade = Math.max(0, Math.min(1, (surfaceHeight(x, z, kind) - y) / .20));
    const frontRelief = cutDepth(x, y) * Math.exp(-j / depth * 18) * Math.sin(i / across * Math.PI) * topFade;
    positions.push(x, y, z + frontRelief); uvs.push(x * 2, y * 2);
  }
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, d, b, c, d);
  for (let i = 0; i < across; i++) for (let j = 0; j < depth; j++) {
    const a = i * row + j, b = (i + 1) * row + j;
    quad(a, a + 1, b + 1, b);
    quad(a + plane, b + plane, b + 1 + plane, a + 1 + plane);
  }
  for (let i = 0; i < across; i++) {
    const a = i * row, b = (i + 1) * row;
    quad(a, b, b + plane, a + plane);
    quad(a + depth, a + depth + plane, b + depth + plane, b + depth);
  }
  for (let j = 0; j < depth; j++) {
    quad(j, j + plane, j + 1 + plane, j + 1);
    const a = across * row + j;
    quad(a, a + 1, a + 1 + plane, a + plane);
  }
  return { positions, uvs, indices };
}

/** A smoothly joined crystal-bearing region around the existing storage
 * anchors. This implicit field is display geometry, not a melt-fraction field. */
export function storageDistance(x: number, y: number, z: number) {
  let distance = 10;
  for (const s of STORAGE) {
    const center = sectionPoint([s.x, s.y]);
    const dx = x - center[0] + .07 * Math.sin(z * 3 + s.phase);
    const dy = y - center[1] + .045 * Math.sin(x * 4 + s.phase) * Math.cos(z);
    const dz = z - .06 + .07 * Math.sin(dx * 2 + s.phase);
    const rx = s.w * WORLD_SCALE, ry = s.h * WORLD_SCALE * 2.15, rz = Math.max(.45, rx * .5);
    const d = (Math.hypot(dx / rx, dy / ry, dz / rz) - 1) * Math.min(rx, ry, rz);
    const blend = Math.max(0, .23 - Math.abs(distance - d)) / .23;
    distance = Math.min(distance, d) - blend * blend * .23 * .25;
  }
  return distance + .065 * (noise(x * 2.8, y * 3.2, z * 3) - .5)
    + .035 * (noise(x * 8.4, y * 8.1, z * 8.3) - .5);
}

const GRID = [88, 44, 44] as const, MIN: XYZ = [-3.3, -2.65, -1.45], MAX: XYZ = [2.9, .55, 1.55];
export const STORAGE_GRID_BYTES = (GRID[0] + 1) * (GRID[1] + 1) * (GRID[2] + 1) * 4;
let storageGrid: Float32Array | undefined;

/** Closed isosurface, rather than intersecting/overlapping flattened lenses.
 * One immutable < 1 MiB scalar grid is reused across remounts; output buffers
 * remain independently owned by each scene. No work is scheduled per frame. */
export function storageComplex(offset = 0): SolidBuffers {
  const [nx, ny, nz] = GRID, row = nx + 1, plane = row * (ny + 1);
  const point = (id: number): XYZ => {
    const z = Math.floor(id / plane), y = Math.floor((id - z * plane) / row), x = id % row;
    return [MIN[0] + x / nx * (MAX[0] - MIN[0]), MIN[1] + y / ny * (MAX[1] - MIN[1]), MIN[2] + z / nz * (MAX[2] - MIN[2])];
  };
  if (!storageGrid) {
    storageGrid = new Float32Array((nx + 1) * (ny + 1) * (nz + 1));
    for (let i = 0; i < storageGrid.length; i++) storageGrid[i] = storageDistance(...point(i));
  }
  const field = storageGrid, positions: number[] = [], uvs: number[] = [], indices: number[] = [], edges = new Map<number, number>();
  const edge = (a: number, b: number) => {
    if (a > b) [a, b] = [b, a];
    const key = a * field.length + b, prior = edges.get(key);
    if (prior !== undefined) return prior;
    const p = point(a), q = point(b), t = (field[a] - offset) / (field[a] - field[b]);
    const v = p.map((value, axis) => value + (q[axis] - value) * t) as XYZ;
    const index = positions.length / 3; positions.push(...v); uvs.push(v[0] * 2, v[1] * 2); edges.set(key, index); return index;
  };
  const triangle = (a: number, b: number, c: number, inside: XYZ) => {
    const p = positions.slice(a * 3, a * 3 + 3), q = positions.slice(b * 3, b * 3 + 3), r = positions.slice(c * 3, c * 3 + 3);
    const u = q.map((v, i) => v - p[i]), v = r.map((v, i) => v - p[i]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const inward = normal.reduce((sum, n, i) => sum + n * (inside[i] - p[i]), 0);
    indices.push(a, ...(inward > 0 ? [c, b] : [b, c]));
  };
  const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const a = x + row * y + plane * z, cube = [a, a + 1, a + row + 1, a + row, a + plane, a + plane + 1, a + plane + row + 1, a + plane + row];
    if (cube.every(i => field[i] > offset) || cube.every(i => field[i] <= offset)) continue;
    for (const tet of tetrahedra) {
      const ids = tet.map(i => cube[i]), inner = ids.filter(i => field[i] <= offset), outer = ids.filter(i => field[i] > offset);
      if (inner.length === 0 || inner.length === 4) continue;
      const inside = point(inner[0]);
      if (inner.length === 1 || inner.length === 3) {
        const one = inner.length === 1 ? inner[0] : outer[0], others = inner.length === 1 ? outer : inner;
        triangle(edge(one, others[0]), edge(one, others[1]), edge(one, others[2]), inside);
      } else {
        const a = edge(inner[0], outer[0]), b = edge(inner[0], outer[1]), c = edge(inner[1], outer[0]), d = edge(inner[1], outer[1]);
        triangle(a, c, b, inside); triangle(b, c, d, inside);
      }
    }
  }
  return { positions, uvs, indices };
}

export function feederCenterline(index: number): XYZ[] {
  const points = FEEDERS[index].map(point => sectionPoint(point, .06));
  if (index === 0) points.unshift([points[0][0] - .16, ROCK_BOTTOM - .25, .06]);
  return points;
}

/** A closed intrusive sheet, with two broad sides and a finite thickness.
 * Resampling the revealed portion keeps its terminal point on the original
 * path, including fractional advances and backwards seeking. */
export function intrusionSolid(points: XYZ[], width: number, depth: number, front = 1, ceiling?: (x: number, z: number) => number): SolidBuffers {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const segments = 64, sides = 8;
  const sample = (t: number): XYZ => {
    const at = Math.min(points.length - 1, Math.max(0, t) * (points.length - 1)), i = Math.min(points.length - 2, Math.floor(at)), f = at - i;
    return points[i].map((value, axis) => value * (1 - f) + points[i + 1][axis] * f) as XYZ;
  };
  for (let i = 0; i <= segments; i++) {
    const u = i / segments * Math.max(.00001, Math.min(1, front)), center = sample(u);
    const a = sample(Math.max(0, u - .003)), b = sample(Math.min(1, u + .003));
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length;
    let meanFold = 0;
    for (let j = 0; j < sides; j++) {
      const z = Math.sin((j + .5) / sides * Math.PI * 2) * depth * (.9 + .1 * Math.sin(u * 21));
      meanFold += Math.sin(z * 4 + u * 11) / sides;
    }
    for (let j = 0; j < sides; j++) {
      const angle = (j + .5) / sides * Math.PI * 2;
      const z = Math.sin(angle) * depth * (.9 + .1 * Math.sin(u * 21));
      const thickness = Math.sign(Math.cos(angle)) * width * (.82 + .18 * Math.abs(Math.cos(angle)))
        * (.8 + .2 * Math.sin(u * 33 + z * 7));
      const fold = (Math.sin(z * 4 + u * 11) - meanFold) * .085 * Math.sin(Math.PI * u);
      const x = center[0] + nx * (thickness + fold), rawY = center[1] + ny * (thickness + fold);
      const worldZ = center[2] + z;
      positions.push(x, ceiling ? Math.min(rawY, ceiling(x, worldZ) - .012) : rawY, worldZ); uvs.push(u, j / sides);
    }
    if (i < segments) for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + (j + 1) % sides;
      indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
  // Cap against the exact ring vertices; the centre includes the same ceiling.
  for (const end of [0, segments]) {
    const cap = positions.length / 3, base = end * sides;
    const center: XYZ = [0, 0, 0];
    for (let j = 0; j < sides; j++) for (let axis = 0; axis < 3; axis++) center[axis] += positions[(base + j) * 3 + axis] / sides;
    if (ceiling) center[1] = Math.min(center[1], ceiling(center[0], center[2]) - .012);
    positions.push(...center); uvs.push(end / segments * front, .5);
    for (let j = 0; j < sides; j++) {
      const a = base + j, b = base + (j + 1) % sides;
      indices.push(cap, ...(end === 0 ? [b, a] : [a, b]));
    }
  }
  return { positions, uvs, indices };
}
