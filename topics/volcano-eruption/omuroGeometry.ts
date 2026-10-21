import { surfaceHeight, WORLD_SCALE, type XYZ } from './eruptionGeometry.ts';
import { seedDispersal } from './ecologyDispersal.ts';
import { seed } from './magmaGeometry.ts';
import { smooth } from './model.ts';
import { OMURO_DEPOSIT_LAYERS, OMURO_FORMATION_END, OMURO_FORMATION_START, OMURO_SITES, omuroFormationGrowth, omuroLayerFill, omuroSiteState, type OmuroFrame, type OmuroSite } from './omuroJourney.ts';
import { bounded } from './projectModel.ts';

export const OMURO_RADIUS = 260 * WORLD_SCALE;
export const OMURO_GROUND_RADIUS = 8.6;
export const OMURO_FIELD_SIZE = 192;
export const omuroFootprint = (growth: number) => .24 + .76 * Math.pow(bounded(growth), .72);
const LAYER_RADII = Array.from({ length: OMURO_DEPOSIT_LAYERS }, (_, layer) =>
  OMURO_RADIUS * (.24 + .76 * Math.pow(layer / (OMURO_DEPOSIT_LAYERS - 1), .72)));
export function omuroLayerRadius(layer: number) {
  return LAYER_RADII[layer];
}

/** The mature surface is exactly the eruption chapter's scoria height field.
 * Earlier units have fixed spatial supports and add nonnegative thickness;
 * they do not stretch a small copy of the finished mountain. This is an
 * illustrative accumulation history, not a deposit or mass-flow simulation. */
export function omuroSurface(x: number, z: number, growth = 1) {
  const g = bounded(growth), mature = surfaceHeight(x, z, 'scoria');
  if (g === 0) return 0;
  if (g === 1) return mature;
  const radius = Math.hypot(x, z);
  let total = 0, retained = 0;
  for (let layer = 0; layer < OMURO_DEPOSIT_LAYERS; layer++) {
    const support = omuroLayerRadius(layer);
    const weight = 1 - smooth(support * .62, support, radius);
    total += weight; retained += weight * omuroLayerFill(g, layer);
  }
  return mature * (total > 0 ? retained / total : g);
}
export function omuroSitePoint(site: OmuroSite, growth = 1): XYZ {
  const radius = site.radius * OMURO_RADIUS;
  const x = radius * Math.cos(site.angle), z = radius * Math.sin(site.angle);
  return [x, omuroSurface(x, z, growth), z];
}
export function omuroNormal(x: number, z: number, growth = 1): XYZ {
  const d = .008, dx = (omuroSurface(x + d, z, growth) - omuroSurface(x - d, z, growth)) / (2 * d);
  const dz = (omuroSurface(x, z + d, growth) - omuroSurface(x, z - d, growth)) / (2 * d);
  const length = Math.hypot(dx, 1, dz);
  return [-dx / length, 1 / length, -dz / length];
}
export function omuroTerrain(growth = 1, rings = 96, sectors = 192) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let ring = 0; ring <= rings; ring++) for (let sector = 0; sector <= sectors; sector++) {
    const radius = OMURO_GROUND_RADIUS * ring / rings, a = sector / sectors * Math.PI * 2;
    const x = radius * Math.cos(a), z = radius * Math.sin(a);
    positions.push(x, ring === rings ? 0 : omuroSurface(x, z, growth), z); uvs.push(x * .65, z * .65);
    if (ring < rings && sector < sectors) {
      const i = ring * (sectors + 1) + sector, j = i + sectors + 1;
      indices.push(i, i + 1, j, i + 1, j + 1, j);
    }
  }
  return { positions, uvs, indices };
}

/** Continuous unmeasured surroundings, outside the teaching cone. The inner
 * boundary meets the terrain at y=0, rather than placing it on a display disc. */
export function omuroSurroundings(rings = 40, sectors = 192) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let ring = 0; ring <= rings; ring++) for (let sector = 0; sector <= sectors; sector++) {
    const radius = OMURO_GROUND_RADIUS + Math.pow(ring / rings, 1.4) * 84;
    const a = sector / sectors * Math.PI * 2, x = radius * Math.cos(a), z = radius * Math.sin(a);
    const hills = Math.sin(x * .19 + .8) * Math.cos(z * .15) * .38 + Math.sin(x * .09 + z * .13) * .68;
    const y = ring === 0 ? 0 : smooth(OMURO_GROUND_RADIUS, 30, radius) * hills;
    positions.push(x, y, z); uvs.push(x * .65, z * .65);
    if (ring < rings && sector < sectors) {
      const i = ring * (sectors + 1) + sector, j = i + sectors + 1;
      indices.push(i, i + 1, j, i + 1, j + 1, j);
    }
  }
  return { positions, uvs, indices };
}

