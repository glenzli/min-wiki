import test from 'node:test';
import assert from 'node:assert/strict';
import { createPainScene, drawPain, type Focus } from '../scene.ts';

class DrawnElement {
  attributes = new Map<string, string>();
  innerHTML = '';
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getTotalLength() { return 1; }
  getPointAtLength(length: number) { return { x: length, y: length }; }
}

function scene() {
  const elements = new Map<string, DrawnElement>();
  const original = globalThis.document;
  globalThis.document = { getElementById(id: string) {
    if (!elements.has(id)) elements.set(id, new DrawnElement());
    return elements.get(id);
  } } as unknown as Document;
  const numbers = (id: string, attribute: string) => (elements.get(id)!.attributes.get(attribute)!
    .match(/-?(?:\d*\.)?\d+(?:e[+-]?\d+)?/gi) ?? []).map(Number);
  return { elements, numbers, restore: () => { globalThis.document = original; } };
}

test('the actual SVG keeps both tendon lengths and the hand-to-attachment relation throughout withdrawal', () => {
  const drawn = scene();
  try {
    createPainScene();
    assert.ok(drawn.elements.get('art')!.innerHTML.includes('d="M540 430H576M688 430H725"'));
    for (let i = 0; i <= 100; i++) {
      drawPain(.68 + .16 * i / 100, 'both');
      const [origin, y1, bellyStart, bellyEnd, y2, attachment] = drawn.numbers('muscle-tendons', 'd');
      const [cx] = drawn.numbers('muscle-body', 'cx');
      const [rx] = drawn.numbers('muscle-body', 'rx');
      const [dx, dy] = drawn.numbers('hand', 'transform');
      assert.equal(origin, 540);
      assert.equal(y1, 430); assert.equal(y2, 430); assert.equal(dy, 0);
      assert.equal(bellyStart! - origin!, 36);
      assert.equal(attachment! - bellyEnd!, 37);
      assert.ok(Math.abs(cx! - rx! - bellyStart!) < 1e-10);
      assert.ok(Math.abs(cx! + rx! - bellyEnd!) < 1e-10);
      assert.ok(Math.abs(725 + dx! - attachment!) < 1e-10);
      assert.ok(dx! <= 0 && dx! >= -20);
    }
  } finally { drawn.restore(); }
});

test('focus changes and scrubbing keep a reproducible coupled muscle and hand drawing', () => {
  const drawn = scene();
  try {
    const geometry = (progress: number, focus: Focus) => {
      drawPain(progress, focus);
      return ['muscle-tendons', 'muscle-body', 'muscle-fibers', 'hand']
        .map(id => Object.fromEntries(drawn.elements.get(id)!.attributes));
    };
    const middle = geometry(.76, 'both');
    assert.deepEqual(geometry(.76, 'reflex'), middle);
    assert.deepEqual(geometry(.76, 'brain'), middle);
    geometry(1, 'both'); geometry(0, 'both');
    assert.deepEqual(geometry(.76, 'both'), middle);
    geometry(1, 'both');
    assert.deepEqual(drawn.numbers('hand', 'transform'), [-20, 0]);
    assert.deepEqual(drawn.numbers('muscle-tendons', 'd'), [540, 430, 576, 668, 430, 705]);
  } finally { drawn.restore(); }
});
