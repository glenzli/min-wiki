import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { painSequence } from './model.ts';
import { createPainScene, drawPain, type Focus } from './scene.ts';
translateDocument(t);
const el = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id)! as T;
const phases=[
  { title:t('皮肤里的感受末梢'), kids:t('皮肤里的末梢发现危险线索，发出消息。这还不是“疼”。'), mechanism:t('高阈值感受末梢可把可能损伤组织的刺激转成神经活动，这一步称为伤害性感受（nociception）。'), boundary:t('画面是一个急性皮肤情景；没有标定刺激温度、强度或组织损伤。') },
  { title:t('信号沿传入神经前进'), kids:t('消息沿感觉神经传到脊髓。跟着暖色线看它往哪里去。'), mechanism:t('感觉神经元的活动沿传入纤维进入脊髓，途中不是搬运一颗“疼痛粒子”。'), boundary:t('动画进度不代表真实传导速度；不同纤维与回路有不同延迟。') },
  { title:t('脊髓内，联系分成两路'), kids:t('到了脊髓，消息一边能去指挥肌肉，一边继续往脑走。'), mechanism:t('脊髓神经元通过突触联系中间神经元和运动神经元；另一些上行通路经多级中继传向脑。'), boundary:t('两条线是功能概括，省略了神经交叉、更多中继及来自脑的调节。') },
  { title:t('肌肉可以先带来缩回动作'), kids:t('肌肉收缩，手可以先缩开，不必等脑先下一个决定。'), mechanism:t('示例中的保护性缩回由脊髓回路驱动肌肉；同时上行活动仍在继续。'), boundary:t('这是可发生的顺序，不是每次疼痛或每种反射都遵守的固定计时。') },
  { title:t('脑内加工，与疼痛体验有关'), kids:t('脑会结合这些消息和身体的情况。疼不疼、怎么疼，是人的真实感受。'), mechanism:t('疼痛是一种感觉和情绪体验，涉及多处脑区与生物、心理、社会因素；不能仅由感觉神经活动推出。'), boundary:t('疼痛不是伤口大小的尺子；无可见损伤也不能否定一个人报告的疼痛。') },
];
let progress=0,focus:Focus='both',playing=false,zoom=0,zoomed=false,lastPhase=-1,lastMode='';
let cancelPlay=()=>{},cancelZoom=()=>{};
createPainScene();
function render() {
  const state=painSequence(progress);
  drawPain(progress,focus);
  el<HTMLInputElement>('progress').value=String(Math.round(progress*100));
  el('progress-value').textContent=`${Math.round(progress*100)}%`;
  el<HTMLButtonElement>('pause').disabled=!playing;
  el('play').textContent=progress>=1?t('再看一次'):t('播放一次');
  const mode=document.documentElement.dataset.readingMode || 'kids';
  if(lastPhase!==state.phase || lastMode!==mode){
    lastPhase=state.phase;
    lastMode=mode;
    el('phase-count').textContent=`0${state.phase+1} / 05`;
    const phase=phases[state.phase]!;
    el('phase-title').textContent=phase.title;
    el('phase-text').textContent=phase.kids;
    el('phase-mechanism').textContent=phase.mechanism;
    el('phase-boundary').textContent=phase.boundary;
  }
  document.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===focus)));
  document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.phase)));
}
function stop(){cancelPlay();playing=false;render();}
function seek(target:number,duration=650){cancelPlay();playing=false;cancelPlay=animateValue({from:progress,to:target,duration,onUpdate:value=>{progress=value;render();}});}
el('play').addEventListener('click',()=>{
  cancelPlay();if(progress>=1)progress=0;playing=true;
  cancelPlay=animateValue({from:progress,to:1,duration:8500*(1-progress),onUpdate:value=>{progress=value;render();},onComplete:()=>{playing=false;render();}});
});
el('pause').addEventListener('click',stop);
el('reset').addEventListener('click',()=>{cancelPlay();playing=false;progress=0;render();});
el<HTMLInputElement>('progress').addEventListener('input',()=>{cancelPlay();playing=false;progress=Number(el<HTMLInputElement>('progress').value)/100;render();});
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(b=>b.addEventListener('click',()=>seek(Number(b.dataset.stage))));
document.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(b=>b.addEventListener('click',()=>{focus=b.dataset.focus as Focus;render();}));
el('zoom').addEventListener('click',()=>{
  zoomed=!zoomed;cancelZoom();el('zoom').setAttribute('aria-pressed',String(zoomed));el('zoom').textContent=zoomed?t('回到完整路径'):t('放大皮肤末梢');
  cancelZoom=animateValue({from:zoom,to:zoomed?1:0,duration:700,onUpdate:value=>{zoom=value;document.querySelectorAll('#art [data-wide-label]').forEach(label=>label.setAttribute('opacity',String(Math.max(0,1-3*zoom))));el('zoom-detail').setAttribute('opacity',String(Math.max(0,Math.min(1,(zoom-.48)*2))));el('pain-scene').setAttribute('viewBox',`${0} ${84*zoom} ${900-520*zoom} ${520-300*zoom}`);}});
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{cancelPlay();cancelZoom();playing=false;});
window.addEventListener('pageshow',render);
render();mountReadingMode('.advanced');
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.addEventListener('click',render));
render();
mountTopicNavigation('pain-signals');

mountPresentationFrame({"root": ".lab", "visual": ".specimen", "transport": ".play-controls"});
