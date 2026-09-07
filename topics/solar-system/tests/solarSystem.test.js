import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUN_DATA,
  PLANETS_DATA,
  getVisualOrbitRadius,
  getVisualPlanetRadius,
  getTrueScaleLineupRadius,
  getLineupPositionX
} from '../data/planetsData.js';
import { STORIES, ACADEMIC, stageAt, SCENARIO_DESCRIPTIONS } from '../story.js';

test('Planetary dataset integrity', () => {
  assert.equal(PLANETS_DATA.length, 8, 'There should be exactly 8 major planets');
  assert.ok(SUN_DATA.diameterKm > 1000000, 'Sun diameter must exceed 1,000,000 km');
  assert.equal(SUN_DATA.nameZh, '太阳');

  for (const planet of PLANETS_DATA) {
    assert.ok(planet.id, 'Planet must have an id');
    assert.ok(planet.nameZh, 'Planet must have a Chinese name');
    assert.ok(planet.nameEn, 'Planet must have an English name');
    assert.ok(planet.semiMajorAxisAU > 0, `${planet.nameZh} semiMajorAxisAU must be positive`);
    assert.ok(planet.orbitalPeriodYears > 0, `${planet.nameZh} orbitalPeriodYears must be positive`);
    assert.ok(planet.relativeEarthDiameter > 0, `${planet.nameZh} relativeEarthDiameter must be positive`);
    assert.ok(planet.diameterKm > 0, `${planet.nameZh} diameterKm must be positive`);
    assert.ok(planet.colorHex.startsWith('#'), `${planet.nameZh} colorHex must be a hex color`);
  }
});

test("Kepler's Third Law (T² / a³ ≈ 1.0 AU³/yr²)", () => {
  for (const planet of PLANETS_DATA) {
    const a = planet.semiMajorAxisAU;
    const T = planet.orbitalPeriodYears;
    const ratio = (T * T) / (a * a * a);
    assert.ok(
      Math.abs(ratio - 1.0) < 0.03,
      `${planet.nameZh} must satisfy Kepler's 3rd Law (ratio was ${ratio})`
    );
  }
});

test('Orbital distance and period monotonicity', () => {
  for (let i = 1; i < PLANETS_DATA.length; i++) {
    const prev = PLANETS_DATA[i - 1];
    const curr = PLANETS_DATA[i];

    assert.ok(
      curr.semiMajorAxisAU > prev.semiMajorAxisAU,
      `Semi-major axis must increase: ${curr.nameZh} > ${prev.nameZh}`
    );
    assert.ok(
      curr.orbitalPeriodYears > prev.orbitalPeriodYears,
      `Orbital period must increase: ${curr.nameZh} > ${prev.nameZh}`
    );
  }
});

test('True physical relative size hierarchy', () => {
  const earth = PLANETS_DATA.find(p => p.id === 'earth');
  const jupiter = PLANETS_DATA.find(p => p.id === 'jupiter');
  const saturn = PLANETS_DATA.find(p => p.id === 'saturn');
  const uranus = PLANETS_DATA.find(p => p.id === 'uranus');
  const neptune = PLANETS_DATA.find(p => p.id === 'neptune');
  const mercury = PLANETS_DATA.find(p => p.id === 'mercury');
  const mars = PLANETS_DATA.find(p => p.id === 'mars');

  assert.equal(earth.relativeEarthDiameter, 1.0, 'Earth relative diameter is 1.0 baseline');
  assert.ok(jupiter.relativeEarthDiameter > 10.5 && jupiter.relativeEarthDiameter < 11.5, 'Jupiter is ~11x Earth diameter');
  assert.ok(saturn.relativeEarthDiameter > 9.0, 'Saturn is >9x Earth diameter');
  assert.ok(uranus.relativeEarthDiameter > 3.9 && uranus.relativeEarthDiameter < 4.2);
  assert.ok(neptune.relativeEarthDiameter > 3.8 && neptune.relativeEarthDiameter < 4.1);
  assert.ok(mercury.relativeEarthDiameter < 0.4, 'Mercury is smallest planet');
  assert.ok(mars.relativeEarthDiameter < 0.6, 'Mars is ~half Earth size');

  // Hierarchy: Jupiter > Saturn > Uranus > Neptune > Earth > Venus > Mars > Mercury
  assert.ok(jupiter.diameterKm > saturn.diameterKm);
  assert.ok(saturn.diameterKm > uranus.diameterKm);
  assert.ok(uranus.diameterKm > earth.diameterKm);
  assert.ok(earth.diameterKm > mars.diameterKm);
  assert.ok(mars.diameterKm > mercury.diameterKm);
});

test('Visual and true scale calculation functions', () => {
  // 1. Orbit visual radii: monotonically increasing and compressed
  let prevVisualOrbit = 0;
  for (const p of PLANETS_DATA) {
    const vo = getVisualOrbitRadius(p.semiMajorAxisAU);
    assert.ok(vo > prevVisualOrbit, 'Visual orbit radius must increase monotonically');
    assert.ok(vo >= 16 && vo <= 170, 'Visual orbit must stay within comfortable viewing frustum');
    prevVisualOrbit = vo;
  }

  // 2. Lineup positions: strictly monotonically increasing along X axis
  let prevX = -999;
  for (const planet of PLANETS_DATA) {
    const x = getLineupPositionX(planet.index);
    assert.ok(x > prevX, `Lineup X position must advance from left to right for ${planet.nameZh}`);
    prevX = x;
  }

  // 3. True scale lineup radius preserves exact linear physical ratio
  const earthTrueR = getTrueScaleLineupRadius(1.0);
  const jupiterData = PLANETS_DATA.find(p => p.id === 'jupiter');
  const jupiterTrueR = getTrueScaleLineupRadius(jupiterData.relativeEarthDiameter);
  const measuredRatio = jupiterTrueR / earthTrueR;
  assert.ok(
    Math.abs(measuredRatio - jupiterData.relativeEarthDiameter) < 0.001,
    'True scale lineup must strictly preserve exact physical diameter ratio'
  );
});

test('Story and academic stage synchronization', () => {
  assert.ok(STORIES.orbit.length === 5, 'Orbit story has 5 stages');
  assert.ok(STORIES.lineup.length === 5, 'Lineup story has 5 stages');
  assert.ok(ACADEMIC.orbit.length === 5, 'Academic orbit has 5 stages');
  assert.ok(ACADEMIC.lineup.length === 5, 'Academic lineup has 5 stages');

  assert.equal(stageAt(0.0, 'orbit'), 0);
  assert.equal(stageAt(0.23, 'orbit'), 1);
  assert.equal(stageAt(0.50, 'orbit'), 2);
  assert.equal(stageAt(0.70, 'orbit'), 3);
  assert.equal(stageAt(0.95, 'orbit'), 4);
});
