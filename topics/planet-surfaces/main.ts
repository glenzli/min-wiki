import { animateValue } from '../../src/visuals/transition.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { WORLDS, encounter } from './model.ts';
import { CONTENT } from './content.ts';
import { TopicScene } from './scene.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('planet-surfaces');
const el = (id: string) => document.getElementById(id)!;
let world: typeof WORLDS[number] = WORLDS[3], view = 'landscape', academic = false, progress = 0, playing = false, frame = 0, last = 0;
let scene: TopicScene | undefined;
try { scene = new TopicScene(el('scene') as HTMLCanvasElement); } catch { el('scene-error').hidden = false; }
const layers = { air: t('空气或外逸层'), water: t('液态海水'), seabed: t('岩石海床'), ground: t('固体岩石表面'), clouds: t('云层'), 'dense-fluid': t('更稠密的流体') };
function update() {
  const content = CONTENT[world.id];
  el('title').textContent = content.title; el('story').textContent = academic ? content.academic : content.kids; el('observe').textContent = content.observe;
  el('kind').textContent = world.kind === 'rock' ? t('岩石行星') : world.kind === 'gas' ? t('气态巨行星') : t('冰巨星');
  el('layer').textContent = layers[encounter(world, progress)];
  el('play').textContent = playing ? t('暂停') : progress >= 1 ? t('重新探索') : progress > 0 ? t('继续下降') : t('开始下降');
  (el('depth') as HTMLInputElement).value = String(progress * 1000); el('controls').hidden = view !== 'section';
  document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.world === world.id)));
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  scene?.draw(world, view, progress);
}
let cancelJourney = () => {};
for (const type of ['click', 'input', 'keydown']) document.addEventListener(type, () => cancelJourney(), { capture: true });
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; }
function tick(now: number) { frame = 0; if (!playing || document.hidden) return; progress = Math.min(1, progress + Math.min(.1, (now - last) / 1000) / 12); last = now; if (progress >= 1) playing = false; update(); if (playing) frame = requestAnimationFrame(tick); }
for (const item of WORLDS) { const button = document.createElement('button'); button.dataset.world = item.id; button.textContent = CONTENT[item.id].name; button.style.setProperty('--world', item.color); button.addEventListener('click', () => { stop(); world = item; progress = 0; update(); }); el('worlds').append(button); }
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.addEventListener('click', () => { stop(); view = b.dataset.view!; update(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
el('play').addEventListener('click', () => { if (playing) stop(); else { if (progress >= 1) progress = 0; playing = true; last = performance.now(); frame = requestAnimationFrame(tick); } update(); });
el('reset').addEventListener('click', () => { stop(); cancelJourney = animateValue({ from: progress, to: 0, duration: 900, onUpdate: value => { progress = value; update(); } }); });
document.addEventListener('keydown', event => { if (event.code === 'Space' && !event.repeat && view === 'section' && !(event.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')) { event.preventDefault(); el('play').click(); } });
el('depth').addEventListener('input', () => { stop(); progress = Number((el('depth') as HTMLInputElement).value) / 1000; update(); });
for (const item of WORLDS) { const link = document.createElement('a'); link.href = `https://science.nasa.gov/${item.id}/facts/`; link.textContent = 'NASA · ' + CONTENT[item.id].name; el('sources').append(link); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
window.addEventListener('pagehide', e => { cancelAnimationFrame(frame); frame = 0; if (!e.persisted) { stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
update();
