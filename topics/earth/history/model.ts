export const EARTH_AGE_MA = 4540;
export const OVERVIEW_MA = EARTH_AGE_MA;
export const MAX_OXYGEN_STEPS = 24;
export const STRATIGRAPHY_VERSION = '2026/06';
/** Numerical estimates of period bases, not fossil-community ages or durations. */
export const STRATIGRAPHY_BOUNDARIES = [
  { id: 'cambrian', ageMa: 538.8, uncertaintyMa: 0.6 },
  { id: 'ordovician', ageMa: 486.85, uncertaintyMa: 1.5 },
  { id: 'silurian', ageMa: 443.1, uncertaintyMa: 0.9 },
  { id: 'devonian', ageMa: 419.62, uncertaintyMa: 1.36 },
  { id: 'carboniferous', ageMa: 358.86, uncertaintyMa: 0.19 },
  { id: 'triassic', ageMa: 251.902, uncertaintyMa: 0.024 },
  { id: 'jurassic', ageMa: 201.4, uncertaintyMa: 0.2 },
  { id: 'paleogene', ageMa: 66, uncertaintyMa: null },
] as const;

export const SOURCES = {
  earth: 'https://science.nasa.gov/earth/facts/',
  separation: 'https://www.amnh.org/exhibitions/permanent/the-universe/planets/formation-of-our-solar-system',
  moon: 'https://science.nasa.gov/moon/formation/',
  water: 'https://www.nature.com/articles/35051550',
  life: 'https://www.nature.com/articles/ncomms15263',
  oxygen: 'https://www.pnas.org/doi/10.1073/pnas.1608824114',
  oxygenBudget: 'https://www.nature.com/articles/s41467-019-10872-z',
  iron: 'https://astrobiology.nasa.gov/news/the-biology-behind-banded-iron-formations/',
  ironExample: 'https://www.amnh.org/exhibitions/permanent/planet-earth/how-has-the-earth-evolved/banded-iron-formation',
  multicellular: 'https://authors.library.caltech.edu/records/7brz9-8mw86',
  animals: 'https://naturalhistory.si.edu/education/teaching-resources/life-science/early-life-earth-animal-origins',
  cambrian: 'https://naturalhistory.si.edu/education/teaching-resources/paleontology/cambrian-explosion-life-paleontologist-karma-nanglu',
  timeChart: 'https://stratigraphy.org/ICSchart/ChronostratChart2026-06.pdf',
  burgess: 'https://www.rom.on.ca/news-releases/burgess-shale-fossil-site-reveals-oldest-evidence-brood-care',
  plants: 'https://eprints.whiterose.ac.uk/id/eprint/106/1/wellmanch1.pdf',
  land: 'https://www.nms.ac.uk/discover-catalogue/the-mysterious-15-million-year-gap-in-our-evolution',
  extinctions: 'https://naturalhistory.si.edu/education/teaching-resources/paleontology/extinction-over-time',
  humans: 'https://humanorigins.si.edu/evidence/human-fossils/species/homo-sapiens',
  dating: 'https://www.nist.gov/how-do-you-measure-it/how-do-you-know-age-fossils-and-other-old-things',
  cryogenian: 'https://cryogenian.stratigraphy.org/',
  snowball: 'https://www.giss.nasa.gov/research/features/201508_slushball/',
  paleoIce: 'https://www.annualreviews.org/doi/10.1146/annurev.earth.031208.100118',
  antarctic: 'https://www.nature.com/articles/s41467-022-33310-z',
  quaternary: 'https://www.nps.gov/articles/000/quaternary-period.htm',
  lgm: 'https://www.usgs.gov/faqs/how-does-present-glacier-extent-and-sea-level-compare-extent-glaciers-and-global-sea-level',
  forest: 'https://www.nhm.ac.uk/discover/how-trees-changed-the-world.html',
  forestRecord: 'https://www.nhm.ac.uk/discover/the-fossil-tree.html',
  cairo: 'https://www.cardiff.ac.uk/news/view/1739669-scientists-uncover-worlds-oldest-forest',
  coal: 'https://repository.si.edu/items/52e46b6c-12ec-44d5-8ce6-160781d13956',
  permian: 'https://www.nature.com/articles/s44185-025-00117-2',
  camp: 'https://www.nature.com/articles/s41467-020-15325-6',
  kpg: 'https://pubmed.ncbi.nlm.nih.gov/31949074/',
  devonian: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7395115/',
} as const;

