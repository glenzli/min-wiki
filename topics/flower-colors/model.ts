export const cases=['pigments','hydrangea','morning','guides'] as const;
export type FlowerCase=typeof cases[number];
export const clamp=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
export function readFlowerState(query:string,legacy=false){const p=new URLSearchParams(query),c=p.get('case');return {case:(cases.includes(c as FlowerCase)?c:legacy?'hydrangea':'pigments') as FlowerCase,rose:Math.round(clamp(Number(p.get('rose')??0)/3)*3),opening:clamp(Number(p.get('opening')??1)),uv:p.get('uv')==='1',close:p.get('close')==='1'};}
export const roses=[{color:'#bb345f',anthocyanin:1,carotenoid:.08},{color:'#efbf48',anthocyanin:.04,carotenoid:1},{color:'#ef9470',anthocyanin:.6,carotenoid:.65},{color:'#f5efe6',anthocyanin:.03,carotenoid:.04}] as const;
/** Coupled teaching interpolation for I. tricolor Heavenly Blue, not measured kinetics or a soil-pH response. */
export function morningState(progress:number){const p=clamp(progress),smooth=p*p*(3-2*p);return {opening:.24+.76*smooth,hue:332-107*smooth,environment:smooth};}
