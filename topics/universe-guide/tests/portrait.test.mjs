import test from 'node:test';
import assert from 'node:assert/strict';
import { portraitLayout, largerPortrait, population, energyResidents } from '../portraitModel.ts';
import { GuidePortraitViewport } from '../portraitViewport.ts';

test('paired portraits fit their viewports without overlap at narrow and desktop sizes', () => {
  for (const [width, height] of [[368, 490], [640, 420], [1240, 496], [1540, 650]]) {
    const { primary, partner } = portraitLayout(width, height);
    for (const body of [primary, partner]) {
      assert.ok(Math.abs(body.x) + body.radius <= width / 2);
      assert.ok(Math.abs(body.y) + body.radius <= height / 2);
    }
    assert.ok(Math.max(primary.radius, partner.radius) * 2 >= (width < 640 ? 160 : 230));
    assert.ok(Math.hypot(primary.x - partner.x, primary.y - partner.y) > primary.radius + partner.radius);
  }
});
test('compressed body comparisons preserve physical size order after swapping and resizing', () => {
  // Independent scientific expectations; selection priority must never choose the larger disk.
  for (const [larger, smaller] of [['sun','earth'], ['jupiter','earth'], ['jupiter','neptune'], ['earth','moon'], ['ceres','asteroid'], ['red-dwarf','white-dwarf']]) {
    assert.equal(largerPortrait(larger,smaller),larger);
    assert.equal(largerPortrait(smaller,larger),larger);
    for (const [width,height] of [[368,490],[640,420],[1240,496]]) {
      const a=portraitLayout(width,height,larger,smaller), b=portraitLayout(width,height,smaller,larger);
      assert.equal(a.mode,'ordered');
      assert.ok(a.primary.radius > a.partner.radius * 1.3);
      assert.ok(b.partner.radius > b.primary.radius * 1.3);
      assert.equal(a.primary.radius,b.partner.radius);
      assert.equal(a.partner.radius,b.primary.radius);
    }
  }
});
test('unspecified black-hole masses, clouds and events have separate windows without an invented size rank', () => {
  for (const pair of [['black-hole','neutron-star'],['nebula','galaxy'],['remnant','supernova'],['asteroid','comet']]) {
    assert.equal(largerPortrait(...pair),undefined);
    const layout=portraitLayout(1240,496,...pair);
    assert.equal(layout.mode,'windows');
    assert.equal(layout.primary.radius,layout.partner.radius);
  }
});
test('stable volume populations preserve a thin galaxy, extended cloud and hollow shell under repeated selection', () => {
  for (const kind of ['galaxy', 'cloud', 'shell', 'dust', 'cluster', 'universe']) {
    const points = population(kind, 500);
    assert.deepEqual(points, population(kind, 500));
    assert.equal(points.length, 500);
    for (const p of points) for (const value of Object.values(p)) assert.ok(Number.isFinite(value));
    assert.ok(points.every(p => Math.hypot(p.x, p.y, p.z) < 1.2));
    if (kind === 'galaxy') assert.ok(points.every(p => Math.abs(p.y) < .21));
    if (kind === 'shell') assert.ok(points.every(p => Math.hypot(p.x, p.y / .84, p.z) >= .78 - 1e-12));
  }
  assert.deepEqual([...energyResidents].sort(), ['red-dwarf', 'sun', 'white-dwarf']);
});
function harness() {
  class Node {
    children = []; dataset = {}; hidden = false; textContent = ''; onclick = null;
    prepend(child) { this.children.unshift(child); child.parent = this; }
    setAttribute() {}
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = { createElement: () => new Node() };
  const host = new Node(), fallback = new Node(), status = new Node(), retry = new Node();
  const stats = { created: 0, disposed: 0, calls: [], failures: [] };
  class Scene { constructor(canvas, fail) { stats.created++; stats.failures.push(fail); } set(...args) { stats.calls.push(args); } reset() {} dispose() { stats.disposed++; } }
  return { host, fallback, status, retry, stats, Scene, args: [host, fallback, status, retry, { loading: 'loading', failed: 'failed', canvas: 'scene' }], restore() { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('a late import mounts only the latest selected pair and cannot mount after disposal', async () => {
  const h = harness(); let resolve, loads = 0;
  const pending = new Promise(r => { resolve = r; });
  const viewport = new GuidePortraitViewport(...h.args, () => { loads++; return pending; });
  try {
    viewport.set({ id: 'sun' }, { id: 'earth' }, false);
    viewport.set({ id: 'white-dwarf' }, { id: 'red-dwarf' }, true);
    assert.equal(loads, 1); resolve({ GuidePortraitScene: h.Scene }); await settle();
    assert.equal(h.stats.created, 1); assert.equal(h.stats.calls.at(-1)[0].id, 'white-dwarf'); assert.equal(h.stats.calls.at(-1)[2], true);
    viewport.dispose(); assert.equal(h.stats.disposed, 1); assert.equal(h.host.children.length, 0);
    let late; const next = new GuidePortraitViewport(...h.args, () => new Promise(r => { late = r; }));
    next.set({ id: 'sun' }, { id: 'earth' }, false); next.dispose(); late({ GuidePortraitScene: h.Scene }); await settle(); assert.equal(h.stats.created, 1);
  } finally { viewport.dispose(); h.restore(); }
});
test('failure preserves selection and retry replaces the single canvas', async () => {
  const h = harness(), viewport = new GuidePortraitViewport(...h.args, async () => ({ GuidePortraitScene: h.Scene }));
  try {
    viewport.set({ id: 'white-dwarf' }, { id: 'red-dwarf' }, true); await settle();
    h.stats.failures[0](); assert.equal(h.host.dataset.renderState, 'fallback'); assert.equal(h.fallback.hidden, false); assert.equal(h.stats.disposed, 1);
    viewport.set({ id: 'galaxy' }, { id: 'nebula' }, false); h.retry.onclick(); await settle();
    assert.equal(h.stats.calls.at(-1)[0].id, 'galaxy'); assert.equal(h.host.children.length, 1); assert.equal(h.host.dataset.renderState, 'ready');
  } finally { viewport.dispose(); assert.equal(h.stats.disposed, 2); h.restore(); }
});