export type SourceId = keyof typeof SOURCES;
export const EVENTS = [
  { id: 'formation', ageMa: EARTH_AGE_MA, kind: 'inference', sourceIds: ['earth', 'dating'] },
  { id: 'separation', ageMa: 4500, kind: 'inference', sourceIds: ['separation'] },
  { id: 'moon', ageMa: 4500, kind: 'hypothesis', sourceIds: ['moon'] },
  { id: 'water', ageMa: 4400, kind: 'evidence', sourceIds: ['water'] },
  { id: 'life', ageMa: 3500, kind: 'evidence', sourceIds: ['life', 'animals'] },
  { id: 'oxygen', ageMa: 2400, youngMa: 2100, kind: 'inference', sourceIds: ['oxygen', 'oxygenBudget', 'iron'] },
  { id: 'huronian', ageMa: 2300, kind: 'inference', sourceIds: ['oxygen'] },
  { id: 'eukaryotes', ageMa: 1800, kind: 'evidence', sourceIds: ['multicellular'] },
  { id: 'multicellular', ageMa: 1047, kind: 'evidence', sourceIds: ['multicellular'] },
  { id: 'cryogenian', ageMa: 720, youngMa: 635, kind: 'inference', sourceIds: ['cryogenian', 'snowball'] },
  { id: 'ediacaran', ageMa: 580, kind: 'evidence', sourceIds: ['animals'] },
  { id: 'cambrian', ageMa: 539, kind: 'evidence', sourceIds: ['cambrian', 'burgess', 'timeChart'] },
  { id: 'plants', ageMa: 470, kind: 'evidence', sourceIds: ['plants'] },
  { id: 'ordovician', ageMa: 445, youngMa: 443, kind: 'inference', sourceIds: ['extinctions', 'timeChart'] },
  { id: 'arthropods', ageMa: 425, kind: 'evidence', sourceIds: ['land'] },
  { id: 'forests', ageMa: 386, kind: 'evidence', sourceIds: ['cairo', 'forest', 'coal'] },
  { id: 'devonian', ageMa: 372, youngMa: 359, kind: 'inference', sourceIds: ['extinctions', 'devonian'] },
  { id: 'tetrapods', ageMa: 365, kind: 'evidence', sourceIds: ['land'] },
  { id: 'paleoIce', ageMa: 320, kind: 'inference', sourceIds: ['paleoIce'] },
  { id: 'permian', ageMa: 252, kind: 'inference', sourceIds: ['extinctions', 'permian', 'timeChart'] },
  { id: 'triassic', ageMa: 201, kind: 'inference', sourceIds: ['extinctions', 'camp', 'timeChart'] },
  { id: 'cretaceous', ageMa: 66, kind: 'inference', sourceIds: ['extinctions', 'kpg'] },
  { id: 'antarctic', ageMa: 34, kind: 'inference', sourceIds: ['antarctic'] },
  { id: 'quaternary', ageMa: 2.58, youngMa: 0, kind: 'inference', sourceIds: ['quaternary', 'timeChart'] },
  { id: 'humans', ageMa: 0.3, kind: 'evidence', sourceIds: ['humans'] },
  { id: 'lgm', ageMa: 0.021, kind: 'inference', sourceIds: ['lgm'] },
  { id: 'megafauna', ageMa: 0.012, kind: 'inference', sourceIds: ['quaternary'] },
  { id: 'today', ageMa: 0, kind: 'observation', sourceIds: ['earth', 'humans'] },
] as const;

