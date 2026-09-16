import test from 'node:test';
import assert from 'node:assert/strict';
import { animateValue } from '../src/visuals/transition.ts';

function environment(reduced = false) {
  const saved = new Map();
  const install = (name, value) => { saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, value }); };
  const preference = new EventTarget(); preference.matches = reduced;
  const window = new EventTarget(); window.matchMedia = () => preference;
  const document = new EventTarget(); document.hidden = false;
  const frames = new Map(); let serial = 0; let now = 0;
  install('window', window); install('document', document);
  install('performance', { now: () => now });
  install('requestAnimationFrame', callback => { frames.set(++serial, callback); return serial; });
  install('cancelAnimationFrame', id => frames.delete(id));
  return {
    window, document, preference, frames,
    tick(time) { now = time; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); },
    restore() { for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } },
  };
}

test('finite transitions follow wall time, never overshoot, and reach the exact target once', () => {
  const env = environment();
  try {
    const values = []; let complete = 0;
    animateValue({ from: 8, to: 2, duration: 200, onUpdate: value => values.push(value), onComplete: () => complete++ });
    env.tick(50); env.tick(100); env.tick(300);
    assert.deepEqual([values[0], values[2], values.at(-1)], [8, 5, 2]);
    assert.ok(values.every((value, index) => value >= 2 && value <= 8 && (index === 0 || value <= values[index - 1])));
    assert.equal(complete, 1); assert.equal(env.frames.size, 0);
  } finally { env.restore(); }
});

test('cancelled transitions never overwrite a newer selection', () => {
  const env = environment();
  try {
    const values = []; let complete = 0;
    const cancel = animateValue({ from: 0, to: 100, duration: 200, onUpdate: value => values.push(value), onComplete: () => complete++ });
    env.tick(50); cancel(); env.tick(300);
    assert.equal(values.length, 2); assert.equal(complete, 0); assert.equal(env.frames.size, 0);
  } finally { env.restore(); }
});

test('reduced motion renders the final state immediately without scheduling animation', () => {
  const env = environment(true);
  try {
    const values = []; let complete = 0;
    animateValue({ from: 0, to: 3, duration: 800, onUpdate: value => values.push(value), onComplete: () => complete++ });
    assert.deepEqual(values, [3]); assert.equal(complete, 1); assert.equal(env.frames.size, 0);
  } finally { env.restore(); }
});

test('backgrounding finishes a finite transition; pagehide cancels ownership', () => {
  const env = environment();
  try {
    const values = [];
    animateValue({ from: 0, to: 3, duration: 800, onUpdate: value => values.push(value) });
    env.document.hidden = true; env.document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(values.at(-1), 3); assert.equal(env.frames.size, 0);
    env.document.hidden = false;
    const second = [];
    animateValue({ from: 0, to: 9, duration: 800, onUpdate: value => second.push(value) });
    env.window.dispatchEvent(new Event('pagehide')); env.tick(1000);
    assert.deepEqual(second, [0]); assert.equal(env.frames.size, 0);
  } finally { env.restore(); }
});

test('enabling reduced motion during a transition settles at the final state', () => {
  const env = environment();
  try {
    const values = [];
    animateValue({ from: 0, to: 7, duration: 800, onUpdate: value => values.push(value) });
    env.tick(100); env.preference.matches = true; env.preference.dispatchEvent(new Event('change'));
    assert.equal(values.at(-1), 7); assert.equal(env.frames.size, 0);
  } finally { env.restore(); }
});
