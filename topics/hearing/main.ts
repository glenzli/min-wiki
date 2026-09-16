import './style.css';
import { t } from './i18n.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { createHearingScene, drawHearing } from './scene.ts';
translateDocument(t);createHearingScene();
const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id)! as T;
const progressInput=byId<HTMLInputElement>('progress'),strengthInput=byId<HTMLInputElement>('strength');
let progress=0,pitch=0,strength=.55,playing=false,view=0,viewTarget=0,earZoom=0,earTarget=0,lastPhase=-1;
let cancelPlay=()=>{},cancelPitch=()=>{},cancelView=()=>{},cancelEar=()=>{};
const phases=[
 [t('空气把振动带到鼓膜'),t('空气在声波中来回振动；不是一串空气小球一路飞到脑。先找耳道尽头那层薄膜。')],
 [t('听小骨把振动接下去'),t('鼓膜轻轻动，三个相连的小骨头也传动，镫骨把振动交给耳蜗里的液体。')],
 [t('耳蜗里的膜和细胞回应'),t('展开耳蜗，比较较高音和较低音的响应位置；再看感觉细胞顶端的纤毛束怎样偏转。')],
 [t('神经把消息传向脑'),t('感觉细胞将机械变化转为电反应，再影响听神经。脑还会经过许多步骤加工这些消息。')],
];
function render(){
 const state=drawHearing(progress,pitch,strength);
 progressInput.value=String(progress*100);byId('progress-value').textContent=`${Math.round(progress*100)}%`;
 progressInput.setAttribute('aria-valuetext',t('进度 {{value}}%',{value:Math.round(progress*100)}));
 byId('strength-value').textContent=`${Math.round(strength*100)}%`;
 strengthInput.setAttribute('aria-valuetext',t('示意振幅 {{value}}%',{value:Math.round(strength*100)}));
 byId<HTMLButtonElement>('play').disabled=playing;byId<HTMLButtonElement>('pause').disabled=!playing;
 if(state.phase!==lastPhase){lastPhase=state.phase;byId('phase-count').textContent=`0${state.phase+1} / 04`;byId('phase-title').textContent=phases[state.phase][0];byId('phase-text').textContent=phases[state.phase][1];}
}
function camera(){
 document.getElementById('detail-scene')!.setAttribute('viewBox',`0 ${view*510} 600 460`);
 document.getElementById('ear-scene')!.setAttribute('viewBox',`${270*earZoom} ${93*earZoom} ${720-290*earZoom} ${470-189.3*earZoom}`);
}
function stop(){cancelPlay();playing=false;render();}
function seek(to:number,duration=600){stop();cancelPlay=animateValue({from:progress,to,duration,onUpdate:v=>{progress=v;render();}});}
byId('play').addEventListener('click',()=>{stop();if(progress>=.999)progress=0;playing=true;cancelPlay=animateValue({from:progress,to:1,duration:11000*(1-progress),onUpdate:v=>{progress=v;render();},onComplete:()=>{playing=false;render();}});});
byId('pause').addEventListener('click',stop);byId('reset').addEventListener('click',()=>seek(0));
progressInput.addEventListener('input',()=>{const next=Number(progressInput.value)/100;stop();progress=next;render();});
strengthInput.addEventListener('input',()=>{strength=Number(strengthInput.value)/100;render();});
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>seek(Number(b.dataset.stage))));
document.querySelectorAll<HTMLButtonElement>('[data-pitch]').forEach(b=>b.addEventListener('click',()=>{cancelPitch();document.querySelectorAll<HTMLButtonElement>('[data-pitch]').forEach(other=>other.setAttribute('aria-pressed',String(b===other)));cancelPitch=animateValue({from:pitch,to:Number(b.dataset.pitch),duration:650,onUpdate:v=>{pitch=v;render();}});}));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>{cancelView();viewTarget=Number(b.dataset.view);document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(other=>other.setAttribute('aria-pressed',String(b===other)));byId('detail-name').textContent=viewTarget?t('毛细胞的放大原理'):t('耳蜗里的不同位置');byId('detail-caption').textContent=viewTarget?t('这是一个内毛细胞的原理放大。液体运动使纤毛束偏转，影响离子通道与神经连接；不是一撮汗毛，也不是声波直接钻进神经。'):t('金色淡影标出较强响应的位置。基底膜实际卷在耳蜗里；这里展开比较，波形幅度被夸大。');cancelView=animateValue({from:view,to:viewTarget,duration:850,onUpdate:v=>{view=v;camera();}});}));
byId('ear-zoom').addEventListener('click',()=>{cancelEar();earTarget=1-earTarget;byId('ear-zoom').setAttribute('aria-pressed',String(Boolean(earTarget)));cancelEar=animateValue({from:earZoom,to:earTarget,duration:800,onUpdate:v=>{earZoom=v;camera();}});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{stop();cancelPitch();cancelView();cancelEar();view=viewTarget;earZoom=earTarget;camera();});
window.addEventListener('pageshow',()=>{camera();render();});
render();camera();mountReadingMode('.advanced');mountTopicNavigation('hearing');
