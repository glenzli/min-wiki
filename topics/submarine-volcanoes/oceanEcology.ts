import { clamp, pillowState, ramp, type Environment } from './model.ts';
import { depositBuffers, oceanGeometryFrame, RADIUS, seed, surfaceHeight, updateDeposit, WATER_Y, type OceanGeometryFrame, type XYZ } from './geometry3d.ts';
import { pillowFlow, pillowFlowBuffers, updatePillowFlow } from './pillowFlow.ts';
import { ISLAND_CLASTS, islandClast } from './surfaceClasts.ts';

export type OceanEcologyCase = 'bare' | 'suitable';
export const MARINE_ECOLOGY_SITES = 16;
export const ISLAND_ECOLOGY_SITES = 20;
export const ECOLOGY_PATCH_SECTORS = 16;
export const ECOLOGY_PATCH_RINGS = 3;
export const ECOLOGY_PATCH_VERTICES = 1 + ECOLOGY_PATCH_SECTORS * ECOLOGY_PATCH_RINGS;
export const ECOLOGY_SURFACE_LIFT = .006;
export const ECOLOGY_ANIMAL_LIFT = .0008;

/** Geographic sites, not a population or a calibrated succession clock. The
 * selected marine case adds diffuse-vent conditions; it does not infer vents
 * from dark lava, water depth, or the eruption's remaining particle plume.
 * NOAA NeMO: /eoi/nemo/explorer/concepts/colonization.html and report98.html.
 * The island case selects small moisture/soil-retaining cracks, following
 * USGS, "From lava flow to forest: Primary succession". No calendar is used. */
export type OceanEcologySite = {
  index: number;
  habitat: 'marine' | 'land';
  position: XYZ;
  normal: XYZ;
  animalPosition: XYZ;
  animalNormal: XYZ;
  animalSize: number;
  radius: number;
  angle: number;
  patch: XYZ[];
  outline: XYZ[];
  flowIndex: number;
  crust: number;
  coreHeat: number;
  film: number;
  animal: number;
  soil: number;
  seedling: number;
};

export type OceanEcologyState = {
  p: number;
  conditions: OceanEcologyCase;
  visible: boolean;
  /** Counts of visible sites; each site's corresponding field is its 0..1 pose. */
  film: number;
  animal: number;
  soil: number;
  seedling: number;
  sites: OceanEcologySite[];
  /** Stable geographic site selected for the observation camera, -1 if empty. */
  focusSite: number;
  focus: XYZ;
  focusWeight: number;
};

type RockSample = { height: number; flowIndex: number };
type SiteTemplate = Omit<OceanEcologySite, 'crust' | 'coreHeat' | 'film' | 'animal' | 'soil' | 'seedling'>;
const PATCH_RADII = [.34, .68, 1];

function patchAt(index: number, x: number, z: number, radius: number, surface: (x: number, z: number) => number,
  film?: { angle: number; width: number }) {
  const points: XYZ[] = [[x, surface(x, z) + ECOLOGY_SURFACE_LIFT, z]];
  const angle = film?.angle ?? seed(index, 1188) * Math.PI * 2;
  const phase = seed(index, 1102) * Math.PI * 2;
  for (const r of PATCH_RADII) for (let sector = 0; sector < ECOLOGY_PATCH_SECTORS; sector++) {
    const a = sector / ECOLOGY_PATCH_SECTORS * Math.PI * 2;
    const irregular = seed(index * ECOLOGY_PATCH_SECTORS + sector, 1107);
    // Broad correlated bends give a broken strip an uneven natural margin;
    // independent full-amplitude sector noise would create a radial star.
    const edge = film ? .68 + .13 * Math.sin(a * 2 + phase) + .10 * Math.sin(a * 3 - phase) + irregular * .09
      : .79 + irregular * .21;
    const dx = Math.cos(a) * radius * r * edge;
    const dz = Math.sin(a) * radius * r * edge * (film?.width ?? .76)
      + (film ? Math.sin(a * 3 + index) * radius * r * .055 : 0);
    const px = x + dx * Math.cos(angle) - dz * Math.sin(angle);
    const pz = z + dx * Math.sin(angle) + dz * Math.cos(angle);
    points.push([px, surface(px, pz) + ECOLOGY_SURFACE_LIFT, pz]);
  }
  return points;
}

