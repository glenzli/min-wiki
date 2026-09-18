export const SUN_RADIUS_KM = 695700;
export const AU_KM = 149597870.7;
export const LIGHT_SPEED_KM_S = 299792.458;
const radiusAU = SUN_RADIUS_KM / AU_KM;
function checkDistance(distanceAU: number) { if (!Number.isFinite(distanceAU) || distanceAU < 1) throw new RangeError('observer must be at least 1 AU away'); }
export function angularRatio(distanceAU: number) { checkDistance(distanceAU); return Math.asin(radiusAU / distanceAU) / Math.asin(radiusAU); }
export function solarObservation(distanceAU: number) {
  checkDistance(distanceAU);
  return { angularDiameterDegrees: 2 * Math.asin(radiusAU / distanceAU) * 180 / Math.PI,
    lightTravelSeconds: distanceAU * AU_KM / LIGHT_SPEED_KM_S, relativeIrradiance: 1 / distanceAU ** 2 };
}
