import {fruitGeometry,pollinationFrame} from './model.ts';
const defs = `<defs>
  <linearGradient id="orchard" x2="0" y2="1"><stop stop-color="#dfe6d2"/><stop offset=".52" stop-color="#f8f0db"/><stop offset="1" stop-color="#d0dac2"/></linearGradient>
  <radialGradient id="sunlight"><stop stop-color="#fffae3" stop-opacity=".94"/><stop offset="1" stop-color="#fffae3" stop-opacity="0"/></radialGradient>
  <linearGradient id="bark" x2="0" y2="1"><stop stop-color="#967359"/><stop offset=".42" stop-color="#6d5540"/><stop offset="1" stop-color="#463d30"/></linearGradient>
  <radialGradient id="petal" cx=".45" cy=".36" r=".85"><stop stop-color="#fffdf4"/><stop offset=".52" stop-color="#fff6ef"/><stop offset=".85" stop-color="#eed0d3"/><stop offset="1" stop-color="#d69eaf"/></radialGradient>
  <radialGradient id="flower-center"><stop stop-color="#d4c171"/><stop offset=".55" stop-color="#e3d7a0"/><stop offset="1" stop-color="#f8eee0" stop-opacity="0"/></radialGradient>
  <linearGradient id="leaf-green" x1="0" y1="1" x2=".8" y2="0"><stop stop-color="#3f6037"/><stop offset=".55" stop-color="#719252"/><stop offset="1" stop-color="#a8bb76"/></linearGradient>
  <linearGradient id="stalk" x1="0" x2="1"><stop stop-color="#55733d"/><stop offset=".5" stop-color="#a8b677"/><stop offset="1" stop-color="#496539"/></linearGradient>
  <radialGradient id="cherry-skin" cx=".3" cy=".23" r=".8"><stop stop-color="#f2a5a0"/><stop offset=".24" stop-color="#d95763"/><stop offset=".64" stop-color="#a6233b"/><stop offset="1" stop-color="#631d30"/></radialGradient>
  <radialGradient id="young-fruit" cx=".28" cy=".24"><stop stop-color="#dce7a3"/><stop offset=".55" stop-color="#9bac65"/><stop offset="1" stop-color="#638048"/></radialGradient>
  <radialGradient id="flesh" cx=".36" cy=".36"><stop stop-color="#fbd3b8"/><stop offset=".45" stop-color="#efa198"/><stop offset="1" stop-color="#c45166"/></radialGradient>
  <radialGradient id="stone" cx=".28" cy=".23"><stop stop-color="#d5b58a"/><stop offset=".6" stop-color="#a68158"/><stop offset="1" stop-color="#705237"/></radialGradient>
  <radialGradient id="ovary" cx=".25" cy=".27"><stop stop-color="#e3e8ac"/><stop offset=".5" stop-color="#b5c779"/><stop offset="1" stop-color="#749155"/></radialGradient>
  <radialGradient id="bee-gold" cx=".3" cy=".23"><stop stop-color="#f2db91"/><stop offset=".65" stop-color="#c7a356"/><stop offset="1" stop-color="#8c703f"/></radialGradient>
  <filter id="background-soft"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="botanical-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="1" dy="5" stdDeviation="4" flood-color="#4b4a31" flood-opacity=".17"/></filter>
  <filter id="inset-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#36503a" flood-opacity=".1"/></filter>
  <path id="cherry-outline" d="M0 -69 C-19 -82 -66 -75 -77 -40 C-96 17 -49 80 -7 88 C34 91 82 36 81 -14 C80 -57 43 -82 17 -71 Q7 -66 0 -69Z"/>
  <clipPath id="cherry-mask"><use href="#cherry-outline"/></clipPath>
  <path id="petal-outline" d="M0 9 C-27 -12 -57 -51 -48 -81 C-42 -106 -17 -119 -4 -112 Q0 -103 5 -112 C29 -117 51 -98 49 -76 C51 -44 22 -7 0 9Z"/>
</defs>`;
function orchardLeaf(x: number, y: number, scale: number, angle: number) {
  const points = Array.from({ length: 46 }, (_, i) => {
    const a = Math.PI * 2 * i / 46;
    const r = i % 2 ? 1 : .93;
    return `${63 + Math.cos(a) * 63 * r},${Math.sin(a) * 27 * r}`;
  }).join(' ');
  const veins = Array.from({ length: 8 }, (_, i) => {
    const vx = 16 + i * 12;
    return `<path d="M${vx} 0 Q${vx + 5} -11 ${vx + 17} -${Math.sin(vx / 126 * Math.PI) * 24} M${vx} 0 Q${vx + 5} 11 ${vx + 17} ${Math.sin(vx / 126 * Math.PI) * 24}"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})" filter="url(#botanical-shadow)"><polygon points="${points}" fill="url(#leaf-green)" stroke="#6e8e4e" stroke-width=".8"/><g fill="none" stroke="#c7d49a" stroke-width=".8" opacity=".65">${veins}<path d="M0 0 H125" stroke-width="1.7"/></g></g>`;
}
function blossom() {
  const petals = Array.from({ length: 5 }, (_, i) => {
    const veins = Array.from({ length: 5 }, (_, j) => `<path d="M0 3 Q${-22 + j * 11} -48 ${-34 + j * 17} -${85 + (j % 2) * 15}"/>`).join('');
    return `<g data-part="petal-${i}" transform="rotate(${i * 72 + 11})"><defs><path id="petal-shape-${i}" data-part="petal-shape-${i}"/><clipPath id="petal-clip-${i}"><use href="#petal-shape-${i}"/></clipPath></defs><use href="#petal-shape-${i}" fill="url(#petal)" stroke="#d9b8b9" stroke-width=".8"/><use data-part="petal-age-${i}" href="#petal-shape-${i}" fill="#ae9680"/><g clip-path="url(#petal-clip-${i})" fill="none" stroke="#dfaeb8" stroke-width=".65" opacity=".42">${veins}</g><path data-part="petal-fold-${i}" fill="#d3b5af" stroke="#f9e7dc" stroke-width=".7"/></g>`;
  }).join('');
  const stamens = Array.from({ length: 28 }, (_, i) => {
    const a = i * Math.PI * 2 / 28, r = 34 + i % 4 * 5;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    return `<path d="M${Math.cos(a) * 9} ${Math.sin(a) * 9} Q${x * .67 - 3} ${y * .67} ${x} ${y}" fill="none" stroke="#cdb77f" stroke-width="1.1"/><ellipse cx="${x}" cy="${y}" rx="2.8" ry="1.8" fill="#caa052" transform="rotate(${i * 13} ${x} ${y})"/><circle cx="${x - .6}" cy="${y - .5}" r=".8" fill="#f3dba0"/>`;
  }).join('');
  return `<g transform="translate(274 265)" filter="url(#botanical-shadow)">${petals}<g data-part="stamens"><circle r="44" fill="url(#flower-center)"/>${stamens}</g><g data-part="flower-style"><path d="M0 12 Q-5 0 1 -15" fill="none" stroke="#94a56d" stroke-width="5" stroke-linecap="round"/><ellipse cx="1" cy="-15" rx="7" ry="4" fill="#a3b477"/></g></g>`;
}
function bee(x: number, y: number) {
  const hairs = Array.from({ length: 24 }, (_, i) => {
    const a = i * Math.PI * 2 / 24;
    return `<path d="M${Math.cos(a) * 16} ${Math.sin(a) * 17} l${Math.cos(a) * 4} ${Math.sin(a) * 4}"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y}) rotate(-6)"><g><g stroke="#695d45" stroke-width="1.5" fill="none"><path d="M-7 14 l-12 14 -11 -1 M5 16 l2 20 9 5 M14 12 l17 16 10 -3"/><path d="M-8 -13 l-14 -15 -11 3 M6 -14 l2 -19 8 -4 M17 -12 l16 -12 9 2"/></g><g fill="#f9fcf5" fill-opacity=".7" stroke="#b2c5bb" stroke-width="1"><path d="M-1 1 C-46 -6 -59 -38 -34 -42 Q-7 -43 8 -6Z"/><path d="M2 -3 C-9 -43 10 -58 26 -42 Q43 -27 11 8Z"/></g><path d="M-3 -2 Q-29 -18 -41 -36 M8 -5 Q9 -25 18 -40" fill="none" stroke="#adc2b7" stroke-width=".7"/><ellipse cx="-19" cy="3" rx="25" ry="17" fill="url(#bee-gold)"/><path d="M-33 -10 Q-26 2 -33 16 M-21 -13 Q-14 3 -20 20" stroke="#514736" stroke-width="6" fill="none"/><ellipse rx="17" ry="18" fill="#9f8552"/><g stroke="#d7c08a" stroke-width=".9" fill="none">${hairs}</g><ellipse cx="21" cy="-1" rx="13" ry="12" fill="#544e3d"/><ellipse cx="25" cy="-5" rx="4" ry="5" fill="#252c26"/><path d="M25 -9 Q31 -25 39 -20 M30 -3 Q42 -13 45 -7" stroke="#585341" stroke-width="1.5" fill="none"/><path d="M32 6 l10 7" stroke="#6c6249" stroke-width="1.6"/><circle cx="-3" cy="19" r="4" fill="#deb55e"/><circle cx="7" cy="19" r="3" fill="#e5c46d"/></g></g>`;
}

export function createCherryScene(scene:SVGSVGElement,t:(s:string)=>string){
  const backdrop = `<rect width="760" height="530" fill="url(#orchard)"/><circle cx="527" cy="113" r="270" fill="url(#sunlight)"/><g filter="url(#background-soft)" opacity=".36"><path d="M-32 526 Q116 246 75 -21" stroke="#8a9b71" stroke-width="27" fill="none"/><ellipse cx="60" cy="91" rx="110" ry="46" fill="#8ca377" transform="rotate(-25 60 91)"/><ellipse cx="731" cy="295" rx="105" ry="54" fill="#a5b68b" transform="rotate(-45 731 295)"/><circle cx="81" cy="369" r="47" fill="#fff7ec"/><circle cx="388" cy="443" r="58" fill="#a3b988"/></g><g fill="#fffbea" opacity=".5"><circle cx="413" cy="52" r="18"/><circle cx="66" cy="288" r="12"/><circle cx="704" cy="68" r="23"/></g>`;
  const barkMarks = Array.from({ length: 18 }, (_, i) => `<path d="M${49 + i * 23} ${143 - 34 * Math.pow((49 + i * 23 - 200) / 270, 2)} l${4 + i % 5} ${-2 + i % 3}" stroke="${i % 2 ? '#bfab83' : '#3f3c2e'}" stroke-width="1.4" opacity=".65"/>`).join('');

  const freckles=Array.from({length:66},(_,i)=>`<ellipse cx="${-65+(i*19.73)%137}" cy="${-65+(i*23.91)%147}" rx=".85" ry=".65" fill="#f1d7b1" opacity=".25"/>`).join('');
  scene.innerHTML=defs+backdrop+`<g class="specimen"><path d="M-22 122 Q125 143 223 140 T469 109" stroke="url(#bark)" stroke-width="17" fill="none" stroke-linecap="round"/><path d="M-18 118 Q121 137 221 136 T465 105" stroke="#d2b58e" stroke-width="2.1" fill="none" opacity=".4"/>${barkMarks}<path class="fruit-stalk" d="M295 137 Q305 198 274 265" fill="none" stroke="url(#stalk)" stroke-width="5" stroke-linecap="round"/>${orchardLeaf(351,131,.8,-27)}${orchardLeaf(171,143,.8,143)}<g data-part="ovary-body" filter="url(#botanical-shadow)"><use href="#cherry-outline" fill="url(#young-fruit)"/><use data-part="ripe-skin" href="#cherry-outline" fill="url(#cherry-skin)"/><g clip-path="url(#cherry-mask)">${freckles}<path d="M-48 -49 C-61 -35 -65 -13 -59 7" stroke="#fff8e6" stroke-width="12" stroke-linecap="round" opacity=".36" fill="none"/><ellipse cx="-40" cy="-52" rx="13" ry="7" transform="rotate(-25 -40 -52)" fill="#fffbed" opacity=".64"/><path d="M10 -68 Q27 -14 10 76" stroke="#6b4936" stroke-width="1.4" fill="none" opacity=".3"/></g><ellipse cx="6" cy="-67" rx="11" ry="4" fill="#687245"/></g>${blossom()}<g data-part="bee">${bee(0,0)}</g><g data-part="pollen" fill="#d6a143" stroke="#a77933" stroke-width=".6"><circle r="3.1"/><circle cx="-4" cy="2" r="2"/></g></g><g class="cutaway"><rect x="485" y="143" width="232" height="306" rx="24" fill="#fffdf4" fill-opacity=".94" stroke="#d9dfca"/><text x="601" y="176" text-anchor="middle" class="inset-heading">${t('同一个子房的变化')}</text><g data-part="section-anatomy"><g data-part="section-wall"><use data-part="flesh" href="#cherry-outline" fill="url(#ovary)" stroke="#718d4e" stroke-width="5"/><use data-part="flesh-ripe" href="#cherry-outline" fill="url(#flesh)" stroke="#b45c61" stroke-width="5"/><path d="M-58 -45 Q-82 6 -45 52" fill="none" stroke="#fff3d1" stroke-width="4" opacity=".45"/></g><path data-part="inner-wall" d="M600 316 C576 318 576 365 600 370 C624 366 626 319 600 316Z" fill="#f4e8c7" stroke="#b9be85" stroke-width="1.2"/><path data-part="endocarp" d="M600 316 C576 318 576 365 600 370 C624 366 626 319 600 316Z" fill="url(#stone)" stroke="#987448" stroke-width="1.4"/><g data-part="stone-veins" fill="none" stroke="#8b633e" stroke-width=".7"><path d="M593 319 Q584 342 594 365 M601 318 Q593 342 603 368 M610 324 Q605 344 611 360"/></g><g data-part="ovule-seed"><path d="M601 328 C585 328 587 353 600 358 C614 355 616 333 601 328Z" fill="#e9d8a6" stroke="#aa9462" stroke-width="1.1"/><path d="M600 333 Q594 342 600 352" fill="none" stroke="#fff0c6" stroke-width="1.8"/></g><g data-part="section-style"><path data-part="style-wall" fill="url(#ovary)" stroke="#819656" stroke-width="1.4"/><path data-part="style-core" fill="none" stroke="#e7e6b1" stroke-width="4"/><path d="M588 224 Q582 215 589 211 Q600 207 612 211 Q619 215 613 224Z" fill="#819c55"/><g fill="#bfd085">${[587,593,600,607,613].map((x,i)=>`<circle cx="${x}" cy="${215-i%2*3}" r="3.3"/>`).join('')}</g><g data-part="section-pollen" fill="#ddad55" stroke="#b8843c" stroke-width=".8"><circle cx="599" cy="204" r="6"/><circle cx="610" cy="202" r="4"/></g></g><path data-part="pollen-tube" pathLength="1" stroke-dasharray="1" d="M599 210 Q607 248 600 285 C593 310 607 320 603 336" stroke="#cc8651" stroke-width="2.5" stroke-linecap="round" fill="none"/></g><text data-part="section-caption" x="601" y="417" text-anchor="middle" class="small"/></g><g class="diagram-labels"><rect x="125" y="468" width="510" height="37" rx="18" fill="#fdfcef" fill-opacity=".83" stroke="#d7ddc7"/><text data-part="caption" x="380" y="493" text-anchor="middle" class="stage-caption"/></g>`;
  const parts=new Map(Array.from(scene.querySelectorAll<SVGElement>('[data-part]'),node=>[node.dataset.part!,node]));
  const attr=(id:string,key:string,value:string|number)=>parts.get(id)!.setAttribute(key,String(value));
  const cue=[t('蜜蜂靠近，花粉还在身上'),t('花粉留在柱头，花粉管向内生长'),t('受精完成，子房开始膨大'),t('花瓣凋落，幼果慢慢长大'),t('果肉增厚，硬果核包住种子'),t('樱桃成熟，种子留在果核里')];
  return {update(progress:number,compatible:boolean){
    const p=Math.max(0,Math.min(3,progress)),pollination=pollinationFrame(p,compatible),g=fruitGeometry(p,compatible);
    attr('ovary-body','transform',`translate(${g.center.x} ${g.center.y}) scale(${g.scale})`);attr('ripe-skin','opacity',g.ripe);
    for(const [i,petal]of g.petals.entries()){
      attr(`petal-${i}`,'transform',`translate(${petal.x} ${petal.y}) rotate(${petal.angle}) scale(${petal.width} ${petal.length})`);
      attr(`petal-${i}`,'opacity',petal.opacity);
      const c=petal.curl;
      attr(`petal-shape-${i}`,'d',`M0 9 C-27 -12 ${-57+12*c} -51 ${-48+10*c} ${-81+20*c} C${-42+12*c} ${-106+30*c} -17 ${-119+40*c} ${-4+15*c} ${-112+48*c} Q${17*c} ${-103+52*c} ${5+14*c} ${-112+48*c} C${29+8*c} ${-117+40*c} ${51-20*c} ${-98+22*c} ${49-24*c} ${-76+10*c} C${51-18*c} -44 22 -7 0 9Z`);
      attr(`petal-age-${i}`,'opacity',.14*c);
      attr(`petal-fold-${i}`,'d',`M${5+14*c} ${-112+48*c} Q${32-5*c} ${-105+40*c} ${43-22*c} ${-84+19*c} Q${21+3*c} ${-92+36*c} ${5+14*c} ${-112+48*c}Z`);
      attr(`petal-fold-${i}`,'opacity',c*.65);
    }
    attr('stamens','transform',`scale(${1-.4*g.wilt})`);attr('stamens','opacity',1-g.wilt);
    attr('flower-style','transform',`rotate(${g.wilt*42}) scale(1 ${1-.6*g.wilt})`);attr('flower-style','opacity',1-g.wilt);
    attr('bee','transform',`translate(${pollination.beeX} ${pollination.beeY})`);attr('bee','opacity',Math.max(0,1-Math.max(0,p-1)*3));
    attr('pollen','transform',`translate(${pollination.pollenX} ${pollination.pollenY})`);attr('pollen','opacity',compatible?Math.max(0,1-Math.max(0,p-1)):1);
    attr('section-anatomy','transform',`translate(${g.sectionCenter.x-601} ${g.sectionCenter.y-343})`);
    attr('section-wall','transform',`translate(601 343) scale(${g.sectionScale})`);attr('flesh-ripe','opacity',g.ripe);
    // Both the ovule and its enclosing wall remain centered on the same site.
    const innerScale=1+.26*g.grow;
    for(const id of ['inner-wall','endocarp','stone-veins'])attr(id,'transform',`translate(601 343) scale(${innerScale}) translate(-601 -343)`);
    attr('endocarp','opacity',g.stone);attr('stone-veins','opacity',g.stone*.65);
    attr('ovule-seed','transform',`translate(601 343) scale(${g.seedScale}) translate(-601 -343)`);
    const top=343-68*g.sectionScale;
    attr('style-wall','d',`M593 221 L591 ${top-8} Q579 ${top+5} 580 ${top+17} L621 ${top+17} Q622 ${top+5} 611 ${top-8} L609 221Z`);
    attr('style-core','d',`M601 229 V${top+12}`);attr('section-style','opacity',1-g.wilt);
    attr('pollen-tube','stroke-dashoffset',1-pollination.tube);attr('pollen-tube','opacity',pollination.deposited?1-g.wilt:0);
    attr('section-pollen','opacity',pollination.deposited?1:0);
    const note=!compatible&&p>=.49?t('受精未完成'):p<.42?cue[0]!:p<1?cue[1]!:p<1.35?cue[2]!:p<2?cue[3]!:p<3?cue[4]!:cue[5]!;
    parts.get('caption')!.textContent=note;
    const sectionNote=p<1?t('子房包着胚珠'):p<2?t('胚珠成种子，子房壁增厚'):t('果核里面有种子');
    const text=parts.get('section-caption')!;
    // Two stable lines avoid tiny type and panel overflow in English.
    if(text.getAttribute('data-copy')!==sectionNote){
      text.setAttribute('data-copy',sectionNote);text.replaceChildren();
      const words=sectionNote.split(' '),lines:string[]=[''];
      for(const word of words){const last=lines.length-1;if(lines[last]!.length+(lines[last]?1:0)+word.length>18)lines.push(word);else lines[last]+=(lines[last]?' ':'')+word;}
      for(const [i,line]of lines.entries()){const span=document.createElementNS('http://www.w3.org/2000/svg','tspan');span.setAttribute('x','601');span.setAttribute('dy',i===0?'0':'18');span.textContent=line;text.append(span);}
    }
    return note;
  }};
}
