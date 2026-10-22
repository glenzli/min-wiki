import { clamp, ramp, type Environment, type Supply } from './model.ts';
import { islandVentOrigin, oceanGeometryFrame, pillowShape, seed, surfaceHeight, type OceanGeometryFrame, type SolidBuffers, type XYZ } from './geometry3d.ts';
import { islandFlowBearing } from './islandGrowth.ts';

export const LIP_PIECES = 6;
export const BURST_PIECES = 7;

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
    bearing += weight * (islandFlowBearing(unit.index) - 1.25);
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
export function ventRim(frame?: OceanGeometryFrame, episodes: BurstEpisode[] = []): SolidBuffers {
  const shape = frame ? ventMorphology(frame) : { build: 0, skew: 0, shoulder: 0, bearing: 1.25, radius: .32 };
  const origin = frame ? ventOrigin(frame) : [0, 0, 0];
  return thickPatch(5, 64, (u, v, inside) => {
    const a = v * Math.PI * 2;
    let damage = 0;
    if (frame) for (const event of episodes) {
      const angle = Math.atan2(Math.sin(a - event.rotation), Math.cos(a - event.rotation));
      damage += .10 * ramp(frame.p, event.start, event.start + .012) * Math.exp(-((angle / .5) ** 2));
    }
    const gapAngle = Math.atan2(Math.sin(a - shape.bearing), Math.cos(a - shape.bearing));
    const gap = Math.exp(-((gapAngle / .38) ** 2));
    const irregular = 1 + .10 * Math.sin(a * 3 + .4) + .045 * Math.cos(a * 7) + shape.skew * Math.sin(a * 2);
    const r = (.19 + u * shape.radius) * irregular;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * (.85 + shape.shoulder);
    const ground = frame ? surfaceHeight(frame, origin[0] + x, origin[2] + z) - origin[1] : 0;
    const relief = Math.max(.004, .065 + shape.build * .075 + .023 * Math.sin(a * 4 + u * 5)
      + shape.shoulder * Math.cos(a * 3) - damage) * (1 - gap * .92);
    const y = ground - .008 + Math.sin(u * Math.PI) * relief - (inside ? .07 : 0);
    return [x, y, z];
  });
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
const capHeight = (x: number, z: number) => .068 + .114 * Math.sqrt(Math.max(.01, 1 - (x / .38) ** 2 - (z / .33) ** 2))
  + .008 * Math.sin(x * 27 + z * 19) * Math.sin(z * 31 - x * 12);

function capCell(piece: number): XZ[] {
  let polygon: XZ[] = Array.from({ length: 56 }, (_, i) => {
    const a = i / 56 * Math.PI * 2, r = .32 * (1 + .065 * Math.sin(a * 5) + .035 * Math.cos(a * 9));
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
export function burstCrust(piece: number): SolidBuffers & { fresh: Float32Array } {
  const outline = CAP_CELLS[piece], center = capAnchor(piece), n = outline.length, rings = 4;
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], fresh: number[] = [], count = 1 + rings * n;
  const vertex = (x: number, z: number, below: boolean, exposure: number, u: number, v: number) => {
    positions.push(x - center[0], capHeight(x, z) - center[1] - (below ? .028 + .007 * Math.sin(x * 38 + z * 51) : 0), z - center[2]);
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
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices, fresh: new Float32Array(fresh) };
}

export function ventRegime(frame: OceanGeometryFrame): 'effusive' | 'explosive' {
  return frame.environment === 'shallow' || (frame.environment === 'island' && frame.history.phase === 'shallow-fragments') ? 'explosive' : 'effusive';
}

export type BurstEpisode = { index: number; born: number; start: number; duration: number; origin: XYZ; launches: XYZ[]; rotation: number; dimensions: XYZ; landing: OceanGeometryFrame };
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
    return { index, born, start, duration, origin: ventOrigin(birth),
      launches: Array.from({ length: BURST_PIECES }, (_, piece) => ventOrigin(oceanGeometryFrame(start + seed(piece, 757 + index) * .0025, environment, scenarioSupply))),
      rotation: seed(index, 751) * Math.PI * 2,
      dimensions: [.66 + seed(index, 781) * .26, .62 + seed(index, 783) * .43, .65 + seed(index, 785) * .26],
      landing: oceanGeometryFrame(Math.min(1, start + duration), environment, scenarioSupply) };
  });
}

export function burstShard(frame: OceanGeometryFrame, episode: BurstEpisode, piece: number) {
  const center = capAnchor(piece), c = Math.cos(episode.rotation), s = Math.sin(episode.rotation);
  const [sx, sy, sz] = episode.dimensions;
  const offset: XYZ = [center[0] * sx * c + center[2] * sz * s, center[1] * sy, -center[0] * sx * s + center[2] * sz * c];
  const launch = episode.start + seed(piece, 757 + episode.index) * .0025;
  const t = clamp((frame.p - launch) / episode.duration), forming = ramp(frame.p, episode.born, episode.start - .004);
  const bulge = .045 * ramp(frame.p, episode.start - .012, launch);
  const origin = frame.p <= launch ? ventOrigin(frame) : episode.launches[piece];
  const angle = Math.atan2(offset[2], offset[0]), distance = 1.15 + seed(piece, 769 + episode.index) * 1.55;
  const travel = (1 - Math.exp(-3.5 * t)) / (1 - Math.exp(-3.5));
  const x = origin[0] + offset[0] + Math.cos(angle) * distance * travel;
  const z = origin[2] + offset[2] + Math.sin(angle) * distance * travel;
  const landingY = surfaceHeight(episode.landing, episode.origin[0] + offset[0] + Math.cos(angle) * distance, episode.origin[2] + offset[2] + Math.sin(angle) * distance) + .055;
  // A full-width film rises from below the melt as it thickens and quenches.
  // It does not scale a finished black plate into the air. The next film starts
  // only after all pieces of the previous rind have left the outlet.
  const fromY = origin[1] - .060 * (1 - forming) + offset[1] * forming + bulge;
  const arc = Math.sin(Math.PI * t) * (.7 + seed(piece, 773 + episode.index) * 1.1);
  const ground = surfaceHeight(frame, x, z) + .045;
  // Settled material keeps its emplacement height; later deposits may bury it.
  const y = t === 0 ? fromY : t === 1 ? Math.min(landingY, ground) : Math.max(ground, fromY * (1 - t) + landingY * t + arc);
  return { visible: frame.p >= episode.born, detached: frame.p > launch, settled: t === 1, quench: forming,
    position: [x, y, z] as XYZ, rotation: [t * (1 + piece * .17), episode.rotation + t * (piece % 2 ? -2 : 2), t * (.8 + seed(piece, 777) * 2)] as XYZ,
    dimensions: [sx, sy * (.02 + .98 * forming), sz] as XYZ,
    scale: 1, heat: 1 - ramp(t, .015, .42), life: t };
}

export function burstFlash(frame: OceanGeometryFrame, episodes: BurstEpisode[]) {
  return episodes.reduce((flash, e) => Math.max(flash, ramp(frame.p, e.start - .009, e.start + .004) * (1 - ramp(frame.p, e.start + .004, e.start + .040))), 0);
}
