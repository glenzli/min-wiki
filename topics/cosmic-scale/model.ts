import words from './content.json';
export const AU_KM=149597870.7;
/** Rounded mean distances for illustrative circular planetary orbits, in AU. */
export const ORBIT_RADII_AU=[.387,.723,1,1.524,5.203,9.537,19.191,30.069] as const;
export const LIGHT_YEAR_KM=9460730472580.8;
export const EARTH_RADIUS_KM=6371;
export const SUN_RADIUS_KM=695700;
export type Origin="earth"|"sun";
export const readOrigin=(query:string):Origin=>new URLSearchParams(query).get("origin")==="sun"?"sun":"earth";
export const originStart=(origin:Origin)=>origin==="sun"?progressFor(2200000):0;
export const GALACTIC_RADIUS_KM=50000*LIGHT_YEAR_KM;
export const SUN_CENTER_DISTANCE_KM=26000*LIGHT_YEAR_KM;
export const clamp=(v:number,lo=0,hi=1)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):lo;
export const MIN_HALF_WIDTH_KM=20000,MAX_HALF_WIDTH_KM=100e9*LIGHT_YEAR_KM;
const LEGACY_MAX_HALF_WIDTH_KM=5e6*LIGHT_YEAR_KM;
/** Approximate present-day radius of the observable region, not light-travel time. */
export const OBSERVABLE_RADIUS_KM=46.5e9*LIGHT_YEAR_KM;
export const halfWidthKm=(progress:number)=>MIN_HALF_WIDTH_KM*(MAX_HALF_WIDTH_KM/MIN_HALF_WIDTH_KM)**clamp(progress);
export const progressFor=(km:number)=>clamp(Math.log(km/MIN_HALF_WIDTH_KM)/Math.log(MAX_HALF_WIDTH_KM/MIN_HALF_WIDTH_KM));
/** The same observing site is named for its smallest still meaningful enclosing structure. */
export type AnchorName='earth'|'sunLocation'|'solarSystemLocation'|'milkyLocation'|'localGroupLocation'|'laniakeaLocation';
export function anchorForScale(progress:number,origin:Origin):AnchorName{
 const halfLy=halfWidthKm(progress)/LIGHT_YEAR_KM;
 if(halfLy>=2e9)return'laniakeaLocation';
 if(halfLy>=25e6)return'localGroupLocation';
 if(halfLy>=1.5e6)return'milkyLocation';
 if(halfLy>=1e-4)return'solarSystemLocation';
 return origin==='sun'?'sunLocation':'earth';
}
export const stops=[20000,60*AU_KM,12*LIGHT_YEAR_KM,100000*LIGHT_YEAR_KM,5e6*LIGHT_YEAR_KM,80e6*LIGHT_YEAR_KM,400e6*LIGHT_YEAR_KM,5e9*LIGHT_YEAR_KM,MAX_HALF_WIDTH_KM].map(progressFor);
/** Selectable waypoints on the continuous ruler; Virgo and the web remain visible along the way. */
export const zoomRoute=[0,1,2,3,4,6,8] as const;
export function ruler(km:number){const p=10**Math.floor(Math.log10(km));const value=[1,2,5].reverse().find(v=>v*p<=km)??1;return value*p;}
export function displayLength(km:number):{value:number;unit:'km'|'AU'|'ly'}{return km>=LIGHT_YEAR_KM*.1?{value:km/LIGHT_YEAR_KM,unit:'ly'}:km>=AU_KM*.1?{value:km/AU_KM,unit:'AU'}:{value:km,unit:'km'};}
export function formatLength(km:number,language:'zh'|'en'){
 const {value,unit}=displayLength(km),number=(v:number)=>v.toLocaleString(language==='zh'?'zh-CN':'en-US',{maximumSignificantDigits:3});
 if(unit!=='ly')return `${number(value)} ${unit}`;
 const labels=words.lengthUnits[language];
 if(language==='zh')return value>=1e8?`${number(value/1e8)} ${labels.large}`:value>=1e4?`${number(value/1e4)} ${labels.medium}`:`${number(value)} ${labels.small}`;
 return value>=1e9?`${number(value/1e9)} ${labels.large}`:value>=1e6?`${number(value/1e6)} ${labels.medium}`:`${number(value)} ${labels.small}`;
}
export const diameterPixels=(radius:number,halfWidth:number,width=1040)=>radius/halfWidth*width;
export const smooth=(value:number)=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};
export function scaleState(progress:number,origin:Origin="earth"){const halfWidth=halfWidthKm(progress);const shift=smooth((Math.log10(halfWidth/LIGHT_YEAR_KM)-3.8)/1.2);return {halfWidth,centerX:-SUN_CENTER_DISTANCE_KM*shift-(origin==="sun"?AU_KM:0)*(1-shift),galaxy:halfWidth>LIGHT_YEAR_KM*1500};}
/** Plane orientation changes continuously; the camera never changes its ruler or projection. */
export function viewTilt(progress:number,tilt:number){const blend=smooth((Math.log10(halfWidthKm(progress)/LIGHT_YEAR_KM)-2)/2);return .56+(clamp(tilt)-.56)*blend;}
export function viewPoint(x:number,y:number,z:number,progress:number,tilt:number,origin:Origin="earth"):[number,number,number]{const s=scaleState(progress,origin),a=viewTilt(progress,tilt)*Math.PI/2;return [(x-s.centerX)/s.halfWidth,-(y*Math.cos(a)+z*Math.sin(a))/s.halfWidth,(-y*Math.sin(a)+z*Math.cos(a))/s.halfWidth];}
export function projection(x:number,y:number,z:number,progress:number,tilt:number):[number,number]{const s=scaleState(progress),angle=clamp(tilt)*Math.PI/2;return [520+(x-s.centerX)/s.halfWidth*520,280+(y*Math.cos(angle)+z*Math.sin(angle))/s.halfWidth*520];}
export const stageFor=(p:number)=>{
 for(let i=0;i<stops.length-1;i++){
  // The Milky Way story begins when its disk starts to resolve, after the sampled local stars recede.
  const boundary=i===2?progressFor(12000*LIGHT_YEAR_KM):(stops[i]!+stops[i+1]!)/2;
  if(p<boundary)return i;
 }
 return stops.length-1;
};
export const readProgress=(query:string)=>{const params=new URLSearchParams(query),value=clamp(Number(params.get('scale')??0));return params.get('scaleVersion')==='2'?value:progressFor(MIN_HALF_WIDTH_KM*(LEGACY_MAX_HALF_WIDTH_KM/MIN_HALF_WIDTH_KM)**value);};

export function readJourney(query:string){const origin=readOrigin(query),params=new URLSearchParams(query);return {origin,progress:params.has("scale")?Math.max(originStart(origin),readProgress(query)):originStart(origin)};}

/** Short viewports expand the horizontal camera span uniformly; physical sizes never change. */
export const viewportScale=(width:number,height:number)=>Math.max(1,width/(2*Math.max(1,height)));
/** At the last stop, frame the observing horizon within either canvas dimension. */
export const cameraFrameScale=(progress:number,width:number,height:number)=>{const base=viewportScale(width,height),target=OBSERVABLE_RADIUS_KM/MAX_HALF_WIDTH_KM*width/(.8*Math.min(width,height));return base+(target-base)*smooth((Math.log10(halfWidthKm(progress)/LIGHT_YEAR_KM)-10)/.9);};
