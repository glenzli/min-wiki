import {
  METAL_MASS_G, METAL_VOLUME_ML, metalDimensions,
  metalDisplacementMl, metalDraftForDisplacement,
} from './metalGeometry';

export type JourneyChapter = 'shore' | 'water' | 'pressure' | 'metal';
export type JourneyObject = 'log' | 'stone' | 'coin' | 'boat';
export type PressureLens = 'whole' | 'micro';
export interface JourneySettings {
  chapter: JourneyChapter; object: JourneyObject; progress: number;
  lens: PressureLens; cargo: number; salt: boolean;
}
export interface JourneyFrame {
  settings: JourneySettings;
  kind: JourneyObject | 'metal';
  beat: string;
  waterY: number;
  floorY: number;
  body: {
    bottom: number; width: number; height: number; depth: number;
    tilt: number; form: number; opacity: number;
  };
  parcel: { opacity: number; weightN: number; massG: number };
  hydro: {
    massG: number; solidVolumeMl: number; displacedMl: number; displacedMassG: number;
    capacityMl: number; density: number; floating: boolean; flooded: boolean;
    submergedFraction: number;
  };
  forces: { buoyancy: number; weight: number; support: number };
  /** Water-to-material replacement fraction; other chapters use zero. */
  comparison: number;
}

export const DEFAULT_JOURNEY: JourneySettings = {
  chapter: 'shore', object: 'log', progress: 0, lens: 'whole', cargo: 0, salt: false,
};
/** Authored observation times, in seconds; these are not calibrated physical durations. */
export const CHAPTER_DURATION: Record<JourneyChapter, number> = {
  shore: 18, water: 24, pressure: 24, metal: 38,
};

const WATER_Y = 0;
const FLOOR_Y = -2.2;
const GRAVITY = 9.81;
const CARGO_MASS_G = 100;
const CARGO_VOLUME_ML = 40;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const smooth = (value: number) => value * value * (3 - 2 * value);
const phase = (progress: number, start: number, end: number) => smooth(clamp((progress - start) / (end - start), 0, 1));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

const SPECIMENS = {
  log: { massG: 300, volumeMl: 600, width: 2.6, height: 0.72, depth: 0.8 },
  stone: { massG: 500, volumeMl: 200, width: 1.1, height: 0.85, depth: 0.8 },
  // The coin is visually enlarged. Its displayed dimensions are not a volume scale.
  coin: { massG: 7.8, volumeMl: 1, width: 1.3, height: 0.12, depth: 1.3 },
} as const;

function normalize(settings: JourneySettings): JourneySettings {
  return {
    chapter: ['shore', 'water', 'pressure', 'metal'].includes(settings.chapter) ? settings.chapter : 'shore',
    object: ['log', 'stone', 'coin', 'boat'].includes(settings.object) ? settings.object : 'log',
    progress: clamp(finite(settings.progress), 0, 1),
    lens: settings.lens === 'micro' ? 'micro' : 'whole',
    cargo: clamp(Math.round(finite(settings.cargo)), 0, 8),
    salt: Boolean(settings.salt),
  };
}

/** Geometric immersion fractions for the topic's simple specimen envelopes. */
function specimenFraction(kind: Exclude<JourneyObject, 'boat'>, depthFraction: number) {
  const fraction = clamp(depthFraction, 0, 1);
  if (kind === 'coin') return fraction;
  if (kind === 'stone') return fraction * fraction * (3 - 2 * fraction);
  const ordinate = 1 - 2 * fraction;
  return (Math.acos(ordinate) - ordinate * Math.sqrt(Math.max(0, 1 - ordinate * ordinate))) / Math.PI;
}

