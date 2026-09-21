export type Obstacle = 'open' | 'hill' | 'house';
export const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
export const shoreline = (z:number) => -28+10*Math.sin(z*.025)+5*Math.sin(z*.066);
export const coastHeight = (x:number,z:number) => Math.max(0,Math.min(1,(x-shoreline(z))/24))*(2+7*Math.sin(x*.019+.5)**2+18*Math.exp(-(((z+104)/35)**2))*(1+.3*Math.sin(x*.06)));
/** Closed, prescribed teaching paths. Positive phase moves the lower branch from sea to land. */
export function airPoint(phase:number,lane:number,obstacle:Obstacle) {
  const theta=phase*Math.PI*2,x=Math.sin(theta)*(112+lane*5),z=(lane-1.5)*28;
  const bottom=(1+Math.cos(theta))/2,y=51-Math.cos(theta)*35;
  const deflection=obstacle==='open'?0:Math.exp(-(((x-42)/34)**2))*bottom*(obstacle==='house'?24:19)*Math.exp(-((z-10)**2)/1600);
  return {x,y:y+deflection,z};
}
