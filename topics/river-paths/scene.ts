import { t } from './i18n.ts';
const txt=(x:number,y:number,s:string,size=17)=>`<text x="${x}" y="${y}" font-family="inherit" text-anchor="middle" font-size="${size}" fill="#28514a">${s}</text>`;
export function draw(p:number,condition:number){
 const stage=Math.min(3,Math.floor(p*4)), bend=condition===0?92:condition===1?-72:16;
 const curve=`M400 88C${370+bend} 176 ${370+bend} 201 ${373+bend} 250S${310-bend} 360 438 449`;
 // Both water and sediment share the same two cubic segments.
 const control=[[400,88],[370+bend,176],[370+bend,201],[373+bend,250],[376+bend,299],[310-bend,360],[438,449]];
 const point=(q:number)=>{const j=q<.5?0:3,u=q<.5?q*2:(q-.5)*2,v=1-u;return [0,1].map(k=>v*v*v*control[j]![k]!+3*v*v*u*control[j+1]![k]!+3*v*u*u*control[j+2]![k]!+u*u*u*control[j+3]![k]!);};
 const points=Array.from({length:161},(_,i)=>point(i/160));
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]!+Math.hypot(points[i]![0]!-points[i-1]![0]!,points[i]![1]!-points[i-1]![1]!));
 const atLength=(q:number)=>{const length=q*lengths.at(-1)!;let i=1;while(i<lengths.length-1&&lengths[i]!<length)i++;const a=points[i-1]!,b=points[i]!,f=(length-lengths[i-1]!)/(lengths[i]!-lengths[i-1]!);return [a[0]!+(b[0]!-a[0]!)*f,a[1]!+(b[1]!-a[1]!)*f];};
 const sediment=stage>=2?Array.from({length:23},(_,i)=>{const [x,y]=atLength((i+1)/25*(.2+.8*p));return `<circle cx="${x}" cy="${y}" r="${2+i%3}" fill="#d2a45c"/>`;}).join(''):'';
 // Offset each bank from the local centerline normal and curvature.
 const center=point(.28),before=point(.26),after=point(.30);
 const tangent=[after[0]!-before[0]!,after[1]!-before[1]!],norm=Math.hypot(...tangent);
 const cross=(center[0]!-before[0]!)*(after[1]!-center[1]!)-(center[1]!-before[1]!)*(after[0]!-center[0]!);
 const normal=[-tangent[1]!/norm,tangent[0]!/norm],side=Math.sign(cross)||1;
 const outer=[center[0]!-normal[0]!*side*38,center[1]!-normal[1]!*side*38];
 const inner=[center[0]!+normal[0]!*side*32,center[1]!+normal[1]!*side*32];
 const outerRight=outer[0]!>inner[0]!,outerLabel=outerRight?665:167,innerLabel=outerRight?167:665;

 const rock=condition===2?'':`<g transform="translate(${condition===0?384:290} 217)"><ellipse cx="10" cy="33" rx="61" ry="18" fill="#4e6d54" opacity=".18"/><path d="M-48 10L-29-35L9-49L49-22L58 16L24 42L-27 35Z" fill="#a1afa1" stroke="#6f8578" stroke-width="3"/><path d="M-29-35L-5 5L49-22M-5 5L24 42M-5 5L-48 10" stroke="#c5cdb9" stroke-width="2" fill="none"/></g>`;
 const tree=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="28" rx="24" ry="8" fill="#527b5822"/><path d="M0 2v28" stroke="#8b7650" stroke-width="6"/><circle cy="-12" r="24" fill="#739967"/><circle cx="-11" cy="-18" r="17" fill="#92ac78"/></g>`;
 return {labels:[t('蓝色：水流'),t('金色：泥沙'),t('坡度与过程已放大')],scene:`<defs><linearGradient id="land" x2="0" y2="1"><stop stop-color="#d9e3c4"/><stop offset="1" stop-color="#abc694"/></linearGradient><marker id="flow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#e9f9eb"/></marker></defs>
 <rect x="25" y="23" width="800" height="484" rx="27" fill="url(#land)"/>
 ${Array.from({length:6},(_,i)=>`<path d="M${75+i*9} ${100+i*58}Q240 ${80+i*58} 320 ${105+i*58}T770 ${100+i*58}" stroke="#7d9f6a" stroke-width="2" fill="none" opacity=".16"/>`).join('')}
 ${tree(157,135,1.3)}${tree(680,170,1.1)}${tree(174,379,1)}${tree(657,395,.9)}${tree(732,337,.65)}
 <path d="${curve}" fill="none" stroke="#78966e" stroke-width="86" opacity=".35"/>
 ${stage===3?`<ellipse cx="${outer[0]}" cy="${outer[1]}" rx="27" ry="42" fill="#c58c53" opacity=".8"/><ellipse cx="${inner[0]}" cy="${inner[1]}" rx="27" ry="33" fill="#e0bb76"/>`:''}
 <path d="${curve}" fill="none" stroke="#dce9cc" stroke-width="69" stroke-linecap="round"/><path d="${curve}" fill="none" stroke="#65adb2" stroke-width="55" stroke-linecap="round" pathLength="100" stroke-dasharray="${20+p*80} 100"/>
 <path d="${curve}" fill="none" stroke="#a8e0da" stroke-width="10" stroke-linecap="round" pathLength="100" stroke-dasharray="5 10" opacity=".7"/>
 ${sediment}${rock}
 <path d="M410 106L419 143M411 135L419 143L425 133M410 414L438 446M424 444L438 446L437 432" fill="none" stroke="#f1f9df" stroke-width="4" stroke-linecap="round"/>
 <rect x="69" y="55" width="131" height="39" rx="19" fill="#f9f9e6"/>${txt(134,81,t('高处'))}<rect x="600" y="445" width="160" height="39" rx="19" fill="#f9f9e6"/>${txt(680,471,t('低处'))}
 ${stage===3?`${txt(outerLabel,196,t('外侧冲刷'))}<path d="M${outerLabel+(outerRight?-66:66)} 204L${outer[0]} ${outer[1]}" stroke="#a17441" stroke-width="2"/>${txt(innerLabel,324,t('内侧沉积'))}<path d="M${innerLabel+(outerRight?66:-66)} 316L${inner[0]} ${inner[1]}" stroke="#a17441" stroke-width="2"/>`:txt(641,282,t('把石头换个位置'))}`};
}