function specimenDraft(kind: Exclude<JourneyObject, 'boat'>, volumeFraction: number) {
  let lower = 0, upper = 1;
  for (let iteration = 0; iteration < 48; iteration++) {
    const middle = (lower + upper) / 2;
    if (specimenFraction(kind, middle) < volumeFraction) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2 * SPECIMENS[kind].height;
}

/**
 * Samples an authored trajectory and its current hydrostatics. There is no hidden
 * integration clock: seeking backwards and sampling the same settings are exact.
 * Motion/forming are teaching interpolations, not fluid or material mechanics.
 */
export function sampleJourney(input: JourneySettings): JourneyFrame {
  const settings = normalize(input);
  const { chapter, object, progress } = settings;
  const density = settings.salt ? 1.025 : 1;
  const kind = chapter === 'metal' ? 'metal' : object;
  const metal = kind === 'metal' || kind === 'boat';
  let form = kind === 'boat' ? 1 : 0;
  if (chapter === 'metal') {
    form = progress < 0.43 ? 0.5 * phase(progress, 0.27, 0.43)
      : 0.5 + 0.5 * phase(progress, 0.43, 0.63);
  }
  const dimensions = metal ? metalDimensions(form) : SPECIMENS[object as keyof typeof SPECIMENS];
  // Selected cargo persists while seeking, but is added only to a completed hull.
  const cargo = metal && form === 1 ? settings.cargo : 0;
  const massG = (metal ? METAL_MASS_G : SPECIMENS[object as keyof typeof SPECIMENS].massG) + cargo * CARGO_MASS_G;
  const solidVolumeMl = (metal ? METAL_VOLUME_ML : SPECIMENS[object as keyof typeof SPECIMENS].volumeMl)
    + cargo * CARGO_VOLUME_ML;
  const capacityMl = metal ? metalDimensions(form).capacityMl : solidVolumeMl;
  const dryHull = metal && form === 1;
  const canFloat = massG < density * capacityMl;
  const finalBottom = canFloat
    ? WATER_Y - (metal ? metalDraftForDisplacement(form, massG / density)
      : specimenDraft(object as Exclude<JourneyObject, 'boat'>, massG / (density * solidVolumeMl)))
    : FLOOR_Y;
  let bottom: number;
  let beat: string;
  let replacement = 1;
  let released = false;
  let flooded = false;

  if (chapter === 'metal') {
    if (progress < 0.12) {
      // Leave a short settled observation before the external lifting step.
      bottom = mix(0.5, FLOOR_Y, phase(progress, 0, 0.08));
      beat = 'metal.solid';
      released = true;
    } else if (progress < 0.27) {
      bottom = mix(FLOOR_Y, 0.65, phase(progress, 0.12, 0.27));
      beat = 'metal.lift';
    } else if (progress < 0.43) {
      bottom = 0.65;
      beat = 'metal.flatten';
    } else if (progress < 0.63) {
      bottom = 0.65;
      beat = 'metal.bend';
    } else {
      bottom = mix(0.65, finalBottom, phase(progress, 0.63, 0.84));
      beat = progress < 0.84 ? 'metal.lower' : 'metal.settle';
      released = true;
    }
    // Exact milestones describe the completed step. Only the caption beat changes;
    // the pose, form, release state and hydrostatics keep their continuous path.
    if (progress === 0.12) beat = 'metal.solid';
    else if (progress === 0.43) beat = 'metal.flatten';
    else if (progress === 0.63) beat = 'metal.bend';
  } else if (chapter === 'shore') {
    bottom = mix(0.5, finalBottom, phase(progress, 0.16, 0.8));
    beat = progress < 0.16 ? 'shore.observe' : progress < 0.8 ? 'shore.release' : 'shore.settle';
    released = progress >= 0.16;
  } else {
    // A dry boat comparison is valid only at partial immersion below its rim.
    // An overloaded hull has no such equilibrium: use its flooded material alone.
    const invalidDryComparison = dryHull && !canFloat;
    const comparisonBottom = dryHull && canFloat ? finalBottom : WATER_Y - dimensions.height - 0.2;
    bottom = mix(comparisonBottom, finalBottom, phase(progress, 0.43, 0.84));
    replacement = invalidDryComparison ? 1 : phase(progress, 0.22, 0.43);
    flooded = invalidDryComparison;
    beat = invalidDryComparison && progress < 0.43 ? 'water.flooded'
      : progress < 0.22 ? 'water.parcel' : progress <= 0.43 ? 'water.replace'
        : progress < 0.84 ? 'water.release' : 'water.settle';
    released = progress >= 0.43;
    if (chapter === 'pressure') beat = settings.lens === 'micro' ? 'pressure.micro' : 'pressure.whole';
  }

  const immersedDepth = Math.max(0, WATER_Y - bottom);
  if (dryHull && immersedDepth >= dimensions.height && !canFloat) flooded = true;
  const displacedMl = metal
    ? metalDisplacementMl(form, immersedDepth, dryHull && !flooded)
      // At first rim contact the cargo is already below water; the flooded model
      // excludes the open cavity and counts only immersed steel plus immersed cargo.
      + (flooded ? cargo * CARGO_VOLUME_ML : 0)
    : solidVolumeMl * specimenFraction(object as Exclude<JourneyObject, 'boat'>, immersedDepth / dimensions.height);
  const displacedMassG = displacedMl * density;
  const buoyancy = displacedMassG * GRAVITY / 1000;
  const weight = massG * GRAVITY / 1000;
  const floating = released && !flooded && canFloat && immersedDepth > 0
    && Math.abs(buoyancy - weight) < 1e-7;
  // Support belongs to actual floor contact only, never to a body still sinking.
  const support = bottom <= FLOOR_Y + 1e-10 ? Math.max(0, weight - buoyancy) : 0;
  const waterComparison = chapter === 'water' || chapter === 'pressure';
  return {
    settings, kind, beat, waterY: WATER_Y, floorY: FLOOR_Y,
    body: {
      bottom, width: dimensions.width, height: dimensions.height, depth: dimensions.depth,
      tilt: 0, form, opacity: waterComparison ? replacement : 1,
    },
    parcel: {
      opacity: waterComparison ? 1 - replacement : 0,
      weightN: buoyancy, massG: displacedMassG,
    },
    hydro: {
      massG, solidVolumeMl, displacedMl, displacedMassG, capacityMl, density,
      floating, flooded, submergedFraction: clamp(displacedMl / (flooded ? solidVolumeMl : capacityMl), 0, 1),
    },
    forces: { buoyancy, weight, support }, comparison: waterComparison ? replacement : 0,
  };
}
