import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { painSequence } from './model.ts';
import { createPainScene, drawPain, type Focus } from './scene.ts';
translateDocument(t);
const el = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id)! as T;
const phases=[
  [t('皮肤里的感受末梢'),t('一些末梢能响应可能伤害组织的刺激，把它转换成神经信号。这一步还不能等同于疼痛体验。')],
  [t('信号沿传入神经前进'),t('跟着暖色路径看：电活动沿感觉神经传入脊髓。它不是把一粒疼痛从皮肤运走。')],
  [t('脊髓内，联系分成两路'),t('绿色支路经脊髓回路联系运动神经；紫色通路同时继续向脑传递。两条都在工作。')],
  [t('肌肉可以先带来缩回动作'),t('这是保护性反射，不必先作出“我要缩手”的决定。图上向脑通路仍在继续。')],
  [t('脑内加工，与疼痛体验有关'),t('多个脑区共同参与感觉与情绪等加工。疼痛不是一个神经信号，也不是伤害大小的精确读数。')],
];
let progress=0,focus:Focus='both',playing=false,zoom=0,zoomed=false,lastPhase=-1;
let cancelPlay=()=>{},cancelZoom=()=>{};
createPainScene();
function render() {
  const state=painSequence(progress);
  drawPain(progress,focus);
  el<HTMLInputElement>('progress').value=String(Math.round(progress*100));
  el('progress-value').textContent=`${Math.round(progress*100)}%`;
  el<HTMLButtonElement>('pause').disabled=!playing;
  el('play').textContent=progress>=1?t('再看一次'):t('播放一次');
  if(lastPhase!==state.phase){
    lastPhase=state.phase;
    el('phase-count').textContent=`0${state.phase+1} / 05`;
    el('phase-title').textContent=phases[state.phase]![0]!;
    el('phase-text').textContent=phases[state.phase]![1]!;
  }
  document.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===focus)));
  document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.phase)));
}
function stop(){cancelPlay();playing=false;render();}
function seek(target:number,duration=650){cancelPlay();playing=false;cancelPlay=animateValue({from:progress,to:target,duration,onUpdate:value=>{progress=value;render();}});}
el('play').addEventListener('click',()=>{
  cancelPlay();if(progress>=1)progress=0;playing=true;
  cancelPlay=animateValue({from:progress,to:1,duration:8500*(1-progress),onUpdate:value=>{progress=value;render();},onComplete:()=>{playing=false;render();}});
});
el('pause').addEventListener('click',stop);
el('reset').addEventListener('click',()=>{cancelPlay();playing=false;progress=0;render();});
el<HTMLInputElement>('progress').addEventListener('input',()=>{cancelPlay();playing=false;progress=Number(el<HTMLInputElement>('progress').value)/100;render();});
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>seek(Number(b.dataset.stage))));
document.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(b=>b.addEventListener('click',()=>{focus=b.dataset.focus as Focus;render();}));
el('zoom').addEventListener('click',()=>{
  zoomed=!zoomed;cancelZoom();el('zoom').setAttribute('aria-pressed',String(zoomed));el('zoom').textContent=zoomed?t('回到完整路径'):t('放大皮肤末梢');
  cancelZoom=animateValue({from:zoom,to:zoomed?1:0,duration:700,onUpdate:value=>{zoom=value;document.querySelectorAll('#art [data-wide-label]').forEach(label=>label.setAttribute('opacity',String(Math.max(0,1-3*zoom))));el('pain-scene').setAttribute('viewBox',`${0} ${55*zoom} ${580-275*zoom} ${660-370*zoom}`);}});
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{cancelPlay();cancelZoom();playing=false;});
window.addEventListener('pageshow',render);
render();mountReadingMode('.advanced');
mountTopicNavigation('pain-signals');
