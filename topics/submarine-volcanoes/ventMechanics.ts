import { clamp, ramp, type Environment, type Supply } from './model.ts';
import { islandVentOrigin, oceanGeometryFrame, pillowShape, seed, surfaceHeight, WATER_Y, type OceanGeometryFrame, type SolidBuffers, type XYZ } from './geometry3d.ts';
import { islandPrimarySupply, islandRouteBearing } from './coastalFlow.ts';

export const LIP_PIECES = 6;
export const BURST_PIECES = 7;
export const VENT_SECTORS = 64;
export const VENT_POCKET_RINGS = 8;

/** Keep the trailing neck attached while the lobe advances. The volume proxy
 * remains the supplied growth, not a second accumulation or material solver. */
export function extrusionEnvelope(growth: number) {
  const g = clamp(growth), axial = .18 + .82 * g;
  return { axial, radial: Math.sqrt(g / axial), offset: -1.3 * (1 - axial) };
}

/** A supplied geological frame opens the rind and adds lava once. The separate
 * phase only flexes a hot lip; it cannot spawn a lobe, fracture or projectile. */
export function extrusionState(growth: number, crust: number, coreHeat: number, phase = 0, variant = 0) {
  // The opaque outer rind quenches first. It hides much of the molten core,
  // but cannot erase the core's independent thermal history at an open nose.
  const hot = clamp(coreHeat) * (1 - clamp(crust) * .62);
  const opening = ramp(growth, .02, .62) * (1 - ramp(crust, .68, 1) * .86);
  const flex = hot * (1 - ramp(growth, .82, 1)) * (.016 * Math.sin(phase * 2 + variant) + .009 * Math.sin(phase * 3 + variant * 2));
  return { hot, opening, flex, advance: .025 + .075 * ramp(growth, .03, .88), retained: clamp(growth) };
}

type Surface = (u: number, v: number, inside: boolean) => XYZ;
/** A finite thick patch, including its two skins and all four fracture faces. */
function thickPatch(rows: number, columns: number, surface: Surface): SolidBuffers {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], count = (rows + 1) * (columns + 1);
  for (let side = 0; side < 2; side++) for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const u = row / rows, v = col / columns;
    positions.push(...surface(u, v, !!side)); uvs.push(u, v);
  }
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, c, a, c, d);
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * (columns + 1) + col, b = a + 1, d = a + columns + 1, c = d + 1;
    quad(a, d, c, b); quad(a + count, b + count, c + count, d + count);
  }
  for (let col = 0; col < columns; col++) {
    const a = col, b = a + 1, c = rows * (columns + 1) + col, d = c + 1;
    quad(a, b, b + count, a + count); quad(c, c + count, d + count, d);
  }
  for (let row = 0; row < rows; row++) {
    const a = row * (columns + 1), b = a + columns + 1, c = a + columns, d = b + columns;
    quad(a, a + count, b + count, b); quad(c, d, d + count, c + count);
  }
  for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices };
}

/** Open-ended sleeve and unequal hinged lips. No triangles span the mouth. */
export function extrusionRind(variant: number, piece = -1) {
  const angle0 = piece < 0 ? 0 : piece / LIP_PIECES * Math.PI * 2;
  const span = piece < 0 ? Math.PI * 2 : Math.PI * 2 / LIP_PIECES - .022;
  const phase = seed(variant, 731) * Math.PI * 2;
  const pivot: XYZ = piece < 0 ? [0, 0, 0] : pillowShape([.10, Math.cos(angle0 + span / 2) * Math.sqrt(.99), Math.sin(angle0 + span / 2) * Math.sqrt(.99)], variant);
  const buffers = thickPatch(piece < 0 ? 18 : 10, piece < 0 ? 48 : 9, (u, v, inside) => {
    const a = angle0 + v * span;
    const edge = .62 + .09 * Math.sin(a * 3 + phase) + .045 * Math.sin(a * 7 - phase);
    const x = piece < 0 ? -.985 + u * 1.14 : .09 + (edge - .09) * u;
    const radial = Math.sqrt(Math.max(0, 1 - x * x)) * (inside ? .944 : 1.008);
    const p = pillowShape([x, Math.cos(a) * radial, Math.sin(a) * radial], variant);
    return [p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]];
  });
  return { ...buffers, pivot, angle: angle0 + span / 2 };
}

