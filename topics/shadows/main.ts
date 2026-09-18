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
function update() {
  const x = Number(input('position').value), h = Number(input('height').value), extended = input('soft').checked;
  drawShadowScene(el('scene') as unknown as SVGElement, x, h, view, extended);
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
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-position]')) b.addEventListener('click', () => seek(Number(b.dataset.position)));
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.addEventListener('click', () => { cancelView(); targetView = Number(b.dataset.view); cancelView = animateValue({from: view, to: targetView, duration: 650, onUpdate: next => {view = next; update();}}); });
el('reset').addEventListener('click', () => { stop(); input('height').value = '240'; input('soft').checked = false; seek(280); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); update(); } });
window.addEventListener('pagehide', () => { stop(); cancelView(); });
update(); mountReadingMode('details:not(.references)');
