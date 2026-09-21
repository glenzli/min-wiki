import {animateValue} from '../../src/visuals/transition.ts';
import {t} from './i18n.ts';
import {wheelContact,type ContactMode} from './projectModel.ts';
export function mountContactStudy(onState:(mode:ContactMode)=>void=()=>{}){
 const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
 let progress=0,mode:ContactMode='rolling',playing=false,cancel=()=>{};
 function draw(){
  const s=wheelContact(progress,mode);
  el('contact-wheel').setAttribute('transform',`translate(${s.centerX} 125)`);
  el('contact-spokes').setAttribute('transform',`rotate(${s.angle*180/Math.PI})`);
  el('contact-mark').setAttribute('cx',String(s.markX));el('contact-mark').setAttribute('cy',String(s.markY));
  el('contact-patch').setAttribute('x',String(s.centerX-14));
  el('contact-slip').setAttribute('d',s.slipRatio?`M${s.centerX-20} 217h65l-9-6m9 6l-9 6`:'');
  el<HTMLInputElement>('contact-progress').value=String(progress*100);
  el('contact-state').textContent=mode==='rolling'?t('滚动：接触点相对地面瞬时不滑动。金点是同一处胎面，它接地后又会离开地面。'):t('锁止轮滑行：轮子不转，但仍向右移动；接触处相对地面滑动。这里没有预测锁轮停车距离。');
  el('contact-play').textContent=playing?t('暂停'):t('观察接触运动');
  onState(mode);
 }
 function stop(){cancel();playing=false;draw();}
 document.querySelectorAll<HTMLButtonElement>('[data-contact-mode]').forEach(button=>button.addEventListener('click',()=>{
  stop();mode=button.dataset.contactMode==='sliding'?'sliding':'rolling';progress=0;
  document.querySelectorAll('[data-contact-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));draw();
 }));
 el('contact-progress').addEventListener('input',()=>{const next=Number(el<HTMLInputElement>('contact-progress').value)/100;stop();progress=next;draw();});
 el('contact-play').addEventListener('click',()=>{if(playing){stop();return;}if(progress>=1)progress=0;playing=true;cancel=animateValue({from:progress,to:1,duration:5000*(1-progress),onUpdate:p=>{progress=p;draw();},onComplete:()=>{playing=false;draw();}});});
 el('contact-reset').addEventListener('click',()=>{stop();progress=0;draw();});
 const onVisibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',onVisibility);window.addEventListener('pagehide',stop);draw();
 return {setActive(active:boolean){if(!active)stop();else draw();},dispose(){stop();document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',stop);}};
}
