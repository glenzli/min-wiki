import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CONTENT } from './content.ts';
import { TopicScene } from './scene.ts';
import { rainState, equivalentCloudDrops } from './model.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation("rain-formation");
const el = (id: string) => document.getElementById(id)!;
const setText=(id:string,text:string)=>{if(el(id).textContent!==text)el(id).textContent=text;};
const value = (id: string) => (el(id) as HTMLInputElement | HTMLSelectElement).value;
const number = (id: string) => Number(value(id));
const checked = (id: string) => (el(id) as HTMLInputElement).checked;
let progress = 0, playing = false, academic = false, frame = 0, last = 0;
let scene: TopicScene | undefined;
try { scene = new TopicScene(el('scene') as HTMLCanvasElement); }
catch (error) { el('scene-error').hidden = false; console.error(error); }
const positions = [0, 0.3, 0.58, 1];
function update() {
  const settings={route:value('route') as 'warm'|'ice',humidity:number('humidity')}; const result=rainState(progress,settings);
  const stage=result.stage;
  setText('scene-title',CONTENT.steps[stage]);setText('story-title',CONTENT.steps[stage]);
  setText('scene-note',CONTENT.note);
  setText('story',academic?CONTENT.academic[stage]:CONTENT.stories[stage]);
  setText('metric',result.cloud===0?t('水汽尚未凝结'):progress<.67?t('云滴还在长大'):progress<.98?t('雨滴正在下落'):result.reachesGround?t('雨滴落到地面'):t('雨滴在空中蒸发'));
  setText('humidity-value',value('humidity')+'%');
  setText('science-live',result.cloud===0?t('水汽尚未凝结'):t('半径：{{radius}} mm → {{remaining}} mm；云下湿度：{{humidity}}%\n假设云滴半径 0.01 mm，初始雨滴约含 {{count}} 个云滴的水量。',{radius:result.radiusMm.toFixed(2),remaining:result.remainingRadiusMm.toFixed(2),humidity:settings.humidity,count:Math.round(equivalentCloudDrops(.7)).toLocaleString()}));
  setText('metric-label',CONTENT.metric);
  setText('prompt',CONTENT.prompt);
  setText('explanation',CONTENT.explanation);
  setText('limits',CONTENT.limits);
  setText('play',playing?t('暂停'):progress>=1?t('重新播放'):t('开始观察'));
  (el('progress') as HTMLInputElement).value=String(Math.round(progress*1000));
  el('progress').setAttribute('aria-valuetext',CONTENT.steps[stage]);
  setText('elapsed',`${(progress*26).toFixed(1)} / 26 s`);
  el('steps').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(stage===i)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='academic')===academic)));
  el('science-panel').hidden=!academic;
  setText('science-formula',CONTENT.formulas[stage]);
  setText('science-terms',CONTENT.terms);
  setText('science-caution',CONTENT.caution);
  setText('observe',CONTENT.watch[stage]);
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
function goTo(target:number){
 stop();
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){progress=target;update();return;}
 const from=progress,start=performance.now();
 const move=(now:number)=>{const f=Math.min(1,(now-start)/1200);progress=from+(target-from)*f*f*(3-2*f);update();if(f<1)frame=requestAnimationFrame(move);else frame=0;};
 frame=requestAnimationFrame(move);
}
function toggle() {
  if (playing) stop();
  else { stop(); if (progress >= 1) progress = 0; playing = true; last = performance.now(); frame = requestAnimationFrame(tick); }
  update();
}
el('play').addEventListener('click', toggle);
el('reset').addEventListener('click', () => { stop(); progress = 0; update(); });
el('progress').addEventListener('input', () => { stop(); progress = number('progress') / 1000; update(); });
for (const id of ["route", "humidity"]) el(id).addEventListener('input', update);
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
el('steps').replaceChildren(...CONTENT.steps.map((label, i) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', () => { goTo(positions[i]); }); return b; }));
document.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && !(e.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')) { e.preventDefault(); toggle(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
window.addEventListener('pagehide', e => { cancelAnimationFrame(frame); frame = 0; if (!e.persisted) { stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
update();