/** Deposition and individual ruptures rework this one outlet. The weights come
 * from the supplied history, never from the ambient material-detail clock. */
export function ventMorphology(frame: OceanGeometryFrame) {
  const units = frame.environment === 'island' ? frame.history.units : [];
  let build = 0, skew = 0, shoulder = 0, bearing = 1.25;
  for (const unit of units) {
    build += unit.growth / 24;
    skew += unit.growth * Math.sin(unit.index * 1.71) * .014;
    shoulder += unit.growth * Math.cos(unit.index * .91) * .012;
    const next = units[unit.index + 1]?.growth ?? 0, weight = Math.max(0, unit.growth - next);
    // A flank breakout is fed through its parent; it cannot turn the summit
    // opening toward the off-axis branch as if a new vent had appeared there.
    const parent = islandPrimarySupply(unit.index);
    bearing += weight * (islandRouteBearing(frame, parent) - 1.25);
  }
  // The shallow comparison has its own finite bursts, with no island accretion.
  if (frame.environment === 'shallow') for (let i = 0; i < 7; i++) {
    const g = ramp(frame.p, .06 + i * .075, .12 + i * .075);
    build += g * .09; skew += g * Math.sin(i * 1.71) * .014; shoulder += g * Math.cos(i * .91) * .012;
  }
  return { build, skew, shoulder, bearing, radius: .32 + build * .18 };
}

/** An open, terrain-rooted lip. Unequal deposits raise shoulders; each selected
 * rupture lowers a different sector. Later lava can fill or bury those scars. */
type VentShape = ReturnType<typeof ventMorphology>;
const emptyVentShape = () => ({ build: 0, skew: 0, shoulder: 0, bearing: 1.25, radius: .32 });
const rimIrregularity = (shape: VentShape, a: number) => 1 + .10 * Math.sin(a * 3 + .4)
  + .045 * Math.cos(a * 7) + shape.skew * Math.sin(a * 2);
function rimRelief(shape: VentShape, a: number, u: number, frame?: OceanGeometryFrame, episodes: BurstEpisode[] = []) {
  let damage = 0;
  if (frame) for (const event of episodes) {
    const angle = Math.atan2(Math.sin(a - event.rotation), Math.cos(a - event.rotation));
    damage += .10 * ramp(frame.p, event.start, event.start + .012) * Math.exp(-((angle / .5) ** 2));
  }
  const angle = Math.atan2(Math.sin(a - shape.bearing), Math.cos(a - shape.bearing));
  const gap = Math.exp(-((angle / .38) ** 2));
  return Math.max(.004, .065 + shape.build * .075 + .023 * Math.sin(a * 4 + u * 5)
    + shape.shoulder * Math.cos(a * 3) - damage) * (1 - gap * .92);
}

export function ventRim(frame?: OceanGeometryFrame, episodes: BurstEpisode[] = []): SolidBuffers {
  const data = thickPatch(5, VENT_SECTORS, () => [0, 0, 0]);
  updateVentRim(data.positions, frame, episodes); return data;
}

