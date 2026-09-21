import { basinRiver, basinGrain, watershedState, waterParcel, surfaceIndex, type Settings } from './watershedModel.ts';
import { poreOffset } from '../ground-water/model.ts';
const noise=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
const path=(points:readonly (readonly number[])[])=>points.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join('');
const river=path(Array.from({length:90},(_,i)=>basinRiver(i/89)));
const tree=(x:number,y:number,s:number)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="17" rx="13" ry="4" fill="#274f5520"/><path d="M0-12V17" stroke="#867760" stroke-width="3"/><path d="M0-39L-18-8H-10L-23 5H23L10-8H18Z" fill="url(#canopy)"/><path d="M0-35L-12-11H0Z" fill="#bfceb288"/></g>`;
const staticTrees=Array.from({length:49},(_,i)=>tree(316+noise(i+80)*314,227+noise(i+190)*76,.38+noise(i+600)*.43)).join('');
const texture=Array.from({length:155},(_,i)=>{const x=106+noise(i+500)*590,y=425+noise(i+41)*122;return `<ellipse cx="${x}" cy="${y}" rx="${2+noise(i)*7}" ry="${1+noise(i+10)*3}" fill="${i%3===0?'#c4b695':'#8c806a'}" opacity=".4"/>`;}).join('');
export function drawWatershed(p:number,settings:Settings,iceProgress:number,tracer:number,labels:boolean){
 const {parcels,pools}=watershedState(p,settings,iceProgress),selected=parcels[tracer]!;
 const track=Array.from({length:Math.ceil(p*150)+1},(_,i)=>waterParcel(Math.min(p,i/150),tracer,settings,iceProgress)).map(d=>[d.x,d.y]);
 const particles=parcels.map(d=>{const r=d.pool==='vapor'?2:d.pool==='ice'?2.6:2.5;return `<g data-water="${d.id}" data-pool="${d.pool}"><circle cx="${d.x}" cy="${d.y}" r="${r}" fill="${d.pool==='vapor'?'#bb9a60':d.pool==='ice'?'#f5ffff':'#2798bd'}" stroke="#f9fff3" stroke-width=".65" opacity="${d.pool==='vapor'?.52:.8}"/></g>`;}).join('');
 const pores=Array.from({length:9},(_,lane)=>{const x=338+lane*7;return `<path d="${path(Array.from({length:32},(_,i)=>{const depth=i*4.9;return [x+poreOffset(depth,lane)+depth*.12,357+depth];}))}" fill="none" stroke="#efdbb6" stroke-width="${settings.surface==='soil'?5:settings.surface==='clay'?2:1}" opacity=".75"/>`;}).join('');
 const grains=Array.from({length:16},(_,id)=>{const g=basinGrain(Math.max(0,(p-.65)/.35),id);return `<circle data-grain="${id}" cx="${g.x}" cy="${g.y}" r="${1.6+id%3*.2}" fill="#dac082" stroke="#8f7948" stroke-width=".3"/>`;}).join('');
 const glyphs=labels?[[375,99,'1'],[369,335,'2'],[499,366,'3'],[681,343,'4'],[227,218,'5']].map(([x,y,n])=>`<g transform="translate(${x} ${y})"><circle r="11" fill="#fff8e7" stroke="#658990"/><text y="4" text-anchor="middle" fill="#335c62" font-size="12">${n}</text></g>`).join(''):'';
 const snow=7+Math.max(0,p-.44)/.56*3;
 return {pools,selected,scene:`<defs>
 <linearGradient id="ws-sky" x2=".2" y2="1"><stop stop-color="#b7d3df"/><stop offset=".6" stop-color="#e6ede4"/><stop offset="1" stop-color="#f1e5c9"/></linearGradient>
 <linearGradient id="ws-sea" x2=".7" y2="1"><stop stop-color="#9abfc6"/><stop offset="1" stop-color="#3a7e96"/></linearGradient>
 <linearGradient id="ws-hill" x2="1" y2=".8"><stop stop-color="#c6cdbb"/><stop offset=".5" stop-color="#9fac9a"/><stop offset="1" stop-color="#758e83"/></linearGradient>
 <linearGradient id="ws-land" x2=".6" y2="1"><stop stop-color="#c4cfab"/><stop offset=".5" stop-color="#97b397"/><stop offset="1" stop-color="#637f72"/></linearGradient>
 <linearGradient id="ws-soil" x2="0" y2="1"><stop stop-color="#b5a58a"/><stop offset="1" stop-color="#706e64"/></linearGradient>
 <linearGradient id="ws-water" x2="0" y2="1"><stop stop-color="#bcdfda"/><stop offset=".5" stop-color="#62adbc"/><stop offset="1" stop-color="#397e98"/></linearGradient>
 <linearGradient id="ws-ice" x2="1" y2=".4"><stop stop-color="#f6fbf3"/><stop offset=".5" stop-color="#cde4e4"/><stop offset="1" stop-color="#83adb8"/></linearGradient>
 <radialGradient id="ws-cloud" cx=".35" cy=".2" r=".85"><stop stop-color="#fffef4"/><stop offset=".62" stop-color="#f2f5ed"/><stop offset="1" stop-color="#a9c0c6" stop-opacity=".65"/></radialGradient>
 <radialGradient id="ws-haze"><stop stop-color="#fffbe9" stop-opacity=".55"/><stop offset="1" stop-color="#fffbe9" stop-opacity="0"/></radialGradient>
 <linearGradient id="canopy" x2="1" y2=".3"><stop stop-color="#7c9e78"/><stop offset="1" stop-color="#365e58"/></linearGradient></defs>
 <rect width="1000" height="620" fill="url(#ws-sky)"/>
 <ellipse cx="800" cy="145" rx="320" ry="220" fill="url(#ws-haze)"/><circle cx="812" cy="84" r="22" fill="#f9e8b2" opacity=".72"/>
 <path d="M0 314L110 207L175 253L274 158L388 277L481 221L579 318L700 270L1000 330V500H0Z" fill="#9eb7b3" opacity=".36"/>
 <path d="M0 373L95 291L182 184L234 219L314 315L404 319L499 372Z" fill="url(#ws-hill)"/>
 <path d="M182 184L210 254L285 297L314 315L234 219Z" fill="#677f7b" opacity=".42"/>
 <path d="M139 235L182 184L234 219L222 228L203 223L194 240L176 225L158 243Z" fill="#eef3e9"/>
 <path d="M0 380Q193 290 375 328Q510 287 747 348L854 420L781 469L0 426Z" fill="url(#ws-land)"/>
 <path d="M0 426Q302 340 565 400L781 469V620H0Z" fill="url(#ws-soil)"/>
 <path d="M0 486Q253 435 460 467T781 518M0 545Q253 489 460 523T781 570" fill="none" stroke="#d1c1a0" stroke-width="3" opacity=".35"/>${texture}
 <path d="M742 349Q852 333 1000 326V620H773L782 470Q754 438 769 418Q790 393 742 349Z" fill="url(#ws-sea)"/>
 ${Array.from({length:21},(_,i)=>`<path d="M${808+noise(i+10)*105} ${367+i*10}q21-3 51 0t54 0" stroke="#d5e9e0" opacity="${.12+noise(i+50)*.15}" fill="none"/>`).join('')}
 ${staticTrees}
 <path d="M186 212Q205 240 223 242T274 291" fill="none" stroke="#d8d1b8" stroke-width="${snow+8}" stroke-linecap="round"/>
 <path d="M186 212Q205 240 223 242T274 291" fill="none" stroke="url(#ws-ice)" stroke-width="${snow}" stroke-linecap="round"/>
 ${Array.from({length:9},(_,i)=>`<path d="M${200+i*6} ${231+i*5.5}l8-3" stroke="#6996a3" stroke-width=".9" opacity=".48"/>`).join('')}
 <path d="M274 291Q302 308 285 327T365 354" fill="none" stroke="#88c1c9" stroke-width="3.5"/>
 <path d="${river}" fill="none" stroke="#596f6038" stroke-width="28" stroke-linecap="round" transform="translate(0 3)"/>
 <path d="${river}" fill="none" stroke="#d6caa4" stroke-width="23" stroke-linecap="round"/>
 <path d="${river}" fill="none" stroke="url(#ws-water)" stroke-width="17" stroke-linecap="round"/>
 <path d="M609 338Q632 347 649 360M701 371C733 355 761 424 860 415" fill="none" stroke="url(#ws-water)" stroke-width="13" stroke-linecap="round"/>
 <path d="M626 358Q648 341 677 349T720 371Q696 393 664 384T626 358Z" fill="url(#ws-water)" stroke="#d0d6b5" stroke-width="3"/>
 <path d="M638 362Q672 355 704 369" fill="none" stroke="#eff5de" stroke-width="1" opacity=".7"/>
 ${pores}
 <path d="M343 353L410 366" stroke="${['#d7c59e','#ad8d73','#abbabb'][surfaceIndex(settings.surface)]}" stroke-width="7"/>
 <ellipse cx="414" cy="369" rx="${5+pools.surface*.25}" ry="2.6" fill="#79b8c6" opacity=".7"/>
 ${grains}
 <g opacity="${.5+Math.min(1,p/.22)*.5}">${Array.from({length:19},(_,i)=>`<ellipse cx="${269+noise(i+117)*284}" cy="${118+noise(i+47)*34}" rx="${23+noise(i+880)*40}" ry="${18+noise(i+930)*26}" fill="url(#ws-cloud)"/>`).join('')}</g>
 <path d="${path(track)}" fill="none" stroke="#e6bc63" stroke-width="1.8" opacity=".75" stroke-dasharray="4 4"/>
 ${particles}<circle cx="${selected.x}" cy="${selected.y}" r="9" fill="none" stroke="#8b622e" stroke-width="1.8"/><circle cx="${selected.x}" cy="${selected.y}" r="12" fill="none" stroke="#fff6d7" stroke-width="1.3"/>
 ${glyphs}`};
}
