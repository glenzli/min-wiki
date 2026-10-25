import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INITIAL_ROCK, MATERIAL_TRACERS, MAX_STEPS, PROCESS_IDS,
  applyProcess, availableProcesses, chooseProcess, coolingTextures,
  currentRock, finishStep, frameStates, historySnapshots,
  parseRockState, redoStep, serializeRockState, visitStep,
} from '../model.ts';

const start = () => parseRockState({});
const step = (session, process) => finishStep(chooseProcess(session, process));

test('surface processes require exposure; burial alone changes no rock group', () => {
  assert.deepEqual(availableProcesses(INITIAL_ROCK), ['weather', 'bury', 'stay']);
  assert.throws(() => applyProcess(INITIAL_ROCK, 'heat'), RangeError);
  assert.throws(() => applyProcess(INITIAL_ROCK, 'melt'), RangeError);
  const buried = applyProcess(INITIAL_ROCK, 'bury');
  assert.equal(buried.form, 'igneous');
  assert.equal(buried.texture, INITIAL_ROCK.texture);
  assert.throws(() => applyProcess(buried, 'weather'), RangeError);
  assert.equal(applyProcess(buried, 'uplift').setting, 'surface');
  assert.deepEqual(INITIAL_ROCK, { materialId: 'parcel-a', form: 'igneous', setting: 'surface', texture: 'coarse' });
});

test('weathering, transport and lithification retain distinct prerequisites and outcomes', () => {
  const loose = applyProcess(INITIAL_ROCK, 'weather');
  assert.equal(loose.form, 'sediment');
  assert.equal(loose.setting, 'slope');
  assert.throws(() => applyProcess(loose, 'lithify'), RangeError);
  const deposited = applyProcess(loose, 'transport');
  assert.equal(deposited.form, 'sediment');
  assert.equal(deposited.setting, 'basin');
  const sedimentary = applyProcess(deposited, 'lithify');
  assert.equal(sedimentary.form, 'sedimentary');
  assert.equal(sedimentary.texture, 'cemented');
  assert.equal(sedimentary.materialId, INITIAL_ROCK.materialId);
});

test('metamorphism stays solid; melting makes magma and requires later solidification', () => {
  const buried = applyProcess(INITIAL_ROCK, 'bury');
  const metamorphic = applyProcess(buried, 'heat');
  assert.equal(metamorphic.form, 'metamorphic');
  assert.notEqual(metamorphic.texture, 'melt');
  const magma = applyProcess(metamorphic, 'melt');
  assert.equal(magma.form, 'magma');
  assert.equal(magma.texture, 'melt');
  assert.deepEqual(availableProcesses(magma), ['slowCool', 'fastCool', 'stay']);
  assert.equal(applyProcess(magma, 'slowCool').texture, 'coarse');
  assert.equal(applyProcess(magma, 'fastCool').texture, 'fine');
  assert.equal(applyProcess(magma, 'fastCool').setting, 'surface');
});

test('the same origin parcel survives different routes, repetition and stops without compulsory cycling', () => {
  const routes = [
    ['stay', 'stay', 'stay'],
    ['weather', 'transport', 'lithify', 'heat', 'heat', 'uplift', 'stay'],
    ['bury', 'melt', 'slowCool', 'melt', 'fastCool', 'weather'],
    ['bury', 'heat', 'uplift', 'bury', 'heat'],
  ];
  const tracerIds = MATERIAL_TRACERS.map(item => item.id);
  for (const route of routes) {
    const snapshots = historySnapshots(route);
    assert.equal(snapshots.length, route.length + 1);
    assert.ok(snapshots.every(snapshot => snapshot.materialId === 'parcel-a'));
  }
  assert.deepEqual(historySnapshots(routes[0]).at(-1), INITIAL_ROCK);
  assert.deepEqual(MATERIAL_TRACERS.map(item => item.id), tracerIds);
  assert.equal(new Set(tracerIds).size, 24);
  assert.notDeepEqual(historySnapshots(routes[1]).at(-1), historySnapshots(routes[2]).at(-1));
});

