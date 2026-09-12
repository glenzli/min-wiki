import { netSupply } from './model.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CONTENT, COLLAPSE } from './content.ts';
import { SCIENCE } from './science.ts';
import { TopicScene } from './scene.ts';
import { readout } from './model.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation("volcanic-lakes");
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => (el(id) as HTMLInputElement | HTMLSelectElement).value;
const number = (id: string) => Number(value(id));
const checked = (id: string) => (el(id) as HTMLInputElement).checked;
let progress = 0, playing = false, academic = false, frame = 0, last = 0;
let scene: TopicScene | undefined;
try { scene = new TopicScene(el('scene') as HTMLCanvasElement); }
catch (error) { el('scene-error').hidden = false; console.error(error); }
const positions = [0, 0.32, 0.62, 1];
const labels: Record<string, string> = { favorable: t('较有利'), unfavorable: t('不利于组织'), storm: t('雷暴中的旋转'), tornado: t('触地旋转气柱'), weak: t('较弱的气流') };
function update() {
  const settings = { basin: value('basin') as 'crater' | 'caldera', supply: number('supply') / 100, leak: value('leak') as 'low' | 'high' };
  const result = readout(progress, settings), stage = result.stage;
  const collapseStage = progress < .18 ? 0 : progress < .27 ? 1 : progress < .48 ? 2 : 3;
  const caldera = settings.basin === 'caldera';
  el('collapse-guide').hidden = !caldera; el('crater-note').hidden = caldera;
  document.querySelectorAll('[data-collapse]').forEach((b, i) => b.setAttribute('aria-pressed', String(i === collapseStage)));
  const science = SCIENCE[stage], limited = result.limited && progress > .45;
  el('scene-title').textContent = el('story-title').textContent = result.limited && progress > .45 ? t('条件改变，结果也不同') : CONTENT.steps[stage];
  el('scene-note').textContent = CONTENT.sceneNote;
  el('story').textContent = academic ? science.body + (limited ? ' ' + CONTENT.blockedAcademic : '') : limited ? CONTENT.blocked : CONTENT.stories[stage];
  if (caldera && progress < .48 && !academic) {
    el('scene-title').textContent = el('story-title').textContent = COLLAPSE[collapseStage].title;
    el('story').textContent = COLLAPSE[collapseStage].body;
  }
  if (!caldera && stage === 1 && !academic) el('story').textContent = t('喷口周围的爆发、物质堆积和局部坍落可以留下较小火山口。这里没有演示破火山口那种大范围岩体沿断裂下沉。随后能否成湖，还要看水能不能留下来。');
  el('metric').textContent = labels[result.value] ?? result.value;
  el('metric-label').textContent = CONTENT.metricLabel;
  el('prompt').textContent = caldera && progress < .48 ? t('先看岩浆撤出，再看岩层和断裂：哪一个变化先发生？') : CONTENT.prompt;
  el('explanation').textContent = CONTENT.explanation;
  el('limits').textContent = CONTENT.limits;
  el('play').textContent = playing ? t('暂停') : progress >= 1 ? t('重新播放') : t('开始观察');
  (el('progress') as HTMLInputElement).value = String(Math.round(progress * 1000));
  el('progress').setAttribute('aria-valuetext', CONTENT.steps[stage]);
  el('elapsed').textContent = `${(progress * 24).toFixed(1)} / 24 s`;
  el('steps').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(stage === i)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  el('supply-value').textContent = value('supply') + ' ';
  
  el('science-live').textContent = t('相对水深：{{depth}}\n供水与损失：{{balance}}\n更改条件会重算本段积水情景', { depth: result.value, balance: netSupply(settings) > 0 ? t('输入大于损失') : t('输入不大于损失') });
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
  progress = Math.min(1, progress + Math.min((now - last) / 1000, .1) * number('rate') / 24); last = now;
  if (progress >= 1) playing = false;
  update();
  if (playing) frame = requestAnimationFrame(tick);
}
function toggle() {
  if (playing) stop();
  else { if (progress >= 1) progress = 0; playing = true; last = performance.now(); frame = requestAnimationFrame(tick); }
  update();
}
document.querySelectorAll<HTMLButtonElement>('[data-collapse]').forEach(b => b.addEventListener('click', () => { stop(); progress = Number(b.dataset.collapse); update(); el('scene').scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }));
el('play').addEventListener('click', toggle);
el('reset').addEventListener('click', () => { stop(); progress = 0; update(); });
el('progress').addEventListener('input', () => { stop(); progress = number('progress') / 1000; update(); });
for (const id of ["basin", "supply", "leak"]) el(id).addEventListener('input', update);
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
el('steps').replaceChildren(...CONTENT.steps.map((label, i) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', () => { stop(); progress = positions[i]; update(); }); return b; }));
document.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && !(e.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')) { e.preventDefault(); toggle(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
window.addEventListener('pagehide', e => { cancelAnimationFrame(frame); frame = 0; if (!e.persisted) { stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
update();
