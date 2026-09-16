import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { stages, stories } from './content.ts';
import { stageStops } from './model.ts';
import { draw } from './scene.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('rain-cycle');
const el=(id:string)=>document.getElementById(id)!;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let progress=0,condition=0,frame=0,playing=false;
let cancelSeek=()=>{},cancelCondition=()=>{};
function stop(){cancelSeek();cancelAnimationFrame(frame);frame=0;playing=false;}
function goTo(target:number){
  stop();
  cancelSeek=animateValue({from:progress,to:target,duration:1100,onUpdate:value=>{progress=value;update();}});
}
function update(){
  const stage=Math.min(3,Math.floor(progress*4));
  if(el('story-title').textContent!==stages[stage]){el('story-title').textContent=stages[stage];el('story').textContent=stories[stage];}
  (el('progress') as HTMLInputElement).value=String(Math.round(progress*1000));
  el('progress').setAttribute('aria-valuetext',`${Math.round(progress*100)}% · ${stages[stage]}`);
  el('stages').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(stage===i)));
  (el('next') as HTMLButtonElement).disabled=stage===3;
  el('play').textContent=playing?t('停下来看看'):progress>=1?t('再走一圈'):t('慢慢走完一圈');
  el('play').setAttribute('aria-pressed',String(playing));
  const result=draw(progress,condition);
  el('scene').innerHTML=result.scene;
  el('metrics').replaceChildren(...result.labels.map(label=>{const span=document.createElement('span');span.textContent=label;return span;}));
}
el('stages').replaceChildren(...stages.map((label,i)=>{
  const b=document.createElement('button');b.textContent=label;b.dataset.number=String(i+1);
  b.addEventListener('click',()=>goTo(stageStops[i]!));return b;
}));
el('progress').addEventListener('input',()=>{stop();progress=Number((el('progress') as HTMLInputElement).value)/1000;update();});
el('condition').addEventListener('change',()=>{
  cancelCondition();
  cancelCondition=animateValue({from:condition,to:Number((el('condition') as HTMLSelectElement).value),duration:650,onUpdate:value=>{condition=value;update();}});
});
el('next').addEventListener('click',()=>goTo(stageStops[Math.min(3,Math.floor(progress*4)+1)]!));
el('reset').addEventListener('click',()=>{
  cancelCondition();condition=0;(el('condition') as HTMLSelectElement).value='0';goTo(0);
});
el('play').addEventListener('click',()=>{
  if(playing){stop();update();return;}
  stop();if(progress>=1)progress=0;
  // Reduced-motion readers retain all endpoints via the slider and stage buttons.
  if(reducedMotion.matches){progress=1;update();return;}
  playing=true;let previous=performance.now();
  const tick=(now:number)=>{
    progress=Math.min(1,progress+Math.min(100,now-previous)/18000);previous=now;
    if(progress>=1)playing=false;
    update();if(playing)frame=requestAnimationFrame(tick);else frame=0;
  };
  update();frame=requestAnimationFrame(tick);
});
function suspend(){stop();cancelCondition();update();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
window.addEventListener('pagehide',suspend);
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)suspend();});
update();
mountReadingMode('details:not(.references)');