/** Update retained positions only; neither geology nor detail rebuilds topology. */
export function updateVentRim(positions: Float32Array, frame?: OceanGeometryFrame, episodes: BurstEpisode[] = []) {
  const shape = frame ? ventMorphology(frame) : emptyVentShape(), origin = frame ? ventOrigin(frame) : [0, 0, 0];
  let vertex = 0;
  for (let side = 0; side < 2; side++) for (let row = 0; row <= 5; row++) for (let col = 0; col <= VENT_SECTORS; col++) {
    const u = row / 5, a = col / VENT_SECTORS * Math.PI * 2;
    const r = (.19 + u * shape.radius) * rimIrregularity(shape, a);
    const x = Math.cos(a) * r, z = Math.sin(a) * r * (.85 + shape.shoulder);
    const ground = frame ? surfaceHeight(frame, origin[0] + x, origin[2] + z) - origin[1] : 0;
    positions[vertex++] = x;
    positions[vertex++] = ground - .008 + Math.sin(u * Math.PI) * rimRelief(shape, a, u, frame, episodes) - (side ? .07 : 0);
    positions[vertex++] = z;
  }
}

/** A closed terrain-conforming pocket. The outer ring sits inside the first
 * complete rim ring. UV.x is radial, UV.y angular; skin distinguishes the top
 * from the buried bottom without asking a shader to infer it from normals. */
export function ventPocket(): SolidBuffers & { skin: Float32Array } {
  const count = 1 + VENT_POCKET_RINGS * VENT_SECTORS, positions = new Float32Array(count * 6);
  const uvs = new Float32Array(count * 4), skin = new Float32Array(count * 2), indices: number[] = [];
  for (let side = 0; side < 2; side++) {
    const offset = side * count; skin.fill(1 - side, offset, offset + count);
    for (let ring = 1; ring <= VENT_POCKET_RINGS; ring++) for (let col = 0; col < VENT_SECTORS; col++) {
      const a = offset + 1 + (ring - 1) * VENT_SECTORS + col;
      const b = offset + 1 + (ring - 1) * VENT_SECTORS + (col + 1) % VENT_SECTORS;
      uvs[a * 2] = ring / VENT_POCKET_RINGS; uvs[a * 2 + 1] = col / VENT_SECTORS;
      const triangles = ring === 1 ? [offset, b, a] : [a - VENT_SECTORS, b - VENT_SECTORS, b, a - VENT_SECTORS, b, a];
      if (side) for (let i = 0; i < triangles.length; i += 3) indices.push(triangles[i], triangles[i + 2], triangles[i + 1]);
      else indices.push(...triangles);
    }
  }
  const outer = 1 + (VENT_POCKET_RINGS - 1) * VENT_SECTORS;
  for (let col = 0; col < VENT_SECTORS; col++) {
    const a = outer + col, b = outer + (col + 1) % VENT_SECTORS;
    indices.push(a, b, b + count, a, b + count, a + count);
  }
  updateVentPocket(positions); return { positions, uvs, indices, skin };
}

export function ventPocketDetail() {
  const count = 1 + VENT_POCKET_RINGS * VENT_SECTORS;
  return { base: new Float32Array(count), mobility: new Float32Array(count) };
}
type PocketDetail = ReturnType<typeof ventPocketDetail>;

/** The selected island's initial effusion has a mostly covered outlet. Its
 * appearance relaxes before the existing fragment episode, never at a new
 * eruption clock or an invented universal critical water depth. */
export function submergedOutletCover(frame: OceanGeometryFrame) {
  if (frame.environment !== 'island') return 0;
  const fragmentStart = frame.history.units.find(unit => unit.phase === 'shallow-fragments')?.start;
  const stage = fragmentStart === undefined ? 1 : 1 - ramp(frame.p, fragmentStart - .035, fragmentStart);
  return stage * (1 - ramp(ventOrigin(frame)[1], WATER_Y - .25, WATER_Y + .02));
}

const pocketFold = (x: number, z: number, phase: number) => .013 * Math.sin(x * 23 + z * 11 - phase * 2)
  + .007 * Math.sin(x * 39 - z * 27 - phase * 3 + .5 * Math.sin(phase));

/** Only the hot interior consumes the supplied periodic material phase. The
 * perimeter cannot lift, orbit or pulse away from its terrain/rim contact. */
