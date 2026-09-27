import { compassAt } from './compassModel.ts';
import { t } from './i18n.ts';

export function mountCompass(root: HTMLElement) {
  const svg=root.querySelector<SVGSVGElement>('svg')!;
  const range=root.querySelector<HTMLInputElement>('input')!;
  const flip=root.querySelector<HTMLButtonElement>('[data-flip]')!;
  const readout=root.querySelector<HTMLElement>('.readout')!;
  const theory=document.createElement('aside');theory.className='compass-theory';theory.setAttribute('data-academic-only','');theory.hidden=true;
  const heading=document.createElement('h3');heading.textContent=t('为什么各处的 N 端方向不同？');
  const explanation=document.createElement('p');explanation.textContent=t('理想点磁偶极的方向由 B ∝ [3(m·r̂)r̂ − m]/r³ 给出。此页测点在固定半径圆上，只绘归一化方向，不计算场强。翻转磁矩 m 时，同一测点的方向反转；条形磁铁近表面的真实磁场不能由本图推定。');
  theory.append(heading,explanation);root.append(theory);
  let flipped=false;
  const samples=[{angle:270,flipped:false}];
  let priorDirection:number|null=null;
  const angularGap=(a:number,b:number)=>Math.abs(((a-b+540)%360)-180);
  function remember(angle:number){
    if(samples.every(previous=>previous.flipped!==flipped||angularGap(previous.angle,angle)>=28)){
      samples.push({angle,flipped});if(samples.length>8)samples.shift();
    }
  }
  function render(){
    const angle=Number(range.value),point=compassAt(angle,flipped);
    // Position and needle consume the same undistorted model coordinates.
    const px=300+point.x*155,py=205+point.y*155;
    const recorded=samples.filter(sample=>angularGap(sample.angle,angle)>12).map(sample=>{
      const p=compassAt(sample.angle,sample.flipped),old=sample.flipped!==flipped;
      return `<g class="compass-sample" transform="translate(${300+p.x*155} ${205+p.y*155})"><circle r="13" fill="#fffdf5" stroke="${old?'#8c8d8a':'#99a59b'}" stroke-width="1.5" ${old?'stroke-dasharray="3 3"':''}/><g transform="rotate(${p.angle})"><path d="M12 0L-3-5V5Z" fill="${old?'#858a89':'#b4483e'}"/><path d="M-12 0L-3-5V5Z" fill="${old?'#b5bab7':'#6c93a0'}"/></g></g>`;
    }).join('');
    const previous=priorDirection===null?'':`<g class="compass-before" transform="translate(${px} ${py}) rotate(${priorDirection})"><path d="M47 0H73m-8-6l8 6-8 6" fill="none" stroke="#73787a" stroke-width="3" stroke-dasharray="5 4"/></g>`;
    svg.innerHTML=`<rect width="600" height="410" rx="18" fill="#eef2e7"/><circle cx="300" cy="205" r="155" fill="none" stroke="#879b8d" stroke-dasharray="3 8"/><g transform="translate(225 183)"><rect width="75" height="44" rx="5" fill="${flipped?'#46869e':'#c4544b'}"/><rect x="75" width="75" height="44" rx="5" fill="${flipped?'#c4544b':'#46869e'}"/><g fill="white" font-size="21" text-anchor="middle"><text x="37" y="30">${flipped?'S':'N'}</text><text x="112" y="30">${flipped?'N':'S'}</text></g></g>${recorded}${previous}<g class="compass-probe" transform="translate(${px} ${py})"><circle r="28" fill="#fffdf3" stroke="#778b7c" stroke-width="2"/><g transform="rotate(${point.angle})"><path d="M25 0L-4-9V9Z" fill="#b4483e"/><path d="M-25 0L-4-9V9Z" fill="#497c91"/><circle r="3" fill="#fff"/></g><text x="${point.nx*41}" y="${point.ny*41+5}" font-size="18" text-anchor="middle" fill="#943c35">N</text></g>`;
    root.querySelector('output')!.textContent=t('探针位置 {{angle}}°',{angle:range.value});
    readout.textContent=priorDirection===null?t('小箭头记录测过的 N 端方向；灰色是另一种磁极朝向的旧记录，不是运动轨迹。'):t('同一个测点：灰色虚线是翻转前的 N 端，红色是翻转后的 N 端。');
    flip.setAttribute('aria-pressed',String(flipped));
  }
  range.addEventListener('input',()=>{priorDirection=null;remember(Number(range.value));render();});
  flip.addEventListener('click',()=>{const angle=Number(range.value);priorDirection=compassAt(angle,flipped).angle;flipped=!flipped;remember(angle);render();});
  root.querySelectorAll<HTMLButtonElement>('[data-angle]').forEach(button=>button.addEventListener('click',()=>{range.value=button.dataset.angle!;priorDirection=null;remember(Number(range.value));render();}));
  render();
}
