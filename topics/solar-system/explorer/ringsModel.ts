/** Selected main ring boundaries, rounded km from Saturn's center.
 * NASA PDS Ring-Moon Systems Node: /saturn/saturn_tables.html (French et al. 2017).
 * The Cassini Division is low-density, not empty. Fine ringlets are schematic. */
export const SATURN_RADIUS_KM=60268;
export const SATURN_GM=37931206.23; // km³/s², JPL SAT441 planet GM (not whole-system GM).
export const RING_BANDS=[
  {id:'c',inner:74491,outer:91975,color:'#928b7e',opacity:.42},
  {id:'b',inner:91975,outer:117500,color:'#e3d6b6',opacity:.94},
  {id:'cassini',inner:117500,outer:122050,color:'#807767',opacity:.13},
  {id:'a',inner:122050,outer:136770,color:'#c8baa0',opacity:.75},
  {id:'f',inner:139826,outer:140612,color:'#d3c9b5',opacity:.6},
] as const;
export const RING_VIEWS=['bands','gap','particles','motion'] as const;
export type RingView=typeof RING_VIEWS[number];
export function ringView(progress:number):RingView{return RING_VIEWS[Math.round(Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0))*3)]!;}
export const ringPeriodHours=(radiusKm:number)=>Math.PI*2*Math.sqrt(radiusKm**3/SATURN_GM)/3600;
export function ringPosition(radiusKm:number,hours:number,phase=0):[number,number,number]{
  const angle=phase+hours/ringPeriodHours(radiusKm)*Math.PI*2,r=radiusKm/SATURN_RADIUS_KM;
  return [Math.cos(angle)*r,0,Math.sin(angle)*r];
}
/** A local frame co-orbiting with the patch center: differential rotation shears
 * particle rows. This excludes collisions, self-gravity wakes and moon perturbations. */
export function localRingParticle(index:number,time:number):[number,number,number]{
  const hash=(n:number)=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
  const x=(hash(index+1)-.5)*6;
  const initial=(hash(index+907)-.5)*7;
  const along=((initial-x*time*.045+3.5)%7+7)%7-3.5;
  return [x,(hash(index+231)-.5)*.16,along];
}
export function legacySaturnMoonTarget(search:string){
  const old=new URLSearchParams(search),next=new URLSearchParams({body:'saturn',view:'moons'});
  next.set('lang',old.get('lang')==='en'?'en':'zh');
  return `/topics/solar-system/?${next}`;
}
