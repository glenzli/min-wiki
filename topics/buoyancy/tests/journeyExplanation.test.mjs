import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';
import { sampleJourney } from '../journeyModel.ts';
import { drawJourneyExplanation } from '../journeyExplanation.ts';

const base = { chapter: 'water', object: 'stone', progress: 0, lens: 'whole', cargo: 0, salt: false };
const attributes = node => Object.fromEntries((node?.attrs ?? []).map(a => [a.name, a.value]));
const all = (node, predicate) => [...(predicate(node) ? [node] : []), ...(node.childNodes ?? []).flatMap(child => all(child, predicate))];
const withAttribute = (tree, name) => all(tree, node => attributes(node)[name] !== undefined);
const force = (view, kind) => withAttribute(view.tree, 'data-journey-force').find(node => attributes(node)['data-journey-force'] === kind);
const molecules = node => withAttribute(node, 'data-journey-molecule');
const makeSvg = () => ({ attributes: {}, innerHTML: '', setAttribute(name, value) { this.attributes[name] = value; } });
function render(input = {}, options = {}, svg = makeSvg()) {
  const frame = sampleJourney({ ...base, ...input });
  const before = structuredClone(frame);
  drawJourneyExplanation(svg, frame, { width: 390, height: 420, fallback: true, ...options });
  assert.deepEqual(frame, before, 'drawing changed the retained scientific frame');
  assert.ok(!/NaN|Infinity|undefined/.test(svg.innerHTML), 'drawing contains a nonfinite or absent value');
  return { frame, svg, html: svg.innerHTML, tree: parseFragment(`<svg>${svg.innerHTML}</svg>`) };
}

test('the initial same-shaped water parcel has its own equal forces, before material weight is introduced', () => {
  const parcel = render();
  const up = attributes(force(parcel, 'buoyancy')), down = attributes(force(parcel, 'weight'));
  assert.equal(up['data-force-subject'], 'parcel');
  assert.equal(down['data-force-subject'], 'parcel');
  assert.equal(Number(up['data-force-n']), parcel.frame.parcel.weightN);
  assert.equal(Number(down['data-force-n']), parcel.frame.parcel.weightN);
  assert.equal(up['data-force-length'], down['data-force-length']);
  assert.notEqual(Number(down['data-force-n']), parcel.frame.forces.weight, 'stone weight appeared before the stone replaced water');
  const outline = attributes(withAttribute(parcel.tree, 'data-journey-parcel')[0]);
  assert.equal(Number(outline['data-parcel-mass-g']), parcel.frame.hydro.displacedMassG);
  assert.equal(attributes(withAttribute(parcel.tree, 'data-journey-material')[0]).opacity, '0');
  assert.match(parcel.html, /这团水的重量/);
  assert.doesNotMatch(parcel.html, /物体的重量/);
});

test('replacement changes weight while retaining the parcel boundary, pose, and buoyancy arrow', () => {
  const first = render({ progress: .1 }), during = render({ progress: .33 }), replaced = render({ progress: .43 });
  assert.equal(first.frame.body.bottom, during.frame.body.bottom);
  assert.equal(during.frame.body.bottom, replaced.frame.body.bottom);
  assert.equal(attributes(withAttribute(first.tree, 'data-journey-parcel')[0]).d, attributes(withAttribute(during.tree, 'data-journey-parcel')[0]).d);
  assert.equal(attributes(withAttribute(first.tree, 'data-journey-material')[0]).d, attributes(withAttribute(replaced.tree, 'data-journey-material')[0]).d);
  assert.equal(force(first, 'buoyancy').childNodes.at(-1).attrs.find(a => a.name === 'd').value, force(during, 'buoyancy').childNodes.at(-1).attrs.find(a => a.name === 'd').value);
  assert.equal(attributes(force(first, 'buoyancy'))['data-force-length'], attributes(force(replaced, 'buoyancy'))['data-force-length']);
  const expected = during.frame.parcel.weightN * (1-during.frame.comparison) + during.frame.forces.weight * during.frame.comparison;
  assert.equal(Number(attributes(force(during, 'weight'))['data-force-n']), expected);
  assert.equal(attributes(force(during, 'weight'))['data-force-subject'], 'replacement');
  assert.equal(Number(attributes(force(replaced, 'weight'))['data-force-n']), replaced.frame.forces.weight);
  assert.equal(withAttribute(replaced.tree, 'data-journey-parcel').length, 0);
  assert.doesNotMatch(replaced.html, /这团水的重量|替换中的重量/);
});

