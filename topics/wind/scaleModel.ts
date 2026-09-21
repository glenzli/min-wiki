export type ScaleView='school'|'city'|'storm';
export const PLAYGROUND_KM=.1;
export const CITY_KM=20;
export const SCALE_SPANS:Record<ScaleView,number>={school:.22,city:32,storm:1400};
export const CLOUD_SPANS=[500,1000] as const;
export type CloudSpan=typeof CLOUD_SPANS[number];
export function scaleRatios(diameter:CloudSpan){return {playgrounds:diameter/PLAYGROUND_KM,cities:diameter/CITY_KM};}
/** Same kilometres-to-pixels conversion for every object, including intermediate zoom frames. */
export function scaleProjection(width:number,height:number,span:number){
  const pixelsPerKm=Math.max(1,Math.min(width,height))/Math.max(.001,span);
  return {pixelsPerKm,x:(km:number)=>width/2+km*pixelsPerKm,y:(km:number)=>height/2-km*pixelsPerKm,size:(km:number)=>km*pixelsPerKm};
}
export function rulerKm(span:number){
  const target=span*.22,power=10**Math.floor(Math.log10(target));
  return [5,2,1].map(n=>n*power).find(n=>n<=target)??power;
}
