import { wingPreparation } from './model.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t);
mountTopicNavigation('butterfly-life');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const report = (n: number, title: string, text: string) => { el('badge').textContent = String(n); el('state-title').textContent = title; el('state-text').textContent = text; };
const ids = ['egg','larva','pupa','adult'];
const titles = [t('一粒小小的卵'),t('吃叶子，长身体'),t('蛹里面正在大变身'),t('展开翅膀，成为蝴蝶')];
const texts = [t('很多蝴蝶把卵产在适合幼虫吃的植物上。小毛毛虫会从卵里孵出来。'),t('毛毛虫是蝴蝶的幼虫。它吃东西、长大，还会蜕掉旧的外皮。'),t('蛹不是在睡觉。外面很安静，里面的身体正在重新发育，翅膀等成虫结构逐渐形成。'),t('蝴蝶从蛹里出来，翅膀展开、变硬后才能飞。成虫交配产卵，下一代又开始了。')];
let stage = 0, progress = 0, playing = false, frame = 0, last = 0, close = false;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let cancelReveal: () => void = () => {};
let cancelCamera: () => void = () => {};
let camera = [0,0,1000,480];
const detail = [[380,175,240,195],[310,220,370,170],[398,119,206,274],[235,65,530,380]];
function moveCamera() {
  cancelCamera(); const from=[...camera],to=close?detail[stage]!:[0,0,1000,480];
  cancelCamera=animateValue({from:0,to:1,duration:650,onUpdate:p=>{
    camera=from.map((v,i)=>v+(to[i]!-v)*p);el('scene').setAttribute('viewBox',camera.join(' '));
  }});
  el('whole').setAttribute('aria-pressed',String(!close));el('close').setAttribute('aria-pressed',String(close));
}
function stop(){playing=false;cancelAnimationFrame(frame);frame=0;}
function wings(){
  const state=wingPreparation(progress);
  el('expanding-wings').setAttribute('transform',`translate(500 260) scale(${state.width} ${state.length}) translate(-500 -260)`);
  el<HTMLInputElement>('wing-progress').value=String(Math.round(progress*1000));
  el('wing-play').textContent=playing?t('暂停'):reduced.matches?t('看下一步'):progress>=1?t('再观察一次'):t('观察翅膀展开');
  el('wing-note').textContent=state.phase===0?t('刚羽化：翅还小而皱，不能马上飞。'):state.phase===1?t('体液进入翅脉，帮助柔软的翅慢慢伸展。'):t('翅已展开，还需要逐渐硬化，才适合飞行。');
}
function render() {
  ids.forEach((id,i)=>{el(id).setAttribute('visibility',i===stage?'visible':'hidden');el(id).setAttribute('opacity','1');});
  document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stage)===stage)));
  el('peek-control').hidden=stage!==2;el('wing-controls').hidden=stage!==3;
  report(stage+1,titles[stage]!,texts[stage]!);wings();
}
function tick(now:number){
  if(!playing)return;
  progress=Math.min(1,progress+Math.min(.1,(now-last)/1000)/12);last=now;
  if(progress===1)playing=false;wings();if(playing)frame=requestAnimationFrame(tick);
}
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>{
  stop();cancelReveal();stage=Number(b.dataset.stage);render();moveCamera();
  // Stage buttons revisit observations, not a fictitious morph between anatomies.
  const target=el<SVGGElement>(ids[stage]!);
  cancelReveal=animateValue({from:0,to:1,duration:420,onUpdate:value=>target.setAttribute('opacity',String(value))});
}));
el('whole').addEventListener('click',()=>{close=false;moveCamera();});
el('close').addEventListener('click',()=>{close=true;moveCamera();});
el('wing-play').addEventListener('click',()=>{
  if(playing){stop();wings();return;}
  if(progress>=1)progress=0;
  if(reduced.matches){progress=Math.min(1,progress+.25);wings();return;}
  playing=true;last=performance.now();wings();frame=requestAnimationFrame(tick);
});
el<HTMLInputElement>('wing-progress').addEventListener('input',()=>{stop();progress=Number(el<HTMLInputElement>('wing-progress').value)/1000;wings();});
el<HTMLInputElement>('peek').addEventListener('change',()=>el('inside').setAttribute('opacity',el<HTMLInputElement>('peek').checked?'1':'0'));
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();wings();}});
reduced.addEventListener('change',()=>{stop();wings();});
window.addEventListener('pagehide',()=>{stop();cancelReveal();cancelCamera();});
render();mountReadingMode('details:not(.references)');
