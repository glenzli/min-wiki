import { mountPresentationFrame } from '../../src/platform/presentation.ts';
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
 [t('牙齿和唾液先来帮忙'),t('牙齿把食物嚼碎，唾液也来帮忙。'),t('咀嚼增加食物与消化液接触的面积；唾液中的淀粉酶开始分解一部分淀粉。图中上下颌的往复是慢放示意，不表示真实咀嚼频率。')],
 [t('食管把这一口向前送'),t('食管一段段收缩，把这一口送到胃。'),t('吞咽后，食管壁的肌肉在食团后方收缩、前方舒张，蠕动波推动食团。食物走食管，不走呼吸用的气管；这一段主要负责运输，不是吸收站。')],
 [t('胃把食物和胃液混合'),t('胃搅拌食物，再慢慢送往小肠。'),t('胃壁肌肉混合内容物；胃酸为胃蛋白酶发挥作用创造条件，蛋白质的消化在这里展开。胃将内容物逐渐送往小肠，不会一次吸走所有营养。')],
 [t('小肠继续分解，也接过营养'),t('小肠继续分解食物，营养穿过肠壁进入身体。'),t('胰酶和小肠酶继续分解可消化的大分子；胆盐帮助脂肪乳化，并形成携带脂质消化产物的胶束。胆汁本身不是酶。绒毛和微绒毛扩大吸收表面积；营养经过上皮细胞，再分别进入血液或淋巴。')],
 [t('大肠继续吸水，留下的形成便便'),t('大肠继续吸收水，剩下的形成便便。'),t('小肠已经吸收大部分水分。大肠继续吸收剩余水和电解质，微生物也参与处理残余内容物；粪便到直肠暂存，最后排出。画面里的水点数量不是实际吸水比例。')],
];
const detailNames=[t('口腔局部'),t('食管局部'),t('胃内局部'),t('推进与混合'),t('大肠局部')];
const detailCaptions=[t('牙齿咀嚼，唾液与食物混合。'),t('收缩从食团后方经过，推动它前行。'),t('胃壁搅拌，胃液与食物混合。'),t('小肠局部与绒毛是两种不同放大尺度。'),t('大肠继续吸收剩余水分，内容物向直肠移动。')];
function updateDetailHeading(){
 const intestinal=lastPhase===3;
 document.querySelector<HTMLElement>('.view-buttons')!.hidden=!intestinal;
 byId('detail-name').textContent=intestinal?(viewTarget?t('营养怎样穿过肠壁'):t('推进与混合')):detailNames[lastPhase];
 byId('detail-caption').textContent=intestinal?(viewTarget?t('营养先经过上皮细胞，再进入血管或淋巴管。'):detailCaptions[3]):detailCaptions[lastPhase];
}
function render(){
 const state=drawDigestion(progress,nutrient,fatFocus);
 progressInput.value=String(progress*100);byId('progress-value').textContent=`${Math.round(progress*100)}%`;
 progressInput.setAttribute('aria-valuetext',t('进度 {{value}}%',{value:Math.round(progress*100)}));
 byId<HTMLButtonElement>('play').disabled=playing;byId<HTMLButtonElement>('pause').disabled=!playing;
 if(state.phase!==lastPhase){lastPhase=state.phase;byId('phase-count').textContent=`0${state.phase+1} / 05`;byId('phase-title').textContent=phases[state.phase][0];byId('phase-text-child').textContent=phases[state.phase][1];byId('phase-text').textContent=phases[state.phase][2];updateDetailHeading();}
 camera();
}
function routeNote(){byId('route-title').textContent=nutrient==='sugar'?t('葡萄糖经过细胞，进入血液'):t('脂肪产物先进入细胞，再被包装');byId('route-text').textContent=nutrient==='sugar'?t('金色小点先经过上皮，再到红色毛细血管。葡萄糖的转运由膜上的蛋白参与，并不是整块食物从缝隙漏过去。'):t('多数膳食长链脂肪经消化、吸收后，在细胞里重新包装成乳糜微粒，进入绿色淋巴管，后来才汇入血液。');byId('route-summary-child').textContent=nutrient==='sugar'?t('看金色小点进入红色血管。'):t('看脂肪产物进入绿色淋巴管。');}
function camera(){document.getElementById('villus-reveal')!.setAttribute('width',String(600*view));const divider=document.getElementById('reveal-divider')!;divider.setAttribute('x1',String(600*view));divider.setAttribute('x2',String(600*view));divider.setAttribute('opacity',view>.01&&view<.99?'0.7':'0');document.getElementById('tube-panel')!.setAttribute('aria-hidden',String(lastPhase!==3||view>=.5));document.getElementById('villus-panel')!.setAttribute('aria-hidden',String(lastPhase!==3||view<.5));document.getElementById('body-scene')!.setAttribute('viewBox',`${140*bodyZoom} ${180*bodyZoom} ${700-240*bodyZoom} ${640-219.4*bodyZoom}`);}
function stop(){cancelPlay();playing=false;render();}
function seek(to:number,duration=650){stop();cancelPlay=animateValue({from:progress,to,duration,onUpdate:v=>{progress=v;render();}});}
byId('play').addEventListener('click',()=>{stop();if(progress>=.999)progress=0;playing=true;cancelPlay=animateValue({from:progress,to:1,duration:16000*(1-progress),onUpdate:v=>{progress=v;render();},onComplete:()=>{playing=false;render();}});});
byId('pause').addEventListener('click',stop);byId('reset').addEventListener('click',()=>seek(0));
progressInput.addEventListener('input',()=>{const next=Number(progressInput.value)/100;stop();progress=next;render();});
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>seek(Number(b.dataset.stage))));
document.querySelectorAll<HTMLButtonElement>('[data-nutrient]').forEach(b=>b.addEventListener('click',()=>{cancelNutrient();nutrient=b.dataset.nutrient as Nutrient;document.querySelectorAll<HTMLButtonElement>('[data-nutrient]').forEach(other=>other.setAttribute('aria-pressed',String(b===other)));routeNote();cancelNutrient=animateValue({from:fatFocus,to:nutrient==='fat'?1:0,duration:600,onUpdate:v=>{fatFocus=v;render();}});}));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>{cancelView();viewTarget=Number(b.dataset.view);document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(other=>other.setAttribute('aria-pressed',String(b===other)));updateDetailHeading();cancelView=animateValue({from:view,to:viewTarget,duration:850,onUpdate:v=>{view=v;camera();}});}));
byId('body-zoom').addEventListener('click',()=>{cancelBody();bodyTarget=1-bodyTarget;byId('body-zoom').setAttribute('aria-pressed',String(Boolean(bodyTarget)));cancelBody=animateValue({from:bodyZoom,to:bodyTarget,duration:800,onUpdate:v=>{bodyZoom=v;camera();}});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{stop();cancelNutrient();cancelView();cancelBody();view=viewTarget;bodyZoom=bodyTarget;fatFocus=nutrient==='fat'?1:0;camera();render();});
window.addEventListener('pageshow',()=>{camera();render();});
routeNote();render();camera();mountReadingMode('.advanced');mountTopicNavigation('digestion');

mountPresentationFrame({"root": ".lab", "visual": ".specimen-pair", "transport": ".play-controls", "paired": true});
