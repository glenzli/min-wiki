import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t); mountTopicNavigation('seed-sprouting');
const scene = document.querySelector<SVGSVGElement>('#scene')!;
const result = document.querySelector<HTMLElement>('#result')!;
const el = <T extends HTMLElement>(id: string) => document.getElementById(id)! as T;
const label = (x: number, y: number, text: string, cls = '') => `<text x="${x}" y="${y}" text-anchor="middle" class="${cls}">${text}</text>`;

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
  <linearGradient id="stem" x1="0" x2="1"><stop stop-color="#567932"/><stop offset=".4" stop-color="#b2c679"/><stop offset=".65" stop-color="#8cac57"/><stop offset="1" stop-color="#4e7136"/></linearGradient>
  <linearGradient id="root" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8efcf"/><stop offset=".5" stop-color="#d8c498"/><stop offset="1" stop-color="#b49a72"/></linearGradient>
  <radialGradient id="bean-coat" cx=".34" cy=".26" r=".83"><stop stop-color="#ead7a9"/><stop offset=".55" stop-color="#be9762"/><stop offset="1" stop-color="#806044"/></radialGradient>
  <radialGradient id="cotyledon" cx=".32" cy=".2"><stop stop-color="#d6d994"/><stop offset=".55" stop-color="#a4b264"/><stop offset="1" stop-color="#718844"/></radialGradient>
  <linearGradient id="bean-leaf" x1="0" y1="1" x2=".7" y2="0"><stop stop-color="#426d35"/><stop offset=".48" stop-color="#73a04c"/><stop offset="1" stop-color="#bfd281"/></linearGradient>
  <linearGradient id="water-tint" x2="0" y2="1"><stop stop-color="#90cdd0" stop-opacity=".43"/><stop offset="1" stop-color="#426f7d" stop-opacity=".3"/></linearGradient>
  <filter id="soft-background"><feGaussianBlur stdDeviation="15"/></filter>
  <filter id="root-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.5" dy="2" stdDeviation="2" flood-color="#171711" flood-opacity=".42"/></filter>
  <filter id="leaf-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="1" dy="4" stdDeviation="3" flood-color="#32492a" flood-opacity=".15"/></filter>
  <clipPath id="earth-mask"><path d="M0 318 Q155 309 295 317 T560 316 T760 315 V530 H0Z"/></clipPath>
  <path id="leaf-shape" d="M0 0 C18 -34 16 -71 61 -87 C105 -104 144 -86 172 -105 C154 -62 136 -28 95 -15 C58 -3 22 -14 0 0Z"/>
  <clipPath id="leaf-mask"><use href="#leaf-shape"/></clipPath>
