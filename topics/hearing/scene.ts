import { t } from './i18n.ts';
import { hearingSequence, membraneDisplacement } from './model.ts';
const text=(x:number,y:number,value:string,anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${value}</text>`;
const defs=(prefix:string)=>`<defs>
<linearGradient id="${prefix}-paper" x2=".7" y2="1"><stop stop-color="#fcf8ef"/><stop offset="1" stop-color="#e8e6d7"/></linearGradient>
<linearGradient id="${prefix}-skin" x1=".15" y1="0" x2=".9" y2="1"><stop stop-color="#f4d5bc"/><stop offset=".45" stop-color="#e9bda5"/><stop offset="1" stop-color="#b87765"/></linearGradient>
<linearGradient id="${prefix}-bone" x1="0" x2="1" y2="1"><stop stop-color="#fff9df"/><stop offset=".52" stop-color="#e1cda4"/><stop offset="1" stop-color="#ac926c"/></linearGradient>
<radialGradient id="${prefix}-fluid" cx=".32" cy=".25" r=".85"><stop stop-color="#e3eee5"/><stop offset=".7" stop-color="#abc9c3"/><stop offset="1" stop-color="#7fa4a0"/></radialGradient>
<linearGradient id="${prefix}-cell" x1="0" x2="1"><stop stop-color="#a8b8a0"/><stop offset=".34" stop-color="#edf0d4"/><stop offset=".7" stop-color="#cbd5b1"/><stop offset="1" stop-color="#819d88"/></linearGradient>
<radialGradient id="${prefix}-nucleus"><stop stop-color="#b5a7a8"/><stop offset="1" stop-color="#867b8e"/></radialGradient>
<filter id="${prefix}-shadow" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#715b42" flood-opacity=".18"/></filter>
<pattern id="${prefix}-grain" width="19" height="17" patternUnits="userSpaceOnUse"><circle cx="3" cy="5" r=".7" fill="#a99175" opacity=".13"/><circle cx="12" cy="13" r=".6" fill="#fff" opacity=".65"/></pattern>
</defs>`;
const spiral=()=>Array.from({length:130},(_,i)=>{const a=i/129*Math.PI*4.65,r=64*(1-i/145);return `${i?'L':'M'}${(532+Math.cos(a)*r).toFixed(2)} ${(273+Math.sin(a)*r*.78).toFixed(2)}`;}).join(' ');
export function createHearingScene(){
 document.getElementById('ear-art')!.innerHTML=defs('ear')+`<rect width="720" height="470" fill="url(#ear-paper)"/><rect width="720" height="470" fill="url(#ear-grain)"/>
 <path d="M254 67C337 30 498 46 651 117L679 412H220Z" fill="#e6d6bb" opacity=".45"/>
 <path d="M100 95C52 108 48 180 60 234C68 270 55 305 80 343C98 375 116 393 142 375C167 356 160 325 178 306C208 278 205 233 196 192C192 141 153 86 100 95Z" fill="url(#ear-skin)" stroke="#b98470" stroke-width="2" filter="url(#ear-shadow)"/>
 <path d="M111 114C75 121 73 175 80 215Q108 195 119 223C137 260 96 272 110 301Q125 326 147 300C178 268 185 224 174 182C167 142 146 113 111 114Z" fill="#d39f89" stroke="#f6d6bf" stroke-width="7"/>
 <path d="M123 150Q157 173 148 202Q125 222 143 248Q170 260 155 288" fill="none" stroke="#b47965" stroke-width="6" stroke-linecap="round"/>
 <path d="M145 235C205 223 257 224 337 230L360 287C267 269 202 268 151 281Z" fill="#b78571" stroke="#c79e85" stroke-width="12"/>
 <path d="M161 249Q257 237 342 247L348 268Q254 253 164 267Z" fill="#725b50" opacity=".75"/>
 <path d="M361 207Q399 183 449 218L466 292Q421 309 383 292Z" fill="#b8aaa0" opacity=".55"/>
 <path d="M416 295L461 373" fill="none" stroke="#cba890" stroke-width="20" stroke-linecap="round"/><path d="M416 295L461 373" fill="none" stroke="#967767" stroke-width="6" stroke-linecap="round"/>
 <g id="eardrum"><path d="M335 220Q360 244 361 284Q344 280 335 263Q326 241 335 220Z" fill="#eee3ca" fill-opacity=".78" stroke="#a38d70" stroke-width="2"/><path d="M336 223L353 257L359 280M353 257L333 244" stroke="#c1ad89" fill="none"/></g>
 <g id="ossicles" fill="url(#ear-bone)" stroke="#9e8766" stroke-width="1.7" filter="url(#ear-shadow)"><path d="M353 256L350 214Q341 196 353 190Q367 185 373 199L366 220L358 258Z"/><path d="M373 201Q380 183 393 195L407 231L398 236L384 209L376 215Z"/><path d="M405 230L438 236L442 257L414 255L408 247L434 248L431 240L406 239Z"/></g>
 <path d="M458 226Q485 210 479 184C469 150 480 103 506 103C537 103 542 143 521 164M487 178C457 174 444 143 458 122C475 97 506 105 513 139M512 181C531 158 562 166 570 189Q578 221 550 222" fill="none" stroke="#abbdac" stroke-width="13" opacity=".8"/><path d="M458 226Q485 210 479 184C469 150 480 103 506 103C537 103 542 143 521 164" fill="none" stroke="#e4edde" stroke-width="4" opacity=".8"/>
 <path d="M441 244Q460 237 478 273" fill="none" stroke="#c9d2b9" stroke-width="23"/>
 <path d="${spiral()}" fill="none" stroke="#9ea795" stroke-width="24" stroke-linecap="round" filter="url(#ear-shadow)"/><path d="${spiral()}" fill="none" stroke="url(#ear-fluid)" stroke-width="19" stroke-linecap="round"/><path d="${spiral()}" fill="none" stroke="#eff5df" stroke-width="3" opacity=".7"/>
 <path d="M550 266Q582 246 612 238L670 221" fill="none" stroke="#c4ad69" stroke-width="12"/><path d="M550 266Q582 246 612 238L670 221" fill="none" stroke="#eddda6" stroke-width="4"/>
 <path id="nerve-route" d="M550 266Q582 246 612 238L670 221" fill="none" stroke="#8e6d99" stroke-width="4" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><circle id="nerve-dot" r="5" fill="#82638b" opacity="0"/>
 <g id="air-waves" fill="none" stroke="#557f83" stroke-width="3" stroke-linecap="round"></g><ellipse id="cochlea-glow" cx="532" cy="271" rx="67" ry="56" fill="#c5b971" opacity="0"/>
 <g id="brain-mark" transform="translate(674 217)" opacity="0"><circle r="17" fill="#ded5e0" stroke="#96749a"/><path d="M-8 2L0-7L9 1L1 9Z" fill="none" stroke="#96749a"/></g>
 ${text(65,61,t('外耳'))}${text(335,88,t('中耳'))}${text(531,63,t('内耳'))}
 <path d="M244 45V96M428 45V96" stroke="#bdb3a1" stroke-dasharray="3 5"/>
 ${text(111,417,t('耳廓'),'middle')}${text(247,312,t('耳道'),'middle')}${text(325,353,t('鼓膜'),'middle')}<path d="M327 337L346 289" stroke="#968370"/>
 ${text(371,145,t('听小骨'),'middle')}<path d="M376 152L377 189" stroke="#968370"/>
 ${text(526,365,t('耳蜗'),'middle')}<path d="M528 348V327" stroke="#968370"/>
 ${text(652,189,t('向脑'),'middle')}${text(641,421,t('概念纵切面'),'end')}`;
 const tinyCells=Array.from({length:18},(_,i)=>`<g id="strip-cell-${i}" transform="translate(${88+i*24} 231)"><path d="M-4-8Q-8-21-4-29H4Q9-15 4-8Z" fill="url(#micro-cell)" stroke="#8fa088" stroke-width=".8"/><path d="M-3-29v-7m3 7v-9m3 9v-11" stroke="#758b76" stroke-width="1.3"/></g>`).join('');
 const support=Array.from({length:5},(_,i)=>{const x=136+i*73;return `<path d="M${x} 742q17-15 29 0l16 122q-11 18-48 0Z" fill="url(#micro-cell)" fill-opacity=".53" stroke="#9baa8c" stroke-width="1"/><ellipse cx="${x+14}" cy="829" rx="7" ry="11" fill="#9f9c89" opacity=".4"/>`;}).join('');
 document.getElementById('detail-art')!.innerHTML=defs('micro')+`<rect width="600" height="980" fill="url(#micro-paper)"/><rect width="600" height="980" fill="url(#micro-grain)"/>
 ${text(32,43,t('把耳蜗轻轻展开'))}${text(32,69,t('位置表示相对高低音，不标真实频率'))}
 <path d="M54 127Q254 109 546 96V226Q315 208 54 222Z" fill="url(#micro-fluid)" stroke="#9cae9f" stroke-width="2"/><path d="M54 235Q315 221 546 245V332Q330 347 54 291Z" fill="#c0d2c7" stroke="#9cae9f" stroke-width="2"/>
 <path d="M54 226Q306 213 546 233" stroke="#f4e8bb" stroke-width="13" fill="none"/>
 <path id="basilar-membrane" d="M54 230H546" stroke="#ab9162" stroke-width="3" fill="none"/>
 <path d="M68 140Q277 126 530 115" stroke="#f2f7e9" stroke-width="3" fill="none" opacity=".65"/>${tinyCells}
 <path id="response-envelope" fill="#c0a961" opacity=".16"/><path id="place-marker" d="M160 309V346" stroke="#ac8458" stroke-width="2"/><circle id="place-circle" cx="160" cy="230" r="24" fill="none" stroke="#b88856" stroke-width="1.5" stroke-dasharray="4 4"/>
 ${text(67,379,t('基底端 · 偏高音'))}${text(542,379,t('顶端 · 偏低音'),'end')}${text(300,417,t('膜上不同位置，回应不同音高'),'middle')}
 <g id="cell-tissue"><path d="M90 731Q300 715 518 736V872H90Z" fill="#d9d7b7" stroke="#a8af8e" stroke-width="1.5"/>${support}
 <path d="M84 560Q279 548 521 565L518 731Q300 715 90 731Z" fill="url(#micro-fluid)" fill-opacity=".66"/>
 <path d="M84 559Q279 547 521 564" fill="none" stroke="#e8f0df" stroke-width="4"/>
 <g id="hair-cell"><path d="M244 704C223 737 228 781 246 811Q265 837 295 817C321 795 315 748 304 705Z" fill="url(#micro-cell)" stroke="#819b80" stroke-width="2"/>
 <path d="M249 720Q236 758 251 792" stroke="#f7f7de" stroke-width="4" fill="none" opacity=".7"/>
 <ellipse cx="273" cy="786" rx="17" ry="23" fill="url(#micro-nucleus)"/><ellipse cx="268" cy="781" rx="5" ry="7" fill="#cdc0bd" opacity=".65"/>
 <g id="stereocilia" fill="none" stroke-linecap="round"><path d="M247 706v-36M258 705v-45M269 704v-54M280 704v-63M291 705v-72" stroke="#749178" stroke-width="7"/><path d="M246 701v-29m11 29v-40m11 40v-49m11 49v-58m11 58v-67" stroke="#d8e1be" stroke-width="2"/><path d="M247 671L257 661M258 661L268 652M269 652L279 643M280 643L290 635" stroke="#867d59" stroke-width="1.3"/></g>
 <g id="ions" fill="#c7944c" stroke="#fff2c1" stroke-width="1"></g><g id="vesicles" fill="#c4ac70" stroke="#8f8158" stroke-width="1"><circle cx="263" cy="814" r="3"/><circle cx="273" cy="820" r="3"/><circle cx="284" cy="813" r="3"/></g></g>
 <path d="M244 826Q265 846 297 829L287 849Q268 858 250 843Z" fill="#d1bd82" stroke="#a08754" stroke-width="2"/><path id="cell-nerve" d="M270 846Q275 890 424 901" fill="none" stroke="#b7a06c" stroke-width="11" stroke-linecap="round"/><path id="cell-signal" d="M270 846Q275 890 424 901" fill="none" stroke="#8e6d99" stroke-width="4" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
 <path d="M92 871H518" stroke="#bbaa82" stroke-width="7"/>
 </g>
 <g id="flow-arrows" fill="none" stroke="#658f8a" stroke-width="2"><path d="M173 610H223m-7-5 7 5-7 5M323 610H373m-7-5 7 5-7 5"/></g>
 ${text(31,541,t('一枚内毛细胞的局部原理'))}${text(47,614,t('液体'))}${text(341,659,t('纤毛束'))}<path d="M338 665L302 675" fill="none" stroke="#968370"/>
 ${text(355,758,t('感觉细胞'))}${text(354,808,t('支持细胞'))}${text(433,912,t('神经'),'end')}
 ${text(32,956,t('尺度再次放大；略去盖膜和其他细胞'))}`;
}
function trace(id:string,p:number){const path=document.getElementById(id) as unknown as SVGPathElement;path.setAttribute('stroke-dashoffset',String(1-p));return path.getPointAtLength(path.getTotalLength()*p);}
export function drawHearing(progress:number,pitch:number,strength:number){
 const s=hearingSequence(progress,pitch,strength);
 document.getElementById('eardrum')!.setAttribute('transform',`translate(${s.deflection*3} 0)`);
 document.getElementById('ossicles')!.setAttribute('transform',`rotate(${s.deflection*2.3} 369 201)`);
 document.getElementById('air-waves')!.innerHTML=Array.from({length:5},(_,i)=>{const x=36+i*54+40*s.air;return `<path d="M${x} ${239-9*s.amplitude}q${5*s.amplitude} 17 0 ${34*s.amplitude}" opacity="${.15+.7*Math.sin(Math.PI*s.air)}"/>`;}).join('');
 document.getElementById('cochlea-glow')!.setAttribute('opacity',String(.18*Math.sin(Math.PI*s.cochlea)));
 const pt=trace('nerve-route',s.nerve);const dot=document.getElementById('nerve-dot')!;dot.setAttribute('cx',String(pt.x));dot.setAttribute('cy',String(pt.y));dot.setAttribute('opacity',s.nerve>0&&s.nerve<1?'1':'0');
 document.getElementById('brain-mark')!.setAttribute('opacity',String(s.brain));
 const wave=Array.from({length:91},(_,i)=>{const x=i/90;return `${i?'L':'M'}${54+x*492} ${230+membraneDisplacement(x,progress,pitch,strength)*24}`;}).join(' ');
 document.getElementById('basilar-membrane')!.setAttribute('d',wave);
 const envelope=Array.from({length:91},(_,i)=>{const x=i/90;return `L${54+x*492} ${230-40*Math.exp(-Math.pow((x-s.place)/.18,2))*s.amplitude}`;}).join(' ');
 document.getElementById('response-envelope')!.setAttribute('d',`M54 230${envelope}L546 230Z`);
 const marker=54+s.place*492;document.getElementById('place-marker')!.setAttribute('d',`M${marker} 309V346`);document.getElementById('place-circle')!.setAttribute('cx',String(marker));
 for(let i=0;i<18;i++){const x=88+i*24;document.getElementById(`strip-cell-${i}`)!.setAttribute('transform',`translate(${x} ${239+membraneDisplacement((x-54)/492,progress,pitch,strength)*24})`);}
 document.getElementById('hair-cell')!.setAttribute('transform',`translate(0 ${s.deflection*2})`);
 document.getElementById('stereocilia')!.setAttribute('transform',`skewX(${-s.deflection*10}) translate(${Math.tan(s.deflection*10*Math.PI/180)*704} 0)`);
 document.getElementById('flow-arrows')!.setAttribute('transform',`translate(${s.deflection*8} 0)`);
 document.getElementById('ions')!.innerHTML=Array.from({length:5},(_,i)=>{const phase=Math.max(0,Math.min(1,s.transduction*2-i*.2));return `<circle cx="${259+i*7}" cy="${614+phase*89}" r="3" opacity="${Math.sin(Math.PI*phase)}"/>`;}).join('');
 trace('cell-signal',s.nerve);document.getElementById('vesicles')!.setAttribute('transform',`translate(0 ${5*Math.sin(Math.PI*s.transduction)})`);
 return s;
}
