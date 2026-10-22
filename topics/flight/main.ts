import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { t } from './i18n.ts';
import { FLIGHT, flightSnapshot, type FlightSnapshot } from './model.ts';
import { questions, questionView, readFlightRoute, writeFlightRoute, type FlightView, type Question } from './journey.ts';
import { studies } from './study.ts';
import { drawWing, drawRunway, drawCoefficientPlot } from './scene.ts';
import type { RunwayView, CameraView } from './runwayView.ts';

translateDocument(t);
mountPresentationFrame({ root: '#flight-lab', visual: '.flight-visual', transport: '.flight-status,.transport,.legend',
  choices: '.flight-questions,.flight-lenses,.flight-comparisons,.flight-display' });
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const checked = (id: string) => el<HTMLInputElement>(id).checked;
const write = (id: string, value: string) => { if (el(id).textContent !== value) el(id).textContent = value; };
// Reader may flatten the authored transport. Group the retained real controls after it mounts.
const transportHost = el('play-flight').closest<HTMLElement>('.presentation-transport');
if (transportHost) {
  const playback = document.createElement('div'); playback.className = 'flight-playback-row';
  playback.append(el('play-flight'), el('step-flight'), el('reset-flight'), el('progress').closest('.seek')!);
  const meters = document.createElement('div'); meters.className = 'flight-meters-row';
  meters.append(el('current-title').closest('.flight-status')!, document.querySelector('.flight-study .legend')!);
  transportHost.append(meters, playback);
  transportHost.querySelectorAll('.transport:empty').forEach(node => node.remove());
}
let state = readFlightRoute(location.search), playing = false, frame = 0, last = 0, disposed = false;
let snapshot = flightSnapshot(state, state.progress), spatial: RunwayView | undefined;
let spatialPending = false, spatialReady = false, spatialFailed = false, generation = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 600px)');

