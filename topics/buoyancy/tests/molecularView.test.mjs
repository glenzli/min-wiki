import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';
import { buoyancy } from '../model.ts';
import { experimentGeometry } from '../scene.ts';
import { drawMolecularPressure } from '../molecularView.ts';
import { specimenSection } from '../pressure.ts';

const base = { experiment: 'objects', object: 'wood', boat: false, cargo: 0, salt: false, depth: 50 };
const attrs = node => Object.fromEntries((node.attrs ?? []).map(a => [a.name, a.value]));
function findAll(node, predicate) {
  return [...(predicate(node) ? [node] : []), ...(node.childNodes ?? []).flatMap(child => findAll(child, predicate))];
}
function render(state, phase = 0, width = 368, height = 312) {
  const result = buoyancy(state), geometry = experimentGeometry(state, result), attributes = {};
  const svg = { parentElement: { getBoundingClientRect: () => ({ width, height }) }, setAttribute(name, value) { attributes[name] = value; }, innerHTML: '' };
  const before = structuredClone({ state, result, geometry });
  drawMolecularPressure(svg, state, geometry, result, phase);
  assert.deepEqual({ state, result, geometry }, before, 'rendering mutated experiment state');
  assert.ok(!svg.innerHTML.includes('NaN') && !svg.innerHTML.includes('Infinity'));
  const tree = parseFragment(`<svg>${svg.innerHTML}</svg>`);
  const windows = findAll(tree, node => attrs(node).class === 'molecular-window');
  return { tree, windows, html: svg.innerHTML, attributes, result, geometry };
}
const particles = node => findAll(node, child => attrs(child).class === 'molecular-particle');

function assertOnSection(point, section) {
  const distances = section.map((a, i) => {
    const b = section[(i + 1) % section.length], dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
  });
  assert.ok(Math.min(...distances) < 1e-7, 'magnification lost the retained specimen boundary');
}

test('the dry upper surface and zero immersion never acquire water particles or gauge arrows', () => {
  const floating = render(base);
  assert.equal(attrs(floating.windows[0])['data-wet'], 'false');
  assert.equal(particles(floating.windows[0]).length, 0);
  assert.equal(attrs(floating.windows[1])['data-wet'], 'true');
  assert.ok(particles(floating.windows[1]).length > 15);
  const barelyWet = render({ ...base, experiment: 'depth', depth: 100.2 });
  assert.ok(barelyWet.windows.every(window => attrs(window)['data-wet'] === 'true'));
  assert.ok(Number(attrs(barelyWet.windows[0])['data-depth']) < .5);
  assert.ok(particles(barelyWet.windows[0]).length > 15, 'a macro-arrow cutoff erased water molecules near the surface');
  for (const phase of [0, .23, .51, .87, 1]) {
    const dry = render({ ...base, experiment: 'depth', depth: 0 }, phase);
    assert.ok(dry.windows.every(window => attrs(window)['data-wet'] === 'false'));
    assert.equal(particles(dry.tree).length, 0);
    assert.equal(findAll(dry.tree, node => attrs(node).class === 'molecular-mean-gauge').length, 0);
    assert.equal(findAll(dry.tree, node => attrs(node)['data-molecular-net-force'] !== undefined).length, 0);
  }
});

test('all displayed molecular paths remain on the water side of the actual inward normal', () => {
  for (const state of [{ ...base, experiment: 'depth', depth: 150 }, { ...base, object: 'stone' }, { ...base, experiment: 'boat', boat: true, cargo: 4 }]) {
    for (const phase of [0, .13, .37, .68, .91, 1]) {
      const view = render(state, phase), section = specimenSection(state, view.geometry, view.result.flooded);
      for (const window of view.windows) {
        const a = attrs(window), nx = Number(a['data-nx']), ny = Number(a['data-ny']);
        assertOnSection([Number(a['data-source-x']), Number(a['data-source-y'])], section);
        for (const particle of particles(window)) {
          const p = attrs(particle), dx = Number(p.cx) - Number(a['data-interface-x']), dy = Number(p.cy) - Number(a['data-interface-y']);
          assert.ok(dx * nx + dy * ny < -Number(p.r), 'water particle crossed into the specimen');
        }
      }
    }
  }
});

