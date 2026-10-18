import {beanGeometry,primaryRootPoint} from './growthGeometry.ts';
import {createLeafUnfold} from './leafMotion.ts';
// Deterministic illustration detail keeps soil grains still while conditions change.
const soilGrains = Array.from({ length: 190 }, (_, i) => {
  const x = 23 + ((i * 137.73) % 716), y = 322 + ((i * 37.47) % 207);
  const radius = 1.3 + (i % 7) * .55;
  return `<ellipse cx="${x}" cy="${y}" rx="${radius * 1.6}" ry="${radius}" fill="${['#ad9477', '#372c24', '#8c755e', '#c3ab85', '#594738'][i % 5]}" opacity="${.28 + (i % 4) * .1}" transform="rotate(${i * 29 % 180} ${x} ${y})"/>`;
}).join('');
const moss = Array.from({ length: 74 }, (_, i) => {
  const x = 8 + i * 10.2, y = 314 + Math.sin(i * .74) * 3;
  return `<path d="M${x} ${y} q${-3 + i % 7} ${-5 - i % 8} ${4 - i % 5} ${-8 - i % 9}" stroke="${['#809453', '#bac282', '#526a3e'][i % 3]}" stroke-width="${1 + i % 3}" fill="none" stroke-linecap="round"/>`;
}).join('');
const defs = `<defs>
  <linearGradient id="air-light" x2="0" y2="1"><stop stop-color="#e6eadc"/><stop offset=".75" stop-color="#f7f3dc"/><stop offset="1" stop-color="#d5d7b0"/></linearGradient>
  <radialGradient id="sun-glow"><stop stop-color="#fff9db" stop-opacity=".95"/><stop offset="1" stop-color="#fff9db" stop-opacity="0"/></radialGradient>
  <linearGradient id="earth" x2="0" y2="1"><stop stop-color="#67523b"/><stop offset=".18" stop-color="#57422e"/><stop offset="1" stop-color="#302a24"/></linearGradient>
  <linearGradient id="dry-earth" x2="0" y2="1"><stop stop-color="#b29a73"/><stop offset="1" stop-color="#796347"/></linearGradient>
  <linearGradient id="stem" gradientUnits="userSpaceOnUse" x1="373" x2="397" y1="0" y2="0"><stop stop-color="#567932"/><stop offset=".4" stop-color="#b2c679"/><stop offset=".65" stop-color="#8cac57"/><stop offset="1" stop-color="#4e7136"/></linearGradient>
  <linearGradient id="root" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8efcf"/><stop offset=".5" stop-color="#d8c498"/><stop offset="1" stop-color="#b49a72"/></linearGradient>
  <radialGradient id="bean-coat" cx=".34" cy=".26" r=".83"><stop stop-color="#ead7a9"/><stop offset=".55" stop-color="#be9762"/><stop offset="1" stop-color="#806044"/></radialGradient>
  <radialGradient id="cotyledon" cx=".32" cy=".2"><stop stop-color="#d6d994"/><stop offset=".55" stop-color="#a4b264"/><stop offset="1" stop-color="#718844"/></radialGradient>
  <linearGradient id="bean-leaf" x1="0" y1="1" x2=".7" y2="0"><stop stop-color="#365e32"/><stop offset=".35" stop-color="#679344"/><stop offset=".7" stop-color="#8aaf5b"/><stop offset="1" stop-color="#bdcf86"/></linearGradient>
  <linearGradient id="leaf-fold" x1="0" y1="0" x2=".45" y2="1"><stop stop-color="#f0efba" stop-opacity=".24"/><stop offset=".48" stop-color="#9fb574" stop-opacity="0"/><stop offset="1" stop-color="#294b30" stop-opacity=".13"/></linearGradient>
  <linearGradient id="water-tint" x2="0" y2="1"><stop stop-color="#90cdd0" stop-opacity=".43"/><stop offset="1" stop-color="#426f7d" stop-opacity=".3"/></linearGradient>
  <filter id="soft-background"><feGaussianBlur stdDeviation="15"/></filter>
  <filter id="root-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.5" dy="2" stdDeviation="2" flood-color="#171711" flood-opacity=".42"/></filter>
  <filter id="leaf-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="1" dy="4" stdDeviation="3" flood-color="#32492a" flood-opacity=".15"/></filter>
  <clipPath id="earth-mask"><path d="M0 318 Q155 309 295 317 T560 316 T760 315 V530 H0Z"/></clipPath>
</defs>`;

