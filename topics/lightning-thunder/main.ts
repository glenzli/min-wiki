import { mountObservationMode } from '../../src/platform/observationMode.ts';
import { mountSceneReading } from '../../src/platform/sceneReading.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CONTENT } from './content.ts';
import { TopicScene } from './scene.ts';
import { CloudView } from './cloudView.ts';
import { cloudFrame, type ChargingCondition } from './cloudModel.ts';
import { lightningState, parseLightningRoute, soundSpeed, stagePositions, type Lens, type Settings } from './model.ts';
import { studies, limitedStudy } from './study.ts';
import './style.css';

translateDocument(t);
const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const select = (id: string) => el(id) as HTMLSelectElement;
const set = (id: string, value: string) => { if (el(id).textContent !== value) el(id).textContent = value; };
const route = parseLightningRoute(location.search);
let progress = route.progress, lens = route.lens, playing = false, frame = 0, last = 0, disposed = false;
let studyKey = '', legendKey = '';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
input('distance').value = String(route.settings.distanceKm); input('temperature').value = String(route.settings.temperature);
select('charging').value = route.settings.charging!; select('lens').value = lens;
const root = el('lightning-observation'), inspector = el('lightning-explanation');
root.dataset.readerWorkbench='';root.dataset.readerLayout='stage';root.dataset.readerChoices='.lightning-choices';
const lightningMain=root.querySelector<HTMLElement>('.theater')!;lightningMain.removeAttribute('data-reader-stage');lightningMain.dataset.readerMain='';
lightningMain.parentElement!.dataset.readerLayout='stage';inspector.dataset.readerSupport='';
const lightningVisual=lightningMain.querySelector<HTMLElement>('.viewport')!;lightningVisual.dataset.readerStage='';lightningVisual.dataset.readerFit='available';
const lightningEssential=document.createElement('div');lightningEssential.className='lightning-essential';lightningEssential.dataset.readerEssential='';
lightningEssential.append(...lightningMain.querySelectorAll('.scene-caption,#legend,.controls,#steps'));lightningMain.append(lightningEssential);
const observation = mountObservationMode(root, { enter: t('沉浸演示'), exit: t('退出沉浸 · Esc') }, { fit: true, panels: [{ label: t('解说'), elements: [inspector] }] });
el('scene-title').classList.add('lightning-title'); observation.toolbar.prepend(el('scene-title'));
el('scene-context').hidden = true; root.querySelector('.stage-heading')?.remove();
const reading = mountSceneReading(root, { id: 'lightning-science-guide', childTarget: el('story') });
const cloud = new CloudView(el('cloud-scene') as HTMLCanvasElement, el('cloud-fallback') as unknown as SVGSVGElement,
  el('cloud-status'), el('retry-cloud') as HTMLButtonElement, el('reset-orbit') as HTMLButtonElement);
let scene: TopicScene | undefined;
try { scene = new TopicScene(el('scene') as HTMLCanvasElement); }
catch (error) { el('scene-error').hidden = false; console.error(error); }
const settings = (): Settings => ({ distanceKm: Number(input('distance').value), temperature: Number(input('temperature').value),
  charging: select('charging').value as ChargingCondition, labels: input('labels').checked });
