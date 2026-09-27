import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';
import { createAntRenderer } from '../renderer.ts';
import { readState } from '../model.ts';

/** Minimal SVG attribute DOM; all geometry, transitions and lifecycle below are production code. */
class Element {
  children = []; attrs = {};
  constructor(tag = 'svg', attrs = []) { this.tag = tag; for (const {name,value} of attrs) this.setAttribute(name,value); }
  setAttribute(key,value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key]; }
  hasAttribute(key) { return key in this.attrs; }
  set innerHTML(text) { this.children = materialize(parseFragment(`<svg>${text}</svg>`).childNodes)[0].children; }
  replaceChildren() { this.children = []; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  querySelectorAll(selector) {
    const all = this.children.flatMap(child => [child,...child.querySelectorAll('*')]);
    return all.filter(child => selector === '*' || (selector[0] === '#' ? child.attrs.id === selector.slice(1) : selector[0] === '.' ? (child.attrs.class ?? '').split(' ').includes(selector.slice(1)) : child.tag === selector));
  }
}
function materialize(nodes) { return nodes.filter(node => node.tagName).map(node => { const element = new Element(node.tagName,node.attrs); element.children = materialize(node.childNodes ?? []); return element; }); }
function harness() {
  const world = new Element(), body = new Element(), mobile = new Element(), animations = [];
  const transition = options => { const animation = { ...options, active:true }; animations.push(animation); options.onUpdate(options.from); return () => { animation.active=false; }; };
  const renderer = createAntRenderer(world,body,{nest:'Nest',food:'Food',gap:'Gap',brood:'Brood',queen:'Queen',worker:'W1',focus:'W1 enlarged',nurse:'N1',specimen:'L1'},transition,mobile);
  const state = readState('?chapter=forage'); renderer.render(state);
  return {world,body,mobile,animations,renderer,state};
}
test('actual SVG renderer retains worker nodes through route changes and hides only explanatory markers', () => {
  const h = harness(), ant = h.world.querySelector('#worker-0'), scents = h.world.querySelector('#ant-scents');
  assert.equal(ant.querySelectorAll('.ant-leg').length,6); assert.equal(ant.querySelectorAll('.ant-feeler').length,2);
  assert.equal(h.body.querySelector('#ant-body-shell').tag, 'radialGradient');
  assert.ok(h.body.querySelectorAll('*').some(node => node.getAttribute('fill') === 'url(#ant-body-shell)'));
  assert.equal(h.mobile.querySelector('#ant-mobile-shell').tag, 'radialGradient');
  assert.ok(h.mobile.querySelectorAll('*').some(node => node.getAttribute('fill') === 'url(#ant-mobile-shell)'));
  const nodes = [...scents.children]; h.renderer.render({...h.state,time:35});
  const pose = ant.getAttribute('transform'); assert.ok(nodes.some(node => Number(node.getAttribute('opacity')) > 0));
  h.renderer.render({...h.state,time:35,scent:false,labels:false}); assert.equal(ant.getAttribute('transform'),pose);
  assert.ok(nodes.every(node => Number(node.getAttribute('opacity')) === 0));
  h.renderer.render({...h.state,time:75,condition:'blocked'});
  assert.equal(h.world.querySelector('#worker-0'),ant); assert.deepEqual(scents.children,nodes); assert.equal(ant.getAttribute('opacity'),undefined);
  assert.equal(h.world.querySelector('#ant-obstacle').getAttribute('visibility'),'visible');
});
test('the enlarged W1 view follows the actual worker position, walking pose and food state', () => {
  const h = harness(), focus = h.world.querySelector('#focus-W1'), marker = h.world.querySelector('#ant-focus-link');
  assert.equal(focus.querySelectorAll('.ant-leg').length, 6);
  const before = marker.getAttribute('d');
  h.renderer.render({...h.state,time:28});
  assert.notEqual(marker.getAttribute('d'), before);
  assert.equal(focus.querySelector('.food-status').getAttribute('opacity'), '1');
  assert.equal(h.mobile.querySelector('#mobile-W1').querySelector('.food-status').getAttribute('opacity'), '1');
  assert.equal(focus.querySelector('.ant-leg').getAttribute('transform'), h.world.querySelector('#worker-0').querySelector('.ant-leg').getAttribute('transform'));
  assert.equal(h.mobile.querySelector('#mobile-W1').querySelector('.ant-leg').getAttribute('transform'), focus.querySelector('.ant-leg').getAttribute('transform'));
  h.renderer.render({...h.state,time:5,labels:false});
  assert.equal(focus.querySelector('.food-status').getAttribute('opacity'), '0');
  assert.equal(h.mobile.querySelector('#mobile-W1').querySelector('.food-status').getAttribute('opacity'), '0');
  assert.equal(marker.getAttribute('opacity'), '0');
  h.renderer.render({...h.state,time:90,chapter:'nest'});
  assert.equal(h.world.querySelector('#ant-focus').getAttribute('visibility'), 'hidden');
});
test('camera has a real intermediate state and pause converges to selected view without changing W1 pose', () => {
  const h = harness(); h.renderer.render({...h.state,time:75}); const pose=h.world.querySelector('#worker-0').getAttribute('transform');
  const start = h.world.getAttribute('viewBox'); h.renderer.render({...h.state,time:75,chapter:'nest'});
  const camera = h.animations.at(-1); camera.onUpdate(.5); const middle = h.world.getAttribute('viewBox');
  assert.notEqual(middle,start); assert.notEqual(middle,'40 305 500 260');
  h.renderer.pause(); assert.equal(camera.active,false); assert.equal(h.world.getAttribute('viewBox'),'40 305 500 260');
  camera.onUpdate(.1); assert.equal(h.world.getAttribute('viewBox'),'40 305 500 260');
  assert.equal(h.world.querySelector('#worker-0').getAttribute('transform'),pose);
  h.renderer.render({...h.state,time:75,chapter:'nest'}); assert.equal(h.world.getAttribute('viewBox'),'40 305 500 260');
});
test('finite care moves N1, not W1; changing brood cancels old care and preserves distinct L1', () => {
  const h=harness(); h.renderer.render({...h.state,time:100,chapter:'nest',brood:.36}); h.renderer.pause();
  const w1=h.world.querySelector('#worker-0').getAttribute('transform'), care=h.world.querySelector('#ant-care-pose');
  const start=care.getAttribute('transform'); h.renderer.care(); const animation=h.animations.at(-1); animation.onUpdate(.5);
  assert.notEqual(care.getAttribute('transform'),start); assert.equal(h.world.querySelector('#worker-0').getAttribute('transform'),w1);
  h.renderer.render({...h.state,time:100,chapter:'nest',brood:.62}); assert.equal(animation.active,false); assert.equal(care.getAttribute('transform'),start);
  animation.onUpdate(.5); assert.equal(care.getAttribute('transform'),start);
  h.renderer.render({...h.state,time:100,chapter:'nest',brood:.9}); assert.ok(h.world.querySelector('#L1-adult')); assert.ok(h.world.querySelector('#worker-0'));
});
test('dispose clears real SVG and suppresses all delayed presentation callbacks', () => {
  const h=harness(); h.renderer.render({...h.state,chapter:'nest'}); const camera=h.animations.at(-1); h.renderer.dispose();
  assert.equal(h.world.children.length,0); camera.onUpdate(.5); h.renderer.render(h.state); h.renderer.care();
  assert.equal(h.world.children.length,0); assert.equal(h.body.children.length,0);
  assert.equal(h.mobile.children.length,0);
});

