/** Planar Newtonian point masses, G = 1. No softening or prescribed trajectories. */
export interface Body { mass: number; x: number; y: number; vx: number; vy: number }
export type Preset = 'eight' | 'triangle' | 'wander';
export interface Experiment { preset: Preset; massC: number; xC: number; vxC: number }
export const DEFAULT_EXPERIMENT: Experiment = { preset: 'eight', massC: 1, xC: 0, vxC: 0 };
/** A screened, deterministic departure from the equal-mass Lagrange triangle. */
export const WANDER_SHIFT = Object.freeze({ x: .03426792833954096, vx: -.0018351049721240997 });
export const DURATION = 20, STEP = .001, SAMPLE = .02, CLOSE_DISTANCE = .04, PERTURBATION = .0001;
export const STRIDE = 19, MAX_FRAMES = 1001;
export type StopReason = 'complete' | 'close-encounter' | 'accuracy-limit';
export interface Trajectory {
  values: Float64Array; count: number; masses: number[]; initial: Body[];
  reason: StopReason; stopTime: number; step: number;
  offset?: number;
}
export interface Diagnostics { energy: number; px: number; py: number; cx: number; cy: number; angular: number; minDistance: number; energyScale: number }

function finite(value: number, min: number, max: number) { if (!Number.isFinite(value) || value < min || value > max) throw new RangeError('Invalid three-body parameter'); }
export function validateBodies(bodies: readonly Body[]) {
  if (bodies.length !== 3) throw new RangeError('Exactly three bodies required');
  for (const b of bodies) { finite(b.mass, .1, 10); for (const v of [b.x,b.y,b.vx,b.vy]) finite(v,-100,100); }
  for(let i=0;i<3;i++) for(let j=i+1;j<3;j++) if(Math.hypot(bodies[i]!.x-bodies[j]!.x,bodies[i]!.y-bodies[j]!.y)===0) throw new RangeError('Coincident initial bodies');
}
export function recenter(bodies: readonly Body[]): Body[] {
  const mass=bodies.reduce((s,b)=>s+b.mass,0);
  const mean=(key:'x'|'y'|'vx'|'vy')=>bodies.reduce((s,b)=>s+b.mass*b[key],0)/mass;
  const x=mean('x'),y=mean('y'),vx=mean('vx'),vy=mean('vy');
  return bodies.map(b=>({...b,x:b.x-x,y:b.y-y,vx:b.vx-vx,vy:b.vy-vy}));
}
export function initialConditions(experiment: Experiment, perturbation=0): Body[] {
  if(experiment.preset!=='eight'&&experiment.preset!=='triangle'&&experiment.preset!=='wander') throw new RangeError('Unknown preset');
  finite(experiment.massC,.5,2);finite(experiment.xC,-.3,.3);finite(experiment.vxC,-.3,.3);finite(perturbation,0,PERTURBATION);
  // Montgomery's published initial conditions (C. Simó); velocities select this time direction.
  const bodies: Body[]=experiment.preset==='eight' ? [
    {mass:1,x:-.97000436,y:.24308753,vx:-.466203685,vy:-.43236573},
    {mass:1,x:.97000436,y:-.24308753,vx:-.466203685,vy:-.43236573},
    {mass:1,x:0,y:0,vx:.93240737,vy:.86473146},
  ] : [0,1,2].map(i=>{const a=i*2*Math.PI/3,w=Math.sqrt(1/Math.sqrt(3));return {mass:1,x:Math.cos(a),y:Math.sin(a),vx:-w*Math.sin(a),vy:w*Math.cos(a)};});
  const shift=experiment.preset==='wander'?WANDER_SHIFT:{x:0,vx:0};
  bodies[2]!.mass=experiment.massC;bodies[2]!.x+=shift.x+experiment.xC+perturbation;bodies[2]!.vx+=shift.vx+experiment.vxC;
  return recenter(bodies);
}
export function diagnostics(bodies: readonly Body[]): Diagnostics {
  let kinetic=0,potential=0,px=0,py=0,cx=0,cy=0,mass=0,angular=0,minDistance=Infinity;
  for(const b of bodies){kinetic+=.5*b.mass*(b.vx*b.vx+b.vy*b.vy);px+=b.mass*b.vx;py+=b.mass*b.vy;cx+=b.mass*b.x;cy+=b.mass*b.y;mass+=b.mass;angular+=b.mass*(b.x*b.vy-b.y*b.vx);}
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const a=bodies[i]!,b=bodies[j]!,r=Math.hypot(a.x-b.x,a.y-b.y);minDistance=Math.min(minDistance,r);potential-=a.mass*b.mass/r;}
  return {energy:kinetic+potential,energyScale:kinetic+Math.abs(potential),px,py,cx:cx/mass,cy:cy/mass,angular,minDistance};
}
function acceleration(bodies: readonly Body[]) {
  const a=new Float64Array(6);
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
    const p=bodies[i]!,q=bodies[j]!,x=q.x-p.x,y=q.y-p.y,r=Math.hypot(x,y),factor=1/(r*r*r);
    a[2*i]!+=q.mass*x*factor;a[2*i+1]!+=q.mass*y*factor;
    a[2*j]!-=p.mass*x*factor;a[2*j+1]!-=p.mass*y*factor;
  }
  return a;
}
function resolved(bodies: readonly Body[],step:number,previous?:readonly Body[]) {
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
    const a=bodies[i]!,b=bodies[j]!;let r=Math.hypot(a.x-b.x,a.y-b.y);
    // The drift is linear with half-step velocities. Check its whole segment, not just endpoints.
    if(previous){const x=previous[i]!.x-previous[j]!.x,y=previous[i]!.y-previous[j]!.y,dx=a.x-b.x-x,dy=a.y-b.y-y;
      const f=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));r=Math.min(r,Math.hypot(x+f*dx,y+f*dy));}
    if(r<CLOSE_DISTANCE||step>.03*Math.sqrt(r*r*r/(a.mass+b.mass)))return false;
  }
  return true;
}
/** A bounded incremental job. advance() never yields a partial Verlet step. */
export function createIntegration(initial: readonly Body[], options: {step?:number; duration?:number; continuous?:boolean}={}) {
  validateBodies(initial);
  const step=options.step??STEP,duration=options.duration??DURATION;
  finite(step,.00025,.005);finite(duration,SAMPLE,DURATION);
  const every=Math.round(SAMPLE/step),steps=Math.round(duration/step);
  if(Math.abs(every*step-SAMPLE)>1e-12||Math.abs(steps*step-duration)>1e-12)throw new RangeError('Step must divide sample interval and duration');
  let bodies=initial.map(b=>({...b})),n=0,done=false;
  const origin=diagnostics(bodies),denominator=Math.max(Math.abs(origin.energy),1e-8*origin.energyScale);
  const trajectory: Trajectory={values:new Float64Array(MAX_FRAMES*STRIDE),count:0,masses:initial.map(b=>b.mass),initial:initial.map(b=>({...b})),reason:'complete',stopTime:0,step};
  function store(d:Diagnostics){
    if(trajectory.count===MAX_FRAMES){trajectory.offset=((trajectory.offset??0)+1)%MAX_FRAMES;trajectory.count--;}
    const o=((trajectory.offset??0)+trajectory.count++)%MAX_FRAMES*STRIDE,v=trajectory.values,t=n*step;v[o]=t;bodies.forEach((b,i)=>v.set([b.x,b.y,b.vx,b.vy],o+1+4*i));v.set([d.energy,Math.abs(d.energy-origin.energy)/denominator,Math.hypot(d.px-origin.px,d.py-origin.py),Math.hypot(d.cx-origin.cx-origin.px/initial.reduce((s,b)=>s+b.mass,0)*t,d.cy-origin.cy-origin.py/initial.reduce((s,b)=>s+b.mass,0)*t),d.minDistance,Math.abs(d.angular-origin.angular)],o+13);}
  store(origin);
  if(!resolved(bodies,step)){done=true;trajectory.reason='close-encounter';}
  function advance(budget=200) {
    finite(budget,1,1000);
    for(let k=0;k<Math.floor(budget)&&!done;k++){
      const a=acceleration(bodies),next=bodies.map((b,i)=>({...b,vx:b.vx+.5*step*a[2*i]!,vy:b.vy+.5*step*a[2*i+1]!}));
      for(const b of next){b.x+=step*b.vx;b.y+=step*b.vy;}
      if(!resolved(next,step,bodies)){trajectory.reason='close-encounter';done=true;break;}
      const a2=acceleration(next);next.forEach((b,i)=>{b.vx+=.5*step*a2[2*i]!;b.vy+=.5*step*a2[2*i+1]!;});
      const d=diagnostics(next);
      if(!Number.isFinite(d.energy)||Math.abs(d.energy-origin.energy)/denominator>.001){trajectory.reason='accuracy-limit';done=true;break;}
      bodies=next;n++;trajectory.stopTime=n*step;if(n%every===0)store(d);
      if(!options.continuous&&n>=steps)done=true;
    }
    return done;
  }
  return {trajectory,advance,get done(){return done;},get progress(){return n/steps;}};
}
export function integrate(initial: readonly Body[],options?:{step?:number;duration?:number}):Trajectory {const job=createIntegration(initial,options);while(!job.advance()){}return job.trajectory;}
export function frameAt(trajectory:Trajectory,index:number) {if(!Number.isFinite(index))throw new RangeError('Invalid frame');const i=((trajectory.offset??0)+Math.max(0,Math.min(trajectory.count-1,Math.round(index))))%MAX_FRAMES;return trajectory.values.subarray(i*STRIDE,(i+1)*STRIDE);}

