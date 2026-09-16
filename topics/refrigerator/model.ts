/** Lumped, illustrative cabinet + food balance. No measured appliance or storage times. */
export type DoorPlan = 'closed' | 'visit';
export const ROOM = 24;
export const DURATION = 7200;
export const AIR_CAPACITY = 4000;
export const FOOD_CAPACITY = 6000;
export const clamp = (v:number) => Math.max(0,Math.min(1,v));
export const smooth = (a:number,b:number,v:number) => {const x=clamp((v-a)/(b-a));return x*x*(3-2*x);};
export interface ThermalState {time:number;air:number;food:number;on:boolean;door:number;removed:number;work:number;roomGain:number;leaked:number;runSeconds:number;activity:number;}
/** Positive means food releases heat to the surrounding cabinet air. */
export const foodHeatFlow=(s:Pick<ThermalState,'food'|'air'>)=>3*(s.food-s.air);
export const initialState=():ThermalState=>({time:0,air:8,food:18,on:true,door:0,removed:0,work:0,roomGain:0,leaked:0,runSeconds:0,activity:0});
export function doorAt(time:number,plan:DoorPlan){
 const p=time/DURATION;
 return plan==='closed'?0:smooth(.30,.32,p)*(1-smooth(.55,.57,p));
}
/** Explicit Euler with a bounded step. Internal food exchange cancels in total energy. */
export function advance(state:ThermalState,seconds:number,plan:DoorPlan):ThermalState{
 let s={...state},remaining=Math.max(0,seconds);
 while(remaining>1e-9){
  const dt=Math.min(2,remaining),door=doorAt(s.time+dt/2,plan);
  let on=s.on;if(s.air<=2)on=false;else if(s.air>=4)on=true;
  const leak=(2+33*door)*(ROOM-s.air),foodHeat=foodHeatFlow(s);
  const cooling=on?120:0,power=on?60:0;
  s={time:s.time+dt,air:s.air+(leak+foodHeat-cooling)*dt/AIR_CAPACITY,
   food:s.food-foodHeat*dt/FOOD_CAPACITY,on,door,
   removed:s.removed+cooling*dt,work:s.work+power*dt,roomGain:s.roomGain+(cooling+power)*dt,
   leaked:s.leaked+leak*dt,runSeconds:s.runSeconds+(on?dt:0),activity:s.activity+(Number(on)-s.activity)*(1-Math.exp(-dt/30))};
  remaining-=dt;
 }
 return s;
}
export function makeTimeline(plan:DoorPlan){
 const frames=[initialState()];for(let time=0;time<DURATION;time+=10)frames.push(advance(frames[frames.length-1]!,10,plan));return frames;
}
export function sampleTimeline(frames:ThermalState[],progress:number):ThermalState{
 const position=clamp(progress)*(frames.length-1),i=Math.floor(position),a=frames[i]!,b=frames[Math.min(i+1,frames.length-1)]!,f=position-i;
 const result={...a};for(const key of ['time','air','food','door','removed','work','roomGain','leaked','runSeconds','activity'] as const)result[key]=a[key]+(b[key]-a[key])*f;return result;
}
/** One parcel in a sealed operating cycle. Phase boundaries are illustrative. */
export function refrigerantState(progress:number){
 const p=clamp(progress),stage=Math.min(3,Math.floor(p*4));
 const vapor=p<.25?.15+.85*smooth(0,.25,p):p<.5?1:p<.75?1-smooth(.53,.73,p):.15*smooth(.84,.96,p);
 return {stage,vapor,highPressure:smooth(.28,.44,p)*(1-smooth(.79,.9,p))};
}

/** Coordinates of the same sealed tube drawn in every view. */
export type Point=readonly[number,number];
export const refrigerantPaths:Point[][]=[
 [[270,130],[430,130],[430,170],[265,170],[265,210],[430,210],[430,250],[265,250],[265,300]],
 [[265,300],[265,460],[515,460],[555,480],[575,505],[615,490]],
 [[615,490],[690,490],[690,350],[790,350],[790,300],[675,300],[675,250],[790,250],[790,200],[675,200],[675,145],[640,145]],
 [[640,145],[620,100],[555,100],[555,125],[530,125],[530,95],[505,95],[505,125],[480,125],[480,95],[455,95],[455,110],[270,110],[270,130]],
];
function onPath(points:Point[],fraction:number):Point{
 const lengths=points.slice(1).map((point,i)=>Math.hypot(point[0]-points[i]![0],point[1]-points[i]![1]));
 let distance=clamp(fraction)*lengths.reduce((a,b)=>a+b,0);
 for(let i=0;i<lengths.length;i++){
  if(distance<=lengths[i]!){const u=distance/lengths[i]!;return [points[i]![0]+u*(points[i+1]![0]-points[i]![0]),points[i]![1]+u*(points[i+1]![1]-points[i]![1])];}distance-=lengths[i]!;
 }
 return points[points.length-1]!;
}
export function parcelPosition(progress:number):Point{const p=clamp(progress),stage=Math.min(3,Math.floor(p*4));return onPath(refrigerantPaths[stage]!,p===1?1:p*4-stage);}
