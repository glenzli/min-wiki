import test from 'node:test';
import assert from 'node:assert/strict';
import { mountWaterScene } from './scene.ts';
import { waterAt } from './model.ts';
import { leafLifeAt } from '../leaf-colors/lifecycle.ts';

// The real draw method receives SVG-like attribute sinks. This verifies state
// projection, not layout, antialiasing or browser accessibility.
class SVGNode {
  attributes = new Map<string, string>();
  constructor(readonly children: SVGNode[] = []) {}
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name); }
}
function fixture() {
  const marker = new SVGNode(), detail = new SVGNode(), wetWall = new SVGNode(), cohorts = new SVGNode(Array.from({ length: 7 }, () => new SVGNode()));
  const nodes: Record<string, SVGNode> = { 'water-marker': marker, 'detail-water': detail, 'wet-wall': wetWall, cohorts };
  const attributes = new Map<string, string>();
  const scene = {
    innerHTML: '', dataset: {} as Record<string, string>,
    querySelector: (selector: string) => nodes[selector.slice(1)],
    querySelectorAll: () => [cohorts, marker],
    setAttribute(name: string, value: string) { attributes.set(name, value); },
    getAttribute(name: string) { return attributes.get(name); },
  };
  return { 'water-marker': marker, 'detail-water': detail, cohorts, scene, renderer: mountWaterScene(scene as unknown as SVGSVGElement) };
}
test('inactive transport hides both whole-plant and leaf-detail tracking markers while retaining progress', () => {
  const f = fixture();
  for (const age of [.34, .15, .34, .86, 1, .34]) {
    const life = leafLifeAt(age), active = life.waterAvailable ? life.transport : 0;
    f.renderer.draw(.78, active);
    for (const node of [f['water-marker'], f.cohorts, f['detail-water']]) assert.equal(node.getAttribute('opacity'), String(active));
    assert.equal(f.scene.dataset.progress, '0.7800');
  }
});
test('continuous zoom revisits the same section without moving its tracked cohort', () => {
  const f = fixture();
  f.renderer.draw(.78);
  const marked = Object.fromEntries(f['detail-water'].attributes);
  f.renderer.zoom(.43);
  const middle = f.scene.getAttribute('viewBox');
  f.renderer.zoom(1); f.renderer.zoom(0); f.renderer.zoom(.43);
  assert.equal(f.scene.getAttribute('viewBox'), middle);
  assert.deepEqual(Object.fromEntries(f['detail-water'].attributes), marked);
  assert.equal(f.scene.dataset.progress, '0.7800');
  assert.equal(f.scene.dataset.waterIdentity, 'branch-leaf-01/cohort-01');
  for (const value of [0, .2, .7, 1]) {
    f.renderer.zoom(value);
    const [x,y,width,height] = f.scene.getAttribute('viewBox')!.split(' ').map(Number);
    assert.ok([x,y,width,height].every(Number.isFinite));
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0);
    assert.ok(Math.abs(width / height - 760 / 530) < 1e-8);
  }
  f.renderer.dispose(); f.renderer.dispose();
});
test('whole-plant and enlarged markers have one phase change, followed by the lower pore exit', () => {
  const f = fixture();
  for (const p of [0, .61, .74, .77, .8, .85, .88, .96, 1, .77]) {
    const state = waterAt(p);
    f.renderer.draw(p);
    assert.equal(f['water-marker'].getAttribute('fill-opacity'), String(1 - state.vapour));
    assert.equal(f['detail-water'].getAttribute('fill-opacity'), String(1 - state.vapour));
    assert.equal(f['detail-water'].getAttribute('opacity'), state.leafVisible ? '1' : '0');
    assert.equal(f['water-marker'].getAttribute('cy'), String(state.y));
    assert.equal(f['detail-water'].getAttribute('cy'), String(state.detailY));
  }
  f.renderer.draw(.88);
  assert.equal(f['water-marker'].getAttribute('cy'), '165');
  assert.equal(f['detail-water'].getAttribute('cy'), '370');
  assert.equal(f['water-marker'].getAttribute('fill-opacity'), '0');
  assert.equal(f['detail-water'].getAttribute('fill-opacity'), '0');
  // Earlier cohorts use their own route progress, so liquid cannot be rendered
  // as hollow in xylem and vapour cannot stay filled after passing the pore.
  f.cohorts.children.forEach((node, i) => {
    const state = waterAt(.88 * 1.22 - (i + 1) * .105);
    assert.equal(node.getAttribute('fill-opacity'), String(1 - state.vapour));
  });
});
