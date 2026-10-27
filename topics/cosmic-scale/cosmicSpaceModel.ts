import { smooth, scaleState, cameraFrameScale, viewPoint, viewTilt, LIGHT_YEAR_KM, type Origin } from './model.ts';

/** Drawing levels, not separate physical structures or measured survey samples.
 * Their local coordinates use one linear light-year scale when projected by
 * the physical camera; fading changes visible detail, never the ruler. */
export const WEB_LEVELS = [
  { kind: 'near', radiusLy: 600e6 },
  { kind: 'middle', radiusLy: 6e9 },
  { kind: 'observable', radiusLy: 46.5e9 },
] as const;

const fade = (halfLy:number, from:number, to:number) =>
  smooth((Math.log10(Math.max(1,halfLy))-Math.log10(from))/(Math.log10(to)-Math.log10(from)));

export function spatialWebFrame(nominalHalfLy:number) {
  const visible = fade(nominalHalfLy, 6e7, 1.8e8);
  const middle = fade(nominalHalfLy, 5e8, 1.5e9);
  const observable = fade(nominalHalfLy, 7e9, 2.4e10);
  return WEB_LEVELS.map((level,index)=>({...level, opacity:visible*(index===0?1-middle:index===1?middle*(1-observable):observable)}));
}

/** Unresolved cluster galaxies keep qualitative volume without pretending to
 * be individually measured bodies. The same 54-Mly anchor remains the ruler's
 * representative Virgo location. */
export function virgoOpacity(nominalHalfLy:number) {
  return fade(nominalHalfLy,8e6,3e7)*(1-fade(nominalHalfLy,2e9,7e9));
}

/** Use the same orthographic transform as every physical body and the ruler.
 * Negative Y converts authored coordinates to the retained camera convention. */
export function spatialWebPose(progress:number,width:number,height:number,tilt:number,origin:Origin,radiusLy:number) {
  const framing=cameraFrameScale(progress,width,height),point=viewPoint(0,0,0,progress,tilt,origin);
  const size=radiusLy*LIGHT_YEAR_KM/(scaleState(progress).halfWidth*framing);
  return {center:point.map(value=>value/framing) as [number,number,number],scale:[size,-size,size] as [number,number,number],pitch:viewTilt(progress,tilt)*Math.PI/2};
}
