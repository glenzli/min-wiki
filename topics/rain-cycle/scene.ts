import { t } from './i18n.ts';
const label=(x:number,y:number,v:string,size=18)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="inherit" font-size="${size}" fill="#24544f">${v}</text>`;
const cloud=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-90 25C-120 20-122-21-87-26C-92-73-27-81-12-44C12-69 58-46 57-18C110-32 127 29 82 35H-70Z" fill="#fffefa" stroke="#d5e7e3" stroke-width="2"/></g>`;
export function draw(p:number,condition:number){
 const stage=Math.min(3,Math.floor(p*4));
 const dots=Array.from({length:condition===0?12:5},(_,i)=>{const yy=355-(i/(condition===0?12:5))*205;return `<circle cx="${642+Math.sin(i*1.5)*19}" cy="${yy}" r="${i===4?7:3}" fill="#d4a946" opacity="${stage===0?'.85':'.25'}"/>`;}).join('');
 const drops=Array.from({length:13},(_,i)=>`<path d="M${253+i*17} ${190+(i%3)*25}l-10 24" stroke="#43a9c3" stroke-width="${i%4===0?5:3}" stroke-linecap="round" opacity="${stage===2?1:.16}"/>`).join('');
 const cubic=(u:number,a:number[],b:number[],c:number[],d:number[])=>[0,1].map(k=>(1-u)**3*a[k]!+3*(1-u)**2*u*b[k]!+3*(1-u)*u*u*c[k]!+u**3*d[k]!);
 const quad=(u:number,a:number[],b:number[],c:number[])=>[0,1].map(k=>(1-u)**2*a[k]!+2*(1-u)*u*b[k]!+u*u*c[k]!);
 const q=p*4;let pos:number[];
 if(q<1)pos=cubic(q,[635,366],[698,263],[681,203],[580,161]);
 else if(q<2)pos=quad(q-1,[580,161],[440,110],[300,170]);
 else if(q<3)pos=[300-(q-2)*35,170+(q-2)*135];
 else{const u=(q-3)*4;pos=u<1?quad(u,[265,305],[307,354],[287,375]):u<2?quad(u-1,[287,375],[267,396],[365,415]):u<3?quad(u-2,[365,415],[419,409],[457,442]):[457+(u-3)*144,442];}

 return {labels:[t('金色虚线：追踪看不见的水蒸气'),t('蓝色水滴：液态水')],scene:`<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#dceef0"/><stop offset="1" stop-color="#f7f5dd"/></linearGradient><linearGradient id="sea" x2="0" y2="1"><stop stop-color="#80c7cd"/><stop offset="1" stop-color="#3e9dac"/></linearGradient><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#659d99"/></marker></defs>
 <rect x="24" y="22" width="802" height="479" rx="26" fill="url(#sky)"/>
 <circle cx="716" cy="95" r="37" fill="#f1cf72"/><circle cx="716" cy="95" r="52" fill="none" stroke="#edd999" stroke-width="2" stroke-dasharray="2 10"/>
 <path d="M25 347L169 174L269 299L343 242L514 387V501H25Z" fill="#b4c2a0"/><path d="M128 224L169 174L215 231L178 217L160 236Z" fill="#e8eee0"/><path d="M25 385Q221 326 438 377T827 380V501H25Z" fill="#82a887"/>
 <path d="M265 305Q307 354 287 375T365 415Q419 409 457 442H601" fill="none" stroke="#cce8d9" stroke-width="28"/><path d="M265 305Q307 354 287 375T365 415Q419 409 457 442H601" fill="none" stroke="#58b2c1" stroke-width="21"/>
 <path d="M514 364Q609 356 827 360V480Q827 501 805 501H474Q483 477 524 457Q556 429 509 411Z" fill="url(#sea)"/>
 ${[0,1,2,3].map(i=>`<path d="M${548+i*7} ${393+i*24}q28-8 55 0t55 0t55 0" stroke="#cceee6" stroke-width="3" fill="none" opacity=".7"/>`).join('')}
 ${cloud(385,147,stage===1?1.13:1)}${cloud(570,164,.48)}
 <path d="M635 366C698 263 681 203 580 161" fill="none" stroke="#c5a552" stroke-width="3" stroke-dasharray="5 10" opacity="${stage===0?1:.24}" marker-end="url(#a)"/>
 ${dots}${drops}<path d="M308 348C322 399 409 420 482 428" fill="none" stroke="#e8f5d9" stroke-width="4" stroke-dasharray="8 12" opacity="${stage===3?1:.2}" marker-end="url(#a)"/>
 ${stage===1?Array.from({length:14},(_,i)=>`<circle cx="${322+(i%7)*22}" cy="${122+Math.floor(i/7)*21}" r="${3+i%3}" fill="#7abcca"/>`).join(''):''}
 <circle cx="${pos[0]}" cy="${pos[1]}" r="15" fill="#fffbdc" stroke="#d5a73b" stroke-width="4"/><circle cx="${pos[0]}" cy="${pos[1]}" r="5" fill="#d5a73b"/>
 ${label(639,286,t('蒸发'))}${label(385,71,t('凝结成云'))}${label(209,312,t('降雨'))}${label(370,467,t('河流'))}${label(727,474,t('海洋'))}`};
}
