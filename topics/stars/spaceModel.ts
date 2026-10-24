import {evolutionState, type Track} from './evolutionModel.ts';
import type {Illumination, NebulaKind, NebulaReference} from './nebulaModel.ts';

export const SPACE_PARTICLES = 2800;
export type SpaceInput = {
  chapter: 'evolution' | 'nebulae';
  track: Track;
  progress: number;
  nebula: NebulaKind;
  illumination: Illumination;
  reference?: NebulaReference;
};
export interface SpaceFrame {
  evolving: boolean;
  cloudReference?: NebulaReference;
  kind: 'formation' | 'star' | 'planetary' | 'supernova';
  phase: number;
  starRadius: number;
  coreRadius: number;
  envelopeRadius: number;
  starColor: string;
  starOpacity: number;
  surfaceProfile: 'solar' | 'red-giant' | 'red-dwarf' | 'compact';
  emission: number;
  glare: number;
  compactBlend: number;
  coolingProgress: number;
  cloudOpacity: number;
  shellOpacity: number;
  shellBlend: number;
  shellEmission: number;
  blackHoleBlend: number;
  shellRadius: number;
  shellFlattening: number;
  diskOpacity: number;
  jetOpacity: number;
  compact: boolean;
  blackHole: boolean;
  illumination: Illumination;
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {const p = clamp(v); return p*p*(3-2*p);};
export const spaceRandom = (n: number) => {const x=Math.sin(n*127.13+8.37)*43758.5453; return x-Math.floor(x);};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;

/** All lengths below are recognition units. There is deliberately no conversion
 * to kilometres, AU, or years: those belong to the labeled comparison view. */
export function stellarSpaceFrame(input: SpaceInput): SpaceFrame {
  if (input.chapter === 'nebulae') {
    const nursery = input.nebula === 'nursery', planetary = input.nebula === 'planetary';
    return {evolving:false,cloudReference:nursery?(input.reference??'orion'):undefined,kind:nursery?'formation':planetary?'planetary':'supernova', phase:nursery?0:6,
      starRadius:nursery?.27:planetary?.16:.11,coreRadius:planetary?.16:.11,envelopeRadius:nursery?.27:planetary?.16:.11, starColor:nursery?'#d8e7ff':'#e4f5ff', starOpacity:input.illumination==='dark'&&nursery?0:1,
      surfaceProfile:nursery?'solar':'compact',emission:1,glare:nursery?1:.8,compactBlend:nursery?0:1,coolingProgress:0,
      cloudOpacity:nursery?1:0, shellOpacity:nursery?0:1,shellBlend:nursery?0:1,shellEmission:1,blackHoleBlend:0, shellRadius:planetary?2.35:2.65,
      shellFlattening:planetary?1.34:.92, diskOpacity:0, jetOpacity:0,compact:!nursery,blackHole:false,illumination:input.illumination};
  }
  const state=evolutionState(input.track,input.progress),phase=state.phaseCoordinate,low=input.track==='low-mass',solar=input.track==='solar',mainRadius=low?.65:solar?.95:1.22;
  const formation=smooth(phase/1.65), expansion=smooth(phase-3), release=smooth((phase-(solar?4.76:low?4.65:5.02))/(solar?1.04:low?1:.10));
  const giantRadius=low?.9:solar?2.1:2.35, compact=state.compactBlend>=.5,tail=smooth(state.remnantProgress);
  const coreRadius=low?.14:state.remnant==='neutron-star'?.11:state.remnant==='black-hole'?.16:.18;
  // The solar photosphere can contract during helium burning, expand again on
  // the AGB, then uncover its hot core. Ejected matter never uses this shrinking
  // radius: it retains the former envelope and moves outwards independently.
  const solarRadius=(r:number)=>r<=1?mix(.18,.95,clamp(Math.log(Math.max(.01,r)/.01)/Math.log(100))):mix(.95,2.1,clamp(Math.log(r)/Math.log(180)));
  const starRadius=phase<2?mix(.04,mainRadius,formation):phase<4?mix(mainRadius,giantRadius,expansion):solar?solarRadius(state.radiusSolar):mix(giantRadius,coreRadius,release);
  const onset=solar?4.58:5.02,shellBlend=low?0:smooth((phase-onset)/(solar?1:.68));
  const blackHoleBlend=state.remnant==='black-hole'?smooth((phase-5.35)/.3):0,blackHole=blackHoleBlend>0;
  return {evolving:true,kind:phase<2?'formation':phase>=onset&&!low?(solar?'planetary':'supernova'):'star',phase,starRadius,coreRadius,envelopeRadius:!low&&phase>=onset?giantRadius:starRadius,starColor:state.surfaceColor,
    surfaceProfile:state.surfaceProfile,emission:state.emission,glare:state.glare,compactBlend:state.compactBlend,coolingProgress:state.coolingProgress,
    starOpacity:smooth(phase/.6),cloudOpacity:1-smooth((phase-1)/.9),shellOpacity:shellBlend*state.shellVisibility,shellBlend,
    shellEmission:solar?smooth((phase-5.02)/.6):1,blackHoleBlend,
    shellRadius:mix(giantRadius,3.3,smooth((phase-onset)/(6-onset)))+tail*.6,shellFlattening:solar?1.28:1,
    diskOpacity:smooth((phase-.2)/.6)*(1-smooth((phase-1.3)/.7)),jetOpacity:smooth((phase-.55)/.5)*(1-smooth((phase-1.35)/.65)),
    compact,blackHole,illumination:'emission'};
}

/** Camera magnification only: world geometry and the experiment snapshot stay
 * unchanged. The square-root close view retains the order of stellar radii;
 * cloud/outflow and late shells get wider framing instead of being cropped. */
export function stellarObservationZoom(input: SpaceInput, aspect: number): number {
  const viewAspect = Number.isFinite(aspect) ? aspect : 1;
  const narrow = Math.min(1, Math.max(.3, viewAspect / 1.2));
  // The uneven nursery spans farther sideways than either round shell. Retain
  // its illuminated outer cloud when the same tall stage becomes phone-width.
  if (input.chapter === 'nebulae') return input.nebula === 'nursery' ? (input.reference&&input.reference!=='orion'?.88:.98)*narrow : narrow;
  const frame = stellarSpaceFrame(input), stellar = Math.max(1.2, Math.min(3, 2.2 * Math.sqrt(.95 / Math.max(.04, frame.starRadius))));
  const formation = mix(1.2, stellar, smooth((frame.phase - 1) / .95));
  // Widen before a clearly visible jet reaches full opacity: the near polar
  // tip projects larger than the far tip in this oblique perspective view.
  const outflowContext = smooth(frame.jetOpacity / .35);
  const withoutClippedOutflow = Math.min(formation, mix(3, .94, outflowContext));
  const solar=input.track==='solar';
  const shellContext = input.track === 'low-mass' ? 0 : smooth((frame.phase - (solar?4.45:4.9)) / (solar?.7:.55));
  // Once matter starts leaving, retain the giant's camera reference. Following
  // the shrinking central radius here would zoom into the expanding ejecta.
  const hold=input.track==='low-mass'?0:smooth((frame.phase-(solar?4.45:4.9))/.08);
  const enclosing=mix(withoutClippedOutflow,Math.min(withoutClippedOutflow,solar?1.48:1.4),hold);
  // Clear the enclosing shell before magnifying the still-small central body.
  const lateClose=smooth((frame.coolingProgress-.5)/.5),context=mix(enclosing,solar?.60:.72,shellContext);
  return narrow * mix(context,5.2,lateClose);
}

/** Stable parcel identities in the same centered cloud/disk/envelope. The fields
 * are a reversible teaching composition, not integrated fluid trajectories. */
export function writeSpaceParticles(frame: SpaceFrame, position: Float32Array, alpha: Float32Array): void {
  const phase=frame.phase, collapse=smooth(phase/1.3), ontoStar=smooth((phase-1.3)/.7), shell=frame.shellBlend;
  const nursery=phase===0&&frame.kind==='formation';
  for(let i=0;i<alpha.length;i++){
    const r=spaceRandom(i+1),v=spaceRandom(i+734),u=spaceRandom(i+3851),angle=v*Math.PI*2,vertical=2*u-1;
    const cloudRadius=1+2.7*Math.cbrt(r),wave=.4*Math.sin(angle*3+vertical*5);
    const t=2*r-1,filamentWidth=(.24+.85*Math.exp(-((t+.2)**2)*7)+.48*Math.exp(-((t-.68)**2)*20))*Math.sqrt(u);
    // A broad diffuse component surrounds a bent, uneven filament. The denser
    // strand and its cavity stay fixed when only illumination is changed.
    const diffuse=i%5===0;
    const cloudX=diffuse?Math.cos(angle)*(cloudRadius+wave)*Math.sqrt(1-vertical*vertical):t*3.4+Math.cos(angle)*filamentWidth*.65;
    const cloudY=diffuse?vertical*cloudRadius*.62:.45*Math.sin(t*4)+Math.sin(angle)*filamentWidth*.75;
    const cloudZ=diffuse?Math.sin(angle)*cloudRadius*.75:.65*Math.sin(t*3)+Math.cos(angle+1.4)*filamentWidth;
    const diskR=.3+2.7*Math.sqrt(r),diskAngle=angle+collapse*1.1*(1-r);
    const diskX=Math.cos(diskAngle)*diskR,diskZ=Math.sin(diskAngle)*diskR,diskY=vertical*(.045+.11*r);
    const nx=Math.cos(angle)*Math.sqrt(1-vertical*vertical),nz=Math.sin(angle)*Math.sqrt(1-vertical*vertical);
    const irregular=1+.07*Math.sin(angle*9+vertical*13)+.035*Math.sin(angle*23-vertical*9);
    const envelopeR=frame.envelopeRadius*(.92+.08*r);
    // A parcel's shell destination is at least its original envelope radius.
    // This prevents a shrinking photosphere from pulling expelled gas inward.
    const shellR=frame.evolving?Math.max(envelopeR,frame.shellRadius*(.92+.16*r)*irregular):frame.shellRadius*(.84+.16*r)*irregular;
    const bodyR=mix(envelopeR,shellR,shell);
    const diskToStar=ontoStar;
    let x=mix(mix(cloudX,diskX,collapse),nx*envelopeR,diskToStar);
    let y=mix(mix(cloudY,diskY,collapse),vertical*envelopeR,diskToStar);
    let z=mix(mix(cloudZ,diskZ,collapse),nz*envelopeR,diskToStar);
    if(phase>=2){x=nx*bodyR;y=vertical*bodyR*mix(1,frame.shellFlattening,shell);z=nz*bodyR;}
    if(frame.kind==='planetary'||frame.kind==='supernova'){
      x=nx*bodyR;y=vertical*bodyR*mix(1,frame.shellFlattening,shell);z=nz*bodyR;
    }
    position[i*3]=x;position[i*3+1]=y;position[i*3+2]=z;
    const cavity=Math.hypot(cloudX-1.8,cloudY-.3,cloudZ)<.58?.12:1;
    const cloudAlpha=(diffuse?.11:.32+.48*spaceRandom(i+125))*cavity;
    alpha[i]=nursery?cloudAlpha:Math.max(frame.cloudOpacity*cloudAlpha,frame.shellOpacity*(.16+.7*spaceRandom(i+955)));
  }
}
