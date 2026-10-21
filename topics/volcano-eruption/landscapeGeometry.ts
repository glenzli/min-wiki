import { ecologyState, type Habitat } from './ecologyModel.ts';
import { surfaceHeight, sectionPoint, ROCK_RADIUS, ROCK_BOTTOM, WORLD_SCALE, type XYZ } from './eruptionGeometry.ts';
import { dike, seed } from './magmaGeometry.ts';
import { smooth } from './model.ts';
import { bounded, landState, landSurface, type Aftermath, type Landform } from './projectModel.ts';
import { intrusionSolid, type SolidBuffers } from './sectionGeometry.ts';

export type HistoryChapter = 'landscape' | 'life';
export const HISTORY_BEDS = 4;
export const HISTORY_UNITS = HISTORY_BEDS + 18;

/** The existing deposit and ecology clocks remain independent of one eruption.
 * A completed contact is retained while later deposits enter above it. */
export function historyFrame(progress: number, chapter: HistoryChapter, aftermath: Aftermath = 'green', habitat: Habitat = 'wet') {
  const land = landState(chapter === 'life' ? .74 : progress, aftermath);
  const ecology = ecologyState(chapter === 'life' ? progress : 1, habitat);
  let accumulated = 0;
  const contacts = [0, ...land.deposits.map(d => accumulated += d.growth / 18)];
  return { p: bounded(progress), chapter, land, ecology, contacts,
    vegetation: chapter === 'life' ? ecology.vegetation : land.vegetation,
    soil: chapter === 'life' ? ecology.soil : land.vegetation * .7,
    burial: chapter === 'life' ? ecology.burial : 0 };
}
export type HistoryFrame = ReturnType<typeof historyFrame>;

/** The mature surface is exactly the single-episode scene's terrain. Growing
 * nested profiles preserve the authored broad shield / steep composite shape. */
export function historyHeight(x: number, z: number, kind: Landform, growth = 1, erosion = 0) {
  const g = bounded(growth), angle = Math.atan2(z, x), r = Math.hypot(x, z);
  const warp = 1 + .035 * Math.sin(angle * 3 + .8) + .022 * Math.cos(angle * 5);
  const profile = (at: number) => (426 - landSurface(500 + r / warp / WORLD_SCALE, kind, at)) * .75 * WORLD_SCALE;
  const mature = surfaceHeight(x, z, kind), base = Math.min(0, mature);
  const height = mature <= 0 ? base : g === 1 ? mature : Math.max(0, profile(g) + (mature - profile(1)) * g);
  const wear = bounded(erosion) * Math.max(0, height) * (.10 + .07 * Math.sin((500 + x / WORLD_SCALE) * .055) ** 2);
  return height - wear;
}

function bed(boundary: number, x: number, z: number, kind: Landform, frame: HistoryFrame) {
  if (boundary === 0) return ROCK_BOTTOM;
  const ground = historyHeight(x, z, kind, 0);
  if (boundary < HISTORY_BEDS) return [-3.25, -2.5, -1.65, -.83][boundary]
    + .045 * Math.sin(x * .7 + boundary) + .024 * Math.sin(x * 2.7 + z * 1.8 + boundary * 3);
  const growth = frame.contacts[boundary - HISTORY_BEDS];
  const roof = historyHeight(x, z, kind, frame.land.growth, frame.land.erosion);
  // Later erosion truncates the retained stack at its surface. It does not
  // compress or lower older buried contacts throughout the mountain.
  return Math.min(roof, Math.max(ground, historyHeight(x, z, kind, growth)));
}

export function historyTerrain(kind: Landform, frame: HistoryFrame, rings = 88, sectors = 176): SolidBuffers {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= sectors; j++) {
    const r = ROCK_RADIUS * i / rings, a = j / sectors * Math.PI * 2, x = r * Math.cos(a), z = r * Math.sin(a);
    positions.push(x, historyHeight(x, z, kind, frame.land.growth, frame.land.erosion), z); uvs.push(x * .24, z * .24);
    if (i < rings && j < sectors) {
      const k = i * (sectors + 1) + j, next = k + sectors + 1;
      indices.push(k, k + 1, next, k + 1, next + 1, next);
    }
  }
  return { positions, uvs, indices };
}

export function historyIntrusion(kind: Landform, frame: HistoryFrame) {
  const ceiling = (x: number, z: number) => historyHeight(x, z, kind, frame.land.growth, frame.land.erosion);
  const end = 115 - ceiling(0, 0) / WORLD_SCALE;
  return intrusionSolid(dike(0, end).map(point => sectionPoint(point, .06)), .05, .43, 1, ceiling);
}

/** Closed half-disc strata, including a separately normalled rough cut face.
 * Contacts share identical relief; there are no gaps between successive beds. */
