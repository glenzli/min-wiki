import { animateValue } from '../../src/visuals/transition.ts';
import { SYNODIC_DAYS, SIDEREAL_DAYS, litFraction, phaseIndex } from './model.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CONTENT } from './content.ts';
import { SCIENCE } from './science.ts';
import { PHASES } from './phases.ts';
import { TopicScene } from './scene.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation("earth-moon");
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => (el(id) as HTMLInputElement | HTMLSelectElement).value;
const number = (id: string) => Number(value(id));
const checked = (id: string) => (el(id) as HTMLInputElement).checked;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
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
const positions = PHASES.map((_, index) => index / PHASES.length);
function update() {
  const settings = { guides: checked('guides') };
  const stage = Math.min(3, Math.floor(progress * 4));
  const science = SCIENCE[stage];
  const currentPhase = PHASES[phaseIndex(progress)];
  document.body.dataset.mode = academic ? 'academic' : 'kids';
  el('scene-title').textContent = currentPhase.title;
  el('scene-note').textContent = CONTENT.sceneNote;
  el('story').textContent = science.body;
  el('academic-brief-title').textContent = science.title;
  el('academic-brief-formula').textContent = science.formula;
  el('child-story').textContent = value('view') === 'scale'
    ? t('按同一长度比例摆放后，月球小得多，地月之间也很空。这个排列不表示此刻的月相。')
    : currentPhase.story;
  el('metric').textContent = `${Math.round(litFraction(progress) * 100)}%`;
  el('metric-label').textContent = CONTENT.metricLabel;
  el('prompt').textContent = value('view') === 'scale'
    ? t('数一数，两颗球的中心之间大约能排下多少个地球？')
    : CONTENT.prompt;
  el('explanation').textContent = CONTENT.explanation;
  el('limits').textContent = CONTENT.limits;
  el('play').textContent = reducedMotion.matches ? t('下一月相') : playing ? t('暂停') : progress >= 1 ? t('重新播放') : t('开始观察');
  (el('progress') as HTMLInputElement).value = String(Math.round(progress * 1000));
  el('progress').setAttribute('aria-valuetext', PHASES[phaseIndex(progress)].title);
  el('elapsed').textContent = `${(progress * 28).toFixed(1)} / 28 s`;
  el('steps').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === phaseIndex(progress))));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  
  
  el('story-title').textContent = science.title;
  el('elapsed').textContent = t('{{days}} / 29.5 天', { days: (progress * SYNODIC_DAYS).toFixed(1) });
  if (value('view') === 'scale') { el('scene-title').textContent = t('真实大小与距离'); el('metric').textContent = '384,400 km'; el('metric-label').textContent = t('地月平均中心距离'); el('scene-note').textContent = t('真实比例排列，用来比较大小与距离，不代表当前月相的位置。'); }
  if (value('view') === 'earth') el('scene-note').textContent = t('以地心方向为近似，月球北方朝上；月盘已放大，暗面微光为辨认轮廓而增强。');
  const phaseAngle = Math.acos(-Math.cos(progress * Math.PI * 2)) * 180 / Math.PI;
  el('science-live').textContent = t('月相周期经过 {{days}} 天 / 29.53 天\n相位角 α ≈ {{angle}}°；受光比例 k = {{fraction}}\n恒星月：{{sidereal}} 天', { days: (progress * SYNODIC_DAYS).toFixed(2), angle: phaseAngle.toFixed(1), fraction: litFraction(progress).toFixed(3), sidereal: SIDEREAL_DAYS.toFixed(2) });
  el('science-panel').hidden = !academic;
  el('science-formula').textContent = science.formula;
  el('science-terms').textContent = science.terms;
  el('science-caution').textContent = science.caution;
  el('observe').textContent = science.watch;
  scene?.draw(progress, settings, value('view')); 
}
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; }
function tick(now: number) {
  frame = 0;
  if (!playing || document.hidden) return;
  progress = Math.min(1, progress + Math.min((now - last) / 1000, .1) * number('rate') / 28); last = now;
  if (progress >= 1) playing = false;
  update();
  if (playing) frame = requestAnimationFrame(tick);
}
function toggle() {
  if (reducedMotion.matches) { stop(); progress = progress >= 1 ? 0 : Math.min(1, (Math.floor(progress * 8 + .00001) + 1) / 8); update(); return; }
  if (playing) stop();
  else { if (progress >= 1) progress = 0; playing = true; last = performance.now(); frame = requestAnimationFrame(tick); }
  update();
}
const onMotionPreference = () => { if (reducedMotion.matches) { stop(); cancelStageMotion(); } update(); };
reducedMotion.addEventListener('change', onMotionPreference);
el('play').addEventListener('click', toggle);
el('observer-toggle').addEventListener('click', () => {
  (el('view') as HTMLSelectElement).value = value('view') === 'earth' ? 'orbit' : 'earth'; update();
});
el('reset').addEventListener('click', () => { stop(); progress = 0; update(); });
el('progress').addEventListener('input', () => { stop(); progress = number('progress') / 1000; update(); });
for (const id of ["view", "guides"]) el(id).addEventListener('input', update);
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
el('steps').replaceChildren(...PHASES.map((phase, i) => { const b = document.createElement('button'); b.textContent = phase.title; b.addEventListener('click', () => { stop(); seekStage(i === 0 && progress > .875 ? 1 : positions[i]); }); return b; }));
document.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && !(e.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')) { e.preventDefault(); toggle(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
window.addEventListener('pagehide', e => { cancelAnimationFrame(frame); frame = 0; if (!e.persisted) { stop(); reducedMotion.removeEventListener('change', onMotionPreference); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
update();