function saveRoute() {
  const url = new URL(location.href), s = settings();
  url.searchParams.set('p', progress.toFixed(4)); url.searchParams.set('lens', lens);
  url.searchParams.set('charging', s.charging!); url.searchParams.set('distance', String(s.distanceKm)); url.searchParams.set('temperature', String(s.temperature));
  history.replaceState(null, '', url);
}
function update(save = false) {
  if (disposed) return;
  const s = settings(), result = lightningState(progress, s), stage = result.stage;
  const inside = lens === 'cloud' || (lens === 'follow' && progress < .32);
  const weak = !result.flashEnabled;
  root.dataset.view = inside ? 'cloud' : 'storm'; root.dataset.charging = s.charging;
  el('cloud-view').hidden = !inside; el('scene').hidden = inside; el('cloud-help').hidden = !inside;
  cloud.setActive(inside);
  if (inside) cloud.draw(progress, s); else scene?.draw(progress, s);
  el('scene-error').hidden = inside || !!scene;
  const key = `${stage}:${weak && stage >= 2}`;
  if (key !== studyKey) {
    studyKey = key; reading.set(weak && stage >= 2 ? limitedStudy : studies[stage]);
    set('story-title', weak && stage >= 2 ? t('对照：较弱分离，未演示地闪') : CONTENT.titles[stage]);
    set('observe', weak && stage >= 2 ? t('保持同一进度，切回持续分离，比较通道、回击和声音是否出现。') : CONTENT.watch[stage]);
  }
  set('scene-title', inside ? stage < 2 ? CONTENT.titles[stage] : t('云内局部：保留刚才的电荷分离') : weak && stage >= 2 ? t('对照：较弱分离，未演示地闪') : CONTENT.titles[stage]);
  set('scene-note', weak && progress >= .32 ? CONTENT.weakNote : inside ? CONTENT.cloudNote : CONTENT.stormNote);
  set('arrival', inside ? weak && progress >= .14 ? t('本案例分离较弱，正负区域仍有较多混合。') : CONTENT.cloudPhases[cloudFrame(progress, s.charging).phase] : weak ? t('没有本次地闪产生的声音传播')
    : stage === 4 ? result.heard ? t('光已到达；声音在约 {{delay}} 秒后到达室内。', { delay: result.delay.toFixed(1) })
      : t('光几乎立刻到达；声音已传播 {{elapsed}} 秒。', { elapsed: result.soundSeconds.toFixed(1) })
    : CONTENT.watch[stage]);
  const nextLegend = inside ? 'cloud' : 'storm';
  if (nextLegend !== legendKey) {
    legendKey = nextLegend;
    el('legend').replaceChildren(...(inside ? CONTENT.cloudLegend : CONTENT.stormLegend).map(label => { const item = document.createElement('span'); item.textContent = label; return item; }));
  }
  set('distance-value', `${s.distanceKm} km`); set('temperature-value', `${s.temperature} °C`);
  set('metric', weak ? t('未演示地闪') : `${result.delay.toFixed(1)} s`);
  set('metric-label', weak ? t('本情境没有发出的雷声；不是安全判断。') : t('本次负地闪到室内的理论光声延迟'));
  set('speed-reading', t('当前声速近似 {{speed}} m/s；温度只影响声音传播。', { speed: soundSpeed(s.temperature).toFixed(0) }));
  set('play', playing ? t('暂停') : progress >= 1 ? t('重新播放') : t('开始观察'));
  input('progress').value = String(Math.round(progress * 1000));
  set('elapsed', !weak && stage === 4 ? t('声音传播 {{elapsed}} s', { elapsed: result.soundSeconds.toFixed(1) }) : t('过程 {{percent}}%', { percent: Math.round(progress * 100) }));
  input('progress').setAttribute('aria-valuetext', `${CONTENT.steps[stage]} · ${el('elapsed').textContent}`);
  el('steps').querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(stage === i)));
  (el('previous') as HTMLButtonElement).disabled = progress <= 0;
  (el('next') as HTMLButtonElement).disabled = progress >= stagePositions.at(-1)!;
  if (save) saveRoute();
}
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; }
function seek(target: number) { stop(); progress = Math.max(0, Math.min(1, target)); update(true); }
function tick(now: number) {
  frame = 0; if (!playing || document.hidden || disposed) return;
  progress = Math.min(1, progress + Math.min((now - last) / 1000, .1) * Number(select('rate').value) / 32); last = now;
  if (progress >= 1) { playing = false; saveRoute(); }
  update(); if (playing) frame = requestAnimationFrame(tick);
}
function toggle() {
  if (playing) { stop(); saveRoute(); }
  else { if (progress >= 1) progress = 0; playing = true; last = performance.now(); frame = requestAnimationFrame(tick); }
  update();
}
el('play').addEventListener('click', toggle);
el('reset').addEventListener('click', () => seek(0));
el('previous').addEventListener('click', () => seek([...stagePositions].reverse().find(position => position < progress - .001) ?? 0));
el('next').addEventListener('click', () => seek(stagePositions.find(position => position > progress + .001) ?? 1));
el('progress').addEventListener('input', () => seek(Number(input('progress').value) / 1000));
for (const id of ['distance', 'temperature', 'charging', 'labels']) el(id).addEventListener('input', () => update(true));
el('lens').addEventListener('change', () => { lens = select('lens').value as Lens; update(true); });
el('steps').replaceChildren(...CONTENT.steps.map((label, i) => {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = `${i + 1} · ${label}`;
  button.setAttribute('aria-label', CONTENT.titles[i]); button.addEventListener('click', () => seek(stagePositions[i])); return button;
}));
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !event.repeat && !(event.target as HTMLElement)?.closest('button,input,select,a,textarea,canvas,summary,[contenteditable]')) { event.preventDefault(); toggle(); }
});
document.addEventListener('visibilitychange', () => {
  // Hiding pauses the supplied clock instead of accumulating unseen travel time.
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
  else if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
});
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { stop(); update(); } });
window.addEventListener('pagehide', event => {
  cancelAnimationFrame(frame); frame = 0;
  if (!event.persisted) { disposed = true; stop(); cloud.dispose(); scene?.dispose(); }
});
window.addEventListener('pageshow', () => { if (!disposed && playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
window.addEventListener('popstate', () => {
  const restored = parseLightningRoute(location.search); stop(); progress = restored.progress; lens = restored.lens;
  select('lens').value = lens; select('charging').value = restored.settings.charging!;
  input('distance').value = String(restored.settings.distanceKm); input('temperature').value = String(restored.settings.temperature); update();
});
update();
