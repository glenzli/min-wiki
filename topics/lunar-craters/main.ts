import { animateValue } from '../../src/visuals/transition.ts';
import { impactEnergy, DENSITY } from './model.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CONTENT } from './content.ts';
import { SCIENCE } from './science.ts';
import { TopicScene } from './scene.ts';
import { readout } from './model.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation("lunar-craters");
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => (el(id) as HTMLInputElement | HTMLSelectElement).value;
const number = (id: string) => Number(value(id));
const checked = (id: string) => (el(id) as HTMLInputElement).checked;
let progress = 0, playing = false, academic = false, frame = 0, last = 0;
let scene: TopicScene | undefined;
try { scene = new TopicScene(el('scene') as HTMLCanvasElement); }
catch (error) { el('scene-error').hidden = false; console.error(error); }
let cancelStageMotion = () => {};
for (const type of ['click', 'input', 'keydown']) document.addEventListener(type, () => cancelStageMotion(), { capture: true });
function seekStage(target: number) {
  playing = false;
  cancelStageMotion = animateValue({ from: progress, to: target, duration: 1100,
    onUpdate: value => { progress = value; update(); } });
}
const positions = [0, 0.36, 0.58, 0.94];
const labels: Record<string, string> = { favorable: t('较有利'), unfavorable: t('不利于组织'), storm: t('雷暴中的旋转'), tornado: t('触地旋转气柱'), weak: t('较弱的气流') };
function update() {
  const settings = { diameter: number('diameter'), speed: number('speed') };
  const result = readout(progress, settings), stage = result.stage;
  const science = SCIENCE[stage], limited = result.limited && progress > .45;
  el('scene-title').textContent = el('story-title').textContent = result.limited && progress > .45 ? t('条件改变，结果也不同') : CONTENT.steps[stage];
  el('scene-note').textContent = CONTENT.sceneNote;
  el('story').textContent = academic ? science.body + (limited ? ' ' + CONTENT.blockedAcademic : '') : limited ? CONTENT.blocked : CONTENT.stories[stage];
  el('metric').textContent = labels[result.value] ?? result.value;
  el('metric-label').textContent = CONTENT.metricLabel;
  el('prompt').textContent = CONTENT.prompt;
  el('explanation').textContent = CONTENT.explanation;
  el('limits').textContent = CONTENT.limits;
  el('play').textContent = playing ? t('暂停') : progress >= 1 ? t('重新播放') : t('开始观察');
  (el('progress') as HTMLInputElement).value = String(Math.round(progress * 1000));
  el('progress').setAttribute('aria-valuetext', CONTENT.steps[stage]);
  el('elapsed').textContent = `${(progress * 16).toFixed(1)} / 16 s`;
  el('steps').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(stage === i)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  el('diameter-value').textContent = value('diameter') + ' m';
  el('speed-value').textContent = value('speed') + ' km/s';
  
  el('science-live').textContent = t('撞击体质量 m ≈ {{mass}} kg\n撞击动能 E ≈ {{energy}} J\n月面重力：1.62 m/s²', { mass: (Math.PI / 6 * settings.diameter ** 3 * DENSITY).toExponential(2), energy: impactEnergy(settings.diameter, settings.speed).toExponential(2) });
  el('science-panel').hidden = !academic;
  el('science-formula').textContent = science.formula;
  el('science-terms').textContent = science.terms;
  el('science-caution').textContent = science.caution;
  el('observe').textContent = science.watch;
  if (academic) el('story-title').textContent = science.title;
  scene?.draw(progress, settings, document.getElementById('view') ? value('view') : 'overview');
}
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; }
function tick(now: number) {
  frame = 0;
  if (!playing || document.hidden) return;
  progress = Math.min(1, progress + Math.min((now - last) / 1000, .1) * number('rate') / 16); last = now;
  if (progress >= 1) playing = false;
  update();
  if (playing) frame = requestAnimationFrame(tick);
}
function toggle() {
  if (playing) stop();
  else { if (progress >= 1) progress = 0; playing = true; last = performance.now(); frame = requestAnimationFrame(tick); }
  update();
}
el('play').addEventListener('click', toggle);
el('reset').addEventListener('click', () => { stop(); progress = 0; update(); });
el('progress').addEventListener('input', () => { stop(); progress = number('progress') / 1000; update(); });
for (const id of ["diameter", "speed"]) el(id).addEventListener('input', update);
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
el('steps').replaceChildren(...CONTENT.steps.map((label, i) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', () => { stop(); seekStage(positions[i]); }); return b; }));
document.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && !(e.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')) { e.preventDefault(); toggle(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
window.addEventListener('pagehide', e => { cancelAnimationFrame(frame); frame = 0; if (!e.persisted) { stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
update();