function surfaceNormal(surface: (x: number, z: number) => number, x: number, z: number): XYZ {
  const d = .012, dx = (surface(x + d, z) - surface(x - d, z)) / (2 * d);
  const dz = (surface(x, z + d) - surface(x, z - d)) / (2 * d), norm = Math.hypot(dx, 1, dz);
  return [-dx / norm, 1 / norm, -dz / norm];
}

/** The displayed deep terrain and all fourteen completed extrusion envelopes.
 * Only one bounded template is retained; progress seeks never accumulate
 * snapshots. All lobes have finished emplacing before the ecology interval.
 * A patch uses the topmost surviving surface, including later burial. */
let deepTemplates: SiteTemplate[] | undefined;
function prepareDeepSites() {
  if (deepTemplates) return deepTemplates;
  const frame = oceanGeometryFrame(1, 'deep', 'sustained');
  const flows = Array.from({ length: 14 }, (_, i) => pillowFlow(frame, i));
  const rockAt = deepSkinSampler(frame);
  const surface = (x: number, z: number) => rockAt(x, z).height;
  const flowsAt = [0, 2, 4, 6, 8, 10, 12, 13];
  deepTemplates = Array.from({ length: MARINE_ECOLOGY_SITES }, (_, index) => {
    const flow = flows[flowsAt[Math.floor(index / 2)]];
    const station = (index % 2 ? .57 : .23) + seed(index, 1411) * (index % 2 ? .23 : .29);
    const rowIndex = Math.round(station * (flow.rows.length - 1)), row = flow.rows[rowIndex];
    const before = flow.rows[rowIndex - 1], after = flow.rows[rowIndex + 1];
    const angle = Math.atan2(after.center[2] - before.center[2], after.center[0] - before.center[0])
      + (seed(index, 1427) - .5) * .5;
    const across = (seed(index, 1421) - .5) * row.width * .95;
    const x = row.center[0] + row.across[0] * across, z = row.center[2] + row.across[1] * across;
    const radius = .065 + Math.pow(seed(index, 1129), 1.55) * .145;
    const patch = patchAt(index, x, z, radius, surface, { angle, width: .18 + seed(index, 1431) * .12 });
    // The grazer is a separate attached animal near a film margin, not a round
    // central ornament. Its own contact point also participates in heat gating.
    const side = index % 3 ? 1 : -1, along = (seed(index, 1441) - .5) * radius * .65;
    const lateral = side * radius * (.42 + seed(index, 1447) * .27);
    const ax = x + Math.cos(angle) * along - Math.sin(angle) * lateral;
    const az = z + Math.sin(angle) * along + Math.cos(angle) * lateral;
    // Film needs a larger depth-fighting offset than a volumetric animal.
    // Reusing that offset would visibly suspend a tiny foot above the rock.
    const animalPosition: XYZ = [ax, surface(ax, az) + ECOLOGY_ANIMAL_LIFT, az];
    return { index, habitat: 'marine', position: [...patch[0]] as XYZ, normal: surfaceNormal(surface, x, z),
      animalPosition, animalNormal: surfaceNormal(surface, ax, az), animalSize: .026 + seed(index, 1453) * .018,
      radius, angle: seed(index, 1151) * Math.PI * 2, patch,
      outline: patch.slice(1 + (ECOLOGY_PATCH_RINGS - 1) * ECOLOGY_PATCH_SECTORS),
      flowIndex: Math.max(rockAt(ax, az).flowIndex, ...patch.map(p => rockAt(p[0], p[2]).flowIndex)) };
  });
  return deepTemplates;
}

/** One temporary projection of the actual displayed triangles, including
 * subsequent burial. Sampling the analytic envelope instead would float a mat
 * above polygonal ridges. The 32x32 bins and triangle buffers are discarded
 * once the sixteen fixed patches have been prepared; no seek cache grows. */
