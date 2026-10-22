import { clamp, destination, waterParcel, type Pool, type Settings, type View } from './watershedModel.ts';

/** Topic-owned teaching geography. Units are display units, never surveyed metres.
 * The same channel heights carve the bed, draw the water and carry the cohort. */
export type XYZ = readonly [number, number, number];
export const DOMAIN = { left:-7.4, right:8.2, back:-4.5, front:4.6 } as const;
export const SEA_LEVEL=.06;
export const LAKE = { x:1.9, z:.6, y:.52, rx:1.05, rz:.67 } as const;
export const smooth=(n:number)=>{const q=clamp(n);return q*q*(3-2*q);};
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
export const mix3=(a:XYZ,b:XYZ,p:number):XYZ=>[mix(a[0],b[0],p),mix(a[1],b[1],p),mix(a[2],b[2],p)];
export const stableNoise=(n:number)=>{const q=Math.sin(n*127.1+311.7)*43758.5453;return q-Math.floor(q);};
export const coastline=(z:number)=>4.65+.28*Math.sin(z*.75)+.1*Math.sin(z*2.2);
export function riverCourse(value:number):XYZ {
 const q=clamp(value);return [-4.05+5.15*q,1.28-.76*q,-.68+1.28*q+.37*Math.sin(q*3*Math.PI)*Math.sin(q*Math.PI)];
}
export function outletCourse(value:number):XYZ {
 const q=clamp(value);return [2.65+2.68*q,mix(LAKE.y,SEA_LEVEL,smooth(q)),.7+.48*Math.sin(q*Math.PI)-.18*q];
}
export function runoffCourse(value:number):XYZ {const q=clamp(value),end=riverCourse(.35);return [mix(-2.85,end[0],q),mix(1.28,end[1],q),mix(1.35,end[2],q)];}
function nearest(course:(q:number)=>XYZ,x:number,z:number,guess:number){
 let left=Math.max(0,guess-.16),right=Math.min(1,guess+.16);
 const distance=(q:number)=>{const p=course(q);return (p[0]-x)**2+(p[2]-z)**2;};
 for(let i=0;i<13;i++){const a=left+(right-left)/3,b=right-(right-left)/3;if(distance(a)<distance(b))right=b;else left=a;}
 const q=(left+right)/2,p=course(q);return {point:p,distance:Math.hypot(p[0]-x,p[2]-z),q};
}
export function channelAt(x:number,z:number){
 const river=nearest(riverCourse,x,z,clamp((x+4.05)/5.15)),outlet=nearest(outletCourse,x,z,clamp((x-2.65)/2.68));
 return river.distance<outlet.distance?{...river,width:.13+.065*river.q,kind:'river' as const}:{...outlet,width:.15+.055*outlet.q,kind:'outlet' as const};
}
const gaussian=(x:number,z:number,cx:number,cz:number,sx:number,sz:number)=>Math.exp(-(((x-cx)/sx)**2)-(((z-cz)/sz)**2));
export function terrainHeight(x:number,z:number):number {
 const coast=coastline(z),shore=coast-x;
 if(shore<0)return SEA_LEVEL-.13-Math.min(.7,-shore*.18);
 const ridges=2.65*gaussian(x,z,-5.3,-2.7,1.1,1.25)+1.5*gaussian(x,z,-3.55,-3.55,1.5,.7)+.6*gaussian(x,z,-6.7,-.5,.8,1.65);
 const relief=.07*Math.sin(x*2.5+z*1.8)*Math.sin(z*2.6)+.045*Math.sin(x*5.4-z*2.7);
 let height=Math.max(.22,1.5-(x+4)*.15+ridges+relief);
 const channel=channelAt(x,z);
 // A smooth valley shoulder meets a submerged bed. This is the one contact rule.
 const valley=channel.point[1]-.105+Math.max(0,channel.distance-channel.width*.7)*1.35;
 height=Math.min(height,valley);
 const start=runoffCourse(0),end=runoffCourse(1),dx=end[0]-start[0],dz=end[2]-start[2],rq=clamp(((x-start[0])*dx+(z-start[2])*dz)/(dx*dx+dz*dz)),runoff=runoffCourse(rq),rd=Math.hypot(x-runoff[0],z-runoff[2]);
 height=Math.min(height,runoff[1]-.025+rd*1.35);
 const lakeDistance=Math.hypot((x-LAKE.x)/LAKE.rx,(z-LAKE.z)/LAKE.rz);
 height=Math.min(height,LAKE.y-.22+Math.max(0,lakeDistance-.72)*.95);
 return Math.min(height,SEA_LEVEL-.025+shore*.56);
}
export const onTerrain=(x:number,z:number,lift=.025):XYZ=>[x,terrainHeight(x,z)+lift,z];
export const GROUND=onTerrain(-2.85,1.35);
export const CLOUD:XYZ=[-2.95,5.35,.25];
export const OCEAN:XYZ=[6.55,SEA_LEVEL+.05,1.8];
export const glacierCourse=(value:number):XYZ=>{const q=clamp(value);return onTerrain(-5.25+1.2*q,-2.4+1.72*q,.09);};
export const anchors={cloud:CLOUD,ground:GROUND,river:riverCourse(.57),lake:[LAKE.x,LAKE.y,LAKE.z] as XYZ,ice:glacierCourse(.35)};
export interface CameraFrame {target:XYZ;span:number;pitch:number;distance:number}
export const cameraFrames:Record<View,CameraFrame>={
 basin:{target:[.05,1.5,0],span:18.1,pitch:.77,distance:24},
 cloud:{target:[-2.6,4,.2],span:8.3,pitch:.48,distance:16},
 ground:{target:[-2.7,1.45,.9],span:6.4,pitch:.8,distance:14},
 river:{target:[.65,.85,.75],span:10.8,pitch:.88,distance:18},
 ice:{target:[-4.65,2.35,-1.75],span:6.6,pitch:.68,distance:14},
};
function cubic(a:XYZ,b:XYZ,c:XYZ,d:XYZ,t:number):XYZ {const q=clamp(t),v=1-q;return [0,1,2].map(i=>v**3*a[i]+3*v*v*q*b[i]+3*v*q*q*c[i]+q**3*d[i]) as unknown as XYZ;}
const surfaceRunoff=(q:number):XYZ=>runoffCourse(q);
/** One retained cohort; pool assignments come from the existing deterministic model.
 * Camera selection is deliberately absent. A gas marker is an invisible-water cue. */
