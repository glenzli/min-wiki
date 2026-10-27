import {stellarSpotDirections} from '../../src/visuals/stellarPortrait.ts';

export type SolarPoint={x:number;y:number};
export const SOLAR_SECTION={x:264,y:277,radius:186,radiativeRadius:133,coreRadius:47} as const;
export const SOLAR_PATCH={x:563,width:430,surface:338,bottom:457} as const;
/** The anatomy camera holds this orientation so the selected region stays visible.
 * Surface detail still consumes the existing illustration time. */
export const ANATOMY_SURFACE_ROTATION=0;

/** These are the actual first two spots used by the topic's whole-Sun painter,
 * projected into the selected patch. This is an identity link, not a size ruler. */
export function solarActiveRegion(){
 const directions=stellarSpotDirections('solar').slice(0,2);
 const center=directions.reduce((p,[x,y])=>({x:p.x+x/directions.length,y:p.y-y/directions.length}),{x:0,y:0});
 const localScale=1250;
 const spots=directions.map(([x,y,z,radius])=>({
  whole:{x:SOLAR_SECTION.x+x*SOLAR_SECTION.radius,y:SOLAR_SECTION.y-y*SOLAR_SECTION.radius},
  local:{x:SOLAR_PATCH.x+SOLAR_PATCH.width/2+(x-center.x)*localScale,y:-(y+center.y)*localScale},
  radius:radius*localScale*.46,depth:z,
 }));
 const whole={x:SOLAR_SECTION.x+center.x*SOLAR_SECTION.radius,y:SOLAR_SECTION.y+center.y*SOLAR_SECTION.radius};
 const radius=Math.max(...spots.map(spot=>Math.hypot(spot.whole.x-whole.x,spot.whole.y-whole.y)+spot.radius/localScale/.46*SOLAR_SECTION.radius))+5;
 return {id:'A',whole,radius,spots};
}

const finite=(value:number)=>Number.isFinite(value)?value:0;
const clamp=(value:number)=>Math.max(0,Math.min(1,finite(value)));
const smooth=(from:number,to:number,value:number)=>{const t=clamp((value-from)/(to-from));return t*t*(3-2*t);};
const polar=(radius:number,angle:number):SolarPoint=>({x:SOLAR_SECTION.x+radius*Math.cos(angle),y:SOLAR_SECTION.y+radius*Math.sin(angle)});

/** All radiation samples stay within the radiative annulus. A bent sequence is
 * a transfer key, not a measured photon's path or a propagation-speed model. */
export function solarRadiationPaths(){
 return [-1.02,-.42,.26,.90].map((angle,lane)=>Array.from({length:10},(_,step)=>polar(55+step*8,angle+.105*Math.sin(step*2.1+lane))));
}
/** Hot material rises, spreads/cools near the outer edge and returns inward.
 * The closed annular cells never enter the core or radiative zone. */
export function solarConvectionCells(){
 return [-1.02,-.36,.36,1.02].map(angle=>Array.from({length:33},(_,step)=>{
  const phase=step/32*Math.PI*2;
  return polar(157-19*Math.cos(phase),angle+.09*Math.sin(phase));
 }));
}
export function solarTransferPosition(time:number,lane:number){return ((Math.max(0,finite(time))*.22+lane*.23)%1);}

export const FLARE_DURATION=12;
export type FlareStage='stored'|'reconnecting'|'release'|'fading'|'after';
export function clampFlareTime(time:number){return Math.max(0,Math.min(FLARE_DURATION,finite(time)));}
/** One finite event, sampled from the existing surface clock. Returning to a
 * chapter or changing reading depth does not create a new event. */
export function solarFlare(time:number){
 const t=clampFlareTime(time),connection=smooth(2.5,4.8,t);
 const stage:FlareStage=t<2.5?'stored':t<4.8?'reconnecting':t<5.7?'release':t<9.5?'fading':'after';
 return {time:t,stage,connection,before:1-connection,after:connection,
  release:smooth(4.25,4.8,t)*(1-smooth(5.5,9.5,t)),
  stress:smooth(0,2.5,t)*(1-.72*connection),ended:t>=FLARE_DURATION,
  beforeConnections:[[0,1],[1,0]] as const,afterConnections:[[0,0],[1,1]] as const};
}
export function advanceSolarFlare(time:number,elapsed:number,visible:boolean){
 return clampFlareTime(clampFlareTime(time)+(visible?Math.max(0,finite(elapsed)):0));
}
