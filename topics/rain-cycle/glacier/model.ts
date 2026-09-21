/** Fixed-valley teaching budget. Water-equivalent units and model years are not calibrated. */
export const MAX_YEARS=40;
export type Scenario='growth'|'no-ice'|'retreat';
export interface Climate { snowfall:number; warmth:number; warmAfterTwenty:boolean; }
export interface Stores { snow:number; firn:number; ice:number; }
export interface Cohort { id:number; mass:number; }
export interface AnnualBudget { year:number; input:number; loss:number; net:number; retained:number; }
export interface GlacierState {
 year:number; season:'snow'|'melt'|'compact'; stores:Stores; total:number; input:number; loss:number;
 current:AnnualBudget; history:AnnualBudget[]; cohorts:Cohort[]; iceTravel:number; extent:number;
 previousExtent:number; retreating:boolean; warmth:number; activeIce:boolean;
}
export const presets:Record<Scenario,Climate>={growth:{snowfall:1.6,warmth:.45,warmAfterTwenty:false},'no-ice':{snowfall:.8,warmth:1.9,warmAfterTwenty:false},retreat:{snowfall:1.6,warmth:.45,warmAfterTwenty:true}};
const bound=(n:number,min:number,max:number,fallback=min)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
const smooth=(n:number)=>{const p=bound(n,0,1);return p*p*(3-2*p);};
export function normalizeClimate(c:Climate):Climate {return {snowfall:bound(c.snowfall,0,3,1.6),warmth:bound(c.warmth,0,3,.45),warmAfterTwenty:Boolean(c.warmAfterTwenty)};}
/** Snow/firn/ice are material classes within a surviving cohort, not three separate inputs. */
export function materialFractions(age:number):Stores {
 const firn=smooth((age-.85)/.15),ice=smooth((age-4.85)/.15);
 return {snow:1-firn,firn:firn-ice,ice};
}
function storesAt(cohorts:Cohort[],time:number):Stores {const s={snow:0,firn:0,ice:0};for(const c of cohorts){const f=materialFractions(time-c.id);s.snow+=c.mass*f.snow;s.firn+=c.mass*f.firn;s.ice+=c.mass*f.ice;}return s;}
const total=(cohorts:Cohort[])=>cohorts.reduce((sum,c)=>sum+c.mass,0);
/** An explicitly illustrative geometric response, not a glacier dynamics solver. */
export const extentFromIce=(ice:number)=>ice<=0?0:Math.min(1,.12+.16*Math.sqrt(ice));
export function climateForYear(settings:Climate,year:number){return {snowfall:settings.snowfall,warmth:settings.warmth+(settings.warmAfterTwenty&&year>=20?1.9:0)};}
function seasonStep(cohorts:Cohort[],settings:Climate,year:number,fraction:number){
 const c=climateForYear(settings,year),input=c.snowfall*smooth(fraction/.4);
 const next=cohorts.map(item=>({...item}));next.push({id:year,mass:input});
 // One exposed-column approximation: remove recent surface material first.
 let energy=(.12+c.warmth*1.15)*smooth((fraction-.4)/.45),loss=0;
 for(let i=next.length-1;i>=0&&energy>0;i--){const removed=Math.min(next[i]!.mass,energy);next[i]!.mass-=removed;energy-=removed;loss+=removed;}
 return {cohorts:next,input,loss};
}
export function glacierState(requestedTime:number,climate:Climate):GlacierState {
 const time=bound(requestedTime,0,MAX_YEARS),settings=normalizeClimate(climate),whole=Math.floor(time),fraction=time-whole;
 let cohorts:Cohort[]=[],input=0,loss=0,iceTravel=0,previousExtent=0;
 const history:AnnualBudget[]=[];
 for(let y=0;y<whole;y++){
  const beforeIce=storesAt(cohorts,y).ice,result=seasonStep(cohorts,settings,y,1);
  previousExtent=extentFromIce(beforeIce);cohorts=result.cohorts;input+=result.input;loss+=result.loss;
  const retained=total(cohorts);history.push({year:y+1,input:result.input,loss:result.loss,net:result.input-result.loss,retained});
  iceTravel+=(beforeIce+storesAt(cohorts,y+1).ice)*.0009;
 }
 let current:AnnualBudget;
 if(fraction>0||time===0){
  const before=cohorts,beforeIce=storesAt(cohorts,whole).ice,result=seasonStep(cohorts,settings,whole,fraction);
  cohorts=result.cohorts;input+=result.input;loss+=result.loss;
  const full=seasonStep(before,settings,whole,1);
  iceTravel+=(beforeIce+storesAt(full.cohorts,whole+1).ice)*.0009*fraction;
  current={year:whole+1,input:result.input,loss:result.loss,net:result.input-result.loss,retained:total(cohorts)};
 }else current=history.at(-1)!;
 const stores=storesAt(cohorts,time),extent=extentFromIce(stores.ice);
 const yearWarmth=climateForYear(settings,Math.min(39,whole)).warmth;
 return {year:time,season:fraction<.4?'snow':fraction<.85?'melt':'compact',stores,total:total(cohorts),input,loss,current,history,cohorts,iceTravel,extent,previousExtent,retreating:extent>0&&extent<previousExtent-1e-7,warmth:yearWarmth,activeIce:stores.ice>.001};
}
/** Fixed-position downhill tracers; no modulo recycling or upstream movement on retreat. */
export function iceTracers(time:number,climate:Climate){const state=glacierState(time,climate);return Array.from({length:18},(_,id)=>{
 const born=5+id*1.6,birth=glacierState(born,climate),distance=.025+(state.iceTravel-birth.iceTravel);
 return {id,born,distance,visible:time>=born&&birth.activeIce&&distance>=0&&distance<state.extent-.025};
});}
/** Illustrative column volumes: lower volume after compaction does not lower water mass. */
export function columnVolumes(stores:Stores){return {snow:stores.snow/.3,firn:stores.firn/.6,ice:stores.ice/.9};}
