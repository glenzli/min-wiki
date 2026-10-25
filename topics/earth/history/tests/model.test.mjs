import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_STATE, EARTH_AGE_MA, EONS, EVENTS, GOE_INTERVAL, ICE_INTERVALS,
  MAX_OXYGEN_STEPS, OVERVIEW_MA, SOURCES, STRATIGRAPHY_BOUNDARIES, STRATIGRAPHY_VERSION, WINDOWS, ageAtFraction,
  historyParameters, nearestEvent, oxygenBudget, parseHistoryState,
  selectAge, selectEvent, selectZoom, serializeHistoryState, timeFraction,
} from '../model.ts';

const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} should be within ${epsilon} of ${expected}`);

test('the whole-Earth ruler and all age calculations share 4540 Ma', () => {
  assert.equal(EARTH_AGE_MA, 4540);
  assert.equal(OVERVIEW_MA, EARTH_AGE_MA);
  assert.equal(WINDOWS.all, EARTH_AGE_MA);
  assert.equal(EVENTS[0].ageMa, EARTH_AGE_MA);
  assert.equal(timeFraction(EARTH_AGE_MA), 0);
  assert.equal(timeFraction(0), 1);
  near(timeFraction(3000) - timeFraction(4000), timeFraction(1000) - timeFraction(2000));
});

test('zoom changes the ruler, preserving equal durations and resolvable human time', () => {
  for (const max of Object.values(WINDOWS)) {
    for (const fraction of [0, 0.125, 0.5, 0.75, 1]) near(timeFraction(ageAtFraction(fraction, max), max), fraction, 0.0011);
  }
  near(1 - timeFraction(0.3), 0.3 / EARTH_AGE_MA);
  near(1 - timeFraction(0.3, WINDOWS.human), 0.3);
  near(0.3 / EARTH_AGE_MA * 1000, 0.06607929515418502);
  assert.equal(ageAtFraction(-1, 3), 3);
  assert.equal(ageAtFraction(2, 3), 0);
  assert.equal(timeFraction(NaN), 0);
});

test('dated events and climate contexts are ordered, bounded and not instantaneous switches', () => {
  for (let i = 0; i < EVENTS.length; i++) {
    assert.ok(EVENTS[i].ageMa >= 0 && EVENTS[i].ageMa <= EARTH_AGE_MA);
    if (i) assert.ok(EVENTS[i].ageMa <= EVENTS[i - 1].ageMa);
  }
  for (const interval of [GOE_INTERVAL, ...ICE_INTERVALS]) {
    assert.ok(interval.oldMa > interval.youngMa);
    assert.ok(interval.oldMa <= EARTH_AGE_MA && interval.youngMa >= 0);
    near(timeFraction(interval.youngMa) - timeFraction(interval.oldMa), (interval.oldMa - interval.youngMa) / EARTH_AGE_MA);
  }
  assert.equal(EONS[0].oldMa, EARTH_AGE_MA);
  assert.equal(EONS.at(-1).youngMa, 0);
  for (let i = 1; i < EONS.length; i++) assert.equal(EONS[i - 1].youngMa, EONS[i].oldMa);
});

test('versioned period boundaries remain separate from rounded evidence landmarks and the Earth-age ruler', () => {
  assert.equal(STRATIGRAPHY_VERSION, '2026/06');
  assert.ok(SOURCES.timeChart.endsWith('ChronostratChart2026-06.pdf'));
  const boundaries = Object.fromEntries(STRATIGRAPHY_BOUNDARIES.map(boundary => [boundary.id, boundary]));
  assert.deepEqual([boundaries.cambrian.ageMa, boundaries.cambrian.uncertaintyMa], [538.8, 0.6]);
  assert.deepEqual([boundaries.ordovician.ageMa, boundaries.silurian.ageMa, boundaries.devonian.ageMa, boundaries.carboniferous.ageMa], [486.85, 443.1, 419.62, 358.86]);
  const event = id => EVENTS.find(item => item.id === id);
  assert.equal(event('cambrian').ageMa, 539);
  assert.deepEqual([event('ordovician').ageMa, event('ordovician').youngMa], [445, 443]);
  assert.equal(event('forests').ageMa, 386);
  assert.notEqual(EARTH_AGE_MA, 4567);
  const content = JSON.parse(readFileSync(new URL('../content.json', import.meta.url), 'utf8'));
  for (const language of ['zh', 'en']) {
    for (const boundary of STRATIGRAPHY_BOUNDARIES) assert.ok(content[language].periods[boundary.id]);
    assert.ok(content[language].events.cambrian.evidence.includes('508'));
    assert.ok(content[language].hadeanNote.includes('4567'));
  }
});

test('invalid URL state cannot introduce unknown events, windows or unsupported parameters', () => {
  const parsed = parseHistoryState({
    ageMa: 'Infinity', zoom: 'logarithmic', event: '<script>',
    oxygenSource: '1e2', oxygenRecycle: '15', oxygenSink: '-1', oxygenSteps: '25',
    rockEvidence: 'true', deepTime: 'OPEN', deepOxygen: 'open', unexpected: 'saved',
  });
  assert.deepEqual(parsed, { ...DEFAULT_STATE, deepOxygen: true });
  assert.ok(!('unexpected' in serializeHistoryState(parsed)));
  for (const invalid of ['NaN', ' 8 ', '08', '0x8', '', '-0', '+8', '13', '8.5']) {
    assert.equal(parseHistoryState({ oxygenSource: invalid }).oxygenSource, DEFAULT_STATE.oxygenSource);
  }
});

test('restored age and landmark must agree, while equal-age Moon and separation remain distinguishable', () => {
  assert.equal(parseHistoryState({ ageMa: '4500', event: 'moon' }).event, 'moon');
  assert.equal(parseHistoryState({ ageMa: '2400', event: 'humans' }).event, 'oxygen');
  assert.equal(nearestEvent(4500, 'moon').id, 'moon');
  assert.equal(parseHistoryState({ zoom: 'human', ageMa: '2400', event: 'oxygen' }).ageMa, 1);
  assert.equal(parseHistoryState({ ageMa: '0.30001' }).ageMa, DEFAULT_STATE.ageMa);
});

test('complete state round-trips and route changes preserve the independent oxygen experiment', () => {
  const state = {
    ...DEFAULT_STATE, ageMa: 4500, event: 'moon', oxygenSource: 12,
    oxygenRecycle: 30, oxygenSink: 1, oxygenSteps: 17,
    rockEvidence: true, deepTime: true, deepOxygen: true,
  };
  assert.deepEqual(parseHistoryState(serializeHistoryState(state)), state);
  const human = selectEvent(selectZoom(state, 'human'), 'humans');
  assert.equal(human.zoom, 'human');
  assert.equal(human.ageMa, 0.3);
  assert.equal(human.oxygenSteps, 17);
  assert.equal(human.rockEvidence, true);
  const ancient = selectEvent(human, 'life');
  assert.equal(ancient.zoom, 'all');
  assert.equal(ancient.ageMa, 3500);
  assert.deepEqual(historyParameters(ancient), historyParameters(state));
});

test('dragging is deterministic and reversible without changing an unrelated experiment', () => {
  const initial = { ...DEFAULT_STATE };
  const first = selectAge(initial, 1200);
  const back = selectAge(first, 3000);
  assert.deepEqual(selectAge(back, 1200), first);
  assert.equal(selectAge(initial, -100).ageMa, 0);
  assert.equal(selectAge(initial, 9000).ageMa, EARTH_AGE_MA);
  assert.equal(selectZoom(initial, 'animals').ageMa, 600);
});

test('positive production can be entirely consumed, without negative oxygen or a finite sink running out', () => {
  const frames = oxygenBudget({ source: 8, recyclePercent: 50, geologicalDemand: 6 }, MAX_OXYGEN_STEPS);
  for (const frame of frames.slice(1)) {
    assert.equal(frame.released, 8);
    assert.equal(frame.recycled, 4);
    assert.equal(frame.geologicalConsumed, 4);
    assert.equal(frame.stock, 0);
  }
  assert.equal(frames.at(-1).totalReleased, 192);
  assert.equal(frames.at(-1).totalGeological, 96);
});

test('changing only geological demand permits a genuine opposite outcome while consumption continues', () => {
  const sameSource = { source: 8, recyclePercent: 50 };
  const high = oxygenBudget({ ...sameSource, geologicalDemand: 6 }, 8).at(-1);
  const low = oxygenBudget({ ...sameSource, geologicalDemand: 2 }, 8).at(-1);
  assert.equal(high.stock, 0);
  assert.equal(low.stock, 16);
  assert.equal(low.geologicalConsumed, 2);
  assert.equal(low.recycled, 4);
  assert.equal(low.totalReleased, high.totalReleased);
});

test('every oxygen frame accounts for the same released oxygen and unmet demand never consumes nonexistent stock', () => {
  for (const source of [0, 1, 5, 8, 12]) {
    for (const recyclePercent of [0, 30, 50, 100]) {
      for (const geologicalDemand of [0, 2, 6, 12]) {
        for (const frame of oxygenBudget({ source, recyclePercent, geologicalDemand }, MAX_OXYGEN_STEPS)) {
          near(frame.totalReleased, frame.totalRecycled + frame.totalGeological + frame.stock);
          assert.ok(frame.stock >= 0);
          assert.ok(frame.geologicalConsumed <= frame.availableBeforeGeology + 1e-8);
          assert.ok(frame.geologicalConsumed <= geologicalDemand);
        }
      }
    }
  }
});

test('no photosynthetic source cannot create oxygen; complete aerobic recycling prevents net retention', () => {
  assert.equal(oxygenBudget({ source: 0, recyclePercent: 0, geologicalDemand: 0 }, 24).at(-1).stock, 0);
  assert.equal(oxygenBudget({ source: 12, recyclePercent: 100, geologicalDemand: 0 }, 24).at(-1).stock, 0);
  assert.equal(oxygenBudget({ source: 12, recyclePercent: 0, geologicalDemand: 0 }, 24).at(-1).stock, 288);
});

test('budget scrubbing recomputes the same history prefix without hidden elapsed time', () => {
  const parameters = { source: 11, recyclePercent: 30, geologicalDemand: 2 };
  const full = oxygenBudget(parameters, 24);
  assert.deepEqual(oxygenBudget(parameters, 9), full.slice(0, 10));
  assert.deepEqual(oxygenBudget(parameters, 24), full);
  assert.equal(oxygenBudget(parameters, 0)[0].stock, 0);
  for (const invalid of [NaN, Infinity, -1, 24.1, 25]) assert.throws(() => oxygenBudget(parameters, invalid), RangeError);
  assert.throws(() => oxygenBudget({ ...parameters, source: Infinity }, 1), RangeError);
  assert.throws(() => oxygenBudget({ ...parameters, recyclePercent: 101 }, 1), RangeError);
  assert.throws(() => oxygenBudget({ ...parameters, geologicalDemand: -1 }, 1), RangeError);
});

test('every selectable historical clue has equivalent language fields, evidence and primary source links', () => {
  const content = JSON.parse(readFileSync(new URL('../content.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(content.zh).sort(), Object.keys(content.en).sort());
  assert.deepEqual(Object.keys(content.zh.events).sort(), EVENTS.map(event => event.id).sort());
  assert.deepEqual(Object.keys(content.en.events).sort(), EVENTS.map(event => event.id).sort());
  for (const event of EVENTS) {
    for (const language of ['zh', 'en']) {
      const clue = content[language].events[event.id];
      for (const field of ['title', 'lead', 'mechanism', 'evidence', 'uncertainty', 'question']) assert.ok(clue[field]?.length > (field === 'title' ? 3 : 10), `${language}/${event.id}/${field}`);
      for (const source of event.sourceIds) {
        assert.ok(SOURCES[source]?.startsWith('https://'));
        assert.ok(content[language].sources[source]);
      }
    }
  }
  assert.doesNotMatch(JSON.stringify(content.en), /[\u3400-\u9fff]/);
  assert.doesNotMatch(JSON.stringify(content), /46亿|4\.6(?:[- ]billion)/);
});
