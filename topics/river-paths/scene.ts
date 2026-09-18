import { t } from './i18n.ts';
import { riverGrain, riverParcel, riverPoint, bankPoint } from './model.ts';
export function draw(p:number,condition:number){
 const stage=Math.min(3,Math.floor(p*4)), bend=condition===0?92:condition===1?-190:16;
 const curve=`M400 88C${370+bend} 176 ${370+bend} 201 ${373+bend} 250S${310-bend} 360 438 449`;
 const point=(q:number)=>riverPoint(q,condition);
 const grains=Array.from({length:16},(_,i)=>riverGrain(p,i,condition));
 const sediment=grains.map(g=>`<circle data-grain="${g.id}" cx="${g.x}" cy="${g.y}" r="${g.id===5?5:2.6+g.id%3*.5}" fill="#e6bc68" stroke="${g.id===5?'#7f562b':'#a37a3b'}" stroke-width="${g.id===5?1.6:.6}"/>`).join('');
 const water=Array.from({length:22},(_,i)=>{const parcel=riverParcel(p,i,condition);return `<circle data-water="${i}" cx="${parcel.x}" cy="${parcel.y}" r="${i===8?5:2.2}" fill="${i===8?'#f3fff3':'#d0eeea'}" stroke="#377f99" stroke-width=".6"/>`;}).join('');
 // Offset each bank from the local centerline normal and curvature.
 const center=point(.28),before=point(.26),after=point(.30);
 const tangent=[after[0]!-before[0]!,after[1]!-before[1]!],norm=Math.hypot(...tangent);
 const cross=(center[0]!-before[0]!)*(after[1]!-center[1]!)-(center[1]!-before[1]!)*(after[0]!-center[0]!);
 const normal=[-tangent[1]!/norm,tangent[0]!/norm],side=Math.sign(cross)||1;
 const outer=[center[0]!-normal[0]!*side*38,center[1]!-normal[1]!*side*38];
 const inner=bankPoint(.445,condition,-31);
 const outerRight=outer[0]!>inner[0]!,outerLabel=outerRight?665:167,innerLabel=outerRight?167:665;

 const rock=condition===2?'':`<g transform="translate(${condition===0?384:290} 217)"><ellipse cx="10" cy="33" rx="61" ry="18" fill="#4e6d54" opacity=".18"/><path d="M-48 10L-29-35L9-49L49-22L58 16L24 42L-27 35Z" fill="url(#river-rock)" stroke="#6f8578" stroke-width="3"/><path d="M-29-35L9-49L-5 5L-48 10Z" fill="#d8d7c3" opacity=".5"/><path d="M-5 5L49-22L58 16L24 42Z" fill="#506e63" opacity=".28"/><path d="M-29-35L-5 5L49-22M-5 5L24 42M-5 5L-48 10" stroke="#c5cdb9" stroke-width="2" fill="none"/></g>`;
 const tree=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="28" rx="24" ry="8" fill="#527b5822"/><path d="M0 2v28" stroke="#8b7650" stroke-width="6"/><ellipse cx="7" cy="-6" rx="27" ry="29" fill="#4f785d" opacity=".45"/><path d="M-25-5Q-34-22-19-32Q-16-49 1-43Q21-46 26-30Q41-18 26-3Q20 12 2 8Q-16 16-25-5Z" fill="url(#foliage)"/><path d="M-22-18Q-18-35-2-34Q12-37 19-25" fill="none" stroke="#d5dfad" stroke-width="3" opacity=".65"/></g>`;
 return {focus:[center[0]-175,center[1]-70,350,350*540/850],labels:[t('同一批泥沙：从外岸出发，停在内侧'),t('蓝色：水流'),t('金色：泥沙'),t('坡度与过程已放大'),t('上游在画面上方，下游在下方；外侧冲刷、内侧沉积')],scene:`<defs><linearGradient id="river-rock" x2=".7" y2="1"><stop stop-color="#c9d0be"/><stop offset=".5" stop-color="#9eafa0"/><stop offset="1" stop-color="#6c8278"/></linearGradient><radialGradient id="land-light" cx=".25" cy=".15" r=".95"><stop stop-color="#fff8dc" stop-opacity=".55"/><stop offset="1" stop-color="#fff8dc" stop-opacity="0"/></radialGradient><radialGradient id="foliage" cx=".3" cy=".2"><stop stop-color="#b4c78e"/><stop offset=".6" stop-color="#82a36e"/><stop offset="1" stop-color="#5f855e"/></radialGradient><linearGradient id="stream" x2="1" y2=".4"><stop stop-color="#77b8bc"/><stop offset=".5" stop-color="#4e939f"/><stop offset="1" stop-color="#88c5bf"/></linearGradient><linearGradient id="land" x2="0" y2="1"><stop stop-color="#d9e3c4"/><stop offset="1" stop-color="#abc694"/></linearGradient><marker id="flow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#e9f9eb"/></marker></defs>
 <rect x="25" y="23" width="800" height="484" rx="27" fill="url(#land)"/><rect x="25" y="23" width="800" height="484" rx="27" fill="url(#land-light)"/>
 ${Array.from({length:6},(_,i)=>`<path d="M${75+i*9} ${100+i*58}Q240 ${80+i*58} 320 ${105+i*58}T770 ${100+i*58}" stroke="#7d9f6a" stroke-width="2" fill="none" opacity=".16"/>`).join('')}
 ${tree(157,135,1.3)}${tree(680,170,1.1)}${tree(174,379,1)}${tree(657,395,.9)}${tree(732,337,.65)}
 <path d="${curve}" transform="translate(5 6)" fill="none" stroke="#6b8062" stroke-width="87" stroke-linecap="round" opacity=".22"/><path d="${curve}" fill="none" stroke="#bbaa7c" stroke-width="79" stroke-linecap="round"/><path d="${curve}" fill="none" stroke="#eadcb4" stroke-width="72" stroke-linecap="round"/>
 ${`<g opacity="${grains.reduce((sum,g)=>sum+g.fraction,0)/16}"><ellipse cx="${outer[0]}" cy="${outer[1]}" rx="${12+grains.filter(g=>g.departed).length}" ry="32" fill="#c58c53" opacity=".8"/><ellipse cx="${inner[0]}" cy="${inner[1]}" rx="${8+grains.filter(g=>g.deposited).length}" ry="24" fill="#e0bb76"/></g>`}
 <path d="${curve}" fill="none" stroke="#dce9cc" stroke-width="69" stroke-linecap="round"/><path d="${curve}" fill="none" stroke="url(#stream)" stroke-width="55" stroke-linecap="round"/>
 <path d="${curve}" fill="none" stroke="#c2ede1" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 17" stroke-dashoffset="${-p*20}" opacity=".7"/>
 ${water}${sediment}${rock}
 <path d="M410 106L419 143M411 135L419 143L425 133M410 414L438 446M424 444L438 446L437 432" fill="none" stroke="#f1f9df" stroke-width="4" stroke-linecap="round"/>
 `};
}