/** Live pair with bounded history; guards retain the original (not a periodically reset) energy. */
export function createLiveComparison(experiment:Experiment){
  const a=createIntegration(initialConditions(experiment),{continuous:true});
  const b=createIntegration(initialConditions(experiment,PERTURBATION),{continuous:true});
  const result={base:a.trajectory,perturbed:b.trajectory,count:1};
  return {result,get done(){return a.done||b.done;},advance(steps:number){
    finite(steps,1,100);
    for(let i=0;i<Math.floor(steps)&&!a.done&&!b.done;i++){a.advance(1);b.advance(1);}
    // A guard may reject a sampling step in just one run. Compare only matching timestamps.
    const first=Math.max(frameAt(result.base,0)[0]!,frameAt(result.perturbed,0)[0]!);
    for(const t of [result.base,result.perturbed])while(t.count>1&&frameAt(t,0)[0]!<first-1e-9){t.offset=((t.offset??0)+1)%MAX_FRAMES;t.count--;}
    result.count=Math.min(result.base.count,result.perturbed.count);
    return a.done||b.done;
  }};
}
export function separation(a:Float64Array,b:Float64Array){let sum=0;for(let i=0;i<3;i++){const j=1+4*i;sum+=(a[j]!-b[j]!)**2+(a[j+1]!-b[j+1]!)**2;}return Math.sqrt(sum/3);}
