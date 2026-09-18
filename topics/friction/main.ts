import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation('friction');
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => Number((el(id) as HTMLInputElement).value);
import { sliding, energyState } from './model.ts';
const lanes=[{name:t('木板'),mu:.12,fill:'woodgrain'},{name:t('布面'),mu:.28,fill:'cloth'},{name:t('砂纸'),mu:.5,fill:'rough'}];
let frame=0,playing=false;
const motion=matchMedia('(prefers-reduced-motion: reduce)');
function stop(){cancelAnimationFrame(frame);frame=0;playing=false;el('finish').textContent=t('播放滑动');}
function finish(){
 if(playing){stop();return;}
 stop();const input=el('time') as HTMLInputElement;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){input.value='4';update();return;}
 playing=true;el('finish').textContent=t('暂停');
 const from=Number(input.value)>=4?0:Number(input.value),start=performance.now();
 const tick=(now:number)=>{const time=Math.min(4,from+(now-start)/1000);input.value=String(time);update();if(time<4)frame=requestAnimationFrame(tick);else stop();};
 frame=requestAnimationFrame(tick);
}
motion.addEventListener('change',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
function update(){const time=value('time'),speed=value('speed');el('tracks').innerHTML=lanes.map((lane,i)=>{const state=sliding(speed,lane.mu,time),y=115+i*105,x=180+state.distance*150,arrow=state.speed>0&&time>0?`<path d="M${x+5} ${y+18}h-${lane.mu*100+12}l9-6m-9 6l9 6" stroke="#bc6451" stroke-width="4" fill="none"/>`:'';return `<rect x="130" y="${y+21}" width="705" height="38" rx="8" fill="url(#${lane.fill})"/><path d="M133 ${y+58}H831" stroke="#536f64" opacity=".25" stroke-width="3"/><path d="M180 ${y+48}H${x}" stroke="#fff9df" stroke-width="5" opacity=".85"/><ellipse cx="${x+7}" cy="${y+24}" rx="42" ry="6" fill="#65563e" opacity=".2"/><text x="32" y="${y+23}">${lane.name}</text><path d="M170 ${y-48}V${y+59}" stroke="#68867e" stroke-dasharray="4 5"/><g transform="translate(${x} ${y-34})"><rect x="-29" width="72" height="55" rx="9" fill="url(#block-light)" stroke="#a97842" stroke-width="3"/><path d="M-23 46V10Q-23 5-18 5H36" fill="none" stroke="#ffe9bd" stroke-width="2" opacity=".7"/><path d="M-21 12Q7 5 35 12M-21 43Q7 35 35 42" fill="none" stroke="#b07c40" opacity=".28"/><circle cx="-5" cy="19" r="3" fill="#503d2a"/><circle cx="19" cy="19" r="3" fill="#503d2a"/><path d="M0 34Q8 40 16 34" fill="none" stroke="#503d2a" stroke-width="3"/></g>${arrow}<text x="830" y="${y-25}" text-anchor="end" class="small">${state.speed===0?t('已停下'):t('还在滑')}</text>`;}).join('');el('readout').textContent=lanes.every(l=>sliding(speed,l.mu,time).speed===0)?t('三块木头都停了：同样快出发时，本例摩擦较小的路滑得更远。'):t('时间 {{time}} 秒 · 出发速度 {{speed}} 米/秒。三条路同时比较。',{time:time.toFixed(2),speed:speed.toFixed(1)});renderDetail(time,speed);}
el('contact-lane').addEventListener('change',()=>{update();});
el('time').addEventListener('input',()=>{stop();update();});el('speed').addEventListener('input',()=>{stop();(el('time') as HTMLInputElement).value='0';update();});el('finish').addEventListener('click',finish);el('reset').addEventListener('click',()=>{stop();(el('time') as HTMLInputElement).value='0';update();});update();

mountReadingMode('details:not(.references)');

function renderDetail(time:number,speed:number){
 const selected=Number((el('contact-lane') as HTMLSelectElement).value),lane=lanes[selected]!,state=energyState(speed,lane.mu,time);
 const shift=state.distance*30;
 const lower=Array.from({length:31},(_,i)=>`${i?'L':'M'}${40+i*27} ${143-((i*19)%17)}`).join('');
 const upper=Array.from({length:36},(_,i)=>`L${-120+i*29} ${117+((i*13)%14)}`).reverse().join('');
 el('contact-detail').innerHTML=`<defs><linearGradient id="contact-heat" x2="0" y2="1"><stop stop-color="#df9a57"/><stop offset="1" stop-color="#be8054"/></linearGradient><clipPath id="contact-window"><rect x="32" y="35" width="836" height="187" rx="18"/></clipPath></defs><rect width="900" height="250" fill="#eef4eb"/><g clip-path="url(#contact-window)"><path d="${lower}V230H30Z" fill="url(#${lane.fill})" stroke="#547369" stroke-width="2"/><g transform="translate(${shift} 0)"><path d="M-120 40H930V110${upper}Z" fill="#dfb477" stroke="#ac8456" stroke-width="2"/>${Array.from({length:17},(_,i)=>`<path d="M${i*61-100} 64q24-8 45 0m-39 19q17-5 30 0" stroke="#ae814c" opacity=".28" fill="none"/>`).join('')}</g>${Array.from({length:10},(_,i)=>`<ellipse cx="${99+i*78}" cy="133" rx="${6+selected*2}" ry="3" fill="#d88245" opacity="${.16+state.transferred*.48}"/>`).join('')}<rect x="32" y="120" width="836" height="44" fill="url(#contact-heat)" opacity="${state.transferred*.1}"/>${state.speed>0&&time>0?`<path d="M440 91h${state.speed*30}l-9-5m9 5l-9 5" stroke="#29838e" stroke-width="4" fill="none"/><path d="M460 172h-${22+lane.mu*85}l9-5m-9 5l9 5" stroke="#bd6e49" stroke-width="4" fill="none"/>`:''}</g>`;
 el('energy-bars').replaceChildren(...lanes.map(l=>{
  const e=energyState(speed,l.mu,time),row=document.createElement('div');row.className='energy-row';
  const label=document.createElement('span');label.textContent=l.name;
  const bar=document.createElement('div');bar.className='energy-bar';bar.setAttribute('role','img');bar.setAttribute('aria-label',t('运动能量 {{n}}%；已转移 {{m}}%',{n:Math.round(e.kinetic*100),m:Math.round(e.transferred*100)}));
  const kinetic=document.createElement('i');kinetic.style.width=`${e.kinetic*100}%`;kinetic.className='kinetic';
  const transferred=document.createElement('i');transferred.style.width=`${e.transferred*100}%`;transferred.className='transferred';
  bar.append(kinetic,transferred);row.append(label,bar);return row;
 }));
}