/** The exposed cut closes the retained back half. Its upper edge samples the
 * same terrain as the complete mountain; no unrelated cutaway silhouette. */
export function omuroSection(growth = 1, segments = 256) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = -OMURO_GROUND_RADIUS + i / segments * OMURO_GROUND_RADIUS * 2;
    const top = omuroSurface(x, 0, growth);
    positions.push(x, -.12, 0, x, top, 0); uvs.push(x * .6, -.12, x * .6, top);
    if (i < segments) { const k = i * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  return { positions, uvs, indices };
}

export function omuroPatches(frame: OmuroFrame) {
  return OMURO_SITES.map(site => ({ ...omuroSiteState(site, frame.ecology), point: omuroSitePoint(site, frame.landGrowth) }));
}
export type OmuroPatch = ReturnType<typeof omuroPatches>[number];

function patchWeight(x: number, z: number, patch: OmuroPatch, radius: number) {
  const dx = x - patch.point[0], dz = z - patch.point[2], a = patch.site.angle;
  const across = dx * Math.cos(a) + dz * Math.sin(a), along = -dx * Math.sin(a) + dz * Math.cos(a);
  // Fixed lobes soften the borders without moving or re-randomizing sites.
  const angle = Math.atan2(along, across);
  const lobes = 1 + .14 * Math.sin(angle * 3 + patch.site.index * 1.8) + .075 * Math.sin(angle * 7 - patch.site.index);
  const d = Math.hypot(across * 1.12, along * .88) / Math.max(.001, radius * lobes);
  return 1 - smooth(.47, 1, d);
}
export function omuroCoverAt(x: number, z: number, patches: OmuroPatch[]) {
  let bare = 1, unsoiled = 1;
  for (const patch of patches) {
    if (patch.cover > 0) bare *= 1 - patch.cover * patchWeight(x, z, patch, patch.patchRadius);
    if (patch.soil > 0) unsoiled *= 1 - patch.soil * patchWeight(x, z, patch, patch.site.patchRadius * 1.12);
  }
  return { cover: 1 - bare, soil: 1 - unsoiled };
}

/** A bounded, scene-owned raster carries local soil and vegetation into the
 * material. Rasterizing only each patch's bounding box avoids a 100-site shader
 * loop at every screen pixel. No field is cached across scene lifecycles. */
export function omuroField(patches: OmuroPatch[], size = OMURO_FIELD_SIZE, target: Uint8Array = new Uint8Array(size * size * 4)) {
  if (target.length !== size * size * 4) throw new RangeError('Omuro field buffer size mismatch');
  target.fill(0);
  const span = OMURO_GROUND_RADIUS * 2, step = span / (size - 1);
  for (const patch of patches) {
    if (patch.cover === 0 && patch.soil === 0) continue;
    const radius = patch.site.patchRadius * 1.65;
    const minX = Math.max(0, Math.floor((patch.point[0] - radius + span / 2) / step));
    const maxX = Math.min(size - 1, Math.ceil((patch.point[0] + radius + span / 2) / step));
    const minZ = Math.max(0, Math.floor((patch.point[2] - radius + span / 2) / step));
    const maxZ = Math.min(size - 1, Math.ceil((patch.point[2] + radius + span / 2) / step));
    for (let iz = minZ; iz <= maxZ; iz++) for (let ix = minX; ix <= maxX; ix++) {
      const x = ix * step - span / 2, z = iz * step - span / 2, offset = (iz * size + ix) * 4;
      const cover = patch.cover * patchWeight(x, z, patch, patch.patchRadius);
      const soil = patch.soil * patchWeight(x, z, patch, patch.site.patchRadius * 1.12);
      target[offset] = Math.round(255 - (255 - target[offset]) * (1 - cover));
      target[offset + 1] = Math.round(255 - (255 - target[offset + 1]) * (1 - soil));
    }
  }
  return target;
}

