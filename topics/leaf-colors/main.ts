import { animateValue } from '../../src/visuals/transition.ts';
import { SCIENCE } from './science.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { scaleContent, seasonStory, kidsStories, observations } from './content.ts';
import { journeyScale, JOURNEY_DURATION, pigmentsAt, routeLevel } from './model.ts';
import type { LeafKind } from './model.ts';
import { LeafScene } from './scene.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('leaf-colors');
const el = (id: string) => document.getElementById(id)!;
let position = 0, zoom = 0, season = 0, kind: LeafKind = 'yellow', academic = false, playing = false;
let touring = false, journey = 0;
let cancelSeek: () => void = () => {};
let frame = 0, last = 0, scene: LeafScene | undefined;
try { scene = new LeafScene(el('scene') as HTMLCanvasElement, el('hotspot')); }
catch (error) { el('scene-error').hidden = false; el('hotspot').hidden = true; console.error(error); }

function update() {
  zoom = routeLevel(Math.round(position), kind);
  const data = scaleContent(zoom, kind), pigments = pigmentsAt(season, kind);
  el('scale-title').textContent = el('detail-title').textContent = data.title;
  el('scale-note').textContent = data.scale;
  el('journey').textContent = touring ? t('暂停深入') : journey >= JOURNEY_DURATION ? t('重新走进叶子') : journey > 0 ? t('继续深入') : t('一键走进叶子');
  el('journey').setAttribute('aria-pressed', String(touring));
  (el('scale') as HTMLInputElement).value = String(Math.round(position * 1000));
  el('scale').setAttribute('aria-valuetext', data.title);
  el('scale-readout').textContent = data.title;
  el('journey-status').textContent = touring ? t('正在连续探索 · 可随时暂停') : kind === 'red' ? t('叶片 → 组织 → 细胞 → 液泡') : t('叶片 → 组织 → 细胞 → 叶绿体');
  el('scene-hint').textContent = position < 2.9 && !touring ? t('拖动尺度滑条，可以随时停下或退回。') : data.hint;
  el('scale-story').textContent = academic ? data.academic : kidsStories[kind === 'red' && zoom === 2 ? 4 : zoom];
  el('observation').textContent = observations[kind === 'red' && zoom === 2 ? 4 : zoom];
  el('observation-panel').hidden = academic;
  document.querySelectorAll<HTMLElement>('[data-academic-only]').forEach(node => node.hidden = !academic);
  document.querySelectorAll<HTMLElement>('[data-kids-only]').forEach(node => node.hidden = academic);
  scene?.setAcademic(academic);
  if(position > .2 && position < .46) el('scale-title').textContent = t('叶面上的细胞网络');
  else if(position >= .46 && position < .9) el('scale-title').textContent = t('转过来看叶片的厚度');
  const seasonName = season < .28 ? t('盛夏') : season < .65 ? t('初秋') : t('深秋');
  el('season-badge').textContent = seasonName;
  (el('season') as HTMLInputElement).value = String(Math.round(season * 1000));
  el('season').setAttribute('aria-valuetext', seasonName);
  el('season-story').textContent = seasonStory(season, kind === 'red', academic);
  el('play').textContent = playing ? t('暂停') : season >= 1 ? t('再看一次') : t('播放季节变化');
  for (const [id, value] of Object.entries(pigments)) {
    el(`${id}-bar`).style.width = `${value * 100}%`;
    el(`${id}-value`).textContent = value < .04 ? t('很少或没有') : value < .35 ? t('较少') : value < .75 ? t('中等') : t('较多');
  }
  el('location-key').textContent = zoom === 4 ? t('红色花青素：在液泡的水溶液中。叶绿素与黄色色素仍在外面的叶绿体内。') : zoom === 3 ? t('花青素主要在液泡中；叶绿体近景只画叶绿素与类胡萝卜素。') : t('绿色、黄色：叶绿体内。红色花青素：主要在液泡内。');
  (el('zoom-back') as HTMLButtonElement).disabled = zoom === 0;
  document.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(b => b.setAttribute('aria-pressed', String(routeLevel(Number(b.dataset.zoom), kind) === zoom)));
  el('organelle-tab').textContent = kind === 'red' ? t('液泡') : t('叶绿体');
  el('route-note').textContent = kind === 'red' ? t('红叶路线 · 看液泡中积累的新色素') : t('黄叶路线 · 看叶绿体中原有的黄色');
  document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  document.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.season) - season) < .01)));
  el('science-live').textContent = t('当前尺度：{{scale}}\n季节：{{season}}\n色素条是相对趋势，不是浓度或分子计数', { scale: data.title, season: seasonName });
  const science = SCIENCE[zoom];
  el('science-panel').hidden = !academic;
  for (const key of ['title', 'body', 'formula', 'terms', 'watch', 'caution'] as const) el(`science-${key}`).textContent = science[key];
  scene?.set(position, season, kind);
}
function seekScale(target: number) {
  touring = false; cancelSeek();
  cancelSeek = animateValue({ from: position, to: target, duration: 850, onUpdate: value => {
    position = value; journey = position / 3 * JOURNEY_DURATION; update();
  }});
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-zoom]')) b.addEventListener('click', () => seekScale(Number(b.dataset.zoom)));
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-kind]')) b.addEventListener('click', () => { kind = b.dataset.kind as LeafKind; zoom = routeLevel(zoom, kind); update(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) b.addEventListener('click', () => { stop(); cancelSeek(); cancelSeek = animateValue({from: season, to: Number(b.dataset.season), duration: 950, onUpdate: value => { season = value; update(); }}); });
function startJourney() {
  cancelSeek();
  if (touring) touring = false;
  else {
    if (position >= 3) { journey = 0; position = 0; }
    else journey = position / 3 * JOURNEY_DURATION;
    touring = true; last = performance.now();
    if (!frame) frame = requestAnimationFrame(tick);
  }
  update();
}
el('hotspot').addEventListener('click', () => { seekScale(Math.min(3, Math.floor(position + .01) + 1)); });
el('scale').addEventListener('input', () => { cancelSeek(); touring = false; position = Number((el('scale') as HTMLInputElement).value) / 1000; journey = position / 3 * JOURNEY_DURATION; update(); });
el('journey').addEventListener('click', startJourney);
el('motion').addEventListener('click', () => {
  const enabled = el('motion').getAttribute('aria-pressed') !== 'true';
  el('motion').setAttribute('aria-pressed', String(enabled));
  scene?.setMotion(enabled);
});
el('zoom-back').addEventListener('click', () => { seekScale(Math.max(0, Math.ceil(position - .01) - 1)); });
el('season').addEventListener('input', () => { stop(); season = Number((el('season') as HTMLInputElement).value) / 1000; update(); });
function stop() { cancelSeek(); playing = false; if (!touring) { cancelAnimationFrame(frame); frame = 0; } }
function tick(now: number) {
  frame = 0;
  if ((!playing && !touring) || document.hidden) return;
  const dt = Math.min((now - last) / 1000, .1); last = now;
  if (playing) season = Math.min(1, season + dt / 18);
  if (touring) { journey = Math.min(JOURNEY_DURATION, journey + dt); position = journeyScale(journey); if (journey >= JOURNEY_DURATION) touring = false; }
  if (season >= 1) playing = false;
  update();
  if (playing || touring) frame = requestAnimationFrame(tick);
}
el('play').addEventListener('click', () => {
  cancelSeek();
  if (playing) stop();
  else { if (season >= 1) season = 0; playing = true; last = performance.now(); if (!frame) frame = requestAnimationFrame(tick); }
  update();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
  else if ((playing || touring) && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
});
window.addEventListener('pagehide', event => { cancelAnimationFrame(frame); frame = 0; if (!event.persisted) { touring = false; stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if ((playing || touring) && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
update();