test('a reused SVG cannot retain parcel, dry-cabin, cargo, or object labels from the previous state', () => {
  const svg = makeSvg();
  render({ object: 'boat', cargo: 3 }, {}, svg);
  let view = render({ object: 'boat', progress: 1, cargo: 8 }, {}, svg);
  assert.equal(view.frame.hydro.flooded, true);
  assert.equal(withAttribute(view.tree, 'data-journey-parcel').length, 0);
  assert.equal(attributes(withAttribute(view.tree, 'data-journey-cavity')[0])['data-journey-cavity'], 'flooded');
  view = render({ object: 'coin', progress: 1 }, {}, svg);
  assert.equal(svg.attributes['data-journey-kind'], 'coin');
  assert.equal(svg.attributes['data-journey-cargo'], '0');
  assert.equal(withAttribute(view.tree, 'data-journey-cavity').length, 0);
  assert.equal(withAttribute(view.tree, 'data-journey-cargo').length, 0);
  assert.doesNotMatch(view.html, /data-journey-parcel=|data-journey-specimen="boat"|船内保持干燥/);
});

test('zero immersion draws no upward water force; lake-bed support comes only from the model', () => {
  const dry = render({ chapter: 'metal', progress: .64 });
  assert.equal(dry.frame.hydro.displacedMl, 0);
  assert.equal(force(dry, 'buoyancy'), undefined);
  assert.equal(force(dry, 'support'), undefined);
  assert.equal(Number(attributes(force(dry, 'weight'))['data-force-n']), dry.frame.forces.weight);
  const stone = render({ object: 'stone', progress: 1 });
  assert.ok(stone.frame.forces.support > 0);
  assert.equal(Number(attributes(force(stone, 'support'))['data-force-n']), stone.frame.forces.support);
  const floating = render({ object: 'log', progress: 1 });
  assert.equal(force(floating, 'support'), undefined);
  assert.ok(Math.abs(Number(attributes(force(floating, 'buoyancy'))['data-force-n']) - Number(attributes(force(floating, 'weight'))['data-force-n'])) < 1e-10);
});

test('metal fallback retains mass while its one profile opens, and cargo appears only in the finished hull', () => {
  const paths = new Set(), masses = new Set();
  for (const progress of [.2, .32, .43, .54, .62]) {
    const view = render({ chapter: 'metal', progress, cargo: 4 });
    paths.add(attributes(withAttribute(view.tree, 'data-journey-material')[0]).d);
    masses.add(view.frame.hydro.massG);
    assert.equal(withAttribute(view.tree, 'data-journey-cargo').length, 0);
    assert.equal(view.svg.attributes['data-journey-kind'], 'metal');
    assert.equal(withAttribute(view.tree, 'data-journey-metal-identity').length, 1);
  }
  assert.equal(paths.size, 5, 'fallback silently swapped the forming sample for an unchanged icon');
  assert.equal(masses.size, 1);
  const hull = render({ chapter: 'metal', progress: 1, cargo: 4 });
  assert.equal(withAttribute(hull.tree, 'data-journey-cargo').length, 4);
  assert.equal(attributes(withAttribute(hull.tree, 'data-journey-dry-callout')[0])['data-journey-dry-callout'], 'dry');
  const overloaded = render({ chapter: 'metal', progress: 1, cargo: 8 });
  assert.equal(attributes(withAttribute(overloaded.tree, 'data-journey-dry-callout')[0])['data-journey-dry-callout'], 'flooded');
  assert.doesNotMatch(overloaded.html, /船内保持干燥/);
});

test('cargo and mass cross the exact same completed-hull boundary when scrubbing', () => {
  for(const progress of [.6278,.629,.6299,.63]) {
    const view=render({chapter:'metal',progress,cargo:4});
    const complete=view.frame.body.form===1;
    assert.equal(withAttribute(view.tree,'data-journey-cargo').length,complete?4:0);
    assert.equal(view.svg.attributes['data-journey-cargo'],complete?'4':'0');
    assert.equal(view.frame.hydro.massG,complete?1180:780);
  }
});

