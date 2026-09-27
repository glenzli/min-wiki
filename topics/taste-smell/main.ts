import { mountPresentationFrame } from '../../src/platform/presentation.ts';
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
 {title:t('食物里的分子进入唾液'),kids:t('食物中的可溶小分子进入唾液，靠近 A 点的味蕾。'),mechanism:t('味质分子溶于唾液后，接触味蕾顶端味孔附近的味觉细胞。另有挥发性分子可走向后鼻通道。'),boundary:t('小点、数量和速度均为示意；它们不代表一种食物的真实浓度。')},
 {title:t('味觉细胞把化学线索转成信号'),kids:t('味蕾里的细胞接到化学线索，开始把消息传给神经。'),mechanism:t('不同味质涉及不同受体或离子通道机制。味觉细胞的反应经与神经纤维的联系继续传递。'),boundary:t('放大的细胞种类、数量和形状经过简化，也没有画出全部突触。')},
 {title:t('两条感觉通路，分别传递'),kids:t('绿色线从舌头走；紫色香气先经空气到鼻腔上部。'),mechanism:t('味觉传入神经与嗅觉感受神经不是同一路；后鼻气味先到嗅觉上皮，随后才以神经活动传递。'),boundary:t('两条路径并排慢放，不能从图中读取真实气流、传导速度或感觉先后。')},
 {title:t('脑把多种线索整合为风味'),kids:t('脑结合味觉、香气和口感，才有熟悉的食物风味。'),mechanism:t('脑对味觉、嗅觉和三叉神经、温度、质地等信息进行整合；图中只强调两条化学感觉路径。'),boundary:t('开关只比较画出的线索，没有测量个人风味、偏好或嗅觉百分比。')},
];
let progress=0,includeSmell=true,food:Food='strawberry',playing=false,zoom=0,zoomed=false,lastPhase=-1,lastMode='',lastResult='',smellOpacity=1;
let cancelPlay=()=>{},cancelZoom=()=>{},cancelSmell=()=>{};
createTasteScene();
function render(){
 const s=flavorSequence(progress,includeSmell);drawTaste(progress,includeSmell,food,smellOpacity);
 el<HTMLInputElement>('progress').value=String(Math.round(progress*100));el('progress-value').textContent=`${Math.round(progress*100)}%`;
 el<HTMLButtonElement>('pause').disabled=!playing;el('play').textContent=progress>=1?t('再看一次'):t('播放一次');
 const mode=document.documentElement.dataset.readingMode || 'kids';
 if(lastPhase!==s.phase || lastMode!==mode){lastPhase=s.phase;lastMode=mode;const phase=phases[s.phase]!;el('phase-count').textContent=`0${s.phase+1} / 04`;el('phase-title').textContent=phase.title;el('phase-text').textContent=phase.kids;el('phase-mechanism').textContent=phase.mechanism;el('phase-boundary').textContent=phase.boundary;}
 const result=`${food}-${includeSmell}-${mode}`;
 if(result!==lastResult){lastResult=result;
  el('result-title').textContent=food==='strawberry'?(includeSmell?t('酸甜之外，还有草莓香'):t('先留下草莓的味觉线索')):(includeSmell?t('酸鲜之外，还有番茄香'):t('先留下番茄的味觉线索'));
  el('result-text').textContent=mode==='academic'
   ?(includeSmell?t('挥发性分子经后鼻通道到嗅觉上皮，额外增加嗅觉信息；味觉传入仍走原来的通路。'):t('只在图上移去后鼻嗅觉线索；味觉细胞与传入通路仍保留，不能据此推断个人体验完全无味。'))
   :(includeSmell?t('香气从嘴巴后方到鼻子，和舌头的消息一起参与风味。'):t('拿掉紫色香气线，绿色味觉线仍在。食物不会突然完全没味道。'));
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
el('zoom').addEventListener('click',()=>{zoomed=!zoomed;cancelZoom();el('zoom').setAttribute('aria-pressed',String(zoomed));el('zoom').textContent=zoomed?t('看完整舌乳头'):t('放大味蕾');el('detail-name').textContent=zoomed?t('A 点味蕾细胞'):t('A 点舌乳头');cancelZoom=animateValue({from:zoom,to:zoomed?1:0,duration:700,onUpdate:v=>{zoom=v;el('overview-labels').setAttribute('opacity',String(Math.max(0,1-3*v)));el('zoom-labels').setAttribute('opacity',String(Math.max(0,3*v-2)));el('bud-scene').setAttribute('viewBox',`${128*v} ${94*v} ${480-230*v} ${480-140*v}`);}});});
document.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach(button=>button.addEventListener('click',()=>{document.querySelector<HTMLElement>('.taste-pair')!.dataset.view=button.dataset.view!;document.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach(choice=>choice.setAttribute('aria-pressed',String(choice===button)));}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>{cancelPlay();cancelZoom();cancelSmell();smellOpacity=includeSmell?1:0;playing=false;});
window.addEventListener('pageshow',render);
render();mountReadingMode('.advanced');
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.addEventListener('click',render));
render();
mountTopicNavigation('taste-smell');

mountPresentationFrame({"root": ".lab", "visual": ".taste-pair", "transport": ".play-controls", "paired": true});
