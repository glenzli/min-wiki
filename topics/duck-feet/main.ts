import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
import { strokeAt } from './model.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('duck-feet');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const titles=[t('脚趾之间连着蹼'),t('推水向后，身体向前'),t('缩小脚掌，轻轻收回')];
const texts=[t('蹼就是脚趾之间连接的皮肤。张开脚时，它让脚掌像一把宽宽的小船桨。'),t('张开的蹼增大推水的面积。脚向后划，水也会给鸭子一个向前的力。'),t('收脚时，脚掌缩拢，迎着水的面积变小，回程的阻力也会减小。')];
let progress=0, playing=false, frame=0, last=0, reported='';
let cancelSeek: () => void=()=>{};
const wake=el<SVGGElement>('wake');
wake.innerHTML=Array.from({length:9},()=>'<path/>').join('');
function render() {
  const s=strokeAt(progress), without=el<HTMLInputElement>('without').checked;
  el('duck').setAttribute('transform',`translate(${s.bodyX} 183)`);
  el('leg').setAttribute('d',`M-20 30Q${-10+s.footX*.4} 67 ${s.footX-20} ${s.footY}`);
  el('small-foot').setAttribute('transform',`translate(${s.footX-20} ${s.footY}) rotate(${s.angle}) scale(${s.spread} 1)`);
  el('foot').setAttribute('transform',`translate(${754+s.footX*.55} 234) rotate(${s.angle*.22})`);
  [...el('foot').children].slice(1).forEach(part=>part.setAttribute('transform',`scale(${s.spread} 1)`));
  el('web').setAttribute('opacity',without?'0':'1');
  for(const id of ['water-push','duck-go']) {el(id).setAttribute('visibility','visible');el(id).setAttribute('opacity',String(s.thrust));}
  el('water-push').setAttribute('stroke-width',without?'4':'9');
  [...wake.children].forEach((node,i)=>{const x=319-i*16-93*s.wake,y=301+i%3*17;node.setAttribute('d',`M${x} ${y}q${-14-24*s.wake} ${-5+i%3*5} ${-28-28*s.wake} 0`);node.setAttribute('opacity',String(s.thrust*(without?.28:.75)));});
  document.querySelectorAll<HTMLButtonElement>('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.phase)===s.stage)));
  el<HTMLInputElement>('progress').value=String(Math.round(progress*1000));
  el('play').textContent=playing?t('暂停'):progress>=1?t('再看一次'):t('播放一次');
  const key=`${s.stage}-${without}`;
  if(key!==reported){reported=key;el('badge').textContent=String(s.stage+1);el('state-title').textContent=without?t('想象只剩分开的脚趾'):titles[s.stage]!;el('state-text').textContent=without?t('这个对照图把蹼藏起来：只剩脚趾，推水的面积小了。这是比较形状的想象实验，真实的鸭子仍然有蹼。'):texts[s.stage]!;}
}
function pause(){playing=false;cancelAnimationFrame(frame);render();}
function seek(value:number){pause();cancelSeek();cancelSeek=animateValue({from:progress,to:value,duration:800,onUpdate:p=>{progress=p;render();}});}
function tick(now:number){if(!playing)return;progress=Math.min(1,progress+Math.min(.06,(now-last)/1000)/16);last=now;render();if(progress>=1)pause();else frame=requestAnimationFrame(tick);}
el('play').addEventListener('click',()=>{cancelSeek();if(playing){pause();return;}if(progress>=1)progress=0;if(matchMedia('(prefers-reduced-motion: reduce)').matches){progress=progress<.4?.4:progress<.78?.78:1;render();return;}playing=true;last=performance.now();render();frame=requestAnimationFrame(tick);});
el('restart').addEventListener('click',()=>seek(0));
el('progress').addEventListener('input',()=>{const p=Number(el<HTMLInputElement>('progress').value)/1000;pause();cancelSeek();progress=p;render();});
document.querySelectorAll<HTMLButtonElement>('[data-phase]').forEach(b=>b.addEventListener('click',()=>seek([0,.4,.78][Number(b.dataset.phase)]!)));
el('without').addEventListener('change',render);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelSeek();pause();}});
window.addEventListener('pagehide',()=>{cancelSeek();pause();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>pause());
render(); mountReadingMode('details:not(.references)');
