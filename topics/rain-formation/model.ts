export interface Settings { route: 'warm' | 'ice'; humidity: number; }
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,x:number)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
/** Liquid volume conservation, with radii expressed in the same unit. */
export function mergedRadius(radii:number[]){return Math.cbrt(radii.reduce((volume,r)=>volume+Math.max(0,r)**3,0));}
export function equivalentCloudDrops(radiusMm:number,cloudRadiusMm=.01){return (Math.max(0,radiusMm)/cloudRadiusMm)**3;}
/** Illustrative r² evaporation law; coefficient is chosen for a visible comparison, not calibrated weather. */
export function evaporatedRadius(radiusMm:number,humidity:number,seconds:number){return Math.sqrt(Math.max(0,radiusMm**2-.028*(1-clamp(humidity/100))*Math.max(0,seconds)));}
export function rainState(progress:number,settings:Settings){
 const p=clamp(progress),growth=smooth(.36,.67,p),fall=smooth(.67,1,p),radiusMm=.01+.69*growth;
 const remainingRadiusMm=evaporatedRadius(radiusMm,settings.humidity,fall*30);
 return {stage:p<.22?0:p<.46?1:p<.72?2:3,cloud:smooth(.1,.36,p),growth,fall,radiusMm,remainingRadiusMm,ice:settings.route==='ice'&&p<.76&&p>.4,reachesGround:p>=.98&&remainingRadiusMm>.03};
}
