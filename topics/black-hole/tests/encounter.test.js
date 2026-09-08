import test from 'node:test';
import assert from 'node:assert/strict';
import { orbitAt, SCENARIOS, MU, TIDAL_RADIUS, Playback, motionProgress, playbackProgress } from '../physics/encounter.ts';
import { STORIES, ACADEMIC, stageAt } from '../story.ts';

for (const scenario of Object.keys(SCENARIOS).filter(key=>!SCENARIOS[key].noBlackHole)) {
  test(`${scenario}: continuous orbit, conserved energy and angular momentum`, () => {
    const q = SCENARIOS[scenario].pericenter;
    let prior;
    for (let i = 0; i <= 1000; i++) {
      const p = orbitAt(i / 1000 * SCENARIOS[scenario].orbitEnd, scenario);
      assert.ok(Object.values(p).every(Number.isFinite));
      assert.ok(Math.abs((p.vx ** 2 + p.vy ** 2) / 2 - MU / p.radius) < 1e-10);
      assert.ok(Math.abs(p.x * p.vy - p.y * p.vx + Math.sqrt(2 * MU * q)) < 1e-9);
      assert.ok(p.radius >= q - 1e-10);
      if (prior) assert.ok(Math.hypot(p.x - prior.x, p.y - prior.y) < 0.5);
      prior = p;
    }
    const near = orbitAt(SCENARIOS[scenario].orbitEnd / 2, scenario);
    const far = orbitAt(0, scenario);
    assert.ok(Math.abs(near.radius - q) < 1e-10);
    assert.ok(Math.hypot(near.vx, near.vy) > Math.hypot(far.vx, far.vy));
    assert.ok(scenario === 'flyby' ? q > TIDAL_RADIUS : q < TIDAL_RADIUS);
  });
}

test('no-black-hole control shares the flyby initial state and moves uniformly', () => {
  const start=orbitAt(0,'free'), reference=orbitAt(0,'flyby');
  for (const key of ['x','y','z','vx','vy']) assert.equal(start[key],reference[key]);
  assert.equal(SCENARIOS.free.duration,SCENARIOS.flyby.duration);
  const middle=orbitAt(.5,'free'), end=orbitAt(1,'free');
  for (const key of ['x','y']) assert.ok(Math.abs(2*middle[key]-start[key]-end[key])<1e-10);
  for (let i=0;i<=100;i++) {
    const state=orbitAt(i/100,'free');
    assert.ok(Object.values(state).every(Number.isFinite));
    assert.equal(state.vx,start.vx); assert.equal(state.vy,start.vy);
    assert.ok(Math.abs((state.x-start.x)*start.vy-(state.y-start.y)*start.vx)<1e-9);
  }
  assert.ok(Math.hypot(end.x-orbitAt(1,'flyby').x,end.y-orbitAt(1,'flyby').y)>20);
});

test('pause, seek, speed and completion share one bounded clock', () => {
  const player = new Playback();
  player.seek(0.4); player.tick(10);
  assert.equal(player.progress, 0.4);
  player.playing = true; player.speed = 2; player.tick(4.8);
  assert.ok(Math.abs(player.progress - 0.6) < 1e-10);
  player.tick(100);
  assert.equal(player.progress, 1); assert.equal(player.playing, false);
  player.seek(-5); assert.equal(player.progress, 0);
  player.select('tidal'); assert.equal(player.progress, 0);
});

test('both reading modes cover every shared story phase, including endpoints', () => {
  for (const scenario of Object.keys(SCENARIOS)) {
    assert.equal(STORIES[scenario].length, ACADEMIC[scenario].length);
    assert.equal(stageAt(0, scenario), 0);
    assert.equal(stageAt(1, scenario), 4);
    STORIES[scenario].forEach((phase, index) => {
      const progress = playbackProgress(phase.at, scenario);
      assert.equal(stageAt(progress, scenario), index);
      assert.ok(ACADEMIC[scenario][index].formula);
      assert.ok(ACADEMIC[scenario][index].teach);
      if (index) assert.equal(stageAt(progress-1e-6, scenario), index-1);
    });
  }
});

test('long observation interval preserves encounter pace and slows without a jump', () => {
  for (const scenario of ['tidal', 'deep']) {
    const duration = SCENARIOS[scenario].duration;
    assert.equal(duration, 120);
    assert.ok((1-playbackProgress(0.86, scenario))*duration > 60);
    assert.equal(motionProgress(30/duration, scenario), 0.5);
    assert.ok(Math.abs(motionProgress(1, scenario) - 1.2) < 1e-12);
    for (const seconds of [54, 66]) {
      const at = t => motionProgress(t/duration, scenario);
      const left = (at(seconds)-at(seconds-0.001))/0.001;
      const right = (at(seconds+0.001)-at(seconds))/0.001;
      assert.ok(Math.abs(left-right) < 1e-7);
    }
    const player = new Playback();
    player.select(scenario); player.playing = true;
    player.tick(60);
    assert.equal(player.progress, 0.5);
    assert.equal(player.playing, true);
    player.tick(60);
    assert.equal(player.progress, 1);
    assert.equal(player.playing, false);
    player.tick(60);
    assert.equal(player.progress, 1);
  }
});
