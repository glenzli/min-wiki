import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { bounded, landCamera, type VolcanoCase, type Landform, type View } from './projectModel.ts';
import { UNITS, chapterForStudy, defaultCase, initialStudyProgress, landformFrom, nextStudy, sceneProgress, studyMilestones, studyRenderer, studyRoute, type Study } from './studyModel.ts';
import { STUDY_CONTENT, UNIT_CONTENT, BUILDING_STEPS, STYLES_STEPS, HEAT_STEPS } from './studyContent.ts';
import { CASE_CONTENT, KIDS_STORIES, OCEAN_STEPS, LAKE_STEPS } from './projectContent.ts';
import { magmaState } from './magmaSystem.ts';
import { MECHANISM_STEPS, mechanismStory, mechanismKidStory, mechanismStatus } from './mechanismContent.ts';
import { ecologyState, type Habitat } from './ecologyModel.ts';
import { LIFE_STEPS, ecologyStory, ecologyClue, LIFE_WATCH, OMURO_NOTE } from './ecologyContent.ts';
import { soilMarkup } from './ecologyScene.ts';
import { TopicScene as EruptionScene } from './scene.ts';
import { LandHistoryScene } from './landscape3d.ts';
import { OmuroScene } from './omuroScene.ts';
import { TopicScene as LakeScene } from '../volcanic-lakes/scene.ts';
import { COLLAPSE } from '../volcanic-lakes/content.ts';
import { waterFraction, calderaStage, type Settings as LakeSettings } from '../volcanic-lakes/model.ts';
import { SubmarineScene, type OceanView } from '../submarine-volcanoes/scene3d.ts';
import { viewCamera } from '../submarine-volcanoes/scene.ts';
import { SEA_FLOOR, submarineState, type Environment, type Supply } from '../submarine-volcanoes/model.ts';
import { HydrothermalScene } from './hydrothermalScene.ts';
import { hydrothermalFrame, type HydrothermalSettings } from './hydrothermalModel.ts';
import { PRESETS, eruptionAppearance, type Settings, type EruptionStyle, type VolcanoStatus } from './model.ts';
import { ERUPTION_SCENARIOS, scenarioSettings } from './eruptionScenarios.ts';
import { STYLE_NOTES, STATUS_NOTES } from './context.ts';
import './project.css';

