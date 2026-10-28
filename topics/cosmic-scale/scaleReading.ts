import {AU_KM,LIGHT_YEAR_KM,EARTH_RADIUS_KM,SUN_RADIUS_KM,cameraFrameScale,halfWidthKm,diameterPixels,type Origin} from './model.ts';

/** Reading cues follow the production projection, including short-screen framing. */
export function scaleReading(progress:number,origin:Origin,width:number,height:number){
 const half=halfWidthKm(progress)*cameraFrameScale(progress,width,height),radius=origin==='earth'?EARTH_RADIUS_KM:SUN_RADIUS_KM;
 const kind=half<.5*LIGHT_YEAR_KM?'bodies':half<12*LIGHT_YEAR_KM?'interstellar':half<12000*LIGHT_YEAR_KM?'stars':half<12e6*LIGHT_YEAR_KM?'galaxy':'web';
 return {kind,subpixel:diameterPixels(radius,half,width)<1,diameterPx:diameterPixels(radius,half,width),spanKm:half*2,nearOrbits:half<350*AU_KM} as const;
}
