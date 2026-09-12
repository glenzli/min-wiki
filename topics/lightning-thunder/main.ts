import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CONTENT } from './content.ts';
import { TopicScene } from './scene.ts';
import { lightningState, soundSpeed } from './model.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation("lightning-thunder");
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => (el(id) as HTMLInputElement | HTMLSelectElement).value;
const number = (id: string) => Number(value(id));
const checked = (id: string) => (el(id) as HTMLInputElement).checked;
let progress = 0, playing = false, academic = false, frame = 0, last = 0;
let scene: TopicScene | undefined;
try { scene = new TopicScene(el('scene') as HTMLCanvasElement); }
catch (error) { el('scene-error').hidden = false; console.error(error); }
const positions = [0, 0.4, 0.63, 0.82];
function update() {
  const settings={distanceKm:number('distance'),temperature:number('temperature')}; const result=lightningState(progress,settings);
  const stage=result.stage;
  el('scene-title').textContent=el('story-title').textContent=CONTENT.steps[stage];
  el('scene-note').textContent=CONTENT.note;
  el('story').textContent=academic?CONTENT.academic[stage]:CONTENT.stories[stage];
  el('metric').textContent=result.delay.toFixed(1)+' s';
  el('distance-value').textContent=value('distance')+' km'; el('temperature-value').textContent=value('temperature')+' °C';
  el('science-live').textContent=t('距离：{{distance}} km；声速约 {{speed}} m/s\n理论延迟：{{delay}} s；声音已传播：{{elapsed}} s',{distance:settings.distanceKm,speed:soundSpeed(settings.temperature).toFixed(0),delay:result.delay.toFixed(1),elapsed:result.soundSeconds.toFixed(1)});
  el('metric-label').textContent=CONTENT.metric;
  el('prompt').textContent=CONTENT.prompt;
  el('explanation').textContent=CONTENT.explanation;
  el('limits').textContent=CONTENT.limits;
  el('play').textContent=playing?t('暂停'):progress>=1?t('重新播放'):t('开始观察');
  (el('progress') as HTMLInputElement).value=String(Math.round(progress*1000));
  el('progress').setAttribute('aria-valuetext',CONTENT.steps[stage]);
  el('elapsed').textContent=`${(progress*26).toFixed(1)} / 26 s`;
  el('steps').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(stage===i)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='academic')===academic)));
  el('science-panel').hidden=!academic;
  el('science-formula').textContent=CONTENT.formulas[stage];
  el('science-terms').textContent=CONTENT.terms;
  el('science-caution').textContent=CONTENT.caution;
  el('observe').textContent=CONTENT.watch[stage];
  scene?.draw(progress,settings);
}
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; }
function tick(now: number) {
  frame = 0;
  if (!playing || document.hidden) return;
  progress = Math.min(1, progress + Math.min((now - last) / 1000, .1) * number('rate') / 26); last = now;
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
for (const id of ["distance", "temperature"]) el(id).addEventListener('input', update);
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
el('steps').replaceChildren(...CONTENT.steps.map((label, i) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', () => { stop(); progress = positions[i]; update(); }); return b; }));
document.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && !(e.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')) { e.preventDefault(); toggle(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
window.addEventListener('pagehide', e => { cancelAnimationFrame(frame); frame = 0; if (!e.persisted) { stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
update();
