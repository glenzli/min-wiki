export const CHAPTERS=['germination','reproduction','dispersal'] as const;
export type Chapter=typeof CHAPTERS[number];
export interface StudyState { progress:number; water?:string; air?:string; temp?:string; compatible?:boolean; kind?:string; wind?:number }
export interface PlantStudy { pause():void; dispose():void; read():StudyState }
export type Water='damp'|'dry'|'flood';
export const canGerminate=(water:string,air:string,temp:string)=>water==='damp'&&air==='yes'&&temp==='warm';
export function allowedGrowth(requested:number,reached:number,okay:boolean){const value=Number.isFinite(requested)?Math.max(0,Math.min(3,requested)):0,history=Number.isFinite(reached)?Math.max(0,Math.min(3,reached)):0;return okay?value:Math.min(value,history);}
export function chapterFrom(value:string|null):Chapter{return CHAPTERS.includes(value as Chapter)?value as Chapter:'germination';}
const bounded=(value:string|null,min:number,max:number,fallback:number)=>{if(value===null)return fallback;const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
export function readPlantRoute(search:string){const p=new URLSearchParams(search);return {chapter:chapterFrom(p.get('chapter')),bean:{progress:bounded(p.get('stage'),0,3,0),water:['dry','flood'].includes(p.get('water')??'')?p.get('water')!:'damp',air:p.get('air')==='no'?'no':'yes',temp:p.get('temp')==='cold'?'cold':'warm'},flower:{progress:bounded(p.get('journey'),0,3,0),compatible:p.get('pollen')!=='incompatible'},travel:{progress:bounded(p.get('progress'),0,1,0),kind:p.get('kind')==='fur'?'fur':'wind',wind:Math.round(bounded(p.get('wind'),0,2,1))}};}
/** Only applicable, validated parameters survive a legacy entry; unknown chapter cannot hijack it. */
export function plantDestination(chapter:Chapter,search='',hash='',base='/'){
  const source=new URLSearchParams(search);source.set('chapter',chapter);const r=readPlantRoute(source.toString()),p=new URLSearchParams();
  if(source.get('lang'))p.set('lang',source.get('lang')!);p.set('chapter',chapter);
  const keys=chapter==='germination'?['stage','water','air','temp']:chapter==='reproduction'?['journey','pollen']:['progress','kind','wind'];
  const values:Record<string,string|number>={stage:r.bean.progress,...r.bean,journey:r.flower.progress,pollen:r.flower.compatible?'compatible':'incompatible',...r.travel};
  // Progress belongs to its chapter; avoid the travel progress overwriting a bean album value.
  values.stage=r.bean.progress;values.journey=r.flower.progress;
  for(const key of keys)if(source.has(key))p.set(key,String(values[key]));
  return `${base.replace(/\/$/,'')}/topics/seed-sprouting/?${p}${hash.startsWith('#')||!hash?hash:'#'+hash}`;
}
export function cycleEvidence(bean:StudyState,flower:StudyState,travel:StudyState){return {
  germination:!canGerminate(bean.water??'damp',bean.air??'yes',bean.temp??'warm')?'blocked':bean.progress>=3?'seedling':bean.progress>0?'growing':'ready',
  reproduction:flower.progress<.42?'waiting':flower.compatible===false?'incompatible':flower.progress<1?'tube':flower.progress<3?'developing':'fruit',
  dispersal:travel.progress>=1?'landed':travel.progress===0?'waiting':travel.kind==='fur'?(travel.progress<.22?'approaching':travel.progress<=.75?'attached':'falling'):'airborne',
} as const;}
