import type { World } from './model.ts';
import type { MechanismFrame } from './layerMechanism.ts';
import { expandedHeight, structureGround, structureNoise, structureProfiles } from './structureModel.ts';

export type WeatherCase = 'dry' | 'cloud' | 'rain';
export interface PhenomenonOptions {
  clues: boolean;
  weather: WeatherCase;
  aurora: boolean;
  meteorOutcome: 'fade' | 'fragment';
  detail?: boolean;
  composition?: boolean;
}
export const defaultPhenomena: PhenomenonOptions = { clues: true, weather: 'rain', aurora: true, meteorOutcome: 'fade' };
export function readPhenomenonQuery(search:string){
  const q=new URLSearchParams(search),weather=q.get('weatherCase');
  const earth:PhenomenonOptions={...defaultPhenomena,weather:weather==='dry'||weather==='cloud'?weather:'rain',aurora:q.get('auroraInput')!=='0',meteorOutcome:q.get('entryOutcome')==='fragment'?'fragment':'fade'};
  const titan:PhenomenonOptions={...defaultPhenomena,weather:q.get('methaneRain')==='1'?'rain':'cloud'};
  const detail:Array<{world:World;id:string}>=[];
  for(const value of (q.get('detail')??'').split(',').slice(0,2)){
    const [world,id]=value.split('.') as [World,string];
    if(Object.hasOwn(structureProfiles,world)&&structureProfiles[world].features.some(f=>f.id===id)&&!detail.some(f=>f.world===world))detail.push({world,id});
  }
  return {earth,titan,clues:q.get('processCues')!=='0',composition:q.get('composition')==='1',detail};
}
/** These view-owned conditions survive language/reader navigation without
 * replacing the journey model's independent route parameters. */
export function writePhenomenonQuery(search:string,earth:PhenomenonOptions,titan:PhenomenonOptions,clues:boolean,detail:Array<{world:World;id:string}>,composition=false){
  const q=new URLSearchParams(search);
  if(composition)q.set('composition','1');else q.delete('composition');
  for(const [key,value]of Object.entries({weatherCase:earth.weather==='rain'?'':earth.weather,auroraInput:earth.aurora?'':'0',entryOutcome:earth.meteorOutcome==='fade'?'':'fragment',methaneRain:titan.weather==='rain'?'1':'',processCues:clues?'':'0',detail:detail.slice(0,2).map(f=>`${f.world}.${f.id}`).join(',')})){if(value)q.set(key,value);else q.delete(key);}
  return q;
}
const unit = (x: number) => x - Math.floor(x);
const smooth = (a: number, b: number, x: number) => { const q = Math.max(0, Math.min(1, (x-a)/(b-a))); return q*q*(3-2*q); };

export interface CloudExample {
  readonly x:number; readonly km:number; readonly z:number;
  readonly scale:readonly [number,number,number];
  readonly seed:number; readonly opacity:number;
  readonly shape:'cumulus'|'layered'|'ice';
  readonly speed:number; readonly evolutionRate:number;
  readonly material:'water'|'sulfuric-acid'|'water-ice'|'carbon-dioxide-ice'|'methane';
}
/** Independently authored examples, not a shared planetary cloud taxonomy or
 * retrieved concentrations. White methane clouds and orange organic haze are
 * different objects; Venus' overlapping sheets are one extended cloud deck.
 * Sources: NASA Venus/Titan facts and Curiosity's 2025 twilight-cloud report. */
