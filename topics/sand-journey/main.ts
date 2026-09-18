import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { stages, stories } from './content.ts';
import { draw } from './scene.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation('sand-journey');
const el = (id: string) => document.getElementById(id)!;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let progress = 0, condition = 0, frame = 0, playing = false, zoom = 0, close = false;
let cancelStep = () => {}, cancelView = () => {};
function stop() { cancelAnimationFrame(frame); frame = 0; playing = false; cancelStep(); el('play').textContent = t('播放过程'); }
function render() {
 const stage = Math.min(3, Math.floor(progress * 4));
 if (el('story-title').textContent !== stages[stage]) { el('story-title').textContent = stages[stage]; el('story').textContent = stories[stage]; }
 (el('progress') as HTMLInputElement).value = String(Math.round(progress * 1000));
 el('progress').setAttribute('aria-valuetext', `${Math.round(progress * 100)}% · ${stages[stage]}`);
 el('stages').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(stage === i)));
 (el('next') as HTMLButtonElement).disabled = stage === 3;
 const result = draw(progress, condition);
 el('scene').innerHTML = result.scene;
 const whole = [0, 0, 850, 540], local = result.focus;
 el('scene').setAttribute('viewBox', whole.map((v, i) => (v + (local[i]! - v) * zoom).toFixed(3)).join(' '));
 el('metrics').replaceChildren(...result.labels.map(label => { const span = document.createElement('span'); span.textContent = label; return span; }));
}
function goTo(target: number) { stop(); cancelStep = animateValue({ from: progress, to: target, duration: 1100, onUpdate: value => { progress = value; render(); } }); }
function play() {
 if (playing) { stop(); return; }
 stop();
 if (motion.matches) { progress = 1; render(); return; }
 if (progress >= 1) progress = 0;
 playing = true; el('play').textContent = t('暂停');
 let previous = performance.now();
 const tick = (now: number) => {
  progress = Math.min(1, progress + Math.min(50, now - previous) / 14000); previous = now; render();
  if (progress < 1) frame = requestAnimationFrame(tick); else stop();
 };
 frame = requestAnimationFrame(tick);
}
el('stages').replaceChildren(...stages.map((label, i) => { const button = document.createElement('button'); button.textContent = label; button.dataset.number = String(i + 1); button.addEventListener('click', () => goTo(i / 3)); return button; }));
el('play').addEventListener('click', play);
el('progress').addEventListener('input', () => { stop(); progress = Number((el('progress') as HTMLInputElement).value) / 1000; render(); });
el('condition').addEventListener('change', () => { stop(); condition = Number((el('condition') as HTMLSelectElement).value); render(); });
el('next').addEventListener('click', () => goTo(Math.min(1, (Math.floor(progress * 4) + 1) / 3)));
el('reset').addEventListener('click', () => goTo(0));
el('view').addEventListener('click', () => { close = !close; el('view').setAttribute('aria-pressed', String(close)); cancelView(); cancelView = animateValue({ from: zoom, to: Number(close), duration: 650, onUpdate: value => { zoom = value; render(); } }); });
function suspend() { stop(); cancelView(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
window.addEventListener('pagehide', suspend);
motion.addEventListener('change', () => { suspend(); zoom = Number(close); render(); });
render();
mountReadingMode('details:not(.references)');