export function updateVentPocket(positions: Float32Array, frame?: OceanGeometryFrame, phase = 0, episodes: BurstEpisode[] = [], detail?: PocketDetail) {
  const shape = frame ? ventMorphology(frame) : emptyVentShape(), origin = frame ? ventOrigin(frame) : [0, 0, 0];
  const heat = frame ? ventHeat(frame) : 0, flash = frame ? burstFlash(frame, episodes) : 0;
  const covered = frame ? submergedOutletCover(frame) : 0;
  const count = 1 + VENT_POCKET_RINGS * VENT_SECTORS;
  for (let i = 0; i < count; i++) {
    const ring = i ? 1 + Math.floor((i - 1) / VENT_SECTORS) : 0;
    const q = ring / VENT_POCKET_RINGS, a = i ? (i - 1) % VENT_SECTORS / VENT_SECTORS * Math.PI * 2 : 0;
    const radius = (.19 + .2 * shape.radius) * rimIrregularity(shape, a);
    const x = Math.cos(a) * radius * q, z = Math.sin(a) * radius * q * (.85 + shape.shoulder);
    const ground = frame ? surfaceHeight(frame, origin[0] + x, origin[2] + z) - origin[1] : 0;
    const interior = 1 - ramp(q, .56, 1), mobility = (1 - q * q) ** 2;
    const banks = -.015 + Math.sin(.2 * Math.PI) * rimRelief(shape, a, .2, frame, episodes);
    const scar = .004 + .004 * Math.sin(x * 32 + z * 23) * Math.cos(x * 21 - z * 37);
    const along = x * Math.cos(shape.bearing) + z * Math.sin(shape.bearing);
    const shoulder = .052 + .018 * Math.sin(along * 11 + .5);
    const base = ground + banks * (1 - interior) + interior * scar
      + mobility * heat * (.026 + flash * .014 + covered * shoulder);
    const moving = mobility * heat, top = base + moving * pocketFold(x, z, phase);
    if (detail) { detail.base[i] = base; detail.mobility[i] = moving; }
    const lower = ground - .085 - .014 * mobility;
    positions[i * 3] = positions[(i + count) * 3] = x;
    positions[i * 3 + 1] = top; positions[(i + count) * 3 + 1] = lower;
    positions[i * 3 + 2] = positions[(i + count) * 3 + 2] = z;
  }
}

/** A material-detail update reuses this geological frame's terrain, rim and
 * thermal envelope. It samples no terrain and never modifies x/z or the base. */
export function updateVentPocketDetail(positions: Float32Array, phase: number, detail: PocketDetail) {
  for (let i = 0; i < detail.base.length; i++) positions[i * 3 + 1] = detail.base[i]
    + detail.mobility[i] * pocketFold(positions[i * 3], positions[i * 3 + 2], phase);
}

export function ventOrigin(frame: OceanGeometryFrame): XYZ {
  return frame.environment === 'island' ? islandVentOrigin(frame) : [-.04, surfaceHeight(frame, 0, 0) + .018, .04];
}

/** Adjacent supply episodes overlap. A just-born deposit must not extinguish
 * the still-flowing previous supply at their shared outlet. */
export function ventHeat(frame: OceanGeometryFrame) {
  if (frame.environment !== 'island') return frame.state.activity;
  return frame.p >= .80 ? 0 : frame.history.units.reduce((heat, unit) => Math.max(heat,
    unit.growth > 0 && unit.growth < 1 ? Math.sin(unit.growth * Math.PI) : 0), 0);
}

type XZ = [number, number];
const CAP_SITES: XZ[] = [[-.055, .015], [.205, .025], [.10, .20], [-.17, .15], [-.235, -.055], [-.04, -.20], [.20, -.15]];
const capHeight = (x: number, z: number) => .052 + .060 * Math.max(.02, 1 - (x / .38) ** 2 - (z / .33) ** 2)
  + .016 * Math.sin(x * 14 + z * 9) + .009 * Math.abs(Math.sin(x * 28 - z * 17))
  + .006 * Math.sin(x * 49 + z * 31) * Math.sin(z * 37 - x * 23);