export const cloudExamples:Readonly<Record<World,readonly CloudExample[]>>={
  earth:[
    {x:-1.45,km:3,z:-.2,scale:[3.1,1.22,1.75],seed:41,opacity:.96,shape:'cumulus',speed:.11,evolutionRate:1,material:'water'},
    {x:1.25,km:5,z:-.9,scale:[2.25,.76,1.4],seed:63,opacity:.70,shape:'cumulus',speed:.085,evolutionRate:1.13,material:'water'},
    {x:.65,km:3,z:1,scale:[1.5,.42,1.1],seed:81,opacity:.55,shape:'cumulus',speed:.10,evolutionRate:.94,material:'water'},
  ],
  venus:[
    {x:-2.55,km:55,z:-.5,scale:[5.1,.30,3.3],seed:110,opacity:.93,shape:'layered',speed:.18,evolutionRate:.56,material:'sulfuric-acid'},
    {x:0,km:57,z:.35,scale:[5.2,.34,3.3],seed:111,opacity:.95,shape:'layered',speed:.16,evolutionRate:.63,material:'sulfuric-acid'},
    {x:2.55,km:59,z:-.4,scale:[4.9,.28,3.3],seed:112,opacity:.90,shape:'layered',speed:.195,evolutionRate:.51,material:'sulfuric-acid'},
  ],
  mars:[
    {x:-1.6,km:22,z:-.5,scale:[3.8,.22,1.6],seed:141,opacity:.62,shape:'ice',speed:.09,evolutionRate:.70,material:'water-ice'},
    {x:1.6,km:70,z:.1,scale:[3.4,.32,1.8],seed:153,opacity:.70,shape:'ice',speed:-.14,evolutionRate:1.12,material:'carbon-dioxide-ice'},
  ],
  titan:[
    {x:-1,km:18,z:.1,scale:[2.7,.80,1.7],seed:171,opacity:.88,shape:'cumulus',speed:.055,evolutionRate:.57,material:'methane'},
    {x:1.8,km:21,z:-.9,scale:[1.6,.55,1.3],seed:172,opacity:.62,shape:'cumulus',speed:.043,evolutionRate:.68,material:'methane'},
  ],
  moon:[],mercury:[],
};
/** A local wet/dry explanation, separate from the advecting weather examples.
 * The parcel and its eventual cloud share one retained anchor at every scene
 * time. The supplied mechanism progress owns ascent and condensation only. */
export function weatherMechanismSample(frame:MechanismFrame|null){
  const active=frame?.layer===0,progress=active?Math.max(0,Math.min(1,frame.progress)):0;
  const rise=!active||frame.step===0?0:frame.step===1?progress:1;
  const cloud=cloudExamples.earth[2];
  return {active,x:cloud.x,z:cloud.z,km:.15+rise*(cloud.km-.15),rise,
    cloudOpacity:active&&frame.step===2?progress:0};
}
/** Step-sampled energy guides. They do not compute heating, temperature,
 * chemistry or auroral power. Scene activity keeps its independent time. */
export function energyMechanismSample(frame:MechanismFrame|null,layer:1|3){
  const active=frame?.layer===layer,step=active?frame.step:0,p=active?Math.max(0,Math.min(1,frame.progress)):0;
  return {active,
    uvFront:active&&step===0?p:1,
    uvAbsorption:!active?1:step===0?0:step===1?smooth(0,.65,p):1,
    ozoneHeat:active?(step===1?smooth(0,.7,p):step===2?1:0):0,
    transport:!active?1:step===2?smooth(0,.6,p):0,
    solarFront:active&&step===0?p:0,
    thermalMotion:active?(step===1?p:step===2?1:0):0,
    particleArrival:active&&step===2?Math.min(1,p/.48):0,
    aurora:!active?1:step===2?smooth(.48,.9,p):0};
}
const cloudHeights=Object.fromEntries(Object.entries(cloudExamples).map(([world,examples])=>[world,new Float64Array(examples.map(example=>expandedHeight(world as World,example.km)))])) as Record<World,Float64Array>;
const cloudMin=(world:World)=>world==='venus'?-4.8:-3.3;
const cloudMax=(world:World)=>world==='venus'?4.8:3.0;
function cloudX(world:World,index:number,seconds:number){
  const cloud=cloudExamples[world][index],low=cloudMin(world),width=cloudMax(world)-low;
  return low+unit((cloud.x-low+seconds*cloud.speed)/width)*width;
}
function cloudPresence(world:World,x:number){
  const low=cloudMin(world),high=cloudMax(world);
  return smooth(low,low+.58,x)*(1-smooth(high-.58,high,x));
}
/** Main wind transports the cloud in one direction; its retained density field
 * deforms locally. A finite crossing fades before recycling at the window's
 * edge, so no visible cloud reverses like a pendulum or jumps across the site.
 * Speeds and the recurring observation are teaching choices, not weather data. */