test('depth changes the average gauge action, while equal-area windows share the same molecular motion', () => {
  const state = { ...base, experiment: 'depth', depth: 150 };
  const still = render(state, 0), moving = render(state, .31);
  for (const view of [still, moving]) {
    const [a, b] = view.windows.map(attrs);
    assert.ok(Number(b['data-depth']) > Number(a['data-depth']));
    const arrows = view.windows.map(window => attrs(findAll(window, node => attrs(node).class === 'molecular-mean-gauge')[0]));
    assert.ok(Number(arrows[1]['data-relative-pressure']) > Number(arrows[0]['data-relative-pressure']));
    for (let i = 0; i < 2; i++) assert.equal(Number(arrows[i]['data-relative-pressure']), Number([a, b][i]['data-depth']) * view.result.density);
    assert.deepEqual(particles(view.windows[0]).map(p => [attrs(p)['data-s'], attrs(p)['data-u']]), particles(view.windows[1]).map(p => [attrs(p)['data-s'], attrs(p)['data-u']]));
    assert.match(view.html, /省略各面共有的大气压/); assert.match(view.html, /比水面多的挤压/);
  }
  assert.notEqual(particles(still.windows[0])[0].attrs.find(a => a.name === 'cx').value, particles(moving.windows[0])[0].attrs.find(a => a.name === 'cx').value);
  assert.deepEqual(still.windows.map(window => attrs(window)['data-depth']), moving.windows.map(window => attrs(window)['data-depth']));
  assert.equal(render(state, -1).html, still.html);
  assert.equal(render(state, NaN).html, still.html);
  assert.equal(render(state, 3).html, render(state, 1).html);
});

test('boat magnifications select the same outer wall and retain cargo and dry or flooded cabin identity', () => {
  for (const cargo of [4, 10]) {
    const state = { ...base, experiment: 'boat', boat: true, cargo }, view = render(state);
    assert.equal(findAll(view.tree, node => attrs(node)['data-molecular-cargo'] !== undefined).length, cargo);
    const cabin = findAll(view.tree, node => attrs(node)['data-molecular-cabin'] !== undefined)[0];
    assert.equal(attrs(cabin)['data-molecular-cabin'], view.result.flooded ? 'flooded' : 'dry');
    const [a, b] = view.windows.map(attrs);
    assert.ok(Number(a['data-source-x']) < 365 && Number(b['data-source-x']) < 365);
    assert.ok(Number(a['data-nx']) > .65 && Number(b['data-nx']) > .65);
    assert.ok(Math.abs(Number(a['data-nx']) - Number(b['data-nx'])) < 1e-10);
    assert.ok(Number(b['data-depth']) > Number(a['data-depth']));
  }
});

test('the stable liquid field has irregular neighbors that change during short bounded motion', () => {
  const state = { ...base, experiment: 'depth', depth: 150 };
  const initial = particles(render(state, 0).windows[0]).map(node => [Number(attrs(node)['data-s']), Number(attrs(node)['data-u'])]);
  const moved = particles(render(state, .31).windows[0]).map(node => [Number(attrs(node)['data-s']), Number(attrs(node)['data-u'])]);
  assert.equal(initial.length, moved.length);
  assert.ok(initial.length > 30 && initial.length < 300);
  assert.ok(new Set(initial.map(p => p[1])).size > initial.length * .95, 'water sites fell into repeated lattice rows');
  const nearest = points => points.map((p, i) => {
    let best = Infinity, index = -1;
    points.forEach((q, j) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (i !== j && d < best) { best = d; index = j; } });
    return index;
  });
  const before = nearest(initial), after = nearest(moved);
  assert.ok(before.filter((index, i) => index !== after[i]).length > 5, 'molecules remained bound to fixed neighbors');
});

test('two readable magnifications remain inside mobile and desktop SVG bounds with distinct specimen sections', () => {
  const paths = new Set();
  for (const object of ['wood', 'stone', 'steel', 'clay']) for (const [width, height] of [[368, 312], [1238, 476]]) {
    const view = render({ ...base, object }, .2, width, height);
    assert.equal(view.attributes.viewBox, `0 0 ${width} ${height}`);
    assert.equal(view.windows.length, 2);
    if (width >= 1000) assert.ok(findAll(view.tree, node => node.tagName === 'text').every(node => Number(attrs(node).y) >= 65), 'diagram text entered the desktop navigation band');
    for (const window of view.windows) {
      const frame = attrs(window.childNodes.find(node => node.tagName === 'rect'));
      assert.ok(Number(frame.x) >= 0 && Number(frame.y) >= 0);
      assert.ok(Number(frame.x) + Number(frame.width) <= width);
      assert.ok(Number(frame.y) + Number(frame.height) <= height);
      assert.ok(Number(frame.width) >= 180 && Number(frame.height) >= 90);
    }
    paths.add(attrs(findAll(view.tree, node => attrs(node)['data-molecular-specimen'] !== undefined)[0]).d);
  }
  assert.ok(paths.size > 4, 'all specimens were silently replaced by one block');
});
