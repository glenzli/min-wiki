import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t); mountTopicNavigation('plant-water');
const scene = document.querySelector<SVGSVGElement>('#scene')!;
const result = document.querySelector<HTMLElement>('#result')!;
const background = `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#e4f0e8"/><stop offset="1" stop-color="#f7f5df"/></linearGradient><linearGradient id="soil" x2="0" y2="1"><stop stop-color="#d5b78e"/><stop offset="1" stop-color="#b58b62"/></linearGradient><linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#8dbc64"/><stop offset="1" stop-color="#3c8750"/></linearGradient><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="none" stroke="#2f9eb8" stroke-width="2"/></marker></defs><rect width="760" height="530" fill="url(#sky)"/><circle cx="656" cy="87" r="37" fill="#f7d477"/>`;
const soilDetail = Array.from({length:210},(_,i)=>`<ellipse cx="${(i*137.3)%760}" cy="${376+(i*43.71)%152}" rx="${1+i%4}" ry="${.7+i%3}" fill="${i%2?'#806746':'#eed6af'}" opacity=".3"/>`).join('');
const rootHairs = Array.from({length:26},(_,i)=>{const u=i/25,x=375-u*109,y=366+u*73;return `<path d="M${x} ${y}q-8 0 -17 ${i%2?10:-9}M${750-x} ${y+5}q10 0 16 12"/>`;}).join('');
const veins = Array.from({length:7},(_,i)=>{const u=(i+1)/9;return `<path d="M${375-88*u} ${245-55*u}l${-12-10*u} ${8-21*u}m${12+10*u} ${-8+21*u}l${3-11*u} ${-20-7*u}M${375+88*u} ${178-40*u}l${8+10*u} ${9+4*u}m${-8-10*u} ${-9-4*u}l${-5+8*u} ${-17-5*u}"/>`;}).join('');
const el = <T extends HTMLElement>(id: string) => document.getElementById(id)! as T;
const label = (x: number, y: number, text: string, cls = '') => {
  const lines: string[] = [''];
  if (cls === 'small' && text.includes(' ') && text.length > 18) {
    for (const word of text.split(' ')) {
      const last = lines.length - 1;
      if (lines[last] && lines[last]!.length + word.length + 1 > 18) lines.push(word);
      else lines[last] += (lines[last] ? ' ' : '') + word;
    }
  } else lines[0] = text;
  return `<text x="${x}" y="${y}" text-anchor="middle" class="${cls}">${lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : 22}">${line} </tspan>`).join('')}</text>`;
};
let shown = 0;
let cancelWater: () => void = () => {};
function seek(target: number) {
  cancelWater(); el<HTMLInputElement>('step').value=String(target); draw();
  const path=scene.querySelector<SVGPathElement>('#water-journey')!;
  const distances=[0,.41,.7,1];
  const from=shown;
  cancelWater=animateValue({from,to:distances[target]!,duration:1100,onUpdate:value=>{
    shown=value; const p=path.getPointAtLength(path.getTotalLength()*value);
    const dot=scene.querySelector<SVGCircleElement>('#water-marker')!;
    dot.setAttribute('cx',String(p.x));dot.setAttribute('cy',String(p.y));
    dot.setAttribute('opacity',String(1-.7*Math.max(0,(value-.82)/.18)));
  }});
}
el('step').addEventListener('input',()=>seek(Number(el<HTMLInputElement>('step').value)));
el('next').addEventListener('click',()=>seek(Math.min(3,Number(el<HTMLInputElement>('step').value)+1)));
el('reset').addEventListener('click',()=>seek(0));
function draw() { const s=Number(el<HTMLInputElement>('step').value);let art=`<rect x="0" y="362" width="760" height="168" fill="url(#soil)"/>${soilDetail}<g stroke="#ead6ac" stroke-width="1.4" fill="none">${rootHairs}</g><path d="M0 361 Q200 354 380 363 T760 361" stroke="#91b575" stroke-width="12" fill="none"/><path d="M375 364 C330 398 309 418 260 440 M375 364 Q404 402 457 451 M375 364 L369 478 M350 387 L289 386 M411 415 L462 407 M365 438 L328 455" stroke="#f4e6c5" stroke-width="9" fill="none" class="line"/><path d="M375 364 L375 148" stroke="#659451" stroke-width="25" class="line"/><path d="M366 360V160M384 352V179" stroke="#c7d99c" stroke-width="2" opacity=".7"/><path d="M375 245 Q272 259 258 169 Q350 154 375 245 M375 178 Q399 94 492 118 Q480 204 375 178" fill="url(#leaf)"/><path d="M375 245 L287 190 M375 178 L463 138" stroke="#b6d38b" stroke-width="3"/><g stroke="#d7e5b0" stroke-width="1.2" opacity=".65" fill="none">${veins}</g>`;
const paths=['M259 440 Q315 421 375 364','M375 364 L375 180','M375 180 L463 138','M472 123 Q507 97 525 55'];for(let i=0;i<=s;i++)art+=`<path d="${paths[i]}" stroke="#2da5cd" stroke-width="7" fill="none" class="line" ${i===3?'stroke-dasharray="3 12"':''}/>`;
art+=`<path id="water-journey" d="M259 440 Q315 421 375 364 L375 180 L463 138 Q492 113 525 55" fill="none" stroke="none"/><circle id="water-marker" cx="259" cy="440" r="12" fill="#43b2d5" stroke="white" stroke-width="4"/>`;
art+=`<rect x="478" y="254" width="227" height="160" rx="25" fill="#fff9"/><ellipse cx="550" cy="312" rx="25" ry="34" fill="#90b976"/><ellipse cx="603" cy="312" rx="25" ry="34" fill="#90b976"/><ellipse cx="577" cy="312" rx="10" ry="25" fill="#426c43"/>`+label(590,373,t('叶上的小孔：气孔'),'small')+label(155,463,t('根'))+label(310,288,t('茎'))+label(523,177,t('叶'));
scene.innerHTML=background+art+label(188,103,[t('第一站 · 根吸水'),t('第二站 · 茎里的通道'),t('第三站 · 叶脉'),t('第四站 · 进入空气')][s]!,'svg-title');
result.textContent=[t('根从土里吸收水。根没有嘴巴，水能穿过根的表面进入植物。'),t('水沿着茎里的细小通道向上走。这些运水的组织叫木质部。'),t('水沿着叶脉到达叶子。植物也用水制造养分、保持身体挺立。'),t('一部分水在叶里变成水汽，通过气孔离开。这叫蒸腾，也帮助拉动下面的水。')][s]!;el<HTMLButtonElement>('next').disabled=s===3; }
draw();

mountReadingMode('details:not(.references)');
