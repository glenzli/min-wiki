import type {SceneStudy} from '../../src/platform/sceneReading.ts';
import type {Illumination,NebulaKind,NebulaReference} from './nebulaModel.ts';
import words from './nebulaContent.json';
export function nebulaStudy(kind:NebulaKind,illumination:Illumination,reference:NebulaReference='orion'):SceneStudy{
  const entry=words.cases[kind],light=words.illumination[illumination],cloud=words.references[reference],nursery=kind==='nursery';
  return {
    child:nursery?light.body:entry.body,
    title:nursery?cloud.name:entry.name,
    theory:nursery?{zh:entry.body.zh+' '+cloud.body.zh+' '+light.body.zh,en:entry.body.en+' '+cloud.body.en+' '+light.body.en}:entry.body,
    evidence:nursery?{zh:entry.evidence.zh+' '+cloud.evidence.zh,en:entry.evidence.en+' '+cloud.evidence.en}:entry.evidence,
    ...(kind==='supernova'?{formula:'Iν ≈ ∫ jν ds (optically thin)',terms:words.ui.shellFormulaTerms}:{}),
    limits:nursery?{zh:entry.boundary.zh+' '+words.ui.referenceBoundary.zh,en:entry.boundary.en+' '+words.ui.referenceBoundary.en}:entry.boundary,
    sources:[...(nursery?[{title:cloud.sourceTitle,url:cloud.source}]:[]),{title:kind==='supernova'?'NASA Goddard · Supernova remnants':'NASA Hubble · Nebulae and their light',url:entry.source},...(kind==='supernova'?[{title:'NASA Hubble · Stellar explosions and Type Ia',url:'https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-stellar-explosions/'}]:[])],
  };
}