function deepSkinSampler(frame: OceanGeometryFrame) {
  type Triangle = { p: Float32Array; a: number; b: number; c: number; determinant: number; flowIndex: number };
  const bins: Triangle[][] = Array.from({ length: 32 * 32 }, () => []);
  const cell = (p: number) => Math.max(0, Math.min(31, Math.floor((p + RADIUS) / (RADIUS * 2) * 32)));
  const add = (p: Float32Array, indices: number[], flowIndex: number) => {
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      const determinant = (p[b + 2] - p[c + 2]) * (p[a] - p[c]) + (p[c] - p[b]) * (p[a + 2] - p[c + 2]);
      if (Math.abs(determinant) < 1e-12) continue;
      const triangle = { p, a, b, c, determinant, flowIndex };
      const x0 = cell(Math.min(p[a], p[b], p[c])), x1 = cell(Math.max(p[a], p[b], p[c]));
      const z0 = cell(Math.min(p[a + 2], p[b + 2], p[c + 2])), z1 = cell(Math.max(p[a + 2], p[b + 2], p[c + 2]));
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) bins[z * 32 + x].push(triangle);
    }
  };
  const terrain = depositBuffers(); updateDeposit(terrain.positions, frame, -1); add(terrain.positions, terrain.indices, -1);
  for (let i = 0; i < 14; i++) {
    const data = pillowFlowBuffers(); updatePillowFlow(data, pillowFlow(frame, i)); add(data.positions, data.indices, i);
  }
  return (x: number, z: number): RockSample => {
    let height = Number.NEGATIVE_INFINITY, flowIndex = -1;
    for (const triangle of bins[cell(z) * 32 + cell(x)]) {
      const { p, a, b, c, determinant } = triangle;
      const u = ((p[b + 2] - p[c + 2]) * (x - p[c]) + (p[c] - p[b]) * (z - p[c + 2])) / determinant;
      if (u < -1e-7 || u > 1.0000001) continue;
      const v = ((p[c + 2] - p[a + 2]) * (x - p[c]) + (p[a] - p[c]) * (z - p[c + 2])) / determinant;
      if (v < -1e-7 || u + v > 1.0000001) continue;
      const y = u * p[a + 1] + v * p[b + 1] + (1 - u - v) * p[c + 1];
      if (y > height) { height = y; flowIndex = triangle.flowIndex; }
    }
    return { height, flowIndex };
  };
}

// Eight selected soil pockets on the reconstruction's actual inner ledges,
// followed by thin ridges, walls and coastal controls. These are authored local
// habitats, not a rule that all volcanic surfaces at a given slope retain soil.
// Sites stay geographic when supply, viewpoint or teaching progress changes.
const LAND_SITES: [number, number][] = [
  [-.36, .64], [-.12, .65], [.12, .64], [.36, .66], [-.34, .86],
  [-.08, .85], [.18, .86], [.37, .85], [-.70, 0], [-.43, 0],
  [-.16, 0], [.14, 0], [.41, 0], [.66, 0], [-.35, -.98],
  [.25, -1.03], [-.20, .37], [.20, .37], [1.55, .30], [-1.65, .10],
];
const landSiteRadius = (index: number) => .073 + seed(index, 1209) * .018;

/** Static reserved footprints for illustrative background stones only. It
 * never depends on progress or the ecology selector, so choosing a later
 * habitat cannot make rocks disappear. Actual deposits and flows are intact. */
export function oceanEcologyClearance(x: number, z: number, margin = 0, environment?: Environment) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || environment === 'shallow') return false;
  const gap = Number.isFinite(margin) ? Math.max(0, margin) : 0;
  if (environment !== 'island' && prepareDeepSites().some(site =>
    Math.hypot(x - site.position[0], z - site.position[2]) < site.radius + gap
    || (site.index % 2 === 0 && Math.hypot(x - site.animalPosition[0], z - site.animalPosition[2])
      < site.animalSize * 1.05 + gap))) return true;
  return environment !== 'deep' && LAND_SITES.some(([px, pz], index) =>
    Math.hypot(x - px, z - pz) < landSiteRadius(index) + gap);
}

