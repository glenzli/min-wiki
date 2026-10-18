import { clamp, redCell, oxygenPacket, defenceState, immuneContour, VESSEL_CONTACT_BAND, repairState, vesselGap, engulfedTarget, type BloodProcess } from './model.ts';
type Translator = (source: string) => string;
const defs = `<defs>
  <linearGradient id="field" x2="0" y2="1"><stop stop-color="#faf9f3"/><stop offset="1" stop-color="#e9e9df"/></linearGradient>
  <radialGradient id="plasma" cx=".5" cy=".4" r=".9"><stop stop-color="#f8e8d9"/><stop offset=".65" stop-color="#e9cabb"/><stop offset="1" stop-color="#c59892"/></radialGradient>
  <radialGradient id="red-disc" cx=".47" cy=".43" r=".6"><stop stop-color="#f1b6a6"/><stop offset=".24" stop-color="#e7a196"/><stop offset=".5" stop-color="#c85f65"/><stop offset=".73" stop-color="#b34453"/><stop offset=".9" stop-color="#a23e50"/><stop offset="1" stop-color="#843749"/></radialGradient>
  <radialGradient id="white-cell" cx=".32" cy=".25" r=".9"><stop stop-color="#fcfaf4"/><stop offset=".6" stop-color="#e4dfe7"/><stop offset="1" stop-color="#b6a9be"/></radialGradient>
  <radialGradient id="nucleus" cx=".35" cy=".23" r=".9"><stop stop-color="#b3a0be"/><stop offset=".5" stop-color="#877099"/><stop offset="1" stop-color="#5e506e"/></radialGradient>
  <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#e9c7ba"/><stop offset=".45" stop-color="#d9b0a5"/><stop offset="1" stop-color="#ba8f91"/></linearGradient>
  <radialGradient id="tissue" cx=".3" cy=".2" r=".9"><stop stop-color="#e8dbc8"/><stop offset="1" stop-color="#bfb39e"/></radialGradient>
  <radialGradient id="platelet" cx=".3" cy=".2" r=".9"><stop stop-color="#eadbdc"/><stop offset=".6" stop-color="#c3a0b4"/><stop offset="1" stop-color="#9e809d"/></radialGradient>
  <filter id="soft-shadow" x="-30%" y="-40%" width="160%" height="190%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#693c3c" flood-opacity=".14"/></filter>
  <clipPath id="inside-vessel"><path d="M42 184Q490 158 938 184V301Q490 328 42 301Z"/></clipPath>
  <g id="rbc"><path d="M-42-1C-43-16-27-27-7-27C12-29 34-20 40-7C48 8 32 24 12 27C-10 31-40 20-42-1Z" fill="url(#red-disc)" stroke="#a14d59" stroke-width="1.1"/>
    <path d="M-17-3C-16-10-3-13 9-10C20-8 21-1 15 5C6 12-14 9-17-3Z" fill="#edb5a5" opacity=".48"/>
    <path d="M-33 -9C-26 -21 -5 -24 14 -19" stroke="#f5c4af" stroke-width="1.7" stroke-linecap="round" fill="none" opacity=".65"/>
    <path d="M-29 15C-13 25 17 24 32 9" stroke="#823c4e" stroke-width="1.1" fill="none" opacity=".4"/>
    <path d="M-14 -4C-8 -10 7 -11 15 -4" stroke="#c47877" stroke-width=".7" fill="none" opacity=".4"/></g>
</defs>`;
const label = (x:number,y:number,text:string,small=false) => `<text x="${x}" y="${y}" font-size="${small?14:19}" fill="#594653" font-weight="${small?450:650}" text-anchor="middle">${text}</text>`;
function bloodCell(x:number,y:number,scale=1,angle=0) { return `<use href="#rbc" transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})" filter="url(#soft-shadow)"/>`; }
function immuneCell(state:ReturnType<typeof defenceState>) {
  const {x,y,squeeze}=state;
  const contour=immuneContour(state),points=contour.map(point=>`${point.x},${point.y}`).join(' ');
  const clip=`M${contour.map(point=>`${point.x} ${point.y}`).join('L')}Z`;
  const grains=Array.from({length:76},(_,i)=>{const a=i*2.399,r=12+(i*11)%31;return `<circle cx="${x+Math.cos(a)*r*(1-squeeze*.4)}" cy="${y+Math.sin(a)*r*(1+squeeze*.3)}" r="${.65+i%3*.3}" fill="${i%3?'#a88fa9':'#c7afbd'}" opacity=".55"/>`;}).join('');
  const inner=contour.map((point,i)=>`${i?'L':'M'}${x+(point.x-x)*.94} ${y+(point.y-y)*.94}`).join('')+'Z';
  return `<defs><clipPath id="immune-interior"><path d="${clip}"/></clipPath></defs>
    <g filter="url(#soft-shadow)"><polygon points="${points}" fill="url(#white-cell)" stroke="#ab96ad" stroke-width="1.5"/>
    <g clip-path="url(#immune-interior)"><path d="${inner}" fill="none" stroke="#fffaf5" stroke-width="1.1" opacity=".7"/>${grains}<g transform="translate(${x} ${y}) scale(${1-squeeze*.36} ${1+squeeze*.3})">
      <path d="M-24 -15C-39 -15 -39 7 -24 9C-13 12 -13 22 -2 22C11 23 14 12 6 5C-4 -2 0 -4 12 -3C32 0 35 -22 21 -27C7 -29 6 -12 -7 -10C-15 -8 -10 -17 -24 -15Z" fill="url(#nucleus)" stroke="#776184" stroke-width="1.1"/>
      <path d="M-28-9q-6 5 0 11m7 0q6 0 6 8m10 6q8 0 6-7m14-23q9-4 10 5m-9 4q-8 1-10 5" stroke="#c1adc9" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".7"/>
      <path d="M-30 0l6 4m1-11 5 2m15 15 4 3m13-29 4 2m-1 5 6-2" stroke="#64516f" stroke-width="1" opacity=".6"/>
    </g><path d="M${x-35} ${y-20}Q${x-28} ${y-39} ${x-10} ${y-39}" fill="none" stroke="#fffdf4" stroke-width="1.8" opacity=".8"/></g></g>`;
}
function vessel(kind:BloodProcess, progress:number) {
  const gap=vesselGap(kind,progress);
  const wallCells = [163,319].map(y=>Array.from({length:11},(_,i)=>{
    const x=28+i*87+Math.sin(i*1.7)*9,end=28+(i+1)*87+Math.sin((i+1)*1.7)*9,cx=(x+end)/2;
    const shift=(i%3-1)*2;
    return `<g><path d="M${x} ${y+3}Q${cx+shift} ${y-5} ${end} ${y+3}L${end-3} ${y+16}Q${cx-4} ${y+22} ${x-2} ${y+16}Z" fill="url(#wall)" stroke="#b68d8d" stroke-width=".85"/>
      <path d="M${cx-13+shift} ${y+9}q10-5 23-1q6 3-3 5q-13 3-20-1Z" fill="#9e8198" opacity=".7"/>
      <path d="M${x+12} ${y+3}Q${cx} ${y-1} ${end-13} ${y+3}M${cx-5} ${y+9}h9" stroke="#fae4d6" stroke-width=".8" fill="none" opacity=".65"/></g>`;
  }).join('')).join('');
  return `<defs><mask id="wall-opening"><rect width="980" height="550" fill="white"/><rect x="${gap.center-gap.halfWidth}" y="${VESSEL_CONTACT_BAND.top}" width="${2*gap.halfWidth}" height="${VESSEL_CONTACT_BAND.bottom-VESSEL_CONTACT_BAND.top}" fill="black"/></mask></defs><path d="M42 181Q490 157 938 181V306Q490 330 42 306Z" fill="url(#plasma)"/><g mask="url(#wall-opening)"><path d="M35 163Q490 147 945 163V181Q490 190 35 181ZM35 319Q490 305 945 319V337Q490 347 35 337Z" fill="url(#wall)"/>${wallCells}<path d="M54 184Q470 168 926 184M54 301Q470 319 926 301" fill="none" stroke="#fff1da" stroke-width="2" opacity=".58"/></g>`;
}
function tissueCells() {
  return Array.from({length:9},(_,i)=>{
    const x=56+i*106,dy=(i%3-1)*8;
    return `<g transform="translate(${x} ${430+dy}) rotate(${i%2?7:-5}) scale(${.86+(i%3)*.08} ${.88+(i%2)*.13})"><path d="M-24-13C-29-31-12-43 9-42L34-45Q59-38 63-15L71 8Q59 31 37 38L7 43Q-16 29-23 12C-29 5-27-5-24-13Z" fill="url(#tissue)" stroke="#b2a995" stroke-width="1.2"/>
      <ellipse cx="17" cy="-3" rx="14" ry="11" fill="#aa9aa8" opacity=".7"/><circle cx="21" cy="-3" r="3" fill="#887e94" opacity=".5"/>
      <path d="M-14-18Q-4-39 17-36m-26 54q20 15 42 7" fill="none" stroke="#fff7e8" stroke-width="1.2" opacity=".65"/>
      <path d="M41-20q8 1 7 7t-8 6M-9 1q-8 4-3 10" fill="none" stroke="#b7a791" stroke-width="1.3"/></g>`;
  }).join('');
}
export function renderBlood(kind:BloodProcess,progress:number,t:Translator) {
  const p=clamp(progress);
  const ambient=Array.from({length:9},(_,i)=>bloodCell(88+i*104,204+i%3*35,.55+i%3*.08,-28+i*19)).join('');
  let process='';
  if(kind==='oxygen'){
    const r=redCell(p);
    process=`<g data-focus-cell="red">${bloodCell(r.x,r.y,1.3,-8+12*p)}</g>`;
    for(let i=0;i<6;i++){const o=oxygenPacket(i,p);process+=`<g data-oxygen="${i}" transform="translate(${o.x} ${o.y})"><circle r="6" fill="#e9b94a" stroke="#88683f" stroke-width="1"/><circle cx="-1.8" cy="-2" r="1.7" fill="#fff6c5"/></g>`;}
    process+='<g data-scene-labels>'+label(265,105,t('红细胞留在血管内'))+label(734,498,t('氧气进入周围组织'))+`<path d="M252 116L${r.x-15} 193M730 483v-27" stroke="#886b69" fill="none" stroke-dasharray="3 5"/></g>`;
  }else if(kind==='defence'){
    const s=defenceState(p),target=engulfedTarget(p);
    process=immuneCell(s);
    if(s.engulf>0)process+=`<ellipse data-phagosome="true" cx="${target.x}" cy="${target.y}" rx="${20*s.engulf}" ry="${24*s.engulf}" fill="#f0e3bf" fill-opacity="${s.engulf*.85}" stroke="#9b9587" stroke-opacity="${s.engulf}"/>`;
    // Cutaway view: the same target remains visible inside the enclosing vesicle.
    process+=`<g data-bacterium="true" transform="translate(${target.x} ${target.y})"><path d="M-11 -4q11 -10 22 0v8q-11 9 -22 0Z" fill="#82957b" stroke="#627360" stroke-width="2"/><path d="M-7 -9l-2-7m10 7 4-7m-14 27-2 7m13-6 3 7" stroke="#627360" stroke-width="1.5"/></g>`;
    process+='<g data-scene-labels>'+label(264,105,t('一类白细胞：中性粒细胞'))+label(716,498,t('穿出血管，包围并吞入'))+`<path d="M609 473l15-37" stroke="#886b69" stroke-dasharray="3 5"/></g>`;
  }else{
    const s=repairState(p);
    process=`<path d="M494 317l-9 35 35-12 15 21 28-17-9-28" fill="#c59791" opacity=".3"/>`;
    s.platelets.forEach((v,i)=>{
      const points=Array.from({length:12},(_,j)=>{const a=j*Math.PI/6,r=j%2?7:7+(4+(j+i)%3)*v.activation;return {x:Math.cos(a)*r,y:Math.sin(a)*r};});
      const outline=points.map((point,j)=>{const next=points[(j+1)%points.length]!;return `Q${point.x} ${point.y} ${(point.x+next.x)/2} ${(point.y+next.y)/2}`;}).join('');
      const first=points[0]!,last=points.at(-1)!;
      process+=`<g data-platelet="${i}" transform="translate(${v.x} ${v.y}) rotate(${i*29})"><path d="M${(first.x+last.x)/2} ${(first.y+last.y)/2}${outline}Z" fill="url(#platelet)" stroke="#947a96" stroke-width="1"/>
        <g stroke="#a083a0" stroke-width=".65" opacity="${v.activation*.65}" fill="none">${points.filter((_,j)=>j%2===0).map(point=>`<path d="M${point.x*.35} ${point.y*.35}L${point.x*.76} ${point.y*.76}"/>`).join('')}</g>
        <ellipse cx="-1" cy="-1" rx="3.5" ry="2.7" fill="#b28da8"/><g fill="#826e91" opacity=".65"><circle cx="-2" cy="0" r=".85"/><circle cx="1" cy="-2" r=".7"/><circle cx="2" cy="1" r=".8"/></g>
        <path d="M-4-3q3-3 6-1" fill="none" stroke="#f8e4e5" stroke-width=".8"/></g>`;
    });
    process+=`<g opacity="${s.fibrin}" stroke="#b0947b" stroke-width="1.25" stroke-linecap="round" fill="none">`+Array.from({length:12},(_,i)=>`<path d="M${480+i*7} 280Q${512-i*4} 310 ${570-i*4} 341M479 ${283+i*5}Q521 ${291+i*4} 567 ${295+i*3}"/>`).join('')+'</g>';
    process+=label(276,105,t('血小板：细胞的一小部分'))+label(723,498,t('血小板聚集，纤维蛋白加固'));
  }
  const matrix=`<g stroke="#c1b6a0" stroke-width=".8" opacity=".25" fill="none">${Array.from({length:6},(_,i)=>`<path d="M34 ${383+i*18}C170 ${365+i*16} 244 ${419+i*8} 392 ${390+i*16}S725 ${377+i*19} 946 ${405+i*13}"/>`).join('')}</g>`;
  return defs+`<rect width="980" height="550" fill="url(#field)"/>${matrix}<g opacity=".35">${tissueCells()}</g>${vessel(kind,p)}<g clip-path="url(#inside-vessel)" opacity=".63">${ambient}</g>${process}<path d="M54 130h51m-10-6 10 6-10 6" fill="none" stroke="#967e73" stroke-width="2"/>${label(80,114,t('血流'),true)}${label(844,363,t('血管壁'),true)}`;
}
