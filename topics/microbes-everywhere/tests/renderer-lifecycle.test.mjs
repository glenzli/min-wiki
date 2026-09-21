import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { parseFragment } from 'parse5';
import * as virusScene from '../../viruses/scene.ts';
import * as virusModel from '../../viruses/model.ts';
import * as bacteriaScene from '../../bacteria/scene.ts';
import * as bacteriaModel from '../../bacteria/model.ts';
import { readWorkspace, seekWorkspace, WorkspaceClock } from '../workspaceModel.ts';
const copy = JSON.parse(readFileSync(new URL('../workspaceContent.json', import.meta.url), 'utf8')).en;

/** Minimal SVG attribute surface; all geometry and lifecycle code below is production code. */
class Element {
  children = [];
  attrs = {};
  constructor(tag = 'div', attrs = []) { this.tag = tag; for (const { name, value } of attrs) this.setAttribute(name, value); }
  get id() { return this.attrs.id; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key]; }
  get innerHTML() { return this.markup ?? ''; }
  set innerHTML(text) { this.markup = text; this.children = materialize(parseFragment(text).childNodes); }
  toggleAttribute(name, enabled) { if (enabled) this.attrs[name] = ''; else delete this.attrs[name]; }
  insertAdjacentHTML(_where, text) { this.children.push(...materialize(parseFragment(`<svg>${text}</svg>`).childNodes)[0].children); }
  replaceChildren() { this.children = []; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  querySelectorAll(selector) {
    if (selector.includes(' ')) { const [parent, child] = selector.split(' '); return this.querySelectorAll(parent).flatMap(node => node.querySelectorAll(child)); }
    const all = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
    return all.filter(child => selector === '*' || selector === '[id]' ? selector === '*' || child.id : selector.startsWith('#') ? child.id === selector.slice(1) : selector.startsWith('.') ? (child.attrs.class ?? '').split(' ').includes(selector.slice(1)) : child.tag === selector);
  }
}
function materialize(nodes) {
  return nodes.filter(node => node.tagName).map(node => { const element = new Element(node.tagName, node.attrs); element.children = materialize(node.childNodes ?? []); return element; });
}
async function harness(chapter = 'viruses') {
  const animations = [];
  const animateValue = options => { const animation = { ...options, active: true }; animations.push(animation); options.onUpdate(options.from); return () => { animation.active = false; }; };
  let source = readFileSync(new URL('../workspaceRenderer.ts', import.meta.url), 'utf8');
  // Only resolve module loading and scheduling through the harness; preserve the
  // actual loadRenderer/factory/render/pause/dispose and actual SVG model functions.
  source = source.replaceAll("import('../viruses/scene')", 'Promise.resolve(virusScene)')
    .replaceAll("import('../viruses/model')", 'Promise.resolve(virusModel)')
    .replaceAll("import('../bacteria/scene')", 'Promise.resolve(bacteriaScene)')
    .replaceAll("import('../bacteria/model')", 'Promise.resolve(bacteriaModel)')
    .replaceAll("import('../../src/visuals/transition')", 'Promise.resolve({ animateValue: scheduler })');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, virusScene, virusModel, bacteriaScene, bacteriaModel, scheduler: animateValue, console });
  const factory = await exports.loadRenderer(chapter);
  const host = new Element(), renderer = factory(host, copy);
  const state = readWorkspace(`?chapter=${chapter}`);
  renderer.render(state);
  const get = id => { const node = host.querySelector(`#${id}`); assert.ok(node, id); return node; };
  const advance = (animation, fraction) => { if (animation.active) { animation.onUpdate(animation.from + (animation.to - animation.from) * fraction); if (fraction === 1) { animation.active = false; animation.onComplete?.(); } } };
  return { renderer, state, get, host, animations, advance };
}

