import { t } from './i18n.ts';
const noise=(i:number,salt:number)=>{const n=Math.sin(i*127.1+salt*311.7)*43758.5453;return n-Math.floor(n);};
const txt=(x:number,y:number,s:string,size=18)=>`<text x="${x}" y="${y}" font-family="inherit" text-anchor="middle" font-size="${size}" fill="#2f554c">${s}</text>`;
export function draw(p:number,condition:number){
 const stage=Math.min(3,Math.floor(p*4));
 const rock=`<ellipse cx="176" cy="288" rx="82" ry="15" fill="#776e52" opacity=".16"/><path d="M93 284L108 210L165 174L218 190L248 244L219 288Z" fill="url(#pebble)" stroke="#74867a" stroke-width="3"/><path d="M165 174L150 237L93 284L108 210Z" fill="#b5b8a7"/><path d="M150 237L218 190L248 244L219 288Z" fill="#7e9087"/><path d="M165 174L150 237L93 284M150 237L218 190M150 237L219 288" stroke="#ccd1bd" stroke-width="3" fill="none"/>`;
 const shell=`<ellipse cx="181" cy="301" rx="66" ry="12" fill="#8c7154" opacity=".13"/><g transform="translate(176 235)"><path d="M-62 6Q-86-57-48-72Q-25-107 0-84Q33-107 51-70Q86-52 59 10L13 55H-13Z" fill="url(#shell-light)" stroke="#bf9f86" stroke-width="3"/>${[-50,-30,0,30,50].map(x=>`<path d="M0 49Q${x/2} -7 ${x} -65" fill="none" stroke="#d1b197" stroke-width="3"/>`).join('')}<path d="M-13 54L-20 71H21L13 54" fill="#dec2a3" stroke="#bf9f86" stroke-width="2"/></g>`;
 const fragments=Array.from({length:15},(_,i)=>{const x=326+noise(i,1)*88,y=226+noise(i,2)*57;return `<path d="M${x} ${y}l${7+i%4} -5l5 9l-8 6Z" fill="${condition===0?['#adac95','#d5c897','#929b8b'][i%3]:['#ead2ae','#d8b999','#f6e6c7'][i%3]}" stroke="#a59571" stroke-width="1"/>`;}).join('');
 const tiny=Array.from({length:75},(_,i)=>`<circle cx="${523+noise(i,3)*133}" cy="${350+noise(i,4)*67}" r="${1.5+i%3}" fill="${condition===0?['#d9b878','#c9a96e','#eee1b3'][i%3]:['#f8ead0','#e8d6b8','#d9b99d'][i%3]}"/>`).join('');
 const fade=(a:number,b:number)=>Math.max(0,Math.min(1,(p-a)/(b-a)));
 const sourceOpacity=1-.12*fade(.1,.35),fragOpacity=.2+.8*fade(.05,.3)-.55*fade(.45,.65);
 const q=Math.max(0,Math.min(1,p))*4;
 const quad=(u:number,a:number[],b:number[],c:number[])=>[0,1].map(k=>(1-u)**2*a[k]!+2*(1-u)*u*b[k]!+u*u*c[k]!);
 let pos:number[];
 if(q<1)pos=[177+q*188,280-q*15];
 else if(q<2)pos=[365-(q-1)*114,265+(q-1)*61];
 else if(q<3){const u=(q-2)*2;pos=u<1?quad(u,[251,326],[331,411],[458,343]):quad(u-1,[458,343],[585,275],[653,348]);}
 else pos=quad(q-3,[653,348],[661,389],[620,400]);
 const [x,y]=pos;
 return {labels:[condition===0?t('岩石来源'):t('生物硬结构来源'),t('沙子有不同颜色和成分'),t('长长的时间被压缩了')],scene:`<defs><radialGradient id="shell-light" cx=".3" cy=".15" r=".9"><stop stop-color="#fff5df"/><stop offset=".55" stop-color="#eedac0"/><stop offset="1" stop-color="#cda88a"/></radialGradient><pattern id="sand-fleck" width="39" height="31" patternUnits="userSpaceOnUse"><circle cx="5" cy="8" r=".8" fill="#9f8657" opacity=".26"/><circle cx="24" cy="21" r="1.1" fill="#fff8db" opacity=".6"/><path d="M13 25l3-1" stroke="#ab9260" opacity=".3"/></pattern><linearGradient id="sand" x1=".1" x2=".8" y2="1"><stop stop-color="#eee1bc"/><stop offset=".5" stop-color="#d8c49a"/><stop offset="1" stop-color="#bba57e"/></linearGradient><radialGradient id="pebble" cx=".25" cy=".2"><stop stop-color="#dbdece"/><stop offset="1" stop-color="#81968b"/></radialGradient><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#e5efea"/><stop offset="1" stop-color="#f7ecd2"/></linearGradient><linearGradient id="ocean" x2="0" y2="1"><stop stop-color="#91ced0"/><stop offset="1" stop-color="#4f9fab"/></linearGradient></defs>
 <rect x="24" y="24" width="802" height="484" rx="26" fill="url(#bg)"/>
 <circle cx="734" cy="101" r="33" fill="#f1d788"/>
 <path d="M25 279Q157 285 232 310T457 293Q568 249 651 264T826 279V508H25Z" fill="url(#sand)"/><path d="M25 279Q157 285 232 310T457 293Q568 249 651 264T826 279V508H25Z" fill="url(#sand-fleck)"/>
 <path d="M495 263Q586 229 651 264T826 279V508H715Q742 451 679 419Q722 379 648 338Q610 294 495 263Z" fill="url(#ocean)"/>
 <path d="M494 263Q613 292 649 338Q725 379 679 419Q741 451 715 508" fill="none" stroke="#7bb6b9" stroke-width="24" opacity=".26"/><path d="M494 263Q613 292 649 338Q725 379 679 419Q741 451 715 508" fill="none" stroke="#e4efda" stroke-width="7" opacity=".85"/>
 ${[0,1,2,3].map(i=>`<path d="M${730+i*4} ${298+i*42}q35-15 69-2" stroke="#d8ede1" stroke-width="3" fill="none"/>`).join('')}
 ${`<path d="M251 326Q331 411 458 343T653 348" fill="none" stroke="#e9dfbc" stroke-width="43"/><path d="M251 326Q331 411 458 343T653 348" fill="none" stroke="#7eb9bc" stroke-width="31"/>`}
 <g opacity="${sourceOpacity}">${condition===0?rock:shell}</g><g opacity="${fragOpacity}">${fragments}</g><g opacity="${.5+.5*fade(.65,.9)}">${tiny}</g>
 <path d="M246 211H289M278 202L290 211L278 220M440 243L505 265M491 252L505 265L487 268" stroke="#79958a" stroke-width="3" fill="none" stroke-linecap="round"/>
 ${`<g transform="translate(${x} ${y})"><circle r="24" fill="#fff9dc" stroke="#d0a44e" stroke-width="3"/><path transform="scale(${1-.45*fade(.1,.8)})" d="M-7-6L5-9L10 1L3 10L-9 4Z" fill="${condition===0?'#bcb69a':'#e1bd9d'}"/></g>`}
 ${txt(173,130,condition===0?t('岩石'):t('贝壳'))}${txt(371,181,t('变成小颗粒'))}${txt(400,448,condition===0?t('河水搬运'):t('近岸水流搬运'))}${txt(659,229,t('沉积在海边'))}
 `};
}
