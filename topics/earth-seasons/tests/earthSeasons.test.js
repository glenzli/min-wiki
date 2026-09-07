import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EARTH_CONSTANTS,
  SOLAR_TERMS,
  MAJOR_CITIES,
  calcSubsolarLatitude,
  calcNoonSolarAltitude,
  calcDaylightHours,
  calcSolarHeatFlux
} from '../data/seasonsData.js';
import { STORIES, ACADEMIC, stageAt, SCENARIO_DESCRIPTIONS } from '../story.js';

test('Earth constants and datasets integrity', () => {
  assert.ok(Math.abs(EARTH_CONSTANTS.axialTiltDeg - 23.44) < 0.01, 'Axial tilt must be ~23.44°');
  assert.equal(EARTH_CONSTANTS.solarDayHours, 24.0, 'Solar day is 24.0 hours');
  assert.ok(EARTH_CONSTANTS.radiusKm > 6300 && EARTH_CONSTANTS.radiusKm < 6400, 'Earth radius is ~6371 km');

  // Perihelion in January is closer than Aphelion in July
  assert.ok(
    EARTH_CONSTANTS.perihelionDistanceAU < EARTH_CONSTANTS.aphelionDistanceAU,
    'Earth is closer to sun at perihelion (Jan) than at aphelion (July)'
  );

  assert.equal(SOLAR_TERMS.length, 4, 'Four key solar terms');
  assert.ok(MAJOR_CITIES.length >= 6, 'Contains at least 6 major representative locations');
  for (const city of MAJOR_CITIES) {
    assert.ok(city.id && city.nameZh, 'City must have id and Chinese name');
    assert.ok(city.lat >= -90 && city.lat <= 90, 'Latitude must be valid [-90, 90]');
    assert.ok(city.lon >= -180 && city.lon <= 180, 'Longitude must be valid [-180, 180]');
  }
});

test('Subsolar latitude oscillations across four seasons', () => {
  const tilt = EARTH_CONSTANTS.axialTiltDeg;

  // Spring Equinox (0.0): 0°
  const springLat = calcSubsolarLatitude(0.0, tilt);
  assert.ok(Math.abs(springLat - 0.0) < 0.01, 'Spring Equinox subsolar lat is 0.0°');

  // Summer Solstice (0.25): +23.44°
  const summerLat = calcSubsolarLatitude(0.25, tilt);
  assert.ok(Math.abs(summerLat - tilt) < 0.01, 'Summer Solstice subsolar lat is +23.44°');

  // Autumn Equinox (0.50): 0°
  const autumnLat = calcSubsolarLatitude(0.50, tilt);
  assert.ok(Math.abs(autumnLat - 0.0) < 0.01, 'Autumn Equinox subsolar lat is 0.0°');

  // Winter Solstice (0.75): -23.44°
  const winterLat = calcSubsolarLatitude(0.75, tilt);
  assert.ok(Math.abs(winterLat - (-tilt)) < 0.01, 'Winter Solstice subsolar lat is -23.44°');
});

test('Noon solar altitude angle calculations across latitudes and seasons', () => {
  // Equator at Spring Equinox
  const eqSpring = calcNoonSolarAltitude(0.0, 0.0);
  assert.equal(eqSpring, 90.0, 'Noon sun is directly overhead (90°) at Equator on Spring Equinox');

  // Beijing (39.9°N)
  const bjSummer = calcNoonSolarAltitude(39.9, 23.44);
  const bjWinter = calcNoonSolarAltitude(39.9, -23.44);
  const bjSpring = calcNoonSolarAltitude(39.9, 0.0);

  assert.ok(Math.abs(bjSummer - 73.54) < 0.1, 'Beijing summer noon altitude ~73.5°');
  assert.ok(Math.abs(bjWinter - 26.66) < 0.1, 'Beijing winter noon altitude ~26.7°');
  assert.ok(Math.abs(bjSpring - 50.1) < 0.1, 'Beijing spring noon altitude ~50.1°');
  assert.ok(bjSummer - bjWinter > 46.0, 'Beijing summer sun is >46° higher than winter sun!');

  // Solar heat flux at noon: Summer is more than twice as intense as Winter
  const summerFlux = calcSolarHeatFlux(bjSummer);
  const winterFlux = calcSolarHeatFlux(bjWinter);
  assert.ok(summerFlux / winterFlux > 2.0, 'Summer solar flux is >2x higher than winter solar flux');
});

test('Daylight hours and polar day / polar night verification', () => {
  // Equator has strictly 12h daylight year-round
  assert.equal(calcDaylightHours(0.0, 0.0), 12.0);
  assert.equal(calcDaylightHours(0.0, 23.44), 12.0);
  assert.equal(calcDaylightHours(0.0, -23.44), 12.0);

  // North Pole (90°N)
  assert.equal(calcDaylightHours(90.0, 23.44), 24.0, 'North pole summer solstice: 24h polar day');
  assert.equal(calcDaylightHours(90.0, -23.44), 0.0, 'North pole winter solstice: 0h polar night');

  // Arctic Circle (66.56°N)
  assert.equal(calcDaylightHours(66.56, 23.44), 24.0, 'Arctic circle summer solstice: 24h polar day');
  assert.equal(calcDaylightHours(66.56, -23.44), 0.0, 'Arctic circle winter solstice: 0h polar night');

  // Beijing (39.9°N)
  const bjSummerDay = calcDaylightHours(39.9, 23.44);
  const bjWinterDay = calcDaylightHours(39.9, -23.44);
  assert.ok(bjSummerDay > 14.5 && bjSummerDay < 15.5, 'Beijing summer daylight ~14.9h');
  assert.ok(bjWinterDay > 8.8 && bjWinterDay < 9.5, 'Beijing winter daylight ~9.1h');
});

test('What-If hypothesis: Zero axial tilt eliminates seasons', () => {
  const zeroTilt = 0.0;

  for (let f = 0; f <= 1.0; f += 0.1) {
    const subsolarLat = calcSubsolarLatitude(f, zeroTilt);
    assert.ok(Math.abs(subsolarLat) < 1e-9, 'Zero tilt means subsolar latitude is permanently 0.0°');

    // All non-polar latitudes permanently have 12.0h daylight
    const bjDay = calcDaylightHours(39.9, subsolarLat);
    assert.equal(bjDay, 12.0, 'Permanent 12.0h daylight at Beijing if no tilt');

    const londonDay = calcDaylightHours(51.5, subsolarLat);
    assert.equal(londonDay, 12.0, 'Permanent 12.0h daylight at London if no tilt');
  }
});

test('Story and academic stage synchronization', () => {
  assert.equal(STORIES.daynight.length, 5);
  assert.equal(STORIES.seasons.length, 5);
  assert.equal(ACADEMIC.daynight.length, 5);
  assert.equal(ACADEMIC.seasons.length, 5);

  assert.equal(stageAt(0.0, 'daynight'), 0);
  assert.equal(stageAt(0.30, 'daynight'), 1);
  assert.equal(stageAt(0.55, 'daynight'), 2);
  assert.equal(stageAt(0.80, 'daynight'), 3);
  assert.equal(stageAt(0.95, 'daynight'), 4);
});
