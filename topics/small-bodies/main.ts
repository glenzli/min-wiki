import { translateDocument } from '../../src/platform/i18n.ts';
import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { mountSceneReading } from '../../src/platform/sceneReading.ts';
import { t } from './i18n.ts';
import { SmallBodiesScene } from './scene.ts';
import { studies } from './study.ts';
import { parseState, writeState, cometFrame, earthFrame, COMET_ORBIT, type View, type Reservoir, type Specimen } from './model.ts';
import './style.css';

translateDocument(t);
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const lab = el('small-bodies-lab'), host = lab.querySelector<HTMLElement>('.small-bodies-stage')!;
for (const image of lab.querySelectorAll<HTMLImageElement>('img[alt]')) image.alt = t(image.alt);
mountPresentationFrame({ root: lab, visual: '.small-bodies-stage',
  transport: '.sb-transport,#sb-condition-control,#sb-readout,#sb-scale-note', choices: '#sb-chapters' });
const reading = mountSceneReading(lab, { id: 'sb-science', childTarget: el('sb-child-note') });
let state = parseState(location.search);
let scene: SmallBodiesScene | undefined, playing = false, animation = 0, previous = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)'), events = new AbortController();
const options = { signal: events.signal };
const slider = (id: string) => el<HTMLInputElement>(id);
const setText = (id: string, value: string) => { if (el(id).textContent !== value) el(id).textContent = value; };