const crustThickness = (x: number, z: number) => .052 + .024 * (.5 + .5 * Math.sin(x * 18 + z * 13))
  + .012 * Math.abs(Math.sin(x * 43 - z * 35));

function capCell(piece: number): XZ[] {
  let polygon: XZ[] = Array.from({ length: 27 }, (_, i) => {
    const a = i / 27 * Math.PI * 2, r = .32 * (1 + .11 * Math.sin(a * 3 + .4) + .075 * Math.cos(a * 5) + .035 * Math.sin(a * 11));
    return [Math.cos(a) * r, Math.sin(a) * r * .85];
  });
  const site = CAP_SITES[piece];
  for (const [i, other] of CAP_SITES.entries()) {
    if (i === piece) continue;
    const nx = other[0] - site[0], nz = other[1] - site[1], bound = (other[0] ** 2 + other[1] ** 2 - site[0] ** 2 - site[1] ** 2) / 2;
    const output: XZ[] = [];
    for (let j = 0; j < polygon.length; j++) {
      const a = polygon[j], b = polygon[(j + 1) % polygon.length], da = a[0] * nx + a[1] * nz - bound, db = b[0] * nx + b[1] * nz - bound;
      if (da <= 0) output.push(a);
      if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); output.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    polygon = output;
  }
  const outline: XZ[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    for (let step = 0; step < 4; step++) {
      const t = step / 4, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      // A common spatial warp makes adjacent fractures match without radial spokes.
      const wx = x + .007 * Math.sin(x * 71 + z * 43), wz = z + .006 * Math.sin(x * 53 - z * 67);
      outline.push([wx * .984 + site[0] * .016, wz * .984 + site[1] * .016]);
    }
  }
  return outline;
}

const CAP_CELLS = CAP_SITES.map((_, i) => capCell(i));
export function capAnchor(piece: number): XYZ {
  const polygon = CAP_CELLS[piece];
  const [x, z] = polygon.reduce(([x, z], p) => [x + p[0] / polygon.length, z + p[1] / polygon.length], [0, 0]);
  return [x, capHeight(x, z), z];
}

/** Unequal interlocking rind patches. The same finite solids detach and settle;
 * their quenched outside and fresh inner/fracture faces stay distinguishable. */
const crustGeometry: Array<(SolidBuffers & { fresh: Float32Array }) | undefined> = [];
export function burstCrust(piece: number): SolidBuffers & { fresh: Float32Array } {
  if (crustGeometry[piece]) return crustGeometry[piece]!;
  const outline = CAP_CELLS[piece], center = capAnchor(piece), n = outline.length, rings = 4;
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], fresh: number[] = [], count = 1 + rings * n;
  const vertex = (x: number, z: number, below: boolean, exposure: number, u: number, v: number) => {
    // The underside is uneven and slightly offset at the tear. Thickness is a
    // real geometric separation, retained during formation, flight and rest.
    positions.push(x - center[0] + (below ? .004 * Math.sin(x * 67 + z * 31) : 0),
      capHeight(x, z) - center[1] - (below ? crustThickness(x, z) : 0),
      z - center[2] + (below ? .004 * Math.sin(x * 41 - z * 59) : 0));
    fresh.push(exposure); uvs.push(u, v);
  };
  for (let side = 0; side < 2; side++) {
    vertex(center[0], center[2], !!side, side ? 1 : .005, .5, .5);
    for (let ring = 1; ring <= rings; ring++) for (let i = 0; i < n; i++) {
      const q = ring / rings, [x, z] = outline[i];
      vertex(center[0] + (x - center[0]) * q, center[2] + (z - center[2]) * q, !!side, side ? 1 : .005, .5 + (x - center[0]) * 1.4 * q, .5 + (z - center[2]) * 1.4 * q);
      const a = side * count + 1 + (ring - 1) * n + i, b = side * count + 1 + (ring - 1) * n + (i + 1) % n;
      const triangles = ring === 1 ? [side * count, b, a] : [a - n, b - n, b, a - n, b, a];
      if (side) for (let k = 0; k < triangles.length; k += 3) indices.push(triangles[k], triangles[k + 2], triangles[k + 1]); else indices.push(...triangles);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = outline[i], b = outline[(i + 1) % n], offset = positions.length / 3;
    vertex(a[0], a[1], false, .68, 0, 0); vertex(b[0], b[1], false, .68, 1, 0);
    vertex(b[0], b[1], true, 1, 1, 1); vertex(a[0], a[1], true, 1, 0, 1);
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  }
  return crustGeometry[piece] = { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices, fresh: new Float32Array(fresh) };
}

