export interface PhysicalWorld { id:string; radiusKm:number; massKg:number; color:string; name:string; type:string; source:string; note:string }
export type Metric='diameter'|'mass'|'density';
export const meanDensity=(massKg:number,radiusKm:number)=>massKg/(4/3*Math.PI*(radiusKm*1e3)**3)/1000;
export const measure=(world:Pick<PhysicalWorld,'radiusKm'|'massKg'>,metric:Metric)=>metric==='diameter'?world.radiusKm*2:metric==='mass'?world.massKg:meanDensity(world.massKg,world.radiusKm);
export function comparison(a:Pick<PhysicalWorld,'radiusKm'|'massKg'>,b:Pick<PhysicalWorld,'radiusKm'|'massKg'>,metric:Metric){const left=measure(a,metric),right=measure(b,metric),max=Math.max(left,right);return {left,right,ratio:right/left,fractions:[left/max,right/max] as [number,number]};}
export const readPair=(query:string,ids:string[])=>{const p=new URLSearchParams(query);return {left:ids.includes(p.get('compareA')??'')?p.get('compareA')!:'earth',right:ids.includes(p.get('compareB')??'')?p.get('compareB')!:'neptune',metric:(['mass','density'].includes(p.get('metric')??'')?p.get('metric'):'diameter') as Metric};};

