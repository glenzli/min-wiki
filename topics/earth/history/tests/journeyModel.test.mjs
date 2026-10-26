import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_STATE, EARTH_AGE_MA, EVENTS, parseHistoryState, serializeHistoryState } from '../model.ts';
import { HISTORY_OBSERVATION_HOLD, HISTORY_STATIONS, HISTORY_STATION_IDS, journeyFrame, journeyFraction, journeySample } from '../journeyModel.ts';

const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);
const steps = HISTORY_STATIONS.length - 1;
const content = JSON.parse(readFileSync(new URL('../journeyContent.json', import.meta.url), 'utf8'));

test('twelve representative stops preserve legacy identities, ages and all ten old saved keys', () => {
  assert.deepEqual(HISTORY_STATIONS.map(stop => stop.id), HISTORY_STATION_IDS);
  assert.equal(HISTORY_STATIONS.length, 12);
  assert.deepEqual(EVENTS.map(event => [event.id, event.ageMa]), [
    ['formation',4540], ['separation',4500], ['moon',4500], ['water',4400], ['life',3500], ['oxygen',2400],
    ['huronian',2300], ['eukaryotes',1800], ['multicellular',1047], ['cryogenian',720], ['ediacaran',580],
    ['cambrian',539], ['plants',470], ['ordovician',445], ['arthropods',425], ['forests',386], ['devonian',372],
    ['tetrapods',365], ['paleoIce',320], ['permian',252], ['triassic',201], ['cretaceous',66], ['antarctic',34],
    ['quaternary',2.58], ['humans',.3], ['lgm',.021], ['megafauna',.012], ['today',0],
  ]);
  for (const stop of HISTORY_STATIONS) assert.equal(stop.ageMa, EVENTS.find(event => event.id === stop.id).ageMa);
  const before = serializeHistoryState({ ...DEFAULT_STATE, ageMa:4500, event:'moon', oxygenSteps:17, deepTime:true });
  journeyFrame(4500, 'moon', 2 / steps);
  assert.deepEqual(serializeHistoryState(parseHistoryState(before)), before);
  assert.deepEqual(Object.keys(before), ['ageMa','zoom','event','oxygenSource','oxygenRecycle','oxygenSink','oxygenSteps','rockEvidence','deepTime','deepOxygen']);
});

test('every exact equally spaced display stop selects its exact event, including both 4500 Ma identities', () => {
  for (let index = 0; index < HISTORY_STATIONS.length; index++) {
    const stop = HISTORY_STATIONS[index], fraction = index / steps;
    const sample = journeySample(fraction), frame = journeyFrame(sample.ageMa, sample.eventId, sample.fraction);
    assert.equal(sample.ageMa, stop.ageMa);
    assert.equal(sample.eventId, stop.id);
    assert.equal(frame.stationId, stop.id);
    assert.equal(frame.stationIndex, index);
    assert.equal(frame.mode, stop.mode);
    assert.equal(frame.evidenceKind, stop.evidenceKind);
    near(journeyFraction(stop.ageMa, stop.id), fraction);
    assert.equal(frame.progress, index === steps ? 1 : 0);
  }
  const held = journeySample(1.5 / steps);
  assert.deepEqual(held, { ageMa:4500, eventId:'separation', fraction:1.5 / steps });
  near(journeyFrame(held.ageMa, held.eventId, held.fraction).progress, .5);
  near(journeyFraction(held.ageMa, held.eventId), 1 / steps);
  assert.equal(journeySample(2 / steps).eventId, 'moon');
});

test('finite sampling follows geological order while display intervals deliberately have different geological rates', () => {
  let previousAge = EARTH_AGE_MA;
  for (let index = 0; index <= 2048; index++) {
    const sample = journeySample(index / 2048);
    assert.ok(sample.ageMa <= previousAge);
    assert.ok(sample.ageMa >= 0 && sample.ageMa <= EARTH_AGE_MA);
    assert.equal(parseHistoryState({ ageMa:String(sample.ageMa), event:sample.eventId }).event, sample.eventId);
    previousAge = sample.ageMa;
  }
  assert.equal(journeySample(0).ageMa, EARTH_AGE_MA);
  assert.equal(journeySample(1).ageMa, 0);
  const earlySpan = journeySample(0).ageMa - journeySample(1 / steps).ageMa;
  const middleSpan = journeySample(4 / steps).ageMa - journeySample(5 / steps).ageMa;
  assert.notEqual(earlySpan, middleSpan, 'equal display intervals are not equal geological durations');
});