export function ventRegime(frame: OceanGeometryFrame): 'effusive' | 'explosive' {
  return frame.environment === 'shallow' || (frame.environment === 'island' && frame.history.phase === 'shallow-fragments') ? 'explosive' : 'effusive';
}

export type BurstEpisode = { index: number; born: number; start: number; duration: number; origin: XYZ; launches: XYZ[]; launchFrames: OceanGeometryFrame[]; rotation: number; dimensions: XYZ; landing: OceanGeometryFrame; rindBirth: OceanGeometryFrame; hiddenDepth: Array<number | undefined>; restSupport: Array<number | undefined>; launchSupport: Array<number | undefined> };
/** Preserve the seven shallow packet episodes and the island's own fragment
 * deposits. Depth itself never chooses whether a real volcano explodes. */
export function burstEpisodes(environment: Environment, supply: Supply): BurstEpisode[] {
  const scenarioSupply = environment === 'island' ? supply : 'sustained';
  const reference = oceanGeometryFrame(1, environment, scenarioSupply);
  const starts = environment === 'shallow' ? Array.from({ length: 7 }, (_, i) => .10 + i * .075)
    : environment === 'island' ? reference.history.units.filter(u => u.phase === 'shallow-fragments').map(u => u.start + .018) : [];
  return starts.map((start, index) => {
    const birth = oceanGeometryFrame(start, environment, scenarioSupply), duration = environment === 'shallow' ? .26 : .075;
    const born = index ? starts[index - 1] + .007 : environment === 'island' ? start - .018 : .04;
    const launchFrames = Array.from({ length: BURST_PIECES }, (_, piece) => oceanGeometryFrame(start + seed(piece, 757 + index) * .0025, environment, scenarioSupply));
    return { index, born, start, duration, origin: ventOrigin(birth),
      launches: launchFrames.map(ventOrigin), launchFrames,
      rotation: seed(index, 751) * Math.PI * 2,
      dimensions: [.66 + seed(index, 781) * .26, .62 + seed(index, 783) * .43, .65 + seed(index, 785) * .26],
      landing: oceanGeometryFrame(Math.min(1, start + duration), environment, scenarioSupply),
      rindBirth: oceanGeometryFrame(born, environment, scenarioSupply), hiddenDepth: [], restSupport: [], launchSupport: [] };
  });
}

