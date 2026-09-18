import { animateValue } from '../../src/visuals/transition.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { WORLDS, encounter, layersFor, type View, type Layer } from './model.ts';
import { CONTENT, DETAILS } from './content.ts';
import { TopicScene } from './scene.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('planet-surfaces');
const el = (id: string) => document.getElementById(id)!;
let world: typeof WORLDS[number] = WORLDS[3], view: View = 'landscape', academic = false, progress = 0, phase = 0, playing = false, frame = 0, last = 0, drawnAt = 0;
let scene: TopicScene | undefined;
try { scene = new TopicScene(el('scene') as HTMLCanvasElement); } catch { el('scene-error').hidden = false; }
const layers: Record<Layer, string> = { air: t('空气或外逸层'), water: t('液态海水'), seabed: t('岩石海床'), ground: t('固体岩石表面'), clouds: t('云层'), 'dense-fluid': t('更稠密的流体'), hydrocarbon: t('液态甲烷与乙烷'), 'icy-bed': t('冰质湖底示意'), melt: t('熔融岩石 · 深度未知') };
const layerColors: Record<Layer, string> = { air: '#b4c9d2', water: '#4595ad', seabed: '#9a8261', ground: '#ab8c64', clouds: '#dbc4a5', 'dense-fluid': '#476674', hydrocarbon: '#898058', 'icy-bed': '#c0b997', melt: '#eb8b47' };
function update(draw = true) {
  const content = CONTENT[world.id], details = DETAILS[world.id], layer = encounter(world, progress);
  el('title').textContent = content.title; el('story').textContent = academic ? content.academic : content.kids; el('observe').textContent = content.observe;
  el('kind').textContent = world.body === 'moon' ? t('土星的卫星') : world.body === 'exoplanet' ? t('太阳系外的岩石行星') : world.kind === 'rock' ? t('岩石行星') : world.kind === 'gas' ? t('气态巨行星') : t('冰巨星');
  el('material').textContent = details.material; el('feature').textContent = details.feature; el('evidence').textContent = details.evidence;
  el('evidence').classList.toggle('inferred', world.evidence === 'inferred');
  el('layer').textContent = view === 'section' ? layers[layer] : view === 'globe' ? t('外观不等于地面') : details.material;
  el('play').textContent = playing ? t('暂停') : view === 'section' ? progress >= 1 ? t('重新探索') : progress > 0 ? t('继续下降') : t('开始下降') : view === 'globe' ? t('慢慢转一圈') : t('缓慢巡视');
  (el('depth') as HTMLInputElement).value = String(progress * 1000); el('depth-control').hidden = view !== 'section'; el('reset').hidden = view !== 'section';
  el('section-legend').hidden = view !== 'section';
  el('view-note').textContent = view === 'section' ? world.id === 'cancri' ? t('教学剖面 · 岩浆海底部深度尚不确定') : t('教学剖面 · 层厚与下降距离不按比例') : view === 'globe' && world.id === 'titan' ? t('可见光下，厚雾遮住了土卫六的湖海') : view === 'landscape' && world.id === 'titan' ? t('想象来到极区湖岸 · 不是惠更斯号着陆点') : !world.surface && view === 'landscape' ? t('从云层上方观察 · 没有可以站立的地面') : t('代表性地貌与光照 · 不是实拍或真实地图');
  const legend = el('section-legend');
  if (legend.dataset.world !== world.id) {
    legend.replaceChildren(); legend.dataset.world = world.id;
    for (const key of layersFor(world)) { const item = document.createElement('li'); item.dataset.layer = key; const dot = document.createElement('i'); dot.style.background = layerColors[key]; dot.setAttribute('aria-hidden', 'true'); item.append(dot, layers[key]); legend.append(item); }
  }
  legend.querySelectorAll<HTMLElement>('[data-layer]').forEach(item => { item.classList.toggle('active', item.dataset.layer === layer); });
  document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.world === world.id)));
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  if (draw) scene?.draw(world, view, progress, phase);
  el('scene-preparing').hidden = !scene?.preparing;
  el('scene-error').hidden = !!scene && !scene.failed;
}
let cancelJourney = () => {};
for (const type of ['click', 'input', 'keydown']) document.addEventListener(type, () => { cancelJourney(); scene?.stopTransition(); }, { capture: true });
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; }
function tick(now: number) {
  frame = 0; if (!playing || document.hidden) return;
  const dt = Math.min(.1, (now - last) / 1000); last = now; phase += dt;
  if (view === 'section') { progress = Math.min(1, progress + dt / 20); if (progress >= 1) playing = false; }
  if (now - drawnAt > 32 || !playing) { update(); drawnAt = now; }
  if (playing) frame = requestAnimationFrame(tick);
}
for (const item of WORLDS) {
  const button = document.createElement('button'); button.dataset.world = item.id; button.textContent = CONTENT[item.id].name; button.style.setProperty('--world', item.color);
  button.addEventListener('click', () => { stop(); world = item; progress = 0; phase = 0; update(false); scene?.transition(world, view, progress, phase); el('scene-preparing').hidden = !scene?.preparing; }); el('worlds').append(button);
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.addEventListener('click', () => { stop(); view = b.dataset.view as View; update(false); scene?.transition(world, view, progress, phase); el('scene-preparing').hidden = !scene?.preparing; });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
el('play').addEventListener('click', () => { if (playing) stop(); else { if (view === 'section' && progress >= 1) progress = 0; playing = true; last = performance.now(); frame = requestAnimationFrame(tick); } update(); });
el('reset').addEventListener('click', () => { stop(); cancelJourney = animateValue({ from: progress, to: 0, duration: 900, onUpdate: value => { progress = value; update(); } }); });
document.addEventListener('keydown', event => { if (event.code === 'Space' && !event.repeat && !(event.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')) { event.preventDefault(); el('play').click(); } });
el('depth').addEventListener('input', () => { stop(); progress = Number((el('depth') as HTMLInputElement).value) / 1000; update(); });
for (const item of WORLDS) { const link = document.createElement('a'); link.href = DETAILS[item.id].source; link.textContent = 'NASA · ' + CONTENT[item.id].name; el('sources').append(link); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
window.addEventListener('pagehide', e => { cancelAnimationFrame(frame); frame = 0; if (!e.persisted) { stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
scene?.onPreparationChange(() => update(false));
update();
