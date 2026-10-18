import test from 'node:test';
import assert from 'node:assert/strict';
import { CHINA_CITIES } from '../data/seasonsData.ts';
import { solarGeometry } from '../physics/solarGeometry.ts';
import { cityDaylightReadout, clockText, daylightState, referenceClockHours, rotationAtReferenceClock } from '../physics/dayNightClock.ts';

test('UTC+8 teaching clock agrees with independent solar hour-angle geometry throughout each season', () => {
  for (const orbit of [0, .13, .25, .5, .75]) for (const tilt of [0, 12, 23.44]) for (const hour of [0, 3, 4.5, 6, 12, 18, 23.99, 24]) {
    const light = solarGeometry(orbit, rotationAtReferenceClock(orbit, tilt, hour), tilt);
    const clock = referenceClockHours(light.sunLocal);
    assert.ok(Math.min(Math.abs(clock - hour % 24), 24 - Math.abs(clock - hour % 24)) < 1e-9);
    for (const city of CHINA_CITIES) {
      const phi = city.lat * Math.PI / 180, delta = light.declination * Math.PI / 180;
      const hourAngle = (hour + (city.lon - 120) / 15 - 12) * Math.PI / 12;
      const expected = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle);
      const actual = cityDaylightReadout(city, light.sunLocal, light.declination);
      assert.ok(Math.abs(Math.sin(actual.altitude * Math.PI / 180) - expected) < 1e-10);
    }
  }
});

test('the China dawn comparison changes with season at a fixed reference clock', () => {
  const states = orbit => {
    const light = solarGeometry(orbit, rotationAtReferenceClock(orbit, 23.44, 4.5), 23.44);
    return Object.fromEntries(CHINA_CITIES.map(city => [city.id, cityDaylightReadout(city, light.sunLocal, light.declination)]));
  };
  const summer = states(.25), winter = states(.75);
  assert.equal(summer.harbin.state, 'day');
  assert.equal(summer.beijing.state, 'twilight');
  assert.equal(summer.shenzhen.state, 'night');
  assert.equal(summer.urumqi.state, 'night');
  assert.equal(summer.chengdu.state, 'night');
  assert.ok(summer.harbin.sunrise < summer.shenzhen.sunrise);
  assert.ok(winter.harbin.sunrise > winter.shenzhen.sunrise);
  assert.ok(summer.urumqi.sunrise > summer.beijing.sunrise);
  for (const city of Object.values(winter)) assert.equal(city.state, 'night');
});

test('displayed geometric sunrise lies on the same terminator as the globe', () => {
  for (const orbit of [0, .25, .5, .75]) for (const city of CHINA_CITIES) {
    const noon = solarGeometry(orbit, rotationAtReferenceClock(orbit, 23.44, 12), 23.44);
    const readout = cityDaylightReadout(city, noon.sunLocal, noon.declination);
    for (const hour of [readout.sunrise, readout.sunset]) {
      const light = solarGeometry(orbit, rotationAtReferenceClock(orbit, 23.44, hour), 23.44);
      assert.equal(cityDaylightReadout(city, light.sunLocal, light.declination).state, 'horizon');
    }
  }
});

test('twilight, polar boundaries and midnight do not imply measured darkness or ordinary sunrise', () => {
  assert.equal(daylightState(0), 'horizon');
  assert.equal(daylightState(-6), 'twilight');
  assert.equal(daylightState(-6.001), 'night');
  assert.equal(clockText(23.999), '00:00');
  assert.equal(clockText(24), '00:00');
  assert.equal(clockText(3.22, 5), '03:15');
  for (const orbit of [0, .25, .75]) {
    const light = solarGeometry(orbit, 0, 23.44);
    assert.equal(cityDaylightReadout({lat: 90, lon: 0}, light.sunLocal, light.declination).sunrise, null);
  }
});
