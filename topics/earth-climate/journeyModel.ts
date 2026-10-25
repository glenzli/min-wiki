import {reflectionBudget} from './model';

export const JOURNEY_SCOPES=['global','region','evidence'] as const;
export const EVIDENCE_MODES=['seaice','snow','sediment','scratches','core'] as const;
export const REGION_A=Object.freeze({id:'A',latitude:45,longitude:35,sample:'P1'});
const radians=Math.PI/180;
export const boundedCover=(percent:number)=>Math.max(0,Math.min(100,Number.isFinite(percent)?percent:0));

/** Irregular boundaries retain the prescribed reference-sphere area; their longitude mean perturbation is zero. */
export function edgeSine(percent:number,longitude=REGION_A.longitude) {
  const f=boundedCover(percent)/100,angle=(longitude-REGION_A.longitude)*radians;
  return 1-f+f*(1-f)*(.065*Math.sin(5*angle)+.035*Math.sin(9*angle));
}
export function iceEdgeLatitude(percent:number,longitude=REGION_A.longitude) {
  return Math.asin(Math.max(0,Math.min(1,edgeSine(percent,longitude))))/radians;
}
export function regionSnapshot(iceCover:number,snowReflect:number) {
  const cover=boundedCover(iceCover),edgeLatitude=iceEdgeLatitude(cover),inside=cover>=100||cover>0&&Math.abs(REGION_A.latitude)>=edgeLatitude;
  return {id:REGION_A.id,sample:REGION_A.sample,latitude:REGION_A.latitude,longitude:REGION_A.longitude,iceCover:cover,edgeLatitude,inside,
    seaIce:inside?1:0,reflection:reflectionBudget(cover,snowReflect)};
}
/** The shader and the site predicate share this exact spherical boundary, not separate animation curves. */
export const ICE_EDGE_GLSL=`float edgeSine(float f,float lon){float a=lon-${(REGION_A.longitude*radians).toFixed(10)};return 1.0-f+f*(1.0-f)*(.065*sin(5.0*a)+.035*sin(9.0*a));}
float frozen(vec3 n,float f){if(f<=0.0)return 0.0;if(f>=1.0)return 1.0;return smoothstep(edgeSine(f,atan(n.z,n.x))-.0015,edgeSine(f,atan(n.z,n.x))+.0015,abs(n.y));}`;
