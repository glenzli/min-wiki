import { t } from './i18n.ts';
import { partition } from './model.ts';
const noise=(i:number,salt:number)=>{const n=Math.sin(i*127.1+salt*311.7)*43758.5453;return n-Math.floor(n);};
const txt=(x:number,y:number,s:string,size=18)=>`<text x="${x}" y="${y}" font-family="inherit" text-anchor="middle" font-size="${size}" fill="#264f4c">${s}</text>`;
export function draw(p:number,condition:number){
 const water=partition(Math.round(p*100),condition),surface=['#d8bc8d','#a9846d','#adbbb6'][condition];
 const stage=Math.min(3,Math.floor(p*4));
 const grains=Array.from({length:205},(_,i)=>{const x=83+noise(i,1)*632,y=295+noise(i,2)*164,r=4+noise(i,3)*9;return condition===0?`<path d="M${x-r} ${y}q${r*.3} ${-r} ${r*1.2} ${-r*.75}t${r*.65} ${r}q${-r*.35} ${r*.8} ${-r*1.5} ${r*.5}Z" fill="${['#c3a270','#e6cea1','#d6b886','#b69d78'][i%4]}" stroke="#f5dfb7" stroke-width=".6"/>`:condition===1?`<path d="M${x-9} ${y}q8-3 21 0" stroke="${i%3?'#987964':'#b69279'}" stroke-width="${2+i%4}" stroke-linecap="round"/>`:'';}).join('');
 const infiltrated=Array.from({length:36},(_,i)=>{
  const f=Math.max(0,Math.min(1,(p-i*.013)*2)),opacity=Math.max(0,Math.min(1,water.soaked/2-i));
  return `<circle cx="${101+(i%14)*45+Math.sin(i)*f*6}" cy="${285+f*(24+Math.floor(i/14)*36+(i%3)*9)}" r="4" fill="#258fb2" opacity="${opacity}"/>`;
 }).join('');
 const rain=Array.from({length:20},(_,i)=>`<path d="M${154+(i%10)*42} ${143+Math.floor(i/10)*49+p*45}l-8 20" stroke="#68b8cb" stroke-width="3" stroke-linecap="round" opacity="${.8-.6*Math.max(0,Math.min(1,(p-.4)/.3))}"/>`).join('');
 const storedHeight=water.stored*.7;
 const arrows=Array.from({length:condition===0?6:condition===1?3:1},(_,i)=>`<path d="M${160+i*76} 275v${20+water.soaked*.7}" stroke="#368ba8" stroke-width="3" stroke-dasharray="5 5" marker-end="url(#arrow)" opacity="${.65*Math.max(0,Math.min(1,(p-.18)/.2))}"/>`).join('');
 return {labels:[t('渗入：{{n}} 份',{n:water.soaked}),t('流走：{{n}} 份',{n:water.flowed}),t('积留：{{n}} 份',{n:water.stored})],scene:`<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#e2eeea"/><stop offset="1" stop-color="#f8f0da"/></linearGradient><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#368ba8"/></marker></defs>
 <rect x="24" y="25" width="802" height="482" rx="26" fill="url(#sky)"/>
 <path d="M125 121C82 119 82 70 120 63C128 22 185 24 207 55C243 26 292 51 297 79C335 64 357 99 336 121Z" fill="#fdfdf5" stroke="#d0e1db" stroke-width="2" transform="translate(165 28)"/>
 ${rain}<path d="M70 273L726 282V469H70Z" fill="${surface}"/><path d="M70 469H726V480H70Z" fill="#8f795e"/>
 ${grains}${condition===2?Array.from({length:9},(_,i)=>`<rect x="${72+i*73}" y="273" width="71" height="36" rx="3" fill="#c5ceca" stroke="#9aa7a0" stroke-width="2"/>`).join(''):''}
 <path d="M79 269Q181 ${269-storedHeight*1.9} 278 270T470 273T715 278V284L79 276Z" fill="#66bed0" opacity="${Math.min(1,p*2)}"/>
 ${infiltrated}${arrows}<path d="M560 257Q671 259 757 289V399" fill="none" stroke="#4da3bb" stroke-width="${2+water.flowed/8}" opacity="${.8*Math.max(0,Math.min(1,(p-.4)/.2))}" marker-end="url(#arrow)"/>
 <path d="M730 407V479H805V407" fill="#fff8" stroke="#839f95" stroke-width="3"/><rect x="733" y="${475-water.flowed}" width="69" height="${water.flowed}" fill="#66b9ca" opacity=".7"/>
 ${txt(427,234,[t('沙土'),t('紧实黏土'),t('铺好的石板')][condition]!)}${txt(355,505,t('放大的地面剖面'),14)}${txt(766,501,t('流走的水'),13)}${txt(662,96,t('同样一场雨'),18)}${txt(662,122,`${water.total} / 100`,25)}`};
}
