export type CellKind = 'barrier' | 'muscle' | 'neuron';
export const clamp = (v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export type MuscleMode = 'shortening' | 'isometric';
export type MuscleOptions = { mode: MuscleMode; load: number };
export const DEFAULT_MUSCLE: MuscleOptions = { mode: 'shortening', load: .35 };
export const FORCE_ARROW_SCALE = 70;
export type MuscleViewport = { x:number; y:number; width:number; height:number };
/** Quasi-static teaching apparatus, in screen lengths and relative force units.
 * An effective tensile element changes its reference length with activation.
 * These constants are chosen for inspection, not fitted physiological values. */
export const MUSCLE_APPARATUS = {
  left: 185, leftAnchor: 130, springAnchor: 910, tendonLength: 26,
  restLength: 540, shorteningDrive: 110, muscleStiffness: .008,
  springRestLength: 48, softSpring: .002, stiffnessRange: .012,
} as const;
export function muscleState(progress:number, options:MuscleOptions = DEFAULT_MUSCLE) {
  const p=clamp(progress), activation=Math.sin(Math.PI*p)**2, load=clamp(options.load);
  const mode:MuscleMode=options.mode==='isometric'?'isometric':'shortening';
  const a=MUSCLE_APPARATUS, springStiffness=a.softSpring+a.stiffnessRange*load;
  const springReference=a.springAnchor-a.tendonLength-a.springRestLength;
  const preferredLength=a.restLength-a.shorteningDrive*activation;
  const equilibrium=(reference:number)=>(a.muscleStiffness*(a.left+reference)+springStiffness*springReference)/(a.muscleStiffness+springStiffness);
  const restRight=equilibrium(a.restLength), right=mode==='isometric'?restRight:equilibrium(preferredLength);
  const length=right-a.left, junction=right+a.tendonLength;
  const springLength=a.springAnchor-junction;
  const tension=a.muscleStiffness*(length-preferredLength);
  const springForce=springStiffness*(springLength-a.springRestLength);
  // A locked endpoint needs the clamp reaction in addition to the spring force.
  const clampForce=mode==='isometric'?Math.max(0,tension-springForce):0;
  return { activation, mode, load, left:a.left, right, length, restRight,
    restLength:restRight-a.left, preferredLength, junction, springLength,
    springStiffness, tension, springForce, clampForce,
    shortening:restRight-right, filamentLength:178,
    sarcomereSpan:length*.74, phase:activation<.02?'rest':p<=.5?'pull':'return',
  };
}
/** A camera over the existing apparatus, including all junction-force endpoints. */
export function muscleForceViewport(state:ReturnType<typeof muscleState>):MuscleViewport {
  const x=Math.min(state.right-35,state.junction-state.tension*FORCE_ARROW_SCALE-14);
  const end=Math.max(MUSCLE_APPARATUS.springAnchor+18,
    state.junction+Math.max(state.springForce,state.clampForce)*FORCE_ARROW_SCALE+14);
  return { x,y:76,width:end-x,height:274 };
}
export function nerveSignal(progress:number) {
  const p=clamp(progress);
  return { x:251+604*Math.min(1,p/.8), transmitter:clamp((p*100-80)/10), response:clamp((p*100-90)/10) };
}
export function barrierParticle(index:number,progress:number) {
  const p=clamp(progress),x=154+index*88;
  // The intact, multilayer surface blocks these external particles; they never pass through the skin.
  return {x:x+Math.sin(p*Math.PI)*24,y:82+Math.min(.6,p)/.6*(90+index%2*9),blocked:p>=.6};
}
