import { animalOutline,animalPoint,cellOffset,curvePoint,hasPart,processState,respirationFrame,respirationLayout,type Box,type Cell,type Part,type Process } from './model.ts';
const $=(id:string)=>document.getElementById(id)!;
function organelle(x:number,y:number,angle:number,kind:'mitochondrion'|'chloroplast',scale=1){
 const green=kind==='chloroplast',id=`organelle-${kind}-${x}-${y}`;
 const inside=green
  ? `<path d="M-24 2Q-13 8-4 2T17 2" fill="none" stroke="#639277" stroke-width="1.8"/>${[-23,-4,16].map((cx,i)=>Array.from({length:4},(_,j)=>`<ellipse cx="${cx}" cy="${-8+j*5+(i%2)*2}" rx="10" ry="3.1" fill="url(#thylakoid)" stroke="#3e755b" stroke-width=".7"/><path d="M${cx-7} ${-9+j*5+(i%2)*2}q7-2 14 0" fill="none" stroke="#d6e8af" stroke-width=".65" opacity=".85"/>`).join('')).join('')}`
  : '<path d="M-35 0C-35-12-28-16-22-16C-16-16-21 9-13 9S-15-18-5-17S-7 11 3 11S1-16 12-15S12 8 22 6S20-10 27-8C43 0 30 18 5 18S-31 15-35 0Z" fill="#e4b49c" stroke="#a46664" stroke-width="1.6"/><path d="M-33-1C-32-10-28-13-23-13C-20-13-24 12-13 12S-12-16-5-14S-5 14 3 14S5-14 12-12S13 11 23 8" fill="none" stroke="#ffe5c9" stroke-width="1.05"/>';
 const stroma=Array.from({length:14},(_,i)=>{const a=i*2.399,r=6+(i*7)%24;return `<circle cx="${Math.cos(a)*r}" cy="${Math.sin(a)*r*.48}" r=".65" fill="${green?'#4b795d':'#995e5e'}" opacity=".22"/>`;}).join('');
 return `<g data-structure="${kind}" transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">
  <defs><clipPath id="${id}"><ellipse rx="37.5" ry="17.8"/></clipPath></defs>
  <ellipse cy="3.4" rx="42" ry="22" fill="#45534b" opacity=".1"/>
  <ellipse rx="43" ry="23" fill="url(#${green?'chloroplast':'mitochondrion'})" stroke="${green?'#537c63':'#a36d66'}" stroke-width="1.55"/>
  <ellipse rx="39.7" ry="19.7" fill="none" stroke="${green?'#e0ebc2':'#ffe6cd'}" stroke-width="1.45"/>
  <ellipse rx="37.7" ry="17.9" fill="none" stroke="${green?'#769975':'#b77f76'}" stroke-width=".75"/>
  <g clip-path="url(#${id})">${stroma}${inside}</g>
  <path d="M-30-13Q-10-23 17-15" fill="none" stroke="#ffffee" stroke-width="1.3" opacity=".75"/>
  <path d="M-29 14Q0 23 27 13" fill="none" stroke="${green?'#3f6b53':'#915857'}" stroke-width=".85" opacity=".45"/>
 </g>`;
}
function nucleus(cell:Cell,x:number,y:number,rx:number){
 const id=`nucleus-${cell}`,ry=rx*.85;
 const chromatin=[
  'M-81-29C-62-52-36-57-42-28S-68 12-45 19S-19-4-8-25S24-43 31-21S4 5 15 23S54 45 43 70',
  'M-68 51C-75 27-56 21-36 36S-11 67 5 51S-2 22-21 20S-48-1-28-10S0 0 7-8',
  'M-47-71C-28-80-10-69-13-48S-25-19-4-13S18-25 28-36S53-40 55-17S34 4 39 25S70 44 76 26',
  'M-8-82C9-91 35-72 26-58S2-58 4-42M62-55C76-42 73-17 58-10S44 2 61 9S85 26 70 45',
  'M-83 1C-63-10-54-3-57 11M-33 77C-14 63 4 75 15 73S30 61 27 49M-71-48C-57-37-66-24-53-23',
 ];
 const threads=`<g transform="scale(${rx/100} ${ry/100})">${chromatin.map((d,i)=>`<path d="${d}" stroke-width="${1.5+i%2*.3}"/>`).join('')}</g>`;
 const pores=Array.from({length:18},(_,i)=>{const a=i*Math.PI*2/18,px=Math.cos(a)*(rx-2.6),py=Math.sin(a)*(ry-2.6);return `<ellipse cx="${px}" cy="${py}" rx="2.2" ry="1.3" transform="rotate(${a*180/Math.PI+90} ${px} ${py})" fill="#81718c" stroke="#f5eaf1" stroke-width=".7"/>`;}).join('');
 return `<g transform="translate(${x} ${y})"><defs><clipPath id="${id}"><ellipse rx="${rx-6}" ry="${ry-6}"/></clipPath></defs>
  <g data-structure="nucleus"><ellipse cy="4" rx="${rx+2}" ry="${ry}" fill="#665978" opacity=".1"/>
   <ellipse rx="${rx}" ry="${ry}" fill="url(#nucleoplasm)" stroke="#8c7c9d" stroke-width="2"/>
   <ellipse rx="${rx-3.8}" ry="${ry-3.8}" fill="none" stroke="#f4e9ef" stroke-width="1.25"/>
   <ellipse rx="${rx-5.5}" ry="${ry-5.5}" fill="none" stroke="#ab9db9" stroke-width=".65"/>
   ${pores}<path d="M${-rx*.64} ${-ry*.65}Q0 ${-ry*.98} ${rx*.44} ${-ry*.72}" fill="none" stroke="#fff9f3" opacity=".8" stroke-width="1.6"/>
  </g><g data-structure="dna" clip-path="url(#${id})" fill="none" stroke="#8a769e" stroke-linecap="round" opacity=".72">${threads}</g>
  <ellipse cx="${rx*.23}" cy="${-ry*.24}" rx="${rx*.18}" ry="${ry*.19}" fill="url(#nucleolus)" stroke="#9d87ab" stroke-width=".6"/>
  <path d="M${rx*.14} ${-ry*.31}q${rx*.1} ${-ry*.07} ${rx*.17} ${ry*.02}" fill="none" stroke="#d5c1db" stroke-width="1" opacity=".8"/>
 </g>`;
}
function granules(cell:Cell){
 const id=`cytoplasm-${cell}`;
 const boundary=cell==='animal'?`<path d="${animalOutline(9)}"/>`:'<rect x="151" y="84" width="425" height="322" rx="32"/>';
 return `<defs><clipPath id="${id}">${boundary}</clipPath></defs><g clip-path="url(#${id})" fill="#897968" opacity=".23">${Array.from({length:90},(_,i)=>{const a=i*2.39996,r=42+((i*31)%149);let x=360+Math.cos(a)*r*1.1,y=245+Math.sin(a)*r*.79;if(cell==='plant'){x=158+(i*37)%398;y=i%2?88+(i%7)*4:385-(i%7)*3;}return `<circle cx="${x}" cy="${y}" r="${.65+i%3*.3}"/>`;}).join('')}</g>`;
}
function membraneProtein(x:number,y:number,angle:number){
 return `<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M-3-7Q-7-5-4-1L-5 5Q-2 9 0 6Q3 9 5 5L4-1Q7-6 3-7Z" fill="#7d9d97" stroke="#527e76" stroke-width=".65"/><path d="M0-5V5" stroke="#edf4e9" stroke-width="1.1" stroke-linecap="round"/></g>`;
}
function animal(){
 const lipids=Array.from({length:104},(_,i)=>{const a=i*Math.PI*2/104,o=animalPoint(a,0),n=animalPoint(a,7);return `<path d="M${o.x} ${o.y}L${n.x} ${n.y}" stroke="#b58f87" stroke-width=".8"/><circle cx="${o.x}" cy="${o.y}" r="1.55" fill="#edd5c8"/><circle cx="${n.x}" cy="${n.y}" r="1.2" fill="#f7e9da"/>`;}).join('');
 const channels=[.7,2.1,3.55,4.7].map(a=>{const p=animalPoint(a,3.5),before=animalPoint(a-.02),after=animalPoint(a+.02);return membraneProtein(p.x,p.y,Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI);}).join('');
 const er=['M268 215C246 204 229 170 267 153S368 132 414 153','M255 211C223 183 214 153 264 134S387 112 431 142','M244 223C208 190 207 157 244 139'];
 const erArt=er.map((d,i)=>`<path d="${d}" fill="none" stroke="#b38d85" stroke-width="${6-i*.6}"/><path d="${d}" fill="none" stroke="#eac7b7" stroke-width="${3.5-i*.4}"/>`).join('');
 const ribosomes=Array.from({length:23},(_,i)=>{const u=i/22,x=252+u*166,y=135-19*Math.sin(u*Math.PI);return `<circle cx="${x}" cy="${y-8}" r="1.35"/><circle cx="${x-8}" cy="${y+9}" r="1.05"/>`;}).join('');
 return `<path d="${animalOutline(-3)}" transform="translate(0 5)" fill="#6f6765" opacity=".09"/>
  <g data-structure="membrane"><path d="${animalOutline()}" fill="url(#animal-cytoplasm)" stroke="#ab857c" stroke-width="2.2"/>
   <path d="${animalOutline(7)}" fill="none" stroke="#e6c5b3" stroke-width="1.1"/>${lipids}${channels}</g>${granules('animal')}
  <g stroke-linecap="round" stroke-linejoin="round">${erArt}<path d="M271 215Q274 212 279 213" fill="none" stroke="#e5bdad" stroke-width="3"/>
   ${[0,1,2,3].map(i=>`<path d="M${403-i*2} ${286+i*10}q${12+i*2} ${45-i*5} ${64-i*8} ${31-i*2}" fill="none" stroke="#b68c79" stroke-width="5"/><path d="M${403-i*2} ${284+i*10}q${12+i*2} ${45-i*5} ${64-i*8} ${31-i*2}" fill="none" stroke="#f0d3b7" stroke-width="2.3"/>`).join('')}
  </g><g fill="#927467" opacity=".65">${ribosomes}</g>
  <g fill="url(#vesicle)" stroke="#a78777" stroke-width=".7"><ellipse cx="468" cy="363" rx="5.5" ry="4.3"/><ellipse cx="484" cy="351" rx="3.6" ry="3.2"/><ellipse cx="494" cy="371" rx="3" ry="2.8"/></g>
  ${organelle(239,329,-20,'mitochondrion')}${organelle(473,168,24,'mitochondrion',.9)}${organelle(478,331,-27,'mitochondrion')}${nucleus('animal',345,248,78)}
  <path class="surface-veil" d="${animalOutline(1)}" fill="url(#animal-skin)" opacity="0" pointer-events="none"/>`;
}
function plant(){
 return `<rect x="129" y="62" width="469" height="366" rx="51" fill="#536b5c" opacity=".1" transform="translate(0 5)"/>
  <rect x="129" y="62" width="469" height="366" rx="51" fill="url(#wall)" stroke="#7a9478" stroke-width="1.8"/>
  <rect x="134" y="67" width="459" height="356" rx="47" fill="none" stroke="#e1e5c2" stroke-width="1.6"/>
  <rect x="138" y="71" width="451" height="348" rx="43" fill="none" stroke="#9db28d" stroke-width=".8"/>
  <g fill="none" stroke="#8fa581" stroke-width=".75" opacity=".45">${Array.from({length:17},(_,i)=>`<path d="M${166+i*24} 63l-4 12m4 340-4 12"/>`).join('')}</g>
  <g data-structure="membrane"><rect x="145" y="78" width="437" height="334" rx="37" fill="url(#plant-cytoplasm)" stroke="#72927d" stroke-width="2"/>
   <rect x="150" y="83" width="427" height="324" rx="33" fill="none" stroke="#e4ecd3" stroke-width="1.3"/>${membraneProtein(148,165,90)}${membraneProtein(148,325,90)}</g>${granules('plant')}
  <g data-structure="vacuole"><path d="M297 148C344 137 466 137 513 163S544 265 526 320S417 360 324 351S284 298 276 244S267 161 297 148Z" fill="url(#vacuole)" stroke="#98b5a9" stroke-width="1.6"/>
   <path d="M310 160Q408 138 500 171" fill="none" stroke="#fcfff4" stroke-width="2" opacity=".9"/>
   <path d="M316 337Q440 362 513 316" fill="none" stroke="#91b2a5" stroke-width=".8" opacity=".4"/></g>
  <g fill="none" stroke-linecap="round"><path d="M171 203Q147 178 181 163T258 169M167 214Q138 180 175 153T268 163" stroke="#9eb293" stroke-width="4"/><path d="M171 202Q147 177 181 162T258 168M167 213Q138 179 175 152T268 162" stroke="#e1e5be" stroke-width="1.6"/></g>
  ${organelle(209,113,-8,'chloroplast')}${organelle(343,109,2,'chloroplast')}${organelle(484,110,8,'chloroplast')}${organelle(543,258,86,'chloroplast')}${organelle(447,380,-4,'chloroplast')}${organelle(309,380,3,'chloroplast')}${organelle(212,358,16,'mitochondrion',.85)}${nucleus('plant',215,248,52)}
  <rect class="surface-veil" x="145" y="78" width="437" height="334" rx="37" fill="url(#plant-skin)" opacity="0" pointer-events="none"/>`;
}
function bacterium(){
 const chromosome='M286 234C263 215 282 184 302 195S318 238 338 216S345 181 365 199S369 243 393 223S410 190 430 208S416 246 442 249S459 280 438 283S405 257 398 278S376 300 359 275S339 253 326 271S296 289 300 267S314 240 295 244S274 252 286 234Z';
 return `<rect x="133" y="134" width="459" height="225" rx="112" fill="#7d755e" opacity=".1" transform="translate(0 5)"/>
  <rect x="128" y="129" width="469" height="224" rx="112" fill="url(#bacterial-wall)" stroke="#ae9b70" stroke-width="1.8"/>
  <rect x="133" y="134" width="459" height="214" rx="107" fill="none" stroke="#faf1cd" stroke-width="1.2"/>
  <g data-structure="membrane"><rect x="141" y="142" width="443" height="198" rx="99" fill="url(#bacterial-cytoplasm)" stroke="#9d956b" stroke-width="1.8"/>
   <rect x="146" y="147" width="433" height="188" rx="94" fill="none" stroke="#f7eecb" stroke-width="1.3"/>${membraneProtein(144,245,90)}</g>
  <g fill="#9d8c64" opacity=".5">${Array.from({length:70},(_,i)=>{const a=i*2.39996,r=35+(i*29)%125;const x=361+Math.cos(a)*r*1.16,y=243+Math.sin(a)*r*.55;return `<ellipse cx="${x}" cy="${y}" rx="1.9" ry="1.35"/><circle cx="${x-1}" cy="${y-.8}" r=".6" fill="#e9dab4"/>`;}).join('')}</g>
  <g data-structure="dna" fill="none" stroke-linecap="round"><path d="${chromosome}" stroke="#8d7b5e" stroke-width="2.7"/>
   <path d="${chromosome}" transform="translate(-.4 -.7)" stroke="#d7bd8e" stroke-width=".9"/></g>
  <path d="M183 165Q249 126 388 146" fill="none" stroke="#fff6d4" stroke-width="1.5" opacity=".65"/>
  <rect class="surface-veil" x="141" y="142" width="443" height="198" rx="99" fill="url(#bacterial-skin)" opacity="0" pointer-events="none"/>`;
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
function viewportArt(view:'whole'|'detail'|'behavior',focus=false){
 // An SVG viewBox can leave letterbox space within its physical viewport. Clip
 // in world coordinates as well, so a neighbouring specimen never enters it.
 return `<defs><clipPath id="${view}-viewport" clipPathUnits="userSpaceOnUse"><rect id="${view}-clip" x="0" y="0" width="720" height="490"/></clipPath></defs><g clip-path="url(#${view}-viewport)"><use href="#cell-board"/>${focus?'<rect id="focus-frame" class="focus-frame" x="0" y="0" width="0" height="0" rx="9"/>':''}</g>`;
}
export function createScene(){
 const gradients=`
 <radialGradient id="reaction-light"><stop stop-color="#edc876" stop-opacity=".7"/><stop offset="1" stop-color="#edc876" stop-opacity="0"/></radialGradient>
 <radialGradient id="animal-cytoplasm" cx="29%" cy="21%" r="82%"><stop stop-color="#fff2e4"/><stop offset=".6" stop-color="#ecd5c4"/><stop offset="1" stop-color="#c5a79d"/></radialGradient>
 <radialGradient id="plant-cytoplasm" cx="28%" cy="20%" r="85%"><stop stop-color="#f5f5d9"/><stop offset=".65" stop-color="#d9e4bd"/><stop offset="1" stop-color="#b5caa6"/></radialGradient>
 <radialGradient id="bacterial-cytoplasm" cx="28%" cy="24%" r="86%"><stop stop-color="#fbf0d0"/><stop offset=".65" stop-color="#e5d7ad"/><stop offset="1" stop-color="#c6b58b"/></radialGradient>
 <linearGradient id="wall" x2=".75" y2="1"><stop stop-color="#dce2b7"/><stop offset=".42" stop-color="#b4c699"/><stop offset="1" stop-color="#8fa887"/></linearGradient>
 <linearGradient id="bacterial-wall" x2="0" y2="1"><stop stop-color="#e9dbb4"/><stop offset=".5" stop-color="#cbb994"/><stop offset="1" stop-color="#b4a17c"/></linearGradient>
 <radialGradient id="vacuole" cx="30%" cy="22%" r="90%"><stop stop-color="#fcfdf4"/><stop offset=".65" stop-color="#e6eee6"/><stop offset="1" stop-color="#bdcfc5"/></radialGradient>
 <radialGradient id="nucleoplasm" cx="30%" cy="23%" r="82%"><stop stop-color="#f2eaf1"/><stop offset=".55" stop-color="#cfc3d8"/><stop offset="1" stop-color="#998fae"/></radialGradient>
 <radialGradient id="nucleolus" cx="28%" cy="25%"><stop stop-color="#baa5c6"/><stop offset=".6" stop-color="#927aab"/><stop offset="1" stop-color="#796789"/></radialGradient>
 <radialGradient id="mitochondrion" cx="28%" cy="22%" r="85%"><stop stop-color="#f9d9bf"/><stop offset=".5" stop-color="#deb09a"/><stop offset="1" stop-color="#b67f75"/></radialGradient>
 <radialGradient id="chloroplast" cx="30%" cy="20%" r="82%"><stop stop-color="#c9ddad"/><stop offset=".55" stop-color="#91b58b"/><stop offset="1" stop-color="#5d8972"/></radialGradient>
 <linearGradient id="thylakoid" x2="0" y2="1"><stop stop-color="#c4dba5"/><stop offset=".45" stop-color="#89b58b"/><stop offset="1" stop-color="#54866a"/></linearGradient>
 <radialGradient id="vesicle" cx="25%" cy="20%"><stop stop-color="#f6e8cf"/><stop offset="1" stop-color="#c1a38a"/></radialGradient>
 ${['animal','plant','bacterial'].map((c,i)=>`<radialGradient id="${c}-skin" cx="30%" cy="18%"><stop stop-color="${['#fff4e4','#f4f5dc','#fff1d5'][i]}" stop-opacity=".4"/><stop offset=".62" stop-color="${['#dabaa7','#b0c69c','#d7c59b'][i]}" stop-opacity=".85"/><stop offset="1" stop-color="${['#b18d81','#839d78','#ae9c76'][i]}"/></radialGradient>`).join('')}`;
 // Definitions stay outside panels that can be hidden. All three viewports use
 // the same mounted specimen even when the structural viewport is not shown.
 const definitions = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
 definitions.setAttribute('width', '0'); definitions.setAttribute('height', '0'); definitions.setAttribute('aria-hidden', 'true');
 definitions.style.position = 'absolute';
 definitions.innerHTML=`<defs>${gradients}<g id="cell-board">${(['animal','plant','bacterium'] as Cell[]).map(c=>`<g id="specimen-${c}" transform="translate(${cellOffset[c]} 0)">${c==='animal'?animal():c==='plant'?plant():bacterium()}${flowLayer(c)}</g>`).join('')}</g></defs>`;
 ($('cell-scene').closest('[data-wiki-document]') ?? document.body).append(definitions);
 $('cell-scene').innerHTML=viewportArt('whole',true);
 $('detail-scene').innerHTML=viewportArt('detail');
 $('behavior-scene').innerHTML=viewportArt('behavior');
}
export function setCameras(whole:Box,detail:Box){
 const format=(b:Box)=>`${b.x} ${b.y} ${b.width} ${b.height}`;
 $('cell-scene').setAttribute('viewBox',format(whole));$('detail-scene').setAttribute('viewBox',format(detail));$('behavior-scene').setAttribute('viewBox',format(whole));
 for(const [view,box] of [['whole',whole],['detail',detail],['behavior',whole]] as const)for(const key of ['x','y','width','height'] as const)$(view+'-clip').setAttribute(key,String(box[key]));
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
