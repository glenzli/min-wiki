export const CHAPTERS=['frog','butterfly','compare'] as const;
export type Chapter=typeof CHAPTERS[number];
export const ASPECTS=['structure','food','breathing','movement'] as const;
export type Aspect=typeof ASPECTS[number];
export type View='whole'|'detail';
export const bounded=(value:number,min:number,max:number,fallback=0)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
export function readMetamorphosisRoute(search:string){const p=new URLSearchParams(search);return {
  chapter:CHAPTERS.includes(p.get('chapter') as Chapter)?p.get('chapter') as Chapter:'frog' as Chapter,
  aspect:ASPECTS.includes(p.get('aspect') as Aspect)?p.get('aspect') as Aspect:'structure' as Aspect,
  growth:bounded(Number(p.get('growth')??0),0,4),stage:Math.round(bounded(Number(p.get('stage')??0),0,3)),
  wing:bounded(Number(p.get('wing')??0),0,1),peek:p.get('peek')==='1',view:p.get('view')==='detail'?'detail' as View:'whole' as View,
};}
export function metamorphosisDestination(chapter:Chapter,search='',hash='',base='/'){
  const input=new URLSearchParams(search),r=readMetamorphosisRoute(search),p=new URLSearchParams(search);
  p.set('chapter',chapter);
  // Normalize only fields this topic owns; keep unrelated valid URL context intact.
  const keys=['growth','stage','wing','peek','view','aspect'];
  const values:Record<string,string|number>={growth:r.growth,stage:r.stage,wing:r.wing,peek:r.peek?'1':'0',view:r.view,aspect:r.aspect};
  for(const key of keys)if(input.has(key))p.set(key,String(values[key]));
  return `${base.replace(/\/$/,'')}/topics/frog-life/?${p}${hash.startsWith('#')||!hash?hash:'#'+hash}`;
}
export const frogObservation=(growth:number)=>Math.min(4,Math.floor(bounded(growth,0,4)));
/** Cross-case presets align questions, never ages or elapsed development time. */
export const COMPARISON_PAIRS={larvae:{growth:1,stage:1},remodeling:{growth:2.8,stage:2},after:{growth:4,stage:3}} as const;
