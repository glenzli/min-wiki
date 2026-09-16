import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICE_GRAINS, ICE_HEIGHT, ICE_WIDTH, ICE_BUBBLES, arrivalTime, grainAt, grainAxis, grainBoundary, grainPolygon, iceSection } from '../iceGeometry.ts';
import { phaseState } from '../model.ts';

test('grain territories meet without gaps, overlaps or arbitrary color-cell assignment', () => {
  for (let z = 0; z <= ICE_HEIGHT; z += .7) {
    for (let i = 0; i < ICE_GRAINS.length; i++) {
      const left = grainBoundary(i, z), right = grainBoundary(i + 1, z);
      assert.ok(right > left, `inverted grain ${i} at ${z}`);
      assert.equal(grainAt((left + right) / 2, z), i);
      if (i > 0) assert.ok(Math.abs(arrivalTime(ICE_GRAINS[i - 1], left, z) - arrivalTime(ICE_GRAINS[i], left, z)) < 1e-9);
    }
    assert.equal(grainBoundary(0, z), 0);
    assert.equal(grainBoundary(ICE_GRAINS.length, z), ICE_WIDTH);
  }
  for (let i = 1; i < ICE_GRAINS.length; i++) {
    const a = grainPolygon(i - 1).slice(61).reverse();
    const b = grainPolygon(i).slice(0, 61);
    assert.deepEqual(a, b, 'adjacent grain paths share exactly the same edge');
  }
});

test('the anisotropic arrival field grows downward without hidden retreat or reseeding', () => {
  assert.notEqual(arrivalTime(ICE_GRAINS[0], ICE_GRAINS[0].seed + 10, 0), arrivalTime(ICE_GRAINS[0], ICE_GRAINS[0].seed, 10));
  for (const grain of ICE_GRAINS) for (let x = 0; x <= 300; x += 5) {
    let previous = -Infinity;
    for (let z = 0; z <= ICE_HEIGHT; z += 1) {
      const next = arrivalTime(grain, x, z);
      assert.ok(next > previous); previous = next;
    }
    assert.ok(Number.isFinite(grainAxis(grain, ICE_HEIGHT)));
  }
});

test('faceted phase front conserves the requested ice and liquid section volumes', () => {
  for (let i = 0; i <= 100; i++) {
    const fraction = i / 100, s = iceSection(fraction), phase = phaseState('freeze', fraction);
    assert.ok(Math.abs(s.area / ICE_WIDTH - phase.iceDepth) < .0001);
    assert.ok(Math.abs(s.depth - phase.iceDepth - phase.liquidDepth) < 1e-10);
    for (const point of s.front) assert.ok(point.z >= 0 && point.z <= s.depth);
  }
  assert.ok(iceSection(0).front.every(point => point.z === 0));
  assert.ok(iceSection(1).front.every(point => Math.abs(point.z - ICE_HEIGHT) < 1e-10));
});

test('growth begins at persistent surface nuclei then joins into a single slab', () => {
  const first = iceSection(.001).front;
  assert.ok(first.some(point => point.z === 0));
  assert.ok(first.filter(point => point.z > 0).length > 1);
  assert.ok(iceSection(.1).front.every(point => point.z > 0));
  const halfway = iceSection(.5).front.map(point => point.z);
  assert.ok(Math.max(...halfway) - Math.min(...halfway) > 2, 'growth must not reduce to a flat reveal');
});

test('scrubbing is continuous, reversible and independent of render history', () => {
  let previous = iceSection(0);
  for (let i = 1; i <= 1000; i++) {
    const next = iceSection(i / 1000);
    for (let x = 0; x < next.front.length; x++) {
      assert.ok(next.front[x].z >= previous.front[x].z - 1e-6);
      assert.ok(Math.abs(next.front[x].z - previous.front[x].z) < 6);
    }
    previous = next;
  }
  for (const p of [.001, .05, .5, .99, 1]) {
    const forward=iceSection(phaseState('freeze', p).ice),reverse=iceSection(phaseState('melt', 1-p).ice);
    forward.front.forEach((point,index)=>assert.ok(Math.abs(point.z-reverse.front[index].z)<1e-6));
  }
  assert.equal(new Set(ICE_BUBBLES.map(bubble => bubble.id)).size, 64);
  assert.ok(ICE_BUBBLES.every(bubble => bubble.x > 0 && bubble.x < ICE_WIDTH && bubble.z > 0 && bubble.z < ICE_HEIGHT));
});