test('brood renders in the visible chamber, with unique IDs and intact paint-server stops at every stage', () => {
  const h = harness();
  for (const [progress, expected] of [[0,'egg'],[.36,'larva'],[.62,'pupa'],[.9,'adult']]) {
    h.renderer.render({...h.state, chapter:'nest', time:100, brood:progress});
    const all = [...h.world.querySelectorAll('*'), ...h.body.querySelectorAll('*'), ...h.mobile.querySelectorAll('*')];
    const ids = all.map(node => node.getAttribute('id')).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, 'Every SVG id must be unique across both rendered views');
    const brood = h.world.querySelector('#ant-brood');
    assert.equal(brood.tag, 'g', 'The first ID selector must target the chamber group, never a gradient in defs');
    assert.equal(brood.getAttribute('transform'), 'translate(233 437)');
    assert.ok(brood.querySelectorAll('*').some(node => node.getAttribute('data-stage') === expected));
    const defs = h.world.querySelector('defs');
    assert.ok(!defs.querySelectorAll('*').includes(brood));
    const paint = h.world.querySelector('#ant-brood-fill');
    assert.equal(paint.tag, 'radialGradient');
    assert.equal(paint.querySelectorAll('stop').length, 3, 'Rendering must never replace gradient stops with brood shapes');
    assert.ok(paint.querySelectorAll('*').every(node => node.tag === 'stop'));
    if (expected !== 'adult') assert.ok(brood.querySelectorAll('*').some(node => node.getAttribute('fill') === 'url(#ant-brood-fill)'));
  }
});
