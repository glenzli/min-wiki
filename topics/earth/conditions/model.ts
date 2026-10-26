import { PLANETS_DATA } from '../../solar-system/data/planetsData.ts';
import { worlds } from '../../atmosphere/model.ts';
import { MAJOR_CITIES, calcDaylightHours, calcNoonSolarAltitude } from '../../earth-seasons/data/seasonsData.ts';
import { solarGeometry, rotationAtLocalNoon } from '../../earth-seasons/physics/solarGeometry.ts';

export const SOLAR_FLUX = 1361;
export const SIGMA = 5.670374419e-8;
export const ALBEDO = 0.3;
export const EARTH_ESCAPE = 0.61;
export const DISTANCE_RANGE = [0.65, 1.7] as const;
export const ESCAPE_RANGE = [0.4, 1] as const;
export const WORLD_IDS = ['venus', 'mars', 'earth', 'uranus'] as const;
export type WorldId = typeof WORLD_IDS[number];
export const STEPS = ['distance', 'worlds', 'atmosphere', 'return'] as const;
export const SEASON_STEPS = ['tilt', 'worlds', 'return'] as const;
export type Step = typeof STEPS[number] | 'tilt';
export type Track = 'energy' | 'seasons';
export const CITIES = MAJOR_CITIES;
export const VIEWS = ['globe', 'descent', 'landscape', 'section'] as const;
export type View = typeof VIEWS[number];

export function bounded(value: unknown, min: number, max: number, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

/** A fixed-albedo, zero-dimensional grey energy balance, not a climate solver.
 * escape is the effective ratio of outgoing space radiation to sigma*T_surface^4.
 * It is not pressure, gas concentration, or a measured atmospheric emissivity.
 */
export function energyBalance(distanceAU: number, escape = EARTH_ESCAPE) {
  const distance = bounded(distanceAU, ...DISTANCE_RANGE, 1);
  const infraredEscape = bounded(escape, ...ESCAPE_RANGE, EARTH_ESCAPE);
  const sunlight = SOLAR_FLUX / distance ** 2;
  const absorbed = sunlight * (1 - ALBEDO) / 4;
  const temperatureK = (absorbed / (SIGMA * infraredEscape)) ** 0.25;
  const referenceK = (SOLAR_FLUX * (1 - ALBEDO) / (4 * SIGMA * EARTH_ESCAPE)) ** 0.25;
  const outgoingAtReference = infraredEscape * SIGMA * referenceK ** 4;
  return { distance, infraredEscape, sunlight, sunlightRatio: sunlight / SOLAR_FLUX,
    absorbed, temperatureK, temperatureC: temperatureK - 273.15,
    referenceK, outgoingAtReference, imbalance: absorbed - outgoingAtReference,
    outgoingAtEquilibrium: infraredEscape * SIGMA * temperatureK ** 4 };
}

/** Representative actual-world data retain their existing scientific owners. */
export function realWorld(id: WorldId) {
  const orbit = PLANETS_DATA.find(p => p.id === id)!;
  const air=id==='uranus'?null:worlds[id];
  return { distanceAU: orbit.semiMajorAxisAU, pressureHpa: air?.pressure??null,
    temperatureC: air?.temperature??null, massEarth: orbit.relativeEarthMass,
    radiusEarth: orbit.relativeEarthDiameter, tilt:orbit.axialTiltDeg };
}

/** Reuses the same circular-orbit geometry and daylight equations as Seasons.
 * The selected instant is local solar noon; no temperature is inferred.
 */
export function tiltOutcome(tilt: number, season: number, cityId: string) {
  const city=CITIES.find(c=>c.id===cityId)??CITIES.find(c=>c.id==='beijing')!;
  const angle=bounded(tilt,0,98,23.44),orbit=bounded(season,0,1,.25);
  const geometry=solarGeometry(orbit,0,angle),zero=solarGeometry(orbit,0,0);
  return {city,tilt:angle,season:orbit,rotation:rotationAtLocalNoon(orbit,angle,city.lon),
    declination:geometry.declination,noonAltitude:calcNoonSolarAltitude(city.lat,geometry.declination),
    daylight:calcDaylightHours(city.lat,geometry.declination),
    zeroDaylight:calcDaylightHours(city.lat,zero.declination),
    zeroNoonAltitude:calcNoonSolarAltitude(city.lat,zero.declination)};
}
