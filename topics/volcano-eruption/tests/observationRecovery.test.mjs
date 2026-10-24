import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Execute the complete production facade with renderer construction substituted.
// This exercises real loss/retry wiring without requiring a WebGL device.
const source = await readFile(new URL('../scene.ts', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('scene.ts', source, ts.ScriptTarget.ES2022, true);
const declaration = parsed.statements.find(node => ts.isClassDeclaration(node));
const code = ts.transpileModule(declaration.getText(parsed).replace(/^export /, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

test('loss and GPU retry retain independent cutaway preference, camera and exact process frame', () => {
  const gpu = [], fallback = [], holder = { current: undefined };
  class Canvas extends EventTarget {
    dataset = {}; removeAttribute() {}
    cloneNode() { return new Canvas(); }
    replaceWith(next) { holder.current = next; }
  }
  class Renderer {
    constructor() { gpu.push(this); }
    setDetailMotion(enabled) { this.enabled = enabled; }
    setView(view, cutaway) { this.view = view; this.cutaway = cutaway; }
    draw(progress, settings) { this.progress = progress; this.settings = settings; }
    dispose() { this.disposed = true; }
  }
  class Illustration {
    constructor() { fallback.push(this); }
    setView(view) { this.view = view; }
    draw(progress, settings) { this.progress = progress; this.settings = settings; }
    dispose() { this.disposed = true; }
  }
  class RendererEvent extends Event { constructor(type, options) { super(type, options); this.detail = options.detail; } }
  const Facade = new Function('Eruption3DScene', 'CanvasScene', 'CustomEvent', `${code}\nreturn TopicScene;`)(Renderer, Illustration, RendererEvent);
  const scene = new Facade(new Canvas()), settings = { vents: 3, gas: .4, viscosity: .7 };
  scene.draw(.413, settings); scene.setView('vent', 3, true); scene.setDetailMotion(false);
  const lost = new Event('webglcontextlost', { cancelable: true }); holder.current.dispatchEvent(lost);
  assert.equal(lost.defaultPrevented, true); assert.equal(gpu[0].disposed, true);
  assert.equal(scene.is3D, false); assert.equal(fallback[0].progress, .413); assert.equal(fallback[0].settings, settings);
  // A presentation preference can change while the static illustration is shown.
  scene.setView('vent', 3, false); scene.retry3D();
  assert.equal(scene.is3D, true); assert.equal(fallback[0].disposed, true);
  assert.equal(gpu[1].view, 'vent'); assert.equal(gpu[1].cutaway, false);
  assert.equal(gpu[1].progress, .413); assert.equal(gpu[1].settings, settings); assert.equal(gpu[1].enabled, false);
  scene.dispose(); scene.dispose(); assert.equal(gpu[1].disposed, true);
});