function landSites(frame: OceanGeometryFrame): OceanEcologySite[] {
  const surface = (x: number, z: number) => surfaceHeight(frame, x, z);
  const settled = !frame.history.adding && frame.state.activity < .001;
  const clasts = Array.from({ length: ISLAND_CLASTS }, (_, i) => islandClast(frame, i)).filter(c => c.visible);
  return LAND_SITES.map(([x, z], index) => {
    const radius = landSiteRadius(index);
    const patch = patchAt(index + 100, x, z, radius, surface);
    const normal = surfaceNormal(surface, x, z);
    // The entire footprint must be dry. This display clearance has no claim to
    // be a biological elevation threshold, tide range or measured soil depth.
    const dry = ramp(Math.min(...patch.map(p => p[1])) - ECOLOGY_SURFACE_LIFT - WATER_Y, .03, .14);
    // Source-linked fragments keep their complete emplacement history. A
    // candidate covered by one is unsuitable; no real clast is moved or culled.
    const blocked = clasts.some(c => Math.hypot(x - c.position[0], z - c.position[2])
      < radius + Math.hypot(...c.dimensions));
    // A model-specific geometry guard keeps these selected fine-soil pockets
    // off wall faces and section-blend seams across their whole footprint. It
    // is not a universal biological slope threshold or a soil-stability solver.
    const pocket = index < 8 && patch.every(p => surfaceNormal(surface, p[0], p[2])[1] > .82);
    const retention = index % 5 === 4 || blocked || !pocket ? 0 : .74 + seed(index, 1218) * .26;
    const cooled = settled ? ramp(frame.state.cooling, .60, .95) : 0;
    const soil = dry * retention * cooled * ramp(frame.p, .86, .97);
    const seedling = ramp(frame.p, .94, 1) * ramp(soil, .35, .78) * (.63 + seed(index, 1221) * .37);
    return { index, habitat: 'land', position: [...patch[0]] as XYZ, normal,
      animalPosition: [...patch[0]] as XYZ, animalNormal: [...normal] as XYZ, animalSize: 0,
      radius, angle: seed(index, 1241) * Math.PI * 2, patch,
      outline: patch.slice(1 + (ECOLOGY_PATCH_RINGS - 1) * ECOLOGY_PATCH_SECTORS), flowIndex: -1,
      crust: cooled, coreHeat: 1 - frame.state.cooling, film: 0, animal: 0, soil, seedling };
  });
}

export function oceanEcology(frame: OceanGeometryFrame, conditions: OceanEcologyCase = 'bare'): OceanEcologyState {
  const state: OceanEcologyState = { p: frame.p, conditions, visible: false, film: 0, animal: 0, soil: 0, seedling: 0,
    sites: [], focusSite: -1, focus: [0, 0, 0], focusWeight: 0 };
  if (conditions !== 'suitable' || frame.p < .82 || frame.environment === 'shallow') return state;
  if (frame.environment === 'deep') {
    state.sites = prepareDeepSites().map(site => {
      const local = site.flowIndex >= 0 ? pillowState(frame.p, site.flowIndex) : undefined;
      const crust = local?.crust ?? frame.state.cooling, coreHeat = local?.coreHeat ?? 1 - frame.state.cooling;
      const cold = local ? (1 - ramp(coreHeat, .005, .055)) * ramp(crust, .985, 1)
        : ramp(frame.state.cooling, .60, .95);
      const submerged = Math.max(...site.patch.map(p => p[1])) < WATER_Y - .05;
      const film = submerged ? cold * ramp(frame.p, .84 + seed(site.index, 1267) * .035, .97) : 0;
      const animal = site.index % 2 === 0 ? ramp(frame.p, .945, 1) * ramp(film, .35, .88) : 0;
      return { ...site, crust, coreHeat, film, animal, soil: 0, seedling: 0 };
    });
  } else if (frame.state.emerged && frame.supply === 'sustained') {
    state.sites = landSites(frame);
  }
  for (const site of state.sites) for (const key of ['film', 'animal', 'soil', 'seedling'] as const) {
    if (site[key] > .01) state[key]++;
  }
  state.visible = state.film + state.animal + state.soil + state.seedling > 0;
  if (state.visible) {
    // A stable selected patch gives the existing close camera a real target.
    // It remains a geographic site, never a separate ecosystem or timer.
    const target = state.sites.find(s => s.index === (frame.environment === 'deep' ? 4 : 5)
      && s.film + s.soil > .01) ?? state.sites.find(s => s.film + s.soil > .01)!;
    state.focusSite = target.index;
    state.focus = [...target.position];
    state.focusWeight = clamp(target.film + target.soil);
  }
  return state;
}
