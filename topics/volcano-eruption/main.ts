import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { ecologyState, type Habitat } from './ecologyModel.ts';
import { ecologyMarkup, soilMarkup } from './ecologyScene.ts';
import { LIFE_STEPS, ecologyStory, ecologyClue, LIFE_WATCH, OMURO_NOTE } from './ecologyContent.ts';
import { COLLAPSE } from '../volcanic-lakes/content.ts';
import { magmaState } from './magmaSystem.ts';
import { MECHANISM_STEPS, mechanismStory, mechanismStatus } from './mechanismContent.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { CASES, caseFromSearch, landState, landCamera, type VolcanoCase, type Landform, type Chapter, type View, type Aftermath } from './projectModel.ts';
import { CASE_CONTENT, LAND_STEPS, OCEAN_STEPS, LAKE_STEPS } from './projectContent.ts';
import { landscapeMarkup } from './landscapeScene.ts';
import { TopicScene as EruptionScene } from './scene.ts';
import { TopicScene as LakeScene } from '../volcanic-lakes/scene.ts';
import { createScene as createOcean, viewCamera } from '../submarine-volcanoes/scene.ts';
import { submarineState, type Environment, type Supply } from '../submarine-volcanoes/model.ts';
import { waterFraction, type Settings as LakeSettings } from '../volcanic-lakes/model.ts';
import { PRESETS, eruptionAppearance, type Settings, type EruptionStyle, type VolcanoStatus } from './model.ts';
import { STYLE_NOTES, STATUS_NOTES } from './context.ts';
import './project.css';

