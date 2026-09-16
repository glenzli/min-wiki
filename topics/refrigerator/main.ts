import './style.css';
import {translateDocument} from '../../src/platform/i18n.ts';
import {mountTopicNavigation} from '../../src/platform/topicNavigation.ts';
import {mountReadingMode} from '../../src/platform/readingMode.ts';
import {animateValue} from '../../src/visuals/transition.ts';
import {t} from './i18n.ts';
import {makeTimeline,sampleTimeline,refrigerantState,type DoorPlan} from './model.ts';
import {drawScene,drawGraph} from './scene.ts';
translateDocument(t);
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const timelines={closed:makeTimeline('closed'),visit:makeTimeline('visit')};
let plan:DoorPlan='closed',progress=0,view=0,targetView=0,parcel=0,playing=false,cyclePlaying=false;
let cancelView=()=>{},cancelProgress=()=>{},cancelCycle=()=>{};
const cycleTitles=[t('1 · 在箱内吸收热量'),t('2 · 压缩机需要电功'),t('3 · 到箱外放出热量'),t('4 · 降压，再回到箱内')];
const cycleStories=[t('冷媒在低压管内吸热，液体逐渐变成蒸气。管壁把食物所在的空间与冷媒隔开。'),t('压缩机吸入蒸气、提高压力，也让它变热。这一步需要电能；不是把热凭空消掉。'),t('较热的冷媒向室内放热，逐渐凝结成液体。房间收到搬来的热，也收到电功最终变成的热。'),t('冷媒穿过细管降压，部分液体变成蒸气，形成较冷的混合物。它沿密闭管路回来，继续吸热。')];
function render(){
 const state=sampleTimeline(timelines[plan],progress),inspect=targetView===2;
 el('fridge-scene').innerHTML=drawScene({thermal:state,view,parcel,inspect:view>1});
 el('temperature-graph').innerHTML=drawGraph(timelines[plan],timelines.closed,progress,plan==='visit');
 el('air-value').textContent=`${state.air.toFixed(1)} °C`;el('food-value').textContent=`${state.food.toFixed(1)} °C`;
 el('motor-value').textContent=state.on?t('正在工作'):t('暂时停下');
 el<HTMLInputElement>('progress').value=String(Math.round(progress*1000));el('progress-value').textContent=`${Math.round(progress*100)}%`;
 el<HTMLInputElement>('cycle-progress').value=String(Math.round(parcel*1000));el('cycle-value').textContent=`${Math.round(parcel*100)}%`;
 el('play').textContent=progress>=1?t('重新观察'):t('慢慢观察');el<HTMLButtonElement>('pause').disabled=!playing;el<HTMLButtonElement>('cycle-pause').disabled=!cyclePlaying;
 el('reference-legend').hidden=plan!=='visit';el('cycle-study').hidden=!inspect;el('thermal-study').hidden=inspect;
 const status=state.door>.1?t('门开了：较暖的空气进入，热负荷增加。食物温度变化得更慢。'):plan==='visit'&&progress>.57?t('门又关好了：外来的热减少，食物逐渐重新变凉。'):state.on?t('热正在被搬走。空气先变凉，食物内部需要更久。'):t('温度已经较低，压缩机暂时停下；温度回升后还会启动。');
 if(el('status').textContent!==status)el('status').textContent=status;
 const note=targetView===0?t('这是同一台冰箱。箱门关闭时，食物仍在里面慢慢变凉。'):targetView===1?t('透视图移开了外壳，不等于把真实冰箱门打开；门的情景仍由下方实验决定。'):t('同一条密闭管路被显露出来。金色圆框留在管内，不进入食物。');el('view-note').textContent=note;
 const stage=refrigerantState(parcel).stage;el('cycle-title').textContent=cycleTitles[stage]!;el('cycle-story').textContent=cycleStories[stage]!;
 el('energy-balance').textContent=t('模型累计：箱内搬出的热 {{cold}} kJ + 输入电功 {{work}} kJ = 散到房间的热 {{warm}} kJ。',{cold:(state.removed/1000).toFixed(1),work:(state.work/1000).toFixed(1),warm:(state.roomGain/1000).toFixed(1)});
}
function stop(){cancelProgress();playing=false;}
function stopCycle(){cancelCycle();cyclePlaying=false;}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-view]'))button.addEventListener('click',()=>{
 targetView=Number(button.dataset.view);if(targetView===2)stop();else stopCycle();
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 cancelView();cancelView=animateValue({from:view,to:targetView,duration:1050,onUpdate:v=>{view=v;render();}});
});
el('plan').addEventListener('change',()=>{stop();plan=el<HTMLSelectElement>('plan').value as DoorPlan;progress=0;render();});
el('progress').addEventListener('input',()=>{stop();progress=Number(el<HTMLInputElement>('progress').value)/1000;render();});
el('play').addEventListener('click',()=>{stopCycle();stop();if(progress>=1)progress=0;playing=true;cancelProgress=animateValue({from:progress,to:1,duration:22000*(1-progress),onUpdate:v=>{progress=v;render();},onComplete:()=>{playing=false;render();}});});
el('pause').addEventListener('click',()=>{stop();render();});el('reset').addEventListener('click',()=>{stop();progress=0;render();});
el('cycle-progress').addEventListener('input',()=>{stopCycle();parcel=Number(el<HTMLInputElement>('cycle-progress').value)/1000;render();});
el('cycle-play').addEventListener('click',()=>{stop();stopCycle();if(parcel>=1)parcel=0;cyclePlaying=true;cancelCycle=animateValue({from:parcel,to:1,duration:10000*(1-parcel),onUpdate:v=>{parcel=v;render();},onComplete:()=>{cyclePlaying=false;render();}});});
el('cycle-pause').addEventListener('click',()=>{stopCycle();render();});
function stopAll(){stop();stopCycle();cancelView();}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAll();render();}});window.addEventListener('pagehide',stopAll);
render();mountTopicNavigation('refrigerator');mountReadingMode('details.advanced');