export function parcelPosition(progress:number,id:number,settings:Settings,iceProgress=0){
 const p=clamp(progress),rank=id*37%100,parcel=waterParcel(p,id,settings,iceProgress),dest=destination(id,settings);
 const offset:XYZ=[(id%10-4.5)*.025,0,(Math.floor(id/10)-4.5)*.022];
 let point:XYZ;
 const cloudStart:XYZ=[.65,5.55,1.1];
 if(p<.22)point=cubic(OCEAN,[7.1,2.9,1.7],[4,5.65,1.2],cloudStart,smooth(p/.22));
 else if(p<.44)point=mix3(cloudStart,CLOUD,smooth((p-.22)/.22));
 else if(dest==='vapor')point=cubic(CLOUD,[-2.9,2.8,.8],[-.2,2.1,1.5],[1.2,3.7,1.1],smooth((p-.44)/.4));
 else if(p<.64)point=mix3(CLOUD,dest==='ice'?glacierCourse(0):GROUND,smooth((p-.44)/.2));
 else {
  const travel=smooth((p-.64)/.36);
  if(dest==='ice'){
   const slow=clamp(iceProgress)*travel,release=.5+(rank%8)*.04;
   if(slow<release)point=glacierCourse(smooth(slow/release));
   else point=riverCourse(.32*smooth((slow-release)/(1-release)));
  }else if(dest==='soil')point=[GROUND[0]+travel*.16,GROUND[1]-travel*(.8+rank%5*.05),GROUND[2]+travel*.06];
  else if(dest==='surface')point=onTerrain(GROUND[0]+travel*.25,GROUND[2]+travel*.15,.04);
  else if(travel<.3)point=surfaceRunoff(smooth(travel/.3));
  else if(travel<.68)point=riverCourse(.35+(dest==='river'?.58:.65)*smooth((travel-.3)/.38));
  else if(dest==='river')point=riverCourse(.93);
  else if(travel<.84)point=mix3(riverCourse(1),[LAKE.x,LAKE.y,LAKE.z],smooth((travel-.68)/.16));
  else if(dest==='lake')point=[LAKE.x,LAKE.y,LAKE.z];
  else {
   const q=smooth((travel-.84)/.16);
   point=q<.25?mix3([LAKE.x,LAKE.y,LAKE.z],outletCourse(0),smooth(q/.25)):q<.8?outletCourse(smooth((q-.25)/.55)):mix3(outletCourse(1),OCEAN,smooth((q-.8)/.2));
  }
 }
 // Cross-channel spread stays inside the water ribbon; land contact follows actual relief.
 const x=point[0]+offset[0],z=point[2]+offset[2];
 let y=point[1]+(parcel.pool==='river'||parcel.pool==='lake'||parcel.pool==='ocean'?.035:0);
 if(p>=.44&&p<.64&&dest!=='vapor'){
  const contact=dest==='ice'?glacierCourse(0):GROUND;
  const delta=terrainHeight(contact[0]+offset[0],contact[2]+offset[2])+(dest==='ice'?.12:.025)-contact[1];
  y+=delta*smooth((p-.44)/.2);
 }
 if(p>=.64&&parcel.pool==='soil')y=terrainHeight(GROUND[0]+offset[0],GROUND[2]+offset[2])+.025-smooth((p-.64)/.36)*(.8+rank%5*.05);
 if(p>=.64&&(parcel.pool==='surface'||parcel.pool==='ice'))y=terrainHeight(x,z)+(parcel.pool==='ice'?.12:.045);
 if(p>=.64&&parcel.pool==='river'&&terrainHeight(x,z)>y)y=terrainHeight(x,z)+.04;
 // Count actual teaching locations, including lake/outlet transit. The old SVG
 // model grouped the whole final transfer under its destination; a 3D map must
 // not claim water has reached the sea while it is visibly still inland.
 let pool=parcel.pool;
 const travel=smooth((p-.64)/.36),lakeDistance=Math.hypot((x-LAKE.x)/LAKE.rx,(z-LAKE.z)/LAKE.rz);
 if(p>=.64&&['river','lake','ocean'].includes(dest)&&travel<.3)pool='surface';
 if(pool==='river'&&lakeDistance<=1&&Math.abs(y-LAKE.y)<.06)pool='lake';
 if(p>=.64&&parcel.pool==='ocean'&&dest==='ocean'&&x<coastline(z))pool=Math.hypot((x-LAKE.x)/LAKE.rx,(z-LAKE.z)/LAKE.rz)<=1.05?'lake':'river';
 return {id,pool,destination:parcel.destination,position:[x,y,z] as XYZ};
}
export function spatialWatershedState(progress:number,settings:Settings,iceProgress=0){const parcels=Array.from({length:100},(_,id)=>parcelPosition(progress,id,settings,iceProgress)),pools:Record<Pool,number>={ocean:0,vapor:0,cloud:0,falling:0,soil:0,lake:0,river:0,ice:0,surface:0};for(const parcel of parcels)pools[parcel.pool]++;return {parcels,pools,total:parcels.length};}
export const POOL_COLOR:Record<Pool,string>={ocean:'#4db0cf',vapor:'#d7b268',cloud:'#c1e6f1',falling:'#77cbe6',soil:'#367aab',lake:'#49b2ca',river:'#65c8dd',ice:'#f1fbff',surface:'#61bdd5'};
