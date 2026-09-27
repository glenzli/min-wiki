import {clamp,EARTH_RADIUS_KM,SUN_RADIUS_KM,AU_KM,ORBIT_RADII_AU} from './model.ts';
export type Chapter='compare'|'homes'|'zoom';
/** Stable URL identities for structure diagrams; indices 3 and 5 remain valid side-view links. */
export const homeStops=['solar-system','milky-way','local-group','nearby-clusters','supercluster','cosmic-web','observable-universe'] as const;
/** A journey through our location, excluding sibling comparisons and a distribution pattern. */
export const homeRoute=[0,1,2,4,6] as const;
export const homeSideViews=[3,5] as const;
export const homeContext=(home:number)=>home===3?4:home===5?6:home;
export const homeRoutePosition=(home:number)=>homeRoute.indexOf(homeContext(home) as typeof homeRoute[number]);
export const stepHomeRoute=(home:number,change:number)=>homeRoute[Math.max(0,Math.min(homeRoute.length-1,homeRoutePosition(home)+change))]!;
export const bodies=[{id:'earth',radius:EARTH_RADIUS_KM},{id:'jupiter',radius:69911},{id:'sun',radius:SUN_RADIUS_KM},{id:'arcturus',radius:25.4*SUN_RADIUS_KM},{id:'antares',radius:700*SUN_RADIUS_KM},{id:'vy-canis-majoris',radius:1420*SUN_RADIUS_KM},{id:'stephenson-2-18',radius:2150*SUN_RADIUS_KM}] as const;
/** Dated estimates, not a current record ranking. St2-18 is conditional on the 2012 L/temperature fit. */
export const stellarEstimateSources:Record<string,string>={
 'arcturus':'https://arxiv.org/abs/1109.4425','antares':'https://www.eso.org/public/news/eso1726/',
 'vy-canis-majoris':'https://arxiv.org/abs/1203.5194',
 'stephenson-2-18':'https://arxiv.org/html/1209.6427',
};
/** Rounded mean orbital radii, shared with the existing physical zoom; circles are illustrative. */
export const COMPARISON_ORBITS_AU=ORBIT_RADII_AU.slice(0,6);
export function stellarOrbitFrame(bodyIndex:number,width:number,height:number){
 const body=bodies[Math.round(clamp(bodyIndex,2,bodies.length-1))]!;
 const pixelsPerKm=Math.max(1,Math.min(width*.43,(height-42)/2))/(11*AU_KM);
 return {body,pixelsPerKm,radius:body.radius*pixelsPerKm,orbits:COMPARISON_ORBITS_AU.map(au=>({au,radius:au*AU_KM*pixelsPerKm,inside:au*AU_KM<body.radius}))};
}
export const lastPair=bodies.length-2;
export function readExploration(query:string){const p=new URLSearchParams(query),mode=p.get('mode'),pair=Number(p.get('pair')??0);return {chapter:(['compare','homes','zoom'].includes(mode??'')?mode:p.has('scale')||p.has('origin')?'zoom':'compare') as Chapter,pair:clamp(p.get('pairVersion')==='2'?pair:pair>=5?lastPair:pair,0,lastPair),home:Math.round(clamp(Number(p.get('home')??0),0,homeStops.length-1))};}
/** One common linear diameter scale at every intermediate frame. Positions are a comparison layout, not orbital distances. */
export function comparisonFrame(progress:number,width:number,height=390){const q=clamp(progress,0,lastPair),i=Math.min(lastPair-1,Math.floor(q)),t=q-i,maxRadius=bodies[i+1]!.radius*(bodies[i+2]!.radius/bodies[i+1]!.radius)**t,unit=Math.min(155,width*.23,Math.max(1,height-44)*.47)/maxRadius;return bodies.map((b,j)=>{let x=width*(.25+.49*(j-q));if(j>q+1&&j>0)x=Math.max(x,width*(.25+.49*(j-1-q))+(bodies[j-1]!.radius+b.radius)*unit+width*.04);return {id:b.id,x,radius:b.radius*unit,opacity:clamp(1-Math.max(0,Math.abs(j-q-.5)-.5))};});}
