export type Scenario = 'normal' | 'microbial' | 'chemical';
export type Stage = 'before' | 'after';
export type Component = 'water' | 'minerals' | 'disinfectant' | 'risk';
/** Qualitative symbols, never a measurement or drinking-safety certification. */
export function composition(scenario: Scenario, stage: Stage) {
  return {
    mineralsRemain: true,
    pathogenSymbol: scenario === 'microbial' ? (stage === 'after' ? 'inactivated' : 'possible') : 'not-shown',
    chemicalWarning: scenario === 'chemical',
    boilingRemovesChemicalHazard: false,
  } as const;
}

/** Conceptual progress only: not elapsed boiling time, a kill curve, or safety certification. */
export function treatmentFrame(scenario:Scenario,progress:number){
 const p=Math.max(0,Math.min(1,progress));
 const q=Math.max(0,Math.min(1,(p-.25)/.65));
 return {progress:p,inactivation:scenario==='microbial'?q*q*(3-2*q):0,complete:p===1,mineralsRemain:true,chemicalRemains:scenario==='chemical'};
}
export function particleMotion(index:number,progress:number){
 const p=Math.max(0,Math.min(1,progress));
 return {dx:(Math.sin(index+p*Math.PI*1.4)-Math.sin(index))*(2+index%3),dy:(Math.cos(index+p*Math.PI*1.2)-Math.cos(index))*(2+index%2)};
}
