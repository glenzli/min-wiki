import { ecologyState, type EcologyState, type Habitat } from './ecologyModel.ts';
import { seed } from './magmaGeometry.ts';
import { smooth } from './model.ts';
import { bounded, landState } from './projectModel.ts';

export type OmuroMode = 'journey' | 'life';
export type OmuroStage = 0 | 1 | 2 | 3;
export const OMURO_STAGES = ['deposits', 'cooling', 'arrival', 'grassland'] as const;
export const OMURO_MILESTONES = [.23, .44, .66, 1] as const;
export const OMURO_STAGE_PROGRESS = OMURO_MILESTONES;
export const OMURO_DEPOSIT_LAYERS = 18;
export const OMURO_FORMATION_START = .05;
export const OMURO_FORMATION_END = .32;
/** Equal presentation units, not surveyed beds or a count of eruptions. Each
 * fixed-support unit is retained as the next unit accumulates above it. */
export function omuroFormationGrowth(progress: number) {
  return bounded((bounded(progress) - OMURO_FORMATION_START) / (OMURO_FORMATION_END - OMURO_FORMATION_START));
}
export function omuroLayerFill(growth: number, layer: number) {
  return bounded(bounded(growth) * OMURO_DEPOSIT_LAYERS - layer);
}

/** A compressed teaching journey, not one eruption's calibrated clock. The
 * mountain is already complete before the separate ecological clock advances.
 * The grassland endpoint does not assert extinction or a forest succession. */
export function omuroJourney(progress: number, habitat: Habitat = 'wet') {
  const p = bounded(progress);
  const formationClock = Math.min(.61, p / .32 * .61);
  const formingLand = landState(formationClock);
  const growth = omuroFormationGrowth(p);
  const deposits = Array.from({ length: OMURO_DEPOSIT_LAYERS }, (_, index) => ({ index, growth: omuroLayerFill(growth, index) }));
  const ecology = ecologyState(bounded((p - .32) / .68), habitat);
  const stage: OmuroStage = p < .32 ? 0 : p < .49 ? 1 : p < .72 ? 2 : 3;
  const deposition = smooth(.015, .075, p) * (1 - smooth(.25, .32, p));
  // The journey owns this compressed deposit schedule. The ecological output
  // retains its existing clock and is never inferred from particle brightness.
  const land = { ...formingLand, p, stage, deposits, growth, activity: deposition, cooling: ecology.cooling, vegetation: ecology.vegetation };
  return { p, stage, phase: OMURO_STAGES[stage], formationClock, land, landGrowth: land.growth,
    ecology, ecologyState: ecology,
    deposition,
    heat: (1 - ecology.cooling) * smooth(0, .08, p),
  };
}

export function omuroFrame(progress: number, habitat: Habitat = 'wet', mode: OmuroMode = 'journey') {
  const journey = omuroJourney(progress, habitat);
  if (mode === 'journey') return { ...journey, mode };
  const ecology = ecologyState(progress, habitat);
  return { ...journey, mode, land: { ...landState(.61), p: ecology.p, stage: ecology.stage,
    activity: 0, cooling: ecology.cooling, vegetation: ecology.vegetation }, landGrowth: 1,
    ecology, ecologyState: ecology, stage: ecology.stage as OmuroStage,
    phase: OMURO_STAGES[ecology.stage], deposition: 0, heat: 1 - ecology.cooling };
}
export type OmuroFrame = ReturnType<typeof omuroFrame>;

/** The original ecology illustration used 100 front-facing slope samples.
 * Keep their ids, fertility, retention and arrival seeds; place the same finite
 * population around the whole 3D cone, including a fixed subset in its bowl.
 * These are illustrative observation sites, not surveyed Omuro coordinates. */
export const OMURO_SITES = Object.freeze(Array.from({ length: 100 }, (_, index) => Object.freeze({
  index,
  radius: index % 8 === 0 ? .055 + seed(index + 781) * .26 : .30 + seed(index + 781) * .62,
  angle: .15 + seed(index + 998) * Math.PI * 2,
  fertility: seed(index + 113),
  retention: .4 + seed(index + 63) * .6,
  patchRadius: .68 + seed(index + 44) * .94,
  arrivalStart: .28 + seed(index + 21) * .15,
  arrivalEnd: .56 + seed(index + 21) * .15,
})));
export type OmuroSite = typeof OMURO_SITES[number];

/** Site-level establishment uses the existing ecological result, so moisture,
 * temperature and a renewed ash blanket still control the comparison. */
export function omuroSiteState(site: OmuroSite, ecology: EcologyState) {
  const cover = smooth(site.fertility * .63, site.fertility * .63 + .19, ecology.vegetation);
  const arrival = smooth(site.arrivalStart, site.arrivalEnd, ecology.p);
  return { site, cover, arrival, soil: ecology.soil * site.retention,
    height: Math.sqrt(cover) * (.003 + site.retention * .004),
    patchRadius: site.patchRadius * (.18 + cover * .82) };
}