export function cloudDrift(seconds:number,index=0,world:World='earth'){
  return cloudX(world,index,seconds)-cloudExamples[world][index].x;
}
export interface CloudSample {x:number;y:number;z:number;opacity:number;}
export function cloudSample(world:World,index:number,seconds:number,out:CloudSample={x:0,y:0,z:0,opacity:0}){
  const cloud=cloudExamples[world][index];
  out.x=cloudX(world,index,seconds);out.y=cloudHeights[world][index];out.z=cloud.z;out.opacity=cloudPresence(world,out.x);
  return out;
}
export interface PrecipitationSource {x:number;y:number;z:number;opacity:number;}
export function precipitationSource(world:World,seconds:number,out:PrecipitationSource={x:0,y:0,z:0,opacity:0}){
  const w=world==='titan'?'titan':'earth',cloud=cloudExamples[w][0];
  cloudSample(w,0,seconds,out);out.y+=cloud.scale[1]*-.279;
  return out;
}
export interface RainSample {
  x:number;y:number;z:number;ground:number;top:number;tail:number;tailX:number;
  fall:number;born:number;sourceX:number;sourceZ:number;opacity:number;tailOpacity:number;splash:number;
}
export function makeRainSample():RainSample{return {x:0,y:0,z:0,ground:0,top:0,tail:0,tailX:0,fall:0,born:0,sourceX:0,sourceZ:0,opacity:0,tailOpacity:0,splash:0};}
// Fixed identities/footprints are prepared once; frame sampling reuses them.
// Seven double values per one of 216 retained drops: 12,096 shared CPU bytes.
const rainIdentities=new Float64Array(216*7);
for(let i=0;i<216;i++)rainIdentities.set([
  structureNoise(i+19),structureNoise(i+2),
  (structureNoise(i+43)-.5)*1.12,(structureNoise(i+61)-.5)*.57,
  .075+structureNoise(i+15)*.045,.27+structureNoise(i+215)*.29,
  .7+structureNoise(i+81)*.6,
],i*7);
/** A drop belongs to the cloud at its birth time. Afterwards it falls and is
 * carried by the same prevailing wind with a small additional drift, rather
 * than translating the whole rain column with the cloud's current position.
 * Cloud growth/drag, time and lengths are illustrative, not microphysics.
 * Passing retained output storage makes production sampling allocation-free. */
export function rainSample(world:World,index:number,seconds:number,out:RainSample=makeRainSample()){
  const w=world==='titan'?'titan':'earth',cloud=cloudExamples[w][0];
  const n=((Math.floor(index)%216)+216)%216*7;
  const duration=(w==='titan'?3.5:2.25)+rainIdentities[n]*.85,contact=.22,period=duration+contact;
  const cycle=Math.floor(seconds/period+rainIdentities[n+1]),born=(cycle-rainIdentities[n+1])*period;
  const age=Math.max(0,seconds-born),travel=Math.min(age,duration),fall=travel/duration;
  const sourceX=cloudX(w,0,born),sourceZ=cloud.z,top=cloudHeights[w][0]+cloud.scale[1]*-.279;
  const drift=cloud.speed*travel*(1+fall*.65*rainIdentities[n+6]);
  const x=sourceX+rainIdentities[n+2]+drift,z=sourceZ+rainIdentities[n+3];
  const ground=structureGround(w,x,z)+.012,y=ground+(top-ground)*(1-fall);
  const currentX=cloudX(w,0,seconds),sameCrossing=Math.abs(currentX-sourceX)<(cloudMax(w)-cloudMin(w))/2;
  // The finite observation fades as the parent cloud leaves, before its next
  // crossing. Old drops never reappear beneath the cloud's recycled position.
  const observation=cloudPresence(w,sourceX)*smooth(.30,.60,cloudPresence(w,currentX))*(sameCrossing?1:0);
  const visible=observation*smooth(0,.085,fall)*(1-smooth(.985,1,fall));
  out.x=x;out.y=Math.max(ground,y);out.z=z;out.ground=ground;out.top=top;
  out.tail=Math.min(top,y+rainIdentities[n+4]);
  out.tailX=x-(out.tail-y)*cloud.speed*duration/Math.max(.1,top-ground);
  out.fall=fall;out.born=born;out.sourceX=sourceX;out.sourceZ=sourceZ;
  out.opacity=visible*rainIdentities[n+5];out.tailOpacity=out.opacity*.13*smooth(.025,.12,fall);
  out.splash=age>duration?Math.sin((age-duration)/contact*Math.PI)*observation:0;
  return out;
}
export interface WindSample {x:number;y:number;z:number;alpha:number;}
const windIdentities=new Float64Array(28*4);
for(let i=0;i<28;i++)windIdentities.set([structureNoise(i+110),structureNoise(i+130),structureNoise(i+150),structureNoise(i+170)],i*4);
const upperWindHeight=expandedHeight('earth',25);
export function windSample(index:number,seconds:number,upper=false,out:WindSample={x:0,y:0,z:0,alpha:0}){
  const n=((index%28)+28)%28*4;
  const f=unit(seconds*(.023+windIdentities[n]*.008)+windIdentities[n+1]);
  out.x=-3.3+f*6.4;
  const base=upper?upperWindHeight:.27+windIdentities[n+2]*.8;
  out.y=base+Math.sin(out.x*.9+index)*(upper?.024:.10);
  out.z=(windIdentities[n+3]-.5)*1.8;out.alpha=Math.sin(f*Math.PI)**2;
  return out;
}

