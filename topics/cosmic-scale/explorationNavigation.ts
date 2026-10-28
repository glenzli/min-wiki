import type {GalacticCase} from './galacticModel.ts';

/** Questions, rather than renderer types, define the reader's entry points. */
export const chapters=['compare','systems','galaxies','sky','homes','zoom'] as const;
export type Chapter=typeof chapters[number];
export type SceneChapter='systems'|'galaxies'|'sky';
export const sceneCases:Record<SceneChapter,readonly GalacticCase[]>={
  systems:['trappist-1'],
  galaxies:['milky-way','galaxy-comparison','spiral','elliptical','irregular','star-cluster','local-group'],
  sky:['sky','orion'],
};
export const sceneChapter=(selected:GalacticCase):SceneChapter=>selected==='trappist-1'?'systems':selected==='sky'||selected==='orion'?'sky':'galaxies';
export const isSceneChapter=(chapter:Chapter):chapter is SceneChapter=>chapter==='systems'||chapter==='galaxies'||chapter==='sky';

/** Old mixed galaxy links open the same object under its new question, preserving all other state. */
export function readChapter(p:URLSearchParams):Chapter{
  const mode=p.get('mode');
  if(mode==='galaxies')return sceneChapter((p.get('galaxy')??'milky-way') as GalacticCase);
  if(chapters.includes(mode as Chapter))return mode as Chapter;
  return p.has('scale')||p.has('origin')?'zoom':'compare';
}
export type CaseMemory=Record<SceneChapter,GalacticCase>;
export function rememberCase(memory:CaseMemory,selected:GalacticCase):CaseMemory{return {...memory,[sceneChapter(selected)]:selected};}
export function readCaseMemory(p:URLSearchParams,selected:GalacticCase):CaseMemory{
  const structure=p.get('structureCase') as GalacticCase,night=p.get('nightCase') as GalacticCase;
  return rememberCase({systems:'trappist-1',galaxies:sceneCases.galaxies.includes(structure)?structure:'milky-way',sky:sceneCases.sky.includes(night)?night:'sky'},selected);
}
export function saveCaseMemory(p:URLSearchParams,memory:CaseMemory){p.set('structureCase',memory.galaxies);p.set('nightCase',memory.sky);}