test('real workspace renderer interpolates the viral camera without moving DNA or parent state', async () => {
  const h = await harness(); seekWorkspace(h.state, 1.67); h.renderer.render(h.state);
  const dna = h.get('v-template').getAttribute('d'), parent = h.get('v-original').getAttribute('transform');
  const before = h.get('virus-diagram').getAttribute('viewBox');
  h.state.view = 'attachment'; h.renderer.render(h.state, true); const animation = h.animations.at(-1);
  assert.equal(animation.duration, 560); h.advance(animation, .5); const middle = h.get('virus-diagram').getAttribute('viewBox');
  h.advance(animation, 1); const after = h.get('virus-diagram').getAttribute('viewBox');
  assert.notEqual(before, middle); assert.notEqual(middle, after);
  assert.equal(h.state.viruses.compatible, 1.67); assert.equal(h.get('v-template').getAttribute('d'), dna); assert.equal(h.get('v-original').getAttribute('transform'), parent);
});
test('paused and superseded real camera transitions cannot overwrite a newer view or scrubbed specimen', async () => {
  const h = await harness(); seekWorkspace(h.state, 1.8); h.renderer.render(h.state);
  h.state.view = 'attachment'; h.renderer.render(h.state, true); const first = h.animations.at(-1); h.advance(first, .35);
  h.state.view = 'inside'; h.renderer.render(h.state, true); const second = h.animations.at(-1); h.advance(second, .4);
  const view = h.get('virus-diagram').getAttribute('viewBox'); h.advance(first, 1); assert.equal(h.get('virus-diagram').getAttribute('viewBox'), view);
  h.renderer.pause(); seekWorkspace(h.state, 3.5); h.renderer.render(h.state);
  const dna = h.get('v-template').getAttribute('d'), frame = h.get('virus-diagram').getAttribute('viewBox');
  const expected = virusModel.cameraFor('inside', virusModel.sampleCycle(3.5, 'compatible'));
  assert.equal(frame, `${expected.x} ${expected.y} ${expected.width} ${expected.height}`);
  h.advance(second, 1); assert.equal(h.get('v-template').getAttribute('d'), dna); assert.equal(h.get('virus-diagram').getAttribute('viewBox'), frame);
  assert.ok(h.animations.every(animation => !animation.active));
  h.state.view = 'whole'; h.renderer.render(h.state, true); const last = h.animations.at(-1); h.renderer.dispose(); h.advance(last, 1); assert.equal(h.host.children.length, 0);
});
test('actual host rendering stops at distinct barriers with no hidden successful offspring', async () => {
  const h = await harness(); const clock = new WorkspaceClock(); clock.ready = true;
  for (const kind of ['mismatch', 'defended']) {
    clock.pause(); h.renderer.pause(); h.state.host = kind; h.renderer.render(h.state); clock.start(h.state);
    for (let i = 0; i < 800; i++) { if (clock.tick(h.state, .03)) h.renderer.render(h.state); }
    assert.equal(clock.playing, false); assert.equal(h.state.viruses[kind], kind === 'mismatch' ? 1 : 2);
    assert.equal(h.get('v-child-head-0').getAttribute('opacity'), '0'); assert.equal(h.get('v-breach-hole').getAttribute('opacity'), '0');
    assert.equal(h.get('v-defense').getAttribute('opacity'), kind === 'defended' ? '1' : '0');
  }
  h.state.host = 'compatible'; seekWorkspace(h.state, 4); h.renderer.render(h.state);
  assert.equal(h.get('v-child-head-0').getAttribute('opacity'), '1'); assert.equal(h.get('v-breach-hole').getAttribute('opacity'), '0');
  seekWorkspace(h.state, 5); h.renderer.render(h.state); assert.equal(h.get('v-breach-hole').getAttribute('opacity'), '1');
});
test('interrupted actual bacterial focus settles to the selected structure without resetting exchange', async () => {
  const h = await harness('bacteria'); seekWorkspace(h.state, .42); h.renderer.render(h.state);
  h.state.part = 'dna'; h.renderer.render(h.state, true); const animation = h.animations.at(-1); h.advance(animation, .4);
  const anatomy = h.host.querySelector('.micro-anatomy'); const target = bacteriaScene.drawAnatomy([0, 0, 1, 0]);
  assert.notEqual(anatomy.innerHTML, target); h.renderer.pause(); assert.equal(anatomy.innerHTML, target);
  assert.equal(h.state.bacteria.ready.exchange, .42); h.advance(animation, 1); assert.equal(anatomy.innerHTML, target);
  h.state.resources = 'limited'; h.renderer.render(h.state); assert.equal(anatomy.innerHTML, target);
  h.state.process = 'division'; h.renderer.render(h.state); h.state.process = 'structure'; h.renderer.render(h.state); assert.equal(anatomy.innerHTML, target);
});
