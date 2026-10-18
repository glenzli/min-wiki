import { calcDaylightHours } from '../data/seasonsData.ts';
import { cityIllumination, rotationAtLocalNoon, solarGeometry, wrapCycle } from './solarGeometry.ts';

// A teaching clock at UTC+8. Equation of time is deliberately omitted:
// apparent solar time at 120°E is treated as the reference clock time.
export const CLOCK_MERIDIAN = 120;
export const CIVIL_TWILIGHT_ALTITUDE = -6;
type SunDirection = ReturnType<typeof solarGeometry>['sunLocal'];
export type DayNightState = 'day' | 'twilight' | 'night' | 'horizon';

export function referenceClockHours(sun: SunDirection) {
  const longitude = Math.atan2(-sun.z, sun.x) * 180 / Math.PI;
  return wrapCycle(.5 + (CLOCK_MERIDIAN - longitude) / 360) * 24;
}

export function rotationAtReferenceClock(orbit: number, tilt: number, hours: number) {
  return wrapCycle(rotationAtLocalNoon(orbit, tilt, CLOCK_MERIDIAN) + (hours - 12) / 24);
}

export function daylightState(altitude: number): DayNightState {
  if (Math.abs(altitude) < 1e-6) return 'horizon';
  if (altitude > 0) return 'day';
  return altitude >= CIVIL_TWILIGHT_ALTITUDE ? 'twilight' : 'night';
}

export function clockText(hours: number, minuteStep = 1) {
  const minutes = Math.round(wrapCycle(hours / 24) * 1440 / minuteStep) * minuteStep % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function cityDaylightReadout(city: { lat: number; lon: number }, sun: SunDirection, declination: number) {
  const light = cityIllumination(city.lat, city.lon, sun);
  const daylight = calcDaylightHours(city.lat, declination);
  const ordinary = daylight !== null && daylight > 0 && daylight < 24;
  const noon = 12 + (CLOCK_MERIDIAN - city.lon) / 15;
  return {
    ...light,
    state: daylightState(light.altitude),
    daylight,
    sunrise: ordinary ? wrapCycle((noon - daylight / 2) / 24) * 24 : null,
    sunset: ordinary ? wrapCycle((noon + daylight / 2) / 24) * 24 : null,
  };
}
