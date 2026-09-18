import { animateValue } from '../../src/visuals/transition.ts';

import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CONTENT } from './content.ts';
import { SCIENCE } from './science.ts';
import { TopicScene } from './scene.ts';
import { readout, eruptionAppearance, PRESETS, statusEvidence, type Settings, type EruptionStyle, type VolcanoStatus, type ObservationView } from './model.ts';
import { STYLE_NOTES, STATUS_NOTES } from './context.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation("volcano-eruption");
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => (el(id) as HTMLInputElement | HTMLSelectElement).value;
const number = (id: string) => Number(value(id));
let progress = .58, playing = false, academic = false, frame = 0, last = 0;
let settings:Settings={...PRESETS.fountain};
let preset:EruptionStyle|null='fountain';
let cancelSettings=()=>{};
let view:ObservationView='overview';
let scene: TopicScene | undefined;
try { scene = new TopicScene(el('scene') as HTMLCanvasElement); }
catch (error) { el('scene-error').hidden = false; console.error(error); }
const positions = [0, 0.28, 0.58, 0.95];
function update() {
  const result = readout(progress, settings), stage = result.stage;
  const style=STYLE_NOTES[eruptionAppearance(settings).style];
  el('style-title').textContent=style.title;
  el('style-copy').textContent=style.body;
  el('style-watch').textContent=style.watch;
  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===preset)));
  const science = SCIENCE[stage], limited = result.limited && progress > .45;
  el('scene-title').textContent = el('story-title').textContent = result.limited && progress > .45 ? t('条件改变，结果也不同') : CONTENT.steps[stage];
  el('scene-note').textContent = CONTENT.sceneNote;
  el('story').textContent = academic ? science.body + (limited ? ' ' + CONTENT.blockedAcademic : '') : limited ? CONTENT.blocked : CONTENT.stories[stage];
  el('metric').textContent = result.value;
  el('metric-label').textContent = CONTENT.metricLabel;
  el('prompt').textContent = CONTENT.prompt;
  el('explanation').textContent = CONTENT.explanation;
  el('limits').textContent = CONTENT.limits;
  el('play').textContent = playing ? t('暂停') : progress >= 1 ? t('重新播放') : t('开始观察');
  (el('progress') as HTMLInputElement).value = String(Math.round(progress * 1000));
  el('progress').setAttribute('aria-valuetext', CONTENT.steps[stage]);
  el('elapsed').textContent = `${(progress * 24).toFixed(1)} / 24 s`;
  el('steps').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(stage === i)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  for(const id of ['gas','viscosity','supply'] as const){
    const amount=Math.round((settings[id]??.7)*100);
    (el(id) as HTMLInputElement).value=String(amount);
    el(id+'-value').textContent=String(amount);
  }
  
  el('science-live').textContent = t('喷口：{{vents}} 个\n气体条件：{{gas}}；黏度条件：{{viscosity}}\n相对供给：{{supply}} / 100；不是 VEI 或真实体积流率', { vents: settings.vents, gas: settings.gas < .34 ? t('较低') : settings.gas > .66 ? t('较高') : t('中等'), viscosity: settings.viscosity < .34 ? t('较低') : settings.viscosity > .66 ? t('较高') : t('中等'), supply:Math.round((settings.supply??.7)*100) });
  el('science-panel').hidden = !academic;
  el('science-formula').textContent = science.formula;
  el('science-terms').textContent = science.terms;
  el('science-caution').textContent = science.caution;
  el('observe').textContent = science.watch;
  if (academic) el('story-title').textContent = science.title;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  el('view-hint').textContent=view==='overview'?t('从地下通道追到地面喷口。'):view==='vent'?t('保持同一时刻，放大看气泡、熔滴和落地飞溅。'):view==='plume'?t('选择富灰爆发，看上升扩展的灰云与下风方向的落灰。'):t('沿山坡看亮色通道、暗色表壳和较热的内部。');
  scene?.setView(view,settings.vents);scene?.draw(progress, settings);
}
let cancelSeek = () => {};
function goTo(target: number) {
  stop();
  cancelSeek = animateValue({ from: progress, to: target, duration: 1100, onUpdate: value => { progress = value; update(); } });
}
function stop() { cancelSeek(); playing = false; cancelAnimationFrame(frame); frame = 0; }
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
  else { stop(); if (progress >= 1) progress = 0; playing = true; last = performance.now(); frame = requestAnimationFrame(tick); }
  update();
}
el('play').addEventListener('click', toggle);
el('reset').addEventListener('click', () => { stop(); progress = 0; update(); });
el('compare').addEventListener('click',()=>goTo(.58));
el('progress').addEventListener('input', () => { stop(); progress = number('progress') / 1000; update(); });
for (const id of ['vents','gas','viscosity','supply']) el(id).addEventListener('input',()=>{
  cancelSettings();preset=null;
  settings={vents:number('vents'),gas:number('gas')/100,viscosity:number('viscosity')/100,supply:number('supply')/100};update();
});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]'))button.addEventListener('click',()=>{
  cancelSettings();preset=button.dataset.preset as EruptionStyle;
  const from={...settings},to=PRESETS[preset];
  cancelSettings=animateValue({from:0,to:1,duration:650,onUpdate:mix=>{
    settings={vents:from.vents,gas:from.gas+(to.gas-from.gas)*mix,viscosity:from.viscosity+(to.viscosity-from.viscosity)*mix,supply:(from.supply??.7)+((to.supply??.7)-(from.supply??.7))*mix};update();
  }});
});
function showStatus(status:VolcanoStatus){
  const note=STATUS_NOTES[status],evidence=statusEvidence(status);
  document.querySelectorAll<HTMLButtonElement>('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===status)));
  for(const key of ['title','body','past','present','future','evidence','limit'] as const)el('status-'+key).textContent=note[key];
  el('status-eruption').toggleAttribute('hidden',!evidence.erupting);
  el('status-surface').textContent=evidence.erupting?t('这幅图里能看到喷出物。'):t('这幅山形保持不变：仅看外观，分不清休眠与熄灭。');
}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-status]'))button.addEventListener('click',()=>showStatus(button.dataset.status as VolcanoStatus));
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-view]'))button.addEventListener('click',()=>{view=button.dataset.view as ObservationView;update();});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
el('steps').replaceChildren(...CONTENT.steps.map((label, i) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', () => { goTo(positions[i]); }); return b; }));
document.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && !(e.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')) { e.preventDefault(); toggle(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
window.addEventListener('pagehide', e => { cancelAnimationFrame(frame); frame = 0; cancelSettings(); if (!e.persisted) { stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); } });
showStatus('dormant');update();
