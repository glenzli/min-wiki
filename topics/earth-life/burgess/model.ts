export const WAPTIA_PARTS = ['whole', 'shield', 'head', 'limbs', 'tail'] as const;
export const WAPTIA_CAMERAS = ['oblique', 'side', 'dorsal', 'ventral'] as const;
export interface BurgessState {
  part: typeof WAPTIA_PARTS[number];
  camera: typeof WAPTIA_CAMERAS[number];
  evidence: boolean;
  activity: 'paddle' | 'rest';
  progress: number;
}
const pick = <T extends string>(values: readonly T[], value: unknown, fallback: T): T =>
  typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
/** This is one authored body plan, not a measured individual or locomotion solver. */
export const WAPTIA_SCALE = Object.freeze({ millimetresPerUnit: 10, representativeBodyMm: 50,
  lengthDefinition: 'midline from anterior median sclerite to caudal-ramus tip, excluding antennules',
  locality: 'Walcott Quarry, Burgess Shale, British Columbia', approximateAgeMa: 508,
  appendagePairs: 13, postMaxillularPairs: 4, lamellatePairs: 6,
  visibleLamellateSegments: 5, limblessAbdominalSomites: 6, caudalRamusPseudosegments: 3 });
export function parseBurgessState(raw: unknown = {}): BurgessState {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return {
    part: pick(WAPTIA_PARTS, source.part, 'whole'), camera: pick(WAPTIA_CAMERAS, source.camera, 'oblique'),
    evidence: source.evidence === true, activity: pick(['paddle', 'rest'] as const, source.activity, 'paddle'),
    progress: typeof source.progress === 'number' && Number.isInteger(source.progress) && Number.isFinite(source.progress)
      ? Math.min(100, Math.max(0, source.progress)) : 0,
  };
}
export function parseBurgessJSON(raw: unknown): BurgessState {
  if (typeof raw !== 'string' || raw.length > 1024) return parseBurgessState();
  try { return parseBurgessState(JSON.parse(raw)); } catch { return parseBurgessState(); }
}
export function serializeBurgessState(state: BurgessState): string { return JSON.stringify(parseBurgessState(state)); }
/** Four observations within one finite, inferred motion example; not real seconds. */
export const WAPTIA_STOPS = [0, 33, 67, 100] as const;
