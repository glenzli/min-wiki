import { compassAt } from './compassModel.ts';
import { t } from './i18n.ts';

export function mountCompass(root: HTMLElement) {
  const svg=root.querySelector<SVGSVGElement>('svg')!;
  const range=root.querySelector<HTMLInputElement>('input')!;
  const flip=root.querySelector<HTMLButtonElement>('[data-flip]')!;
  let flipped=false;
  function render(){
    const point=compassAt(Number(range.value),flipped);
    // Position and needle consume the same undistorted model coordinates.
    const px=300+point.x*155,py=205+point.y*155;
    svg.innerHTML=`<rect width="600" height="410" rx="18" fill="#eef2e7"/><circle cx="300" cy="205" r="155" fill="none" stroke="#879b8d" stroke-dasharray="3 8"/><g transform="translate(225 183)"><rect width="75" height="44" rx="5" fill="${flipped?'#46869e':'#c4544b'}"/><rect x="75" width="75" height="44" rx="5" fill="${flipped?'#c4544b':'#46869e'}"/><g fill="white" font-size="21" text-anchor="middle"><text x="37" y="30">${flipped?'S':'N'}</text><text x="112" y="30">${flipped?'N':'S'}</text></g></g><g transform="translate(${px} ${py})"><circle r="28" fill="#fffdf3" stroke="#778b7c" stroke-width="2"/><g transform="rotate(${point.angle})"><path d="M25 0L-4-9V9Z" fill="#b4483e"/><path d="M-25 0L-4-9V9Z" fill="#497c91"/><circle r="3" fill="#fff"/></g><text x="${point.nx*41}" y="${point.ny*41+5}" font-size="18" text-anchor="middle" fill="#943c35">N</text></g>`;
    root.querySelector('output')!.textContent=t('探针位置 {{angle}}°',{angle:range.value});
    flip.setAttribute('aria-pressed',String(flipped));
  }
  range.addEventListener('input',render);
  flip.addEventListener('click',()=>{flipped=!flipped;render();});
  root.querySelectorAll<HTMLButtonElement>('[data-angle]').forEach(button=>button.addEventListener('click',()=>{range.value=button.dataset.angle!;render();}));
  render();
}
