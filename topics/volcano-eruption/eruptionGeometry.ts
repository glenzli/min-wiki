import { landSurface, type Landform } from './projectModel.ts';
import { seed } from './magmaGeometry.ts';
import { activity, clastPosition, clastTrajectory, emissionSlot, eruptionAppearance, flowBranches, smooth, CLAST_BUDGET, type Settings } from './model.ts';
import { magmaState } from './magmaSystem.ts';

/** Display coordinates, not metres. The radial profile comes from the same
 * topic-owned landform as the earlier sections; relief is illustrative. */
export const WORLD_SCALE = .02;
export const ROCK_RADIUS = 8.6;
export const ROCK_BOTTOM = -3.25;
export type XYZ = [number, number, number];
export const sectionPoint = ([x, y]: [number, number], z = .025): XYZ => [x * WORLD_SCALE, (115 - y) * WORLD_SCALE, z];

function reliefNoise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(0, 1, x - ix), fz = smooth(0, 1, z - iz);
  const a = seed(ix * 157 + iz * 311), b = seed((ix + 1) * 157 + iz * 311);
  const c = seed(ix * 157 + (iz + 1) * 311), d = seed((ix + 1) * 157 + (iz + 1) * 311);
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}

export function surfaceHeight(x: number, z: number, kind: Landform = 'scoria') {
  const radius = Math.hypot(x, z), angle = Math.atan2(z, x);
  const warp = 1 + .035 * Math.sin(angle * 3 + .8) + .022 * Math.cos(angle * 5);
  const r = radius / warp;
  const profile = (426 - landSurface(500 + r / WORLD_SCALE, kind, 1)) * .75 * WORLD_SCALE;
  // Fixed drainage grooves and crags, fading out inside the crater and at the
  // edge. Neither camera movement nor playback changes this spatial field.
  const envelope = smooth(.7, 1.6, radius) * (1 - smooth(6.8, ROCK_RADIUS, radius));
  const grooves = Math.pow(.5 + .5 * Math.sin(angle * 31 + reliefNoise(x * 1.8, z * 1.8) * 5 + Math.sin(angle * 9)), 6);
  const relief = (.17 * (reliefNoise(x * 3.7, z * 3.7) - .5)
    + .07 * (reliefNoise(x * 12, z * 12) - .5) - grooves * .09 * smooth(.1, 1.2, profile)) * envelope;
  const plain = .045 * Math.sin(x * 1.5 + .7) * Math.cos(z * 1.8) * smooth(2.5, 5.8, radius) * envelope;
  return Math.max(-.07, profile + relief + plain);
}

