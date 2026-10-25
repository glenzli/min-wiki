import test from 'node:test';
import assert from 'node:assert/strict';
import { BURIALS, COMMUNITIES, DATA, DEPOSITS, FOSSIL_STOPS, LENSES, REMAINS, SAMPLES, communityById, focusedNode, fossilExperiment, fossilSummary, fossilTimeline, nodeStatus, parseState, serializeState, visibleLinks } from '../model.ts';

test('all community graphs resolve identities and keep bilingual evidence qualifications', () => {
  assert.equal(DATA.communities.length, COMMUNITIES.length);
  for (const c of DATA.communities) {
    const ids = new Set(c.nodes.map(n => n.id));
    assert.equal(ids.size, c.nodes.length);
    assert.ok(c.nodes.length >= 4);
    for (const field of ['title','age','setting','question','mechanism','change','uncertainty','boundary']) {
      assert.ok(c[field].zh.length > 0); assert.ok(c[field].en.length > 0); assert.doesNotMatch(c[field].en, /[\u3400-\u9fff]/);
    }
    for (const n of c.nodes) {
      for (const field of ['record','inference','uncertainty']) { assert.ok(n[field].zh.length > 15); assert.ok(n[field].en.length > 45); }
      assert.ok(n.evidence.length > 0); assert.ok(n.evidence.every(e => LENSES.includes(e)));
    }
    for (const link of c.links) { assert.ok(ids.has(link.from)); assert.ok(ids.has(link.to)); assert.ok(link.caveat.en.length > 15); }
    for (const id of c.refs) assert.equal(new URL(DATA.references[id].url).protocol, 'https:');
  }
});
test('URL parsing rejects unknown states, foreign taxa, malformed/oversized JSON and nonliteral phases', () => {
  const s = parseState({ view:'oops', community:'__proto__', lens:'unknown', phase:'1.0', focus:'{"cambrian":"nonavian","unknown":"photo"}', deposit:'ocean', sample:'all', detail:'microscope' });
  assert.equal(s.community, 'cambrian'); assert.equal(s.view, 'community'); assert.equal(s.phase, 0);
  assert.equal(focusedNode(s).id, 'anomalocaris'); assert.equal(s.deposit, 'marine'); assert.equal(s.sample, 'small');
  assert.deepEqual(parseState({ focus:'[' }).focus, parseState({ focus:'x'.repeat(4000) }).focus);
  const raw = serializeState(s); assert.equal(Object.keys(raw).length, 12);
  assert.ok(Object.values(raw).every(v => typeof v === 'string' && v.length <= 3072));
  assert.deepEqual(parseState(raw), s);
});
test('finite fossil sequence keeps identities, hides unassessed results and exposes exactly the model endpoint', () => {
  for (const deposit of DEPOSITS) for (const burial of BURIALS) for (const sample of SAMPLES) {
    const records = fossilExperiment({ deposit, burial, sample }), counts = fossilSummary(records);
    for (const progress of [0, 17, 33, 48, 67, 84, 100]) {
      const f = fossilTimeline(records, progress);
      assert.deepEqual(f.tokens.map(t => t.id), REMAINS.map(r => r.id));
      assert.equal(f.found, progress < 100 ? null : counts.found);
      assert.ok(f.tokens.every(t => t.column >= 0 && t.column <= 3 && t.opacity >= .09 && t.opacity <= 1));
      if (progress === 100) records.forEach((r,i) => {
        assert.equal(f.tokens[i].column, {'source-gap':0,destroyed:1.6,uncollected:2,found:3}[r.fate]);
        assert.equal(f.tokens[i].assessed,true);
      });
    }
  }
});
test('scrubbing is deterministic and reversible as an explanation, without changing model fates', () => {
  const records = fossilExperiment({ deposit:'marine', burial:'exposed', sample:'small' });
  const middle = fossilTimeline(records,48), end = fossilTimeline(records,100);
  fossilTimeline(records,0);
  assert.deepEqual(fossilTimeline(records,48), middle);
  assert.equal(end.arrived,8); assert.equal(end.retained,2); assert.equal(end.found,1);
  assert.deepEqual(records.map(r => r.remain.id), REMAINS.map(r => r.id));
  assert.deepEqual(FOSSIL_STOPS.map(p => fossilTimeline(records,p).stage), [0,1,2,3]);
  for (const invalid of ['NaN','Infinity','-1','1.5','1e2','0x64','1000','100a','']) assert.equal(parseState({fossilProgress:invalid}).fossilProgress,0);
  assert.equal(parseState({fossilProgress:'999'}).fossilProgress,100);
  assert.equal(parseState({fossilProgress:'67'}).fossilProgress,67);
});
test('changing evidence lens and revisiting a community preserve separate taxon identities', () => {
  const s = parseState({ community:'cambrian', focus:'{"cambrian":"olenoides","kpg":"bird"}' });
  for (const lens of LENSES) assert.equal(focusedNode(parseState({ ...serializeState(s), lens })).id,'olenoides');
  const next = parseState({ ...serializeState(s), community:'kpg' }); assert.equal(focusedNode(next).id,'bird');
  assert.equal(focusedNode(parseState({ ...serializeState(next), community:'cambrian' })).id,'olenoides');
});
test('extinction snapshots remove affected links while retaining explicit, unmorphed lineage anchors', () => {
  for (const [community, id] of [['permian','pt-trilobite'],['kpg','nonavian']]) {
    const before = parseState({ community, phase:'0', focus:JSON.stringify({[community]:id}) });
    const after = parseState({ ...serializeState(before), phase:'1' });
    assert.equal(focusedNode(before).id, focusedNode(after).id);
    assert.equal(nodeStatus(before, focusedNode(before)), 'present'); assert.equal(nodeStatus(after, focusedNode(after)), 'lost');
    assert.ok(visibleLinks(before).some(l => l.from === id || l.to === id));
    assert.ok(visibleLinks(after).every(l => l.from !== id && l.to !== id));
  }
  const oxygenated = parseState({ community:'microbial', phase:'1' });
  assert.ok(communityById('microbial').nodes.every(n => nodeStatus(oxygenated,n) !== 'lost'));
  const birds = parseState({ community:'kpg', phase:'1', focus:'{"kpg":"bird"}' });
  assert.notEqual(nodeStatus(birds, focusedNode(birds)), 'lost');
});
test('fossil filters retain the same 12 identities and a complete fate partition under every condition', () => {
  for (const deposit of DEPOSITS) for (const burial of BURIALS) for (const sample of SAMPLES) {
    const r = fossilExperiment({ deposit, burial, sample });
    assert.deepEqual(r.map(x => x.remain.id), REMAINS.map(x => x.id));
    assert.equal(Object.values(fossilSummary(r)).reduce((a,b) => a+b,0), 12);
  }
});
test('wider collection is nested; it cannot undo decay or a missing source', () => {
  for (const deposit of DEPOSITS) for (const burial of BURIALS) {
    const small = fossilExperiment({ deposit, burial, sample:'small' }), wide = fossilExperiment({ deposit, burial, sample:'wide' });
    small.forEach((r,i) => {
      if (r.fate === 'found') assert.equal(wide[i].fate,'found');
      if (['destroyed','source-gap'].includes(r.fate)) assert.equal(wide[i].fate,r.fate);
    });
  }
});
test('same marine source yields different hard/soft records with different burial; peat favors wood rather than all bones', () => {
  const rapid = fossilExperiment({ deposit:'marine', burial:'rapid', sample:'wide' });
  const exposed = fossilExperiment({ deposit:'marine', burial:'exposed', sample:'wide' });
  assert.ok(rapid.some(r => r.remain.kind === 'worm' && r.fate === 'found'));
  assert.ok(exposed.filter(r => r.remain.kind === 'worm').every(r => r.fate === 'destroyed'));
  assert.ok(exposed.filter(r => r.remain.kind === 'shell').every(r => r.fate === 'found'));
  const peat = fossilExperiment({ deposit:'peat', burial:'exposed', sample:'wide' });
  assert.ok(peat.filter(r => r.remain.kind === 'wood').every(r => r.fate === 'found'));
  assert.ok(peat.filter(r => r.remain.kind === 'bone').every(r => r.fate === 'destroyed'));
  assert.ok(peat.filter(r => r.remain.habitat === 'marine').every(r => r.fate === 'source-gap'));
});
