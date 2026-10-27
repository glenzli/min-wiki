import {PLANET_RADII_KM} from './model.ts';
import {galacticObjects,SOLAR_POSITION} from './galacticModel.ts';

export type MembershipView={yaw:number;pitch:number};
export type MembershipPreset='top'|'edge';
export type MembershipPoint=readonly [number,number,number];
export const MEMBERSHIP_CACHE_LIMIT=2;
export const membershipView=():MembershipView=>({yaw:-.12,pitch:.86});
const clamp=(value:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,Number.isFinite(value)?value:0));
/** A full azimuth and the complete top-to-edge range; keep the horizon upright. */
export function turnMembershipView(view:MembershipView,dx:number,dy:number):MembershipView{
 const yaw=view.yaw+(Number.isFinite(dx)?dx:0),turn=Math.PI*2;
 return {yaw:((yaw+Math.PI)%turn+turn)%turn-Math.PI,pitch:clamp(view.pitch+(Number.isFinite(dy)?dy:0),0,Math.PI/2)};
}
export const membershipPreset=(preset:MembershipPreset):MembershipView=>({yaw:0,pitch:preset==='top'?0:Math.PI/2});

/** Recognition sizes and spread orbits, explicitly independent of the physical camera. */
export const membershipSolar=PLANET_RADII_KM.map((radius,index)=>{
 const orbit=.25+.98*index/7,phase=[2.4,-.5,1.4,3.5,-1.0,.25,2.8,4.5][index]!;
 return {id:index,orbit,radius:.082*(radius/PLANET_RADII_KM[4])**.28,center:[Math.cos(phase)*orbit,Math.sin(phase)*orbit,0] as MembershipPoint};
});
export const membershipSunRadius=.15;
export const membershipSolarAnchor:MembershipPoint=SOLAR_POSITION;
/** An explicit reading layout, never a distance map. Bodies retain their own spherical/disk geometry. */
export const MEMBERSHIP_GROUP_LAYOUT=Object.freeze({x:1.55,y:.55,bodyScale:2.9});
const groupPoint=(point:MembershipPoint):MembershipPoint=>[point[0]*MEMBERSHIP_GROUP_LAYOUT.x,point[1]*MEMBERSHIP_GROUP_LAYOUT.y,point[2]];
/** Reuse canonical identities/samples; compensate the default observer tilt so no disk vanishes edge-on. */
export function membershipGroup(){return galacticObjects('local-group').map(object=>{let points:Float32Array|undefined;if(object.id==='dwarfs'){const original=object.clouds[0]!.positions;points=new Float32Array(original.length);for(let i=0;i<original.length;i+=3)points.set(groupPoint([original[i]!,original[i+1]!,original[i+2]!]),i);}return {id:object.id,center:groupPoint(object.center),inclination:object.inclination-membershipView().pitch,scale:object.id==='dwarfs'?1:object.scale*MEMBERSHIP_GROUP_LAYOUT.bodyScale,points};});}
const random=(n:number)=>{let h=Math.imul(n+71,374761393);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
/** Bounded, stable volume samples. Counts and locations encode neither census nor distances. */
export function membershipCloud(count:number,seed:number,radius:number,flatten=1){
 const positions=new Float32Array(count*3),colors=new Float32Array(count*3);
 for(let i=0;i<count;i++){const n=seed*911+i*11,r=radius*Math.cbrt(random(n)),a=random(n+1)*Math.PI*2,z=random(n+2)*2-1,q=Math.sqrt(1-z*z);positions.set([r*q*Math.cos(a),r*q*Math.sin(a),r*z*flatten],i*3);const warm=i%7===0,b=.6+.4*random(n+3);colors.set((warm?[1,.78,.52]:[.60,.77,1]).map(c=>c*b),i*3);}
 return {positions,colors};
}

/** Keep the default framing. Widen gently when a newly reachable face-on plane
 * needs more vertical space; this is observer framing, never object scaling. */
export function membershipFrame(home:number,width:number,height:number,view:MembershipView=membershipView()){
 const planeHeight=Math.hypot(Math.cos(view.pitch),Math.sin(view.pitch)*Math.sin(view.yaw)),t=clamp((planeHeight-.66)/.34,0,1),ease=t*t*(3-2*t);
 const base=home===6?1.28:home===1?.88:home===0?.94:home===2?.80:1.02,target=home===0?1.42:home===1?1.28:home===2?1.40:base;
 const aspect=width/Math.max(1,height),vertical=base+(target-base)*ease,horizontal=home===6?1.28:home===1?1.25:home===2?1.93:1.35;
 const halfX=Math.max(horizontal,vertical*aspect);return {halfX,halfY:halfX/aspect};
}
export interface MembershipLabel {id:string;x:number;y:number;width:number;height:number;priority:number;clearance?:number;}
export interface MembershipLabelBox extends MembershipLabel {left:number;top:number;}
const overlap=(a:MembershipLabelBox,b:MembershipLabelBox)=>Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left)+6)*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top)+5);
/** Place labels without overlap, retaining their independent projected object anchors. */
export function placeMembershipLabels(labels:readonly MembershipLabel[],width:number,height:number):MembershipLabelBox[]{
 const placed:MembershipLabelBox[]=[],margin=7,top=30,bottom=38,cores:MembershipLabelBox[]=labels.filter(label=>(label.clearance??0)>0).map(label=>({...label,left:label.x-label.clearance!,top:label.y-label.clearance!,width:label.clearance!*2,height:label.clearance!*2}));
 for(const label of [...labels].sort((a,b)=>b.priority-a.priority)){
  const w=Math.min(label.width,width-margin*2),h=label.height,candidates:MembershipLabelBox[]=[];
  const add=(left:number,y:number)=>candidates.push({...label,width:w,left:clamp(left,margin,Math.max(margin,width-margin-w)),top:clamp(y,top,Math.max(top,height-bottom-h))});
  const distance=label.clearance??16;
  for(const [dx,dy] of [[-w/2,distance],[-w/2,-h-distance],[distance,-h/2],[-w-distance,-h/2],[-w-distance,distance],[distance,distance],[-w-distance,-h-distance],[distance,-h-distance]])add(label.x+dx!,label.y+dy!);
  for(let y=top;y+h<=height-bottom;y+=h+8)for(let x=margin;x+w<=width-margin;x+=w+12)add(x,y);
  const score=(box:MembershipLabelBox)=>placed.reduce((sum,other)=>sum+overlap(box,other)*1e5,0)+cores.reduce((sum,core)=>sum+overlap(box,core)*1e4,0)+Math.hypot(box.left+w/2-label.x,box.top+h/2-label.y);
  candidates.sort((a,b)=>score(a)-score(b));if(candidates[0])placed.push(candidates[0]);
 }
 return placed;
}
