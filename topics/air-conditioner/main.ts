import './style.css';
import {t} from './i18n.ts';
import {translateDocument} from '../../src/platform/i18n.ts';
import {mountTopicNavigation} from '../../src/platform/topicNavigation.ts';
import {mountReadingMode} from '../../src/platform/readingMode.ts';
import {animateValue} from '../../src/visuals/transition.ts';
import {createScene,renderScene,stageNames,stageDescriptions} from './scene.ts';
import {energyBalance} from './model.ts';
translateDocument(t);createScene();
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id)! as T;
let p=0,cooling=1,coolingTarget=1,view=0,viewTarget=0,humid=1,playing=false;
let cancelPlay=()=>{},cancelView=()=>{},cancelMode=()=>{};
function render(){
 const s=renderScene(p,cooling,humid,view),on=cooling>.5,e=energyBalance(cooling);
 el<HTMLInputElement>('progress').value=String(p*100);el('progress-value').textContent=`${Math.round(p*100)}%`;
 el<HTMLButtonElement>('play').disabled=playing;el<HTMLButtonElement>('pause').disabled=!playing;
 el('phase-count').textContent=`0${s.stage+1} / 04`;
 el('phase-title').textContent=on?stageNames[s.stage]:t('风扇让空气流动');
 el('phase-text').textContent=on?stageDescriptions[s.stage]:t('这里只运行室内风扇。冷媒循环没有开启，进度只让我们慢放风扇的动作；它没有把房间的热搬到室外。');
 el('phase-state').textContent=on?(s.pressure>.5?t('较高压力'):t('较低压力'))+' · '+(s.liquid<.02?t('主要为蒸气'):s.liquid>.98?t('主要为液体'):t('液体与蒸气共存')):t('没有制冷循环');
 el('mode-note').textContent=on?t('制冷时，室内盘管吸热，室外盘管放热。'):t('只送风：空气还在流动，但室外没有这个循环送来的热量。');
 el('water-note').textContent=on&&humid?t('找蓝色排水管：水来自空气中的水汽凝结，不是冷媒漏出来。'):t('本例没有产生新的冷凝水。真实机器停机后，接水盘里原有的水仍可能继续排出。');
 el('energy-title').textContent=on?t('室外得到的热，还多了一份'):t('风扇也会消耗电能');
 el('energy-note').textContent=on?t('一组示意数：从室内取走 3 份热，加上压缩机做的 1 份功，向室外排出 4 份热。'):t('这里的三个数只统计制冷回路。只送风时它们为零；室内风扇仍耗电，最终给房间增加少量热。');
 for(const [id,v] of [['cold',e.roomHeat],['work',e.electricWork],['hot',e.outdoorHeat]] as const){el(`${id}-value`).textContent=v.toFixed(v%1?1:0);el(`q-${id}`).style.height=`${8+v*12}px`;}
 el('ledger').style.opacity=String(.45+.55*cooling);
 el('region-left').textContent=viewTarget===2?t('室内盘管 · 冷媒'):t('室内 · 空气循环');
 el('region-right').textContent=viewTarget===2?t('排水管 · 水'):on?t('室外 · 热量排出'):t('室外 · 循环停止');
}
function stop(){cancelPlay();playing=false;render();}
function seek(to:number){stop();cancelPlay=animateValue({from:p,to,duration:750,onUpdate:v=>{p=v;render();}});}
el('play').addEventListener('click',()=>{stop();if(p>=.999)p=0;playing=true;cancelPlay=animateValue({from:p,to:1,duration:18000*(1-p),onUpdate:v=>{p=v;render();},onComplete:()=>{playing=false;render();}});});
el('pause').addEventListener('click',stop);el('reset').addEventListener('click',()=>seek(0));
el('progress').addEventListener('input',()=>{const value=Number(el<HTMLInputElement>('progress').value)/100;stop();p=value;render();});
el('humidity').addEventListener('change',()=>{humid=Number(el<HTMLSelectElement>('humidity').value);render();});
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>seek(Number(b.dataset.stage))));
document.querySelectorAll<HTMLButtonElement>('[data-cooling]').forEach(b=>b.addEventListener('click',()=>{stop();cancelMode();const to=Number(b.dataset.cooling);coolingTarget=to;document.querySelectorAll('[data-cooling]').forEach(o=>o.setAttribute('aria-pressed',String(o===b)));cancelMode=animateValue({from:cooling,to,duration:650,onUpdate:v=>{cooling=v;render();}});}));
const notes=[t('空气各自在室内和室外流动，冷媒在管道里循环。普通分体空调不靠这两根管道输送新鲜空气。'),t('金色大圆点标记同一小份冷媒，沿密闭回路经过室内盘管、压缩机、室外盘管和节流装置。'),t('蓝色管是排水管，铜色管里才是冷媒。此处放大同一台室内机；各部件的大小经过教学调整。')];
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>{cancelView();viewTarget=Number(b.dataset.view);document.querySelectorAll('[data-view]').forEach(o=>o.setAttribute('aria-pressed',String(o===b)));el('view-note').textContent=notes[viewTarget];cancelView=animateValue({from:view,to:viewTarget,duration:900,onUpdate:v=>{view=v;render();}});}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{stop();cancelView();cancelMode();view=viewTarget;cooling=coolingTarget;render();});
window.addEventListener('pageshow',render);
render();mountReadingMode('.advanced');mountTopicNavigation('air-conditioner');