const cotShape='M0 -30 C-30 -45 -57 -24 -56 4 C-53 33 -22 39 0 22 Q-11 -3 0 -30Z';
function leafMarkup(side:string){
  const veins=Array.from({length:7},(_,i)=>{const x=21+i*17,h=34*Math.sin(x/158*Math.PI);return `<path d="M${x} 0 Q${x+7} ${-h*.65} ${x+20} ${-h} M${x} 0 Q${x+7} ${h*.65} ${x+20} ${h}"/><path d="M${x+9} ${-h*.55}q-1-7 5-11 M${x+10} ${h*.55}q1 7 7 10" stroke-width=".5" opacity=".5"/>`;}).join('');
  return `<g data-part="leaf-${side}" filter="url(#leaf-shadow)"><defs><path id="leaf-shape-${side}" data-part="leaf-shape-${side}"/><clipPath id="leaf-mask-${side}"><use href="#leaf-shape-${side}"/></clipPath></defs><use href="#leaf-shape-${side}" fill="url(#bean-leaf)" stroke="#557f3d" stroke-width="1.2"/><use href="#leaf-shape-${side}" fill="url(#leaf-fold)"/><g clip-path="url(#leaf-mask-${side})" stroke="#d6e2ad" stroke-width="1" stroke-opacity=".62" fill="none">${veins}<path d="M0 0 Q83 -3 157 0" stroke-width="2"/></g></g>`;
}
function cotyledon(side:string,mirror:number){return `<g data-part="cot-${side}"><g transform="scale(${mirror} 1)"><path d="${cotShape}" fill="#ded3a0" stroke="#91a25a" stroke-width=".8"/><path data-part="green-${side}" d="${cotShape}" fill="url(#cotyledon)"/><path d="M-7 -18 Q-33 -22 -46 -3 M-7 -8 Q-21 2 -32 15 M-8 12 Q-20 22 -37 21" fill="none" stroke="#e6e5af" stroke-width="1.4" opacity=".55"/><path d="M-44 -15 Q-35 -28 -20 -25" fill="none" stroke="#fff5cf" stroke-width="2.7" opacity=".4"/></g></g>`;}
function coat(side:string,mirror:number){const spots=Array.from({length:26},(_,i)=>`<ellipse cx="${-10-(i*13)%39}" cy="${-25+(i*17)%55}" rx="${1+i%3*.6}" ry=".9" fill="#7d5841" opacity=".3"/>`).join('');return `<g data-part="coat-${side}"><g transform="scale(${mirror} 1)"><path d="${cotShape}" fill="url(#bean-coat)" stroke="#896745" stroke-width="1"/>${spots}<path d="M-3 -25 Q-15 -4 -3 17" fill="none" stroke="#f4e5c0" stroke-width="2"/><path d="M-44 -15 Q-35 -28 -20 -25" fill="none" stroke="#fff1ce" stroke-width="3" opacity=".45"/></g></g>`;}
export function createBeanScene(scene:SVGSVGElement,t:(s:string)=>string){
  const leafMotions=[createLeafUnfold(),createLeafUnfold()];
  const backdrop = `<rect width="760" height="530" fill="url(#air-light)"/><circle cx="606" cy="91" r="190" fill="url(#sun-glow)"/><g filter="url(#soft-background)" opacity=".32"><path d="M-15 342 Q26 242 4 163 Q103 165 58 288 Q127 205 142 264 L157 336Z" fill="#9cab75"/><path d="M695 332 Q632 273 658 217 Q688 247 696 273 Q715 160 754 149 L789 333Z" fill="#aebc7d"/><circle cx="93" cy="59" r="48" fill="#bdc797"/><circle cx="664" cy="273" r="39" fill="#f5e3ad"/></g><g opacity=".32" fill="#fffbe2"><circle cx="112" cy="160" r="9"/><circle cx="585" cy="144" r="6"/><circle cx="647" cy="202" r="11"/></g>`;
  const terrain = `<g clip-path="url(#earth-mask)"><rect data-part="earth" y="306" width="760" height="224" fill="url(#earth)"/><path d="M0 380 Q168 341 332 380 T760 369" fill="none" stroke="#b28a53" stroke-opacity=".13" stroke-width="25"/><path d="M0 480 Q189 414 399 459 T760 455" fill="none" stroke="#191f1c" stroke-opacity=".2" stroke-width="24"/>${soilGrains}</g><path d="M0 316 Q155 310 295 317 T560 316 T760 315" fill="none" stroke="#493e2a" stroke-width="5"/><g data-part="moss" opacity=".87">${moss}</g>`;

  const laterals=Array.from({length:12},(_,i)=>{
    const at=.15+i*.061,a=primaryRootPoint(at),sign=i%2?1:-1;
    const end={x:a.x+sign*(27+(i*13)%42),y:a.y+18+i%3*8};
    return `<g data-part="lateral-${i}" fill="none" stroke="url(#root)" stroke-linecap="round"><path d="M${a.x} ${a.y} Q${a.x+sign*18} ${a.y+15} ${end.x} ${end.y}" stroke-width="${2.9-i*.12}" pathLength="1" stroke-dasharray="1"/><g data-part="hairs-${i}" stroke-width=".65" opacity=".65">${Array.from({length:5},(_,j)=>{const u=.38+j*.105,x=a.x+(end.x-a.x)*u,y=a.y+(end.y-a.y)*u;return `<path d="M${x} ${y}q${sign*6} 2 ${sign*(8+j)} ${6+j}"/>`;}).join('')}</g></g>`;
  }).join('');
  scene.innerHTML=defs+backdrop+terrain+`<g data-part="pores" fill="#24261c" stroke="#a08c68" stroke-width="1" opacity=".75"><ellipse cx="239" cy="363" rx="11" ry="6"/><ellipse cx="538" cy="390" rx="8" ry="5"/><ellipse cx="279" cy="447" rx="7" ry="4"/></g><g class="specimen"><g fill="none" stroke="url(#root)" stroke-linecap="round" filter="url(#root-shadow)"><path data-part="root" d="M380 350 C382 397 361 449 389 502" stroke-width="6.5" pathLength="1" stroke-dasharray="1"/>${laterals}<path data-part="root-light" d="M380 350 C382 397 361 449 389 502" stroke="#fff1cd" opacity=".6" stroke-width="1.1" pathLength="1" stroke-dasharray="1"/></g><path data-part="hypocotyl" fill="none" stroke="url(#stem)" stroke-width="11" stroke-linecap="round"/><path data-part="epicotyl" fill="none" stroke="url(#stem)" stroke-width="8" stroke-linecap="round"/>${cotyledon('left',1)}${cotyledon('right',-1)}<g fill="none" stroke="url(#stem)" stroke-width="4" stroke-linecap="round"><path data-part="petiole-left"/><path data-part="petiole-right"/></g>${leafMarkup('left')}${leafMarkup('right')}<g data-part="bud"><path d="M0 0 C-11 -12 -7 -24 1 -27 C12 -15 9 -5 0 0Z" fill="#96b66a" stroke="#5d8547"/><path d="M0 -2 Q-2 -14 1 -24" stroke="#d6dc9c" stroke-width="1.1" fill="none"/></g>${coat('left',1)}${coat('right',-1)}</g><g data-part="flood"><path d="M0 307 Q125 298 254 306 T503 304 T760 305 V530 H0Z" fill="url(#water-tint)"/><path d="M0 307 Q125 298 254 306 T503 304 T760 305" stroke="#c8e7e6" stroke-width="3" fill="none"/></g><g class="diagram-labels"><rect x="209" y="44" width="342" height="46" rx="19" fill="#fffef0" fill-opacity=".82" stroke="#d7dec6"/><text data-part="caption" x="380" y="73" text-anchor="middle" class="stage-caption"/></g>`;
  const parts=new Map(Array.from(scene.querySelectorAll<SVGElement>('[data-part]'),node=>[node.dataset.part!,node]));
  const attr=(id:string,key:string,value:string|number)=>parts.get(id)!.setAttribute(key,String(value));
  const cue=[t('种子吸水，慢慢膨胀'),t('种皮裂开，胚根伸出'),t('胚轴弯成钩，抬起子叶'),t('子叶张开，种皮松脱'),t('第一对真叶舒展开来'),t('真叶展开，幼苗继续生长')];
  return {dispose(){leafMotions.forEach(m=>m.dispose());},update(progress:number,water:string,air:string){
    const g=beanGeometry(progress),{cot,leafNode}=g;
    attr('root','stroke-dashoffset',1-g.root);attr('root-light','stroke-dashoffset',1-g.root);
    for(let i=0;i<12;i++){const at=.15+i*.061,amount=Math.max(0,Math.min(1,(g.root-at-.035)*4));
      const path=parts.get(`lateral-${i}`)!.querySelector('path')!;path.setAttribute('stroke-dashoffset',String(1-amount));
      attr(`hairs-${i}`,'opacity',Math.max(0,(amount-.45)/.55)*.65);}
    attr('hypocotyl','d',g.hypocotyl);attr('epicotyl','d',g.epicotyl);
    for(const [i,side]of ['left','right'].entries()){
      const sign=i===0?-1:1,open=g.cotOpen;
      attr(`cot-${side}`,'transform',`translate(${cot.x+sign*3*open} ${cot.y}) rotate(${-sign*open*28}) scale(${g.swell*(1-.23*g.lift)})`);
      attr(`green-${side}`,'opacity',g.cotGreen);
      const c=g.coats[i]!;attr(`coat-${side}`,'transform',`translate(${c.x} ${c.y}) rotate(${c.angle}) scale(${c.scale*g.swell} ${c.scale*g.swell*(1-.55*g.coatFall)})`);
      const unfold=i===0?g.leafLeft:g.leafRight;
      const a={x:leafNode.x+sign*15*g.shoot,y:leafNode.y-4*g.shoot};
      attr(`petiole-${side}`,'d',`M${leafNode.x} ${leafNode.y} Q${leafNode.x+sign*8*g.shoot} ${leafNode.y-7*g.shoot} ${a.x} ${a.y}`);
      attr(`leaf-shape-${side}`,'d',leafMotions[i]!.sample(unfold));
      attr(`leaf-${side}`,'transform',`translate(${a.x} ${a.y}) rotate(${i===0?g.leafAngleLeft:g.leafAngleRight}) scale(${.88*unfold} ${.88*unfold*(.65+.35*unfold)})`);
    }
    attr('bud','transform',`translate(${leafNode.x} ${leafNode.y}) scale(${g.shoot})`);
    attr('earth','fill',`url(#${water==='dry'?'dry-earth':'earth'})`);attr('moss','opacity',water==='dry'?.22:.87);
    attr('pores','opacity',water==='flood'||air==='no'?.15:.75);attr('flood','opacity',water==='flood'?1:0);
    const caption=parts.get('caption')!,copy=cue[g.phase]!;
    if(caption.getAttribute('data-copy')!==copy){
      caption.setAttribute('data-copy',copy);caption.replaceChildren();
      const lines:string[]=[''];for(const word of copy.split(' ')){const last=lines.length-1;if(lines[last]!.length+word.length>32)lines.push(word);else lines[last]+=(lines[last]?' ':'')+word;}
      caption.setAttribute('y',lines.length>1?'64':'73');
      for(const [i,line]of lines.entries()){const span=document.createElementNS('http://www.w3.org/2000/svg','tspan');span.setAttribute('x','380');span.setAttribute('dy',i===0?'0':'17');span.textContent=line;caption.append(span);}
    }
    return cue[g.phase]!;
  }};
}
