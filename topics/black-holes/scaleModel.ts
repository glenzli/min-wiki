import { bodies } from '../cosmic-scale/comparisonModel.ts';
import { AU_KM, LIGHT_YEAR_KM, GALACTIC_RADIUS_KM } from '../cosmic-scale/model.ts';
export { AU_KM, LIGHT_YEAR_KM };
/** Physical lengths in km. Masses are rounded teaching values, not fitted data. */
export const SCHWARZSCHILD_KM_PER_SOLAR_MASS = 2.95325008;
export const SCALE_HOLES = [
  { id: 'stellar', mass: 10, color: '#8bddde' },
  { id: 'sagittarius', mass: 4_000_000, color: '#f0c487' },
  { id: 'm87', mass: 6_500_000_000, color: '#b8b1f0' },
] as const;
/** Dated, rounded examples. See ESO 2022/2019 and ESA 2023 links in scaleContent.json. */
export const OBSERVATION_EXAMPLES = [
  { id: 'gaia-bh1', mass: 10, distanceLightYears: 1560 },
  { ...SCALE_HOLES[1], distanceLightYears: 27_000 },
  { ...SCALE_HOLES[2], distanceLightYears: 55_000_000 },
] as const;
export const horizonRadiusKm = (solarMass: number) => solarMass * SCHWARZSCHILD_KM_PER_SOLAR_MASS;
/** Diameter/span comparisons, never masses, areas or optical-shadow widths. */
export const SCALE_REFERENCES = [
  { id: 'journey', spanKm: 50 },
  { id: 'arcturus', spanKm: 2 * bodies.find(body => body.id === 'arcturus')!.radius },
  { id: 'neptune-orbit', spanKm: 2 * 30.07 * AU_KM },
] as const;
/** Consume the very same body radii as the preceding cosmic comparison. */
export const COMPARISON_REFERENCES = [
  SCALE_REFERENCES[0],
  ...bodies.map(body => ({ id: body.id, spanKm: 2 * body.radius })),
  SCALE_REFERENCES[2],
  { id: 'milky-way', spanKm: 2 * GALACTIC_RADIUS_KM },
];
// A chosen face-on thin-disk extent, not the measured disk of any selected black hole.
export const DISK_INNER_HORIZON_RADII = 3;
export const DISK_OUTER_HORIZON_RADII = 6;
export function referenceComparison(index: number, referenceId = '') {
  const hole = SCALE_HOLES[index];
  const reference = COMPARISON_REFERENCES.find(item => item.id === referenceId) ?? SCALE_REFERENCES[index];
  const diameterKm = 2 * horizonRadiusKm(hole.mass);
  return { hole, reference, diameterKm, ratio: diameterKm / reference.spanKm };
}
/** One linear conversion for both objects inside the independently framed comparison. */
export function comparisonGeometry(index: number, width: number, referenceId = '', disk = false, height = 210) {
  const value = referenceComparison(index, referenceId);
  const envelope = disk ? DISK_OUTER_HORIZON_RADII : 1;
  const pixelsPerKm = Math.min(width * .36, Math.max(1, height - 30)) / Math.max(value.diameterKm * envelope, value.reference.spanKm);
  return { ...value, pixelsPerKm, holePixels: value.diameterKm * pixelsPerKm, referencePixels: value.reference.spanKm * pixelsPerKm };
}
/** Geometric angular diameter, NOT a fitted EHT shadow or photon-ring diameter. */
export function horizonMicroarcseconds(solarMass: number, distanceLightYears: number) {
  return 2 * Math.atan(horizonRadiusKm(solarMass) / (distanceLightYears * LIGHT_YEAR_KM)) * 180 / Math.PI * 3600 * 1e6;
}
const minimum = horizonRadiusKm(SCALE_HOLES[0].mass) * 2.8;
const maximum = horizonRadiusKm(SCALE_HOLES[2].mass) * 2.8;
export function worldRadiusKm(progress: number) {
  return minimum * (maximum / minimum) ** Math.max(0, Math.min(1, progress));
}
export function zoomProgress(radiusKm: number) {
  return Math.max(0, Math.min(1, Math.log(radiusKm / minimum) / Math.log(maximum / minimum)));
}
export const SCALE_STOPS = [0, zoomProgress(100_000_000), 1] as const;
export function scaleStage(progress: number) {
  return progress < (SCALE_STOPS[0] + SCALE_STOPS[1]) / 2 ? 0 : progress < (SCALE_STOPS[1] + 1) / 2 ? 1 : 2;
}
export function niceScale(km: number) {
  const power = 10 ** Math.floor(Math.log10(km));
  return [5, 2, 1].find(factor => factor * power <= km)! * power;
}

/** Related links use the current comparison sequence; the retired WOH id keeps a useful destination. */
export function referenceJourneyHref(referenceId: string) {
  if (referenceId === 'milky-way') return '/topics/cosmic-scale/?mode=homes&home=1';
  if (referenceId === 'neptune-orbit') return '/topics/cosmic-scale/?mode=homes&home=0';
  if (referenceId === 'woh-g64') return '/topics/cosmic-scale/?mode=compare&pair=5&pairVersion=2';
  const index = bodies.findIndex(body => body.id === referenceId);
  return `/topics/cosmic-scale/?mode=compare&pair=${Math.max(0, index - 1)}&pairVersion=2`;
}