export type HistoryEvent = typeof EVENTS[number];
export type EventId = HistoryEvent['id'];
export type Zoom = 'all' | 'animals' | 'ice' | 'human';
export const WINDOWS: Record<Zoom, number> = { all: OVERVIEW_MA, animals: 600, ice: 3, human: 1 };
export const GOE_INTERVAL = { oldMa: 2400, youngMa: 2100 } as const;
export const ICE_INTERVALS = [
  { id: 'huronian', oldMa: 2400, youngMa: 2100 },
  { id: 'cryogenian', oldMa: 720, youngMa: 635 },
  { id: 'paleoIce', oldMa: 360, youngMa: 260 },
  { id: 'antarctic', oldMa: 34, youngMa: 0 },
] as const;
export const EONS = [
  { id: 'hadean', oldMa: OVERVIEW_MA, youngMa: 4031 },
  { id: 'archean', oldMa: 4031, youngMa: 2500 },
  { id: 'proterozoic', oldMa: 2500, youngMa: 538.8 },
  { id: 'phanerozoic', oldMa: 538.8, youngMa: 0 },
] as const;

export interface HistoryState {
  ageMa: number;
  zoom: Zoom;
  event: EventId;
  oxygenSource: number;
  oxygenRecycle: number;
  oxygenSink: number;
  oxygenSteps: number;
  rockEvidence: boolean;
  deepTime: boolean;
  deepOxygen: boolean;
}

