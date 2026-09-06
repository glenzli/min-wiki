import test from 'node:test';
import assert from 'node:assert/strict';
import { StellarDisruption, STAR_RADIUS } from '../physics/stellarDisruption.js';
import { orbitAt } from '../physics/encounter.js';

const model = new StellarDisruption({ count: 160, frames: 600 });
function sample(progress, simulation = model) {
  const positions = new Float32Array(simulation.count * 3);
  const previous = new Float32Array(simulation.count * 3);
  const state = new Float32Array(simulation.count * 2);
  const focus = simulation.sample(progress, positions, previous, state);
  return { positions, previous, state, focus };
}

test('one reproducible parcel population survives seeking and all stages', () => {
  const again = new StellarDisruption({ count: 160, frames: 600 });
  assert.deepEqual(model.positions, again.positions);
  assert.ok(model.positions.every(Number.isFinite));
  assert.ok(model.bound.some(Boolean));
  assert.ok(model.bound.some(value => !value));
  const frozen = sample(0.75);
  sample(1); sample(0.1); sample(0.42);
  assert.deepEqual(sample(0.75), frozen);
  const centre = orbitAt(0, 'tidal');
  const initial = sample(0);
  for (let i = 0; i < model.count; i++) {
    const j = i * 3;
    assert.ok(Math.hypot(initial.positions[j] - centre.x,
      initial.positions[j+1] - centre.y, initial.positions[j+2]) <= STAR_RADIUS + 1e-5);
  }
});

test('outer gas peels away before the centre without new particles appearing', () => {
  const core = Array.from(model.detachAt.slice(0, 16));
  const envelope = Array.from(model.detachAt.slice(-32));
  assert.ok(Math.max(...envelope) < Math.min(...core));
  let prior = sample(0);
  for (let step = 1; step <= 120; step++) {
    const current = sample(step / 100);
    assert.ok(current.focus.remaining <= prior.focus.remaining + 1e-7);
    for (let i = 0; i < model.count; i++) {
      assert.ok(current.state[i*2] >= prior.state[i*2]);
      assert.ok(current.state[i*2+1] <= prior.state[i*2+1]);
    }
    prior = current;
  }
  assert.equal(prior.focus.remaining, 0);
});

test('parcel positions and velocities remain continuous across phase boundaries', () => {
  // Independent finite differences cover integration start, shell release,
  // story changes, time compression and dissipation: no position/ring swap.
  for (const p of [0.18, 0.32, 0.4, 0.43, 0.46, 0.48, 0.62, 0.82, 0.86, 1, 1.15]) {
    const before = sample(p - 1e-5).positions;
    const now = sample(p).positions;
    const after = sample(p + 1e-5).positions;
    for (let j = 0; j < now.length; j += 3) {
      const jump = Math.hypot(...[0,1,2].map(k => after[j+k] - before[j+k]));
      assert.ok(jump < 0.06, `position jump at ${p}: ${jump}`);
      const kink = Math.hypot(...[0,1,2].map(k => after[j+k] - 2*now[j+k] + before[j+k]));
      assert.ok(kink < 0.0002, `velocity kink at ${p}: ${kink}`);
    }
  }
});

test('a deeper trajectory produces early capture while leaving an external flow', () => {
  const deep = new StellarDisruption({ count: 480, scenario: 'deep' });
  assert.equal(sample(0.5).focus.absorbed, 0);
  assert.equal(sample(0.3, deep).focus.absorbed, 0);
  const early = sample(0.43, deep);
  assert.ok(early.focus.absorbed > 0);
  assert.ok(early.focus.absorbed < deep.count / 2);
  const late = sample(1.2, deep);
  for (let i = 0; i < deep.count; i++) {
    if (!early.state[i*2+1]) assert.equal(late.state[i*2+1], 0);
  }
  assert.ok(deep.positions.every(Number.isFinite));
  for (const simulation of [model, deep]) {
    const first = sample(0.95, simulation), middle = sample(1.1, simulation), last = sample(1.2, simulation);
    assert.ok(middle.focus.absorbed > first.focus.absorbed + simulation.count * 0.15);
    assert.ok(last.focus.absorbed > middle.focus.absorbed);
    assert.ok(last.focus.absorbed < simulation.count, 'escaping material is not forced into the hole');
    for (let i = 0; i < simulation.count; i++) {
      if (!middle.state[i*2+1]) assert.equal(last.state[i*2+1], 0);
    }
  }
});