type FieldTerms = { key: string; indices: Uint32Array; lengths: Float64Array; lobes: Float64Array };
/** Scene-owned sparse spatial terms. Only scalar ecological weights vary on
 * subsequent frames. The old field function remains the numerical reference;
 * no texture, geological state or cross-scene cache is owned here. */
export class OmuroFieldProjection {
  private terms = new Map<number, FieldTerms>();
  private lastKey = '';
  private lastTarget?: Uint8Array;
  private disposed = false;
  preparations = 0;
  updates = 0;
  constructor(readonly size = OMURO_FIELD_SIZE) {
    if (!Number.isInteger(size) || size < 2 || size > OMURO_FIELD_SIZE) throw new RangeError('Omuro field size exceeds its scene budget');
  }
  get byteLength() { let bytes = 0; for (const term of this.terms.values()) bytes += term.indices.byteLength + term.lengths.byteLength + term.lobes.byteLength; return bytes; }
  update(patches: OmuroPatch[], target: Uint8Array) {
    if (this.disposed) return false;
    if (target.length !== this.size * this.size * 4 || patches.length > OMURO_SITES.length) throw new RangeError('Omuro field population/buffer exceeds its scene budget');
    const keys = patches.map(patch => `${patch.site.index}:${patch.point[0]}:${patch.point[2]}:${patch.site.angle}:${patch.site.patchRadius}`);
    const key = patches.map((patch, i) => `${keys[i]}:${patch.cover}:${patch.soil}:${patch.patchRadius}`).join('|');
    if (key === this.lastKey && target === this.lastTarget) return false;
    target.fill(0);
    for (let i = 0; i < patches.length; i++) {
      const patch = patches[i]; if (patch.cover === 0 && patch.soil === 0) continue;
      let term = this.terms.get(patch.site.index);
      if (!term || term.key !== keys[i]) {
        const span = OMURO_GROUND_RADIUS * 2, step = span / (this.size - 1), radius = patch.site.patchRadius * 1.65;
        const minX = Math.max(0, Math.floor((patch.point[0] - radius + span / 2) / step)), maxX = Math.min(this.size - 1, Math.ceil((patch.point[0] + radius + span / 2) / step));
        const minZ = Math.max(0, Math.floor((patch.point[2] - radius + span / 2) / step)), maxZ = Math.min(this.size - 1, Math.ceil((patch.point[2] + radius + span / 2) / step));
        // The authored maximum support is <64 texels across at 192px. Keep a
        // hard allocation bound even if future authored coordinates drift.
        if ((maxX - minX + 1) * (maxZ - minZ + 1) > 4096 || !Number.isInteger(patch.site.index) || patch.site.index < 0 || patch.site.index >= OMURO_SITES.length) throw new RangeError('Omuro patch exceeds its sparse field budget');
        const indices: number[] = [], lengths: number[] = [], lobes: number[] = [];
        for (let iz = minZ; iz <= maxZ; iz++) for (let ix = minX; ix <= maxX; ix++) {
          const dx = ix * step - span / 2 - patch.point[0], dz = iz * step - span / 2 - patch.point[2], a = patch.site.angle;
          const across = dx * Math.cos(a) + dz * Math.sin(a), along = -dx * Math.sin(a) + dz * Math.cos(a), angle = Math.atan2(along, across);
          const lobe = 1 + .14 * Math.sin(angle * 3 + patch.site.index * 1.8) + .075 * Math.sin(angle * 7 - patch.site.index);
          const length = Math.hypot(across * 1.12, along * .88);
          if (length >= patch.site.patchRadius * 1.12 * lobe) continue;
          indices.push((iz * this.size + ix) * 4); lengths.push(length); lobes.push(lobe);
        }
        term = { key: keys[i], indices: new Uint32Array(indices), lengths: new Float64Array(lengths), lobes: new Float64Array(lobes) };
        this.terms.set(patch.site.index, term); this.preparations++;
      }
      for (let j = 0; j < term.indices.length; j++) {
        const at = term.indices[j], length = term.lengths[j], lobe = term.lobes[j];
        const cover = patch.cover * (1 - smooth(.47, 1, length / Math.max(.001, patch.patchRadius * lobe)));
        const soil = patch.soil * (1 - smooth(.47, 1, length / Math.max(.001, patch.site.patchRadius * 1.12 * lobe)));
        target[at] = Math.round(255 - (255 - target[at]) * (1 - cover));
        target[at + 1] = Math.round(255 - (255 - target[at + 1]) * (1 - soil));
      }
    }
    this.lastKey = key; this.lastTarget = target; this.updates++; return true;
  }
  dispose() { this.terms.clear(); this.lastTarget = undefined; this.lastKey = ''; this.disposed = true; }
}

