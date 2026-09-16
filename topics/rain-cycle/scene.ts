import { t } from './i18n.ts';
import { cycleRainDrop, evaporationCue, smooth, waterJourney } from './model.ts';
const label=(x:number,y:number,v:string,size=18)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="inherit" font-size="${size}" fill="#24544f">${v}</text>`;
const molecule=(x:number,y:number,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-5 4L0 0L5 4" fill="none" stroke="#9b907b" stroke-width="2"/><circle r="4" fill="#b47d66"/><circle cx="-5" cy="4" r="2.6" fill="#fff8e6" stroke="#b6a98e"/><circle cx="5" cy="4" r="2.6" fill="#fff8e6" stroke="#b6a98e"/></g>`;
const cloud=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-90 25C-120 20-122-21-87-26C-92-73-27-81-12-44C12-69 58-46 57-18C110-32 127 29 82 35H-70Z" fill="url(#cloud-shade)" stroke="#d5e7e3" stroke-width="2"/></g>`;
export function draw(p:number,condition:number){
 const dots=Array.from({length:12},(_,i)=>{
  const cue=evaporationCue(p,i,condition);
  return `<g opacity="${cue.opacity}">${molecule(cue.x,cue.y,.9)}</g>`;
 }).join('');
 const drops=Array.from({length:13},(_,i)=>{
  const drop=cycleRainDrop(p,i);
  if(drop.outcome==='unborn')return '';
  if(drop.outcome==='landed'){
   const age=Math.min(1,drop.afterLanding/.035),slope=i===0?51:i<6?-38:40;
   return `<g transform="translate(${drop.groundX} ${drop.groundY+1}) rotate(${slope})"><ellipse cy="5" rx="${3+drop.radius}" ry="2.3" fill="#478d91" opacity=".4"/><ellipse rx="${3+age*12}" ry="${1+age*3}" fill="none" stroke="#e9fff4" stroke-width="1.4" opacity="${1-age}"/></g>`;
  }
  return `<g opacity="${smooth(0,.08,drop.age)}"><path d="M${drop.x+1} ${drop.y-7}l1.5-7" fill="none" stroke="#83c5d2" stroke-width="1.4" opacity=".7"/><ellipse cx="${drop.x}" cy="${drop.y}" rx="${drop.radius}" ry="${drop.radius*1.3}" fill="url(#rain-glass)" stroke="#ebfff6" stroke-width=".65"/></g>`;
 }).join('');
 const pos=waterJourney(p);
 // Draw the already-travelled route from exactly the marker's positions.
 const trace=Array.from({length:Math.ceil(p*160)+1},(_,i)=>waterJourney(Math.min(p,i/160))).map((point,i)=>`${i?'L':'M'}${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join('');
 const gas=smooth(.015,.075,p)*(1-smooth(.24,.42,p)),joined=1-smooth(0,.045,p)+smooth(.745,.8,p);

 return {labels:[t('小三球：放大的水分子'),t('圆框：追踪一小份水，不是单个分子')],scene:`<defs><radialGradient id="rain-glass" cx=".3" cy=".22"><stop stop-color="#f8ffff"/><stop offset=".4" stop-color="#9ed9e3"/><stop offset="1" stop-color="#2887a4"/></radialGradient><radialGradient id="cloud-shade" cx=".35" cy=".2" r=".9"><stop stop-color="#fffef5"/><stop offset=".65" stop-color="#eef4ea"/><stop offset="1" stop-color="#b9d1d0"/></radialGradient><linearGradient id="meadow" x2=".3" y2="1"><stop stop-color="#a6be93"/><stop offset="1" stop-color="#668d78"/></linearGradient><linearGradient id="mountain" x2=".8" y2="1"><stop stop-color="#ccd3b3"/><stop offset="1" stop-color="#839b87"/></linearGradient><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#dceef0"/><stop offset="1" stop-color="#f7f5dd"/></linearGradient><linearGradient id="sea" x2="0" y2="1"><stop stop-color="#80c7cd"/><stop offset="1" stop-color="#3e9dac"/></linearGradient><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#659d99"/></marker></defs>
 <rect x="24" y="22" width="802" height="479" rx="26" fill="url(#sky)"/>
 <circle cx="716" cy="95" r="37" fill="#f1cf72"/><circle cx="716" cy="95" r="52" fill="none" stroke="#edd999" stroke-width="2" stroke-dasharray="2 10"/>
 <path d="M25 347L169 174L269 299L343 242L514 387V501H25Z" fill="url(#mountain)"/><path d="M128 224L169 174L215 231L178 217L160 236Z" fill="#e8eee0"/><path d="M25 385Q221 326 438 377T827 380V501H25Z" fill="url(#meadow)"/>
 <path d="M265 305Q307 354 287 375T365 415Q419 409 457 442H601" fill="none" stroke="#cce8d9" stroke-width="28"/><path d="M265 305Q307 354 287 375T365 415Q419 409 457 442H601" fill="none" stroke="#58b2c1" stroke-width="21"/>
 <path d="M514 364Q609 356 827 360V480Q827 501 805 501H474Q483 477 524 457Q556 429 509 411Z" fill="url(#sea)"/>
 ${[0,1,2,3].map(i=>`<path d="M${548+i*7} ${393+i*24}q28-8 55 0t55 0t55 0" stroke="#cceee6" stroke-width="3" fill="none" opacity=".7"/>`).join('')}
 <g opacity="${.25+.75*smooth(.12,.4,p)}">${cloud(385,147,1+.08*smooth(.12,.4,p))}${cloud(570,164,.48)}</g>
 <path d="M635 366C698 263 681 203 580 161" fill="none" stroke="#c5a552" stroke-width="3" stroke-dasharray="5 10" opacity="${1-.76*smooth(.2,.35,p)}" marker-end="url(#a)"/>
 ${dots}${drops}<path d="${trace}" fill="none" stroke="#fff9d5" stroke-width="3" opacity=".8"/>

 <g opacity="${smooth(.2,.35,p)*(1-smooth(.45,.6,p))}">${Array.from({length:14},(_,i)=>`<circle cx="${322+(i%7)*22}" cy="${122+Math.floor(i/7)*21}" r="${3+i%3}" fill="#7abcca"/>`).join('')}</g>
 <g transform="translate(${pos[0]} ${pos[1]})"><circle r="21" fill="#fffceee5" stroke="#bf944b" stroke-width="2"/><g opacity="${gas}">${molecule(-7,-5,.75)}${molecule(7,-3,.75)}${molecule(0,7,.75)}</g><g opacity="${1-gas}"><ellipse cy="${1+joined*5}" rx="${8+joined*7}" ry="${10-joined*5}" fill="url(#rain-glass)" stroke="#e2f6ef"/><path d="M-4 -4Q-5 0-4 3" fill="none" stroke="#fff" stroke-width="2" opacity="${1-joined}"/><path d="M-13 4q6-4 12 0t13 0" fill="none" stroke="#e7fff4" opacity="${joined}"/></g></g>

 ${label(639,286,t('蒸发'))}${label(385,71,t('凝结成云'))}${label(209,312,t('降雨'))}${label(370,467,t('河流'))}${label(727,474,t('海洋'))}`};
}
