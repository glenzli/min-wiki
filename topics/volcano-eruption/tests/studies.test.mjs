import test from 'node:test';
import assert from 'node:assert/strict';
import { STUDIES, UNITS, studyRoute, sceneProgress, chapterForStudy, studyRenderer, defaultCase, nextStudy, initialStudyProgress } from '../studyModel.ts';
import { landState, constructionState } from '../projectModel.ts';
import { omuroFrame } from '../omuroJourney.ts';
import { magmaState } from '../magmaSystem.ts';
import { PRESETS } from '../model.ts';
import { eruptionFrame, lavaBranches, lavaRibbon } from '../eruptionGeometry.ts';

test('one entry opens a learning question without requiring a named volcano', () => {
  const entry = studyRoute('?lang=en');
  assert.equal(entry.study,'mechanism'); assert.equal(entry.chapter,'eruption');
  assert.equal(entry.progress,.08); assert.equal(new Set(UNITS.flatMap(x=>x.studies)).size,STUDIES.length);
  assert.deepEqual(UNITS.flatMap(x=>x.studies),STUDIES);
  for(const study of STUDIES) assert.equal(studyRoute(`?study=${study}`).study,study);
  assert.equal(nextStudy('mechanism'),'styles'); assert.equal(nextStudy('heat'),undefined);
});
test('registered Markdown anchors enter the same question and preserve explicit query intent', () => {
  for(const study of STUDIES)for(const lang of ['zh','en']) assert.equal(studyRoute(`?lang=${lang}`,`#study-${study}-${lang}`).study,study);
  assert.equal(studyRoute('?study=lake','#study-mechanism-zh').study,'lake');
  assert.equal(studyRoute('?study=../../escape','#unrelated').study,'mechanism');
});
test('first mountain-building play begins before intrusion, uplift and retained deposits', () => {
  for (const kind of ['shield', 'composite', 'scoria']) {
    const entry = studyRoute(`?study=building&case=${kind}`);
    const clock = sceneProgress(entry.study, entry.volcano, entry.progress);
    assert.equal(entry.progress, 0);
    assert.equal(landState(clock).growth, 0);
    assert.equal(constructionState(clock).intrusionFront, 0);
    assert.equal(constructionState(clock).uplift, 0);
  }
  const resume = studyRoute('?study=building&case=composite&progress=.58');
  assert.equal(resume.progress, .58, 'an explicit observation URL retains its experiment');
  const later = sceneProgress('building', 'composite', .12);
  assert.ok(constructionState(later).uplift > 0);
  assert.ok(landState(later).growth > 0);
});
test('legacy entries retain their scientific observation under the new question navigation', () => {
  assert.equal(studyRoute('?case=lake').study,'lake'); assert.equal(studyRoute('?case=submarine').study,'submarine');
  assert.equal(studyRoute('?case=shield&chapter=landscape').study,'building');
  assert.equal(studyRoute('?case=shield&chapter=landscape').progress,1);
  const formation=studyRoute('?case=scoria&chapter=eruption');
  assert.equal(formation.study,'building'); assert.equal(sceneProgress(formation.study,formation.volcano,formation.progress),.08);
  const ecology=studyRoute('?case=scoria&chapter=life'); assert.equal(ecology.study,'ecology'); assert.equal(ecology.progress,.5);
  assert.equal(studyRoute('?case=scoria&chapter=landscape').progress,1);
  assert.equal(studyRoute('?case=shield&view=exterior').study,'styles');
});
test('the construction question retains a complete cone without silently advancing ecology', () => {
  for(const kind of ['shield','composite']) {
    const end=landState(sceneProgress('building',kind,1));
    assert.equal(end.growth,1); assert.equal(end.vegetation,0); assert.equal(end.erosion,0);
  }
  const p=sceneProgress('building','scoria',1),end=omuroFrame(p,'wet','journey');
  assert.equal(p,.32); assert.equal(end.landGrowth,1); assert.equal(end.ecology.p,0);
  for(const p of [0,.5,1]) assert.equal(omuroFrame(p,'wet','life').landGrowth,1,'ecology keeps the already-built cone');
});
test('surface-style comparisons start only after all default preset pathways connect', () => {
  for(const preset of Object.values(PRESETS)) {
    const p=sceneProgress('styles','composite',0);
    assert.ok(magmaState(p,{...preset,resistance:.35}).connected);
    assert.equal(sceneProgress('styles','composite',1),1);
  }
  assert.equal(magmaState(sceneProgress('mechanism','composite',.08),{...PRESETS.fountain,resistance:.35}).connected,false);
});
test('the initial style inspection includes a developed lava channel on the existing mountain', () => {
  const settings={...PRESETS.flow,landform:'composite'},p=sceneProgress('styles','composite',initialStudyProgress('styles'));
  const frame=eruptionFrame(p,settings);
  assert.ok(frame.lavaVisible);
  assert.ok(lavaBranches(settings).some(branch=>lavaRibbon(frame.clock,settings,branch).length>1));
});
test('each question consumes the existing scientific owner with a bounded separate clock', () => {
  for(const study of STUDIES) {
    const volcano=defaultCase(study); assert.ok(studyRenderer(study,volcano)); assert.ok(chapterForStudy(study));
    for(const p of [-1,0,.4,1,2,NaN]) { const time=sceneProgress(study,volcano,p);assert.ok(time>=0&&time<=1); }
  }
  assert.notEqual(sceneProgress('building','composite',.5),sceneProgress('styles','composite',.5));
});

test('heat question milestone buttons sample the four actual groundwater stages', async () => {
  const {studyMilestones}=await import('../studyModel.ts');
  const {hydrothermalFrame}=await import('../hydrothermalModel.ts');
  assert.deepEqual(studyMilestones('heat').map(p=>hydrothermalFrame(p).stage),[0,1,2,3]);
});

test('hot springs open at the surface while an explicit groundwater cutaway remains reachable', () => {
  for (const query of ['?study=heat', '?study=heat&view=exterior', '?study=heat&view=landscape']) {
    const entry=studyRoute(query);
    assert.equal(entry.view,'landscape'); assert.equal(entry.progress,1);
  }
  assert.equal(studyRoute('?study=heat&view=section').view,'section');
  assert.equal(studyRoute('?study=styles&view=exterior').view,'exterior');
});

test('observation URLs restore independent camera/cutaway and bounded progress without changing the question', () => {
  const whole = studyRoute('?lang=en&study=mechanism&view=landscape&cutaway=0&progress=.413');
  assert.equal(whole.study, 'mechanism'); assert.equal(whole.view, 'landscape');
  assert.equal(whole.cutaway, false); assert.equal(whole.progress, .413);
  const vent = studyRoute('?study=mechanism&view=vent&cutaway=1&progress=.413');
  assert.equal(vent.view, 'vent'); assert.equal(vent.cutaway, true); assert.equal(vent.progress, whole.progress);
  assert.equal(studyRoute('?study=lake&view=vent&progress=NaN').view, 'section');
  assert.equal(studyRoute('?study=heat&progress=999').progress, 1);
  assert.equal(studyRoute('?study=styles&progress=-2').progress, 0);
  assert.equal(studyRoute('?study=mechanism&progress=').progress, .08);
});
