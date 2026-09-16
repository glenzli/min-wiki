import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { explorations } from './content.ts';
import { renderBlood } from './scene.ts';
import { redCell, defenceState, type BloodProcess } from './model.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('blood-cells');
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id)! as T;
const scene=document.querySelector<SVGSVGElement>('#scene')!;
const slider=el<HTMLInputElement>('progress');
let kind:BloodProcess='oxygen',progress=0,playing=false;
let zoom=0,cancelZoom:()=>void=()=>{};
let cancelPlay:()=>void=()=>{},cancelSwitch:()=>void=()=>{};
const current=()=>explorations.find(item=>item.id===kind)!;
const setText=(id:string,value:string)=>{if(el(id).textContent!==value)el(id).textContent=value;};
function phase(){return progress<.28?0:progress<.84?1:2;}
function draw(){
  const focus=kind==='oxygen'?{x:Math.max(300,Math.min(680,redCell(progress).x)),y:306,w:600}:kind==='defence'?{x:Math.max(300,Math.min(680,defenceState(progress).x)),y:Math.max(170,Math.min(380,defenceState(progress).y)),w:600}:{x:524,y:300,w:570};
  const width=980+(focus.w-980)*zoom,height=width*550/980;
  const cx=490+(focus.x-490)*zoom,cy=275+(focus.y-275)*zoom;
  scene.setAttribute('viewBox',`${cx-width/2} ${cy-height/2} ${width} ${height}`);
  scene.innerHTML=renderBlood(kind,progress,t);
  slider.value=String(Math.round(progress*1000));
  el('percent').textContent=`${Math.round(progress*100)}%`;
  const active=phase(),story=current().stages[active]!;
  setText('phase-title',story.title);setText('phase-body',story.body);
  document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b,i)=>b.setAttribute('aria-pressed',String(active===i)));
}
function stop(){cancelPlay();playing=false;el('play').textContent=t('慢慢演示');el('play').setAttribute('aria-pressed','false');}
function setup(){
  const info=current();setText('subject',info.subject);setText('observe',info.observe);
  const steps=el('steps');steps.replaceChildren();
  info.stages.forEach((item,index)=>{const button=document.createElement('button');button.type='button';button.dataset.step=String(index);button.textContent=item.title;
    button.addEventListener('click',()=>{stop();cancelSwitch();scene.style.opacity='1';const target=(kind==='defence'?[0,.36,1]:[0,.52,1])[index]!;cancelPlay=animateValue({from:progress,to:target,duration:1000,onUpdate:value=>{progress=value;draw();}});});steps.append(button);});
  document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.kind===kind)));
  draw();
}
document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(button=>button.addEventListener('click',()=>{
  const target=button.dataset.kind as BloodProcess;stop();cancelSwitch();scene.style.opacity='1';if(target===kind)return;
  let changed=false;
  cancelSwitch=animateValue({from:0,to:1,duration:320,onUpdate:value=>{if(value>=.5&&!changed){kind=target;progress=0;changed=true;setup();}scene.style.opacity=String(Math.abs(2*value-1));},onComplete:()=>{scene.style.opacity='1';}});
}));
el('play').addEventListener('click',()=>{
  if(playing){stop();return;}stop();cancelSwitch();scene.style.opacity='1';if(progress>=1)progress=0;
  playing=true;el('play').textContent=t('暂停');el('play').setAttribute('aria-pressed','true');
  cancelPlay=animateValue({from:progress,to:1,duration:6500*(1-progress),onUpdate:value=>{progress=value;draw();},onComplete:stop});
});
el('reset').addEventListener('click',()=>{stop();cancelSwitch();scene.style.opacity='1';progress=0;draw();});
slider.addEventListener('input',()=>{stop();cancelSwitch();scene.style.opacity='1';progress=Number(slider.value)/1000;draw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();cancelSwitch();scene.style.opacity='1';}});
window.addEventListener('pagehide',()=>{stop();cancelSwitch();});
el('zoom').addEventListener('click',()=>{
  cancelZoom();const target=el('zoom').getAttribute('aria-pressed')==='true'?0:1;
  el('zoom').setAttribute('aria-pressed',String(target===1));el('zoom').textContent=target?t('回到全景'):t('放大关键结构');
  cancelZoom=animateValue({from:zoom,to:target,duration:420,onUpdate:value=>{zoom=value;draw();}});
});
window.addEventListener('pagehide',()=>cancelZoom());
setup();mountReadingMode('details.science');