export const OMURO_BLADES_PER_SITE = 96;
/** Blade bases have immutable world sites; growth changes their height and
 * local establishment, never their positions. Each base samples the mountain. */
export function omuroBlade(site: OmuroSite, blade: number, frame: OmuroFrame) {
  const patch = omuroSiteState(site, frame.ecology), point = omuroSitePoint(site, frame.landGrowth);
  const id = site.index * OMURO_BLADES_PER_SITE + blade;
  const angle = seed(id + 8013) * Math.PI * 2, distance = Math.sqrt(seed(id + 1844)) * site.patchRadius * .88;
  const x = point[0] + Math.cos(angle) * distance, z = point[2] + Math.sin(angle) * distance;
  const growth = patch.cover * (1 - smooth(patch.patchRadius * .46, patch.patchRadius * .99, distance));
  return { id, position: [x, omuroSurface(x, z, frame.landGrowth) + .003, z] as XYZ,
    height: patch.height * (.55 + seed(id + 311) * .9) * growth,
    width: (.001 + seed(id + 330) * .002) * Math.sqrt(growth),
    angle: seed(id + 611) * Math.PI * 2, hue: seed(id + 533), growth };
}

/** A small number of seeds approach their own persistent landing sites. The
 * trajectory illustrates arrival, not a wind, dispersal or species model. */
export function omuroSeed(site: OmuroSite, frame: OmuroFrame) {
  const { cover } = omuroSiteState(site, frame.ecology), end = omuroSitePoint(site, frame.landGrowth);
  const sample = seedDispersal(site.index, frame.ecology.p, end, (x, z) => omuroSurface(x, z, frame.landGrowth));
  return { ...sample, visible: sample.visible && cover < .1 };
}

export const OMURO_CLAST_COUNT = OMURO_DEPOSIT_LAYERS * 4;
/** A small set of identifiable parcels accompanies the retained terrain beds.
 * Their count and size are explanatory, not a mountain-mass accounting. */
export function omuroClastSchedule(index: number) {
  const layer = Math.floor(index / 4), within = index % 4;
  const step = (OMURO_FORMATION_END - OMURO_FORMATION_START) / OMURO_DEPOSIT_LAYERS;
  const impact = OMURO_FORMATION_START + layer * step + .003 + within * .003;
  const flight = .023 + seed(index + 2193) * .006;
  const angle = seed(index + 411) * Math.PI * 2;
  const radius = omuroLayerRadius(layer) * (.42 + seed(index + 77) * .47);
  const size = .033 + seed(index + 371) * .019;
  return { index, layer, birth: impact - flight, impact, flight, angle, radius, size };
}
export function omuroClast(index: number, progress: number) {
  const parcel = omuroClastSchedule(index), p = bounded(progress);
  const u = bounded((p - parcel.birth) / parcel.flight);
  const launch = [0, omuroSurface(0, 0, omuroFormationGrowth(parcel.birth)) + .045, 0] as XYZ;
  const x = parcel.radius * Math.cos(parcel.angle), z = parcel.radius * Math.sin(parcel.angle);
  const landing = [x, omuroSurface(x, z, omuroFormationGrowth(parcel.impact)) + parcel.size * .65, z] as XYZ;
  const arc = .85 + seed(index + 3111) * .48;
  const position: XYZ = u === 1 ? [...landing] : [x * u,
    launch[1] * (1 - u) + landing[1] * u + 4 * u * (1 - u) * arc, z * u];
  const settled = p >= parcel.impact;
  const buried = settled && omuroSurface(x, z, omuroFormationGrowth(p)) > landing[1] + parcel.size * .5;
  const heat = settled ? .35 * (1 - smooth(parcel.impact, parcel.impact + .006, p)) : .72 + .28 * (1 - u);
  return { ...parcel, launch, landing, position, settled, buried,
    // Representative parcels receive a bounded display magnification while
    // being tracked. This changes neither path nor retained terrain thickness;
    // the easing is a visual aid, not cooling-induced physical shrinkage.
    displayScale: 2.8 - 1.2 * smooth(parcel.impact, parcel.impact + .012, p),
    visible: p >= parcel.birth && !buried, heat: p >= parcel.birth ? heat : 0 };
}
