import { EARTH_RADIUS, journeyFrame } from './model.ts';

// An approximate coastal reference in the existing 2k Earth map. All views use
// this one basis; procedural relief is illustration, not a Norwegian DEM.
export const SURFACE_REFERENCE = { latitude: 60.2, longitude: 5.35 } as const;
const lat=SURFACE_REFERENCE.latitude*Math.PI/180,lon=SURFACE_REFERENCE.longitude*Math.PI/180;
export const surfaceBasis={
 up:[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)],
 eye:[Math.sin(lat)*Math.cos(lon),Math.sin(lat)*Math.sin(lon),-Math.cos(lat)],
 right:[-Math.sin(lon),Math.cos(lon),0],
} as const;
export function surfaceUV(x:number,y:number,z:number){
 const r=Math.hypot(x,y,z),b=surfaceBasis;
 const gx=(b.right[0]*x+b.up[0]*y+b.eye[0]*z)/r;
 const gy=(b.right[1]*x+b.up[1]*y+b.eye[1]*z)/r;
 const gz=(b.right[2]*x+b.up[2]*y+b.eye[2]*z)/r;
 return {u:Math.atan2(gy,gx)/(2*Math.PI)+.5,v:.5-Math.asin(Math.max(-1,Math.min(1,gz)))/Math.PI};
}
export const blend=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const hash=(x:number,z:number)=>{const a=Math.sin(x*127.1+z*311.7)*43758.5453;return a-Math.floor(a);};
function field(x:number,z:number){
 const ix=Math.floor(x),iz=Math.floor(z),a=blend(0,1,x-ix),b=blend(0,1,z-iz);
 return (hash(ix,iz)*(1-a)+hash(ix+1,iz)*a)*(1-b)+(hash(ix,iz+1)*(1-a)+hash(ix+1,iz+1)*a)*b;
}
/** Bounded authored relief. It vanishes at the reference site and patch edges,
 * keeping the surface marker and the spherical reference altitude unchanged. */
export function reliefHeight(x:number,z:number,land:number){
 const edge=(1-blend(650,880,Math.abs(x)))*(1-blend(1150,1380,z))*blend(-295,-230,z);
 const anchor=blend(5,20,Math.hypot(x,z));
 const ridge=1-Math.abs(field(x*.044+7,z*.037+2)*2-1);
 const crag=1-Math.abs(field(x*.115+3,z*.09+11)*2-1);
 const detail=field(x*.25,z*.21)*.075;
 return Math.max(0,Math.min(1.65,(ridge*ridge*.72+crag*crag*crag*.85+detail)*blend(.3,.95,land)*edge*anchor));
}
/** Full globe and local patch share a sphere, axes and map coordinates. */
export function surfacePoint(x:number,z:number,height=0){
 const ax=x/EARTH_RADIUS,az=z/EARTH_RADIUS,r=EARTH_RADIUS+height;
 return {x:r*Math.sin(ax)*Math.cos(az),y:r*Math.cos(ax)*Math.cos(az),z:r*Math.sin(az)};
}
export function coastWeight(r:number,g:number,b:number){return 1-blend(6,22,b-Math.max(r,g)*1.05);}

/** A small continuous external-camera pitch reveals near-coast depth. It is a
 * viewing transform only; reference heights, Earth radius and journey stay put. */
export function surfaceViewFrame(progress:number,width:number,height:number){
 const frame=journeyFrame(progress),tilt=(1-blend(18,900,frame.halfSpan))*Math.PI/150;
 return {frame,scale:Math.min(width,height)/(2*frame.halfSpan),tilt,cos:Math.cos(tilt),sin:Math.sin(tilt)};
}
