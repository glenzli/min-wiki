import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { SCIENCE } from './science.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { scaleContent, seasonStory, kidsStories, observations, epidermisContent } from './content.ts';
import { journeyScale, JOURNEY_DURATION, pigmentsAt, routeLevel, SCALE_STOPS, epidermisVisible } from './model.ts';
import type { LeafKind } from './model.ts';
import { LeafScene } from './scene.ts';
import { LIFE_STOPS, leafLifeAt, readLeafRoute, type LeafView } from './lifecycle.ts';
import { lifeContent, waterStories } from './lifeContent.ts';
import { mountWaterScene } from '../plant-water/scene.ts';
import { WATER_STOPS, waterAt } from '../plant-water/model.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('leaf-colors');
const el = (id: string) => document.getElementById(id)!;
let position = 0, zoom = 0, season = 0, kind: LeafKind = 'yellow', academic = false, playing = false;
let touring = false, journey = 0;
let cancelSeek: () => void = () => {};
let frame = 0, last = 0, scene: LeafScene | undefined;
const initialRoute = readLeafRoute(location.search);
let age = initialRoute.age, view: LeafView = initialRoute.view, insidePosition = 0;
let waterProgress = 0, waterPlaying = false, waterClose = false;
const waterScene = mountWaterScene(el('water-map') as unknown as SVGSVGElement);
try { scene = new LeafScene(el('scene') as HTMLCanvasElement, el('hotspot')); }
catch (error) { el('scene-error').hidden = false; el('hotspot').hidden = true; console.error(error); }

