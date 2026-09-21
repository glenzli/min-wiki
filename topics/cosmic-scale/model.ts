export const AU_KM=149597870.7;
export const LIGHT_YEAR_KM=9460730472580.8;
export const EARTH_RADIUS_KM=6371;
export const SUN_RADIUS_KM=695700;
export type Origin="earth"|"sun";
export const readOrigin=(query:string):Origin=>new URLSearchParams(query).get("origin")==="sun"?"sun":"earth";
export const originStart=(origin:Origin)=>origin==="sun"?progressFor(2200000):0;
export const GALACTIC_RADIUS_KM=50000*LIGHT_YEAR_KM;
export const SUN_CENTER_DISTANCE_KM=26000*LIGHT_YEAR_KM;
export const clamp=(v:number,lo=0,hi=1)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):lo;
export const MIN_HALF_WIDTH_KM=20000,MAX_HALF_WIDTH_KM=5e6*LIGHT_YEAR_KM;
export const halfWidthKm=(progress:number)=>MIN_HALF_WIDTH_KM*(MAX_HALF_WIDTH_KM/MIN_HALF_WIDTH_KM)**clamp(progress);
export const progressFor=(km:number)=>clamp(Math.log(km/MIN_HALF_WIDTH_KM)/Math.log(MAX_HALF_WIDTH_KM/MIN_HALF_WIDTH_KM));
export const stops=[20000,60*AU_KM,12*LIGHT_YEAR_KM,100000*LIGHT_YEAR_KM,5e6*LIGHT_YEAR_KM].map(progressFor);
export function ruler(km:number){const p=10**Math.floor(Math.log10(km));const value=[1,2,5].reverse().find(v=>v*p<=km)??1;return value*p;}
export function displayLength(km:number):{value:number;unit:'km'|'AU'|'ly'}{return km>=LIGHT_YEAR_KM*.1?{value:km/LIGHT_YEAR_KM,unit:'ly'}:km>=AU_KM*.1?{value:km/AU_KM,unit:'AU'}:{value:km,unit:'km'};}
export const diameterPixels=(radius:number,halfWidth:number,width=1040)=>radius/halfWidth*width;
export const smooth=(value:number)=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};
export function scaleState(progress:number,origin:Origin="earth"){const halfWidth=halfWidthKm(progress);const shift=smooth((Math.log10(halfWidth/LIGHT_YEAR_KM)-3.8)/1.2);return {halfWidth,centerX:-SUN_CENTER_DISTANCE_KM*shift-(origin==="sun"?AU_KM:0)*(1-shift),galaxy:halfWidth>LIGHT_YEAR_KM*1500};}
/** Plane orientation changes continuously; the camera never changes its ruler or projection. */
export function viewTilt(progress:number,tilt:number){const blend=smooth((Math.log10(halfWidthKm(progress)/LIGHT_YEAR_KM)-2)/2);return .56+(clamp(tilt)-.56)*blend;}
export function viewPoint(x:number,y:number,z:number,progress:number,tilt:number,origin:Origin="earth"):[number,number,number]{const s=scaleState(progress,origin),a=viewTilt(progress,tilt)*Math.PI/2;return [(x-s.centerX)/s.halfWidth,-(y*Math.cos(a)+z*Math.sin(a))/s.halfWidth,(-y*Math.sin(a)+z*Math.cos(a))/s.halfWidth];}
export function projection(x:number,y:number,z:number,progress:number,tilt:number):[number,number]{const s=scaleState(progress),angle=clamp(tilt)*Math.PI/2;return [520+(x-s.centerX)/s.halfWidth*520,280+(y*Math.cos(angle)+z*Math.sin(angle))/s.halfWidth*520];}
export const stageFor=(p:number)=>p<(stops[0]!+stops[1]!)/2?0:p<(stops[1]!+stops[2]!)/2?1:p<(stops[2]!+stops[3]!)/2?2:p<(stops[3]!+stops[4]!)/2?3:4;
export const readProgress=(query:string)=>clamp(Number(new URLSearchParams(query).get('scale')??0));

export function readJourney(query:string){const origin=readOrigin(query),params=new URLSearchParams(query);return {origin,progress:params.has("scale")?Math.max(originStart(origin),readProgress(query)):originStart(origin)};}

/** Short viewports expand the horizontal camera span uniformly; physical sizes never change. */
export const viewportScale=(width:number,height:number)=>Math.max(1,width/(2*Math.max(1,height)));