test('legacy seven-decimal cursors restore all twelve exact station identities and observation-hold ends', () => {
  for (let index = 0; index < HISTORY_STATIONS.length; index++) {
    const stop = HISTORY_STATIONS[index];
    const fraction = Number((index / steps).toFixed(7));
    const sample = journeySample(fraction);
    assert.deepEqual([sample.ageMa, sample.eventId], [stop.ageMa, stop.id], stop.id);
    const frame = journeyFrame(stop.ageMa, stop.id, fraction);
    assert.equal(frame.stationId, stop.id, stop.id);
    assert.equal(frame.stationIndex, index);
    assert.equal(frame.mode, stop.mode);
    assert.equal(frame.evidenceKind, stop.evidenceKind);
    assert.equal(frame.progress, index === steps ? 1 : 0);
    if (index === steps) continue;
    const holdFraction = Number(((index + HISTORY_OBSERVATION_HOLD) / steps).toFixed(7));
    const held = journeySample(holdFraction);
    assert.deepEqual([held.ageMa, held.eventId], [stop.ageMa, stop.id], `${stop.id} hold end`);
    const heldFrame = journeyFrame(stop.ageMa, stop.id, holdFraction);
    assert.equal(heldFrame.stationId, stop.id);
    assert.equal(heldFrame.progress, HISTORY_OBSERVATION_HOLD);
    assert.deepEqual(heldFrame.cues, journeyFrame(stop.ageMa, stop.id).cues);
  }
});

test('named observation holds keep Moon, KPg and every representative age visible while local phase advances', () => {
  assert.equal(HISTORY_OBSERVATION_HOLD, .45);
  for (let index = 0; index < steps; index++) {
    const stop = HISTORY_STATIONS[index], next = HISTORY_STATIONS[index + 1];
    const initial = journeyFrame(stop.ageMa, stop.id);
    for (const phase of [.1, .3, HISTORY_OBSERVATION_HOLD]) {
      const fraction = (index + phase) / steps, sample = journeySample(fraction);
      assert.equal(sample.ageMa, stop.ageMa, stop.id);
      assert.equal(sample.eventId, stop.id, stop.id);
      const frame = journeyFrame(sample.ageMa, sample.eventId, fraction);
      near(frame.progress, phase);
      assert.equal(frame.stationId, stop.id);
      assert.deepEqual(frame.cues, initial.cues, 'observation motion must not advance global cue profiles');
    }
    const afterHold = journeySample((index + .6) / steps);
    if (stop.ageMa > next.ageMa) assert.ok(afterHold.ageMa < stop.ageMa, `${stop.id} must leave after observing`);
    else assert.deepEqual([afterHold.ageMa, afterHold.eventId], [4500, 'separation']);
  }
});

test('nonexact-age inverse mapping enters the accelerated transition while exact station ages restore its start', () => {
  for (let index = 0; index < steps; index++) {
    const older = HISTORY_STATIONS[index], younger = HISTORY_STATIONS[index + 1];
    near(journeyFraction(older.ageMa, older.id), index / steps);
    if (older.ageMa === younger.ageMa) continue;
    const age = Math.round((older.ageMa + younger.ageMa) / 2 * 1000) / 1000;
    const expected = (index + .45 + .5 * .55) / steps;
    const sampled = journeySample(expected);
    near(journeyFraction(age, sampled.eventId), expected);
    assert.equal(sampled.ageMa, age);
  }
});

test('seeking forward, backward and forward gives the same frames without a hidden advancing state', () => {
  const fractions = [.025, 1.7 / steps, .284, .51, .71, .912, 2.3 / steps, 10.3 / steps, 1];
  const render = f => { const sample = journeySample(f); return journeyFrame(sample.ageMa, sample.eventId, f); };
  const forward = fractions.map(render);
  fractions.toReversed().map(render);
  assert.deepEqual(fractions.map(render), forward);
  const one = render(.51);
  one.cues.ice = -100;
  assert.deepEqual(render(.51), forward[3], 'consumer mutation cannot alter later projections');
});

test('cue intensities remain bounded and continuous at all representative boundaries, including the equal-age pair', () => {
  for (let index = 0; index <= 1024; index++) {
    const sample = journeySample(index / 1024), frame = journeyFrame(sample.ageMa, sample.eventId, sample.fraction);
    assert.ok(Number.isFinite(frame.progress) && frame.progress >= 0 && frame.progress <= 1);
    assert.equal(frame.journeyFraction, sample.fraction);
    for (const value of Object.values(frame.cues)) assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
  }
  const render = f => { const s = journeySample(f); return journeyFrame(s.ageMa, s.eventId, s.fraction); };
  for (let index = 1; index < steps; index++) {
    const left = render(index / steps - 1e-7), right = render(index / steps + 1e-7);
    for (const key of Object.keys(left.cues)) near(left.cues[key], right.cues[key], 1e-8);
  }
  for (let index = 0; index < steps; index++) {
    const holdEnd = (index + HISTORY_OBSERVATION_HOLD) / steps;
    const before = render(holdEnd - 1e-7), after = render(holdEnd + 1e-7);
    for (const key of Object.keys(before.cues)) near(before.cues[key], after.cues[key], 1e-8);
  }
});

