import { ecologyState, type Habitat } from './ecologyModel.ts';
import { surfaceHeight, sectionPoint, ROCK_RADIUS, ROCK_BOTTOM, WORLD_SCALE, type XYZ } from './eruptionGeometry.ts';
import { dike, seed, STORAGE } from './magmaGeometry.ts';
import { smooth } from './model.ts';
import { bounded, constructionState, landDepositWindow, landState, landSurface, type Aftermath, type Landform } from './projectModel.ts';
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
  return { p: bounded(progress), chapter, land, ecology, contacts, construction: constructionState(land.p),
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

/** One compact, smooth vertical displacement acts on all original material
 * heights. Its derivative cannot invert the stack, and the basal plane stays
 * fixed. This temporary local bulge is separate from permanent deposition. */
export function historyDeformedY(x: number, y: number, z: number, frame: HistoryFrame) {
  if (frame.construction.uplift === 0) return y;
  const r2 = (x / 2.2) ** 2 + (z / 2.7) ** 2;
  const local = Math.exp(-r2) * (1 - smooth(2.5, 3.5, Math.sqrt(r2)));
  return y + frame.construction.uplift * local * smooth(ROCK_BOTTOM, 0, y);
}
export function historySurface(x: number, z: number, kind: Landform, frame: HistoryFrame) {
  return historyDeformedY(x, historyHeight(x, z, kind, frame.land.growth, frame.land.erosion), z, frame);
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
    positions.push(x, historySurface(x, z, kind, frame), z); uvs.push(x * .24, z * .24);
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
  const path = dike(0, end).map(point => sectionPoint(point, .06)), front = frame.construction.intrusionFront;
  const data = intrusionSolid(path, .05, .43, front, ceiling);
  const storage = storageStates(frame), point: XYZ = [0, 0, 0];
  for (let i = 0; i < data.positions.length; i += 3) {
    if (front === 0) { data.positions[i] = path[0][0]; data.positions[i + 1] = path[0][1]; data.positions[i + 2] = path[0][2]; }
    else {
      storagePoint(data.positions[i], data.positions[i + 1], data.positions[i + 2], storage, point, 0);
      data.positions[i] = point[0]; data.positions[i + 2] = point[2];
      const lift = (historyDeformedY(point[0], point[1], point[2], frame) - point[1]) * smooth(-.15, .3, point[1]);
      data.positions[i + 1] = Math.min(point[1] + lift, historySurface(point[0], point[2], kind, frame) - .012);
    }
  }
  return { ...data, front, visible: front > 0 };
}

/** Qualitative local assembly and melt domains in fixed material coordinates.
 * The existing deposit pulses drive unequal pockets, not a new magma clock.
 * Fill is retained as a qualitative amount for older consumers; rendering uses
 * the connected organic pockets rather than a horizontal liquid level.
 * USGS: models-magma-storage. This is not pressure or volume conservation. */
export function historyStorage(index: number, frame: HistoryFrame) {
  const s = STORAGE[index];
  if (!s) throw new RangeError('historyStorage index must be 0, 1 or 2');
  const state = frame.construction, center = sectionPoint([s.x, s.y], .06);
  const rx = s.w * WORLD_SCALE, radii: XYZ = [rx, s.h * WORLD_SCALE * 2.15, Math.max(.45, rx * .5)];
  const incoming = state.supply * (index === 0 ? 1 : index === 1 ? state.intrusionFront : .35 + .65 * state.fracture);
  const transfer = state.intrusionFront * frame.land.growth;
  const fill = .14 + .78 * incoming * (1 - transfer * (index === 0 ? .48 : index === 1 ? .78 : .62));
  const heat = state.heat * (.18 + .82 * incoming) * (1 - .45 * transfer);
  const pulses = frame.land.deposits.filter(d => d.index % 3 === index);
  const early = pulses.slice(0, 3).reduce((sum, d) => sum + d.growth, 0) / 3;
  const late = pulses.slice(3).reduce((sum, d) => sum + d.growth, 0) / 3;
  const assembled = (early + late) * .5;
  const offset: XYZ = index === 0 ? [-.13 * incoming + .10 * early - .02 * late, .035 * incoming - .025 * late, .035 * incoming]
    : index === 1 ? [.12 * incoming - .09 * early, .045 * incoming - .055 * late, -.025 * incoming + .02 * late]
      : [-.09 * incoming + .055 * late, -.025 * incoming + .025 * early, .04 * incoming - .02 * late];
  const dilation: XYZ = index === 0 ? [.26 * incoming - .13 * late + .05 * assembled, .12 * incoming + .10 * early - .18 * late, .13 * incoming - .10 * late]
    : index === 1 ? [.15 * incoming - .23 * early + .08 * late, .26 * incoming - .12 * early - .10 * late, .10 * incoming - .12 * early]
      : [.30 * incoming + .06 * early - .17 * late, .18 * incoming - .20 * early + .08 * late, .16 * incoming - .08 * late];
  const shear = (index === 1 ? -.11 : .09) * (incoming - .6 * assembled);
  const sizes = [bounded(.25 + .70 * incoming * (1 - .65 * early) + .10 * late),
    bounded(.22 + .67 * incoming * (.65 + .35 * early) - .40 * late),
    bounded(.24 + .70 * incoming * (.35 + .65 * state.fracture) - .44 * assembled)];
  // Normalized material coordinates, three overlapping unequal ellipses.
  // Every ellipse contains their shared neck, so residual domains stay joined.
  const pockets = sizes.map((size, pocket) => ({
    center: [pocket === 0 ? -.19 - .035 * late : pocket === 1 ? .22 - .025 * early : .025, pocket === 0 ? -.10 + .08 * early : pocket === 1 ? .10 - .075 * late : .02, 0] as XYZ,
    radii: [(.30 + size * .35) * (pocket === 2 ? .82 : 1), (.28 + size * .35) * (pocket === 2 ? 1.08 : 1), .85] as XYZ,
    angle: (pocket - 1) * .26 + .13 * (early - late) + index * .10,
  }));
  return { index, center, radii, fill, transfer, heat, visible: heat > 0,
    organic: { offset, dilation, shear, early, late, pockets } };
}
export type HistoryStorage = ReturnType<typeof historyStorage>;

function storageStates(frame: HistoryFrame) { return [0, 1, 2].map(index => historyStorage(index, frame)); }

/** Smooth local material mapping. Large-scale topology and all identities are
 * retained. The top/bottom taper and bounded differential displacement prevent
 * the shallow storage from opening into the surface or splitting its sheets.
 * Feeders must consume this same mapping from their immutable rest positions. */
function storagePoint(x: number, y: number, z: number, states: HistoryStorage[], target: { [index: number]: number }, at: number) {
  let dx = 0, dy = 0, dz = 0;
  for (const state of states) {
    const rx = x - state.center[0], ry = y - state.center[1], rz = z - state.center[2];
    const weight = Math.exp(-.9 * ((rx / state.radii[0]) ** 2 + (ry / state.radii[1]) ** 2 + (rz / state.radii[2]) ** 2));
    const { offset, dilation, shear } = state.organic;
    dx += weight * (offset[0] + dilation[0] * rx + shear * ry);
    dy += weight * (offset[1] + dilation[1] * ry + shear * rx * .2);
    dz += weight * (offset[2] + dilation[2] * rz + shear * rx * .15);
  }
  const taper = smooth(ROCK_BOTTOM, ROCK_BOTTOM + .35, y) * (1 - smooth(-.55, -.12, y));
  // The pre-existing implicit mesh has a small shallow tip above the flat
  // initial ground. A smooth monotone sealing datum buries that tip, without a
  // hard terrain clamp that would flatten faces or invert adjacent vertices.
  const seal = .10 * smooth(-.32, -.04, y) * (1 - smooth(.12, .45, y));
  target[at] = x + dx * taper; target[at + 1] = y + dy * taper - seal; target[at + 2] = z + dz * taper;
}

export function historyStorageDeform(point: XYZ, frame: HistoryFrame): XYZ {
  const target: XYZ = [0, 0, 0]; storagePoint(...point, storageStates(frame), target, 0); return target;
}

/** Fills a retained buffer in one pass; no field grid, mesh or THREE allocation.
 * Rest coordinates, UVs and indices remain owned and unchanged by the caller. */
export function historyStorageBody(rest: ArrayLike<number>, frame: HistoryFrame, target = new Float32Array(rest.length)) {
  if (target === rest || target.length !== rest.length || rest.length % 3 !== 0) throw new RangeError('storage needs separate matching rest/target position arrays');
  const states = storageStates(frame);
  for (let at = 0; at < rest.length; at += 3) storagePoint(rest[at], rest[at + 1], rest[at + 2], states, target, at);
  return target;
}

/** Occupancy on the exposed section, sampled in immutable material space.
 * Renderer and SVG consume these same ellipse parameters; no liquid plane. */
export function historyStorageField(point: XYZ, state: HistoryStorage) {
  const qx = (point[0] - state.center[0]) / state.radii[0], qy = (point[1] - state.center[1]) / state.radii[1];
  let field = 0;
  for (const pocket of state.organic.pockets) {
    const x = qx - pocket.center[0], y = qy - pocket.center[1], c = Math.cos(pocket.angle), s = Math.sin(pocket.angle);
    const distance = Math.hypot((x * c + y * s) / pocket.radii[0], (-x * s + y * c) / pocket.radii[1]);
    field = Math.max(field, 1 - smooth(.82, 1.06, distance));
  }
  return field;
}

/** SVG teaching contours in world XYZ, using the same domains and material
 * mapping as the closed 3D body. Inner contours follow the unequal connected
 * ellipse union, rather than uniformly shrinking the outer framework. */
export function historyStorageContour(index: number, frame: HistoryFrame, inner = false, segments = 96): XYZ[] {
  const states = storageStates(frame), state = states[index];
  if (!state) throw new RangeError('historyStorageContour index must be 0, 1 or 2');
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = i / segments * Math.PI * 2, x = Math.cos(angle), y = Math.sin(angle);
    let radius = 1 + .06 * Math.sin(angle * 3 + STORAGE[index].phase) + .035 * Math.sin(angle * 7 - STORAGE[index].phase);
    if (inner) {
      radius = 0;
      for (const pocket of state.organic.pockets) {
        const c = Math.cos(pocket.angle), s = Math.sin(pocket.angle);
        const ux = (x * c + y * s) / pocket.radii[0], uy = (-x * s + y * c) / pocket.radii[1];
        const cx = (pocket.center[0] * c + pocket.center[1] * s) / pocket.radii[0];
        const cy = (-pocket.center[0] * s + pocket.center[1] * c) / pocket.radii[1];
        const a = ux * ux + uy * uy, b = ux * cx + uy * cy;
        const root = (b + Math.sqrt(Math.max(0, b * b - a * (cx * cx + cy * cy - .94 ** 2)))) / a;
        radius = Math.max(radius, root);
      }
    }
    const target: XYZ = [0, 0, 0];
    storagePoint(state.center[0] + x * radius * state.radii[0], state.center[1] + y * radius * state.radii[1], state.center[2], states, target, 0);
    return target;
  });
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
    return [x, historyDeformedY(x, y, z + rough, frame), z + rough];
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

