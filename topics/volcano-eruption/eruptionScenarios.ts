import { PRESETS, eruptionAppearance, type EruptionStyle, type ObservationView, type Settings } from './model.ts';

export type EruptionSurfaceView = Extract<ObservationView, 'exterior' | 'vent' | 'flow' | 'plume'>;
interface ScenarioDefinition {
  id: string;
  style: EruptionStyle;
  strength: number;
  vents: 1 | 3;
  view: EruptionSurfaceView;
}

/** Selected qualitative comparisons, not named eruptions or VEI classes.
 * The fountain pair and ash pair share every material/source condition except
 * strength. Multiple discrete vents divide one source; they do not establish
 * a continuous surface fissure or automatically multiply the eruption size.
 * Scientific background: https://www.usgs.gov/news/volcano-watch-how-big-eruption
 * and https://www.nps.gov/subjects/volcanoes/volcanic-eruptions.htm
 * The display powers in eruptionAppearance are uncalibrated teaching choices. */
export const ERUPTION_SCENARIOS = Object.freeze([
  Object.freeze({ id: 'gentle-flow', style: 'flow', strength: .32, vents: 1, view: 'flow' }),
  Object.freeze({ id: 'fissure-flow', style: 'flow', strength: .32, vents: 3, view: 'exterior' }),
  Object.freeze({ id: 'low-spatter', style: 'fountain', strength: .32, vents: 1, view: 'vent' }),
  Object.freeze({ id: 'high-fountain', style: 'fountain', strength: 1, vents: 1, view: 'vent' }),
  Object.freeze({ id: 'small-ash', style: 'ash', strength: .32, vents: 1, view: 'plume' }),
  Object.freeze({ id: 'strong-ash', style: 'ash', strength: 1, vents: 1, view: 'plume' }),
] as const satisfies readonly ScenarioDefinition[]);
export type EruptionScenario = typeof ERUPTION_SCENARIOS[number];
export type EruptionScenarioId = EruptionScenario['id'];

/** No DOM, locale, camera mutation or progress reset belongs to this owner. */
export function scenarioSettings(id: string, overrides: Partial<Settings> = {}): Settings {
  const scenario = ERUPTION_SCENARIOS.find(item => item.id === id) ?? ERUPTION_SCENARIOS[0];
  const settings = { ...PRESETS[scenario.style], vents: scenario.vents,
    strength: scenario.strength, resistance: .35, ...overrides };
  return { ...settings, strength: eruptionAppearance(settings).strength };
}
