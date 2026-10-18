import test from 'node:test';
import assert from 'node:assert/strict';
import { createMagnetTurn, magnetTurnFrame, MAGNET_TURN_MS } from '../magnetTurn.ts';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);
const matrix = transform => transform.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/g).map(Number);
const visibleBounds = frame => {
  const coordinates = frame.faces.filter(face => face.visible).flatMap(face => face.d.match(/[-+]?\d*\.?\d+/g).map(Number));
  const xs = coordinates.filter((_, i) => i % 2 === 0), ys = coordinates.filter((_, i) => i % 2 === 1);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

test('a manual reversal keeps the same bar footprint and exchanges poles without mirroring letters', () => {
  const start = magnetTurnFrame(0), end = magnetTurnFrame(180);
  visibleBounds(start).forEach((value, i) => close(value, [0, 0, 151, 76][i]));
  visibleBounds(end).forEach((value, i) => close(value, [0, 0, 151, 76][i]));
  const [n0, s0] = start.labels.map(label => matrix(label.transform));
  const [n1, s1] = end.labels.map(label => matrix(label.transform));
  assert.ok(n0[4] < s0[4]); assert.ok(n1[4] > s1[4]);
  close(n0[4], s1[4]); close(s0[4], n1[4]);
  assert.ok(n0[0] > 0 && n1[0] > 0 && s0[0] > 0 && s1[0] > 0);
});

test('the intermediate bar retains thickness, a fixed pivot, two materials and finite face projections', () => {
  for (let angle = 0; angle <= 180; angle += .5) {
    const frame = magnetTurnFrame(angle), [x0, y0, x1, y1] = visibleBounds(frame);
    assert.deepEqual(frame.center, [75.5, 38]);
    assert.ok(x1 - x0 > 15 && y1 - y0 >= 64);
    assert.ok(frame.faces.some(face => face.visible && face.color === 'red'));
    assert.ok(frame.faces.some(face => face.visible && face.color === 'blue'));
    assert.ok(frame.faces.every(face => !/NaN|Infinity/.test(face.d)));
    assert.ok(frame.labels.every(label => matrix(label.transform).every(Number.isFinite)));
  }
  // Pole text fades at the edge-on long face rather than changing on its surface.
  const edgeOn = Math.atan(14 / 11) * 180 / Math.PI;
  assert.ok(magnetTurnFrame(edgeOn).labelOpacity < 1e-10);
});

test('finite Reader motion is replayable within a turn and settles at its declared endpoint', () => {
  const turn = createMagnetTurn();
  turn.turn(true, 100);
  close(turn.sample(100), 0); close(turn.sample(100 + MAGNET_TURN_MS / 2), 90);
  const later = turn.sample(100 + MAGNET_TURN_MS * .75);
  close(turn.sample(100 + MAGNET_TURN_MS / 4), 180 - later);
  close(turn.sample(100 + MAGNET_TURN_MS * .75), later);
  close(turn.sample(100 + MAGNET_TURN_MS), 180); assert.equal(turn.active, false);
  close(turn.sample(10000), 180); turn.dispose();
});

test('rapid reversals continue from the visible angle; suspend and disposal do not leave delayed work', () => {
  const turn = createMagnetTurn(); turn.turn(true, 0);
  const middle = turn.sample(MAGNET_TURN_MS / 2); turn.turn(false, MAGNET_TURN_MS / 2);
  close(turn.sample(MAGNET_TURN_MS / 2), middle);
  close(turn.sample(MAGNET_TURN_MS), middle / 2);
  close(turn.settle(false), 0); assert.equal(turn.active, false);
  close(turn.sample(10000), 0);
  turn.turn(true, 10000); const before = turn.sample(10100); turn.dispose();
  assert.equal(turn.active, false); close(turn.sample(20000), before);
  turn.turn(false, 20000); close(turn.sample(30000), before);
});