function explanation(s: FlightSnapshot) {
  if (s.airspeed < .1) return t('机翼和空气没有相对运动，模型升力为零。抬起翼头，也不会凭空飞起来。');
  if (s.stalled) return t('翼头抬得太多，上方气流明显分离。超过本模型的临界迎角后，升力系数从峰值下降，阻力增加；失速不是发动机停了。');
  if (s.height > .01) return t('这组条件让飞机离地。上升改变了迎面气流的方向，所以迎角会减小；抬翼头的角度一直没有变。');
  if (s.netVertical > 0) return t('空气给出的向上作用超过重量，地面不再需要托住它。播放短窗口，看看这次是否离地。');
  return t('气流被机翼改变了，但向上作用还不够抵消重量。轮子仍由跑道托住；再比较速度或翼头角度。');
}
function saveRoute(push = false) {
  const url = new URL(location.href); url.search = writeFlightRoute(url.search, state);
  if (url.href !== location.href) history[push ? 'pushState' : 'replaceState'](null, '', url);
}
function showSpatialState() {
  el('runway-canvas').hidden = !spatialReady;
  el('runway-fallback').hidden = spatialReady;
  el('render-error').hidden = state.view !== 'runway' || !spatialFailed;
  el('camera-hint').hidden = !spatialReady || !checked('labels');
  el('camera-choice').hidden = state.view !== 'runway';
  el('camera').toggleAttribute('disabled', !spatialReady);
  el('flight-lab').dataset.renderer = spatialReady ? 'three' : spatialFailed ? 'fallback' : 'pending';
}
async function ensureSpatial(retry = false) {
  if (disposed || spatialPending || spatialReady && !retry || spatialFailed && !retry) return;
  spatial?.dispose(); spatial = undefined; spatialReady = false; spatialPending = true; spatialFailed = false;
  const request = ++generation; showSpatialState();
  try {
    const { RunwayView, freshRunwayCanvas } = await import('./runwayView.ts');
    if (disposed || request !== generation) return;
    const previousCanvas = el<HTMLCanvasElement>('runway-canvas');
    const canvas = retry ? freshRunwayCanvas(previousCanvas) : previousCanvas;
    spatial = new RunwayView(canvas, () => {
      spatialReady = false; spatialFailed = true; showSpatialState();
    }, () => selectView('wing'));
    spatialReady = true; spatial.setActive(state.view === 'runway'); showSpatialState();
    spatial.draw(snapshot, { labels: checked('labels'), forces: checked('forces') });
    spatial.setCamera(el<HTMLSelectElement>('camera').value as CameraView);
  } catch {
    if (!disposed && request === generation) { spatial?.dispose(); spatial = undefined; spatialReady = false; spatialFailed = true; showSpatialState(); }
  } finally { if (request === generation) spatialPending = false; }
}
function update() {
  if (disposed) return;
  snapshot = flightSnapshot(state, state.progress);
  const s = snapshot, study = studies[state.question];
  el('wing-panel').hidden = state.view !== 'wing'; el('runway-panel').hidden = state.view !== 'runway';
  el('flight-lab').dataset.question = state.question; el('flight-lab').dataset.view = state.view;
  drawWing(s, state.progress, { question: state.question, labels: checked('labels'), forces: checked('forces') });
  drawRunway(s, checked('forces')); drawCoefficientPlot(s);
  spatial?.setActive(state.view === 'runway');
  if (spatialReady) spatial?.draw(s, { labels: checked('labels'), forces: checked('forces') });
  if (state.view === 'runway') void ensureSpatial(); showSpatialState();
  el<HTMLInputElement>('speed').value = String(state.speed); el<HTMLInputElement>('pitch').value = String(state.pitch);
  el<HTMLInputElement>('progress').value = String(Math.round(state.progress * 1000));
  write('speed-value', t('{{n}} 米/秒', { n: state.speed })); write('pitch-value', `${state.pitch}°`);
  write('response-value', t('{{time}} / {{duration}} 秒 · 慢放', { time: s.time.toFixed(2), duration: FLIGHT.duration.toFixed(2) }));
  el('progress').setAttribute('aria-valuetext', t('短观察窗口 {{n}}%，可回退重看', { n: Math.round(state.progress * 100) }));
  write('current-title', s.airspeed < .1 ? t('没有迎面气流') : s.stalled ? t('气流分离：角度过大') : s.height > .01 ? t('已离地') : t('轮子仍在跑道上'));
  write('current-copy', explanation(s));
  write('angle-readout', t('迎角 {{n}}°', { n: s.angleOfAttack.toFixed(1) }));
  write('support-note', s.support > .1 ? t('跑道支持 {{n}} kN', { n: (s.support / 1000).toFixed(1) }) : t('跑道支持为零'));
  write('model-readout', t('教学模型：升力 {{lift}} kN，重量 {{weight}} kN，竖直合力 {{net}} kN，高度 {{height}} m。', {
    lift: (s.lift / 1000).toFixed(2), weight: (s.weight / 1000).toFixed(2), net: (s.netVertical / 1000).toFixed(2), height: s.height.toFixed(2) }));
  write('question-number', study.label); write('question-title', study.title); write('question-copy', study.kids);
  write('question-watch', study.watch); write('question-science', study.science); write('question-limit', study.limit);
  write('question-bridge', study.bridge); write('scene-caption', state.view === 'wing' ? study.limit : t('先看整架飞机，再放大蓝色标记处的机翼。固定速度、固定姿态的教学模型，不预测真实起飞。'));
  write('next-question', state.question === 'stall' ? t('带回跑道，检验判断 →') : t('继续下一问 →'));
  el('stall-plot').hidden = state.question !== 'stall';
  write('play-flight', playing ? t('暂停观察') : state.progress >= 1 ? t('重播短窗口') : t('播放短窗口'));
  el('play-flight').setAttribute('aria-pressed', String(playing));
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-flight-chapter]')) button.setAttribute('aria-pressed', String(button.dataset.flightChapter === state.view));
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-question]')) button.setAttribute('aria-pressed', String(button.dataset.question === state.question));
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) {
    const match = button.dataset.preset === 'still' ? state.speed === 0 && state.pitch === 12 : state.speed === 38 && state.pitch === (button.dataset.preset === 'stalled' ? 26 : 12);
    button.setAttribute('aria-pressed', String(match));
  }
  Object.assign(el('flight-lab').dataset, { flightState: s.airspeed < .1 ? 'still' : s.stalled ? 'separated' : s.height > .01 ? 'airborne' : 'ground',
    progress: state.progress.toFixed(4), height: s.height.toFixed(4), speed: String(state.speed), pitch: String(state.pitch) });
}
function stop() { cancelAnimationFrame(frame); frame = 0; playing = false; }
function tick(now: number) {
  frame = 0; if (!playing || document.hidden || disposed) return;
  state.progress = Math.min(1, state.progress + Math.min(60, now - last) / 6000); last = now;
  if (state.progress >= 1) stop(); update(); if (playing) frame = requestAnimationFrame(tick); else saveRoute();
}
function play() {
  if (playing) { stop(); update(); saveRoute(); return; }
  stop(); if (state.progress >= 1) state.progress = 0;
  if (reduced.matches) { state.progress = 1; update(); saveRoute(); return; }
  playing = true; last = performance.now(); frame = requestAnimationFrame(tick); update();
}
function selectQuestion(question: Question, push = true) { state.question = question; state.view = questionView(question); update(); saveRoute(push); }
function selectView(view: FlightView) { state.view = view; update(); saveRoute(true); }
for (const id of ['speed', 'pitch']) el(id).addEventListener('input', () => {
  stop(); state.speed = Number(el<HTMLInputElement>('speed').value); state.pitch = Number(el<HTMLInputElement>('pitch').value); state.progress = 0; update(); saveRoute();
});
el('progress').addEventListener('input', () => { stop(); state.progress = Number(el<HTMLInputElement>('progress').value) / 1000; update(); saveRoute(); });
el('play-flight').addEventListener('click', play);
el('step-flight').addEventListener('click', () => { stop(); state.progress = Math.min(1, state.progress + .2); update(); saveRoute(); });
el('reset-flight').addEventListener('click', () => { stop(); state.progress = 0; update(); saveRoute(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) button.addEventListener('click', () => {
  stop(); state.progress = 0; state.speed = button.dataset.preset === 'still' ? 0 : 38; state.pitch = button.dataset.preset === 'stalled' ? 26 : 12; update(); saveRoute();
});
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-flight-chapter]')) button.addEventListener('click', () => selectView(button.dataset.flightChapter as FlightView));
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-question]')) button.addEventListener('click', () => selectQuestion(button.dataset.question as Question));
el('next-question').addEventListener('click', () => selectQuestion(state.question === 'stall' ? 'runway' : questions[questions.indexOf(state.question) + 1]!));
for (const id of ['labels', 'forces']) el(id).addEventListener('change', update);
el('camera').addEventListener('change', () => spatial?.setCamera(el<HTMLSelectElement>('camera').value as CameraView));
el('inspect-wing').addEventListener('click', () => selectView('wing'));
el('return-airplane').addEventListener('click', () => selectView('runway'));
el('retry-3d').addEventListener('click', () => void ensureSpatial(true));
window.addEventListener('popstate', () => { stop(); state = readFlightRoute(location.search); update(); });
function pauseHidden() { stop(); update(); saveRoute(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseHidden(); });
reduced.addEventListener('change', pauseHidden); narrow.addEventListener('change', update);
window.addEventListener('pagehide', event => {
  pauseHidden(); if (!event.persisted) { disposed = true; generation++; spatial?.dispose(); spatial = undefined; }
});
window.addEventListener('pageshow', () => { if (!disposed) update(); });
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !event.repeat && !(event.target as HTMLElement).closest('input,button,select,a,textarea,[contenteditable]')) { event.preventDefault(); play(); }
});
update(); saveRoute(); mountReadingMode('details.advanced');
