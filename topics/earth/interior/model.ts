import { RIFT_DEFAULT, parseRiftState, serializeRiftState } from './rift/model';
/** Topic-owned, reversible teaching geometry; not a geodynamic or ray solver. */
export const EARTH = Object.freeze({
  radiusKm: 6371,
  coreRadiusKm: 3485,
  innerCoreRadiusKm: 1221,
  referenceContinentalCrustKm: 30,
  referenceOceanicCrustKm: 5,
  referenceLithosphereKm: 100,
  zoomDepthKm: 300,
});

export type InteriorView = 'layers' | 'evidence' | 'plates' | 'rift';
export type InteriorLayer = 'crust' | 'mantle' | 'outerCore' | 'innerCore' | 'lithosphere';
export type Boundary = 'divergent' | 'subduction' | 'collision' | 'transform';
export type InteriorState = {
  interiorView: InteriorView;
  interiorLayer: InteriorLayer;
  interiorLens: 'composition' | 'mechanical';
  interiorDepth: number;
  interiorWave: 'P' | 'S';
  interiorStation: 60 | 120 | 160;
  interiorBoundary: Boundary;
  interiorMotion: 'moving' | 'still';
  interiorProgress: number;
  interiorWaveProgress: number;
  interiorPlateCamera: string;
  interiorExplain: boolean;
  interiorRenderer: 'three' | 'section';
  interiorYaw: number;
  interiorPitch: number;
  interiorZoom: number;
  interiorRift: string;
};

export const DEFAULT_STATE: Readonly<InteriorState> = Object.freeze({
  interiorView: 'layers',
  interiorLayer: 'crust',
  interiorLens: 'composition',
  interiorDepth: 15,
  interiorWave: 'S',
  interiorStation: 120,
  interiorBoundary: 'divergent',
  interiorMotion: 'moving',
  interiorProgress: 0,
  interiorWaveProgress: 100,
  interiorPlateCamera: '',
  interiorExplain: false,
  interiorRenderer: 'three',
  interiorYaw: -45,
  interiorPitch: 23,
  interiorZoom: 100,
  interiorRift: serializeRiftState(RIFT_DEFAULT),
});

const oneOf = <T extends string>(value: string | undefined, values: readonly T[], fallback: T): T =>
  values.includes(value as T) ? value as T : fallback;
function strictInteger(value: string | undefined, fallback: number, max: number): number {
  if (value === undefined || !/^(0|[1-9]\d*)$/.test(value)) return fallback;
  const n = Number(value);
  return Number.isSafeInteger(n) && n <= max ? n : fallback;
}
function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !/^-?(0|[1-9]\d*)$/.test(value)) return fallback;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
}

export function parsePlateCamera(value?: string): [number,number,number] | undefined {
  if(!value||value.length>100)return;
  try{const p:unknown=JSON.parse(value);if(!Array.isArray(p)||p.length!==3||!p.every(n=>typeof n==='number'&&Number.isFinite(n)))return;
    const r=Math.hypot(...p);if(r<6||r>31)return;return p.map(n=>Math.round(n*10000)/10000) as [number,number,number];
  }catch{return;}
}