translateDocument(t);
mountTopicNavigation('volcano-eruption');
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const select = (id: string) => el<HTMLSelectElement>(id).value;
const number = (id: string) => Number(el<HTMLInputElement>(id).value);
let volcano = caseFromSearch(location.search);
const requestedChapter = new URLSearchParams(location.search).get('chapter');
let chapter: Chapter = requestedChapter === 'eruption' || requestedChapter === 'life' ? requestedChapter : 'landscape';
let view: View = 'landscape';
let playing = false, frame = 0, last = 0, cameraMoving = false;
let eruption: EruptionScene | undefined, lake: LakeScene | undefined;
let cancelSeek = () => {}, cancelCamera = () => {};
const memories = new Map<string, number>();
const key = () => `${volcano}:${isLand() ? chapter : 'landscape'}`;
const initial = () => isLand() && chapter !== 'landscape' ? .08 : volcano === 'lake' ? .08 : volcano === 'scoria' ? .94 : .58;
let progress = initial();
let camera: [number, number, number, number] = [0, 0, 1000, 666.667], section = 0;
const ocean = createOcean(document.getElementById('ocean-scene')! as unknown as SVGSVGElement);
function isLand() { return volcano !== 'lake' && volcano !== 'submarine'; }
function settings(): Settings {
  return { vents: number('vents'), gas: number('gas') / 100, viscosity: number('viscosity') / 100, supply: number('supply') / 100, resistance: number('resistance') / 100, landform: volcano as Landform };
}
function lifeState() { return ecologyState(progress, select('habitat') as Habitat); }
function collapseStage() { return progress < .18 ? 0 : progress < .27 ? 1 : progress < .48 ? 2 : 3; }
function lakeSettings(): LakeSettings { return { basin: select('basin') as LakeSettings['basin'], supply: number('water') / 100, leak: select('leak') as LakeSettings['leak'] }; }
function weights(): [number, number, number] {
  return select('environment') === 'deep' ? [1, 0, 0] : select('environment') === 'shallow' ? [0, 1, 0] : [0, 0, 1];
}
function cameraTarget(): [number, number, number, number] {
  if (volcano === 'submarine') return viewCamera(view === 'landscape' || view === 'plume' || view === 'storage' ? 'ocean' : view, progress, weights(), select('ocean-supply') === 'limited' ? 1 : 0);
  return landCamera(view, volcano as Landform, chapter === 'life' ? 1 : progress);
}
function settleCamera() {
  cancelCamera(); cameraMoving = false; camera = cameraTarget(); section = view === 'section' ? 1 : 0;
}
function draw() {
  if (volcano === 'submarine') ocean({ progress, weights: weights(), supplyMix: select('ocean-supply') === 'limited' ? 1 : 0, camera, section: .1 + .9 * section });
  else if (volcano === 'lake') lake?.draw(progress, lakeSettings());
  else if (chapter === 'eruption') { eruption?.setView(view === 'storage' ? 'storage' : view === 'section' ? 'flow' : view === 'vent' ? 'vent' : view === 'plume' ? 'plume' : 'overview', settings().vents); eruption?.draw(progress, settings()); }
  else {
    const svg = document.getElementById('land-scene')!;
    svg.setAttribute('viewBox', camera.join(' '));
    if (chapter === 'life') { svg.innerHTML = ecologyMarkup(volcano as Landform, lifeState()); return; }
    svg.innerHTML = landscapeMarkup(volcano as Landform, progress, select('aftermath') as Aftermath, section);
  }
}
function stageAndSteps() {
  if (volcano === 'lake' && select('basin') === 'caldera') return { stage: collapseStage(), steps: COLLAPSE.map(item => item.title) };
  if (isLand() && chapter === 'life') return { stage: lifeState().stage, steps: LIFE_STEPS };
  if (volcano === 'lake') return { stage: progress < .2 ? 0 : progress < .48 ? 1 : progress < .83 ? 2 : 3, steps: LAKE_STEPS };
  if (volcano === 'submarine') return { stage: progress < .15 ? 0 : progress < .45 ? 1 : progress < .80 ? 2 : 3, steps: OCEAN_STEPS };
  if (chapter === 'eruption') return { stage: magmaState(progress, settings()).stage, steps: MECHANISM_STEPS };
  return { stage: landState(progress).stage, steps: LAND_STEPS };
}
function update() {
  const { stage, steps } = stageAndSteps(), content = CASE_CONTENT[volcano];
  el('story-title').textContent = steps[stage];
  el('scene-badge').textContent = steps[stage];
  let story = isLand() && chapter === 'eruption' ? mechanismStory(magmaState(progress, settings())) : content.stories[stage];
  if (volcano === 'lake' && select('basin') === 'crater' && stage < 2) story = stage === 0
    ? t('这个情境从已有火山山体开始，观察喷口周围较小的凹地。它不使用破火山口的岩体塌陷过程。')
    : t('喷发口附近留下较小火山口。接下来能否成湖，要看它能不能蓄水。');
  if (volcano === 'submarine' && select('environment') !== 'island' && stage === 2) story = select('environment') === 'deep'
    ? t('枕状熔岩一个接一个长出来，外壳已经变暗，内部却可能仍热。深水不是绝对不会爆炸的保证。')
    : t('这个浅水例子选择了能发生强烈岩浆与水相互作用的条件，碎屑落回水里并逐渐沉积。');
  if (isLand() && chapter === 'landscape' && stage === 3 && select('aftermath') === 'eroded') story = t('流水与风化逐渐削低、切割旧山体。虚线留下侵蚀前的轮廓；这是一种后期变化，不是判断火山熄灭的证据。');
  if (volcano === 'lake' && select('basin') === 'caldera') story = COLLAPSE[collapseStage()].body;
  if (isLand() && chapter === 'life') story = ecologyStory(lifeState());
  el('story').textContent = story;
  el('watch').textContent = isLand() && chapter === 'eruption' ? magmaState(progress, settings()).connected ? STYLE_NOTES[eruptionAppearance(settings()).style].watch : t('先追踪下方补给和向上推进的岩脉尖端，再比较过压与贯通程度。地下有活动，地表却可以没有喷出物。') : content.watch;
  if (isLand() && chapter === 'life') {
    el('watch').textContent = LIFE_WATCH;
    el('life-result').textContent = ecologyClue(lifeState());
    el('soil-scene').innerHTML = soilMarkup(lifeState());
  }
  if (volcano === 'lake' && select('basin') === 'caldera') {
    el('watch').textContent = progress < .48 ? t('岩浆减少了，上面的岩石还一样重。观察：先出现裂隙，还是先有湖水？') : CASE_CONTENT.lake.watch;
    document.querySelectorAll<HTMLButtonElement>('[data-collapse]').forEach((button, i) => button.setAttribute('aria-pressed', String(collapseStage() === i)));
  }
  el('play').textContent = playing ? t('暂停') : progress >= 1 ? t('重新播放') : t('开始观察');
  el<HTMLInputElement>('progress').value = String(Math.round(progress * 1000));
  el('progress').setAttribute('aria-valuetext', steps[stage]);
  el('elapsed').textContent = `${Math.round(progress * 100)}%`;
  el('steps').querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(stage === i)));
  el('style-note').textContent = select('style') === 'custom' ? t('自定义条件只用于比较气体、黏度与供给的示意影响，不对应真实火山的参数测量。') : STYLE_NOTES[eruptionAppearance(settings()).style].body;
  const supply = select('ocean-supply') as Supply;
  el('ocean-supply-label').hidden = select('environment') !== 'island';
  if (volcano === 'submarine') {
    const state = submarineState(progress, select('environment') as Environment, supply);
    el('ocean-result').textContent = select('environment') === 'island'
      ? state.emerged ? t('山顶已经露出海面；大部分山体仍在水下。') : t('这个时刻，山顶仍在水下。成岛需要足够的累积供给。')
      : t('水深之外，成分、含气量、流出速率与混合方式也影响结果。');
  }
  el('lake-result').textContent = t('示意蓄水程度：{{amount}}%。这里比较补给与失水，不是实际水深。', { amount: Math.round(waterFraction(progress, lakeSettings()) * 100) });
  if (isLand() && chapter === 'eruption') {
    const state = magmaState(progress, settings());
    el('mechanism-status').textContent = mechanismStatus(state);
    for (const [id, value] of [['recharge', state.recharge], ['pressure', state.pressure], ['front', state.front], ['gas', state.gasExpansion]] as const) {
      (document.getElementById(`${id}-meter`)! as HTMLMeterElement).value = value;
    }
  }
  memories.set(key(), progress);
  draw();
}
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; cancelSeek(); }
function seek(to: number) {
  stop(); const from = progress;
  cancelSeek = animateValue({ from, to, duration: 650, onUpdate: p => { progress = p; settleCamera(); update(); } });
}
function positions() {
  return volcano === 'lake' ? select('basin') === 'caldera' ? [.13, .23, .36, .72] : [.10, .38, .66, 1] : volcano === 'submarine' ? [.08, .32, .68, 1] : chapter === 'life' ? [.08, .32, .57, 1] : chapter === 'eruption' ? [.08, .22, .35, .62, .86, 1] : [.10, .43, .70, 1];
}
function buildViews() {
  const items: [View, string][] = volcano === 'lake' ? [['section', t('湖盆剖面')]]
    : chapter === 'life' && isLand() ? [['landscape', t('看整座山')], ['vent', t('靠近山坡')]]
    : chapter === 'eruption' && isLand() ? [['landscape', t('完整剖面')], ['storage', t('地下活动')], ['vent', t('靠近喷口')], ['section', t('追踪熔岩')], ['plume', t('灰柱与落灰')]]
    : [['landscape', t('看整体')], ['section', t('打开剖面')], ['vent', t('靠近喷口')]];
  el('views').replaceChildren(...items.map(([id, label]) => {
    const button = document.createElement('button'); button.textContent = label; button.dataset.view = id; button.setAttribute('aria-pressed', String(id === view));
    button.addEventListener('click', () => {
      view = id; buildViews(); cancelCamera();
      if (isLand() && chapter === 'eruption') { eruption?.setView(id === 'storage' ? 'storage' : id === 'section' ? 'flow' : id === 'landscape' ? 'overview' : id === 'plume' ? 'plume' : 'vent', settings().vents); return; }
      const from = [...camera], startSection = section; cameraMoving = true;
      cancelCamera = animateValue({ from: 0, to: 1, duration: 700, onUpdate: p => {
        const target = cameraTarget(); camera = from.map((v, i) => v + (target[i] - v) * p) as typeof camera;
        section = startSection + ((view === 'section' ? 1 : 0) - startSection) * p; draw();
      }, onComplete: () => { cameraMoving = false; }});
    }); return button;
  }));
}
function mountCase() {
  stop(); cancelCamera(); eruption?.dispose(); lake?.dispose(); eruption = undefined; lake = undefined;
  const content = CASE_CONTENT[volcano], land = isLand(), detail = land && chapter === 'eruption';
  el('case-name').textContent = content.name; el('case-subtitle').textContent = content.subtitle; el('case-introduction').textContent = content.introduction;
  el('timescale').textContent = detail ? t('一次地下活动 · 时间压缩') : land && chapter === 'life' ? t('植物恢复 · 时间压缩') : volcano === 'submarine' && select('environment') !== 'island' ? t('水下喷发 · 时间压缩') : t('地貌故事 · 时间压缩');
  el('chapters').hidden = !land;
  el('life-guide').hidden = !(land && chapter === 'life');
  el('life-controls').hidden = !(land && chapter === 'life');
  el('omuro-note').hidden = volcano !== 'scoria'; el('omuro-note').textContent = OMURO_NOTE;
  el('collapse-guide').hidden = !(volcano === 'lake' && select('basin') === 'caldera');
  if (land && chapter === 'life') { el('case-subtitle').textContent = t('光秃秃的火山，怎样披上绿衣？'); el('case-introduction').textContent = t('小山已经堆好了。接下来追踪一粒种子：它怎样来到这里，又为什么有时长不起来？'); }

  el('mechanism').hidden = !detail;
  el('steps').classList.toggle('mechanism-steps', detail);
  el('chapters').querySelectorAll<HTMLButtonElement>('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.chapter === chapter)));
  document.querySelectorAll<HTMLButtonElement>('[data-case]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.case === volcano)));
  for (const id of ['land', 'eruption', 'ocean', 'lake']) {
    const visible = id === 'land' ? land && !detail : id === 'eruption' ? detail : id === 'ocean' ? volcano === 'submarine' : volcano === 'lake';
    el(`${id}-scene`).toggleAttribute('hidden', !visible); el(`${id}-controls`).hidden = !visible;
  }
  if (land && chapter === 'life') el('land-controls').hidden = true;
  el('scene-error').hidden = true;
  try {
    if (detail) { eruption = new EruptionScene(el<HTMLCanvasElement>('eruption-scene')); eruption.setView(view === 'storage' ? 'storage' : view === 'section' ? 'flow' : view === 'vent' ? 'vent' : view === 'plume' ? 'plume' : 'overview', settings().vents); }
    if (volcano === 'lake') { lake = new LakeScene(el<HTMLCanvasElement>('lake-scene')); view = 'section'; }
  } catch (error) { el('scene-error').hidden = false; console.error(error); }
  const { steps } = stageAndSteps();
  el('steps').replaceChildren(...steps.map((label, i) => { const b = document.createElement('button'); b.textContent = `${i + 1} · ${label}`; b.addEventListener('click', () => seek(positions()[i])); return b; }));
  buildViews(); settleCamera();
  el('view-note').textContent = t('换镜头保留进度；不同案例分别记住你看到的位置。');
  const legend = volcano === 'lake' ? [[t('蓝色：后来补给的水'), '#54a8c6'], [t('棕色：盆地与岩层'), '#9b8162']]
    : volcano === 'submarine' ? [[t('蓝色：海水'), '#287c92'], [t('暗色：冷却的岩石'), '#596764'], [t('亮色：高温物质'), '#ed9b48']]
    : chapter === 'life' ? [[t('棕色：裂缝里积起的土'), '#725640'], [t('绿色：长成斑块的植物'), '#81975b'], [t('浅灰：新落下的厚灰'), '#b8ac98']] : detail ? [[t('岩层：留下的喷出物'), '#957860'], [t('亮色：高温物质'), '#ed9b48'], [t('灰云：细小岩石与玻璃碎片'), '#92908b']] : [[t('岩层：留下的喷出物'), '#957860'], [t('亮色：高温物质'), '#ed9b48'], [t('绿色：后来的植被'), '#81975b']];
  el('legend').replaceChildren(...legend.map(([label, color]) => { const span = document.createElement('span'); span.textContent = label; span.style.setProperty('--swatch', color); return span; }));
  el('bridge-copy').textContent = volcano === 'lake' ? t('湖泊不是火山故事的必然终点，水下也可以有喷发。') : volcano === 'submarine' ? t('火山岛露出海面后，地表的堆积仍可能继续。') : t('留下凹地以后，水能不能留住？换一个案例接着观察。');
  el('bridge').textContent = volcano === 'lake' ? t('接着看水下喷发 →') : volcano === 'submarine' ? t('接着看陆地熔岩堆积 →') : t('接着看火山湖 →');
  const url = new URL(location.href); url.searchParams.set('case', volcano); url.searchParams.set('chapter', land ? chapter : 'landscape'); history.replaceState(null, '', url);
  update();
}
function choose(next: VolcanoCase) {
  memories.set(key(), progress); volcano = next; view = 'landscape';
  progress = memories.get(key()) ?? initial(); mountCase();
}
function thumbnail(id: VolcanoCase) {
  const shape = id === 'shield' ? 'M4 50Q44 42 70 21Q78 25 86 21Q109 42 156 50' : id === 'scoria' ? 'M20 50L64 13Q80 29 96 13L140 50' : 'M15 50L71 5L79 14L87 5L145 50';
  return `<svg viewBox="0 0 160 60" aria-hidden="true"><path d="M0 51H160" stroke="#819592"/>${id === 'lake' ? '<path d="M15 48L42 14L60 43H103L122 14L149 48" fill="#a39270"/><path d="M50 31H113L103 43H60Z" fill="#5baabd"/>' : `<path d="${shape}Z" fill="${id === 'scoria' ? '#8b9d62' : '#947761'}"/>`}${id === 'submarine' ? '<path d="M0 23Q40 18 80 23T160 23V58H0Z" fill="#579aac" opacity=".65"/>' : ''}</svg>`;
}
el('cases').replaceChildren(...CASES.map(id => { const b = document.createElement('button'); b.dataset.case = id; b.innerHTML = thumbnail(id); const span = document.createElement('span'); span.textContent = CASE_CONTENT[id].name; b.append(span); b.addEventListener('click', () => choose(id)); return b; }));
el('chapters').querySelectorAll<HTMLButtonElement>('button').forEach(b => b.addEventListener('click', () => {
  memories.set(key(), progress); chapter = b.dataset.chapter as Chapter; progress = memories.get(key()) ?? initial(); view = 'landscape'; mountCase();
}));
function tick(now: number) {
  if (!playing || document.hidden) return;
  if (now - last >= 32) {
    progress = Math.min(1, progress + Math.min(now - last, 100) / 1000 * number('rate') / 36); last = now;
    if (!cameraMoving) camera = cameraTarget(); if (progress >= 1) playing = false; update();
  }
  if (playing) frame = requestAnimationFrame(tick);
}
el('play').addEventListener('click', () => {
  if (playing) { stop(); update(); return; }
  cancelSeek();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { progress = 1; settleCamera(); update(); return; }
  if (progress >= 1) progress = 0;
  playing = true; last = performance.now(); update(); frame = requestAnimationFrame(tick);
});
el('progress').addEventListener('input', () => { stop(); progress = number('progress') / 1000; settleCamera(); update(); });
for (const id of ['habitat', 'aftermath', 'style', 'vents', 'supply', 'gas', 'viscosity', 'resistance', 'environment', 'ocean-supply', 'basin', 'water', 'leak']) {
  el(id).addEventListener(id === 'resistance' || id === 'supply' || id === 'gas' || id === 'viscosity' || id === 'water' ? 'input' : 'change', () => {
    stop();
    if (id === 'style') {
      const preset = PRESETS[select('style') as EruptionStyle];
      for (const field of ['gas', 'viscosity', 'supply'] as const) el<HTMLInputElement>(field).value = String((preset[field] ?? .7) * 100);
    }
    if (id === 'gas' || id === 'viscosity') el<HTMLSelectElement>('style').value = 'custom';
    if (id === 'environment' || id === 'basin') { mountCase(); return; }
    settleCamera(); update();
  });
}
document.querySelectorAll<HTMLButtonElement>('[data-collapse]').forEach(button => button.addEventListener('click', () => seek(Number(button.dataset.collapse))));
el('life-entry').addEventListener('click', () => { memories.set(key(), progress); chapter = 'life'; view = 'landscape'; progress = memories.get(key()) ?? .08; mountCase(); el('chapters').scrollIntoView({block:'start', behavior:'instant'}); });
el('bridge').addEventListener('click', () => { choose(volcano === 'lake' ? 'submarine' : volcano === 'submarine' ? 'shield' : 'lake'); el('cases').scrollIntoView({ block: 'start', behavior: 'instant' }); });
function showStatus(status: VolcanoStatus) {
  const note = STATUS_NOTES[status];
  el('status-title').textContent = note.title; el('status-body').textContent = note.body; el('status-evidence').textContent = note.evidence; el('status-limit').textContent = note.limit;
  document.querySelectorAll<HTMLButtonElement>('[data-status]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.status === status)));
}
document.querySelectorAll<HTMLButtonElement>('[data-status]').forEach(b => b.addEventListener('click', () => showStatus(b.dataset.status as VolcanoStatus)));
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); cancelCamera(); eruption?.stopMotion(); el('play').textContent = t('开始观察'); } });
window.addEventListener('pagehide', () => { stop(); cancelCamera(); eruption?.dispose(); lake?.dispose(); eruption = undefined; lake = undefined; });
window.addEventListener('pageshow', event => { if (event.persisted) mountCase(); });
document.addEventListener('keydown', event => { if (event.code === 'Space' && !event.repeat && !(event.target as HTMLElement)?.closest('button,input,select,a,textarea,summary,[contenteditable]')) { event.preventDefault(); el('play').click(); } });
mountCase(); showStatus('dormant'); mountReadingMode('.advanced');

mountPresentationFrame({ root: '.explorer', visual: '.scene-wrap', transport: '.playback', choices: '#cases, #chapters' });
