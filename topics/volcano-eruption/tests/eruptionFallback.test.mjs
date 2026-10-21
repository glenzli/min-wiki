import test from 'node:test';
import assert from 'node:assert/strict';
import { CanvasScene } from '../canvasScene.ts';
import { PRESETS, eruptionAppearance } from '../model.ts';

/** Record actual Canvas primitives and attributes. This is no pixel renderer:
 * it checks the fallback consumer rather than copying its geometry formulas. */
function recordingCanvas() {
  const records = [], commands = [], stack = [];
  let state = { globalAlpha: 1 }, path = [];
  const methods = {
    save() { stack.push({ ...state }); }, restore() { state = stack.pop() ?? { globalAlpha: 1 }; },
    beginPath() { path = []; }, moveTo(x, y) { path.push([x, y]); }, lineTo(x, y) { path.push([x, y]); },
    ellipse(...values) { path = [['ellipse', ...values]]; },
    fill() { records.push({ fill: state.fillStyle, alpha: state.globalAlpha, path: structuredClone(path) }); },
    stroke() { records.push({ stroke: state.strokeStyle, width: state.lineWidth, alpha: state.globalAlpha, path: structuredClone(path) }); },
    createLinearGradient(...args) { return { kind: 'linear', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }; },
    createRadialGradient(...args) { return { kind: 'radial', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }; },
  };
  const context = new Proxy({}, {
    get(_target, key) {
      if (key in state) return state[key];
      return (...args) => { commands.push({ op: key, args }); return methods[key]?.(...args); };
    },
    set(_target, key, value) { state[key] = value; commands.push({ set: key, value }); return true; },
  });
  return { canvas: { clientWidth: 960, clientHeight: 560, getContext: () => context }, records, commands,
    reset() { records.length = commands.length = 0; } };
}
const originalResize = globalThis.ResizeObserver, originalRatio = globalThis.devicePixelRatio;
test.before(() => { globalThis.devicePixelRatio = 1; globalThis.ResizeObserver = class { observe() {} disconnect() {} }; });
test.after(() => { globalThis.ResizeObserver = originalResize; globalThis.devicePixelRatio = originalRatio; });
function renderInto(scene, recording, p, settings) {
  recording.reset(); scene.draw(p, settings);
  return { records: recording.records.slice(), commands: recording.commands.slice() };
}
function capture(p, settings) {
  const recording = recordingCanvas(), scene = new CanvasScene(recording.canvas);
  const result = renderInto(scene, recording, p, settings); scene.dispose(); return result;
}
const settings = (style, strength) => ({ ...PRESETS[style], strength, landform: 'composite' });
const deposits = draw => draw.records.filter(mark => mark.fill === '#4a3030');
const jets = draw => draw.records.filter(mark => mark.stroke === '#c34b22');
const flows = draw => draw.records.filter(mark => mark.fill === '#402c2c');
const ash = draw => draw.records.filter(mark => mark.fill?.stops?.[0]?.[1] === '#d4c8b7');

test('Canvas omitted strength and explicit one produce identical drawing commands', () => {
  for (const style of ['flow', 'fountain', 'ash']) for (const p of [.6, .85, 1]) {
    const omitted = { ...PRESETS[style], landform: 'composite' };
    assert.equal(JSON.stringify(capture(p, omitted).commands), JSON.stringify(capture(p, { ...omitted, strength: 1 }).commands));
  }
});

test('Canvas consumes canonical fountain height while retaining the same terrain', () => {
  const small = capture(.7, settings('fountain', .32)), large = capture(.7, settings('fountain', 1));
  assert.ok(jets(small).length > 0); assert.equal(jets(small).length, jets(large).length);
  const top = draw => Math.min(...jets(draw).flatMap(mark => mark.path.map(point => point[1])));
  assert.ok(top(large) < top(small) - 30);
  const ground = draw => draw.records.find(mark => mark.fill?.stops?.[0]?.[1] === '#a88a6f').path;
  assert.deepEqual(ground(small), ground(large));
});

test('Canvas rebuilds its finite clast population when only strength changes', () => {
  const recording = recordingCanvas(), scene = new CanvasScene(recording.canvas);
  const large = renderInto(scene, recording, 1, settings('fountain', 1));
  const small = renderInto(scene, recording, 1, settings('fountain', .32));
  const repeated = renderInto(scene, recording, 1, settings('fountain', 1));
  assert.ok(deposits(small).length > 0 && deposits(small).length < deposits(large).length * .5);
  assert.deepEqual(deposits(repeated), deposits(large), 'seeking back restores the same fixed impacts');
  scene.dispose();
});

test('Canvas ash body geometry and opacity follow the shared height/radius/density weights', () => {
  const smallSettings = settings('ash', .32), small = ash(capture(.7, smallSettings)), large = ash(capture(.7, settings('ash', 1)));
  assert.ok(small.length > 0); assert.equal(small.length, large.length);
  const weights = eruptionAppearance(smallSettings);
  for (let i = 0; i < small.length; i++) {
    assert.ok(small[i].fill.args[4] > large[i].fill.args[4]);
    assert.ok(Math.abs(small[i].fill.args[5] / large[i].fill.args[5] - weights.ashRadius) < 1e-12);
    if (large[i].alpha > 0) assert.ok(Math.abs(small[i].alpha / large[i].alpha - weights.ashDensity) < 1e-12);
  }
});

test('Canvas lava footprint consumes spread and width, and remains after cooling', () => {
  const small = flows(capture(.7, settings('flow', .32))), large = flows(capture(.7, settings('flow', 1)));
  assert.ok(small.length > 0); assert.equal(small.length, large.length);
  const span = mark => Math.max(...mark.path.map(p => p[0])) - Math.min(...mark.path.map(p => p[0]));
  const width = mark => Math.hypot(mark.path[0][0] - mark.path.at(-1)[0], mark.path[0][1] - mark.path.at(-1)[1]);
  for (let i = 0; i < small.length; i++) {
    assert.ok(span(small[i]) < span(large[i]));
    assert.ok(Math.abs(width(small[i]) / width(large[i]) - eruptionAppearance(settings('flow', .32)).lavaWidth) < 1e-12);
  }
  assert.ok(flows(capture(1, settings('flow', .32))).length > 0);
});

test('Canvas zero strength and stalled intrusion both suppress surface products', () => {
  for (const style of ['flow', 'fountain', 'ash']) for (const input of [settings(style, 0), { ...settings(style, 1), supply: .2, resistance: .9 }]) {
    const draw = capture(.7, input);
    assert.equal(jets(draw).length, 0); assert.equal(deposits(draw).length, 0);
    assert.equal(ash(draw).length, 0); assert.equal(flows(draw).length, 0);
  }
});
