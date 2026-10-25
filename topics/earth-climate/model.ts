export const CLIMATE_VIEWS = ['journey', 'history', 'reflection', 'glacier'] as const;
export const CLIMATE_RANGES = ['deep', 'recent', 'last'] as const;
export const ICE_EVENTS = [
  {id:'huronian', startMa:2450, endMa:2220},
  {id:'sturtian', startMa:717, endMa:659},
  {id:'marinoan', startMa:645, endMa:635},
  {id:'ordovician', startMa:445, endMa:444},
  {id:'paleozoic', startMa:360, endMa:260},
  {id:'antarctic', startMa:34, endMa:0},
  {id:'quaternary', startMa:2.58, endMa:0},
  {id:'maximum', startMa:.026, endMa:.019},
  {id:'holocene', startMa:.0117, endMa:0},
] as const;
export type IceEvent = typeof ICE_EVENTS[number]['id'];
export type ClimateState = {
  view: typeof CLIMATE_VIEWS[number]; range: typeof CLIMATE_RANGES[number]; event: IceEvent;
  iceCover: number; snowReflect: number; accumulation: number; ablation: number; steps: number; glacierPhase: number;
  melt: number; iceLocation:'land'|'floating';
  scope:'global'|'region'|'evidence';edgeDirection:'advance'|'retreat';evidenceMode:'seaice'|'snow'|'sediment'|'scratches'|'core';samplePhase:number;
};
const value = (raw:string|undefined, fallback:number, min:number, max:number) => {
  if (!raw || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(raw)) return fallback;
  const n = Number(raw); return Number.isFinite(n) ? Math.min(max,Math.max(min,n)) : fallback;
};
export function parseClimateState(raw:Record<string,string>):ClimateState {
  const steps=Math.round(value(raw.steps,0,0,12));
  const glacierPhase=steps<12?Math.round(value(raw.glacierPhase,0,0,999)):0;
  return {
    view:CLIMATE_VIEWS.includes(raw.view as ClimateState['view'])?raw.view as ClimateState['view']:'journey',
    scope:raw.scope==='region'||raw.scope==='evidence'?raw.scope:'global',
    edgeDirection:raw.edgeDirection==='retreat'?'retreat':'advance',
    evidenceMode:['seaice','snow','sediment','scratches','core'].includes(raw.evidenceMode)?raw.evidenceMode as ClimateState['evidenceMode']:'seaice',
    samplePhase:value(raw.samplePhase,0,0,100),
    range:CLIMATE_RANGES.includes(raw.range as ClimateState['range'])?raw.range as ClimateState['range']:'deep',
    event:ICE_EVENTS.some(e=>e.id===raw.event)?raw.event as IceEvent:'sturtian',
    iceCover:value(raw.iceCover,60,0,100), snowReflect:value(raw.snowReflect,80,50,90),
    accumulation:value(raw.accumulation,4,0,10), ablation:value(raw.ablation,7,0,10),
    steps, glacierPhase, melt:value(raw.melt,50,0,100),
    iceLocation:raw.iceLocation==='floating'?'floating':'land',
  };
}
export function serializeClimateState(state:ClimateState):Record<string,string> {
  return Object.fromEntries(Object.entries(state).map(([k,v])=>[k,String(v)]));
}
export const rangeMaximum = (range:ClimateState['range']) => range==='deep'?2500:range==='recent'?3:.15;
/** One linear mapping per explicitly selected time window; not a logarithmic axis. */
export const agePosition = (ageMa:number, range:ClimateState['range']) => 1-Math.min(rangeMaximum(range),Math.max(0,ageMa))/rangeMaximum(range);
export function timeTicks(range:ClimateState['range']) {
  const scale=range==='last'?1000:1;
  return {unit:range==='last'?'ka':'Ma',values:Array.from({length:6},(_,i)=>Number((rangeMaximum(range)*(1-i/5)*scale).toFixed(3)))};
}
/** Chosen surface reflectivities, not a climate reconstruction or cloud-inclusive planetary albedo. */
export function reflectionBudget(icePercent:number, snowPercent:number) {
  const ice=Math.min(1,Math.max(0,icePercent/100)), snow=Math.min(.9,Math.max(.5,snowPercent/100));
  const incoming=100, water=.1, albedo=ice*snow+(1-ice)*water;
  return {incoming,reflected:incoming*albedo,absorbed:incoming*(1-albedo),albedo};
}
export function glacierBudget(accumulation:number, ablation:number, steps:number) {
  const a=Math.min(10,Math.max(0,Number.isFinite(accumulation)?accumulation:4));
  const b=Math.min(10,Math.max(0,Number.isFinite(ablation)?ablation:7));
  const n=Math.min(12,Math.max(0,Math.round(Number.isFinite(steps)?steps:0)));
  const initial=60;
  let mass=initial,totalAdded=0,totalLost=0;
  const history=[mass];
  for(let i=0;i<n;i++) {
    totalAdded+=a;
    const lost=Math.min(b,mass+a);totalLost+=lost;mass+=a-lost;history.push(mass);
  }
  return {initial,mass,totalAdded,totalLost,history,netPerStep:a-b,steps:n};
}
/** Equal water-equivalent masses, with no thermal expansion, salt or density correction. */
export function meltComparison(percent:number, location:'land'|'floating') {
  const melted=Math.min(100,Math.max(0,Number.isFinite(percent)?percent:0));
  return {remaining:100-melted,melted,directSeaLevelEquivalent:location==='land'?melted:0,
    alreadyDisplaced:location==='floating'?100:0};
}
