import { t } from './i18n.ts';
import { sandGrain } from './model.ts';
const noise=(i:number,salt:number)=>{const n=Math.sin(i*127.1+salt*311.7)*43758.5453;return n-Math.floor(n);};
function outline(rounding:number){
 const points=[[-1,-.7],[.3,-1],[1,-.1],[.6,.8],[-.6,.9]];
 return points.map((point,i)=>{const next=points[(i+1)%points.length]!,previous=points[(i+4)%points.length]!;const f=rounding*.4;const a=[point[0]+(previous[0]-point[0])*f,point[1]+(previous[1]-point[1])*f],b=[point[0]+(next[0]-point[0])*f,point[1]+(next[1]-point[1])*f];return `${i?'L':'M'}${a.join(' ')}Q${point.join(' ')} ${b.join(' ')}`;}).join('')+'Z';
}
export function draw(p:number,condition:number){
 const rock=`<ellipse cx="176" cy="288" rx="82" ry="15" fill="#776e52" opacity=".16"/><path d="M93 284L108 210L165 174L218 190L248 244L219 288Z" fill="url(#pebble)" stroke="#74867a" stroke-width="3"/><path d="M165 174L150 237L93 284L108 210Z" fill="#b5b8a7"/><path d="M150 237L218 190L248 244L219 288Z" fill="#7e9087"/><path d="M165 174L150 237L93 284M150 237L218 190M150 237L219 288" stroke="#ccd1bd" stroke-width="3" fill="none"/>`;
 const shell=`<ellipse cx="181" cy="301" rx="66" ry="12" fill="#8c7154" opacity=".13"/><g transform="translate(176 235)"><path d="M-62 6Q-86-57-48-72Q-25-107 0-84Q33-107 51-70Q86-52 59 10L13 55H-13Z" fill="url(#shell-light)" stroke="#bf9f86" stroke-width="3"/>${[-50,-30,0,30,50].map(x=>`<path d="M0 49Q${x/2} -7 ${x} -65" fill="none" stroke="#d1b197" stroke-width="3"/>`).join('')}<path d="M-13 54L-20 71H21L13 54" fill="#dec2a3" stroke="#bf9f86" stroke-width="2"/></g>`;
 const tracked=sandGrain(p,0,condition),{x,y}=tracked;
 const grains=Array.from({length:16},(_,i)=>sandGrain(p,i,condition));
 const fragments=grains.map(g=>`<g data-grain="${g.id}" transform="translate(${g.x} ${g.y}) rotate(${g.rotation})"><path d="${outline(g.rounding)}" transform="scale(${g.size})" fill="${condition===0?['#c2ab74','#d7c694','#949b89'][g.id%3]:['#efd9b7','#d5b594','#fff0d5'][g.id%3]}" stroke="#917443" stroke-width="${.12+g.rounding*.1}" stroke-linejoin="round"/></g>`).join('');
 const tiny=Array.from({length:75},(_,i)=>`<circle cx="${523+noise(i,3)*133}" cy="${350+noise(i,4)*67}" r="${1.5+i%3}" fill="${condition===0?['#d9b878','#c9a96e','#eee1b3'][i%3]:['#f8ead0','#e8d6b8','#d9b99d'][i%3]}"/>`).join('');
 return {focus:[x-170,y-108,340,216],labels:[t('金色圈始终跟着同一粒；停下后仍留在沙滩'),condition===0?t('岩石来源'):t('生物硬结构来源'),t('沙子有不同颜色和成分'),t('长长的时间被压缩了'),condition===0?t('河水搬运'):t('近岸水流搬运')],scene:`<defs><radialGradient id="shell-light" cx=".3" cy=".15" r=".9"><stop stop-color="#fff5df"/><stop offset=".55" stop-color="#eedac0"/><stop offset="1" stop-color="#cda88a"/></radialGradient><pattern id="sand-fleck" width="39" height="31" patternUnits="userSpaceOnUse"><circle cx="5" cy="8" r=".8" fill="#9f8657" opacity=".26"/><circle cx="24" cy="21" r="1.1" fill="#fff8db" opacity=".6"/><path d="M13 25l3-1" stroke="#ab9260" opacity=".3"/></pattern><linearGradient id="sand" x1=".1" x2=".8" y2="1"><stop stop-color="#eee1bc"/><stop offset=".5" stop-color="#d8c49a"/><stop offset="1" stop-color="#bba57e"/></linearGradient><radialGradient id="pebble" cx=".25" cy=".2"><stop stop-color="#dbdece"/><stop offset="1" stop-color="#81968b"/></radialGradient><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#e5efea"/><stop offset="1" stop-color="#f7ecd2"/></linearGradient><linearGradient id="ocean" x2="0" y2="1"><stop stop-color="#91ced0"/><stop offset="1" stop-color="#4f9fab"/></linearGradient></defs>
 <rect x="24" y="24" width="802" height="484" rx="26" fill="url(#bg)"/>
 <circle cx="734" cy="101" r="33" fill="#f1d788"/>
 <path d="M25 279Q157 285 232 310T457 293Q568 249 651 264T826 279V508H25Z" fill="url(#sand)"/><path d="M25 279Q157 285 232 310T457 293Q568 249 651 264T826 279V508H25Z" fill="url(#sand-fleck)"/>
 <path d="M495 263Q586 229 651 264T826 279V508H715Q742 451 679 419Q722 379 648 338Q610 294 495 263Z" fill="url(#ocean)"/>
 <path d="M494 263Q613 292 649 338Q725 379 679 419Q741 451 715 508" fill="none" stroke="#7bb6b9" stroke-width="24" opacity=".26"/><path d="M494 263Q613 292 649 338Q725 379 679 419Q741 451 715 508" fill="none" stroke="#e4efda" stroke-width="7" opacity=".85"/>
 ${[0,1,2,3].map(i=>`<path d="M${730+i*4} ${298+i*42}q35-15 69-2" stroke="#d8ede1" stroke-width="3" fill="none"/>`).join('')}
 ${condition===0?`<path d="M251 326Q331 411 458 343T653 348" fill="none" stroke="#e9dfbc" stroke-width="43"/><path d="M251 326Q331 411 458 343T653 348" fill="none" stroke="#7eb9bc" stroke-width="31"/>`: ''}
 <g>${condition===0?rock:`<g transform="translate(488 118) scale(.65)">${shell}</g>`}</g><g opacity=".55">${tiny}</g>${fragments}
 <circle cx="${x}" cy="${y}" r="${17-tracked.rounding*5}" fill="none" stroke="#fff7cb" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${19-tracked.rounding*5}" fill="none" stroke="#ad7e37" stroke-width="1.4"/>

 `};
}
