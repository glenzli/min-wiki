import { oreBudget as mineralOreBudget } from '../earth-minerals/model.ts';
export const PROCESSES = ['vein','bauxite','placer'] as const;
export type Process = typeof PROCESSES[number];
export const EVIDENCE = ['texture','properties','analysis'] as const;
export type Evidence = typeof EVIDENCE[number];
export interface OreState {
  process:Process; view:'process'|'specimen'; veinProgress:number;bauxiteProgress:number;placerProgress:number;
  fluid:'rich'|'poor'; fracture:'open'|'sealed';weathering:'intense'|'weak';drainage:'flushed'|'closed';
  flow:'weak'|'sorting'|'strong';liberation:'free'|'locked';evidence:Evidence[];cut:number;
  grade:number;recovery:number;price:number;cost:number;camera:string;
}
export const DEFAULT:OreState={process:'vein',view:'specimen',veinProgress:100,bauxiteProgress:0,placerProgress:0,fluid:'rich',fracture:'open',weathering:'intense',drainage:'flushed',flow:'sorting',liberation:'free',evidence:[],cut:65,grade:1,recovery:80,price:8,cost:90,camera:''};
const choose=<T extends string>(value:unknown,options:readonly T[],fallback:T):T=>typeof value==='string'&&options.includes(value as T)?value as T:fallback;
const numeric=(value:unknown,min:number,max:number,fallback:number)=>typeof value==='string'&&/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)&&Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
export function parseCamera(raw:unknown):[number,number,number]|undefined{
  if(typeof raw!=='string'||raw.length>160)return;
  try{const p=JSON.parse(raw);if(Array.isArray(p)&&p.length===3&&p.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<18)&&Math.hypot(...p)>=3&&Math.hypot(...p)<=15)return p as [number,number,number];}catch{return;}
}
export function parseState(raw:Record<string,string>={}):OreState{
  const d=DEFAULT,camera=parseCamera(raw.camera);
  return {process:choose(raw.process,PROCESSES,d.process),view:choose(raw.view,['process','specimen'],d.view),
    veinProgress:numeric(raw.veinProgress,0,100,d.veinProgress),bauxiteProgress:numeric(raw.bauxiteProgress,0,100,d.bauxiteProgress),placerProgress:numeric(raw.placerProgress,0,100,d.placerProgress),
    fluid:choose(raw.fluid,['rich','poor'],d.fluid),fracture:choose(raw.fracture,['open','sealed'],d.fracture),weathering:choose(raw.weathering,['intense','weak'],d.weathering),drainage:choose(raw.drainage,['flushed','closed'],d.drainage),flow:choose(raw.flow,['weak','sorting','strong'],d.flow),liberation:choose(raw.liberation,['free','locked'],d.liberation),
    evidence:EVIDENCE.filter(key=>typeof raw.evidence==='string'&&raw.evidence.split(',').includes(key)),cut:numeric(raw.cut,0,100,d.cut),grade:numeric(raw.grade,.1,5,d.grade),recovery:numeric(raw.recovery,20,95,d.recovery),price:numeric(raw.price,2,20,d.price),cost:numeric(raw.cost,20,300,d.cost),camera:camera?JSON.stringify(camera):''};
}
export function serializeState(s:OreState):Record<string,string>{return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,Array.isArray(v)?v.join(','):String(v)]));}
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(x:number)=>{const a=clamp(x);return a*a*(3-2*a);};
export function progressFor(s:OreState){return s[s.process==='vein'?'veinProgress':s.process==='bauxite'?'bauxiteProgress':'placerProgress'];}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export interface VeinParcel{id:string;kind:'metal'|'silica';x:number;y:number;phase:'source'|'flow'|'deposit';depositedFraction:number;}
export function veinAt(s:Pick<OreState,'veinProgress'|'fluid'|'fracture'>){
  const t=clamp(s.veinProgress/100),open=s.fracture==='open';
  const parcels:VeinParcel[]=Array.from({length:36},(_,i)=>{
    const kind=i<8?'metal':'silica',start=(i%12)*.012,enabled=open&&(kind==='silica'||s.fluid==='rich');
    const travel=enabled?clamp((t-start-.05)/.72):0;
    const targetY=92+(i*31%145),targetX=320+Math.sin(targetY*.026)*32;
    let x=82+(i%6)*9,y=244+Math.floor(i/6)*7;
    if(travel>0){const a=smooth(Math.min(1,travel/.7)),b=smooth((travel-.7)/.3);x=lerp(x,242,a);y=lerp(y,126,a);x=lerp(x,targetX,b);y=lerp(y,targetY,b);}
    // A tag tracks a source batch, not an indivisible atom. Its final approach
    // represents gradual deposition; the completed-batch ledger stays discrete.
    return{id:`v${i}`,kind,x,y,phase:travel>=1?'deposit':travel>0?'flow':'source',depositedFraction:smooth((travel-.7)/.3)};
  });
  const quartz=parcels.filter(p=>p.kind==='silica').reduce((sum,p)=>sum+p.depositedFraction,0)/28;
  const sulfide=parcels.filter(p=>p.kind==='metal').reduce((sum,p)=>sum+p.depositedFraction,0)/8;
  const inTransit=parcels.filter(p=>p.phase==='flow').length/36;
  return{parcels,quartz,sulfide,inTransit,open,stage:!open?'blocked':t<.15?'supply':quartz>0?'precipitation':'transport'};
}
export interface WeatherTag{id:string;kind:'al-bearing'|'residual'|'mobile';x:number;y:number;exported:boolean;fraction:number;}
export function bauxiteAt(s:Pick<OreState,'bauxiteProgress'|'weathering'|'drainage'>){
  const t=clamp(s.bauxiteProgress/100),reaction=s.weathering==='intense'?1:.15,drain=s.drainage==='flushed'?1:.08;
  const leaching=smooth((t-.12)/.88)*reaction*drain;
  const tags:WeatherTag[]=Array.from({length:30},(_,i)=>{
    const kind=i<12?'al-bearing':i<18?'residual':'mobile',initialX=115+(i*43%270),initialY=137+(i*29%124);
    const amount=kind==='mobile'?smooth((leaching-(i-18)*.04)/.38):0;
    const x=lerp(initialX,535+(i%3)*10,amount),y=lerp(initialY,267-(i%6)*12,amount);
    return{id:`b${i}`,kind,x,y,exported:amount>.98,fraction:amount};
  });
  const remaining=tags.filter(p=>!p.exported),al=remaining.filter(p=>p.kind==='al-bearing').length;
  return{tags,leaching,weathered:smooth(t)*reaction,al,remaining:remaining.length,exported:tags.length-remaining.length,relativeShare:al/remaining.length};
}
export interface PlacerGrain{id:string;kind:'cassiterite'|'quartz';x:number;y:number;status:'source'|'released'|'moving'|'trap'|'exported';}
export function placerAt(s:Pick<OreState,'placerProgress'|'flow'|'liberation'>){
  const t=clamp(s.placerProgress/100),released=s.liberation==='free';
  const grains:PlacerGrain[]=Array.from({length:24},(_,i)=>{
    const kind=i<6?'cassiterite':'quartz',sx=57+(i*19%86),sy=65+(i*29%74);
    if(!released)return{id:`p${i}`,kind,x:sx,y:sy,status:'source'};
    const release=smooth(t/.38),transport=smooth((t-.38)/.62);
    let x=lerp(sx,194+(i%5)*7,release),y=lerp(sy,225+(i%4)*4,release);
    const moving=s.flow!=='weak'&&t>.38;
    let status:PlacerGrain['status']=t<.38?'released':'released';
    if(moving){const caught=s.flow==='sorting'&&kind==='cassiterite';const tx=caught?384+(i%3)*8:650+(i%4)*6,ty=caught?241+(i%2)*5:225+(i%4)*3;x=lerp(x,tx,transport);y=lerp(y,ty,transport)-Math.sin(transport*Math.PI)*16;status=transport>=.999?(caught?'trap':'exported'):'moving';}
    return{id:`p${i}`,kind,x,y,status:t===0?'source':status};
  });
  const trapped=grains.filter(g=>g.status==='trap');return{grains,trapped:trapped.length,heavyTrapped:trapped.filter(g=>g.kind==='cassiterite').length,exported:grains.filter(g=>g.status==='exported').length};
}
export const oreBudget=mineralOreBudget;
/** Stable fracture surface used by both the sample geometry and texture field. */
export function veinCenter(y:number,z:number){return .14*Math.sin(y*1.8)+.085*Math.sin(z*2.1+y*.8);}
export function veinHalfWidth(y:number,z:number){return .13+.035*Math.sin(y*2.7+z*3.1);}
