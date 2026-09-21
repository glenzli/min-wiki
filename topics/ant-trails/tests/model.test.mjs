import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conditions, workerAt, scentAt, eventAt, readState, writeState, broodStage } from '../model.ts';

test('all fixed workers remain continuous through every authored route junction', () => {
  for (const condition of conditions) for (let id = 0; id < 4; id++) {
    let last = workerAt(id, 0, condition);
    for (let i = 1; i <= 10000; i++) {
      const next = workerAt(id, i / 100, condition);
      assert.equal(next.id, `W${id + 1}`);
      assert.ok(Number.isFinite(next.angle));
      assert.ok(Math.hypot(next.x - last.x, next.y - last.y) < 1.4, `${condition} W${id + 1} t=${i / 100}`);
      last = next;
    }
  }
});
test('the shared first journey precedes recruitment and deposited markers never anticipate W1', () => {
  for (let t = 0; t < 54; t += 1) {
    for (const condition of conditions) assert.deepEqual(workerAt(0, t, condition), workerAt(0, t, 'intact'));
  }
  assert.ok(scentAt(21, 'intact').every(mark => mark.strength === 0));
  for (const mark of scentAt(40, 'intact').filter(mark => mark.route === 'direct')) {
    const ant = workerAt(0, mark.depositedAt, 'intact');
    assert.ok(Math.hypot(ant.x - mark.x, ant.y - mark.y) < 1e-8);
    assert.equal(scentAt(mark.depositedAt - .001, 'intact').find(v => v.x === mark.x && v.y === mark.y)?.strength, 0);
  }
  for (let i = 1; i < 4; i++) assert.deepEqual(workerAt(i, 0, 'intact'), workerAt(i, 40, 'intact'));
});
test('blocked workers do not cross the obstructed passage and the detour is marked only on return', () => {
  for (let t = 54; t <= 100; t += .05) for (let i = 0; i < 4; i++) {
    const ant = workerAt(i, t, 'blocked');
    assert.ok(!(ant.x > 466 && ant.x < 576 && ant.y > 176 && ant.y < 271), `W${i+1} at ${t}`);
  }
  assert.ok(scentAt(82, 'blocked').filter(v => v.route === 'detour').every(v => !v.strength));
  for (const mark of scentAt(96, 'blocked').filter(v => v.route === 'detour')) {
    const ant = workerAt(0, mark.depositedAt, 'blocked');
    assert.ok(Math.hypot(ant.x - mark.x, ant.y - mark.y) < 1e-8);
  }
  assert.ok(scentAt(100, 'blocked').some(v => v.route === 'detour' && v.strength > .5));
});
test('decay and physical obstruction produce distinct positions and events, not a reskinned loop', () => {
  assert.equal(eventAt(70, 'faded'), 'memory'); assert.equal(eventAt(70, 'blocked'), 'explore');
  assert.ok(workerAt(0, 75, 'faded').y > 200); assert.ok(workerAt(0, 75, 'blocked').y < 200);
  const remaining = condition => scentAt(70, condition).filter(v => v.route === 'direct').reduce((sum, v) => sum + v.strength, 0);
  assert.ok(remaining('faded') < remaining('intact') / 10);
  assert.ok(workerAt(1, 85, 'faded').x < 460); assert.ok(workerAt(0, 85, 'faded').x > 450);
  for (const condition of conditions) { assert.equal(workerAt(0, 100, condition).y, 437); assert.equal(workerAt(0, 100, condition).x, 200); }
});
test('route codec bounds invalid values and preserves language and unrelated parameters', () => {
  assert.equal(readState('?chapter=unknown&t=Infinity').time, 0);
  assert.equal(readState('?t=6').time, 100); assert.equal(readState('?brood=-5').brood, 0);
  const state = readState('?chapter=nest&condition=blocked&t=.923&brood=.62&part=legs&labels=0&scent=0');
  assert.deepEqual(readState(writeState(state, '?lang=en&ref=old')), state);
  const query = new URLSearchParams(writeState(state, '?lang=en&ref=old'));
  assert.equal(query.get('lang'), 'en'); assert.equal(query.get('ref'), 'old');
  assert.deepEqual([0,.36,.62,.9].map(broodStage), [0,1,2,3]);
});
test('bilingual learning has the shared summary shape and equally structured rich copy', () => {
  const learning = JSON.parse(readFileSync(new URL('../learning.json', import.meta.url), 'utf8'));
  const copy = JSON.parse(readFileSync(new URL('../content.json', import.meta.url), 'utf8'));
  for (const lang of ['zh','en']) { assert.equal(learning[lang].academic.length, 3); assert.equal(learning[lang].narration.length, 4); assert.equal(copy[lang].broodTexts.length, 4); assert.equal(copy[lang].roles.length, 3); }
  const shape = node => Array.isArray(node) ? node.map(shape) : node && typeof node === 'object' ? Object.fromEntries(Object.entries(node).map(([key,value]) => [key,shape(value)])) : typeof node;
  assert.deepEqual(shape(copy.zh), shape(copy.en));
});
