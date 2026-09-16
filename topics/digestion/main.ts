import './style.css';
import { t } from './i18n.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { createDigestionScene, drawDigestion } from './scene.ts';
import type { Nutrient } from './model.ts';
translateDocument(t);createDigestionScene();
const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id)! as T;
const progressInput=byId<HTMLInputElement>('progress');
let progress=0,nutrient:Nutrient='sugar',fatFocus=0,playing=false,view=0,viewTarget=0,bodyZoom=0,bodyTarget=0,lastPhase=-1;
let cancelPlay=()=>{},cancelNutrient=()=>{},cancelView=()=>{},cancelBody=()=>{};
const phases=[
 [t('牙齿和唾液先来帮忙'),t('食物在口中被咀嚼、与唾液混合；一些淀粉的化学分解已经开始。')],
 [t('食管把这一口向前送'),t('吞咽后，一段接一段的肌肉收缩推动食团到胃。食物走食管，不走呼吸用的气管。')],
 [t('胃把食物和胃液混合'),t('胃不是把所有营养一次吸走。它混合内容物，与酸和酶一起处理，再逐渐送往小肠。')],
 [t('小肠继续分解，也接过营养'),t('胆汁和胰液帮助消化。内容物中的营养经过肠壁细胞，再进入血液或淋巴；放大绒毛看得更清楚。')],
 [t('大肠继续吸水，留下的形成便便'),t('小肠已吸收大部分水分。大肠继续吸收剩余的水和电解质，粪便进入直肠暂存，最后通过肛门排出。')],
];
function render(){
 const state=drawDigestion(progress,nutrient,fatFocus);
 progressInput.value=String(progress*100);byId('progress-value').textContent=`${Math.round(progress*100)}%`;
 progressInput.setAttribute('aria-valuetext',t('进度 {{value}}%',{value:Math.round(progress*100)}));
 byId<HTMLButtonElement>('play').disabled=playing;byId<HTMLButtonElement>('pause').disabled=!playing;
 if(state.phase!==lastPhase){lastPhase=state.phase;byId('phase-count').textContent=`0${state.phase+1} / 05`;byId('phase-title').textContent=phases[state.phase][0];byId('phase-text').textContent=phases[state.phase][1];}
}
function routeNote(){byId('route-title').textContent=nutrient==='sugar'?t('葡萄糖经过细胞，进入血液'):t('脂肪产物先进入细胞，再被包装');byId('route-text').textContent=nutrient==='sugar'?t('金色小点先经过上皮，再到红色毛细血管。葡萄糖的转运由膜上的蛋白参与，并不是整块食物从缝隙漏过去。'):t('多数膳食长链脂肪经消化、吸收后，在细胞里重新包装成乳糜微粒，进入绿色淋巴管，后来才汇入血液。');}
function camera(){document.getElementById('detail-scene')!.setAttribute('viewBox',`0 ${view*520} 600 470`);document.getElementById('body-scene')!.setAttribute('viewBox',`${140*bodyZoom} ${180*bodyZoom} ${700-240*bodyZoom} ${640-219.4*bodyZoom}`);}
function stop(){cancelPlay();playing=false;render();}
function seek(to:number,duration=650){stop();cancelPlay=animateValue({from:progress,to,duration,onUpdate:v=>{progress=v;render();}});}
byId('play').addEventListener('click',()=>{stop();if(progress>=.999)progress=0;playing=true;cancelPlay=animateValue({from:progress,to:1,duration:16000*(1-progress),onUpdate:v=>{progress=v;render();},onComplete:()=>{playing=false;render();}});});
byId('pause').addEventListener('click',stop);byId('reset').addEventListener('click',()=>seek(0));
progressInput.addEventListener('input',()=>{const next=Number(progressInput.value)/100;stop();progress=next;render();});
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>seek(Number(b.dataset.stage))));
document.querySelectorAll<HTMLButtonElement>('[data-nutrient]').forEach(b=>b.addEventListener('click',()=>{cancelNutrient();nutrient=b.dataset.nutrient as Nutrient;document.querySelectorAll<HTMLButtonElement>('[data-nutrient]').forEach(other=>other.setAttribute('aria-pressed',String(b===other)));routeNote();cancelNutrient=animateValue({from:fatFocus,to:nutrient==='fat'?1:0,duration:600,onUpdate:v=>{fatFocus=v;render();}});}));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>{cancelView();viewTarget=Number(b.dataset.view);document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(other=>other.setAttribute('aria-pressed',String(b===other)));byId('detail-name').textContent=viewTarget?t('营养怎样穿过肠壁'):t('推进与混合');byId('detail-caption').textContent=viewTarget?t('金色营养先经过上皮，再进入血管或淋巴管；蓝色水点也穿过上皮进入血液。小肠吸收大部分水，这里放大同一吸收阶段。'):t('先选“小肠分解”，看管壁怎样在内容物后面收缩。这里把推进和混合简化在同一个慢镜头里。');cancelView=animateValue({from:view,to:viewTarget,duration:850,onUpdate:v=>{view=v;camera();}});}));
byId('body-zoom').addEventListener('click',()=>{cancelBody();bodyTarget=1-bodyTarget;byId('body-zoom').setAttribute('aria-pressed',String(Boolean(bodyTarget)));cancelBody=animateValue({from:bodyZoom,to:bodyTarget,duration:800,onUpdate:v=>{bodyZoom=v;camera();}});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{stop();cancelNutrient();cancelView();cancelBody();view=viewTarget;bodyZoom=bodyTarget;fatFocus=nutrient==='fat'?1:0;camera();render();});
window.addEventListener('pageshow',()=>{camera();render();});
routeNote();render();camera();mountReadingMode('.advanced');mountTopicNavigation('digestion');
