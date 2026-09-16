import { clamp, redCell, oxygenPacket, defenceState, repairState, vesselGap, engulfedTarget, type BloodProcess } from './model.ts';
type Translator = (source: string) => string;
const defs = `<defs>
  <linearGradient id="field" x2="0" y2="1"><stop stop-color="#f6eee6"/><stop offset="1" stop-color="#e9ded3"/></linearGradient>
  <radialGradient id="plasma" cx=".5" cy=".34" r=".9"><stop stop-color="#fff6dd"/><stop offset=".6" stop-color="#ebcfb4"/><stop offset="1" stop-color="#ba8a80"/></radialGradient>
  <radialGradient id="red-disc" cx=".46" cy=".38" r=".6"><stop stop-color="#c7625c"/><stop offset=".27" stop-color="#b13b40"/><stop offset=".5" stop-color="#ea7068"/><stop offset=".74" stop-color="#c4444c"/><stop offset="1" stop-color="#812e41"/></radialGradient>
  <radialGradient id="white-cell" cx=".32" cy=".25"><stop stop-color="#fff9ee"/><stop offset=".65" stop-color="#ddd4d9"/><stop offset="1" stop-color="#a998b4"/></radialGradient>
  <radialGradient id="nucleus" cx=".35" cy=".23"><stop stop-color="#9b7baf"/><stop offset=".6" stop-color="#695474"/><stop offset="1" stop-color="#453e60"/></radialGradient>
  <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#eed4c2"/><stop offset=".5" stop-color="#d7ad9f"/><stop offset="1" stop-color="#b27f83"/></linearGradient>
  <radialGradient id="tissue" cx=".3" cy=".2"><stop stop-color="#ead9c1"/><stop offset="1" stop-color="#c6af99"/></radialGradient>
  <radialGradient id="platelet" cx=".3" cy=".2"><stop stop-color="#f3dab7"/><stop offset="1" stop-color="#ad8466"/></radialGradient>
  <filter id="soft-shadow" x="-40%" y="-50%" width="180%" height="210%"><feDropShadow dx="1" dy="5" stdDeviation="4" flood-color="#693c3c" flood-opacity=".2"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".62" numOctaves="2" seed="31"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".032"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
  <clipPath id="inside-vessel"><path d="M42 184Q490 158 938 184V301Q490 328 42 301Z"/></clipPath>
  <g id="rbc"><ellipse rx="42" ry="27" fill="url(#red-disc)" stroke="#8e3644" stroke-width="1.3"/><ellipse cy="-2" rx="17" ry="8" fill="#88313d" opacity=".35"/><path d="M-34 -8Q-18 -28 17 -19" stroke="#ffc0a0" stroke-width="3" stroke-linecap="round" fill="none" opacity=".6"/><path d="M-27 16Q0 30 31 10" stroke="#622b3a" stroke-width="2" fill="none" opacity=".32"/></g>
</defs>`;
const label = (x:number,y:number,text:string,small=false) => `<text x="${x}" y="${y}" font-size="${small?14:19}" fill="#594653" font-weight="${small?450:650}" text-anchor="middle">${text}</text>`;
function bloodCell(x:number,y:number,scale=1,angle=0) { return `<use href="#rbc" transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})" filter="url(#soft-shadow)"/>`; }
function immuneCell(x:number,y:number,squeeze:number,engulf:number) {
  const points=Array.from({length:64},(_,i)=>{
    const a=i/64*Math.PI*2,bulge=1+.033*Math.sin(a*9)+engulf*.2*Math.exp(-Math.pow(a-.55,2)/.2);
    return `${x+Math.cos(a)*48*bulge*(1-squeeze*.4)},${y+Math.sin(a)*45*bulge*(1+squeeze*.48)}`;
  }).join(' ');
  const grains=Array.from({length:58},(_,i)=>{const a=i*2.399,r=12+(i*11)%29;return `<circle cx="${x+Math.cos(a)*r*(1-squeeze*.4)}" cy="${y+Math.sin(a)*r*(1+squeeze*.3)}" r="${.8+i%3*.4}" fill="#9b7c9c" opacity=".48"/>`;}).join('');
  return `<g filter="url(#soft-shadow)"><polygon points="${points}" fill="url(#white-cell)" stroke="#ae96a9" stroke-width="2"/><g transform="translate(${x} ${y}) scale(${1-squeeze*.36} ${1+squeeze*.3})"><path d="M-24 -15C-39 -15 -39 7 -24 9C-13 12 -13 22 -2 22C11 23 14 12 6 5C-4 -2 0 -4 12 -3C32 0 35 -22 21 -27C7 -29 6 -12 -7 -10C-15 -8 -10 -17 -24 -15Z" fill="url(#nucleus)" stroke="#6a517e" stroke-width="1.2"/></g>${grains}<path d="M${x-35} ${y-20}Q${x-28} ${y-39} ${x-10} ${y-39}" fill="none" stroke="#fffbee" stroke-width="3" opacity=".72"/></g>`;
}
function vessel(kind:BloodProcess, progress:number) {
  const gap=vesselGap(kind,progress);
  const wallCells = [163,319].map(y=>Array.from({length:11},(_,i)=>{
    const x=28+i*87;
    return `<path d="M${x} ${y}q41 -13 84 0l-3 17q-39 9 -78 0Z" fill="url(#wall)" stroke="#ae817f" stroke-opacity=".55"/><ellipse cx="${x+44}" cy="${y+8}" rx="13" ry="3.5" fill="#9c7587" opacity=".65"/>`;
  }).join('')).join('');
  return `<defs><mask id="wall-opening"><rect width="980" height="550" fill="white"/><rect x="${gap.center-gap.halfWidth}" y="302" width="${2*gap.halfWidth}" height="45" fill="black"/></mask></defs><path d="M42 181Q490 157 938 181V306Q490 330 42 306Z" fill="url(#plasma)"/><g mask="url(#wall-opening)">${wallCells}<path d="M54 184Q470 168 926 184M54 301Q470 319 926 301" fill="none" stroke="#fff1da" stroke-width="2" opacity=".58"/></g>`;
}
function tissueCells() {
  return Array.from({length:9},(_,i)=>{const x=56+i*106;return `<path d="M${x} 394q17 -22 47 -13l31 26-8 52-62 12-29-38Z" fill="url(#tissue)" stroke="#b89e96" stroke-width="1.5"/><ellipse cx="${x+32}" cy="428" rx="14" ry="10" fill="#b396a4" opacity=".6"/><path d="M${x+3} 397l23 -9 24 10" fill="none" stroke="#f8ecdb" stroke-width="2"/>`;}).join('');
}
export function renderBlood(kind:BloodProcess,progress:number,t:Translator) {
  const p=clamp(progress);
  const ambient=Array.from({length:9},(_,i)=>bloodCell(88+i*104,204+i%3*35,.55+i%3*.08,-28+i*19)).join('');
  let process='';
  if(kind==='oxygen'){
    const r=redCell(p);
    process=`<g data-focus-cell="red">${bloodCell(r.x,r.y,1.3,-8+12*p)}</g>`;
    for(let i=0;i<6;i++){const o=oxygenPacket(i,p);process+=`<g data-oxygen="${i}" transform="translate(${o.x} ${o.y})"><circle r="6" fill="#e9b94a" stroke="#88683f" stroke-width="1"/><circle cx="-1.8" cy="-2" r="1.7" fill="#fff6c5"/></g>`;}
    process+=label(265,105,t('红细胞留在血管内'))+label(734,498,t('氧气进入周围组织'))+`<path d="M252 116L${r.x-15} 193M730 483v-27" stroke="#886b69" fill="none" stroke-dasharray="3 5"/>`;
  }else if(kind==='defence'){
    const s=defenceState(p),target=engulfedTarget(p);
    process=immuneCell(s.x,s.y,s.squeeze,s.engulf);
    if(s.engulf>0)process+=`<ellipse data-phagosome="true" cx="${target.x}" cy="${target.y}" rx="${20*s.engulf}" ry="${24*s.engulf}" fill="#f0e3bf" fill-opacity="${s.engulf*.85}" stroke="#9b9587" stroke-opacity="${s.engulf}"/>`;
    // Cutaway view: the same target remains visible inside the enclosing vesicle.
    process+=`<g data-bacterium="true" transform="translate(${target.x} ${target.y})"><path d="M-11 -4q11 -10 22 0v8q-11 9 -22 0Z" fill="#82957b" stroke="#627360" stroke-width="2"/><path d="M-7 -9l-2-7m10 7 4-7m-14 27-2 7m13-6 3 7" stroke="#627360" stroke-width="1.5"/></g>`;
    process+=label(264,105,t('一类白细胞：中性粒细胞'))+label(716,498,t('穿出血管，包围并吞入'))+`<path d="M609 473l15-37" stroke="#886b69" stroke-dasharray="3 5"/>`;
  }else{
    const s=repairState(p);
    process=`<path d="M494 317l-9 35 35-12 15 21 28-17-9-28" fill="#c59791" opacity=".3"/>`;
    s.platelets.forEach((v,i)=>{const spikes=Array.from({length:12},(_,j)=>{const a=j*Math.PI/6,r=j%2?7:7+5*v.activation;return `${Math.cos(a)*r},${Math.sin(a)*r}`;}).join(' ');process+=`<g data-platelet="${i}" transform="translate(${v.x} ${v.y}) rotate(${i*29})"><polygon points="${spikes}" fill="url(#platelet)" stroke="#997b72" stroke-width="1"/><circle r="3" fill="#ba9694"/></g>`;});
    process+=`<g opacity="${s.fibrin}" stroke="#a9876c" stroke-width="1.6" fill="none">`+Array.from({length:12},(_,i)=>`<path d="M${480+i*7} 280Q${512-i*4} 310 ${570-i*4} 341M479 ${283+i*5}Q521 ${291+i*4} 567 ${295+i*3}"/>`).join('')+'</g>';
    process+=label(276,105,t('血小板：细胞的一小部分'))+label(723,498,t('血小板聚集，纤维蛋白加固'));
  }
  return defs+`<rect width="980" height="550" rx="24" fill="url(#field)"/><g opacity=".3">${tissueCells()}</g>${vessel(kind,p)}<g clip-path="url(#inside-vessel)" opacity=".63">${ambient}</g>${process}<path d="M54 130h51m-10-6 10 6-10 6" fill="none" stroke="#967e73" stroke-width="2"/>${label(80,114,t('血流'),true)}${label(844,363,t('血管壁'),true)}<rect x="12" y="12" width="956" height="526" rx="20" fill="transparent" filter="url(#grain)" pointer-events="none"/>`;
}
