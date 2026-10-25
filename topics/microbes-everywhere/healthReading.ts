import type {SceneStudy} from '../../src/platform/sceneReading';
import type {WorkspaceState} from './workspaceModel';
import {currentProgress,divisionLimit} from './workspaceModel';
import {divisionState} from '../bacteria/model';
import {sampleCycle,hostLimit} from '../viruses/model';
import {sampleHumanVirus,sampleInfection,sampleImmunity,sampleCare} from './healthModel';
import health from './healthContent.json';
import legacy from './workspaceContent.json';
type Copy=typeof health.en;type Legacy=typeof legacy.en;
type SourceKey=keyof Copy['sources'];
export function observationFor(s:WorkspaceState,c:Copy,l:Legacy){
 const p=currentProgress(s);let title:string=c.chapters[s.chapter],child:string='',detail:string='',scope:string=c.boundaries[s.chapter];let sourceKeys:SourceKey[]=[];
 if(s.chapter==='environment'){title=l.habitats[s.habitat];child=l.kids.habitats[s.habitat];detail=l.habitatTexts[s.habitat];sourceKeys=['soil','skinMicrobiome'];}
 else if(s.chapter==='bacteria'){
  sourceKeys=['cell','growth'];
  if(s.process==='division'){const stage=divisionState(p).stage,blocked=s.resources==='limited'&&p>=divisionLimit('limited')-1e-7;title=l.processes.division;child=blocked?l.kids.limited:l.kids.division[stage]!;detail=blocked?l.limitedNote:l.divisionNotes[stage]!;}
  else if(s.process==='exchange'){title=l.parts.membrane;child=l.kids.parts.membrane;detail=l.partTexts.membrane;}
  else if(s.form!=='rod'){title=c.shapesTitle;child=c.shapeFact;detail=c.boundaries.bacteria;}
  else {title=l.parts[s.part];child=c.structureParts[s.part];detail=l.partTexts[s.part];}
 }else if(s.chapter==='viruses'){
  sourceKeys=s.virus==='phage'?['virus','phage']:s.virus==='influenza'?['virus','fluStructure','fluCycle']:['virus','noroStructure','noroCycle'];
  if(s.virusProcess==='structure'){title=c.viruses[s.virus];child=c.virusFacts[s.virus];}
  else if(s.virus==='phage'){
   const cycle=sampleCycle(p,s.host),blocked=s.host!=='compatible'&&p>=hostLimit(s.host)-1e-7;title=blocked?s.host==='mismatch'?l.mismatchTitle:l.defendedTitle:l.virusTitles[cycle.stage]!;child=blocked?s.host==='mismatch'?l.kids.mismatch:l.kids.defended:l.kids.viruses[cycle.stage]!;detail=blocked?s.host==='mismatch'?l.mismatchText:l.defendedText:l.virusTexts[cycle.stage]!;scope+=' '+l.identities.viruses;
  }else {const q=sampleHumanVirus(s.virus,p,s.entry);title=c.virusSteps[q.stage]!;child=q.stage===2?(s.virus==='influenza'?c.replicationFlu:c.replicationNoro):s.entry==='blocked'&&p>.2?c.barrierFact:c.virusFacts[s.virus];}
 }else if(s.chapter==='infection'){
  const q=sampleInfection(s.healthCase,p,s.entry);title=c.infectionSteps[q.stage]!;child=q.stage===4?c.barrierFact:c.caseFacts[s.healthCase];sourceKeys=['infection',s.healthCase==='gut'?'gut':s.healthCase==='wound'?'staph':'virus',...(s.healthCase==='wound'?['toxins'] as const:[])];
 }else if(s.chapter==='immunity'){
  const q=sampleImmunity(s.healthCase,p,s.memory,s.entry);title=q.stage===3?(q.viral?c.immuneChildren.viralFinalTitle:c.immuneChildren.bacterialFinalTitle):c.immuneSteps[q.stage]!;child=!q.admitted?c.barrierFact:q.stage===0?c.immuneChildren.barrier:q.stage===1?c.immuneChildren.innate:q.stage===2?c.immuneChildren.antibody:q.viral?c.immuneChildren.viralFinal:c.bacteriaClear;if(s.memory&&q.admitted){child+=' '+c.immuneChildren.memoryShort;detail=c.memoryFact;}sourceKeys=['immune','Tcells','vaccine'];
 }else{
  const q=sampleCare(s.care,s.healthCase,p,s.resistant);title=c.methods[s.care];child=s.care==='antibiotic'&&s.healthCase==='wound'&&s.resistant?c.resistantFact:!q.targetMatches?c.careNoMatch[s.care]:c.careWorks[s.care];detail=c.ui.medicines;
  sourceKeys=s.care==='wash'||s.care==='alcohol'?['wash','noroClean']:s.care==='antibiotic'?['antibiotic','antibioticUse']:s.care==='antiviral'?['antiviral','antiviralMechanism']:s.care==='vaccine'?['vaccine','immune']:['antibioticUse','gut'];
 }
 return {title,child,detail,scope,sourceKeys};
}
export function studyFor(s:WorkspaceState):SceneStudy{
 const z=observationFor(s,health.zh,legacy.zh),e=observationFor(s,health.en,legacy.en);
 const pair=(zh:string,en:string)=>({zh,en});
 return {title:pair(z.title,e.title),child:pair(z.child,e.child),theory:pair(health.zh.theory[s.chapter]+(z.detail?' '+z.detail:''),health.en.theory[s.chapter]+(e.detail?' '+e.detail:'')),evidence:pair(health.zh.sourcesEvidence,health.en.sourcesEvidence),limits:pair(z.scope,e.scope),sources:e.sourceKeys.map(key=>health.en.sources[key])};
}
