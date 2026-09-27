import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { shadowTip } from './model.ts';
import { drawShadowScene } from './scene.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('shadows');
const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
let playing = false, frame = 0, last = 0, view = 0, targetView = 0;
let cancelSeek = () => {}, cancelView = () => {};
let reference: { x: number; height: number } | undefined;
const scene = el('scene') as unknown as SVGElement;
const referenceShadow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
referenceShadow.id = 'reference-shadow';
referenceShadow.setAttribute('fill', 'none');
referenceShadow.setAttribute('stroke', '#a86055');
referenceShadow.setAttribute('stroke-width', '2');
referenceShadow.setAttribute('stroke-dasharray', '5 5');
scene.querySelector('#shadow-0')!.before(referenceShadow);
const referenceControl = document.createElement('label');
referenceControl.className = 'check';
const referenceToggle = document.createElement('input');
referenceToggle.type = 'checkbox';
referenceControl.append(referenceToggle, document.createTextNode(t('记住现在的影子，再移动灯')));
el('reset').after(referenceControl);
const referenceLegend = document.createElement('span');
referenceLegend.textContent = t('红虚线：记录时的影子');
referenceLegend.hidden = true;
el('shadow-label').before(referenceLegend);
function update() {
  const x = Number(input('position').value), h = Number(input('height').value), extended = input('soft').checked;
  drawShadowScene(scene, x, h, view, extended, reference);
  referenceLegend.hidden = !reference;
  el('height-value').textContent = `${Math.round(h)}`;
  el('shadow-label').textContent = t('头顶中心线投影：{{length}} 格', { length: (Math.abs(shadowTip(x, h) - 450) / 40).toFixed(1) });
  el('readout').textContent = x < 449 ? t('灯在左边，影子伸向右边。') : x > 451 ? t('灯在右边，影子伸向左边。') : t('灯在正上方，影子缩在脚下。');
  el('play').textContent = playing ? t('暂停观察') : x >= 650 ? t('从头回看') : t('让灯慢慢走');
  input('position').setAttribute('aria-valuetext', t('灯的水平位置：{{value}}', { value: Math.round(x) }));
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.view) === targetView)));
}
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; cancelSeek(); }
function tick(now: number) {
  frame = 0; if (!playing || document.hidden) return;
  const x = Math.min(650, Number(input('position').value) + Math.min((now - last) / 1000, .1) * 22); last = now;
  input('position').value = String(x); if (x >= 650) playing = false; update(); if (playing) frame = requestAnimationFrame(tick);
}
function resume() { playing = true; last = performance.now(); frame = requestAnimationFrame(tick); update(); }
function seek(to: number, after?: () => void) { stop(); cancelSeek = animateValue({ from: Number(input('position').value), to, duration: 750, onUpdate: x => { input('position').value = String(x); update(); }, onComplete: after }); }
el('play').addEventListener('click', () => { cancelSeek(); if (playing) { stop(); update(); } else if (Number(input('position').value) >= 650) seek(250, resume); else resume(); });
for (const id of ['position', 'height', 'soft']) el(id).addEventListener('input', () => { stop(); update(); });
referenceToggle.addEventListener('change', () => {
  reference = referenceToggle.checked ? { x: Number(input('position').value), height: Number(input('height').value) } : undefined;
  update();
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-position]')) b.addEventListener('click', () => seek(Number(b.dataset.position)));
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.addEventListener('click', () => { cancelView(); targetView = Number(b.dataset.view); cancelView = animateValue({from: view, to: targetView, duration: 650, onUpdate: next => {view = next; update();}}); });
el('reset').addEventListener('click', () => { stop(); input('height').value = '240'; input('soft').checked = false; reference = undefined; referenceToggle.checked = false; seek(280); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); update(); } });
window.addEventListener('pagehide', () => { stop(); cancelView(); });
update(); mountReadingMode('main > details');

const presentation = mountPresentationFrame({"root": ".lab", "visual": ".scene-wrap"});
if (presentation) presentation.notes.append(...document.querySelectorAll<HTMLDetailsElement>('main > details'));
