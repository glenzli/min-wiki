import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudFrame, cloudEncounters, CLOUD_PAIR_COUNT, CLOUD_DROPLET_COUNT, ICE_CONTACT_RADIUS, GRAUPEL_CONTACT_RADIUS } from '../cloudModel.ts';
import { lightningState, parseLightningRoute, stagePositions } from '../model.ts';

const settings = { distanceKm: 3, temperature: 20 };
const pair = (frame, i) => [frame.particles.find(p => p.id === `ice-${i}`), frame.particles.find(p => p.id === `graupel-${i}`)];
const gap = ([a, b]) => Math.hypot(...a.position.map((x, i) => x - b.position[i])) - ICE_CONTACT_RADIUS - GRAUPEL_CONTACT_RADIUS;

test('persistent cloud identities and neutral pairs precede contact, which precedes separated charge', () => {
  const first = cloudFrame(0), final = cloudFrame(.28);
  assert.equal(first.particles.length, CLOUD_PAIR_COUNT * 2 + CLOUD_DROPLET_COUNT);
  assert.equal(new Set(first.particles.map(p => p.id)).size, first.particles.length);
  assert.deepEqual(final.particles.map(p => p.id), first.particles.map(p => p.id));
  assert.equal(first.particles.every(p => p.charge === 0), true);
  for (const encounter of cloudEncounters) {
    const before = pair(cloudFrame(encounter.progress - .0001), encounter.pair);
    assert.deepEqual(before.map(p => p.charge), [0, 0]); assert.ok(gap(before) > 0);
    const atContact = pair(cloudFrame(encounter.progress), encounter.pair);
    assert.ok(Math.abs(gap(atContact)) < 1e-9);
    assert.deepEqual(atContact.map(p => p.charge), [1, -1]);
    const separated = pair(final, encounter.pair);
    assert.ok(separated[0].position[1] > atContact[0].position[1]);
    assert.ok(separated[1].position[1] < atContact[1].position[1]);
    assert.ok(gap(separated) > 1);
  }
  assert.equal(final.particles.reduce((sum, p) => sum + p.charge, 0), 0);
});

test('seeking backward and forward preserves cloud coordinates, contacts and charge', () => {
  const original = cloudFrame(.117);
  cloudFrame(1); cloudFrame(0); cloudFrame(.70, 'limited');
  assert.deepEqual(cloudFrame(.117), original);
  for (const p of [-1, 0, .1, .25, .6, 1, 2]) {
    const frame = cloudFrame(p);
    assert.ok(frame.particles.every(particle => particle.position.every(Number.isFinite)));
    assert.ok(frame.contacts >= 0 && frame.contacts <= CLOUD_PAIR_COUNT);
  }
});

test('weaker case retains the same contacts but less separation and generates no modeled ground flash', () => {
  const sustained = cloudFrame(.28), limited = cloudFrame(.28, 'limited');
  assert.equal(sustained.contacts, limited.contacts);
  assert.ok(limited.separation < sustained.separation);
  for (let i = 0; i < CLOUD_PAIR_COUNT; i++) {
    const a = pair(sustained, i), b = pair(limited, i);
    assert.deepEqual(a.map(p => p.charge), b.map(p => p.charge));
    assert.ok(a[0].position[1] - a[1].position[1] > b[0].position[1] - b[1].position[1]);
  }
  for (const p of [0, .25, .48, .59, .64, .82, 1]) {
    const weak = lightningState(p, { ...settings, charging: 'limited' });
    assert.equal(weak.leader, 0); assert.equal(weak.connector, 0); assert.equal(weak.connected, false);
    assert.equal(weak.returnStroke, 0); assert.equal(weak.soundSeconds, 0); assert.equal(weak.soundRadiusKm, 0); assert.equal(weak.heard, false);
    assert.equal(weak.separation, cloudFrame(p, 'limited').separation);
  }
  assert.equal(lightningState(.64, settings).connected, true);
});

test('cloud and exterior share separation while distance and propagation temperature preserve charging', () => {
  for (const progress of [0, .1, .25, .48, .64, .82]) {
    const a = lightningState(progress, settings), b = lightningState(progress, { distanceKm: 8, temperature: 0 });
    assert.equal(a.separation, cloudFrame(progress).separation);
    for (const key of ['stage', 'separation', 'field', 'leader', 'connector', 'connected', 'returnStroke']) assert.equal(a[key], b[key]);
  }
  stagePositions.forEach((progress, stage) => assert.equal(lightningState(progress, settings).stage, stage));
});

test('deep links restore valid experiment state and bound invalid input', () => {
  const valid = parseLightningRoute('?p=.64&lens=cloud&charging=limited&distance=6&temperature=30&lang=en');
  assert.equal(valid.progress, .64); assert.equal(valid.lens, 'cloud');
  assert.deepEqual(valid.settings, { distanceKm: 6, temperature: 30, charging: 'limited' });
  const invalid = parseLightningRoute('?p=Infinity&lens=other&charging=unknown&distance=-90&temperature=900');
  assert.equal(invalid.progress, 0); assert.equal(invalid.lens, 'follow');
  assert.deepEqual(invalid.settings, { distanceKm: .5, temperature: 35, charging: 'sustained' });
});
