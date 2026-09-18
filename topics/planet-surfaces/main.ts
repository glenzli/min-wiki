import { animateValue } from '../../src/visuals/transition.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument, language } from '../../src/platform/i18n.ts';
import { WORLDS, type View } from './model.ts';
import { INTERIORS, interiorAt, layerStop, type Bilingual } from './interior.ts';
import type { Angle } from './camera.ts';
import { CONTENT, DETAILS } from './content.ts';
import { TopicScene } from './scene.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('planet-surfaces');
const el = (id: string) => document.getElementById(id)!;
const text = (pair: Bilingual) => language === 'en' ? pair.en : pair.zh;
let world: typeof WORLDS[number] = WORLDS[3], view: View = 'landscape', academic = false, progress = 0, phase = 0;
let playing: false | 'journey' | 'orbit' = false, frame = 0, last = 0, drawnAt = 0;
let scene: TopicScene | undefined, cancelJourney = () => {};
try { scene = new TopicScene(el('scene') as HTMLCanvasElement); } catch { el('scene-error').hidden = false; }
function update(draw = true) {
  const content = CONTENT[world.id], details = DETAILS[world.id], profile = INTERIORS[world.id], layer = interiorAt(world.id, progress);
  const section = view === 'section';
  el('title').textContent = section ? t('从外面到中心') : content.title;
  el('story').textContent = section ? text(profile.summary) : academic ? content.academic : content.kids;
  el('observe').textContent = section ? text(profile.evidence) : content.observe;
  el('kind').textContent = world.body === 'moon' ? t('土星的卫星') : world.body === 'exoplanet' ? t('太阳系外的岩石行星') : world.kind === 'rock' ? t('岩石行星') : world.kind === 'gas' ? t('气态巨行星') : t('冰巨星');
  el('material').textContent = details.material; el('feature').textContent = details.feature; el('evidence').textContent = details.evidence;
  el('evidence').classList.toggle('inferred', world.evidence === 'inferred');
  el('scene-facts').hidden = section;
  el('layer').textContent = section ? progress >= 1 ? t('已到达中心') : t('表层 → 中心 · {{percent}}%', { percent: Math.round(progress * 100) }) : view === 'globe' ? t('外观不等于地面') : details.material;
  el('play').textContent = playing && (playing === 'journey' || !section) ? t('暂停') : section ? progress >= 1 ? t('重新探索') : progress > 0 ? t('继续到中心') : t('从表层走到中心') : t('环绕巡视');
  el('orbit').textContent = playing === 'orbit' ? t('暂停环绕') : t('环绕看剖面');
  el('orbit').setAttribute('aria-pressed', String(playing === 'orbit'));
  for (const id of ['depth-control', 'reset', 'center', 'section-legend', 'layer-card']) el(id).hidden = !section;
  el('orbit').hidden = !section || !scene?.interactive;
  el('camera-controls').hidden = !scene?.interactive;
  el('gesture-hint').hidden = !scene?.interactive;
  const range = el('depth') as HTMLInputElement;
  range.value = String(progress * 1000); range.setAttribute('aria-valuetext', text(layer.name) + (progress >= 1 ? ' · ' + t('中心') : ''));
  el('current-layer').textContent = text(layer.name);
  el('layer-description').textContent = text(academic ? layer.science : layer.kids);
  el('layer-status').textContent = layer.uncertain ? t('候选解释 · 仍在研究') : t('内部结构的科学模型');
  el('layer-status').classList.toggle('uncertain', !!layer.uncertain);
  el('layer-card').style.setProperty('--layer-color', layer.color);
  el('view-note').textContent = section ? t('整颗星球的教学剖面 · 层厚不按比例，虚线提示不确定的内部划分') : view === 'globe' && world.id === 'titan' ? t('可见光下，厚雾遮住了土卫六的湖海') : view === 'landscape' && world.id === 'titan' ? t('想象来到极区湖岸 · 不是惠更斯号着陆点') : !world.surface && view === 'landscape' ? t('从云层上方观察 · 没有可以站立的地面') : t('代表性地貌与光照 · 不是实拍或真实地图');
  const legend = el('section-legend');
  if (legend.dataset.world !== world.id) {
    legend.replaceChildren(); legend.dataset.world = world.id;
    profile.layers.forEach((item, index) => {
      const li = document.createElement('li'), button = document.createElement('button'), dot = document.createElement('i');
      button.dataset.layer = item.id; dot.style.background = item.color; dot.setAttribute('aria-hidden', 'true');
      button.append(dot, `${index + 1}. ${text(item.name)}`); button.addEventListener('click', () => jump(layerStop(world.id, index)));
      li.append(button); legend.append(li);
    });
    const sources = el('interior-sources'); sources.replaceChildren();
    for (const source of profile.sources) { const link = document.createElement('a'); link.href = source.url; link.textContent = source.title; sources.append(link); }
  }
  legend.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.layer === layer.id)));
  document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.world === world.id)));
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  if (draw) scene?.draw(world, view, progress, phase);
  el('scene-preparing').hidden = !scene?.preparing;
  el('scene-error').hidden = !!scene && (!scene.failed || scene.interactive);
}
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; }
function jump(to: number) {
  stop(); cancelJourney(); scene?.stopTransition();
  cancelJourney = animateValue({ from: progress, to, duration: 950, onUpdate: value => { progress = value; update(); } });
}
function start(mode: 'journey' | 'orbit') {
  stop(); playing = mode; if (mode === 'orbit') scene?.startTour();
  last = performance.now(); frame = requestAnimationFrame(tick); update();
}
function tick(now: number) {
  frame = 0; if (!playing || document.hidden) return;
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (playing === 'journey') { progress = Math.min(1, progress + dt / 32); if (progress >= 1) playing = false; }
  else phase += dt;
  if (now - drawnAt > 32 || !playing) { update(); drawnAt = now; }
  if (playing) frame = requestAnimationFrame(tick);
}
for (const type of ['click', 'input', 'keydown']) document.addEventListener(type, () => { cancelJourney(); scene?.stopTransition(); }, { capture: true });
for (const item of WORLDS) {
  const button = document.createElement('button'); button.dataset.world = item.id; button.textContent = CONTENT[item.id].name; button.style.setProperty('--world', item.color);
  button.addEventListener('click', () => { stop(); world = item; progress = 0; phase = 0; update(false); scene?.transition(world, view, progress, phase); update(false); }); el('worlds').append(button);
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.addEventListener('click', () => { stop(); view = b.dataset.view as View; update(false); scene?.transition(world, view, progress, phase); update(false); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-angle]')) b.addEventListener('click', () => { stop(); update(false); scene?.setAngle(b.dataset.angle as Angle); });
el('play').addEventListener('click', () => {
  if (playing && (playing === 'journey' || view !== 'section')) { stop(); update(); }
  else { if (view === 'section' && progress >= 1) progress = 0; start(view === 'section' ? 'journey' : 'orbit'); }
});
el('orbit').addEventListener('click', () => { if (playing === 'orbit') { stop(); update(); } else start('orbit'); });
el('reset').addEventListener('click', () => jump(0));
el('center').addEventListener('click', () => jump(1));
el('depth').addEventListener('input', () => { stop(); progress = Number((el('depth') as HTMLInputElement).value) / 1000; update(); });
document.addEventListener('keydown', event => { if (event.code === 'Space' && !event.repeat && !(event.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')) { event.preventDefault(); el('play').click(); } });
for (const item of WORLDS) { const link = document.createElement('a'); link.href = DETAILS[item.id].source; link.textContent = 'NASA · ' + CONTENT[item.id].name; el('sources').append(link); }
if (scene) {
  scene.onInteraction = () => { cancelJourney(); stop(); update(false); };
  scene.onCameraChange = (yaw, elevation) => { el('camera-readout').textContent = t('方位 {{yaw}}° · 俯角 {{elevation}}°', { yaw, elevation }); };
  scene.onPreparationChange(() => update(false));
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
window.addEventListener('pagehide', e => { cancelAnimationFrame(frame); frame = 0; if (!e.persisted) { stop(); cancelJourney(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
update();