test('back, saved forward and branching keep a meaningful history rather than appending impossible steps', () => {
  let session = ['weather', 'transport', 'lithify'].reduce(step, start());
  assert.equal(session.cursor, 3);
  const original = serializeRockState(session);
  session = visitStep(session, 0);
  session = redoStep(session);
  assert.equal(currentRock(session).form, 'sediment');
  session = redoStep(redoStep(session));
  assert.deepEqual(serializeRockState(session), original);
  session = visitStep(session, 0);
  session = step(session, 'bury');
  assert.deepEqual(session.path, ['bury']);
  assert.equal(session.cursor, 1);
  assert.equal(currentRock(session).form, 'igneous');
  assert.equal(currentRock(session).setting, 'buried');
});

test('intermediate frames are reversible and serializable without committing a geological step', () => {
  let session = chooseProcess(start(), 'weather');
  session = { ...session, progress: 63, view: 'specimens', specimen: 'marble', mineral: 'calcite', cooling: 88, deep: true, panels: 7 };
  const first = frameStates(session);
  assert.equal(first.amount, .63);
  assert.equal(first.from.form, 'igneous');
  assert.equal(first.to.form, 'sediment');
  assert.equal(session.path.length, 0);
  assert.deepEqual(frameStates({ ...session, progress: 12, ...{ progress: 63 } }), first);
  assert.deepEqual(parseRockState(serializeRockState(session)), session);
});

test('URL restoration rejects unknown, oversized, ill-typed and physically impossible histories', () => {
  for (const rockPath of ['not-json', 'null', '{}', '["heat"]', '["weather","melt"]', '["__proto__"]', '[1]', ' '.repeat(1900), JSON.stringify(Array(49).fill('stay'))]) {
    assert.deepEqual(parseRockState({ rockPath }).path, []);
  }
  const raw = {
    rockPath: '["bury"]', rockCursor: '-1', rockProcess: 'weather', rockProgress: 'Infinity',
    rockView: '<script>', rockSpecimen: 'basalt<script>', rockMineral: '__proto__', rockDeep: 'true', rockCooling: '2e1',
  };
  const session = parseRockState(raw);
  assert.equal(session.cursor, 1);
  assert.equal(session.process, null);
  assert.equal(session.progress, 0);
  assert.equal(session.specimen, 'granite');
  assert.equal(session.mineral, 'quartz');
  assert.equal(session.view, 'journey');
  assert.equal(session.deep, false);
  assert.equal(session.cooling, 55);
  for (const value of ['101', '1.5', 'NaN', '-1', '001', '1e1']) assert.equal(parseRockState({ rockProcess: 'weather', rockProgress: value }).progress, 0);
});

test('history has a resource bound while older stops remain available for a new branch', () => {
  const full = Array.from({ length: MAX_STEPS }, () => 'stay').reduce(step, start());
  assert.equal(full.path.length, MAX_STEPS);
  assert.deepEqual(finishStep(chooseProcess(full, 'weather')), chooseProcess(full, 'weather'));
  assert.equal(step(visitStep(full, 4), 'weather').path.length, 5);
  assert.deepEqual(parseRockState(serializeRockState(full)), full);
});

test('cooling comparison changes texture, retains chemistry and handles input bounds', () => {
  assert.equal(coolingTextures(100).composition, 'silicic');
  assert.ok(coolingTextures(100).slow > coolingTextures(100).fast);
  assert.deepEqual(coolingTextures(-1), coolingTextures(0));
  assert.deepEqual(coolingTextures(200), coolingTextures(100));
  assert.deepEqual(coolingTextures(NaN), coolingTextures(0));
});

test('both languages provide the same mechanisms, qualifications and evidence layers', () => {
  const content = JSON.parse(readFileSync(new URL('../content.json', import.meta.url), 'utf8'));
  function keys(value) {
    if (!value || typeof value !== 'object') return typeof value;
    if (Array.isArray(value)) return value.map(keys);
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, keys(value[key])]));
  }
  assert.deepEqual(keys(content.zh), keys(content.en));
  for (const language of ['zh', 'en']) for (const id of PROCESS_IDS) {
    assert.ok(content[language].processes[id].condition.length > 10);
    assert.ok(content[language].processEvidence[id].evidence.length > 10);
    assert.ok(content[language].processEvidence[id].time.length > 10);
  }
  assert.equal(Object.keys(content.en.specimens).length, 7);
});