export const DEFAULT_STATE: Readonly<HistoryState> = {
  ageMa: 2400,
  zoom: 'all',
  event: 'oxygen',
  oxygenSource: 8,
  oxygenRecycle: 50,
  oxygenSink: 6,
  oxygenSteps: 8,
  rockEvidence: false,
  deepTime: false,
  deepOxygen: false,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Chronological x-coordinate. Every equal interval has equal width. */
export function timeFraction(ageMa: number, windowMa = OVERVIEW_MA): number {
  if (!Number.isFinite(ageMa) || !Number.isFinite(windowMa) || windowMa <= 0) return 0;
  return clamp(1 - ageMa / windowMa, 0, 1);
}

export function ageAtFraction(fraction: number, windowMa: number): number {
  if (!Number.isFinite(fraction) || !Number.isFinite(windowMa) || windowMa <= 0) return 0;
  return Math.round(clamp((1 - clamp(fraction, 0, 1)) * windowMa, 0, windowMa) * 1000) / 1000;
}

export function nearestEvent(ageMa: number, preferred?: string): HistoryEvent {
  const distance = Math.min(...EVENTS.map(event => Math.abs(event.ageMa - ageMa)));
  return EVENTS.find(event => event.id === preferred && Math.abs(event.ageMa - ageMa) <= distance + 1e-9)
    ?? EVENTS.find(event => Math.abs(event.ageMa - ageMa) <= distance + 1e-9)!;
}

function strictNumber(value: unknown, fallback: number, min: number, max: number, step?: number): number {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return fallback;
  if (step && Math.abs(number / step - Math.round(number / step)) > 1e-8) return fallback;
  return number;
}

export function parseHistoryState(raw: Record<string, string> = {}): HistoryState {
  const zoom: Zoom = raw.zoom === 'animals' || raw.zoom === 'human' || raw.zoom === 'ice' || raw.zoom === 'all' ? raw.zoom : 'all';
  const ageMa = strictNumber(raw.ageMa, Math.min(DEFAULT_STATE.ageMa, WINDOWS[zoom]), 0, WINDOWS[zoom], 0.001);
  const opened = (key: 'rockEvidence' | 'deepTime' | 'deepOxygen') => raw[key] === 'open';
  return {
    ageMa,
    zoom,
    event: nearestEvent(ageMa, raw.event).id,
    oxygenSource: strictNumber(raw.oxygenSource, DEFAULT_STATE.oxygenSource, 0, 12, 1),
    oxygenRecycle: strictNumber(raw.oxygenRecycle, DEFAULT_STATE.oxygenRecycle, 0, 100, 10),
    oxygenSink: strictNumber(raw.oxygenSink, DEFAULT_STATE.oxygenSink, 0, 12, 1),
    oxygenSteps: strictNumber(raw.oxygenSteps, DEFAULT_STATE.oxygenSteps, 0, MAX_OXYGEN_STEPS, 1),
    rockEvidence: opened('rockEvidence'),
    deepTime: opened('deepTime'),
    deepOxygen: opened('deepOxygen'),
  };
}

export function serializeHistoryState(state: HistoryState): Record<string, string> {
  return {
    ageMa: String(state.ageMa), zoom: state.zoom, event: state.event,
    oxygenSource: String(state.oxygenSource), oxygenRecycle: String(state.oxygenRecycle),
    oxygenSink: String(state.oxygenSink), oxygenSteps: String(state.oxygenSteps),
    rockEvidence: state.rockEvidence ? 'open' : 'closed',
    deepTime: state.deepTime ? 'open' : 'closed',
    deepOxygen: state.deepOxygen ? 'open' : 'closed',
  };
}

export function selectAge(state: HistoryState, ageMa: number): HistoryState {
  const age = Math.round(clamp(ageMa, 0, WINDOWS[state.zoom]) * 1000) / 1000;
  return { ...state, ageMa: age, event: nearestEvent(age, state.event).id };
}

export function selectEvent(state: HistoryState, id: EventId): HistoryState {
  const event = EVENTS.find(candidate => candidate.id === id)!;
  return { ...state, ageMa: event.ageMa, event: id, zoom: event.ageMa <= WINDOWS[state.zoom] ? state.zoom : 'all' };
}

export function selectZoom(state: HistoryState, zoom: Zoom): HistoryState {
  return selectAge({ ...state, zoom }, Math.min(state.ageMa, WINDOWS[zoom]));
}

export interface OxygenParameters {
  source: number;
  recyclePercent: number;
  geologicalDemand: number;
}

export interface OxygenFrame {
  step: number;
  released: number;
  recycled: number;
  geologicalConsumed: number;
  availableBeforeGeology: number;
  stock: number;
  totalReleased: number;
  totalRecycled: number;
  totalGeological: number;
}

/**
 * A finite teaching ledger in arbitrary oxygen units, with no mapping to years,
 * concentrations or actual ancient fluxes. Recycling is a fraction of this
 * turn's production; associated remaining organic carbon is held out of the
 * active recycling pool. Geological demand is replenished every turn, never a
 * finite worldwide reservoir that must eventually run out.
 */
export function oxygenBudget(parameters: OxygenParameters, steps: number): OxygenFrame[] {
  const { source, recyclePercent, geologicalDemand } = parameters;
  if (![source, recyclePercent, geologicalDemand, steps].every(Number.isFinite)
    || source < 0 || source > 12 || recyclePercent < 0 || recyclePercent > 100
    || geologicalDemand < 0 || geologicalDemand > 12 || !Number.isInteger(steps)
    || steps < 0 || steps > MAX_OXYGEN_STEPS) {
    throw new RangeError('Oxygen teaching parameters are outside the supported domain.');
  }
  const frames: OxygenFrame[] = [{
    step: 0, released: 0, recycled: 0, geologicalConsumed: 0,
    availableBeforeGeology: 0, stock: 0, totalReleased: 0, totalRecycled: 0, totalGeological: 0,
  }];
  for (let step = 1; step <= steps; step++) {
    const previous = frames[step - 1];
    const recycled = source * recyclePercent / 100;
    const availableBeforeGeology = previous.stock + source - recycled;
    const geologicalConsumed = Math.min(availableBeforeGeology, geologicalDemand);
    frames.push({
      step, released: source, recycled, geologicalConsumed,
      availableBeforeGeology, stock: Math.max(0, availableBeforeGeology - geologicalConsumed),
      totalReleased: previous.totalReleased + source,
      totalRecycled: previous.totalRecycled + recycled,
      totalGeological: previous.totalGeological + geologicalConsumed,
    });
  }
  return frames;
}

export function historyParameters(state: HistoryState): OxygenParameters {
  return { source: state.oxygenSource, recyclePercent: state.oxygenRecycle, geologicalDemand: state.oxygenSink };
}