export function burstShard(frame: OceanGeometryFrame, episode: BurstEpisode, piece: number) {
  const center = capAnchor(piece), c = Math.cos(episode.rotation), s = Math.sin(episode.rotation);
  const [sx, sy, sz] = episode.dimensions;
  const offset: XYZ = [center[0] * sx * c + center[2] * sz * s, center[1] * sy, -center[0] * sx * s + center[2] * sz * c];
  const delay = seed(piece, 757 + episode.index) * .0025, launch = episode.start + delay;
  const t = frame.p >= episode.start + episode.duration ? 1 : clamp((frame.p - launch) / (episode.duration - delay));
  const forming = ramp(frame.p, episode.born, episode.start - .004);
  const bulge = .045 * ramp(frame.p, episode.start - .012, launch);
  const origin = frame.p <= launch ? ventOrigin(frame) : episode.launches[piece];
  const angle = Math.atan2(offset[2], offset[0]) + .16 * Math.sin(piece * 2.1 + episode.index);
  const distance = 1.15 + seed(piece, 769 + episode.index) * 1.55, drag = .9 + seed(piece, 770 + episode.index) * 2.1;
  const travel = 1 - (1 - t) ** 2.3 * Math.exp(-drag * t);
  const bend = .10 * (seed(piece, 771 + episode.index) - .5) * Math.sin(Math.PI * t) ** 2;
  const x = origin[0] + offset[0] + Math.cos(angle) * distance * travel - Math.sin(angle) * bend;
  const z = origin[2] + offset[2] + Math.sin(angle) * distance * travel + Math.cos(angle) * bend;
  const contactAt = .62 + seed(piece, 772 + episode.index) * .16, flight = clamp(t / contactAt);
  const settle = clamp((t - contactAt) / (1 - contactAt)), spinDrag = .6 + seed(piece, 775 + episode.index) * 1.3;
  const spin = (1 - Math.exp(-spinDrag * flight)) / (1 - Math.exp(-spinDrag));
  const turns: XYZ = [(seed(piece, 776 + episode.index) > .5 ? 1 : -1) * (1.3 + seed(piece, 777) * 2.3),
    (piece % 2 ? -1 : 1) * (1.2 + seed(piece, 778 + episode.index) * 2),
    (seed(piece, 779) > .5 ? 1 : -1) * (.7 + seed(piece, 780 + episode.index) * 2.5)];
  const rest: XYZ = [(seed(piece, 787 + episode.index) - .5) * .95,
    episode.rotation + turns[1] + (seed(piece, 788 + episode.index) - .5) * .65,
    (seed(piece, 789 + episode.index) - .5) * .8];
  const damping = (1 - settle) ** 3, wobble = Math.sin(settle * Math.PI * (2.5 + seed(piece, 790))) * damping;
  const rotation: XYZ = t < contactAt ? [turns[0] * spin, episode.rotation + turns[1] * spin, turns[2] * spin]
    : [rest[0] + (turns[0] - rest[0]) * damping + .12 * wobble,
      rest[1] + (episode.rotation + turns[1] - rest[1]) * damping,
      rest[2] + (turns[2] - rest[2]) * damping - .09 * wobble];
  // A full-thickness, full-footprint rind emerges from below the melt and
  // quenches there. It is never compressed into a paper sheet at birth.
  let fromY = origin[1] + offset[1] + bulge - burstHiddenDepth(piece, episode) * (1 - forming);
  // Pressure lifts a newly quenched patch clear of the unequal local wall
  // before detachment. The same continuous attached pose starts the flight;
  // enforcing terrain contact only afterwards would teleport a low corner.
  const unseat = ramp(forming, .72, 1);
  if (unseat > 0) {
    const launchFrame = t === 0 ? frame : episode.launchFrames[piece];
    const atX = origin[0] + offset[0], atZ = origin[2] + offset[2];
    if (t > 0 && episode.launchSupport[piece] === undefined) episode.launchSupport[piece] = burstSupportHeight(piece,
      [0, episode.rotation, 0], episode.dimensions, atX, atZ, launchFrame, launchFrame) + .008;
    const seat = t > 0 ? episode.launchSupport[piece]! : burstSupportHeight(piece,
      [0, episode.rotation, 0], episode.dimensions, atX, atZ, launchFrame, launchFrame) + .008;
    fromY += Math.max(0, seat - fromY) * unseat;
  }
  // The same solid contacts the supporting terrain. Frozen emplacement allows
  // later deposits to bury it, while erosion can remove that support.
  if (t === 1 && episode.restSupport[piece] === undefined) episode.restSupport[piece] = burstSupportHeight(piece,
    rotation, episode.dimensions, x, z, episode.landing, episode.landing);
  const supported = t === 1 && frame.state.erosion === 0 ? episode.restSupport[piece]!
    : t === 0 ? fromY - .008 : burstSupportHeight(piece, rotation, episode.dimensions, x, z, frame, episode.landing);
  const ground = supported + .008;
  const arc = Math.sin(Math.PI * flight) ** 2 * (.7 + seed(piece, 773 + episode.index) * 1.1);
  const descent = ramp(flight, 0, 1), airY = fromY * (1 - descent) + ground * descent + arc;
  const rebound = (.024 + seed(piece, 791) * .025) * damping * Math.sin(settle * Math.PI * (2 + seed(piece, 792))) ** 2;
  const y = t === 0 ? fromY : Math.max(ground, airY) + rebound;
  return { visible: frame.p >= episode.born, detached: frame.p > launch, contact: t >= contactAt, settled: t === 1, quench: forming,
    position: [x, y, z] as XYZ, rotation,
    dimensions: [sx, sy, sz] as XYZ,
    scale: 1, heat: 1 - ramp(t, .015, .42), life: t };
}

