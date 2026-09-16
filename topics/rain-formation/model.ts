export interface Settings { route: 'warm' | 'ice'; humidity: number; }
export const MIN_DROP_RADIUS=.001;
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
 return {stage:p<.22?0:p<.46?1:p<.72?2:3,cloud:smooth(.1,.36,p),growth,fall,radiusMm,remainingRadiusMm,ice:settings.route==='ice'&&p<.76&&p>.4,reachesGround:p>=.98&&remainingRadiusMm>MIN_DROP_RADIUS};
}

/** A small representative population; the inset changes scale, not molecular size. */
export function cloudStudy(progress:number){
 const p=clamp(progress),condensation=smooth(.08,.32,p),zoom=smooth(.28,.42,p);
 // Arrival and absorption are separate events. A remote droplet must not lose
 // water into the collector before the two surfaces actually touch.
 const approaches=Array.from({length:4},(_,i)=>smooth(.39+i*.065,.427+i*.065,p));
 const transfers=Array.from({length:4},(_,i)=>smooth(.427+i*.065,.455+i*.065,p));
 const smallRadius=7;
 const offsets=[[-59,-53],[58,-53],[-64,51],[61,51]];
 const positions=offsets.map(([x,y],i)=>{
  const length=Math.hypot(x!,y!),contactDistance=smallRadius*(1+Math.cbrt(i+1));
  const distance=(length+(contactDistance-length)*approaches[i]!)*(1-transfers[i]!);
  return {x:x!/length*distance,y:y!/length*distance};
 });
 return {condensation,zoom,approaches,transfers,positions, radius:Math.cbrt(smallRadius**3*(1+transfers.reduce((a,b)=>a+b,0))),
  remaining:transfers.map(f=>smallRadius*Math.cbrt(1-f)),melt:smooth(.69,.8,p)};
}

/** One precipitation cohort: no modulo clock, recycling or upward reset. */
export function rainParticle(progress:number,index:number,humidity:number){
 const seed=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
 const birth=.66+index/55*.135,duration=.16+seed(index+13)*.042;
 const age=clamp((progress-birth)/duration),radius=evaporatedRadius(.7,humidity,age*30);
 const outcome=progress<birth?'unborn':radius<=MIN_DROP_RADIUS?'evaporated':age>=1?'landed':'falling';
 const groundY=182+seed(index+914)*10;
 return {birth,age,x:-287+seed(index+451)*292+age*7,y:-50+age*(groundY+50),groundY,radius,outcome,
  afterLanding:Math.max(0,progress-birth-duration),melt:smooth(.24,.36,age)};
}
