/** Presentation phases, not rates of growth or an identification model. */
export const clamp=(p:number)=>Math.max(0,Math.min(1,p));
export const smooth=(a:number,b:number,p:number)=>{const u=clamp((p-a)/(b-a));return u*u*(3-2*u);};
export type Part='wall'|'membrane'|'dna'|'ribosomes';
export const partNames:Part[]=['wall','membrane','dna','ribosomes'];
export const anchors:Record<Part,readonly[number,number]>={wall:[246,134],membrane:[205,174],dna:[390,245],ribosomes:[512,288]};
export function exchangeState(p:number){
 return {nutrient:{x:138,y:8+166*smooth(.05,.6,p)},product:{x:245,y:174-166*smooth(.4,.95,p)},stage:p<.4?0:p<.75?1:2};
}
export function divisionState(p:number){
 const progress=clamp(p),copy=smooth(.2,.48,progress),partition=smooth(.48,.68,progress),constriction=smooth(.65,.9,progress);
 return {progress,length:330+150*smooth(0,.4,progress),copy,partition,neck:60*(1-constriction),gap:28*smooth(.9,1,progress),
  chromosomeOffset:108*partition,stage:progress<.2?0:progress<.48?1:progress<.9?2:3};
}
/** A transition starts from current displayed weights, including interrupted transitions. */
export function selectionWeights(from:number[],part:Part,p:number){return from.map((v,i)=>v+(Number(partNames[i]===part)-v)*clamp(p));}
