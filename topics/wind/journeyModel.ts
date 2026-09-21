import type { World } from './session.ts';
export type RouteStage = 0 | 1 | 2;
export interface RoutePoint { x:number; y:number; stage:RouteStage; opacity:number }
type Point = [number,number];
const bezier=(p:Point[],u:number):Point=>{
  const v=1-u;
  return [v*v*v*p[0][0]+3*v*v*u*p[1][0]+3*v*u*u*p[2][0]+u*u*u*p[3][0],v*v*v*p[0][1]+3*v*v*u*p[1][1]+3*v*u*u*p[2][1]+u*u*u*p[3][1]];
};
const curves:Record<World,Point[][]>={
  coast:[[[100,145],[200,145],[320,145],[400,145]],[[400,145],[490,145],[490,42],[400,42]],[[400,42],[80,0],[20,125],[100,145]]],
  typhoon:[[[55,150],[140,160],[220,130],[290,145]],[[290,145],[270,100],[330,75],[330,42]],[[330,42],[390,16],[475,32],[545,22]]],
  tornado:[[[55,160],[170,178],[220,140],[292,152]],[[292,152],[330,140],[285,64],[320,42]],[[320,42],[380,27],[465,22],[545,22]]]
};
/** Side-view teaching routes, not weather trajectories. Only the coast route is closed. */
export function guidePoint(world:World,phase:number,heat=1):RoutePoint{
  const u=Math.max(0,Math.min(1,phase)),stage=Math.min(2,Math.floor(u*3)) as RouteStage,local=u===1?1:u*3-stage;
  const p=bezier(curves[world][stage],local);
  if(world==='tornado'&&stage===1)p[0]+=Math.sin(local*Math.PI*8)*Math.sin(local*Math.PI)*14;
  if(world==='coast'&&heat<0)p[0]=560-p[0];
  const opacity=world==='coast'?1:Math.min(1,u/.04,(1-u)/.04);
  return {x:p[0],y:p[1],stage,opacity};
}
export function guidePhase(world:World,time:number,coastPhase:number){return ((world==='coast'?coastPhase:time/12)%1+1)%1;}
export const journeyOrder:World[]=['coast','typhoon','tornado'];