translateDocument(t);
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const select = (id: string) => el<HTMLSelectElement>(id).value;
const number = (id: string) => Number(el<HTMLInputElement>(id).value);
const entry = studyRoute(location.search, location.hash);
let study = entry.study, volcano = entry.volcano, chapter = entry.chapter, progress = entry.progress;
let view: View = entry.view === 'exterior' || study === 'styles' ? 'exterior' : study === 'lake' || study === 'heat' ? 'section' : 'landscape';
let playing = false, frame = 0, last = 0, detailMotion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let eruption: EruptionScene | undefined, lake: LakeScene | undefined, ocean: SubmarineScene | undefined;
let omuro: OmuroScene | undefined, landHistory: LandHistoryScene | undefined, heat: HydrothermalScene | undefined;
let cancelSeek = () => {}, cancelCamera = () => {};
let camera: [number, number, number, number] = [0, 0, 1000, 666.667], section = 0;
const controls = ['landform','habitat','style','vents','supply','gas','viscosity','resistance','eruption-scenario','eruption-strength','environment','ocean-supply','basin','water','leak','heat-water','heat-connected'];
const values = () => Object.fromEntries(controls.map(id => [id, select(id)]));
const defaults = values();
type Memory = { progress: number; view: View; volcano: VolcanoCase; values: Record<string,string> };
const memories = new Map<Study, Memory>();
const remember = () => memories.set(study, { progress, view, volcano, values: values() });
const renderer = () => studyRenderer(study, volcano);
const isOmuro = () => renderer() === 'omuro';
const isHistory = () => renderer() === 'history';
const isEpisode = () => renderer() === 'eruption';
const time = () => sceneProgress(study, volcano, progress);
const lifeState = () => ecologyState(progress, select('habitat') as Habitat);
const lakeSettings = (): LakeSettings => ({ basin: select('basin') as LakeSettings['basin'], supply: number('water') / 100, leak: select('leak') as LakeSettings['leak'] });
const heatSettings = (): HydrothermalSettings => ({ supply: number('heat-water') / 100, connected: select('heat-connected') === 'open' });
const weights = (): [number,number,number] => select('environment') === 'deep' ? [1,0,0] : select('environment') === 'shallow' ? [0,1,0] : [0,0,1];
function settings(): Settings { return { vents: number('vents'), gas: number('gas') / 100, viscosity: number('viscosity') / 100, supply: number('supply') / 100, resistance: number('resistance') / 100, strength: number('eruption-strength'), landform: volcano as Landform }; }
function syncScenarioControls() {
  const condition = settings(), appearance = eruptionAppearance(condition), small = appearance.strength < .66;
  const scenario = ERUPTION_SCENARIOS.find(s => s.style === appearance.style && s.vents === condition.vents && s.strength === appearance.strength)
    ?? ERUPTION_SCENARIOS.find(s => s.style === 'flow' && appearance.style === 'flow' && s.vents === condition.vents);
  el<HTMLSelectElement>('eruption-scenario').value = select('style') === 'custom' ? 'custom' : scenario?.id ?? 'custom';
  document.querySelectorAll<HTMLButtonElement>('[data-strength]').forEach(b => b.setAttribute('aria-pressed',String((b.dataset.strength === 'small') === small)));
  el('strength-result').textContent = appearance.style === 'ash'
    ? small ? t('较低、较窄的灰柱，较少的喷出物。') : t('更高、更宽的灰柱，喷出物覆盖更大范围。')
    : appearance.style === 'fountain' ? small ? t('碎屑在喷口附近低矮抛起、落下。') : t('喷泉升得更高，碎屑落向更远的山坡。')
      : small ? t('较少的熔岩沿窄流道缓慢铺展。') : t('更多熔岩沿更宽的流道向山坡铺展。');
}
function chooseEruptionScenario() {
  const scenario = ERUPTION_SCENARIOS.find(s => s.id === select('eruption-scenario'));
  if (!scenario) return;
  stop(); const condition = scenarioSettings(scenario.id);
  el<HTMLSelectElement>('style').value = scenario.style;
  for (const field of ['gas','viscosity','supply','resistance'] as const) el<HTMLInputElement>(field).value = String((condition[field] ?? .7) * 100);
  el<HTMLSelectElement>('vents').value = String(condition.vents);
  el<HTMLInputElement>('eruption-strength').value = String(condition.strength);
  view = scenario.view === 'flow' ? 'section' : scenario.view;
  buildViews(); settleCamera(); update();
}
function cameraTarget(): [number,number,number,number] {
  if (study === 'submarine') {
    if (view !== 'landscape') return viewCamera(view === 'section' || view === 'vent' ? view : 'ocean', progress, weights(), select('ocean-supply') === 'limited' ? 1 : 0);
    const bounds = el('ocean-scene').getBoundingClientRect(), aspect = bounds.width && bounds.height ? bounds.width / bounds.height : 1.5;
    const summit = submarineState(progress, select('environment') as Environment, select('ocean-supply') as Supply).summit;
    const height = Math.max(260, SEA_FLOOR - summit + 150), width = height * aspect;
    return [500 - width / 2, (summit + SEA_FLOOR - height) / 2, width, height];
  }
  return landCamera(view, volcano as Landform, study === 'ecology' ? 1 : time());
}
function settleCamera() { cancelCamera(); camera = cameraTarget(); section = view === 'section' ? 1 : 0; }
function eruptionView() { return view === 'exterior' ? 'exterior' : view === 'storage' ? 'storage' : view === 'section' ? 'flow' : view === 'vent' ? 'vent' : view === 'plume' ? 'plume' : 'overview'; }
function activeScene() { return isEpisode() ? eruption : isOmuro() ? omuro : isHistory() ? landHistory : study === 'lake' ? lake : study === 'submarine' ? ocean : heat; }
function syncRenderer() {
  const scene = activeScene();
  if (!scene) return;
  const gpu = scene.is3D, previousView = view;
  if (!gpu && (study === 'heat' || study === 'lake')) view = 'section';
  if (!gpu && isEpisode() && view === 'exterior') view = 'landscape';
  if (view !== previousView) {
    if (study === 'heat') heat?.setView('section');
    else if (study === 'lake') lake?.setView('section');
    else eruption?.setView(eruptionView(), settings().vents);
    buildViews();
  }
  el('eruption-hud').hidden = !gpu; el('render-qualifier').hidden = !gpu; el('retry-3d').hidden = gpu || !activeScene();
  for (const id of ['eruption','land-history','omuro','ocean','lake','heat']) el(`${id}-scene`).tabIndex = !el(`${id}-scene`).hidden && gpu ? 0 : -1;
  el('eruption-gesture').textContent = gpu ? t('拖动旋转 · 滚轮或双指缩放；键盘方向键旋转，＋／－缩放。') : t('当前显示二维示意；仍可播放和比较条件。可重试三维画面。');
  el('detail-motion').hidden = !(gpu && (isEpisode() || study === 'heat'));
  el('detail-motion').textContent = detailMotion ? t('暂停流动') : t('观察流动');
  el('detail-motion').setAttribute('aria-pressed', String(detailMotion));
  el<HTMLButtonElement>('detail-motion').disabled = matchMedia('(prefers-reduced-motion: reduce)').matches;
  el('eruption-render-limit').textContent = isEpisode()
    ? t('岩层、岩脉和储存区是教学重建。移动的流头与褶皱用于辨认液态，不是实测环流或流速；过程进度与流动可分别暂停。')
    : study === 'heat' ? t('热源、裂隙、水路和水池均为教学示意，不是实测地下管道或温度场。水来自降水，不由岩浆变成；并非所有温泉都依靠火山热源。')
      : study === 'ecology' ? t('山体已经形成，土层、种子与植被按独立的长期过程观察。土根为辨认而放大；大室山今天的草坡也受长期山烧维护。')
        : study === 'building' ? t('这里只看喷出物逐层留下；堆积层数、形状与时间为教学示意，不是一次喷发或实测地质。')
          : study === 'lake' ? t('剖面移去前方围岩；下沉断块与残余晶粥仍在地下。塌陷和后来积水分段观察，不表示所有火山都会成湖。')
            : t('剖面移去前侧海水和岩石；地形、层厚、海深和亮色均为教学示意。深水采用局部探照灯照明。');
}
function stageAndSteps() {
  if (study === 'mechanism') return { stage: magmaState(time(), settings()).stage, steps: MECHANISM_STEPS };
  if (study === 'styles') return { stage: progress < .15 ? 0 : progress < .58 ? 1 : progress < .85 ? 2 : 3, steps: STYLES_STEPS };
  if (study === 'building') return { stage: progress < .12 ? 0 : progress < .6 ? 1 : progress < .98 ? 2 : 3, steps: BUILDING_STEPS };
  if (study === 'ecology') return { stage: lifeState().stage, steps: LIFE_STEPS };
  if (study === 'heat') return { stage: hydrothermalFrame(progress, heatSettings()).stage, steps: HEAT_STEPS };
  if (study === 'lake') return select('basin') === 'caldera' ? { stage: calderaStage(progress), steps: COLLAPSE.map(x => x.title) }
    : { stage: progress < .2 ? 0 : progress < .48 ? 1 : progress < .83 ? 2 : 3, steps: LAKE_STEPS };
  return { stage: progress < .15 ? 0 : progress < .45 ? 1 : progress < .8 ? 2 : 3, steps: OCEAN_STEPS };
}
function draw() {
  const cue = el('process-note'), stage = stageAndSteps().stage;
  cue.hidden = !(activeScene()?.is3D ?? false); cue.textContent = STUDY_CONTENT[study].cue;
  if (study === 'lake' && select('basin') === 'caldera' && view === 'section') cue.textContent = [
    t('先看右侧通道：部分岩浆正离开储存区，上面的岩体还在原位。'), t('岩体还在原位；支撑减弱，两侧环状断层开始破裂。'),
    t('虚线保留原位置；断块先后下沉，崩落碎石向崖脚堆积。'), t('下沉断块与崩落碎石留在盆地里；成湖还需要后来的水补给。'),
  ][stage];
  if (isEpisode()) { eruption?.setView(eruptionView(), settings().vents); eruption?.draw(time(), settings()); }
  else if (study === 'submarine') ocean?.draw({ progress, weights: weights(), supplyMix: select('ocean-supply') === 'limited' ? 1 : 0, camera, section: .1 + .9 * section });
  else if (study === 'lake') lake?.draw(progress, lakeSettings());
  else if (study === 'heat') heat?.draw(progress, heatSettings());
  else if (isOmuro()) omuro?.draw(time(), select('habitat') as Habitat, study === 'ecology' ? 'life' : 'journey');
  else landHistory?.draw(time(), { chapter: study === 'ecology' ? 'life' : 'landscape', aftermath: 'green', habitat: select('habitat') as Habitat });
}
function storyText(stage: number, academic: boolean) {
  if (study === 'mechanism') return academic ? mechanismStory(magmaState(time(), settings())) : mechanismKidStory(magmaState(time(), settings()));
  if (study === 'styles' && !magmaState(time(), settings()).connected) return t('这次岩浆没有到达地面，所以没有这次的喷出物。');
  if (study === 'ecology') return academic ? ecologyStory(lifeState()) : ecologyClue(lifeState());
  if (study === 'styles') return progress > .85 ? t('这次喷发逐渐减弱，熔岩与喷落碎屑冷却成岩石。换一种喷发方式，已存在的山体保持不变。')
    : academic ? STYLE_NOTES[eruptionAppearance(settings()).style].body : select('style') === 'flow' ? t('熔岩沿着山坡流开，外层变暗，内部仍可能很热。')
      : select('style') === 'ash' ? t('岩浆碎裂成许多细小颗粒，灰柱向上发展，灰也会落回地面。') : t('热物质从喷口抛起；落下的碎屑与熔岩留在山坡上。');
  if (study === 'building') {
    if (stage === 0) return t('先看第一批留下的物质。这里没有一座凭空变大的整山，后来的堆积要落在先前的岩石上。');
    if (stage === 3) return t('山形已经留下。停止添加新岩石，先前的堆积层仍然存在；接下来可以另看山坡、植物或湖盆的问题。');
    return volcano === 'shield' ? t('容易流动的熔岩铺得较远，一层层留下宽缓的山体。盾状是山形描述，不保证每次喷发都一样。')
      : volcano === 'scoria' ? t('从中央喷口追一块碎屑：它抛起、落回并转暗，后来的碎屑继续垫高山坡；火山口保留在中间。')
        : t('熔岩与碎屑先后留下，新的沉积叠在旧层上，山体逐渐长高、变宽。这里展示一种建山历史，不要求每次喷发都严格交替。');
  }
  if (study === 'lake') return select('basin') === 'caldera' ? academic ? COLLAPSE[stage].body : COLLAPSE[stage].kid : CASE_CONTENT.lake.stories[stage];
  if (study === 'heat') {
    if (number('heat-water') === 0 && progress > .2) return t('热岩石还在，但没有水补给，不能凭空流出温泉。把水的补给增加，再追踪同一条水路。');
    if (select('heat-connected') === 'blocked' && progress > .6) return t('地下有水，也有热岩石，但返回地表的裂隙不连通。这些条件不一定会在这里形成温泉。');
    return [t('先跟着蓝色水迹：降水来到地面，部分水沿能够渗透的裂隙进入地下。'),t('地下水经过热岩石，把热量带走。水仍然是水，不能把红色岩浆直接变成蓝色温泉水。'),t('受热的水沿连通裂隙向上移动。改变通道条件，比较这条返回地表的路能不能走通。'),t('热水在地表出露并进入水池，继续流出。热源、水补给与连通水路共同影响结果；温泉不代表火山已经熄灭。')][stage];
  }
  if (select('environment') !== 'island' && stage === 2) return select('environment') === 'deep' ? t('枕状熔岩一个接一个长出来，外壳已经变暗，内部却可能仍热。深水不是绝对不会爆炸的保证。') : t('这个浅水例子选择了能发生强烈岩浆与水相互作用的条件，碎屑落回水里并逐渐沉积。');
  return academic ? CASE_CONTENT.submarine.stories[stage] : KIDS_STORIES.submarine[stage];
}
function update() {
  const { stage, steps } = stageAndSteps(), academic = document.documentElement.dataset.readingMode === 'academic';
  const label = study === 'styles' && !magmaState(time(), settings()).connected ? t('停在地下 · 没有喷发')
    : study === 'ecology' && stage === 3 && select('habitat') !== 'wet' ? t('植物能留下多少？') : steps[stage];
  el('story-title').textContent = label; el('scene-badge').textContent = label; el('story').textContent = storyText(stage, academic);
  el('watch').hidden = !academic; el('watch').textContent = study === 'ecology' ? LIFE_WATCH : STUDY_CONTENT[study].cue;
  el('life-guide').hidden = study !== 'ecology';
  if (study === 'ecology') { el('life-result').textContent = ecologyClue(lifeState()); el('soil-scene').innerHTML = soilMarkup(lifeState()); }
  if (study === 'mechanism') {
    const state = magmaState(time(), settings()); el('mechanism-status').textContent = mechanismStatus(state);
    el<HTMLSelectElement>('kid-path').value = !magmaState(1, settings()).connected ? 'stalled' : select('style') === 'custom' ? 'custom' : select('style');
    for (const [id,value] of [['recharge',state.recharge],['pressure',state.pressure],['front',state.front],['gas',state.gasExpansion]] as const) el<HTMLMeterElement>(`${id}-meter`).value = value;
  }
  el('play').textContent = playing ? t('暂停过程') : progress >= 1 ? t('重新播放过程') : t('播放过程');
  el<HTMLInputElement>('progress').value = String(Math.round(progress * 1000)); el('progress').setAttribute('aria-valuetext',label); el('elapsed').textContent = `${Math.round(progress * 100)}%`;
  el('steps').querySelectorAll('button').forEach((button,i) => button.setAttribute('aria-pressed',String(stage === i)));
  document.querySelectorAll<HTMLButtonElement>('[data-collapse]').forEach((button,i) => button.setAttribute('aria-pressed',String(calderaStage(progress) === i)));
  syncScenarioControls();
  el('style-note').textContent = select('style') === 'custom' ? t('自定义条件只用于比较气体、黏度与供给的示意影响，不对应真实火山的参数测量。') : STYLE_NOTES[eruptionAppearance(settings()).style].body;
  el('ocean-supply-label').hidden = select('environment') !== 'island';
  if (study === 'submarine') el('ocean-result').textContent = select('environment') === 'island'
    ? submarineState(progress, 'island',select('ocean-supply') as Supply).emerged ? t('山顶已经露出海面；大部分山体仍在水下。') : t('这个时刻，山顶仍在水下。成岛需要足够的累积供给。')
      : t('水深之外，成分、含气量、流出速率与混合方式也影响结果。');
  el('lake-result').textContent = t('示意蓄水程度：{{amount}}%。这里比较补给与失水，不是实际水深。',{amount:Math.round(waterFraction(progress,lakeSettings())*100)});
  draw(); syncRenderer();
}
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; cancelSeek(); }
function seek(to: number) { stop(); eruption?.resetDetailPhase(); const from = progress; cancelSeek = animateValue({ from, to: bounded(to), duration: 650, onUpdate: p => { progress = p; settleCamera(); update(); } }); }
function positions() { return studyMilestones(study,select('basin')==='caldera'); }
function buildViews() {
  const items: [View,string][] = study === 'heat' ? [['section',t('追踪地下水')],...(heat?.is3D ? [['landscape',t('看温泉出露')]] as [View,string][] : [])]
    : study === 'lake' ? [['section',t('湖盆剖面')],...(lake?.is3D ? [['landscape',t('看整座湖')]] as [View,string][] : [])]
      : study === 'submarine' ? [['landscape',t('跟着山体生长')],['ocean',t('看海洋全景')],['section',t('打开剖面')],['vent',t('靠近喷口')]]
        : study === 'mechanism' ? [['landscape',eruption?.is3D?t('三维剖面'):t('完整剖面')],['storage',t('地下活动')],['vent',t('靠近喷口')]]
          : study === 'styles' ? [...(eruption?.is3D ? [['exterior',t('完整火山')]] as [View,string][] : []),['vent',t('靠近喷口')],['section',t('追踪熔岩')],['plume',t('灰柱与落灰')],['landscape',eruption?.is3D?t('三维剖面'):t('完整剖面')]]
            : study === 'ecology' ? [['landscape',t('看山与草坡')],['vent',t('靠近山坡')],['section',t('看草坡剖面')]]
              : [['landscape',t('看整个山体')],['section',t('打开剖面')],['vent',t('近看沉积')]];
  el('views').replaceChildren(...items.map(([id,label]) => {
    const b = document.createElement('button'); b.textContent = label; b.dataset.view = id; b.dataset.sceneHitTarget = ''; b.setAttribute('aria-pressed',String(id === view));
    b.addEventListener('click',() => { view = id; buildViews(); if (isEpisode()) eruption?.setView(eruptionView(),settings().vents);
      else if (study === 'heat') heat?.setView(view === 'section' ? 'section' : 'landscape');
      else if (study === 'lake') lake?.setView(view === 'section' ? 'section' : 'landscape');
      else if (study === 'submarine') ocean?.setView(view as OceanView);
      else if (isOmuro()) omuro?.setView(view === 'section' || view === 'vent' ? view : 'landscape');
      else landHistory?.setView(view === 'section' || view === 'vent' ? view : 'landscape'); settleCamera(); draw(); }); return b;
  }));
}
function disposeScenes() {
  eruption?.dispose(); lake?.dispose(); ocean?.dispose(); omuro?.dispose(); landHistory?.dispose(); heat?.dispose();
  eruption = undefined; lake = undefined; ocean = undefined; omuro = undefined; landHistory = undefined; heat = undefined;
}
function mountStudy() {
  stop(); cancelCamera(); disposeScenes(); chapter = chapterForStudy(study);
  const content = STUDY_CONTENT[study], unit = UNITS.find(u => (u.studies as readonly string[]).includes(study))!;
  el('case-name').textContent = UNIT_CONTENT[unit.id]; el('case-subtitle').textContent = content.title; el('case-introduction').textContent = content.introduction; el('timescale').textContent = content.clock;
  document.querySelectorAll<HTMLButtonElement>('[data-study]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.study === study)));
  for (const id of ['eruption','land-history','omuro','ocean','lake','heat']) {
    const visible = id === 'eruption' ? isEpisode() : id === 'land-history' ? isHistory() : id === 'omuro' ? isOmuro() : id === 'ocean' ? study === 'submarine' : id === study;
    el(`${id}-scene`).hidden = !visible;
  }
  for (const [id,show] of [['land',study==='building'],['life',study==='ecology'],['eruption',isEpisode()],['ocean',study==='submarine'],['lake',study==='lake'],['heat',study==='heat']] as const) el(`${id}-controls`).hidden = !show;
  el('mechanism').hidden = study !== 'mechanism'; el('mechanism-choice').hidden = study !== 'mechanism'; el('surface-choice').hidden = study !== 'styles';
  el('resistance-control').hidden = study !== 'mechanism'; el('mechanism-comparison').hidden = study !== 'mechanism';
  el('collapse-guide').hidden = !(study === 'lake' && select('basin') === 'caldera'); el('life-guide').hidden = study !== 'ecology';
  el('omuro-note').hidden = !(study === 'ecology' && volcano === 'scoria'); el('omuro-note').textContent = OMURO_NOTE;
  el('activity-context').hidden = !(study === 'ecology' || study === 'lake' || study === 'heat');
  el('steps').classList.toggle('mechanism-steps',study==='mechanism'); el('eruption-help').hidden = false; el('scene-error').hidden = true;
  el<HTMLSelectElement>('landform').value = volcano === 'shield' || volcano === 'scoria' ? volcano : 'composite';
  try {
    if (isEpisode()) { eruption = new EruptionScene(el<HTMLCanvasElement>('eruption-scene')); eruption.setDetailMotion(detailMotion); eruption.setView(eruptionView(),settings().vents); }
    else if (study === 'lake') { lake = new LakeScene(el<HTMLCanvasElement>('lake-scene')); lake.setView(view==='section'?'section':'landscape'); }
    else if (study === 'submarine') { ocean = new SubmarineScene(el<HTMLCanvasElement>('ocean-scene'),t('海底火山、海水与逐层堆积的示意')); ocean.setView(view as OceanView); }
    else if (study === 'heat') { heat = new HydrothermalScene(el<HTMLCanvasElement>('heat-scene'),() => { if (heat) syncRenderer(); }); heat.setDetailMotion(detailMotion); heat.setView(view==='section'?'section':'landscape'); }
    else if (isOmuro()) { omuro = new OmuroScene(el<HTMLCanvasElement>('omuro-scene')); omuro.setView(view==='section'||view==='vent'?view:'landscape'); }
    else { landHistory = new LandHistoryScene(el<HTMLCanvasElement>('land-history-scene'),volcano as Landform); landHistory.setView(view==='section'||view==='vent'?view:'landscape'); }
  } catch (error) { el('scene-error').hidden = false; console.error(error); }
  const {steps} = stageAndSteps(); el('steps').replaceChildren(...steps.map((label,i) => { const b = document.createElement('button'); b.textContent = `${i+1} · ${label}`; b.addEventListener('click',() => seek(positions()[i])); return b; }));
  el('view-note').textContent = t('换镜头保留本题进度；每个问题使用自己的时间尺度，并记住观察位置。');
  const legend = study === 'heat' ? [[t('蓝色：来自降水的地下水'),'#4d9da9'],[t('暖色：受热后的水'),'#d4a66e'],[t('深色：地下热岩石'),'#6a5750']]
    : study === 'lake' ? [[t('蓝色：后来补给的水'),'#54a8c6'],[t('棕色：盆地与岩层'),'#9b8162']]
      : study === 'ecology' ? [[t('棕色：裂缝里积起的土'),'#725640'],[t('绿色：长成斑块的植物'),'#81975b']]
        : [[t('岩层：留下的喷出物'),'#957860'],[t('亮色：高温物质'),'#ed9b48']];
  el('legend').replaceChildren(...legend.map(([label,color]) => { const span = document.createElement('span'); span.textContent = label; span.style.setProperty('--swatch',color); return span; }));
  const next = nextStudy(study); el('bridge-copy').textContent = content.bridge; el('bridge').hidden = !next; el('bridge').textContent = next ? t('下一问：{{question}} →',{question:STUDY_CONTENT[next].short}) : '';
  const url = new URL(location.href); url.searchParams.set('study',study); url.searchParams.set('case',volcano); url.searchParams.set('chapter',chapter); if (/^#study-/.test(url.hash)) url.hash = ''; history.replaceState(null,'',url);
  buildViews(); settleCamera(); update();
}
function chooseStudy(next: Study, sameMountain?: VolcanoCase) {
  if (next === study) return;
  remember(); study = next; const saved = memories.get(next);
  volcano = sameMountain ?? saved?.volcano ?? defaultCase(next); chapter = chapterForStudy(next); progress = saved?.progress ?? initialStudyProgress(next); view = saved?.view ?? (next === 'styles' ? 'exterior' : next === 'lake' || next === 'heat' ? 'section' : 'landscape');
  for (const [id,value] of Object.entries(saved?.values ?? defaults)) el<HTMLSelectElement>(id).value = value;
  mountStudy();
}
el('questions').replaceChildren(...UNITS.map(unit => {
  const group = document.createElement('div'); group.className = 'question-unit'; group.setAttribute('role','group'); group.setAttribute('aria-label',UNIT_CONTENT[unit.id]);
  const label = document.createElement('p'); label.className = 'question-unit-label'; label.textContent = UNIT_CONTENT[unit.id]; group.append(label);
  for (const id of unit.studies) { const b = document.createElement('button'); b.dataset.study = id; b.textContent = STUDY_CONTENT[id].short; b.title = STUDY_CONTENT[id].title; b.addEventListener('click',() => chooseStudy(id)); group.append(b); } return group;
}));
el('reset-orbit').addEventListener('click',() => activeScene()?.resetCamera());
el('retry-3d').addEventListener('click',() => { activeScene()?.retry3D(); syncRenderer(); buildViews(); update(); });
el('detail-motion').addEventListener('click',() => { detailMotion = !detailMotion; eruption?.setDetailMotion(detailMotion); heat?.setDetailMotion(detailMotion); syncRenderer(); });
document.querySelector('.scene-wrap')!.addEventListener('volcano-renderer',() => { syncRenderer(); buildViews(); });
function tick(now: number) {
  if (!playing || document.hidden) return;
  if (now-last>=32) { progress = Math.min(1,progress+Math.min(now-last,100)/1000*number('rate')/36); last = now; if(progress>=1) playing=false; settleCamera(); update(); }
  if (playing) frame=requestAnimationFrame(tick);
}
el('play').addEventListener('click',() => {
  if (playing) { stop(); update(); return; } cancelSeek();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { progress=1; settleCamera(); update(); return; }
  if (progress>=1) { progress=0; eruption?.resetDetailPhase(); }
  playing=true; last=performance.now(); update(); frame=requestAnimationFrame(tick);
});
el('progress').addEventListener('input',() => { stop(); progress=number('progress')/1000; eruption?.resetDetailPhase(); settleCamera(); update(); });
for (const id of controls.filter(id => id !== 'eruption-scenario' && id !== 'eruption-strength')) el(id).addEventListener(['supply','gas','viscosity','water','resistance','heat-water'].includes(id)?'input':'change',() => {
  stop();
  if (id==='style') { const preset=PRESETS[select('style') as EruptionStyle]; for(const field of ['gas','viscosity','supply'] as const) el<HTMLInputElement>(field).value=String((preset[field]??.7)*100); }
  if (id==='gas'||id==='viscosity') el<HTMLSelectElement>('style').value='custom';
  if (id==='landform') { volcano=landformFrom(select('landform')); mountStudy(); return; }
  if (id==='environment'||id==='basin') { mountStudy(); return; }
  settleCamera(); update();
});
el<HTMLSelectElement>('kid-path').addEventListener('change',() => {
  stop(); const path=select('kid-path');
  if(path==='stalled') { el<HTMLInputElement>('supply').value='20'; el<HTMLInputElement>('resistance').value='90'; }
  else if(path!=='custom') { const preset=PRESETS[path as EruptionStyle]; el<HTMLSelectElement>('style').value=path; for(const field of ['gas','viscosity','supply'] as const) el<HTMLInputElement>(field).value=String((preset[field]??.7)*100); el<HTMLInputElement>('resistance').value='35'; }
  progress=0; eruption?.resetDetailPhase(); settleCamera(); update();
});
el('eruption-scenario').addEventListener('change',chooseEruptionScenario);
document.querySelectorAll<HTMLButtonElement>('[data-strength]').forEach(b=>b.addEventListener('click',()=>{
  stop(); el<HTMLInputElement>('eruption-strength').value = b.dataset.strength === 'small' ? '.32' : '1';
  update();
}));
document.querySelectorAll<HTMLButtonElement>('[data-collapse]').forEach(b=>b.addEventListener('click',()=>seek(Number(b.dataset.collapse))));
el('life-entry').addEventListener('click',()=>chooseStudy('ecology',volcano));
el('bridge').addEventListener('click',()=>{ const next=nextStudy(study); if(next)chooseStudy(next); });
function showStatus(status: VolcanoStatus) { const note=STATUS_NOTES[status]; for(const [id,text] of [['status-title',note.title],['status-body',note.body],['status-evidence',note.evidence],['status-limit',note.limit]])el(id).textContent=text; document.querySelectorAll<HTMLButtonElement>('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===status))); }
document.querySelectorAll<HTMLButtonElement>('[data-status]').forEach(b=>b.addEventListener('click',()=>showStatus(b.dataset.status as VolcanoStatus)));
document.addEventListener('visibilitychange',()=>{ if(document.hidden){stop();cancelCamera();activeScene()?.stopMotion();el('play').textContent=progress>=1?t('重新播放过程'):t('播放过程');} });
window.addEventListener('pagehide',()=>{stop();cancelCamera();disposeScenes();sceneResize.disconnect();});
window.addEventListener('pageshow',event=>{if(event.persisted){mountStudy();sceneResize.observe(document.querySelector('.scene-wrap')!);}});
document.addEventListener('keydown',event=>{if(event.code==='Space'&&!event.repeat&&!(event.target as HTMLElement)?.closest('button,input,select,a,textarea,summary,[contenteditable]')){event.preventDefault();el('play').click();}});
let resizeFrame=0;
const sceneResize=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{settleCamera();update();});});
sceneResize.observe(document.querySelector('.scene-wrap')!);
mountPresentationFrame({root:'.explorer',visual:'.scene-wrap',transport:'.eruption-comparison,.playback',choices:'#questions'});
mountReadingMode('.advanced');
document.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach(b=>b.addEventListener('click',update));
mountStudy(); showStatus('dormant');
