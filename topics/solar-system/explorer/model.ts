import siteData from './sites.json';
import { WORLDS, clamp, smooth } from '../../planet-surfaces/model.ts';
import { MOONS as SATURN_MOONS } from '../../saturn-moons/model.ts';
export const BODY_IDS = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon', 'titan'] as const;
export type BodyId = typeof BODY_IDS[number];
export type ExploreView = 'globe' | 'descent' | 'landscape' | 'section' | 'moons' | 'rings';
export const VIEW_IDS: ExploreView[] = ['globe', 'descent', 'landscape', 'section', 'moons', 'rings'];
export const worldFor = (id: BodyId) => WORLDS.find(w => w.id === id);
export const isBody = (id: string | null): id is BodyId => BODY_IDS.includes(id as BodyId);
export const parentOf = (id: BodyId): BodyId | undefined => id === 'moon' ? 'earth' : id === 'titan' ? 'saturn' : undefined;
export const canView = (id: BodyId, view: ExploreView) => view === 'rings' ? id === 'saturn' : view !== 'moons' || (!parentOf(id) && id !== 'sun');
export function readSelection(search: string) {
  const p = new URLSearchParams(search), body = p.get('body'), view = p.get('view') as ExploreView;
  return { body: isBody(body) ? body : null, view: VIEW_IDS.includes(view) && (!isBody(body) || canView(body, view)) ? view : 'globe' as ExploreView };
}
/** Exponential approach retains continuity at every scale. Altitude is in display radii,
 * not kilometers or a survivable ballistic trajectory. Solid worlds always stop above ground. */
export function descentState(id: BodyId, progress: number) {
  const p = clamp(progress), solid = worldFor(id)?.surface ?? false;
  const altitude = 2.8 * Math.exp(-p * 7.6) + (solid ? .015 : .003);
  return { progress: p, altitude, stage: Math.min(3, Math.floor(p * 4)),
    haze: ['moon', 'mercury'].includes(id) ? 0 : smooth(.38,.9,p) * (id === 'mars' ? .3 : .9),
    tilt: smooth(.48,1,p) * .95, solid };
}
export interface MoonOrbit { id: string; radius: number; period: number; distance: number; retrograde?: boolean }
// Rounded mean elements; selected examples, never a changing total or live ephemeris.
// JPL https://ssd.jpl.nasa.gov/sats/elem/ and https://ssd.jpl.nasa.gov/sats/phys_par/
export const SATELLITES: Partial<Record<BodyId, MoonOrbit[]>> = {
  earth: [{id:'moon', radius:1737.4, period:27.322, distance:384400}],
  mars: [{id:'phobos',radius:11.1,period:.3189,distance:9376},{id:'deimos',radius:6.2,period:1.2624,distance:23463}],
  jupiter:[{id:'io',radius:1821.6,period:1.769,distance:421800},{id:'europa',radius:1560.8,period:3.551,distance:671100},{id:'ganymede',radius:2631.2,period:7.155,distance:1070400},{id:'callisto',radius:2410.3,period:16.689,distance:1882700}],
  saturn: SATURN_MOONS,
  uranus:[{id:'miranda',radius:235.8,period:1.413,distance:129900},{id:'ariel',radius:578.9,period:2.520,distance:190900},{id:'umbriel',radius:584.7,period:4.144,distance:266000},{id:'titania',radius:788.9,period:8.706,distance:436300},{id:'oberon',radius:761.4,period:13.463,distance:583500}],
  neptune:[{id:'triton',radius:1353.4,period:5.877,distance:354800,retrograde:true}],
};
export function moonPosition(moon: MoonOrbit,index: number, days: number): [number,number,number] {
  const radius = 2.5 + index * .65, a = index * .91 + days / moon.period * Math.PI * 2 * (moon.retrograde ? -1 : 1);
  return [Math.cos(a)*radius,0,Math.sin(a)*radius];
}

/** Body-fixed coordinates shared by the globe marker, descent camera and regional patch.
 * Longitude is east-positive, matching the existing equirectangular maps (u=.5 at 0°). */
export function siteNormal(latitude:number,longitude:number):[number,number,number] {
  const lat=latitude*Math.PI/180,lon=longitude*Math.PI/180,c=Math.cos(lat);
  return [c*Math.cos(lon),Math.sin(lat),-c*Math.sin(lon)];
}
export interface ObservationSite {
  id:string;latitude:number;longitude:number;terrain:string;
  stages:{title:{zh:string;en:string};text:{zh:string;en:string}}[];
  name:{zh:string;en:string};description:{zh:string;en:string};source:string;
}
export const sitesFor=(id:BodyId):ObservationSite[]=>siteData[id];
export const siteFor=(id:BodyId,key?:string|null):ObservationSite=>sitesFor(id).find(s=>s.id===key)??sitesFor(id)[0]!;

export type InteriorMotion = 'solid'|'mantle'|'fluid'|'convection'|'radiation'|'fusion'|'uncertain';
export function interiorMotion(body:BodyId,layer:{id:string;uncertain?:boolean}):InteriorMotion {
  if(['jupiter','saturn','uranus','neptune'].includes(body)&&/atmosphere|envelope/.test(layer.id))return 'convection';
  if(layer.uncertain)return 'uncertain';
  if(body==='sun')return layer.id==='core'?'fusion':layer.id==='radiative'?'radiation':'convection';
  if(['mercury','mars','moon'].includes(body)&&layer.id==='outer-core')return 'fluid';
  if(body==='venus'&&layer.id==='mantle')return 'mantle';
  if(body==='earth')return layer.id.includes('mantle')?'mantle':layer.id==='outer-core'?'fluid':'solid';
  if(['jupiter','saturn','uranus','neptune'].includes(body)&&/atmosphere|envelope|hydrogen/.test(layer.id))return 'convection';
  return 'solid';
}
/** Closed illustrative overturning cell, confined strictly inside its host annulus. */
export function interiorParcel(inner:number,outer:number,cell:number,cells:number,phase:number):[number,number] {
  const t=phase*Math.PI*2,mid=(inner+outer)/2;
  const r=mid+(outer-inner)*.36*Math.sin(t);
  const a=cell/cells*Math.PI*2+Math.cos(t)*Math.PI/cells*.67;
  return [Math.cos(a)*r,Math.sin(a)*r];
}

/** A divergence-free teaching streamfunction in annular coordinates. Both edges
 * have zero radial flow; geometry uncertainty is not a license to animate a core. */
export function interiorVelocity(inner:number,outer:number,x:number,y:number,cells:number):[number,number]{
  const r=Math.hypot(x,y);if(r<=inner||r>=outer||r<1e-6)return [0,0];
  const s=(r-inner)/(outer-inner),a=Math.atan2(y,x),w=outer-inner;
  const phase=cells*a+.4*Math.sin(a*3),wave=Math.sin(Math.PI*s);
  const radial=wave*wave*Math.cos(phase)*(cells+1.2*Math.cos(a*3))*w/(r*cells);
  const tangent=-Math.PI*Math.sin(2*Math.PI*s)*Math.sin(phase)/cells;
  return [Math.cos(a)*radial-Math.sin(a)*tangent,Math.sin(a)*radial+Math.cos(a)*tangent];
}