function update() {
  const life = leafLifeAt(age), story = lifeContent(age);
  season = life.senescence;
  const inspectable = life.growth > .9 && life.fall === 0;
  if (!inspectable && view === 'inside') { insidePosition = position; view = 'life'; position = 0; touring = false; }
  if ((life.growth <= .9 || life.transport < .1) && waterPlaying) waterPlaying = false;
  zoom = routeLevel(Math.round(position), kind);
  const atSurface=epidermisVisible(position);
  const data = atSurface ? epidermisContent : scaleContent(zoom, kind), pigments = pigmentsAt(season, kind);
  el('scale-title').textContent = el('detail-title').textContent = data.title;
  el('scale-note').textContent = data.scale;
  el('journey').textContent = touring ? t('暂停深入') : journey >= JOURNEY_DURATION ? t('重新走进叶子') : journey > 0 ? t('继续深入') : t('一键走进叶子');
  el('journey').setAttribute('aria-pressed', String(touring));
  (el('scale') as HTMLInputElement).value = String(Math.round(position * 1000));
  el('scale').setAttribute('aria-valuetext', data.title);
  el('scale-readout').textContent = data.title;
  el('journey-status').textContent = touring ? t('正在连续探索 · 可随时暂停') : kind === 'red' ? t('叶片 → 上表皮 → 组织 → 细胞 → 液泡') : t('叶片 → 上表皮 → 组织 → 细胞 → 叶绿体');
  el('scene-hint').textContent = position < 2.9 && !touring ? t('拖动尺度滑条，可以随时停下或退回。') : data.hint;
  el('scene-hint').parentElement!.dataset.closeup = String(view === 'inside' && position > .85);
  el('scale-story').textContent = academic ? data.academic : atSurface ? data.kids : kidsStories[kind === 'red' && zoom === 2 ? 4 : zoom];
  el('observation').textContent = atSurface ? epidermisContent.observation : observations[kind === 'red' && zoom === 2 ? 4 : zoom];
  el('observation-panel').hidden = academic;
  document.querySelectorAll<HTMLElement>('[data-academic-only]').forEach(node => node.hidden = !academic);
  document.querySelectorAll<HTMLElement>('[data-kids-only]').forEach(node => node.hidden = academic);
  scene?.setAcademic(academic);
  if(position >= .65 && position < .95) el('scale-title').textContent = t('转过来看叶片的厚度');
  if (view === 'inside' && position > .65 && position < 1.15) {
    el('scale-note').textContent = t('侧向剖面示意 · 厚度已夸大');
  }
  const seasonName = story.title;
  el('season-badge').textContent = seasonName;
  (el('season') as HTMLInputElement).value = String(Math.round(age * 1000));
  el('season').setAttribute('aria-valuetext', seasonName);
  el('season-story').textContent = life.stage === 'bud' || life.stage === 'fallen' ? story.observe : seasonStory(season, kind === 'red', academic);
  el('play').textContent = playing ? t('暂停') : age >= 1 ? t('再看一次') : t('播放叶子的一生');
  el('play').setAttribute('aria-pressed', String(playing));
  el('life-title').textContent = story.title; el('life-cause').textContent = story.cause;
  if (view !== 'inside') {
    el('scale-title').textContent = el('detail-title').textContent = story.title;
    el('scale-story').textContent = story.story; el('observation').textContent = story.observe;
    el('scale-note').textContent = t('同一枝条 · 同一片叶');
    el('scene-hint').textContent = view === 'water' ? t('实心是液态水，空心是水汽；标记只追踪选定的一小部分水。') : t('叶龄改变形态；放大只改变视角。');
  }
  (document.querySelector('.toolbar') as HTMLElement).hidden = view !== 'inside';
  (document.querySelector('.journey-controls') as HTMLElement).hidden = view !== 'inside';
  el('zoom-back').hidden = view !== 'inside';
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.view === view)); button.disabled = button.dataset.view === 'inside' && !inspectable; });
  el('inside-availability').hidden = inspectable;
  el('water-panel').hidden = view !== 'water';
  const waterActive = life.growth > .9 && life.transport > .1;
  (el('water-play') as HTMLButtonElement).disabled = !waterActive;
  (el('water-progress') as HTMLInputElement).disabled = !waterActive;
  el('water-play').textContent = waterPlaying ? t('暂停') : waterProgress >= 1 ? t('再看一次') : t('播放水的旅行');
  el('water-play').setAttribute('aria-pressed', String(waterPlaying));
  (el('water-progress') as HTMLInputElement).value = String(Math.round(waterProgress * 1000));
  el('water-status').textContent = waterStories[waterAt(waterProgress).stage]!;
  el('water-availability').textContent = waterActive ? t('水的进度与叶龄分开：切换视角会保留两者。临近脱落时，这条连接逐渐停止输水。') : t('当前不在成熟叶运输的观察范围内：幼叶尚未展开，或连接正在中断、已经脱落。可以回到成熟阶段。');
  el('water-map').style.filter = waterActive ? '' : 'grayscale(.8)';
  el('return-mature').hidden = waterActive;
  waterScene.draw(waterProgress, waterActive ? life.transport : 0);
  for (const [id, value] of Object.entries(pigments)) {
    el(`${id}-bar`).style.width = `${value * 100}%`;
    el(`${id}-value`).textContent = value < .04 ? t('很少或没有') : value < .35 ? t('较少') : value < .75 ? t('中等') : t('较多');
  }
  el('location-key').textContent = zoom === 4 ? t('红色花青素：在液泡的水溶液中。叶绿素与黄色色素仍在外面的叶绿体内。') : zoom === 3 ? t('花青素主要在液泡中；叶绿体近景只画叶绿素与类胡萝卜素。') : t('绿色、黄色：叶绿体内。红色花青素：主要在液泡内。');
  (el('zoom-back') as HTMLButtonElement).disabled = position < .01;
  const selectedStop=SCALE_STOPS.reduce<number>((best,stop)=>Math.abs(stop-position)<Math.abs(best-position)?stop:best,0);
  document.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.zoom) === selectedStop)));
  el('organelle-tab').textContent = kind === 'red' ? t('液泡') : t('叶绿体');
  el('route-note').textContent = kind === 'red' ? t('红叶路线 · 看液泡中积累的新色素') : t('黄叶路线 · 看叶绿体中原有的黄色');
  document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  document.querySelectorAll<HTMLButtonElement>('[data-age]').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.age) - age) < .01)));
  el('science-live').textContent = t('当前尺度：{{scale}}\n季节：{{season}}\n色素条是相对趋势，不是浓度或分子计数', { scale: data.title, season: seasonName });
  const science = SCIENCE[zoom];
  el('science-panel').hidden = !academic;
  for (const key of ['title', 'body', 'formula', 'terms', 'watch', 'caution'] as const) el(`science-${key}`).textContent = science[key];
  scene?.setLife(age, view === 'water', waterProgress);
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
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-age]')) b.addEventListener('click', () => { stop(); cancelSeek(); cancelSeek = animateValue({from: age, to: Number(b.dataset.age), duration: 950, onUpdate: value => { age = value; update(); }}); });
function startJourney() {
  cancelSeek();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    touring = false; position = SCALE_STOPS.find(stop=>stop>position+.01) ?? 0; journey = position / 3 * JOURNEY_DURATION; update(); return;
  }
  if (touring) touring = false;
  else {
    if (position >= 3) { journey = 0; position = 0; }
    else journey = position / 3 * JOURNEY_DURATION;
    touring = true; last = performance.now();
    if (!frame) frame = requestAnimationFrame(tick);
  }
  update();
}
el('hotspot').addEventListener('click', () => { if (view !== 'inside') changeView('inside'); seekScale(SCALE_STOPS.find(stop=>stop>position+.01) ?? 3); });
el('scale').addEventListener('input', () => { cancelSeek(); touring = false; position = Number((el('scale') as HTMLInputElement).value) / 1000; journey = position / 3 * JOURNEY_DURATION; update(); });
el('journey').addEventListener('click', startJourney);
el('motion').addEventListener('click', () => {
  const enabled = el('motion').getAttribute('aria-pressed') !== 'true';
  el('motion').setAttribute('aria-pressed', String(enabled));
  scene?.setMotion(enabled);
});
el('labels').addEventListener('click', () => {
  const enabled = el('labels').getAttribute('aria-pressed') !== 'true';
  el('labels').setAttribute('aria-pressed', String(enabled)); scene?.setLabels(enabled);
  document.querySelectorAll<HTMLElement>('.scene-top,.scene-bottom').forEach(node => node.hidden = !enabled);
});
el('zoom-back').addEventListener('click', () => { seekScale([...SCALE_STOPS].reverse().find(stop=>stop<position-.01) ?? 0); });
el('season').addEventListener('input', () => { stop(); age = Number((el('season') as HTMLInputElement).value) / 1000; update(); });
function stop() { cancelSeek(); playing = false; if (!touring && !waterPlaying) { cancelAnimationFrame(frame); frame = 0; } }
function tick(now: number) {
  frame = 0;
  if ((!playing && !touring && !waterPlaying) || document.hidden) return;
  const dt = Math.min((now - last) / 1000, .1); last = now;
  if (playing) age = Math.min(1, age + dt / 36);
  if (waterPlaying) { waterProgress = Math.min(1, waterProgress + dt / 22); if (waterProgress >= 1) waterPlaying = false; }
  if (touring) {
    const before=position;
    journey=Math.min(JOURNEY_DURATION,journey+dt);position=journeyScale(journey);
    // An intentional observation stop, before any side-turn or tissue reveal.
    if(before<.5 && position>=.5) {position=.5;journey=JOURNEY_DURATION/6;touring=false;}
    if(journey>=JOURNEY_DURATION)touring=false;
  }
  if (age >= 1) playing = false;
  update();
  if (playing || touring || waterPlaying) frame = requestAnimationFrame(tick);
}
el('play').addEventListener('click', () => {
  cancelSeek();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { stop(); age = LIFE_STOPS.find(stop => stop > age + .01) ?? 0; update(); return; }
  if (playing) stop();
  else { if (age >= 1) age = 0; playing = true; last = performance.now(); if (!frame) frame = requestAnimationFrame(tick); }
  update();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
  else if ((playing || touring || waterPlaying) && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
});
window.addEventListener('pagehide', event => { cancelAnimationFrame(frame); frame = 0; cancelSeek(); if (!event.persisted) { touring = false; waterPlaying = false; stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if ((playing || touring || waterPlaying) && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
function changeView(next: LeafView, write = true) {
  cancelSeek(); touring = false; waterPlaying = false;
  if (view === 'inside') insidePosition = position;
  view = next; position = view === 'inside' ? insidePosition : 0;
  if (write) { const url = new URL(location.href); url.searchParams.set('view', view); url.searchParams.set('age', age.toFixed(4)); history.pushState(null, '', url); }
  update();
}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => changeView(button.dataset.view as LeafView)));
el('water-play').addEventListener('click', () => {
  if (leafLifeAt(age).transport <= .1 || leafLifeAt(age).growth <= .9) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { waterPlaying = false; waterProgress = WATER_STOPS.find(stop => stop > waterProgress + .01) ?? 0; update(); return; }
  waterPlaying = !waterPlaying; if (waterPlaying && waterProgress >= 1) waterProgress = 0;
  last = performance.now(); if (waterPlaying && !frame) frame = requestAnimationFrame(tick); update();
});
el('water-reset').addEventListener('click', () => { waterPlaying = false; waterProgress = 0; update(); });
el('water-progress').addEventListener('input', () => { waterProgress = Number((el('water-progress') as HTMLInputElement).value) / 1000; waterPlaying = false; update(); });
el('water-close').addEventListener('click', () => { waterClose = !waterClose; waterScene.zoom(waterClose ? 1 : 0); el('water-close').setAttribute('aria-pressed', String(waterClose)); });
el('return-mature').addEventListener('click', () => { stop(); age = .34; update(); });
window.addEventListener('popstate', () => { const route = readLeafRoute(location.search); stop(); age = route.age; changeView(route.view, false); });
if (view === 'inside') position = 2;
update();

mountPresentationFrame({"root": ".explorer", "visual": ".stage", "transport": ".scale-control", "choices": ".leaf-lenses"});