/** A repeated observation of one representative event. No ablation, entry
 * speed or survivability is inferred from the illustrative time/path. */
export function meteorSample(seconds: number) {
  const cycle = unit(seconds/6.8);
  const progress = Math.min(1,cycle/.67);
  return {progress, light:smooth(.035,.18,progress)*(1-smooth(.75,1,progress)), fade:1-smooth(.69,.94,cycle)};
}
export function meteorPoint(progress: number) {
  const p = Math.max(0,Math.min(1,progress));
  return {x:1.65-p*3.1,y:expandedHeight('earth',98-p*34),z:-.05+p*.36};
}

/** Folded curtains are optical teaching geometry at polar representative
 * heights, not wind-blown fabric or a simulated magnetosphere. */
export function auroraPoint(u:number,v:number,seconds:number,curtain=0,out={x:0,y:0,z:0}) {
  const t=seconds,phase=curtain*1.83;
  // Broad travelling folds overlap finer curls. The upper rays follow the
  // same arc instead of translating a rigid or evenly corrugated fence.
  const arc=u*7.6+Math.sin(u*3.7-t*.075+phase)*.8+t*.095+phase;
  const fold=Math.sin(arc)*.36+Math.sin(arc*2.71-t*.13)*.10;
  const x=-3.35+u*6.7+v*.10*Math.sin(arc*.7);
  const z=-.78-curtain*.35+fold+Math.sin(u*28.3-t*.17+phase)*.035;
  const foot=114+Math.sin(u*9.7+t*.15+phase)*8+curtain*9;
  const reach=230+Math.sin(u*6.3-t*.09+phase)*52+Math.sin(u*18.7+t*.11)*18;
  const km=foot+v*reach;
  out.x=x;out.y=expandedHeight('earth',km);out.z=z;return out;
}

/** Framing selects the same retained objects, not a replacement diagram. */
export function phenomenonFocus(world: World, id: string, seconds?:number) {
  const at=(km:number,x=0,z=0,span=.72,width=2.1)=>({x,y:expandedHeight(world,km),z,span,width});
  if(world==='earth'){
    if(id==='weather'){
      if(seconds===undefined)return {x:-.55,y:.66,z:.25,span:1.08,width:2.85};
      const x=cloudX(world,0,seconds),follow=Math.max(-1.3,Math.min(1.3,x+.9))*smooth(0,.30,cloudPresence(world,x));
      return {x:follow,y:.66,z:.25,span:1.08,width:2.85};
    }
    if(id==='ozone')return at(23,0,.65,1.38,2.1);
    if(id==='meteor')return at(74,0,.25,.92,2.05);
    if(id==='aurora')return at(180,-.05,-.55,1.05,3.3);
    return at(800,0,.35,.95,3.25);
  }
  if(world==='venus')return id==='acid-cloud'?at(57,0,0,.65,3.2):id==='venus-upper'?at(170,0,0,.65,2.6):at(id==='dense-air'?8:0,0,.3,1.05,3.0);
  if(world==='mars')return at(id==='water-ice'?22:id==='co2-ice'?70:id==='mars-upper'?150:1,0,.2,id==='dust'?1.05:.65,2.8);
  if(world==='titan'){
    if(id==='methane-cloud'&&seconds!==undefined){
      const x=cloudX(world,0,seconds),follow=Math.max(-1.2,Math.min(1.2,x+.4))*smooth(0,.30,cloudPresence(world,x));
      return {x:follow,y:1.12,z:.2,span:1.50,width:3.0};
    }
    return at(id==='methane-cloud'?10:id==='organic-haze'?200:id==='titan-upper'?700:0,-.6,.2,id==='methane-cloud'?1.25:1.0,3.0);
  }
  return at(id.endsWith('ground')?0:60,0,.3,id.endsWith('ground')?1.0:1.65,3.1);
}
