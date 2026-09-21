import { clamp } from './model.ts';
import type { Settings as TyphoonSettings } from '../typhoon/model.ts';
import type { StormStructure } from '../typhoon/cloudField.ts';
import type { Settings as TornadoSettings } from '../tornado/model.ts';
export type World = 'coast' | 'typhoon' | 'tornado';
export type Lens = 'cause' | 'flow' | 'effects';
export type Camera = 'oblique' | 'top' | 'side';
export interface WindSession {
  world: World; lens: Lens; playing: boolean; traces: boolean; academic: boolean; camera: Camera;
  coast: { heat: number; obstacle: 'hill' | 'house' | 'open'; time: number; phase: number; travel: number };
  typhoon: { progress: number; time: number; replacement: number; structure: StormStructure; settings: TyphoonSettings; feature: string; section: boolean };
  tornado: { progress: number; time: number; settings: TornadoSettings };
}
export function createSession(): WindSession {
  return {world:'coast',lens:'cause',playing:false,traces:true,academic:false,camera:'oblique',
    coast:{heat:.65,obstacle:'hill',time:0,phase:0,travel:0},
    typhoon:{progress:1,time:0,replacement:.48,structure:'eye',settings:{temperature:29,shear:5,hemisphere:'north'},feature:'none',section:false},
    tornado:{progress:1,time:24,settings:{shear:.8,updraft:.85,condensation:true}}};
}
export function readRoute(search:string,hash=''): {world:World;lens:Lens} {
  const p=new URLSearchParams(search),w=p.get('world'),l=p.get('lens');
  const old=hash.replace(/^#/,'');
  return {world:w==='coast'||w==='typhoon'||w==='tornado'?w:old==='storms'||old==='typhoon'?'typhoon':old==='tornado'?'tornado':'coast',
    lens:l==='flow'||l==='effects'?l:l==='cause'?'cause':old==='flow'?'flow':old==='effects'?'effects':'cause'};
}
export function worldHref(world:World,search='',base='/') {
  const p=new URLSearchParams(search);p.set('world',world);
  return `${base.replace(/\/?$/,'/')}topics/wind/?${p}`;
}
export function advanceSession(s:WindSession,seconds:number) {
  if(!s.playing)return;
  const dt=clamp(seconds,0,.08);
  if(s.world==='coast'){s.coast.time+=dt;s.coast.phase+=dt*s.coast.heat*.06;s.coast.travel+=dt*Math.abs(s.coast.heat)*.06;}
  else if(s.world==='typhoon'){s.typhoon.time+=dt;s.typhoon.progress=clamp(s.typhoon.progress+dt/26);}
  else{s.tornado.time+=dt;s.tornado.progress=clamp(s.tornado.progress+dt/24);}
}
export function selectWorld(s:WindSession,world:World){s.world=world;s.playing=false;}
export function resetCurrent(s:WindSession){const fresh=createSession();s.playing=false;if(s.world==='coast')s.coast=fresh.coast;else if(s.world==='typhoon')s.typhoon=fresh.typhoon;else s.tornado=fresh.tornado;}
