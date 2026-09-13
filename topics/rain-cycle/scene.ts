import { t } from './i18n.ts';
const label=(x:number,y:number,v:string,size=18)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="inherit" font-size="${size}" fill="#24544f">${v}</text>`;
const smooth=(a:number,b:number,p:number)=>{const f=Math.max(0,Math.min(1,(p-a)/(b-a)));return f*f*(3-2*f);};
const molecule=(x:number,y:number,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-5 4L0 0L5 4" fill="none" stroke="#9b907b" stroke-width="2"/><circle r="4" fill="#b47d66"/><circle cx="-5" cy="4" r="2.6" fill="#fff8e6" stroke="#b6a98e"/><circle cx="5" cy="4" r="2.6" fill="#fff8e6" stroke="#b6a98e"/></g>`;
const cloud=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-90 25C-120 20-122-21-87-26C-92-73-27-81-12-44C12-69 58-46 57-18C110-32 127 29 82 35H-70Z" fill="url(#cloud-shade)" stroke="#d5e7e3" stroke-width="2"/></g>`;
export function draw(p:number,condition:number){
 const stage=Math.min(3,Math.floor(p*4));
 const dots=Array.from({length:condition===0?12:5},(_,i)=>{
  const f=smooth(i*.007,.23+i*.008,p),x=642+Math.sin(i*1.5)*19-f*25,y=355-f*(185+i*3);
  return `<g opacity="${.8*(1-smooth(.23,.43,p))}">${molecule(x,y,.9)}</g>`;
 }).join('');
 const drops=Array.from({length:13},(_,i)=>`<path d="M${253+i*17} ${190+(i%3)*25+smooth(.45,.76,p)*(95+i%3*12)}l-5 13" stroke="#43a9c3" stroke-width="${i%4===0?4:2}" stroke-linecap="round" opacity="${smooth(.43,.53,p)*(1-smooth(.72,.85,p))}"/>`).join('');
 const cubic=(u:number,a:number[],b:number[],c:number[],d:number[])=>[0,1].map(k=>(1-u)**3*a[k]!+3*(1-u)**2*u*b[k]!+3*(1-u)*u*u*c[k]!+u**3*d[k]!);
 const quad=(u:number,a:number[],b:number[],c:number[])=>[0,1].map(k=>(1-u)**2*a[k]!+2*(1-u)*u*b[k]!+u*u*c[k]!);
 const q=p*4;let pos:number[];
 if(q<1)pos=cubic(q,[635,366],[698,263],[681,203],[580,161]);
 else if(q<2)pos=quad(q-1,[580,161],[440,110],[300,170]);
 else if(q<3)pos=[300-(q-2)*35,170+(q-2)*135];
 else{const u=(q-3)*4;pos=u<1?quad(u,[265,305],[307,354],[287,375]):u<2?quad(u-1,[287,375],[267,396],[365,415]):u<3?quad(u-2,[365,415],[419,409],[457,442]):[457+(u-3)*144,442];}

 return {labels:[t('小三球：放大的水分子'),t('圆框：追踪一小份水，不是单个分子')],scene:`<defs><radialGradient id="cloud-shade" cx=".35" cy=".2" r=".9"><stop stop-color="#fffef5"/><stop offset=".65" stop-color="#eef4ea"/><stop offset="1" stop-color="#b9d1d0"/></radialGradient><linearGradient id="meadow" x2=".3" y2="1"><stop stop-color="#a6be93"/><stop offset="1" stop-color="#668d78"/></linearGradient><linearGradient id="mountain" x2=".8" y2="1"><stop stop-color="#ccd3b3"/><stop offset="1" stop-color="#839b87"/></linearGradient><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#dceef0"/><stop offset="1" stop-color="#f7f5dd"/></linearGradient><linearGradient id="sea" x2="0" y2="1"><stop stop-color="#80c7cd"/><stop offset="1" stop-color="#3e9dac"/></linearGradient><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#659d99"/></marker></defs>
 <rect x="24" y="22" width="802" height="479" rx="26" fill="url(#sky)"/>
 <circle cx="716" cy="95" r="37" fill="#f1cf72"/><circle cx="716" cy="95" r="52" fill="none" stroke="#edd999" stroke-width="2" stroke-dasharray="2 10"/>
 <path d="M25 347L169 174L269 299L343 242L514 387V501H25Z" fill="url(#mountain)"/><path d="M128 224L169 174L215 231L178 217L160 236Z" fill="#e8eee0"/><path d="M25 385Q221 326 438 377T827 380V501H25Z" fill="url(#meadow)"/>
 <path d="M265 305Q307 354 287 375T365 415Q419 409 457 442H601" fill="none" stroke="#cce8d9" stroke-width="28"/><path d="M265 305Q307 354 287 375T365 415Q419 409 457 442H601" fill="none" stroke="#58b2c1" stroke-width="21"/>
 <path d="M514 364Q609 356 827 360V480Q827 501 805 501H474Q483 477 524 457Q556 429 509 411Z" fill="url(#sea)"/>
 ${[0,1,2,3].map(i=>`<path d="M${548+i*7} ${393+i*24}q28-8 55 0t55 0t55 0" stroke="#cceee6" stroke-width="3" fill="none" opacity=".7"/>`).join('')}
 <g opacity="${.25+.75*smooth(.12,.4,p)}">${cloud(385,147,1+.08*smooth(.12,.4,p))}${cloud(570,164,.48)}</g>
 <path d="M635 366C698 263 681 203 580 161" fill="none" stroke="#c5a552" stroke-width="3" stroke-dasharray="5 10" opacity="${1-.76*smooth(.2,.35,p)}" marker-end="url(#a)"/>
 ${dots}${drops}<path d="M308 348C322 399 409 420 482 428" fill="none" stroke="#e8f5d9" stroke-width="4" stroke-dasharray="8 12" opacity="${.2+.8*smooth(.7,.85,p)}" marker-end="url(#a)"/>
 <g opacity="${smooth(.2,.35,p)*(1-smooth(.45,.6,p))}">${Array.from({length:14},(_,i)=>`<circle cx="${322+(i%7)*22}" cy="${122+Math.floor(i/7)*21}" r="${3+i%3}" fill="#7abcca"/>`).join('')}</g>
 <g transform="translate(${pos[0]} ${pos[1]})"><circle r="20" fill="#fffceec9" stroke="#c7a465" stroke-width="2"/><g opacity="${1-smooth(.24,.42,p)}">${molecule(-7,-5,.75)}${molecule(7,-3,.75)}${molecule(0,7,.75)}</g><ellipse cy="1" rx="8" ry="10" fill="#6db4c6" stroke="#e2f6ef" opacity="${smooth(.24,.42,p)}"/></g>
 ${label(639,286,t('蒸发'))}${label(385,71,t('凝结成云'))}${label(209,312,t('降雨'))}${label(370,467,t('河流'))}${label(727,474,t('海洋'))}`};
}
