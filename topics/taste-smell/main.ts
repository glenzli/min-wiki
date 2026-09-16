import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { flavorSequence, type Food } from './model.ts';
import { createTasteScene, drawTaste } from './scene.ts';
translateDocument(t);
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const phases=[
 [t('食物里的分子进入唾液'),t('唾液让许多可溶物质接触味觉细胞。看放大图：小点逐渐靠近味蕾顶端的味孔。')],
 [t('味觉细胞把化学线索转成信号'),t('味蕾里细长的细胞开始回应。不是整个食物钻进细胞，也不是每个细胞都能识别所有味质。')],
 [t('两条感觉通路，分别传递'),t('绿色线追踪味觉信号。加入嗅觉后，紫色气味路线先到鼻腔上部，再转换成嗅觉神经信号。')],
 [t('脑把多种线索整合为风味'),t('酸甜或鲜味、香气、温度与口感共同参与体验。这里突出两种化学感觉，不给它们规定固定比例。')],
];
let progress=0,includeSmell=true,food:Food='strawberry',playing=false,zoom=0,zoomed=false,lastPhase=-1,lastResult='',smellOpacity=1;
let cancelPlay=()=>{},cancelZoom=()=>{},cancelSmell=()=>{};
createTasteScene();
function render(){
 const s=flavorSequence(progress,includeSmell);drawTaste(progress,includeSmell,food,smellOpacity);
 el<HTMLInputElement>('progress').value=String(Math.round(progress*100));el('progress-value').textContent=`${Math.round(progress*100)}%`;
 el<HTMLButtonElement>('pause').disabled=!playing;el('play').textContent=progress>=1?t('再看一次'):t('播放一次');
 if(lastPhase!==s.phase){lastPhase=s.phase;el('phase-count').textContent=`0${s.phase+1} / 04`;el('phase-title').textContent=phases[s.phase]![0]!;el('phase-text').textContent=phases[s.phase]![1]!;}
 const result=`${food}-${includeSmell}`;
 if(result!==lastResult){lastResult=result;
  el('result-title').textContent=food==='strawberry'?(includeSmell?t('酸甜之外，还有草莓香'):t('先留下草莓的味觉线索')):(includeSmell?t('酸鲜之外，还有番茄香'):t('先留下番茄的味觉线索'));
  el('result-text').textContent=includeSmell?t('香气从口腔后方进入鼻腔，给风味增加信息。味觉通路仍然保持原来的路线。'):t('绿色味觉通路照常传递。图上暂不计入嗅觉贡献，因此少了许多香气线索，并不等于完全没有味道。');
 }
 document.querySelectorAll<HTMLButtonElement>('[data-smell]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.smell==='true')===includeSmell)));
 document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===s.phase)));
}
function stop(){cancelPlay();playing=false;render();}
function seek(target:number){cancelPlay();playing=false;cancelPlay=animateValue({from:progress,to:target,duration:650,onUpdate:v=>{progress=v;render();}});}
el('play').addEventListener('click',()=>{cancelPlay();if(progress>=1)progress=0;playing=true;cancelPlay=animateValue({from:progress,to:1,duration:8000*(1-progress),onUpdate:v=>{progress=v;render();},onComplete:()=>{playing=false;render();}});});
el('pause').addEventListener('click',stop);el('reset').addEventListener('click',()=>{cancelPlay();playing=false;progress=0;render();});
el<HTMLInputElement>('progress').addEventListener('input',()=>{cancelPlay();playing=false;progress=Number(el<HTMLInputElement>('progress').value)/100;render();});
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>seek(Number(b.dataset.stage))));
document.querySelectorAll<HTMLButtonElement>('[data-smell]').forEach(b=>b.addEventListener('click',()=>{includeSmell=b.dataset.smell==='true';cancelSmell();cancelSmell=animateValue({from:smellOpacity,to:includeSmell?1:0,duration:500,onUpdate:v=>{smellOpacity=v;render();}});}));
el<HTMLSelectElement>('food').addEventListener('change',()=>{cancelPlay();playing=false;food=el<HTMLSelectElement>('food').value as Food;progress=0;render();});
el('zoom').addEventListener('click',()=>{zoomed=!zoomed;cancelZoom();el('zoom').setAttribute('aria-pressed',String(zoomed));el('zoom').textContent=zoomed?t('看完整舌乳头'):t('放大味蕾');el('detail-name').textContent=zoomed?t('味蕾里的细胞'):t('舌乳头的切面');cancelZoom=animateValue({from:zoom,to:zoomed?1:0,duration:700,onUpdate:v=>{zoom=v;el('overview-labels').setAttribute('opacity',String(Math.max(0,1-3*v)));el('zoom-labels').setAttribute('opacity',String(Math.max(0,3*v-2)));el('bud-scene').setAttribute('viewBox',`${128*v} ${94*v} ${480-230*v} ${480-140*v}`);}});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>{cancelPlay();cancelZoom();cancelSmell();smellOpacity=includeSmell?1:0;playing=false;});
window.addEventListener('pageshow',render);
render();mountReadingMode('.advanced');
mountTopicNavigation('taste-smell');
