import { animalOutline,animalPoint,cellOffset,curvePoint,hasPart,processState,respirationFrame,respirationLayout,type Box,type Cell,type Part,type Process } from './model.ts';
const $=(id:string)=>document.getElementById(id)!;
function organelle(x:number,y:number,angle:number,kind:'mitochondrion'|'chloroplast',scale=1){
 const green=kind==='chloroplast';
 const inside=green?[-23,-4,16].map((cx,i)=>Array.from({length:4},(_,j)=>`<ellipse cx="${cx}" cy="${-8+j*5+(i%2)*2}" rx="10" ry="3.3" fill="url(#thylakoid)" stroke="#3c754e" stroke-width=".8"/>`).join('')).join(''):`<path d="M-35 0C-35-12-28-16-22-16C-16-16-21 9-13 9S-15-18-5-17S-7 11 3 11S1-16 12-15S12 8 22 6S20-10 27-8C43 0 30 18 5 18S-31 15-35 0Z" fill="#dbad8e" stroke="#9f6655" stroke-width="2.1"/><path d="M-33-1C-32-10-28-13-23-13C-20-13-24 12-13 12S-12-16-5-14S-5 14 3 14S5-14 12-12S13 11 23 8" fill="none" stroke="#f6d7bc" stroke-width="1.1"/>`;
 return `<g data-structure="${kind}" transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><ellipse cy="5" rx="43" ry="22" fill="#4d4b3b" opacity=".12"/><ellipse rx="43" ry="23" fill="url(#${green?'chloroplast':'mitochondrion'})" stroke="${green?'#527d58':'#b2836e'}" stroke-width="2.1"/>${green?'<ellipse rx="39.6" ry="19.6" fill="none" stroke="#a2c492" stroke-width="1.2"/>':''}${green?'<path d="M-30 0Q0 8 28-1" fill="none" stroke="#769860" stroke-width="2"/>':''}${inside}<path d="M-30-13Q-10-25 17-15" fill="none" stroke="#fff9df" stroke-width="1.4" opacity=".7"/></g>`;
}
function nucleus(cell:Cell,x:number,y:number,rx:number){
 const id=`nucleus-${cell}`,ry=rx*.85;
 const threads=[
  'M-.8-.25C-.4-.9 .3-.75 .05-.15S-.8.3-.4.55S.6.8.65.12',
  'M-.68.2C-.82-.4-.05-.5.3-.7S.7-.2.38.08S-.1.5.25.63',
  'M-.5-.55C-.1-.7.9-.35.6.15S0-.05-.35.1S-.6.6-.14.72',
  'M-.72-.1C-.2.4.45-.52.63-.2S.35.72-.14.35S-.32-.62.12-.72',
 ];
 const chromatin=threads.map(path=>{let axis=0;return `<path d="${path.replace(/-?(?:\d*\.)?\d+/g,n=>String(Number(n)*(axis++%2?ry:rx))+' ')}"/>`;}).join('');
 const pores=Array.from({length:11},(_,i)=>{const a=i*Math.PI*2/11;return `<ellipse cx="${Math.cos(a)*(rx-3)}" cy="${Math.sin(a)*(ry-3)}" rx="3" ry="1.6" transform="rotate(${a*180/Math.PI+90} ${Math.cos(a)*(rx-3)} ${Math.sin(a)*(ry-3)})" fill="#796e8b" stroke="#d8ccd9" stroke-width="1"/>`;}).join('');
 return `<g transform="translate(${x} ${y})"><defs><clipPath id="${id}"><ellipse rx="${rx-7}" ry="${ry-7}"/></clipPath></defs><g data-structure="nucleus"><ellipse cy="6" rx="${rx+2}" ry="${ry}" fill="#6e5367" opacity=".13"/><ellipse rx="${rx}" ry="${ry}" fill="url(#nucleoplasm)" stroke="#928296" stroke-width="3"/><ellipse rx="${rx-4}" ry="${ry-4}" fill="none" stroke="#ece1e6" stroke-width="1.4"/>${pores}<ellipse cx="${rx*.23}" cy="${-ry*.24}" rx="${rx*.19}" ry="${ry*.2}" fill="url(#nucleolus)"/><path d="M${-rx*.6} ${-ry*.68}Q0 ${-ry} ${rx*.4} ${-ry*.7}" fill="none" stroke="#fff4f0" opacity=".75" stroke-width="2"/></g><g data-structure="dna" clip-path="url(#${id})" fill="none" stroke="#90739a" stroke-width="2.2" stroke-linecap="round" opacity=".83">${chromatin}</g></g>`;
}
function granules(cell:Cell){
 return `<g fill="#8f7462" opacity=".28">${Array.from({length:125},(_,i)=>{const a=i*2.39996,r=42+((i*31)%149);let x=360+Math.cos(a)*r*1.1,y=245+Math.sin(a)*r*.79;if(cell==='plant'){x=158+(i*37)%398;y=i%2?88+(i%7)*4:385-(i%7)*3;}return `<circle cx="${x}" cy="${y}" r="${.9+i%3*.32}"/>`;}).join('')}</g>`;
}
function animal(){
 const lipids=Array.from({length:91},(_,i)=>{const a=i*Math.PI*2/91,o=animalPoint(a,0),n=animalPoint(a,8);return `<path d="M${o.x} ${o.y}L${n.x} ${n.y}" stroke="#b78076" stroke-width="1.1"/><circle cx="${o.x}" cy="${o.y}" r="2.2" fill="#e9bdab"/><circle cx="${n.x}" cy="${n.y}" r="1.7" fill="#eed0ba"/>`;}).join('');
 return `<path d="${animalOutline(-4)}" transform="translate(0 9)" fill="#8c6d5e" opacity=".12"/><g data-structure="membrane"><path d="${animalOutline()}" fill="url(#animal-cytoplasm)" stroke="#b38075" stroke-width="3"/><path d="${animalOutline(8)}" fill="none" stroke="#dfb39b" stroke-width="1.4"/>${lipids}</g>${granules('animal')}<g fill="none" stroke-linecap="round"><path d="M255 205Q218 147 302 132T421 145M249 218Q205 154 289 119T432 139M252 232Q210 180 235 157" stroke="#c39688" stroke-width="5"/><path d="M258 205Q221 148 302 135T419 148M251 216Q210 156 290 122T429 142" stroke="#efc7b0" stroke-width="1.5"/><path d="M405 287q12 50 64 39m-71-27q14 49 59 41m-58-26q13 39 45 40" stroke="#cc9984" stroke-width="5"/></g>${organelle(239,329,-20,'mitochondrion')}${organelle(473,168,24,'mitochondrion',.9)}${organelle(478,331,-27,'mitochondrion')}${nucleus('animal',345,248,78)}<path class="surface-veil" d="${animalOutline(1)}" fill="url(#animal-skin)" opacity="0" pointer-events="none"/>`;
}
function plant(){
 return `<rect x="129" y="62" width="469" height="366" rx="51" fill="#58724b" opacity=".13" transform="translate(0 8)"/><rect x="129" y="62" width="469" height="366" rx="51" fill="url(#wall)" stroke="#77936a" stroke-width="2"/><rect x="135" y="68" width="457" height="354" rx="46" fill="none" stroke="#d1d8a3" stroke-width="2"/><g stroke="#a5b487" stroke-width="1" opacity=".6">${Array.from({length:14},(_,i)=>`<path d="M${166+i*28} 63v12m0 341v11"/>`).join('')}</g><g data-structure="membrane"><rect x="145" y="78" width="437" height="334" rx="37" fill="url(#plant-cytoplasm)" stroke="#759575" stroke-width="2.5"/><rect x="150" y="83" width="427" height="324" rx="33" fill="none" stroke="#d1dfb2" stroke-width="1.8"/></g>${granules('plant')}<g data-structure="vacuole"><path d="M297 148C344 137 466 137 513 163S544 265 526 320S417 360 324 351S284 298 276 244S267 161 297 148Z" fill="url(#vacuole)" stroke="#9fbfb1" stroke-width="2.2"/><path d="M310 160Q408 138 500 171" fill="none" stroke="#f9fff2" stroke-width="3" opacity=".9"/></g>${organelle(209,113,-8,'chloroplast')}${organelle(343,109,2,'chloroplast')}${organelle(484,110,8,'chloroplast')}${organelle(543,258,86,'chloroplast')}${organelle(447,380,-4,'chloroplast')}${organelle(309,380,3,'chloroplast')}${organelle(212,358,16,'mitochondrion',.85)}${nucleus('plant',215,248,52)}<rect class="surface-veil" x="145" y="78" width="437" height="334" rx="37" fill="url(#plant-skin)" opacity="0" pointer-events="none"/>`;
}
function bacterium(){
 return `<rect x="133" y="134" width="459" height="225" rx="112" fill="#8e794c" opacity=".13" transform="translate(0 9)"/><rect x="128" y="129" width="469" height="224" rx="112" fill="url(#bacterial-wall)" stroke="#b7a172" stroke-width="2.4"/><g data-structure="membrane"><rect x="141" y="142" width="443" height="198" rx="99" fill="url(#bacterial-cytoplasm)" stroke="#a49163" stroke-width="2.5"/><rect x="146" y="147" width="433" height="188" rx="94" fill="none" stroke="#e9d4a4" stroke-width="1.4"/></g><g fill="#a28752" opacity=".52">${Array.from({length:70},(_,i)=>{const a=i*2.39996,r=35+(i*29)%125;return `<ellipse cx="${361+Math.cos(a)*r*1.16}" cy="${243+Math.sin(a)*r*.55}" rx="2.5" ry="1.9"/>`;}).join('')}</g><g data-structure="dna" fill="none" stroke-linecap="round"><path d="M283 235c-18-31 16-53 40-26s28 73 57 47s16-77 47-49s42 66 10 69s-59-46-77-25s-51 39-51 14s-9-29-26-30Z" stroke="#947247" stroke-width="6"/><path d="M284 232c-18-31 16-53 40-26s28 73 57 47s16-77 47-49s42 66 10 69s-59-46-77-25s-51 39-51 14s-9-29-26-30Z" stroke="#d3ae75" stroke-width="2"/></g><rect class="surface-veil" x="141" y="142" width="443" height="198" rx="99" fill="url(#bacterial-skin)" opacity="0" pointer-events="none"/>`;
}
const marker=(kind:string)=>kind==='sugar'?'<path d="M-7-4L0-8L7-4V4L0 8L-7 4Z" fill="#dca654" stroke="#8d6532" stroke-width="1.2"/>':kind==='oxygen'?'<circle cx="-4" r="5" fill="#7eabb6" stroke="#4f7e8d"/><circle cx="4" r="5" fill="#a8c5ca" stroke="#4f7e8d"/>':kind==='water'?'<path d="M0-8C-10 2-7 8 0 8S10 2 0-8Z" fill="#7fb4c6" stroke="#528694"/>':'<circle cx="-7" r="4" fill="#bcb3a3" stroke="#827e75"/><circle r="4.5" fill="#827e75"/><circle cx="7" r="4" fill="#bcb3a3" stroke="#827e75"/>';
function flowLayer(cell:Cell){
 const g=respirationLayout(cell==='plant'?'plant':'animal');
 return `<g id="flow-${cell}" pointer-events="none">
 <g id="light-${cell}" fill="none" stroke="#d6b868" stroke-width="3" opacity="0"><path d="M470 25l4 37m-20-27l13 26m25-28l-9 30"/></g>
 <g id="routes-${cell}" fill="none" stroke="#8b9780" stroke-width="1.8" stroke-dasharray="3 6" opacity=".65"></g>
 <g id="reaction-${cell}" transform="translate(${g.reaction.x} ${g.reaction.y})">
  <ellipse id="reaction-glow-${cell}" rx="60" ry="40" fill="url(#reaction-light)" opacity="0"/>
  <ellipse rx="60" ry="40" fill="none" stroke="#b17d49" stroke-width="1.5" stroke-dasharray="5 4"/>
 </g>
 <g id="input-a-${cell}">${marker('sugar')}</g><g id="input-b-${cell}">${marker('oxygen')}</g>
 <g id="output-a-${cell}">${marker('carbon')}</g><g id="output-b-${cell}">${marker('water')}</g>
 <g id="energy-route-${cell}" fill="none" stroke="#bd882d" stroke-width="2.8" stroke-dasharray="4 6" opacity="0"><path d="M${g.energyStart.x} ${g.energyStart.y}Q${g.energyControl.x} ${g.energyControl.y} ${g.work.x} ${g.work.y}"/></g>
 <g id="work-${cell}" transform="translate(${g.work.x} ${g.work.y})">
  <ellipse id="work-glow-${cell}" rx="60" ry="29" fill="url(#reaction-light)" opacity="0"/>
  <g id="work-pieces-${cell}" stroke="#668877" stroke-width="2">${Array.from({length:5},(_,i)=>`<circle data-piece="${i}" r="7" fill="${i%2?'#c2d6b2':'#91bba5'}"/>`).join('')}</g>
 </g>
 <g id="useful-${cell}" opacity="0"><ellipse rx="30" ry="20" fill="url(#reaction-light)"/><rect x="-20" y="-11" width="40" height="22" rx="11" fill="#f3d27b" stroke="#ad792a" stroke-width="2"/><g fill="#916623"><circle cx="-10" r="2.5"/><circle r="2.5"/><circle cx="10" r="2.5"/></g></g>
 <g id="heat-${cell}" transform="translate(${g.reaction.x+(cell==='plant'?-86:85)} ${g.reaction.y})" opacity="0" fill="none" stroke="#b88360" stroke-width="2"><path d="M-8 19q-9-9 0-18t0-18m12 36q-9-9 0-18t0-18"/></g>
 </g>`;
}
export function createScene(){
 const gradients=`<radialGradient id="reaction-light"><stop stop-color="#f8d987" stop-opacity=".8"/><stop offset="1" stop-color="#f8d987" stop-opacity="0"/></radialGradient><radialGradient id="animal-cytoplasm" cx="32%" cy="23%"><stop stop-color="#f8e8d5"/><stop offset=".62" stop-color="#edccb3"/><stop offset="1" stop-color="#cfa691"/></radialGradient><radialGradient id="plant-cytoplasm" cx="30%" cy="22%"><stop stop-color="#eef0c8"/><stop offset="1" stop-color="#c7d8a3"/></radialGradient><radialGradient id="bacterial-cytoplasm" cx="28%" cy="24%"><stop stop-color="#f7ebc5"/><stop offset="1" stop-color="#d3bb83"/></radialGradient><linearGradient id="wall" x2="0.8" y2="1"><stop stop-color="#cfd7a4"/><stop offset=".5" stop-color="#a2b784"/><stop offset="1" stop-color="#809b6e"/></linearGradient><linearGradient id="bacterial-wall" x2="0" y2="1"><stop stop-color="#e9d9ae"/><stop offset="1" stop-color="#b6a076"/></linearGradient><radialGradient id="vacuole" cx="32%" cy="25%"><stop stop-color="#f8fbec"/><stop offset=".7" stop-color="#e1eee2"/><stop offset="1" stop-color="#bcd3c8"/></radialGradient><radialGradient id="nucleoplasm" cx="30%" cy="23%"><stop stop-color="#ece1e6"/><stop offset=".65" stop-color="#cec0d0"/><stop offset="1" stop-color="#a898b2"/></radialGradient><radialGradient id="nucleolus" cx="28%" cy="25%"><stop stop-color="#b9a1bf"/><stop offset="1" stop-color="#8b779b"/></radialGradient><radialGradient id="mitochondrion" cx="28%" cy="22%"><stop stop-color="#f5d7b7"/><stop offset="1" stop-color="#c48f77"/></radialGradient><radialGradient id="chloroplast" cx="30%" cy="20%"><stop stop-color="#c3d69c"/><stop offset="1" stop-color="#6c9568"/></radialGradient><linearGradient id="thylakoid" x2="0" y2="1"><stop stop-color="#abd191"/><stop offset="1" stop-color="#52885c"/></linearGradient>${['animal','plant','bacterial'].map((c,i)=>`<radialGradient id="${c}-skin" cx="30%" cy="18%"><stop stop-color="${['#fff2db','#f3f4cc','#fff0c9'][i]}" stop-opacity=".45"/><stop offset=".62" stop-color="${['#dfbca4','#a8c28c','#d8bd87'][i]}" stop-opacity=".88"/><stop offset="1" stop-color="${['#a9796a','#708d5d','#a38e63'][i]}"/></radialGradient>`).join('')}`;
 $('cell-scene').innerHTML=`<defs>${gradients}<g id="cell-board">${(['animal','plant','bacterium'] as Cell[]).map(c=>`<g id="specimen-${c}" transform="translate(${cellOffset[c]} 0)">${c==='animal'?animal():c==='plant'?plant():bacterium()}${flowLayer(c)}</g>`).join('')}</g></defs><use href="#cell-board"/><rect id="focus-frame" class="focus-frame" x="0" y="0" width="0" height="0" rx="9"/>`;
 $('detail-scene').innerHTML='<use href="#cell-board"/>';
 $('behavior-scene').innerHTML='<use href="#cell-board"/>';
}
export function setCameras(whole:Box,detail:Box){
 const format=(b:Box)=>`${b.x} ${b.y} ${b.width} ${b.height}`;
 $('cell-scene').setAttribute('viewBox',format(whole));$('detail-scene').setAttribute('viewBox',format(detail));$('behavior-scene').setAttribute('viewBox',format(whole));
 for(const k of ['x','y','width','height'] as const)$('focus-frame').setAttribute(k,String(detail[k]));
}
export function selectPart(cell:Cell,part:Part,outer:number){
 document.querySelectorAll<SVGElement>('#cell-board [data-structure]').forEach(node=>node.classList.toggle('selected',node.dataset.structure===part&&node.closest('[id^="specimen-"]')?.id===`specimen-${cell}`));
 document.querySelectorAll<SVGElement>('.surface-veil').forEach(node=>node.setAttribute('opacity',String(outer*.9)));
 $('focus-frame').setAttribute('opacity',hasPart(cell,part)?'.68':'0');
}
function placeToken(cell:Cell,id:string,kind:string,p:{x:number;y:number},opacity:number){
 const node=$(id+'-'+cell);
 if(node.dataset.kind!==kind){node.innerHTML=marker(kind);node.dataset.kind=kind;}
 node.setAttribute('transform',`translate(${p.x} ${p.y}) scale(1.7)`);node.setAttribute('opacity',String(opacity));
}
function drawRespiration(cell:'animal'|'plant',progress:number){
 const {state:s,layout:g,nutrient,oxygen,energy}=respirationFrame(cell,progress);
 const routes=$('routes-'+cell);
 if(routes.dataset.process!=='respiration'){
  routes.dataset.process='respiration';
  routes.innerHTML=[`M${g.start.x} ${g.start.y}Q${g.approachControl.x} ${g.approachControl.y} ${g.breakdown.x} ${g.breakdown.y}Q${g.transferControl.x} ${g.transferControl.y} ${g.nutrientPort.x} ${g.nutrientPort.y}`,`M${g.oxygenStart.x} ${g.oxygenStart.y}Q${g.oxygenControl.x} ${g.oxygenControl.y} ${g.oxygenPort.x} ${g.oxygenPort.y}`,`M${g.carbonStart.x} ${g.carbonStart.y}Q${g.carbonControl.x} ${g.carbonControl.y} ${g.carbonEnd.x} ${g.carbonEnd.y}`,`M${g.waterStart.x} ${g.waterStart.y}Q${g.waterControl.x} ${g.waterControl.y} ${g.waterEnd.x} ${g.waterEnd.y}`].map(d=>`<path d="${d}"/>`).join('');
 }
 // One persistent sugar marker splits in place, then its fragments travel to the
 // same highlighted mitochondrial region as oxygen. Neither vanishes in transit.
 const sugar=$('input-a-'+cell);
 if(sugar.dataset.kind!=='breakdown'){
  sugar.dataset.kind='breakdown';
  sugar.innerHTML='<path data-half="left" d="M-7-4L0-8V8L-7 4Z" fill="#dca654" stroke="#8d6532" stroke-width="1.2"/><path data-half="right" d="M0-8L7-4V4L0 8Z" fill="#e8bd76" stroke="#8d6532" stroke-width="1.2"/>';
 }
 sugar.setAttribute('transform',`translate(${nutrient.x} ${nutrient.y}) scale(1.7)`);
 sugar.setAttribute('opacity',String(1-s.conversion));
 sugar.children[0].setAttribute('transform',`translate(${-4*s.breakdown} ${-2*s.breakdown})`);
 sugar.children[1].setAttribute('transform',`translate(${4*s.breakdown} ${2*s.breakdown})`);
 placeToken(cell,'input-b','oxygen',oxygen,1-s.conversion);
 placeToken(cell,'output-a','carbon',curvePoint(g.carbonStart,g.carbonControl,g.carbonEnd,s.outgoing),s.conversion);
 placeToken(cell,'output-b','water',curvePoint(g.waterStart,g.waterControl,g.waterEnd,s.outgoing),s.conversion);
 $('light-'+cell).setAttribute('opacity','0');
 $('reaction-glow-'+cell).setAttribute('opacity',String(s.conversion));
 $('energy-route-'+cell).setAttribute('opacity',String(s.conversion*.65));
 // ATP is a chemical carrier: the gold badge follows an internal path to work,
 // while already-present building blocks join into a chain at that destination.
 const useful=$('useful-'+cell);
 useful.setAttribute('transform',`translate(${energy.x} ${energy.y-24*s.work})`);
 useful.setAttribute('opacity',String(s.conversion*(1-.65*s.work)));
 $('work-glow-'+cell).setAttribute('opacity',String(s.work));
 const pieces=$('work-pieces-'+cell);
 const loose=[[-49,-18],[-24,18],[0,-17],[27,17],[49,-14]];
 for(let i=0;i<5;i++){
  const x=loose[i][0]+((i-2)*14-loose[i][0])*s.work,y=loose[i][1]*(1-s.work);
  pieces.children[i].setAttribute('cx',String(x));pieces.children[i].setAttribute('cy',String(y));
 }
 $('heat-'+cell).setAttribute('opacity',String(s.conversion*.7));
}
export function drawProcess(cell:Cell,process:Process|null,progress:number){
 for(const c of ['animal','plant','bacterium'] as Cell[])$('flow-'+c).setAttribute('display',c===cell&&process?'inline':'none');
 if(!process||cell==='bacterium')return;
 const photo=process==='photosynthesis';
 for(const id of ['reaction','energy-route','work','heat'])$(id+'-'+cell).setAttribute('display',photo?'none':'inline');
 if(!photo){drawRespiration(cell,progress);return;}
 const s=processState(progress),target={x:484,y:110};
 const startA={x:50,y:142},startB={x:53,y:390},endA={x:387,y:359},endB={x:672,y:93};
 const controlA={x:239,y:126},controlB={x:248,y:260},outControlA={x:498,y:257},outControlB={x:595,y:78};
 const routes=$('routes-'+cell);
 if(routes.dataset.process!==process){routes.dataset.process=process;routes.innerHTML=[`M${startA.x} ${startA.y}Q${controlA.x} ${controlA.y} ${target.x} ${target.y}`,`M${startB.x} ${startB.y}Q${controlB.x} ${controlB.y} ${target.x} ${target.y}`,`M${target.x} ${target.y}Q${outControlA.x} ${outControlA.y} ${endA.x} ${endA.y}`,`M${target.x} ${target.y}Q${outControlB.x} ${outControlB.y} ${endB.x} ${endB.y}`].map(d=>`<path d="${d}"/>`).join('');}
 placeToken(cell,'input-a','carbon',curvePoint(startA,controlA,target,s.incoming),1-s.conversion);
 placeToken(cell,'input-b','water',curvePoint(startB,controlB,target,s.incoming),1-s.conversion);
 placeToken(cell,'output-a','sugar',curvePoint(target,outControlA,endA,s.outgoing),s.conversion);
 placeToken(cell,'output-b','oxygen',curvePoint(target,outControlB,endB,s.outgoing),s.conversion);
 $('light-'+cell).setAttribute('opacity',String(.35+s.conversion*.6));$('useful-'+cell).setAttribute('opacity','0');
}
