import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AQUIFER_CAPACITY, SOIL_CAPACITY, INITIAL_STORAGE, RIVER_HEAD, STEPS, advance, conditions, experiment, initialFrame, riverDirection, tracerBalance, waterBalance } from '../model.ts';
import { GroundwaterPlayback } from '../playback.ts';
import { headY, sceneMarkup, sceneValues } from '../scene.ts';
const content = JSON.parse(readFileSync(new URL('../content.json', import.meta.url), 'utf8'));
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('water and finite tracer budgets close at every step, including dry and saturated boundaries', () => {
  for (const rain of [0, .3, 1.2]) for (const permeability of [0, .05, .65, 1]) for (const pumping of [0, .4, 1.4]) for (const rainStopsAt of [24, 241]) {
    for (const frame of experiment({ rain, permeability, pumping, rainStopsAt })) {
      close(waterBalance(frame), 0); close(tracerBalance(frame), 0);
      assert.ok(frame.soil >= -1e-10 && frame.soil <= SOIL_CAPACITY + 1e-10);
      assert.ok(frame.storage >= -1e-10 && frame.storage <= AQUIFER_CAPACITY + 1e-10);
      assert.ok(frame.taggedSoil >= -1e-10 && frame.taggedSoil <= frame.soil + 1e-10);
      assert.ok(frame.taggedGround >= -1e-10 && frame.taggedGround <= frame.storage + 1e-10);
      close(frame.head, frame.storage / AQUIFER_CAPACITY);
    }
  }
});
test('rain enters soil before delayed aquifer recharge; stopping rain leaves a decaying tail', () => {
  const history = experiment({ rain: .8, permeability: .7, pumping: 0, rainStopsAt: 24 });
  assert.ok(history[1].flux.infiltration > history[1].flux.recharge);
  assert.ok(history[1].soil > 0);
  assert.equal(history[25].flux.infiltration, 0);
  assert.ok(history[25].flux.recharge > 0);
  assert.ok(history[60].flux.recharge < history[25].flux.recharge);
  assert.ok(history[60].flux.river > 0);
  assert.ok(history[240].head < history[24].head);
  close(history[240].totals.rain, 24 * .8);
});
test('zero rain is no recharge, not a mandatory replenishment cycle', () => {
  const history = experiment({ rain: 0, permeability: .65, pumping: 0 });
  assert.ok(history.every(frame => frame.flux.recharge === 0 && frame.soil === 0));
  assert.ok(history[240].storage < INITIAL_STORAGE);
  assert.ok(history[240].head >= RIVER_HEAD);
  assert.ok(history.every(frame => frame.totals.taggedInput === 0));
});
test('zero permeability freezes exchange and recharge; all new rainfall runs off', () => {
  const last = experiment({ rain: 1.2, permeability: 0, pumping: 0 }).at(-1);
  close(last.storage, INITIAL_STORAGE); close(last.soil, 0);
  close(last.totals.runoff, last.totals.rain);
  close(last.totals.recharge, 0); close(last.totals.riverOut, 0); close(last.totals.riverIn, 0);
  assert.equal(riverDirection(last), 'still');
  assert.equal(sceneValues(last).exchangeOpacity, 0);
});
test('river exchange obeys the head difference and pumping can reverse its sign', () => {
  const history = experiment({ rain: .25, permeability: .65, pumping: 1.2 });
  assert.ok(history.some(frame => riverDirection(frame) === 'toRiver'));
  assert.ok(history.some(frame => riverDirection(frame) === 'fromRiver'));
  for (const frame of history.slice(1)) {
    assert.ok(frame.flux.river * (frame.flux.exchangeHead - RIVER_HEAD) >= 0);
    assert.ok(frame.flux.river * (frame.head - RIVER_HEAD) >= -1e-12);
  }
  assert.ok(history.at(-1).totals.riverIn > 0);
  const forward = history.find(frame => frame.flux.river > 0);
  const reverse = history.find(frame => frame.flux.river < 0);
  assert.ok(sceneValues(forward).exchangePath.startsWith('M475'));
  assert.ok(sceneValues(reverse).exchangePath.startsWith('M726'));
});
test('an exactly matched head with no forcing produces exactly zero flow', () => {
  const previous = { ...initialFrame(), storage: RIVER_HEAD * AQUIFER_CAPACITY, head: RIVER_HEAD };
  const frame = advance(previous, { rain: 0, permeability: 1, pumping: 0 });
  assert.equal(frame.flux.river, 0); assert.equal(frame.storage, previous.storage);
});
test('pumping is limited to supply, reports unmet demand, and never creates negative water', () => {
  const last = experiment({ rain: 0, permeability: 0, pumping: 1.4 }).at(-1);
  assert.equal(last.storage, 0); assert.equal(last.flux.pumped, 0);
  assert.equal(last.flux.unmet, 1.4); close(last.totals.pumped, INITIAL_STORAGE);
});
test('large rainfall and weak permeability retain the runoff outlet at capacity', () => {
  const last = experiment({ rain: 1.2, permeability: .1, pumping: 0 }).at(-1);
  assert.ok(last.totals.runoff > 200);
  assert.ok(last.soil <= SOIL_CAPACITY && last.storage <= AQUIFER_CAPACITY);
});
test('changing physical conditions changes storage, flow and the tracer destination', () => {
  const wet = experiment({ rain: .8, permeability: .7, pumping: 0 }).at(-1);
  const pumping = experiment({ rain: .8, permeability: .7, pumping: 1.4 }).at(-1);
  const slow = experiment({ rain: .8, permeability: .05, pumping: 0 }).at(-1);
  assert.ok(wet.storage > pumping.storage);
  assert.ok(wet.totals.taggedRiver > pumping.totals.taggedRiver);
  assert.ok(pumping.totals.taggedPumped > 0);
  assert.ok(slow.totals.recharge < wet.totals.recharge);
});
test('only the initial eight steps are tagged and labels do not respawn or disappear', () => {
  const history = experiment({ rain: .8, permeability: .7, pumping: .2 });
  close(history[8].totals.taggedInput, .8 * 8);
  close(history[240].totals.taggedInput, history[8].totals.taggedInput);
  assert.ok(history[1].taggedSoil > 0 && history[8].taggedGround > 0);
  assert.ok(history[240].totals.taggedRiver > 0);
  assert.ok(history[240].taggedGround < history[80].taggedGround);
});
test('finite replay is deterministic; malformed conditions remain bounded', () => {
  assert.deepEqual(experiment({ rain: .8 }), experiment({ rain: .8 }));
  assert.equal(experiment({}, 100000).length, STEPS + 1);
  assert.equal(experiment({}, -1).length, 1);
  const invalid = conditions({ rain: NaN, pumping: Infinity, permeability: -Infinity, rainStopsAt: NaN });
  for (const value of Object.values(invalid)) assert.ok(Number.isFinite(value));
  assert.ok(experiment(invalid).every(frame => Number.isFinite(frame.storage)));
});
test('playback requires user start; inactive and hidden pauses retain experiment position', () => {
  const clock = new GroundwaterPlayback(STEPS);
  clock.play(); assert.equal(clock.running, false);
  clock.setActive(true); assert.equal(clock.running, false);
  clock.play(); clock.tick(); clock.tick();
  clock.setActive(false); assert.equal(clock.position, 2); assert.equal(clock.tick(), false);
  clock.setActive(true); assert.equal(clock.running, false);
  clock.play(); clock.setVisible(false); assert.equal(clock.tick(), false);
  clock.setVisible(true); assert.equal(clock.running, false); assert.equal(clock.position, 2);
  clock.seek(90); clock.play(); clock.tick(); assert.equal(clock.position, 91);
});
test('playback is finite, scrubbing pauses, and disposal cannot restart it', () => {
  const clock = new GroundwaterPlayback(3); clock.setActive(true); clock.play();
  for (let i = 0; i < 10; i++) clock.tick();
  assert.equal(clock.position, 3); assert.equal(clock.running, false);
  clock.play(); assert.equal(clock.position, 0); clock.tick(); clock.seek(2);
  assert.equal(clock.running, false); clock.dispose(); clock.play(); assert.equal(clock.tick(), false);
});
test('static section has stable grains and sample identities, no looping animation', () => {
  const svg = sceneMarkup(content.en, 'test-section');
  assert.equal(svg, sceneMarkup(content.en, 'test-section'));
  assert.equal((svg.match(/data-grain=/g) || []).length, 132);
  assert.equal((svg.match(/data-marker=/g) || []).length, 3);
  assert.ok(!svg.includes('<animate'));
  for (const frame of experiment({ rain: 0, pumping: 1.4, permeability: 0 })) {
    const values = sceneValues(frame);
    assert.ok(Object.values(values).every(value => typeof value !== 'number' || Number.isFinite(value)));
    close(values.y, headY(frame.head));
    assert.ok(values.height >= 0 && values.height <= 260);
  }
});
test('both languages preserve complete local authored content and scientific qualifications', () => {
  assert.deepEqual(Object.keys(content.zh), Object.keys(content.en));
  assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(content.en)));
  for (const language of ['zh', 'en']) for (const key of ['separate', 'boundary', 'limits', 'tracerIntro', 'losing']) assert.ok(content[language][key].length > 35);
  assert.ok(content.en.separate.includes('100 portions'));
  assert.ok(content.en.limits.includes('drinking-water'));
});
