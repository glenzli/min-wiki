import { SUN_RADIUS_KM, AU_KM, solarObservation } from '../sun-star/model.ts';
export { SUN_RADIUS_KM, AU_KM, solarObservation };
export type Chapter = 'sun' | 'types' | 'orbits' | 'three-body';
export const chapterFrom = (value: string | null): Chapter => value === 'types' || value === 'orbits' || value === 'three-body' ? value : 'sun';
export const clamp = (v: number, lo = 0, hi = 1) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo;
export const distanceAU = (progress: number) => 10 ** (clamp(progress) * 3);
export interface Point { x:number; y:number; mass:number }
export function binaryState(time:number, ratio:number, separation=1):Point[] {
  const q=clamp(ratio,.25,4), a=(Number.isFinite(time)?time:0)*Math.PI*2;
  return [{x:-q/(1+q)*separation*Math.cos(a),y:-q/(1+q)*separation*Math.sin(a),mass:1},
    {x:separation/(1+q)*Math.cos(a),y:separation/(1+q)*Math.sin(a),mass:q}];
}
/** Hierarchical circular Jacobi construction, not a three-body integration or a stability proof. */
export function tripleState(time:number):Point[] {
  const t=Number.isFinite(time)?time:0, outer=binaryState(t/Math.sqrt(12**3*2/3),.5,12);
  return [...binaryState(t,1).map(p=>({...p,x:p.x+outer[0]!.x,y:p.y+outer[0]!.y})),
    {...outer[1]!,mass:1}];
}
export const massCenter=(points:Point[])=>{const m=points.reduce((s,p)=>s+p.mass,0);return {x:points.reduce((s,p)=>s+p.x*p.mass,0)/m,y:points.reduce((s,p)=>s+p.y*p.mass,0)/m};};
export const diameterRatio=(radius:number,reference:number)=>2*radius/(2*reference);
export function readState(search:string){const p=new URLSearchParams(search);return {chapter:chapterFrom(p.get('chapter')),distance:clamp(Number(p.get('distance')??0)),type:clamp(Number(p.get('type')??1),0,3),triple:p.get('system')==='triple'};}