</defs>`;
function leaf(x: number, y: number, scale: number, angle: number) {
  const absScale=Math.abs(scale);
  const veins = Array.from({ length: 7 }, (_, i) => {
    const px = 24 + i * 17, py = -px * .56;
    return `<path d="M${px} ${py} Q${px - 6} ${py - 18} ${px - 2} ${py - 45} M${px} ${py} Q${px + 20} ${py + 1} ${px + 39} ${py - 2}"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y}) scale(${scale} ${absScale}) rotate(${angle})" filter="url(#leaf-shadow)"><use href="#leaf-shape" fill="url(#bean-leaf)" stroke="#7d9f58" stroke-width="1"/><g clip-path="url(#leaf-mask)" fill="none" stroke="#d3df9b" stroke-opacity=".57" stroke-width="1.1">${veins}<path d="M2 -2 Q70 -40 168 -103" stroke-width="2.4"/></g><path d="M8 -2 Q49 -9 92 -18" fill="none" stroke="#e7e9b1" stroke-opacity=".42" stroke-width="1"/></g>`;
}
function seedCoat(x: number, y: number, scale: number) {
  const freckles = Array.from({ length: 17 }, (_, i) => `<ellipse cx="${-31 + (i * 17) % 70}" cy="${-19 + (i * 11) % 43}" rx="${1.8 + i % 3}" ry="1.6" fill="#856743" opacity=".32" transform="rotate(${i * 31})"/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${scale})" filter="url(#root-shadow)"><path d="M-52 -6 C-58 -33 -21 -43 12 -31 C37 -41 64 -16 56 11 C51 35 17 47 -17 33 C-40 26 -52 11 -52 -6Z" fill="url(#bean-coat)" stroke="#7d6040" stroke-width="1.2"/><path d="M8 -24 C-7 -8 -5 8 12 26" fill="none" stroke="#806946" stroke-width="2.1"/><path d="M13 -19 Q-2 1 16 19" fill="none" stroke="#f3e4bd" stroke-width="3.5" opacity=".7"/>${freckles}<path d="M-38 -17 Q-22 -28 -4 -23" fill="none" stroke="#fff0c7" stroke-width="3.5" stroke-linecap="round" opacity=".48"/></g>`;
}
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
let shownGrowth=0,reachedGrowth=0;
let cancelGrowth: () => void = () => {};
function roots(growth: number) {
  if(growth<=0)return '';
  const extension=clamp(growth),emerge=clamp(growth-1);
  const main=`M${411-31*emerge} ${369-55*emerge} C${413-32*emerge} ${394-34*emerge} ${386+5*emerge} ${399-10*emerge} ${388-2*emerge} ${425+4*emerge} Q${388+2*emerge} ${425+37*emerge} ${388+9*emerge} ${425+65*emerge}`;
  const lateral=Array.from({length:13},(_,i)=>{
    const amount=clamp((growth-1-i*.055)*1.8),y=352+i*9,sign=i%2?1:-1;
    const x=386+sign*(35+(i*19)%74),endY=y+28+i%5*5;
    const hairs=Array.from({length:4},(_,j)=>{const u=.38+j*.14,hx=386+(x-386)*u,hy=y+(endY-y)*u;
      return `<path d="M${hx} ${hy} q${sign*(7+j*2)} ${9+j} ${sign*(13+j*3)} ${12+j*3}" stroke-width=".8" opacity="${clamp(amount*2-.7)}"/>`;}).join('');
    return `<g opacity="${amount}"><path d="M386 ${y} Q${386+sign*18} ${y+22} ${x} ${endY}" stroke-width="${2.4-i*.1}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1-amount}"/>${hairs}</g>`;
  }).join('');
  return `<g filter="url(#root-shadow)" fill="none" stroke="url(#root)" stroke-linecap="round"><path d="${main}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1-extension}" stroke-width="${6+2*emerge}"/>${lateral}<path d="${main}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1-extension}" stroke="#fff5d7" stroke-width="1.5" opacity=".57"/></g>`;
}
function conditionsOkay() {return el<HTMLSelectElement>('water').value==='damp'&&el<HTMLSelectElement>('air').value==='yes'&&el<HTMLSelectElement>('temp').value==='warm';}
function seekGrowth() {
  cancelGrowth();
  const stage=el<HTMLInputElement>('stage');
  const requested=Number(stage.value);
  const target=conditionsOkay()?requested:Math.min(requested,reachedGrowth);
  stage.value=String(target);
  cancelGrowth=animateValue({from:shownGrowth,to:target,duration:1250,onUpdate:value=>{
    shownGrowth=value;
    // Only structures actually displayed become available in the growth album.
    reachedGrowth=Math.max(reachedGrowth,value);
    draw();
  }});
}
['water','air','temp'].forEach(id=>el(id).addEventListener('input',()=>{
  cancelGrowth();
  // Keep fractional growth when an observation is interrupted, without rounding
  // the control up to a structure that has not appeared yet.
  el<HTMLInputElement>('stage').value=String(shownGrowth);
  draw();
}));
el('stage').addEventListener('input',seekGrowth);
el('stage').addEventListener('keydown',event=>{
  if(!['ArrowRight','ArrowUp','ArrowLeft','ArrowDown'].includes(event.key))return;
  event.preventDefault();
  const stage=el<HTMLInputElement>('stage'),value=Number(stage.value);
  const forward=event.key==='ArrowRight'||event.key==='ArrowUp';
  stage.value=String(Math.max(0,Math.min(3,forward?Math.floor(value)+1:Math.ceil(value)-1)));
  seekGrowth();
});
el('next').addEventListener('click',()=>{const stage=el<HTMLInputElement>('stage');stage.value=String(Math.min(3,Math.floor(Number(stage.value))+1));seekGrowth()});
el('reset').addEventListener('click',()=>{cancelGrowth();shownGrowth=0;reachedGrowth=0;el<HTMLInputElement>('stage').value='0';draw()});
function draw() {
  const water=el<HTMLSelectElement>('water').value, air=el<HTMLSelectElement>('air').value, temp=el<HTMLSelectElement>('temp').value;
  const requested=Number(el<HTMLInputElement>('stage').value);
  const okay=water==='damp'&&air==='yes'&&temp==='warm';
  const s=Math.min(3,Math.floor(shownGrowth));
  const emerge=clamp(shownGrowth-1),leaves=clamp(shownGrowth-2);
  const backdrop = `<rect width="760" height="530" fill="url(#air-light)"/><circle cx="606" cy="91" r="190" fill="url(#sun-glow)"/><g filter="url(#soft-background)" opacity=".32"><path d="M-15 342 Q26 242 4 163 Q103 165 58 288 Q127 205 142 264 L157 336Z" fill="#9cab75"/><path d="M695 332 Q632 273 658 217 Q688 247 696 273 Q715 160 754 149 L789 333Z" fill="#aebc7d"/><circle cx="93" cy="59" r="48" fill="#bdc797"/><circle cx="664" cy="273" r="39" fill="#f5e3ad"/></g><g opacity=".32" fill="#fffbe2"><circle cx="112" cy="160" r="9"/><circle cx="585" cy="144" r="6"/><circle cx="647" cy="202" r="11"/></g>`;
  const terrain = `<g clip-path="url(#earth-mask)"><rect y="306" width="760" height="224" fill="url(#${water === 'dry' ? 'dry-earth' : 'earth'})"/><path d="M0 380 Q168 341 332 380 T760 369" fill="none" stroke="#b28a53" stroke-opacity=".13" stroke-width="25"/><path d="M0 480 Q189 414 399 459 T760 455" fill="none" stroke="#191f1c" stroke-opacity=".2" stroke-width="24"/>${soilGrains}</g><path d="M0 316 Q155 310 295 317 T560 316 T760 315" fill="none" stroke="#493e2a" stroke-width="5"/>${water !== 'dry' ? `<g opacity=".87">${moss}</g>` : ''}`;
  let specimen = roots(shownGrowth);
  // Seed, hypocotyl and true leaves keep their spatial identity between observations.
  if(leaves<1)specimen+=`<g opacity="${1-leaves}">${seedCoat(376+24*emerge,350-74*emerge,1-.34*emerge)}</g>`;
  if(emerge>0){
    const stem=`M380 ${329-4*leaves} C${350+24*leaves} ${300-48*leaves} ${343+39*leaves} ${254-66*leaves} ${362+20*leaves} ${227-79*leaves} C${380+2*leaves} ${204-56*leaves} ${414-32*leaves} ${225-77*leaves} ${403-21*leaves} ${265-117*leaves}`;
    specimen+=`<path d="${stem}" stroke="url(#stem)" stroke-width="12" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1-emerge}"/>`;
  }
  if(leaves>0)specimen+=`<g transform="translate(380 263) scale(${leaves}) translate(-380 -263)" filter="url(#leaf-shadow)"><path d="M379 263 C355 238 317 239 310 255 C304 279 354 285 379 263Z" fill="url(#cotyledon)"/><path d="M382 263 C398 237 438 239 449 253 C452 278 407 284 382 263Z" fill="url(#cotyledon)"/><path d="M320 256 Q348 251 373 263 M390 263 Q422 251 440 257" fill="none" stroke="#d6dba0" stroke-width="2" opacity=".6"/></g>`+leaf(379,211,-.9*leaves,-4)+leaf(381,183,.9*leaves,5)+`<path d="M382 160 Q362 135 383 116 Q401 137 382 160" fill="#a2bd65" stroke="#6f9448" stroke-width="1" opacity="${leaves}"/>`;
  const pores = air === 'yes' && water !== 'flood' ? `<g fill="#161c18" stroke="#9e8c6a" stroke-width="1" opacity=".7"><ellipse cx="239" cy="363" rx="11" ry="6"/><ellipse cx="538" cy="390" rx="8" ry="5"/><ellipse cx="279" cy="447" rx="7" ry="4"/><ellipse cx="480" cy="477" rx="10" ry="5"/></g>` : '';
  const wet = water === 'flood' ? `<path d="M0 307 Q125 298 254 306 T503 304 T760 305 V530 H0Z" fill="url(#water-tint)"/><path d="M0 307 Q125 298 254 306 T503 304 T760 305" stroke="#c8e7e6" stroke-width="3" fill="none"/><path d="M59 321 h53 m459 -9 h58 m-212 12 h37" stroke="#d7edeb" stroke-width="2" opacity=".65"/>` : '';
  scene.innerHTML = defs + backdrop + terrain + pores + `<g class="specimen">${specimen}</g>` + wet +
    `<rect x="231" y="49" width="298" height="39" rx="19" fill="#fffef0" fill-opacity=".8" stroke="#d7dec6"/>` + label(380,75,[t('小豆子'),t('根先出来'),t('芽向上伸'),t('第一片真叶展开')][s]!, 'stage-caption') +
    `<rect x="30" y="476" width="228" height="31" rx="15" fill="#f4eedc" fill-opacity=".9"/>` + label(144,497,water === 'flood' || air === 'no' ? t('氧气不足') : t('土里面也有空气'),'soil-caption');
if(!okay){
  if(s>0)result.textContent=water==='dry'?t('土太干，已经长出的幼苗会受到缺水影响；它不会变回种子。这里暂停后续生长，试试恢复湿润。'):water==='flood'||air==='no'?t('根和其他活细胞仍需要氧气。积水或缺少空气会妨碍后续生长；已经长出的结构不会倒回种子。'):t('低温让这株幼苗的后续生长变慢。画面保留已长出的结构，用暂停表示影响。');
  else result.textContent=water==='dry'?t('太干了，豆子还没有吸到足够的水。试试湿润的环境。'):water==='flood'||air==='no'?t('豆子需要氧气。水太多会挤走土里的空气，正常成长会受阻。'):t('太冷了，豆子的成长会变慢。这里用暂停来表示，试试温暖。');
}
else result.textContent=[t('先猜猜：会先长根，还是先长叶？'),t('种皮裂开，小根先钻出来，开始吸收水。'),t('小根向下，嫩芽向上。豆子储存的养分帮助它起步。'),t('真叶展开了！长大的小苗还需要光，才能自己制造养分。')][s]!;
    el<HTMLButtonElement>('next').disabled=requested===3||!okay;
}
draw();

mountReadingMode('details:not(.references)');
