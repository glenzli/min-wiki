import { partition, poreOffset } from '../ground-water/model.ts';
import { riverPoint, riverGrain } from '../river-paths/model.ts';
import { evaporatedRadius, MIN_DROP_RADIUS } from '../rain-formation/model.ts';
export type View = 'basin' | 'cloud' | 'ground' | 'river' | 'ice';
export type Surface = 'soil' | 'clay' | 'paved';
export type Pool = 'ocean' | 'vapor' | 'cloud' | 'falling' | 'soil' | 'lake' | 'river' | 'ice' | 'surface';
export type Point = readonly [number, number];
export interface Settings { humidity:number; surface:Surface; route:'warm'|'ice'; }
export const views:View[]=['basin','cloud','ground','river','ice'];
export const clamp=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const smooth=(n:number)=>{const q=clamp(n);return q*q*(3-2*q);};
const lerp=(a:Point,b:Point,p:number):Point=>[a[0]+(b[0]-a[0])*p,a[1]+(b[1]-a[1])*p];
const cubic=(a:Point,b:Point,c:Point,d:Point,p:number):Point=>{const q=clamp(p),v=1-q;return [v**3*a[0]+3*v*v*q*b[0]+3*v*q*q*c[0]+q**3*d[0],v**3*a[1]+3*v*v*q*b[1]+3*v*q*q*c[1]+q**3*d[1]];};
export const surfaceIndex=(surface:Surface)=>({soil:0,clay:1,paved:2}[surface]);
/** The river is the old bend's complete geometry, projected into this watershed. */
export function basinRiver(q:number):Point {const [x,y]=riverPoint(q,0);return [240+(y-88)*1.02,324+(x-400)*.36];}
export function basinGrain(p:number,id:number){const g=riverGrain(p,id,0);return {...g,x:240+(g.y-88)*1.02,y:324+(g.x-400)*.36};}
export const groundContact:Point=[365,357];
export const glacierHead:Point=[186,213];
export const glacierFoot:Point=[274,291];
export const lakeCenter:Point=[676,365];
export const seaCenter:Point=[860,415];
export const focuses:Record<View,readonly number[]>={basin:[0,0,1000,620],cloud:[210,32,500,310],ground:[235,285,490,304],river:[185,244,565,350],ice:[90,140,420,260]};
export function readRoute(search:string){const q=new URLSearchParams(search),view=q.get('view'),surface=q.get('surface');const value=(key:string,fallback:number)=>{const raw=q.get(key);if(raw===null||raw.trim()==='')return fallback;const n=Number(raw);return Number.isFinite(n)?n:fallback;};return {view:views.includes(view as View)?view as View:'basin' as View,progress:clamp(value('p',0)),settings:{humidity:Math.max(0,Math.min(100,value('humidity',75))),surface:surface==='clay'||surface==='paved'?surface:'soil',route:q.get('route')==='ice'?'ice':'warm'} as Settings};}
export function waterHref(view:View,search='',base='/'){const q=new URLSearchParams(search);q.set('view',view);return `${base.replace(/\/?$/,'/')}topics/rain-cycle/?${q}`;}
/** Closed teaching cohort, not a catchment water balance or a rainfall forecast. */
export function destination(id:number,settings:Settings):Pool {
 const rank=id*37%100;
 if(rank<8)return 'ice'; // A separate high-elevation snowfall branch, not the warm-layer rain route.
 if(evaporatedRadius(.7,settings.humidity,30)<=MIN_DROP_RADIUS)return 'vapor';
 const a=partition(100,surfaceIndex(settings.surface)),r=(rank-8)*100/92;
 if(r<a.soaked)return 'soil';if(r<a.soaked+a.flowed)return rank%3===0?'ocean':rank%3===1?'lake':'river';return 'surface';
}
export function waterParcel(progress:number,id:number,settings:Settings,iceProgress=0){
 const p=clamp(progress),rank=id*37%100,dest=destination(id,settings),offset:Point=[(id%10-4.5)*2.6,(Math.floor(id/10)-4.5)*1.35];
 const apply=(point:Point,pool:Pool)=>({id,destination:dest,pool,x:point[0]+offset[0],y:point[1]+offset[1]});
 if(p<.22)return apply(cubic(seaCenter,[883,297],[742,153],[554,123],smooth(p/.22)),p<.035?'ocean':'vapor');
 if(p<.44)return apply(lerp([554,123],[375,127],smooth((p-.22)/.22)),'cloud');
 if(dest==='vapor'){
  const seconds=.7**2/(.028*(1-settings.humidity/100));
  return apply(cubic([375,127],[338,179],[470,225],[603,170],smooth((p-.44)/.4)),p<.44+.2*seconds/30?'falling':'vapor');
 }
 const contact=dest==='ice'?glacierHead:groundContact;
 if(p<.64)return apply(lerp([375,127],contact,smooth((p-.44)/.2)),'falling');
 const travel=smooth((p-.64)/.36);
 if(dest==='ice'){
  const slow=clamp(iceProgress)*travel,release=.5+(rank%8)*.04;
  if(slow<release)return apply(lerp(glacierHead,glacierFoot,smooth(slow/release)),'ice');
  return apply(cubic(glacierFoot,[302,308],[260,315],basinRiver(.32),smooth((slow-release)/(1-release))),'river');
 }
 if(dest==='soil')return apply([contact[0]+poreOffset(travel*(84+rank%5*13),id%9)+travel*17,contact[1]+travel*(84+rank%5*13)],'soil');
 if(dest==='surface')return apply(lerp(contact,[409+rank%6*3,369],travel),'surface');
 if(travel<.3)return apply(lerp(contact,basinRiver(.32),smooth(travel/.3)),'river');
 if(travel<.68)return apply(basinRiver(.32+.68*smooth((travel-.3)/.38)),'river');
 if(dest==='river')return apply(basinRiver(1),'river');
 if(travel<.84)return apply(lerp(basinRiver(1),lakeCenter,smooth((travel-.68)/.16)),'lake');
 if(dest==='lake')return apply(lakeCenter,'lake');
 return apply(cubic(lakeCenter,[733,355],[761,424],seaCenter,smooth((travel-.84)/.16)),'ocean');
}
export function watershedState(p:number,settings:Settings,iceProgress=0){const parcels=Array.from({length:100},(_,id)=>waterParcel(p,id,settings,iceProgress));const pools:Record<Pool,number>={ocean:0,vapor:0,cloud:0,falling:0,soil:0,lake:0,river:0,ice:0,surface:0};for(const parcel of parcels)pools[parcel.pool]++;return {parcels,pools,total:parcels.length};}
export function tracerFor(pool:Pool,settings:Settings){return Array.from({length:100},(_,id)=>id).find(id=>destination(id,settings)===pool)??22;}
