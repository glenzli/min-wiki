import { DEFAULT_STATE, EARTH_AGE_MA, EVENTS, nearestEvent, type EventId } from './model';

export const HISTORY_STATION_IDS = [
  'formation', 'separation', 'moon', 'water', 'life', 'oxygen',
  'cryogenian', 'cambrian', 'forests', 'permian', 'cretaceous', 'today',
] as const satisfies readonly EventId[];
export type HistoryStationId = typeof HISTORY_STATION_IDS[number];
export type HistoryJourneyMode = 'accretion' | 'differentiation' | 'impact' | 'oceans'
  | 'microbes' | 'oxygen' | 'icehouse' | 'animals' | 'forests' | 'extinction' | 'present';
export type HistoryEvidenceKind = 'meteorite' | 'zircon' | 'microbial' | 'iron'
  | 'fossil' | 'till' | 'forest' | 'impact' | 'modern';
export type HistoryScienceClass = 'observation' | 'inference' | 'hypothesis';

export interface HistoryStation {
  readonly id: HistoryStationId;
  readonly ageMa: number;
  readonly mode: HistoryJourneyMode;
  readonly evidenceKind: HistoryEvidenceKind;
}

function station(id: HistoryStationId, mode: HistoryJourneyMode, evidenceKind: HistoryEvidenceKind): Readonly<HistoryStation> {
  const event = EVENTS.find(candidate => candidate.id === id)!;
  return Object.freeze({ id, ageMa: event.ageMa, mode, evidenceKind });
}

/** Representative observation stops. Dates and identities are owned by the existing event model. */
export const HISTORY_STATIONS = Object.freeze([
  station('formation', 'accretion', 'meteorite'),
  station('separation', 'differentiation', 'meteorite'),
  station('moon', 'impact', 'impact'),
  station('water', 'oceans', 'zircon'),
  station('life', 'microbes', 'microbial'),
  station('oxygen', 'oxygen', 'iron'),
  station('cryogenian', 'icehouse', 'till'),
  station('cambrian', 'animals', 'fossil'),
  station('forests', 'forests', 'forest'),
  station('permian', 'extinction', 'fossil'),
  station('cretaceous', 'extinction', 'impact'),
  station('today', 'present', 'modern'),
]);

export interface HistoryJourneyCues {
  readonly core: number;
  readonly melt: number;
  readonly ocean: number;
  readonly land: number;
  readonly ice: number;
  readonly haze: number;
  readonly vegetation: number;
  readonly impact: number;
}
export interface HistoryJourneyFrame {
  readonly ageMa: number;
  readonly eventId: EventId;
  readonly stationId: HistoryStationId;
  readonly stationIndex: number;
  /** Local display phase: observation hold first, then accelerated transition; never physical time. */
  readonly progress: number;
  /** Equally spaced representative intervals, unlike the separate linear geological ruler. */
  readonly journeyFraction: number;
  readonly mode: HistoryJourneyMode;
  /** Independent illustrative intensities; never measured global area, concentration or probability. */
  readonly cues: HistoryJourneyCues;
  readonly evidenceKind: HistoryEvidenceKind;
}
export type JourneyFrame = HistoryJourneyFrame;
export interface HistoryJourneySample {
  readonly ageMa: number;
  readonly eventId: EventId;
  readonly fraction: number;
}

const CUE_KEYS = ['core', 'melt', 'ocean', 'land', 'ice', 'haze', 'vegetation', 'impact'] as const;
/** Authored display choices only. No ancient map, coverage curve, flux or composition is inferred here. */
const PROFILES: Readonly<Record<HistoryStationId, HistoryJourneyCues>> = {
  formation:   { core: .12, melt: .72, ocean: 0,   land: .12, ice: 0,   haze: .85, vegetation: 0,   impact: .25 },
  separation:  { core: .85, melt: .92, ocean: 0,   land: .18, ice: 0,   haze: .82, vegetation: 0,   impact: .55 },
  moon:        { core: .85, melt: .92, ocean: 0,   land: .18, ice: 0,   haze: .82, vegetation: 0,   impact: .55 },
  water:       { core: .92, melt: .28, ocean: .72, land: .24, ice: 0,   haze: .68, vegetation: 0,   impact: .05 },
  life:        { core: .95, melt: .12, ocean: .82, land: .28, ice: 0,   haze: .62, vegetation: .02, impact: 0 },
  oxygen:      { core: .97, melt: .08, ocean: .82, land: .32, ice: .06, haze: .42, vegetation: .02, impact: 0 },
  cryogenian:  { core: 1,   melt: .04, ocean: .58, land: .36, ice: .9,  haze: .2,  vegetation: .02, impact: 0 },
  cambrian:    { core: 1,   melt: .04, ocean: .82, land: .36, ice: .08, haze: .2,  vegetation: .03, impact: 0 },
  forests:     { core: 1,   melt: .04, ocean: .76, land: .48, ice: .1,  haze: .18, vegetation: .78, impact: 0 },
  permian:     { core: 1,   melt: .12, ocean: .76, land: .6,  ice: .04, haze: .68, vegetation: .2,  impact: 0 },
  cretaceous:  { core: 1,   melt: .05, ocean: .78, land: .56, ice: .06, haze: .9,  vegetation: .34, impact: 1 },
  today:       { core: 1,   melt: .03, ocean: .76, land: .5,  ice: .16, haze: .12, vegetation: .72, impact: 0 },
};
const INTERVALS = HISTORY_STATIONS.length - 1;
/** Authored fraction of each display interval reserved for observing its exact named station. */
export const HISTORY_OBSERVATION_HOLD = .45;
// Legacy URLs rounded the overall fraction to seven decimals. Scaling by the
// eleven intervals can introduce up to 5.5e-7 error at an exact station/hold end.
const POSITION_BOUNDARY_EPSILON = 1e-6;
const unit = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const transitionPhase = (phase: number) => unit((phase - HISTORY_OBSERVATION_HOLD) / (1 - HISTORY_OBSERVATION_HOLD));
const normalizedAge = (value: number) => Math.round(Math.min(EARTH_AGE_MA,
  Math.max(0, Number.isFinite(value) ? value : DEFAULT_STATE.ageMa)) * 1000) / 1000;

