import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIceRenderer } from '../iceRenderer.ts';
import { phaseState } from '../model.ts';

class SvgNode {
  constructor(tag) { this.tagName = tag; this.children = []; this.attributes = new Map(); this.dataset = {}; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
}
function descendants(node) { return [node, ...node.children.flatMap(descendants)]; }

test('one persistent SVG population is clipped by the same front that bounds the liquid', () => {
  const original = globalThis.document;
  globalThis.document = { createElementNS: (_namespace, tag) => new SvgNode(tag) };
  try {
    const root = new SvgNode('g'), water = new SvgNode('path');
    const renderer = createIceRenderer(root, water);
    const population = descendants(root);
    const grains = population.filter(node => node.attributes.has('data-grain'));
    const bubbles = population.filter(node => node.attributes.has('data-bubble'));
    const clip = population.find(node => node.attributes.get('id') === 'ice-growth-clip').children[0];
    const guide = population.find(node => node.attributes.get('id') === 'ice-boundary-guide');
    assert.equal(grains.length, 9); assert.equal(bubbles.length, 64);
    const ids = new Set(population.map(node => node.attributes.get('id')).filter(Boolean));
    for (const node of population) for (const value of node.attributes.values()) {
      for (const match of value.matchAll(/url\(#([^)]*)\)/g)) assert.ok(ids.has(match[1]), `missing SVG material reference ${match[1]}`);
    }
    for (const fraction of [0, .001, .05, .5, 1, .5, .05, 0]) {
      const state = phaseState('freeze', fraction);
      renderer.update(state, fraction === .5);
      assert.deepEqual(descendants(root), population, 'scrubbing must not replace grains, bubbles or textures');
      assert.equal(root.attributes.get('opacity'), fraction === 0 ? '0' : '1');
      assert.equal(guide.attributes.get('opacity'), fraction === .5 ? '.85' : '0');
      assert.ok(!/NaN|Infinity/.test(clip.attributes.get('d') + water.attributes.get('d')));
      const edge = [...clip.attributes.get('d').matchAll(/L([\d.]+) ([\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]).reverse();
      const liquid = [...water.attributes.get('d').matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
      assert.equal(edge.length, 151);
      edge.forEach((point, i) => {
        assert.ok(Math.abs(liquid[i][0] - point[0] - 150) < .002);
        assert.ok(Math.abs(liquid[i][1] - point[1] - state.top) < .002, 'ice and liquid must share one contour');
      });
    }
  } finally { globalThis.document = original; }
});