function canPlay() { return state.view === 'comet' || (state.view === 'belts' && state.reservoir === 'dust'); }
function syncPlay() {
  el('sb-play').hidden = !canPlay();
  setText('sb-play', playing ? t('暂停观察') : reduced.matches ? t('每次前进一步') : t('播放一圈'));
  el('sb-play').setAttribute('aria-pressed', String(playing));
}
function stop() { playing = false; cancelAnimationFrame(animation); animation = 0; previous = 0; syncPlay(); }
function remember() { history.replaceState(null, '', writeState(new URL(location.href), state)); }
function sceneFailed() { stop(); el('sb-fallback').hidden = false; lab.dataset.render = 'fallback'; }
function createScene() {
  scene?.dispose(); scene = undefined; el('sb-fallback').hidden = true;
  try {
    scene = new SmallBodiesScene(host, state, {
      sun: t('太阳定位符'), nucleus: t('同一彗核'), ion: t('离子尾'), dustTail: t('尘埃尾'), earth: t('地球定位符'),
      main: t('主小行星带'), kuiper: t('柯伊伯带'), dustCloud: t('稀薄尘埃云'), oort: t('推断的球状储库'),
      mars: t('火星轨道'), jupiter: t('木星轨道'), neptune: t('海王星轨道'),
    }, sceneFailed);
    lab.dataset.render = 'webgl';
  } catch { sceneFailed(); }
}
function specimenNote() {
  if (state.specimen === 'carbon') return t('C 型是一组光谱分类，常见于较暗、富含碳质物质的样本。这里的灰褐色与坑洼只是代表画法，不是对某颗小行星的测量。');
  if (state.specimen === 'silicate') return t('S 型常显示硅酸盐矿物的光谱线索，也可含金属。改变照明会改变这块样本的亮暗，不会把它变成另一种成分。');
  if (state.specimen === 'metal') return t('M 型常与含金属的解释联系，但不能把每颗 M 型都认作一整块铁。反射光、密度、雷达与采样提供不同线索。这里没有绘制确定的内部。');
  return t('谷神星直径约 950 千米，近似圆球，在主小行星带内绕太阳。矮行星还涉及自身重力使其近圆、不是卫星、没有主导轨道邻域等条件；不能只按大小或颜色判断。');
}
function render() {
  const shapes = state.view === 'shapes', comet = state.view === 'comet', dust = state.view === 'belts' && state.reservoir === 'dust';
  lab.dataset.view = state.view; lab.dataset.reservoir = state.reservoir;
  lab.dataset.orbit = state.cometPhase.toFixed(4); lab.dataset.earth = state.earthPhase.toFixed(4);
  lab.dataset.ice = String(state.exposedIce); lab.dataset.inStream = String(earthFrame(state.earthPhase).inStream);
  for (const button of lab.querySelectorAll<HTMLButtonElement>('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
  el('sb-shape-options').hidden = !shapes; el('sb-comet-options').hidden = !comet; el('sb-belt-options').hidden = state.view !== 'belts';
  el('sb-light-control').hidden = !shapes; el('sb-orbit-control').hidden = !comet; el('sb-earth-control').hidden = !dust;
  el('sb-comet-stops').hidden = !comet; el('sb-dust-stops').hidden = !dust; el('sb-orbit-legend').hidden = !comet;
  el('sb-condition-control').hidden = !(shapes || comet || dust);
  el<HTMLSelectElement>('sb-specimen').value = state.specimen; slider('sb-light').value = String(state.light);
  slider('sb-orbit').value = String(state.cometPhase * 1000); slider('sb-earth').value = String(state.earthPhase * 1000);
  slider('sb-ice').checked = state.exposedIce; slider('sb-labels').checked = state.labels;
  el<HTMLSelectElement>('sb-lens').value = state.cometLens; el<HTMLSelectElement>('sb-region').value = state.reservoir;
  slider('sb-light').setAttribute('aria-valuetext', t('光源方向 {{angle}} 度', { angle: state.light }));
  slider('sb-orbit').setAttribute('aria-valuetext', t('轨道时间 {{percent}}%', { percent: Math.round(state.cometPhase * 100) }));
  slider('sb-earth').setAttribute('aria-valuetext', t('示意轨道位置 {{percent}}%', { percent: Math.round(state.earthPhase * 100) }));
  if (shapes) {
    setText('sb-readout', t('光源移动了，明暗交界也跟着移动。形状和成分没有被光照改变；转到背面再看看。'));
    setText('sb-scale-note', t('形状与表面是示意；各样本分别适配画面，屏幕大小不能用来比较直径。颜色不能单独鉴定成分。'));
    setText('sb-specimen-note', specimenNote());
  } else if (comet) {
    const f = cometFrame(state.cometPhase, state.exposedIce);
    const activity = !state.exposedIce ? t('此对照没有暴露冰，模型不产生彗发和彗尾。')
      : f.activity < .02 ? t('这个远处条件下，模型中的活动很弱或不可见。')
      : t('受热的冰升华，释放气体并带出尘埃；细离子尾背离太阳，尘埃尾弯向经过的路径。');
    setText('sb-readout', t('距太阳 {{distance}} AU；模型日照是地球处的 {{flux}} 倍。{{activity}}', {
      distance: f.rAU.toFixed(1), flux: f.sunlightAtEarth.toFixed(f.sunlightAtEarth < .1 ? 2 : 1), activity,
    }));
    setText('sb-scale-note', t('假想轨道：近日点约 0.9 AU，远日点约 5.5 AU；1 AU 约为地日距离。轨道距离共用线性标尺，太阳、彗核、彗发与尾分别放大。'));
  } else if (state.reservoir === 'main') {
    setText('sb-readout', t('主带位于火星与木星轨道之间。转成侧面看它的厚度；天体之间有大量空处，画面不是一堵密集石墙。'));
    setText('sb-scale-note', t('此镜头以 AU 表示轨道距离；主带代表点选在约 2.1—3.3 AU。点与太阳均为放大的定位符；数量、形状与厚度只是示意。'));
  } else if (state.reservoir === 'kuiper') {
    setText('sb-readout', t('海王星以外还有许多含冰的小天体。柯伊伯带的主要区域约在 30—50 AU，真实成员的轨道倾斜和伸长程度各不相同。'));
    setText('sb-scale-note', t('此镜头比主带镜头拉远了许多；轨道距离仍按线性 AU 绘制。点是代表定位符，不能当成天体直径、数量或真实位置目录。'));
  } else if (dust) {
    setText('sb-readout', earthFrame(state.earthPhase).inStream
      ? t('地球定位符进入了加宽的示意碎屑流。亮圈标记大气所在位置；碎片进入大气，才可能出现流星，不会在太空里直接烧出流星。')
      : t('地球定位符还在示意碎屑流外。沿轨道走一走，看看何处会穿过它；并非整圈都会有同样的流星活动。'));
    setText('sb-scale-note', t('亮细带沿用上一站假想彗星的轨道；宽度、点大小和地球圈均放大。背景尘埃云只截取内太阳系一部分，不是完整边界或真实流星雨预报。'));
  } else {
    setText('sb-readout', t('这是一幅推断结构：来自不同方向的长周期彗星，为遥远的球状储库提供线索。奥尔特云没有被直接拍成这张“全景照”。'));
    setText('sb-scale-note', t('独立结构示意，与其他镜头没有共同长度比例。奥尔特云可能延伸到距太阳数千至约十万 AU；范围和点位置都不是精确测量。'));
  }
  syncPlay(); scene?.update(state);
}
function choose(view: View) { stop(); state.view = view; reading.set(studies[view]); render(); remember(); }
function tick(now: number) {
  if (!playing || document.hidden) return;
  const dt = previous ? Math.min(.05, (now - previous) / 1000) : 0; previous = now;
  if (state.view === 'comet') state.cometPhase = Math.min(1, state.cometPhase + dt / 36);
  else state.earthPhase = Math.min(1, state.earthPhase + dt / 22);
  render();
  if ((state.view === 'comet' ? state.cometPhase : state.earthPhase) >= 1) { stop(); remember(); }
  else animation = requestAnimationFrame(tick);
}
for (const button of lab.querySelectorAll<HTMLButtonElement>('[data-view]')) button.addEventListener('click', () => choose(button.dataset.view as View), options);
for (const [id, change] of [
  ['sb-light', (value: number) => { state.light = value; }],
  ['sb-orbit', (value: number) => { state.cometPhase = value / 1000; }],
  ['sb-earth', (value: number) => { state.earthPhase = value / 1000; }],
] as const) {
  slider(id).addEventListener('input', () => { stop(); change(Number(slider(id).value)); render(); }, options);
  slider(id).addEventListener('change', remember, options);
}
el('sb-specimen').addEventListener('change', () => { state.specimen = el<HTMLSelectElement>('sb-specimen').value as Specimen; render(); remember(); }, options);
el('sb-region').addEventListener('change', () => { stop(); state.reservoir = el<HTMLSelectElement>('sb-region').value as Reservoir; render(); remember(); }, options);
el('sb-lens').addEventListener('change', () => { state.cometLens = el<HTMLSelectElement>('sb-lens').value as 'orbit' | 'nucleus'; render(); remember(); }, options);
el('sb-ice').addEventListener('change', () => { state.exposedIce = slider('sb-ice').checked; render(); remember(); }, options);
el('sb-labels').addEventListener('change', () => { state.labels = slider('sb-labels').checked; render(); remember(); }, options);
for (const button of lab.querySelectorAll<HTMLButtonElement>('[data-orbit]')) button.addEventListener('click', () => { stop(); state.cometPhase = Number(button.dataset.orbit); render(); remember(); }, options);
el('sb-outside-stream').addEventListener('click', () => { stop(); state.earthPhase = .3; render(); remember(); }, options);
el('sb-enter-stream').addEventListener('click', () => {
  stop(); const p = COMET_ORBIT.aAU * (1 - COMET_ORBIT.eccentricity ** 2);
  state.earthPhase = Math.acos((p - 1) / COMET_ORBIT.eccentricity) / (2 * Math.PI); render(); remember();
}, options);
el('sb-play').addEventListener('click', () => {
  if (playing) { stop(); remember(); return; }
  if (!canPlay()) return;
  const key = state.view === 'comet' ? 'cometPhase' : 'earthPhase';
  if (reduced.matches) { state[key] = state[key] >= 1 ? 0 : Math.min(1, state[key] + .05); render(); remember(); return; }
  if (state[key] >= 1) state[key] = 0;
  playing = true; previous = 0; syncPlay(); animation = requestAnimationFrame(tick);
}, options);
el('sb-reset-camera').addEventListener('click', () => scene?.resetCamera(), options);
el('sb-top-camera').addEventListener('click', () => scene?.topCamera(), options);
el('sb-retry').addEventListener('click', () => { createScene(); render(); }, options);
reduced.addEventListener('change', () => { stop(); render(); }, options);
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); remember(); } else scene?.requestRender(); }, options);
window.addEventListener('pageshow', () => { previous = 0; scene?.requestRender(); }, options);
window.addEventListener('pagehide', event => { stop(); remember(); if (!event.persisted) { events.abort(); scene?.dispose(); } }, options);
window.addEventListener('popstate', () => { stop(); state = parseState(location.search); reading.set(studies[state.view]); render(); }, options);
reading.set(studies[state.view]); createScene(); render();
