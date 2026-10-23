import type {SceneStudy} from '../../src/platform/sceneReading.ts';
import type {Illumination,NebulaKind} from './nebulaModel.ts';
import words from './nebulaContent.json';
export function nebulaStudy(kind:NebulaKind,illumination:Illumination):SceneStudy{
  const entry=words.cases[kind],light=words.illumination[illumination];
  return {
    child:kind==='nursery'?light.body:entry.body,
    title:entry.name,
    theory:kind==='nursery'?{zh:entry.body.zh+' '+light.body.zh,en:entry.body.en+' '+light.body.en}:entry.body,
    evidence:entry.evidence,
    ...(kind==='supernova'?{formula:'Iν ≈ ∫ jν ds (optically thin)',terms:words.ui.shellFormulaTerms}:{}),
    limits:entry.boundary,
    sources:[{title:kind==='supernova'?'NASA Goddard · Supernova remnants':'NASA Hubble · Nebulae and their light',url:entry.source},...(kind==='supernova'?[{title:'NASA Hubble · Stellar explosions and Type Ia',url:'https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-stellar-explosions/'}]:[])],
  };
}
