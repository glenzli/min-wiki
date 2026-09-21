import { clamp } from './model.ts';
export const chapters=['loads','inside','empty','charge','family','pack'] as const;
export type Chapter=typeof chapters[number];
export type Load='motor'|'bulb'|'led';
export type Charger='none'|'matched'|'wrong';
export interface LabState { energy:number; light:number; work:number; heat:number; input:number; travel:number; rotation:number }
export interface Conditions { closed:boolean; mode:'discharge'|'charge'; load:Load; charger:Charger; rechargeable:boolean }
export const initialLab=():LabState=>({energy:1,light:0,work:0,heat:0,input:0,travel:0,rotation:0});
export function admitted(s:LabState,c:Conditions){return c.mode==='charge'?c.rechargeable&&c.charger==='matched'&&s.energy<1-1e-9:c.closed&&s.energy>1e-9;}
/** Normalized educational energy units, not measured cell efficiencies or a charger algorithm. */
export function transfer(s:LabState,c:Conditions,amount:number):LabState{
 if(!admitted(s,c))return {...s};const q=Math.min(clamp(amount),c.mode==='charge'?1-s.energy:s.energy);
 if(c.mode==='charge')return {...s,energy:s.energy+q,input:s.input+q/0.8,heat:s.heat+q*.25,travel:s.travel-q*2.4};
 const light=c.load==='bulb'?.1:c.load==='led'?.4:0,work=c.load==='motor'?.65:0;
 return {...s,energy:s.energy-q,light:s.light+q*light,work:s.work+q*work,heat:s.heat+q*(1-light-work),travel:s.travel+q*2.4,rotation:s.rotation+(c.load==='motor'?q*2160:0)};
}
/** Replay always projects from the current segment's retained start, never compounds frame deltas. */
export class BatteryExperiment {
 state=initialLab(); conditions:Conditions={closed:false,mode:'discharge',load:'motor',charger:'none',rechargeable:true};
 private origin=initialLab(); progress=0;
 configure(patch:Partial<Conditions>){this.conditions={...this.conditions,...patch};this.origin={...this.state};this.progress=0;}
 replay(value:number){this.progress=clamp(value);const available=this.conditions.mode==='charge'?1-this.origin.energy:this.origin.energy;this.state=transfer(this.origin,this.conditions,this.progress*available);return this.state;}
 reset(){this.state=initialLab();this.origin={...this.state};this.progress=0;this.conditions={...this.conditions,closed:false,charger:'none'};}
}
export function readChapter(search:string):Chapter {const value=new URLSearchParams(search).get('chapter');return chapters.includes(value as Chapter)?value as Chapter:'loads';}
export function packValues(series:number,parallel:number){const count=(v:number)=>Math.max(1,Math.min(4,Math.round(Number.isFinite(v)?v:1)));const s=count(series),p=count(parallel);return {series:s,parallel:p,cells:s*p,voltage:3.6*s,ampHours:2*p,wattHours:3.6*2*s*p};}