export function terrainBuffers(kind: Landform, rings = 112, sectors = 224) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= sectors; j++) {
    const r = ROCK_RADIUS * i / rings, angle = j / sectors * Math.PI * 2;
    const x = r * Math.cos(angle), z = r * Math.sin(angle);
    positions.push(x, surfaceHeight(x, z, kind), z); uvs.push(x * .24, z * .24);
    if (i < rings && j < sectors) {
      const a = i * (sectors + 1) + j, b = a + sectors + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return { positions, uvs, indices };
}

/** Grounded ballistic fragments. Each launch samples the same height field as
 * the visible mountain; its first intersection is retained as a deposit. */
export function fragmentSchedule(settings: Settings) {
  const kind = settings.landform ?? 'scoria', appearance = eruptionAppearance(settings);
  return Array.from({ length: CLAST_BUDGET }, (_, index) => {
    const slot = emissionSlot(index, settings.vents), x = slot.x * WORLD_SCALE;
    const angle = seed(index + 81) * Math.PI * 2;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const speed = (18 + seed(index + 820) * (53 + settings.viscosity * 16)) * appearance.clastSpread;
    const rise = (14 + settings.gas * (145 - settings.viscosity * 55))
      * (.45 + .55 * appearance.supply) * (.45 + seed(index + 980) * .58) * activity(slot.birth) * appearance.clastRise;
    const terrain = (distance: number) => 115 - surfaceHeight(x + dx * distance * WORLD_SCALE, dz * distance * WORLD_SCALE, kind) / WORLD_SCALE;
    return { birth: slot.birth, x, dx, dz,
      active: appearance.strength > 0 && settings.gas >= .06
        && seed(index + 12000) <= settings.gas * (.4 + .6 * appearance.supply) * appearance.clastActivity,
      radius: (.8 + seed(index + 200) * 2.1) * WORLD_SCALE,
      trajectory: clastTrajectory(0, speed, rise, terrain),
    };
  });
}
export type Fragment = ReturnType<typeof fragmentSchedule>[number];
export function fragmentAt(fragment: Fragment, surfaceClock: number) {
  const elapsed = (surfaceClock - fragment.birth) * 24;
  const point = clastPosition(fragment.trajectory, elapsed);
  return { visible: fragment.active && elapsed >= 0,
    position: [fragment.x + fragment.dx * point.x * WORLD_SCALE, (115 - point.y) * WORLD_SCALE, fragment.dz * point.x * WORLD_SCALE] as XYZ,
    landed: point.landed, afterImpact: point.afterImpact };
}

const basins = new Map<Landform, { floor: number; rim: number; radius: number }>();
export function craterBasin(kind: Landform) {
  if (basins.has(kind)) return basins.get(kind)!;
  const floor = surfaceHeight(0, 0, kind);
  let rim = floor, radius = .2;
  for (let i = 0; i <= 120; i++) {
    const x = i / 120 * 1.8, height = surfaceHeight(x, 0, kind);
    if (height > rim) { rim = height; radius = x; }
  }
  const basin = { floor, rim, radius }; basins.set(kind, basin); return basin;
}
export function craterLevel(clock: number, settings: Settings) {
  const { floor, rim } = craterBasin(settings.landform ?? 'scoria');
  return floor + .035 + (rim - floor) * smooth(.26, .43, clock);
}

/** The crater fills before a central flow overtops its rim. Front positions
 * are deterministic, reversible, and remain on the terrain after cooling. */
export function lavaBranches(settings: Settings) {
  return flowBranches(settings.vents).map((branch, i) => ({ ...branch, x: branch.x * WORLD_SCALE,
    angle: branch.direction > 0 ? .30 * Math.PI : 1.16 * Math.PI,
    phase: seed(i + 35) * 5,
  }));
}
export function lavaRibbon(clock: number, settings: Settings, branch: ReturnType<typeof lavaBranches>[number], segments = 100, across = 10) {
  const appearance = eruptionAppearance(settings), kind = settings.landform ?? 'scoria';
  const growth = smooth(.42, .82, clock);
  const length = growth * (3.6 + (1 - settings.viscosity) * 3.5) * Math.sqrt(branch.share)
    * (.24 + .76 * appearance.lava) * (.5 + .65 * appearance.supply) * appearance.lavaSpread;
  const breadth = (.30 + settings.viscosity * .28) * Math.sqrt(branch.share) * (.6 + .4 * appearance.supply) * appearance.lavaWidth;
  const pond = craterLevel(clock, settings), pondRadius = craterBasin(kind).radius;
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, distance = u * length;
    const bend = Math.sin(distance * 1.5 + branch.phase) * .1 * (1 - Math.exp(-distance)) + Math.sin(distance * 4) * .035;
    const centerX = branch.x + Math.cos(branch.angle) * distance - Math.sin(branch.angle) * bend;
    const centerZ = Math.sin(branch.angle) * distance + Math.cos(branch.angle) * bend;
    const noseLength=Math.max(.04,breadth*.95);
    const nose = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (distance-length+noseLength) / noseLength), 2)));
    for (let j = 0; j <= across; j++) {
      const v = j / across;
      const width = breadth * (.70 + .35 * reliefNoise(distance * 4.6, v * 4 + branch.phase)
        + .15 * reliefNoise(distance * 15, v * 8)) * nose;
      const lateral = (v - .5) * width * 2;
      const x = centerX - Math.sin(branch.angle) * lateral, z = centerZ + Math.cos(branch.angle) * lateral;
      const ground = surfaceHeight(x, z, kind);
      const y = Math.max(ground, branch.x === 0 && Math.hypot(x, z) < pondRadius ? pond : ground)
        + .008 + Math.sin(v * Math.PI) * nose * (.024 + .018 * reliefNoise(distance * 9 + branch.phase, v * 9)
          + .012 * reliefNoise(distance * 26, v * 21));
      positions.push(x, y, z); uvs.push(distance, v);
      if (i < segments && j < across) {
        const a = i * (across + 1) + j, b = a + across + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  // A normalized source weight accompanies geometry. It is not a measured or
  // conserved volume flux; retained cooled ribbons do not disappear with it.
  const flux = appearance.lavaFlux * appearance.lava * appearance.supply * branch.share * activity(clock);
  return { visible: appearance.strength > 0 && growth > .0005, positions, uvs, indices, length, flux };
}

/** A bounded population of advected ash parcels. This is a visual density
 * field, not a fluid solver. Emitted parcels continue rising as supply wanes. */
export function ashParcels(clock: number, settings: Settings) {
  const appearance = eruptionAppearance(settings), kind = settings.landform ?? 'scoria';
  const summit = surfaceHeight(0, 0, kind);
  const parcels = Array.from({ length: 12 }, (_, i) => {
    const birth = .275 + i / 11 * .57, age = (clock - birth) * 2.1;
    const alive = age > 0 && age < 1.35;
    const u = Math.max(0, age);
    const spread = smooth(.08, .8, u);
    const radius = (.52 + u * 2.7) * (.82 + seed(i + 330) * .3) * (.65 + .35 * appearance.supply);
    return { position: [u * u * 2.8 + (seed(i + 86) - .5) * spread * 1.3,
      summit + .12 + 6.4 * Math.pow(u, .78) * appearance.ashHeight,
      (seed(i + 53) - .5) * spread * 1.6] as XYZ,
      radius: alive ? radius * appearance.ashRadius : 0,
      axes: [1, 1 / (1.05 + .13 * Math.sin(i * 2.7)), 1] as XYZ, source: false,
      density: alive ? appearance.ash * activity(birth) * smooth(0, .045, u) * (1 - smooth(.94, 1.35, u)) * appearance.ashDensity : 0,
    };
  });
  // The not-yet-emitted final slot depicts the continuous near-vent portion.
  // This only redistributes existing normalized optical weight; it is not a
  // new packet, conserved physical volume, or a source after emission ends.
  const source = smooth(.275, .305, clock) * (1 - smooth(.82, .845, clock)) * activity(clock);
  const available = parcels.reduce((sum, parcel) => sum + parcel.density, 0);
  const weight = available * source * .25;
  if (weight > 1e-8) {
    for (const parcel of parcels) parcel.density *= 1 - source * .25;
    // Anchor the core inside a young, already emitted billow. An envelope
    // barely touching its lower edge can be completely removed by erosion.
    // The short rise is sampled from this same finite emission schedule.
    let guideWeight = 1e-5, guideY = (summit + .5 * appearance.ashHeight) * guideWeight;
    for (let i = 0; i < 11; i++) {
      const age = (clock - (.275 + i / 11 * .57)) * 2.1, parcel = parcels[i];
      const guide = parcel.density * Math.exp(-(((age - .24) / .10) ** 2));
      guideY += (parcel.position[1] + parcel.radius * parcel.axes[1] * .65) * guide;
      guideWeight += guide;
    }
    const head = guideY / guideWeight;
    const foot = summit - .02, halfHeight = Math.max(.03, (head - foot) / 2), radius = .22 * appearance.ashRadius;
    parcels[11] = { position: [0, foot + halfHeight, 0], radius,
      axes: [1, halfHeight / Math.max(.001, radius), 1], source: true, density: weight };
  }
  return parcels;
}

export function eruptionFrame(progress: number, settings: Settings) {
  const mechanism = magmaState(progress, settings), clock = mechanism.surfaceClock;
  const strength = eruptionAppearance(settings).strength;
  const intensity = mechanism.connected && strength > 0 ? activity(clock) : 0;
  return { mechanism, clock, intensity, strength, relativeIntensity: intensity * strength,
    lavaVisible: mechanism.connected && strength > 0 && clock > .42,
    ash: mechanism.connected ? ashParcels(clock, settings) : [],
  };
}
