import { animateValue } from '../../src/visuals/transition.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CONTENT } from './content.ts';
import { SCIENCE } from './science.ts';
import { TopicScene, type SceneView, type CameraView } from './scene.ts';
import { coriolis, readout, advance, type Settings } from './model.ts';
import type { StormStructure } from './cloudField.ts';
import './style.css';
translateDocument(t);mountTopicNavigation('typhoon');
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const value=(id:string)=>el<HTMLInputElement|HTMLSelectElement>(id).value;
const number=(id:string)=>Number(value(id));
const text=(id:string,next:string)=>{if(el(id).textContent!==next)el(id).textContent=next;};
const settings=():Settings=>({temperature:number('temperature'),shear:number('shear'),hemisphere:value('hemisphere') as Settings['hemisphere']});
let progress=1,circulation=0,playing=false,academic=false,frame=0,last=0,replacement=.48,replacing=false,feature='none';
let visualSettings=settings(),cancelSeek=()=>{},cancelConditions=()=>{};
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let scene:TopicScene|undefined;
try{scene=new TopicScene(el<HTMLCanvasElement>('scene'));}catch(error){el('scene-error').hidden=false;console.error(error);}
const positions=[0,.28,.58,1];
const structure=()=>value('structure') as StormStructure;
function draw(){
  scene?.draw({progress,circulation,settings:visualSettings,view:value('view') as SceneView,structure:structure(),replacement,feature});
}
function update(){
  const current=settings(),result=readout(progress,current),stage=result.stage,science=SCIENCE[stage],limited=result.limited&&progress>.45;
  text('scene-title',limited?t('条件不足，云团尚未组织好'):progress>=1?t('三维云系结构'):CONTENT.steps[stage]);
  text('story-title',academic?science.title:CONTENT.steps[stage]);
  text('story',academic?science.body+(limited?' '+CONTENT.blockedAcademic:''):limited?CONTENT.blocked:CONTENT.stories[stage]);
  text('scene-note',t('三维教学云系 · 可拖动旋转 · 高度与时间经过夸张，不是卫星实况'));
  text('metric',result.value==='favorable'?t('较有利'):t('不利于组织'));text('metric-label',CONTENT.metricLabel);
  text('prompt',CONTENT.prompt);text('explanation',CONTENT.explanation);text('limits',CONTENT.limits);
  text('play',playing?t('暂停观察'):t('持续观察'));el('play').setAttribute('aria-pressed',String(playing));
  el<HTMLInputElement>('progress').value=String(Math.round(progress*1000));el('progress').setAttribute('aria-valuetext',CONTENT.steps[stage]);
  text('elapsed',progress>=1?(limited?t('条件对照'):t('成熟阶段'))+` · ${Math.floor(circulation)} s`:t('形成进度 {{percent}}%',{percent:Math.round(progress*100)}));
  text('playback-status',playing?(replacing?t('正在演示眼墙置换；到达终点后保留新结构'):progress<1?t('正在形成；到达终点后继续观察环流'):limited?t('继续观察当前条件下的云系'):t('结构保持，云与气流继续运动')):t('画面已暂停；拖动仍可换角度'));
  el('steps').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(stage===i)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='academic')===academic)));
  text('temperature-value',value('temperature')+' °C');text('shear-value',value('shear')+' m/s');
  const latitude=current.hemisphere==='north'?15:current.hemisphere==='south'?-15:0;
  text('science-live',t('纬度：{{latitude}}°；f = {{f}} s⁻¹\n海温：{{temperature}}°C；垂直风差：{{shear}} m/s\n这些条件不是气旋发生概率',{latitude,f:coriolis(latitude).toExponential(2),temperature:current.temperature,shear:current.shear}));
  el('science-panel').hidden=!academic;text('science-formula',science.formula);text('science-terms',science.terms);text('science-caution',science.caution);text('observe',science.watch);
  el('replacement-panel').hidden=structure()!=='replacement';el<HTMLInputElement>('replacement').value=String(Math.round(replacement*1000));
  text('replacement-phase',replacement<.28?t('外围雨带组织成外眼墙'):replacement<.58?t('内外眼墙与中间少云区'):replacement<.82?t('内眼墙衰减，外眼墙接替'):t('外眼墙收缩，成为新的眼墙'));
  const selected=CONTENT.structures[structure()];
  text('structure-note',limited?CONTENT.blocked:selected.watch);
  if(progress>=1&&!academic&&!limited){text('story-title',selected.title);text('story',selected.body);text('observe',selected.watch);}
  el('flow-key').hidden=value('view')==='natural';
  const details={none:t('先观察完整云系，再选择下方部位；标注始终留在画面外。'),eye:t('眼：中心的下沉空气增温、变干，云较难维持；近海面风通常比眼墙弱。眼区仍可能有低云，并非真空。'),wall:t('眼墙：围绕眼的深厚雷暴，空气强烈上升、凝结放热，常有最强风雨。斜视或剖面可以看到它的高度。'),bands:t('外围雨带：不均匀的螺旋状对流与降雨区，云间留有空隙；高空外流与近海面向内汇流方向不同。')};
  text('feature-description',details[feature as keyof typeof details]);draw();
}
function stop(cancelReplacement=true){cancelSeek();playing=false;if(cancelReplacement)replacing=false;cancelAnimationFrame(frame);frame=0;}
function tick(now:number){
  frame=0;if(!playing||document.hidden)return;
  if(now-last<1000/30){frame=requestAnimationFrame(tick);return;}
  const dt=Math.min(.12,(now-last)/1000);last=now;
  const state=advance({formation:progress,circulation,playing},dt,number('rate'));progress=state.formation;circulation=state.circulation;
  if(replacing){replacement=Math.min(1,replacement+dt*number('rate')/34);if(replacement===1)replacing=false;}
  update();if(playing)frame=requestAnimationFrame(tick);
}
function start(){playing=true;last=performance.now();if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
function seek(target:number,resume=false){stop();cancelSeek=animateValue({from:progress,to:target,duration:1000,onUpdate:p=>{progress=p;update();},onComplete:()=>{if(resume&&!reduced.matches)start();update();}});}
el('scene').addEventListener('pointerdown',()=>document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed','false')));
el('play').addEventListener('click',()=>{if(playing)stop(false);else{cancelSeek();start();}update();});
el('formation').addEventListener('click',()=>{stop();el<HTMLSelectElement>('structure').value='eye';progress=0;circulation=0;if(!reduced.matches)start();update();});
el('mature').addEventListener('click',()=>seek(1,true));
el('reset').addEventListener('click',()=>{stop();progress=1;circulation=0;replacement=.48;update();});
el('progress').addEventListener('input',()=>{stop();progress=number('progress')/1000;update();});
el('view').addEventListener('change',()=>{if(value('view')==='section'){scene?.setCamera('side');document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera==='side')));}update();});
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(b=>b.addEventListener('click',()=>{scene?.setCamera(b.dataset.camera as CameraView);document.querySelectorAll('[data-camera]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
document.querySelectorAll<HTMLButtonElement>('[data-feature]').forEach(b=>b.addEventListener('click',()=>{feature=feature===b.dataset.feature?'none':b.dataset.feature!;document.querySelectorAll<HTMLButtonElement>('[data-feature]').forEach(x=>x.setAttribute('aria-pressed',String(feature===x.dataset.feature)));update();}));
el('structure').addEventListener('change',()=>{if(structure()==='replacement')replacement=.48;seek(1,false);});
el('replacement').addEventListener('input',()=>{stop();replacement=number('replacement')/1000;update();});
el('play-replacement').addEventListener('click',()=>{stop();progress=1;replacement=0;if(!reduced.matches){replacing=true;start();}update();});
for(const id of ['temperature','shear','hemisphere'])el(id).addEventListener('input',()=>{cancelConditions();const from={...visualSettings},to=settings();cancelConditions=animateValue({from:0,to:1,duration:850,onUpdate:p=>{visualSettings={temperature:from.temperature+(to.temperature-from.temperature)*p,shear:from.shear+(to.shear-from.shear)*p,hemisphere:p<.5?from.hemisphere:to.hemisphere};update();}});});
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]'))b.addEventListener('click',()=>{academic=b.dataset.mode==='academic';update();});
el('steps').replaceChildren(...CONTENT.steps.map((label,i)=>{const b=document.createElement('button');b.textContent=label;b.addEventListener('click',()=>seek(positions[i],i===3));return b;}));
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!(e.target as HTMLElement)?.closest('button,input,select,a,textarea,[contenteditable]')){e.preventDefault();el('play').click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelSeek();cancelAnimationFrame(frame);frame=0;}else if(playing){last=performance.now();frame=requestAnimationFrame(tick);}});
reduced.addEventListener('change',()=>{if(reduced.matches){stop();update();}});
window.addEventListener('pagehide',e=>{cancelSeek();cancelConditions();cancelAnimationFrame(frame);frame=0;if(!e.persisted){stop();scene?.dispose();}});
window.addEventListener('pageshow',()=>{if(playing&&!frame){last=performance.now();frame=requestAnimationFrame(tick);}update();});
update();