test('a transient display cursor is accepted only for the same normalized scientific age and event', () => {
  const base = journeyFrame(2400, 'oxygen');
  for (const cursor of [0, .9, NaN, Infinity, -Infinity]) assert.deepEqual(journeyFrame(2400, 'oxygen', cursor), base);
  assert.deepEqual(journeyFrame(4500, 'moon', 1.5 / steps), journeyFrame(4500, 'moon'));
  const sample = journeySample(.417);
  const frame = journeyFrame(sample.ageMa, sample.eventId, sample.fraction);
  near(frame.journeyFraction, .417);
  assert.equal(frame.ageMa, sample.ageMa);
  assert.equal(frame.eventId, sample.eventId);
  assert.equal(journeyFrame(-3, 'today').ageMa, 0);
  assert.equal(journeyFrame(1e9, 'formation').ageMa, EARTH_AGE_MA);
  assert.deepEqual(journeyFrame(NaN, 'oxygen'), base);
  assert.equal(journeySample(-100).fraction, 0);
  assert.equal(journeySample(100).fraction, 1);
  assert.equal(journeySample(NaN).fraction, 0);
});

test('both languages qualify every globe, plausible local example and enlarged evidence construction with linked sources', () => {
  assert.deepEqual(Object.keys(content.zh).sort(), Object.keys(content.en).sort());
  for (const locale of ['zh','en']) {
    const local = content[locale];
    assert.deepEqual(Object.keys(local.stages).sort(), [...HISTORY_STATION_IDS].sort());
    for (const lens of ['globe','local','evidence']) {
      assert.ok(local.views[lens].length > 2);
      assert.ok(local.viewQualifications[lens].length > 20);
    }
    for (const id of HISTORY_STATION_IDS) {
      const entry = local.stages[id];
      for (const field of ['label','question','seeing','local','evidence','qualification']) assert.ok(entry[field]?.length > 10, `${locale}/${id}/${field}`);
      assert.ok(['observation','inference','hypothesis'].includes(entry.scienceClass));
      assert.ok(entry.sourceIds.length >= 2);
      for (const sourceId of entry.sourceIds) {
        const source = content.sources[sourceId];
        assert.ok(source?.title && source.access.length > 10, `${id}/${sourceId}`);
        assert.equal(new URL(source.url).protocol, 'https:');
      }
    }
    assert.equal(local.stages.moon.scienceClass, 'hypothesis');
    assert.equal(local.stages.today.scienceClass, 'observation');
    assert.equal(local.stages.water.scienceClass, 'inference');
    for (const key of ['playbackQualification','cueQualification','continuity']) assert.ok(local[key].length > 30);
  }
  for (const id of HISTORY_STATION_IDS) {
    assert.equal(content.zh.stages[id].scienceClass, content.en.stages[id].scienceClass);
    assert.deepEqual(content.zh.stages[id].sourceIds, content.en.stages[id].sourceIds);
  }
  assert.match(content.en.stages.moon.qualification, /leading.*hypothesis/);
  assert.match(content.en.stages.water.qualification, /indirect.*not a global ocean map/);
  assert.match(content.en.stages.life.qualification, /origin is not dated/);
  assert.match(content.en.stages.cryogenian.qualification, /separate glaciations/);
  assert.match(content.en.viewQualifications.evidence, /Enlarged teaching models, not sample photographs or scans/);
  assert.match(content.en.playbackQualification, /rather than a geological rate/);
  assert.match(content.en.playbackQualification, /observation.*accelerated/);
  assert.match(content.zh.playbackQualification, /停留观察.*加速/);
  assert.doesNotMatch(JSON.stringify(content.en), /[\u3400-\u9fff]/);
  const registered = new Set(JSON.parse(readFileSync(new URL('../../../../wiki.json', import.meta.url), 'utf8')).entries.map(entry => entry.id));
  assert.deepEqual(content.zh.links.map(link => link.topicId), content.en.links.map(link => link.topicId));
  for (const link of content.en.links) assert.ok(registered.has(link.topicId));
});