function position(fraction: number): { index: number; phase: number; fraction: number } {
  const bounded = unit(fraction);
  let scaled = bounded * INTERVALS;
  const boundary = Math.round(scaled);
  if (Math.abs(scaled - boundary) < POSITION_BOUNDARY_EPSILON) scaled = boundary;
  if (scaled >= INTERVALS) return { index: INTERVALS, phase: 1, fraction: 1 };
  const index = Math.floor(scaled);
  const rawPhase = scaled - index;
  const phase = Math.abs(rawPhase - HISTORY_OBSERVATION_HOLD) < POSITION_BOUNDARY_EPSILON ? HISTORY_OBSERVATION_HOLD : rawPhase;
  return { index, phase, fraction: bounded };
}

/**
 * Convert the existing age/event state to its canonical display position. The two
 * 4500 Ma identities have separate positions, although no extra geological time
 * is inserted between them. An old saved record cannot encode a subphase there.
 */
export function journeyFraction(ageMa: number, eventId?: EventId): number {
  const age = normalizedAge(ageMa);
  const selected = nearestEvent(age, eventId).id;
  const exact = HISTORY_STATIONS.findIndex(stop => stop.id === selected && stop.ageMa === age);
  if (exact >= 0) return exact / INTERVALS;
  for (let index = 0; index < INTERVALS; index++) {
    const older = HISTORY_STATIONS[index].ageMa;
    const younger = HISTORY_STATIONS[index + 1].ageMa;
    if (older > younger && age <= older && age >= younger) {
      return (index + HISTORY_OBSERVATION_HOLD
        + (older - age) / (older - younger) * (1 - HISTORY_OBSERVATION_HOLD)) / INTERVALS;
    }
  }
  return age <= 0 ? 1 : 0;
}

/**
 * Finite display playback: every adjacent station pair gets equal presentation
 * time. The first 45% holds the older station's exact age/event for observation;
 * the remaining 55% advances toward the next station. Neither is a geological
 * rate. Age retains the established 0.001 Ma precision. During the equal-age
 * interval it stays at 4500 Ma, with separation retained until the Moon boundary.
 */
export function journeySample(fraction: number): HistoryJourneySample {
  const point = position(fraction);
  const older = HISTORY_STATIONS[point.index];
  const younger = HISTORY_STATIONS[Math.min(point.index + 1, INTERVALS)];
  const ageMa = normalizedAge(older.ageMa + (younger.ageMa - older.ageMa) * transitionPhase(point.phase));
  const eventId = point.phase <= HISTORY_OBSERVATION_HOLD || point.index === INTERVALS
    ? older.id : nearestEvent(ageMa, older.id).id;
  return { ageMa, eventId, fraction: point.fraction };
}

/**
 * Pure qualitative projection of the same old age/event state for all lenses.
 * An optional transient cursor can retain local presentation phase, including
 * the 4500 Ma tie, only if sampling it reproduces this exact normalized state.
 * A stale, unrelated or malformed cursor cannot overwrite the scientific state.
 */
export function journeyFrame(ageMa: number, eventId?: EventId, displayFraction?: number): HistoryJourneyFrame {
  const age = normalizedAge(ageMa);
  const selected = nearestEvent(age, eventId).id;
  let fraction = journeyFraction(age, selected);
  if (typeof displayFraction === 'number' && Number.isFinite(displayFraction)) {
    const candidate = journeySample(displayFraction);
    if (candidate.ageMa === age && candidate.eventId === selected) fraction = candidate.fraction;
  }
  const point = position(fraction);
  const stop = HISTORY_STATIONS[point.index];
  const next = HISTORY_STATIONS[Math.min(point.index + 1, INTERVALS)];
  const transition = transitionPhase(point.phase);
  const mix = transition * transition * (3 - 2 * transition);
  const cues = Object.fromEntries(CUE_KEYS.map(key => [key,
    unit(PROFILES[stop.id][key] + (PROFILES[next.id][key] - PROFILES[stop.id][key]) * mix),
  ])) as unknown as HistoryJourneyCues;
  return {
    ageMa: age, eventId: selected, stationId: stop.id, stationIndex: point.index,
    progress: point.phase, journeyFraction: point.fraction, mode: stop.mode,
    cues, evidenceKind: stop.evidenceKind,
  };
}