test('A/B magnifications remain attached to the same section and dry points receive no water action', () => {
  const view = render({ chapter: 'pressure', object: 'log', progress: 1, lens: 'micro' });
  const windows = withAttribute(view.tree, 'data-journey-window');
  assert.equal(windows.length, 2);
  assert.equal(attributes(windows[0])['data-wet'], 'false');
  assert.equal(attributes(windows[1])['data-wet'], 'true');
  assert.equal(molecules(windows[0]).length, 0);
  assert.equal(withAttribute(windows[0], 'data-journey-mean-pressure').length, 0);
  assert.ok(molecules(windows[1]).length > 20);
  for (const window of windows) {
    const a = attributes(window), anchor = withAttribute(view.tree, 'data-journey-anchor').find(node => attributes(node)['data-journey-anchor'] === a['data-journey-window']);
    assert.equal(a['data-source-x'], attributes(anchor)['data-source-x']);
    assert.equal(a['data-source-y'], attributes(anchor)['data-source-y']);
    assert.equal(Number(a['data-depth']), Math.max(0, view.frame.waterY - Number(a['data-source-y'])));
  }
});

test('depth changes mean pressure while molecular paths share one depth-independent motion law', () => {
  const input = { chapter: 'pressure', object: 'stone', progress: .43, lens: 'micro' };
  const still = render(input, { motionPhase: 0 }), moving = render(input, { motionPhase: .31 });
  const windows = withAttribute(moving.tree, 'data-journey-window'), a = attributes(windows[0]), b = attributes(windows[1]);
  assert.ok(Number(b['data-depth']) > Number(a['data-depth']));
  assert.ok(Number(a['data-ny'])>.7,'the upper surface no longer receives a downward inward push');
  assert.ok(Number(b['data-ny'])<-.7,'the underside no longer receives an upward inward push');
  for (const window of windows) {
    const w = attributes(window), mean = attributes(withAttribute(window, 'data-journey-mean-pressure')[0]);
    assert.equal(Number(mean['data-journey-mean-pressure']), Number(w['data-depth']) * moving.frame.hydro.density);
    const nx = Number(w['data-nx']), ny = Number(w['data-ny']);
    for (const node of molecules(window)) {
      const p = attributes(node), intoBody = (Number(p.cx)-Number(w['data-interface-x']))*nx + (Number(p.cy)-Number(w['data-interface-y']))*ny;
      assert.ok(intoBody < -Number(p.r), 'a water molecule crossed the retained specimen boundary');
    }
  }
  const particlesA = new Map(molecules(windows[0]).map(node => [attributes(node)['data-journey-molecule'], attributes(node)]));
  let common = 0;
  for (const node of molecules(windows[1])) {
    const p = attributes(node), peer = particlesA.get(p['data-journey-molecule']);
    if (!peer) continue;
    common++;
    assert.equal(p['data-s'], peer['data-s']);
    assert.equal(p['data-u'], peer['data-u']);
  }
  assert.ok(common > 15, 'the depth comparison lost its shared molecular field');
  assert.notEqual(molecules(withAttribute(still.tree, 'data-journey-window')[0])[0].attrs.find(a => a.name === 'cx').value, molecules(windows[0])[0].attrs.find(a => a.name === 'cx').value);
  assert.deepEqual(still.frame, moving.frame, 'molecular playback advanced the physical experiment');
  assert.ok(withAttribute(moving.tree, 'data-molecular-neighbour').length > 0);
  assert.ok(withAttribute(moving.tree, 'data-molecular-contact').length > 0);
  assert.equal(render(input, { motionPhase: -1 }).html, still.html);
  assert.equal(render(input, { motionPhase: NaN }).html, still.html);
  assert.equal(render(input, { motionPhase: 3 }).html, render(input, { motionPhase: 1 }).html);
});