/** Six finite-width flow tops use the original births and front clock. After
 * emplacement their actual coordinates freeze; later deposits can bury them.
 * This domed flow-top projection is not a volume/velocity or cooling solver. */
export function historyFlow(index: number, kind: Landform, frame: HistoryFrame, segments = 64, across = 10) {
  const birth = .08 + index * .065, end = birth + .10, p = frame.land.p;
  const extent = p >= end ? 1 : bounded((p - birth) / .10), angle = .32 + index * 2.399;
  const length = extent * (kind === 'shield' ? 6.1 : 4.3), positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const emission = Math.min(p, end), source = emission === p ? frame : { ...frame, land: landState(emission), construction: constructionState(emission) };
  const spread = Math.min(1, Math.sqrt(length / .3));
  for (let i = 0; i <= segments; i++) for (let j = 0; j <= across; j++) {
    const u = i / segments, v = j / across, q = v * 2 - 1;
    const nose = Math.min(length * .42, (.12 + .065 * Math.sqrt(length)) * spread);
    const distance = Math.max(0, u * length - nose * smooth(.78, 1, u) * (1 - Math.sqrt(Math.max(0, 1 - q * q))));
    const halfWidth = ((kind === 'shield' ? .13 : .10) + .065 * Math.sqrt(distance)) * spread
      * (.90 + .13 * Math.sin(distance * 2.7 + index) + .07 * Math.sin(distance * 6.1 - index));
    const side = q * halfWidth;
    const bend = Math.sin(distance * 2.1 + index) * .045 * distance;
    const x = Math.cos(angle) * distance - Math.sin(angle) * (side + bend);
    const z = Math.sin(angle) * distance + Math.cos(angle) * (side + bend);
    const thickness = .007 + .045 * Math.sqrt(Math.max(0, 1 - q * q)) * (1 - .72 * smooth(.86, 1, u));
    positions.push(x, historySurface(x, z, kind, source) + thickness, z);
    uvs.push(distance, v);
    if (i < segments && j < across) { const a = i * (across + 1) + j, b = a + across + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
  }
  const visible = extent > 0 && frame.chapter === 'landscape', active = visible && extent < 1;
  const heat = visible ? (1 - smooth(end, end + .12, p)) * (1 - frame.land.cooling) : 0;
  return { positions, uvs, indices, visible, length, heat, mobility: active ? heat : 0, flux: active ? Math.sin(extent * Math.PI) : 0 };
}

/** A finite set of enlarged representative clasts ties each existing deposit
 * pulse to its vent. This is an illustrative arc, not a particle/volume solver.
 * Actual landing coordinates are retained; later deposits may cover them. */
export function historyClasts(kind: Landform, frame: HistoryFrame) {
  const perLayer = kind === 'shield' ? 2 : 6;
  const reference = (p: number): HistoryFrame => ({ ...frame, land: landState(p), construction: constructionState(p) });
  return frame.land.deposits.flatMap(deposit => {
    const window = landDepositWindow(deposit.index), launch = reference(window.birth), landing = reference(window.end);
    const width = (kind === 'shield' ? 8.4 : kind === 'composite' ? 5.6 : 5.2) * (.22 + .78 * Math.sqrt(landing.land.growth));
    return Array.from({ length: perLayer }, (_, rank) => {
      const index = deposit.index * perLayer + rank, flight = deposit.growth, landed = flight === 1;
      const radius = .035 + .04 * seed(index + 4171), angle = .28 + index * 2.399 + .34 * seed(index + 1901);
      const distance = width * (.14 + .52 * seed(index + 613));
      const x = Math.cos(angle) * distance, z = Math.sin(angle) * distance;
      const sourceY = historySurface(0, 0, kind, launch) + radius;
      const groundY = historySurface(x, z, kind, landing), targetY = groundY + radius * .75;
      const arc = .65 + .55 * seed(index + 3851) + distance * .32;
      const position: XYZ = [x * flight, sourceY * (1 - flight) + targetY * flight + Math.sin(Math.PI * flight) * arc, z * flight];
      // An exact endpoint prevents a residual sine epsilon from changing the
      // retained material position or its contact with the landing surface.
      if (landed) position[1] = targetY;
      const visible = frame.chapter === 'landscape' && flight > 0;
      const heat = visible ? (.22 + .34 * seed(index + 1977)) * (1 - smooth(window.end - .015, window.end + .04, frame.land.p)) * (1 - frame.land.cooling) : 0;
      return { index, layer: deposit.index, rank, birth: window.birth, landing: window.end, position, radius, heat, visible, landed, flight };
    });
  });
}

export function historySites(kind: Landform, frame: HistoryFrame) {
  const radius = kind === 'shield' ? 8.4 : 5.6;
  return Array.from({ length: 100 }, (_, index) => {
    const r = radius * (.30 + seed(index + 781) * .62), angle = .15 + seed(index + 998) * Math.PI * 2;
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    const cover = smooth(seed(index + 113) * .63, seed(index + 113) * .63 + .19, frame.vegetation);
    return { index, x, z, y: historySurface(x, z, kind, frame), cover,
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
