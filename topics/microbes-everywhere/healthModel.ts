/** Qualitative teaching states, not pathogen loads, treatment forecasts or biological time. */
export const virusKinds=['influenza','norovirus','phage'] as const;
export type VirusKind=typeof virusKinds[number];
export const healthCases=['airway','gut','wound'] as const;
export type HealthCase=typeof healthCases[number];
export const careMethods=['wash','alcohol','antibiotic','antiviral','symptoms','vaccine'] as const;
export type CareMethod=typeof careMethods[number];
export const bacterialForms=['rod','coccus','spiral'] as const;
export type BacterialForm=typeof bacterialForms[number];
export const casePathogen={airway:'influenza',gut:'norovirus',wound:'staph'} as const;
export const caseSite={airway:'airway',gut:'intestine',wound:'skin'} as const;
export type Entry='entered'|'blocked';
export const bounded=(p:number):number=>Number.isFinite(p)?Math.max(0,Math.min(1,p)):0;
export const ramp=(start:number,end:number,p:number):number=>{const q=bounded((p-start)/(end-start));return q*q*(3-2*q);};
export function sampleHumanVirus(kind:Exclude<VirusKind,'phage'>,p:number,entry:Entry='entered'){
 p=bounded(p);const admitted=entry==='entered';
 const attached=ramp(.05,.2,p),entered=admitted?ramp(.19,.35,p):0;
 const copied=admitted?ramp(.36,.61,p):0,assembled=admitted?ramp(.61,.8,p):0;
 const released=admitted?ramp(.81,1,p):0;
 return {p,attached,entered,copied,assembled,released,copySite:kind==='influenza'?'nucleus':'cytoplasm',stage:admitted?Math.min(4,Math.floor(p*5)):p<.2?0:5};
}
export function sampleInfection(site:HealthCase,p:number,entry:Entry){
 p=bounded(p);const admitted=entry==='entered',viral=site!=='wound';
 return {p,viral,arrival:ramp(0,.2,p),entry:admitted?ramp(.2,.4,p):0,
  multiplication:admitted?ramp(.42,.7,p):0,injury:admitted?ramp(.65,.88,p):0,
  inflammation:admitted?ramp(.58,1,p):0,toxin:admitted&&!viral?ramp(.56,.9,p):0,stage:!admitted&&p>=.25?4:Math.min(3,Math.floor(p*4))};
}
export function sampleImmunity(site:HealthCase,p:number,memory:boolean,entry:Entry){
 p=bounded(p);const admitted=entry==='entered',viral=site!=='wound';
 const innate=admitted?ramp(.16,.45,p):0;
 const antibodies=admitted?ramp(memory?.25:.53,memory?.54:.8,p):0;
 const tCell=admitted&&viral?ramp(memory?.58:.77,memory?.84:.98,p):0;
 // Antibodies are an extracellular encoding; infected-cell clearance is a separate effector.
 return {p,viral,admitted,innate,antibodies,tCell,markedBacteria:!viral?antibodies:0,
  clearance:viral?tCell:Math.max(innate*.55,antibodies),stage:!admitted?4:p<.2?0:p<.52?1:p<.78?2:3};
}
export function sampleCare(method:CareMethod,site:HealthCase,p:number,resistant=false){
 p=bounded(p);const pathogen=casePathogen[site],bacterial=pathogen==='staph';
 const effect=ramp(.2,.9,p);
 const targetMatches=method==='wash'||method==='symptoms'||method==='alcohol'&&pathogen!=='norovirus'||method==='antibiotic'&&bacterial&&!resistant||(method==='antiviral'||method==='vaccine')&&pathogen==='influenza';
 return {p,pathogen,bacterial,targetMatches,location:method==='wash'||method==='alcohol'?'outside':method==='vaccine'?'training':'inside',
  removal:method==='wash'?effect:0,
  inactivation:method==='alcohol'&&targetMatches?effect:0,
  wallSynthesisBlocked:method==='antibiotic'&&targetMatches?effect:0,
  releaseBlocked:method==='antiviral'&&targetMatches?effect:0,
  symptomRelief:method==='symptoms'?effect:0,
  memoryTrained:method==='vaccine'&&targetMatches?effect:0,
  // Washing retains some illustrative residents; symptoms/vaccines do not erase an infection.
  killsExisting:method==='alcohol'&&targetMatches||method==='antibiotic'&&targetMatches,
  stage:Math.min(3,Math.floor(p*4))};
}

/** Influenza acquires its envelope while budding at the host surface, not in the cytoplasm. */
export function sampleAssembly(kind:Exclude<VirusKind,'phage'>,release:number){return {envelope:kind==='influenza'?ramp(.43,.58,release):0,nonEnvelopedCapsid:kind==='norovirus'?1:0};}
