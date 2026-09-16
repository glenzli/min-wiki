import './style.css';
import { t } from './i18n.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { createBatteryScene,drawBattery } from './scene.ts';
import { advanceDischarge } from './model.ts';
translateDocument(t);createBatteryScene();
const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id)! as T;
const progressInput=byId<HTMLInputElement>('progress');
let used=0,closed=false,switchPosition=0,switchTarget=0,playing=false,coast=0,view=0,viewTarget=0,zoom=0,zoomTarget=0,lastStatus='';
let cancelPlay=()=>{},cancelSwitch=()=>{},cancelCoast=()=>{},cancelView=()=>{},cancelZoom=()=>{};
function render(){
 const s=drawBattery(used,closed,switchPosition,coast);
 progressInput.value=String(used*100);progressInput.disabled=!closed;
 progressInput.setAttribute('aria-valuetext',t('已观察 {{value}}% 的放电过程',{value:Math.round(used*100)}));
 byId('progress-value').textContent=`${Math.round(used*100)}%`;
 byId<HTMLButtonElement>('play').disabled=!closed||playing||used>=1;
 byId<HTMLButtonElement>('pause').disabled=!playing;
 byId('switch').textContent=switchTarget?t('断开开关'):t('合上开关');byId('switch').setAttribute('aria-pressed',String(Boolean(switchTarget)));
 byId('energy-remaining').style.width=`${s.remaining*100}%`;byId('energy-work').style.width=`${s.work*100}%`;byId('energy-heat').style.width=`${s.heat*100}%`;
 const key=used>=1?'empty':!closed?(switchTarget?'closing':'open'):playing?'running':'paused';
 if(key!==lastStatus){lastStatus=key;
 const messages=key==='empty'?[t('本次示例已用完'),t('材料的化学状态已经改变'),t('示例不再持续供电，电子并没有凭空消失。重置屏幕可以重新观察；真实一次电池不能这样恢复。')]:key==='closing'?[t('正在合上'),t('等两边真正接上'),t('金属开关片还在靠近。接触完成以后，回路才闭合。')]:key==='open'?[t('回路断开'),t('缺口还在，不能持续供电'),t('电池还有化学能，但这条外电路没有接通。先合上开关，再运行或拖动进度。')]:key==='running'?[t('回路闭合'),t('外电路与电芯内部一起工作'),t('外面的电子和里面的离子分别移动，化学能转为电能，再带动马达。可以随时暂停或打开开关。')]:[t('回路闭合'),t('画面已暂停，回路仍接通'),t('暂停只是把观察时间停住。点“运行一次”或拖动进度，继续看电荷输运和转动。')];
 byId('circuit-state').textContent=messages[0];byId('status-title').textContent=messages[1];byId('status-text').textContent=messages[2];}
}
function camera(){document.getElementById('detail-scene')!.setAttribute('viewBox',`0 ${view*510} 600 480`);document.getElementById('circuit-scene')!.setAttribute('viewBox',`${170*zoom} ${55*zoom} ${720-310*zoom} ${500-215.3*zoom}`);}
function stop(){cancelPlay();playing=false;render();}
byId('switch').addEventListener('click',()=>{
 const wasMoving=playing;stop();cancelSwitch();cancelCoast();switchTarget=1-switchTarget;
 if(!switchTarget){closed=false;if(wasMoving)cancelCoast=animateValue({from:coast,to:coast+26,duration:620,onUpdate:v=>{coast=v;render();}});}
 cancelSwitch=animateValue({from:switchPosition,to:switchTarget,duration:450,onUpdate:v=>{switchPosition=v;render();},onComplete:()=>{closed=Boolean(switchTarget);render();}});
});
byId('play').addEventListener('click',()=>{if(!closed||used>=1)return;stop();cancelCoast();playing=true;cancelPlay=animateValue({from:used,to:1,duration:12500*(1-used),onUpdate:v=>{used=advanceDischarge(used,v,closed);render();},onComplete:()=>{playing=false;render();}});});
byId('pause').addEventListener('click',stop);
progressInput.addEventListener('input',()=>{const next=Number(progressInput.value)/100;stop();cancelCoast();used=advanceDischarge(used,next,closed);render();});
byId('reset').addEventListener('click',()=>{stop();cancelSwitch();cancelCoast();used=0;closed=false;switchPosition=0;switchTarget=0;coast=0;render();});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>{cancelView();viewTarget=Number(b.dataset.view);document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));byId('detail-name').textContent=viewTarget?t('马达里的磁力与线圈'):t('电池里的两种通路');byId('detail-caption').textContent=viewTarget?t('固定磁体与通电线圈相互作用，带动转轴。换向结构和真实传动细节只做简化示意。'):t('金色带加号的点代表锂离子。隔膜帮助隔开两极，同时允许离子通行；它不是让电子直接穿过电池的捷径。');cancelView=animateValue({from:view,to:viewTarget,duration:850,onUpdate:v=>{view=v;camera();}});}));
byId('circuit-zoom').addEventListener('click',()=>{cancelZoom();zoomTarget=1-zoomTarget;byId('circuit-zoom').setAttribute('aria-pressed',String(Boolean(zoomTarget)));cancelZoom=animateValue({from:zoom,to:zoomTarget,duration:800,onUpdate:v=>{zoom=v;camera();}});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{stop();cancelSwitch();cancelCoast();cancelView();cancelZoom();switchPosition=switchTarget;closed=Boolean(switchTarget);view=viewTarget;zoom=zoomTarget;camera();render();});
window.addEventListener('pageshow',()=>{camera();render();});
render();camera();mountReadingMode('.advanced');mountTopicNavigation('batteries');