test('a dry hull interior below the external waterline never receives an invented water push', () => {
  const dry=render({chapter:'pressure',object:'boat',cargo:4,progress:.43,lens:'micro'});
  const [upper,lower]=withAttribute(dry.tree,'data-journey-window');
  assert.ok(Number(attributes(upper)['data-source-y'])<dry.frame.waterY,'case did not exercise a dry cabin below the waterline');
  assert.equal(attributes(upper)['data-wet'],'false');
  assert.equal(molecules(upper).length,0);
  assert.equal(withAttribute(upper,'data-journey-mean-pressure').length,0);
  assert.equal(attributes(lower)['data-wet'],'true');
  assert.ok(molecules(lower).length>20);
  const flooded=render({chapter:'pressure',object:'boat',cargo:8,progress:1,lens:'micro'});
  assert.ok(withAttribute(flooded.tree,'data-journey-window').every(node=>attributes(node)['data-wet']==='true'));
});

test('macro pressure is inward at wetted points and follows actual liquid density and depth', () => {
  for (const salt of [false, true]) {
    const view = render({ chapter: 'pressure', object: 'stone', progress: .43, salt });
    const samples = withAttribute(view.tree, 'data-journey-pressure');
    assert.ok(samples.length >= 6);
    assert.ok(samples.some(node => Number(attributes(node)['data-pressure-nx']) > .5));
    assert.ok(samples.some(node => Number(attributes(node)['data-pressure-nx']) < -.5));
    for (const node of samples) {
      const a = attributes(node), depth = Number(a['data-pressure-depth']);
      assert.ok(Number(a['data-source-y']) < view.frame.waterY);
      assert.equal(depth, view.frame.waterY - Number(a['data-source-y']));
      assert.equal(Number(a['data-journey-pressure']), depth * view.frame.hydro.density);
      assert.ok(Math.abs(Math.hypot(Number(a['data-pressure-nx']), Number(a['data-pressure-ny'])) - 1) < 1e-10);
    }
  }
});

test('390px and desktop keep equal-area windows, readable labels and persistent cargo inside the stage', () => {
  for (const [width, height] of [[340, 360], [390, 420], [1200, 560]]) {
    const view = render({ chapter: 'pressure', object: 'boat', cargo: 3, progress: .43, lens: 'micro' }, { width, height });
    const windows = withAttribute(view.tree, 'data-journey-window').map(attributes);
    assert.equal(windows.length, 2);
    assert.equal(windows[0]['data-window-width'], windows[1]['data-window-width']);
    assert.equal(windows[0]['data-window-height'], windows[1]['data-window-height']);
    assert.ok(Number(windows[0]['data-window-width']) >= 180);
    assert.ok(Number(windows[0]['data-window-height']) >= 95);
    for (const window of windows) {
      assert.ok(Number(window['data-window-x']) >= 0 && Number(window['data-window-y']) >= 0);
      assert.ok(Number(window['data-window-x']) + Number(window['data-window-width']) <= width);
      assert.ok(Number(window['data-window-y']) + Number(window['data-window-height']) <= height-40);
    }
    const labels = all(view.tree, node => node.tagName === 'text').map(attributes);
    assert.ok(labels.every(a => Number(a['font-size']) >= 12), 'mobile labels were shrunk to fit');
    assert.ok(labels.every(a => Number(a.x) >= 0 && Number(a.x) <= width && Number(a.y) > 0 && Number(a.y) <= height));
    assert.equal(withAttribute(view.tree, 'data-journey-cargo').length, 3);
    assert.equal(view.svg.attributes.viewBox, `0 0 ${width} ${height}`);
  }
});

test('GPU annotations follow the supplied camera projection without replacing its specimen artwork', () => {
  const frame = sampleJourney({ ...base, progress: .33 }), svg = makeSvg(), calls = [];
  const project = point => { calls.push(point); return { x: 195+point[0]*65, y: 180-point[1]*65 }; };
  drawJourneyExplanation(svg, frame, { width: 390, height: 420, project });
  const tree = parseFragment(`<svg>${svg.innerHTML}</svg>`);
  assert.ok(calls.length > 6);
  assert.equal(withAttribute(tree, 'data-journey-fallback').length, 0);
  assert.equal(withAttribute(tree, 'data-journey-material').length, 0);
  assert.equal(withAttribute(tree, 'data-journey-force').length, 2);
});
