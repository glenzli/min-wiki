export type Nutrient = 'sugar' | 'fat';
export const clamp=(v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export const segment=(p:number,a:number,b:number)=>clamp((p-a)/(b-a));
/** A single illustrative cohort, not organ residence times or measured absorption fractions. */
export function digestionSequence(progress:number){
 const p=clamp(progress);
 const phase=p<.1?0:p<.26?1:p<.43?2:p<.8?3:4;
 const bounds=[[0,.1],[.1,.26],[.26,.43],[.43,.8],[.8,1]];
 return {p,phase,local:segment(p,...bounds[phase] as [number,number]),chewing:segment(p,0,.1),mixing:segment(p,.26,.43),breakdown:segment(p,.43,.6),absorption:segment(p,.6,.8),water:segment(p,.8,.97),stool:segment(p,.94,1)};
}
/** Crossing is ordered lumen -> epithelial cell -> tissue -> vessel. */
export function absorptionRoute(progress:number,nutrient:Nutrient){
 const s=digestionSequence(progress),uptake=segment(s.p,.6,.67),processing=segment(s.p,.67,.72),transport=segment(s.p,.72,.8);
 return {uptake,processing,transport,vessel:nutrient==='fat'?'lymph':'blood',packaged:nutrient==='fat'?processing:0};
}
export function lumenRadius(x:number,front:number){
 // Contraction behind the illustrated contents, rather than suction from the front.
 return 72-23*Math.exp(-Math.pow((x-(front-.13))/.1,2));
}