export function historyStratum(unit: number, kind: Landform, frame: HistoryFrame, across = 64, depth = 8) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const row = depth + 1, plane = (across + 1) * row;
  const point = (side: number, i: number, j: number): XYZ => {
    const x = -ROCK_RADIUS + i / across * ROCK_RADIUS * 2;
    const z = -Math.sqrt(Math.max(0, ROCK_RADIUS ** 2 - x ** 2)) * j / depth;
    const y = bed(unit + side, x, z, kind, frame);
    const roof = historyHeight(x, z, kind, 1);
    const rough = (.025 + .014 * Math.sin(x * 13 + y * 9) + .009 * Math.sin(x * 31 - y * 24))
      * Math.exp(-j / depth * 20) * Math.sin(i / across * Math.PI) * smooth(0, .15, roof - y);
    return [x, y, z + rough];
  };
  for (let side = 0; side < 2; side++) for (let i = 0; i <= across; i++) for (let j = 0; j <= depth; j++) {
    const p = point(side, i, j); positions.push(...p); uvs.push(p[0], p[1]);
  }
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, d, b, c, d);
  for (let i = 0; i < across; i++) for (let j = 0; j < depth; j++) {
    const a = i * row + j, b = a + row;
    quad(a, a + 1, b + 1, b); quad(a + plane, b + plane, b + 1 + plane, a + 1 + plane);
  }
  for (let i = 0; i < across; i++) {
    const a = i * row, b = a + row;
    quad(a + depth, a + depth + plane, b + depth + plane, b + depth);
  }
  for (let j = 0; j < depth; j++) {
    quad(j, j + plane, j + 1 + plane, j + 1);
    const a = across * row + j; quad(a, a + 1, a + 1 + plane, a + plane);
  }
  const frontStart = positions.length / 3;
  for (let i = 0; i <= across; i++) for (const side of [0, 1]) {
    const p = point(side, i, 0); positions.push(...p); uvs.push(p[0], p[1]);
    if (i < across && side === 0) {
      const a = frontStart + i * 2; quad(a, a + 2, a + 3, a + 1);
    }
  }
  return { positions, uvs, indices, frontStart };
}

/** Six retained flow traces use the original history births. Their geometry
 * conforms to the current deposit surface; cooling freezes exposed heat. */
export function historyFlow(index: number, kind: Landform, frame: HistoryFrame, segments = 64, across = 6) {
  const extent = bounded((frame.p - .08 - index * .065) / .10), angle = .32 + index * 2.399;
  const length = extent * (kind === 'shield' ? 6.1 : 4.3), positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) for (let j = 0; j <= across; j++) {
    const distance = i / segments * length, v = j / across;
    const side = (v - .5) * (.08 + .065 * Math.sqrt(distance)) * Math.sin(Math.PI * Math.min(1, (1 - i / segments) * 8));
    const bend = Math.sin(distance * 2.1 + index) * .045 * distance;
    const x = Math.cos(angle) * distance - Math.sin(angle) * (side + bend);
    const z = Math.sin(angle) * distance + Math.cos(angle) * (side + bend);
    positions.push(x, historyHeight(x, z, kind, frame.land.growth, frame.land.erosion) + .008 + Math.sin(v * Math.PI) * .012, z);
    uvs.push(distance, v);
    if (i < segments && j < across) { const a = i * (across + 1) + j, b = a + across + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
  }
  return { positions, uvs, indices, visible: extent > 0 && frame.chapter === 'landscape' };
}

export function historySites(kind: Landform, frame: HistoryFrame) {
  const radius = kind === 'shield' ? 8.4 : 5.6;
  return Array.from({ length: 100 }, (_, index) => {
    const r = radius * (.30 + seed(index + 781) * .62), angle = .15 + seed(index + 998) * Math.PI * 2;
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    const cover = smooth(seed(index + 113) * .63, seed(index + 113) * .63 + .19, frame.vegetation);
    return { index, x, z, y: historyHeight(x, z, kind, frame.land.growth, frame.land.erosion), cover,
      soil: frame.soil * (.4 + seed(index + 63) * .6), radius: .23 + seed(index + 44) * .38 };
  });
}

export const HISTORY_FIELD_SIZE = 160;
export function historyField(kind: Landform, frame: HistoryFrame) {
  const size = HISTORY_FIELD_SIZE, data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) { data[i * 4 + 2] = Math.round(frame.burial * 255); data[i * 4 + 3] = 255; }
  for (const site of historySites(kind, frame)) {
    const cx = (site.x / (ROCK_RADIUS * 2) + .5) * size, cy = (site.z / (ROCK_RADIUS * 2) + .5) * size;
    const radius = site.radius / (ROCK_RADIUS * 2) * size * (1.2 + site.cover * 2.8);
    for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(size - 1, Math.ceil(cy + radius)); y++)
      for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(size - 1, Math.ceil(cx + radius)); x++) {
        const d = Math.hypot(x - cx, y - cy) / radius, edge = 1 - smooth(.38, 1, d), at = (y * size + x) * 4;
        data[at] = Math.max(data[at], Math.round(site.cover * edge * 255));
        data[at + 1] = Math.max(data[at + 1], Math.round(site.soil * edge * 255));
      }
  }
  return data;
}
