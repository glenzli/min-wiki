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

/** A small representative population; the inset changes scale, not molecular size. */
export function cloudStudy(progress:number){
 const p=clamp(progress),condensation=smooth(.08,.32,p),zoom=smooth(.28,.42,p);
 const transfers=Array.from({length:4},(_,i)=>smooth(.39+i*.035,.52+i*.045,p));
 const smallRadius=7;
 return {condensation,zoom,transfers, radius:Math.cbrt(smallRadius**3*(1+transfers.reduce((a,b)=>a+b,0))),
  remaining:transfers.map(f=>smallRadius*Math.cbrt(1-f)),melt:smooth(.69,.8,p)};
}