/** Accept only the documented key/value grammar; reject partial numeric strings. */
export function restoreState(input: Record<string, string>): InteriorState {
  const interiorLens = oneOf(input.interiorLens, ['composition', 'mechanical'] as const, DEFAULT_STATE.interiorLens);
  const requestedLayer = oneOf(input.interiorLayer, ['crust', 'mantle', 'outerCore', 'innerCore', 'lithosphere'] as const, DEFAULT_STATE.interiorLayer);
  const interiorDepth = input.interiorDepth === undefined && input.interiorLayer && (requestedLayer !== 'lithosphere' || interiorLens === 'mechanical')
    ? representativeDepth(requestedLayer)
    : strictInteger(input.interiorDepth, DEFAULT_STATE.interiorDepth, EARTH.radiusKm);
  const interiorLayer = interiorLens === 'mechanical' && interiorDepth < EARTH.referenceLithosphereKm
    ? 'lithosphere' : compositionAtDepth(interiorDepth);
  const station = strictInteger(input.interiorStation, DEFAULT_STATE.interiorStation, 180);
  return {
    interiorView: oneOf(input.interiorView, ['layers', 'evidence', 'plates', 'rift'] as const, DEFAULT_STATE.interiorView),
    interiorLayer,
    interiorLens,
    interiorDepth,
    interiorWave: oneOf(input.interiorWave, ['P', 'S'] as const, DEFAULT_STATE.interiorWave),
    interiorStation: station === 60 || station === 120 || station === 160 ? station : DEFAULT_STATE.interiorStation,
    interiorBoundary: oneOf(input.interiorBoundary, ['divergent', 'subduction', 'collision', 'transform'] as const, DEFAULT_STATE.interiorBoundary),
    interiorMotion: oneOf(input.interiorMotion, ['moving', 'still'] as const, DEFAULT_STATE.interiorMotion),
    interiorProgress: strictInteger(input.interiorProgress, DEFAULT_STATE.interiorProgress, 100),
    interiorWaveProgress: strictInteger(input.interiorWaveProgress, DEFAULT_STATE.interiorWaveProgress, 100),
    interiorPlateCamera: JSON.stringify(parsePlateCamera(input.interiorPlateCamera)) ?? '',
    interiorExplain: input.interiorExplain === '1',
    interiorRenderer: oneOf(input.interiorRenderer, ['three', 'section'] as const, DEFAULT_STATE.interiorRenderer),
    interiorYaw: boundedInteger(input.interiorYaw, DEFAULT_STATE.interiorYaw, -180, 180),
    interiorPitch: boundedInteger(input.interiorPitch, DEFAULT_STATE.interiorPitch, -65, 65),
    interiorZoom: boundedInteger(input.interiorZoom, DEFAULT_STATE.interiorZoom, 60, 160),
    interiorRift: serializeRiftState(parseRiftState(input.interiorRift)),
  };
}

export function serializeState(state: InteriorState): Record<string, string> {
  return Object.fromEntries(Object.entries(state).map(([key, value]) => [key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value)]));
}

export function compositionAtDepth(depthKm: number): Exclude<InteriorLayer, 'lithosphere'> {
  if (depthKm < EARTH.referenceContinentalCrustKm) return 'crust';
  if (depthKm < EARTH.radiusKm - EARTH.coreRadiusKm) return 'mantle';
  if (depthKm < EARTH.radiusKm - EARTH.innerCoreRadiusKm) return 'outerCore';
  return 'innerCore';
}

export function representativeDepth(layer: InteriorLayer): number {
  const depths: Record<InteriorLayer, number> = { crust: 15, lithosphere: 70, mantle: 1400, outerCore: 4000, innerCore: 5800 };
  return depths[layer];
}

export function radialPosition(depthKm: number, screenRadius: number): number {
  return Math.max(0, EARTH.radiusKm - Math.max(0, depthKm)) / EARTH.radiusKm * screenRadius;
}

/** A deliberately coarse textbook observation pattern, not predicted seismograms.
 * Weak, diffracted, reflected and converted phases are outside this comparison.
 */
export function waveObservation(wave: 'P' | 'S', angle: 60 | 120 | 160) {
  const arrives = angle === 60 || (wave === 'P' && angle === 160);
  return {
    arrives,
    crossesLiquidCore: arrives && angle === 160,
    blockedByLiquid: wave === 'S' && angle > 103,
    inPShadow: wave === 'P' && angle > 103 && angle < 140,
  };
}

export type PlateFrame = {
  progress: number;
  effectiveProgress: number;
  leftShift: number;
  rightShift: number;
  opening: number;
  slabDepth: number;
  crustalThickening: number;
  alongFaultOffset: number;
  newCrust: boolean;
  mantleMelt: boolean;
  stage: 0 | 1 | 2;
};

/** Each case retains its original two plates. Progress has no calibrated time. */
export function plateFrame(boundary: Boundary, motion: 'moving' | 'still', progress: number): PlateFrame {
  const normalized = Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0)) / 100;
  const p = motion === 'moving' ? normalized : 0;
  return {
    progress: normalized,
    effectiveProgress: p,
    leftShift: boundary === 'divergent' ? -60 * p : boundary === 'transform' ? 0 : 42 * p,
    rightShift: boundary === 'divergent' ? 60 * p : boundary === 'transform' ? 0 : -42 * p,
    opening: boundary === 'divergent' ? 120 * p : 0,
    slabDepth: boundary === 'subduction' ? 148 * p : 0,
    crustalThickening: boundary === 'collision' ? 90 * p : 0,
    alongFaultOffset: boundary === 'transform' ? 110 * p : 0,
    newCrust: boundary === 'divergent' && p > 0,
    mantleMelt: (boundary === 'divergent' && p > 0) || (boundary === 'subduction' && p > 0.55),
    stage: p === 0 ? 0 : p < 0.55 ? 1 : 2,
  };
}
