import test from 'node:test';
import assert from 'node:assert/strict';
import { plantPose, compoundPoint, pinnaPoint, leafletBase, PINNA_LENGTHS, OBSERVED_PAIR } from '../geometry.ts';
import { MimosaScene } from '../scene.ts';

const local = { pinna: 1, extent: 'local' }, whole = { ...local, extent: 'whole' };
const close = (a, b) => assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-8, `${a} differs from ${b}`);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('primary joint is fixed and local folding does not move the petiole', () => {
  for (let i = 0; i <= 100; i++) {
    assert.deepEqual(plantPose(i / 100, local), plantPose(0, local));
    close(plantPose(i / 100, whole).primary, plantPose(0, whole).primary);
  }
  assert.ok(distance(plantPose(0, whole).primary, compoundPoint([0, 0], plantPose(0, whole))) > 60,
    'primary pulvinus and pinna junction must be visibly separate');
});

test('wider response rotates one retained compound leaf and fully recovers', () => {
  const reference = plantPose(0, whole);
  const points = pose => PINNA_LENGTHS.map((length, pinna) => pinnaPoint([length, 0], pinna, pose));
  const initial = points(reference);
  for (let i = 0; i <= 100; i++) {
    const pose = plantPose(i / 100, whole), tips = points(pose);
    assert.ok(Math.abs(distance(pose.primary, compoundPoint([0, 0], pose)) - Math.hypot(...pose.petiole)) < 1e-8);
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      assert.ok(Math.abs(distance(tips[a], tips[b]) - distance(initial[a], initial[b])) < 1e-8,
        'pinna axes cannot splay independently during primary-pulvinus droop');
    }
  }
  assert.ok(compoundPoint([0, 0], plantPose(.6, whole))[1] > compoundPoint([0, 0], reference)[1]);
  assert.deepEqual(plantPose(1, whole), reference);
});

// This adapter executes the production renderer. It records transformed Canvas
// commands, not pixels or browser font/layout. Browser acceptance remains separate.
function fixture(width, height) {
  let matrix = [1, 0, 0, 1, 0, 0], stack = [], inLeaf = false;
  const records = { leaves: [], labels: [], rings: [], primary: [] };
  const point = (x, y) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
  const record = values => { if (inLeaf) for (let i = 0; i < values.length; i += 2) records.leaves.push(point(values[i], values[i + 1])); };
  const methods = {
    setTransform: (...m) => { matrix = m; },
    save: () => stack.push([...matrix]), restore: () => { matrix = stack.pop(); },
    translate: (x, y) => { const next = point(x, y); matrix[4] = next[0]; matrix[5] = next[1]; },
    scale: (x, y) => { matrix[0] *= x; matrix[1] *= x; matrix[2] *= y; matrix[3] *= y; },
    rotate: a => { const [aa, b, c, d] = matrix, ca = Math.cos(a), sa = Math.sin(a); matrix[0] = aa * ca + c * sa; matrix[1] = b * ca + d * sa; matrix[2] = c * ca - aa * sa; matrix[3] = d * ca - b * sa; },
    moveTo: (...v) => record(v), lineTo: (...v) => record(v), bezierCurveTo: (...v) => record(v), quadraticCurveTo: (...v) => record(v),
    ellipse: (x, y, rx, ry) => { if (rx === 7 && ry === 5) records.rings.push(point(x, y)); if (rx === 12 && ry === 7) records.primary.push(point(x, y)); },
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  };
  const context = new Proxy({ globalAlpha: 1, ...methods }, { get: (target, key) => key in target ? target[key] : () => {} });
  const canvas = { clientWidth: width, clientHeight: height, getContext: () => context };
  const scene = new MimosaScene(canvas);
  const leaflet = scene.leaflet.bind(scene);
  scene.leaflet = (...args) => { inLeaf = true; leaflet(...args); inLeaf = false; };
  scene.label = (text, x, y, options) => records.labels.push({ text, origin: point(x, y), width: options.width, anchor: options.anchor ? point(...options.anchor) : null });
  return { scene, records, screen: p => [width / 2 + p[0] * scene.scale, height * .54 + p[1] * scene.scale], draw: (progress, settings) => {
    for (const key of Object.keys(records)) records[key] = [];
    scene.draw(progress, settings, 'plant');
    assert.equal(stack.length, 0, 'every Canvas transform must be restored');
    return records;
  } };
}

test('production Canvas joint and leaflet markers follow the same geometry at every selected pinna', t => {
  const oldResize = globalThis.ResizeObserver, oldDpr = globalThis.devicePixelRatio;
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.devicePixelRatio = 1;
  t.after(() => { globalThis.ResizeObserver = oldResize; globalThis.devicePixelRatio = oldDpr; });
  for (const [width, height] of [[360, 330], [780, 330], [960, 200], [960, 530]]) {
    const f = fixture(width, height);
    for (const extent of ['local', 'whole']) for (let pinna = 0; pinna < 4; pinna++) for (let i = 0; i <= 40; i++) {
      const progress = i / 40, settings = { pinna, extent }, pose = plantPose(progress, settings), r = f.draw(progress, settings);
      const primary = r.labels.find(label => label.text === '主叶枕 · 叶柄基部');
      const junction = r.labels.find(label => label.text === '羽片汇合处');
      const leaflet = r.labels.find(label => label.text === '小叶基部叶枕');
      close(primary.anchor, r.primary[0]);
      close(primary.anchor, f.screen(pose.primary));
      close(junction.anchor, f.screen(compoundPoint([0, 0], pose)));
      const base = leafletBase(pinna, OBSERVED_PAIR);
      close(leaflet.anchor, r.rings[0]);
      close(leaflet.anchor, f.screen(pinnaPoint([base[0], base[1] + 2], pinna, pose)));
      assert.equal(r.rings.length, 1, 'one retained leaflet site is selected');
      for (const [x, y] of r.leaves) assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= 4 && x <= width - 4 && y >= 4 && y <= height - 4,
        `leaf silhouette exceeds ${width}×${height} at ${extent}/${pinna}/${progress}: ${x},${y}`);
    }
    const atHold = structuredClone(f.draw(.6, whole));
    f.draw(0, local);
    assert.deepEqual(f.draw(.6, whole), atHold, 'backward scrubbing and changing extent retain the same site and geometry');
    f.scene.dispose();
  }
});

test('mobile primary-pulvinus label leaves room for four English lines above the scene note', t => {
  const oldResize = globalThis.ResizeObserver, oldDpr = globalThis.devicePixelRatio;
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.devicePixelRatio = 1;
  t.after(() => { globalThis.ResizeObserver = oldResize; globalThis.devicePixelRatio = oldDpr; });
  // 354px is the actual scene width in the reported 390px mobile screenshot.
  // Reserve the bottom 44px for its two-line note plus 8px clear space. This
  // checks a conservative four-line box; real font wrapping is browser-tested.
  for (const width of [320, 354, 360]) {
    const height = 330, f = fixture(width, height);
    for (const progress of [0, .6, 1]) {
      const r = f.draw(progress, whole), label = r.labels.find(value => value.text === '主叶枕 · 叶柄基部');
      const scale = f.scene.scale, font = Math.max(13, 12 / scale);
      const bottom = label.origin[1] + (-font * .75 + font * 1.2 * 4 + 3) * scale;
      assert.ok(bottom <= height - 52, `four-line label crowds the scene note at width ${width}: ${bottom}`);
      assert.ok(label.origin[0] + (label.width + 12) * scale / 2 <= width - 8);
      close(label.anchor, r.primary[0]);
    }
    f.scene.dispose();
  }
});