/** The retained thick patch begins hidden under its actual birth terrain. A
 * cached piece-specific offset avoids a fixed cover depth exposing a corner
 * on a sloping flank, while all three shape dimensions remain unchanged. */
function burstHiddenDepth(piece: number, episode: BurstEpisode) {
  if (episode.hiddenDepth[piece] !== undefined) return episode.hiddenDepth[piece]!;
  const positions = burstCrust(piece).positions, center = capAnchor(piece), origin = ventOrigin(episode.rindBirth);
  const [sx, sy, sz] = episode.dimensions, c = Math.cos(episode.rotation), s = Math.sin(episode.rotation);
  let depth = .08;
  for (let i = 0; i < positions.length; i += 3) {
    const px = (center[0] + positions[i]) * sx, pz = (center[2] + positions[i + 2]) * sz;
    const x = origin[0] + px * c + pz * s, z = origin[2] - px * s + pz * c;
    depth = Math.max(depth, origin[1] + (center[1] + positions[i + 1]) * sy - surfaceHeight(episode.rindBirth, x, z) + .016);
  }
  return episode.hiddenDepth[piece] = depth;
}

/** Contact samples are the actual retained patch vertices under the renderer's
 * XYZ Euler transform. A sloping terrain is not replaced by a horizontal plane
 * at the clast centre. The seven immutable prototype buffers are prepared once. */
function burstSupportHeight(piece: number, [rx, ry, rz]: XYZ, [sx, sy, sz]: XYZ,
  x: number, z: number, frame: OceanGeometryFrame, emplacement: OceanGeometryFrame) {
  const positions = burstCrust(piece).positions, cx = Math.cos(rx), sinx = Math.sin(rx);
  const siny = Math.sin(ry), cy = Math.cos(ry), cz = Math.cos(rz), sinz = Math.sin(rz);
  const ax = cy * cz * sx, bx = -cy * sinz * sy, dx = siny * sz;
  const ay = (cx * sinz + sinx * siny * cz) * sx, by = (cx * cz - sinx * siny * sinz) * sy, dy = -sinx * cy * sz;
  const az = (sinx * sinz - cx * siny * cz) * sx, bz = (sinx * cz + cx * siny * sinz) * sy, dz = cx * cy * sz;
  let support = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const px = positions[i], py = positions[i + 1], pz = positions[i + 2];
    const wx = x + ax * px + bx * py + dx * pz, wz = z + az * px + bz * py + dz * pz;
    const terrain = frame === emplacement ? surfaceHeight(frame, wx, wz)
      : Math.min(surfaceHeight(frame, wx, wz), surfaceHeight(emplacement, wx, wz));
    support = Math.max(support, terrain - (ay * px + by * py + dy * pz));
  }
  return support;
}

export function burstFlash(frame: OceanGeometryFrame, episodes: BurstEpisode[]) {
  return episodes.reduce((flash, e) => Math.max(flash, ramp(frame.p, e.start - .009, e.start + .004) * (1 - ramp(frame.p, e.start + .004, e.start + .040))), 0);
}
