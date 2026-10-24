/** Representative evolutionary tracks, not solutions of stellar structure equations. */
export type Track='low-mass'|'solar'|'massive'|'very-massive';
export type Phase='cloud'|'protostar'|'main'|'core-depletion'|'giant'|'release'|'remnant';
export const PHASES:readonly Phase[]=['cloud','protostar','main','core-depletion','giant','release','remnant'];
/** The first six legacy stops keep their URL positions. The final stretch now
 * observes the same remnant after formation, rather than ending at its birth. */
export const REMNANT_START=.9;
export const PHASE_PROGRESS:readonly number[]=[0,1/6,2/6,3/6,4/6,5/6,REMNANT_START];
export const RSUN_AU=0.00465047;
type Anchor={ageYears:number;radiusSolar:number;coreFuel:number};
export const TRACKS:Record<Track,{massSolar:number;remnant:'white-dwarf'|'neutron-star'|'black-hole';anchors:readonly Anchor[]}>= {
 // A theoretical distant-future branch: no isolated 0.2 M☉ star has yet
 // exhausted its hydrogen in the present-age Universe. It is not a giant track.
 'low-mass':{massSolar:.2,remnant:'white-dwarf',anchors:[
  {ageYears:0,radiusSolar:0,coreFuel:1},{ageYears:1e7,radiusSolar:.7,coreFuel:1},
  {ageYears:2e8,radiusSolar:.25,coreFuel:1},{ageYears:1e12,radiusSolar:.28,coreFuel:.2},
  {ageYears:2e12,radiusSolar:.8,coreFuel:.05},{ageYears:2.1e12,radiusSolar:.08,coreFuel:0},
  {ageYears:2.2e12,radiusSolar:.02,coreFuel:0}]},
 solar:{massSolar:1,remnant:'white-dwarf',anchors:[
  {ageYears:0,radiusSolar:0,coreFuel:1},{ageYears:1e6,radiusSolar:3,coreFuel:1},
  {ageYears:5e7,radiusSolar:1,coreFuel:1},{ageYears:1e10,radiusSolar:1.4,coreFuel:0},
  {ageYears:1.15e10,radiusSolar:180,coreFuel:0},{ageYears:1.18e10,radiusSolar:.8,coreFuel:0},
  {ageYears:1.18e10,radiusSolar:.01,coreFuel:0}]},
 massive:{massSolar:15,remnant:'neutron-star',anchors:[
  {ageYears:0,radiusSolar:0,coreFuel:1},{ageYears:1e4,radiusSolar:12,coreFuel:1},
  {ageYears:5e5,radiusSolar:6,coreFuel:1},{ageYears:1e7,radiusSolar:15,coreFuel:0},
  {ageYears:1.1e7,radiusSolar:700,coreFuel:0},{ageYears:1.11e7,radiusSolar:700,coreFuel:0},
  {ageYears:1.11e7,radiusSolar:12/695700,coreFuel:0}]},
 'very-massive':{massSolar:30,remnant:'black-hole',anchors:[
  {ageYears:0,radiusSolar:0,coreFuel:1},{ageYears:1e4,radiusSolar:15,coreFuel:1},
  {ageYears:3e5,radiusSolar:10,coreFuel:1},{ageYears:5e6,radiusSolar:24,coreFuel:0},
  {ageYears:5.5e6,radiusSolar:900,coreFuel:0},{ageYears:5.51e6,radiusSolar:900,coreFuel:0},
  {ageYears:5.51e6,radiusSolar:0,coreFuel:0}]},
};
export const clampProgress=(v:number)=>{const bounded=Number.isFinite(v)?Math.max(0,Math.min(1,v)):0,stop=[...PHASE_PROGRESS,1].find(value=>Math.abs(bounded-value)<1e-5);
 // URLs keep five decimal places; recover an explicitly selected phase on reload.
 return stop??bounded;
};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const smooth=(value:number)=>{const t=clamp(value);return t*t*(3-2*t);};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
/** Extra teaching stops inside the legacy giant→release interval. These are
 * rounded radii, not a solar-evolution calculation or calibrated phase ages.
 * Helium ignition is internal: it is not a surface explosion. */
const SOLAR_LATE_RADII:readonly (readonly [number,number])[]=[[4,180],[4.22,12],[4.58,180],[4.76,145],[5,.8],[5.8,.01],[6,.01]];
function solarLateRadius(phase:number){
 const after=SOLAR_LATE_RADII.findIndex(([stop])=>stop>phase),at=after<0?SOLAR_LATE_RADII.length-2:Math.max(0,after-1);
 const a=SOLAR_LATE_RADII[at]!,b=SOLAR_LATE_RADII[at+1]!;
 return mix(a[1],b[1],smooth((phase-a[0])/(b[0]-a[0])));
}
export function solarTransition(progress:number){
 const p=evolutionPosition(progress).phaseCoordinate;
 return p<4.04||p>=6?undefined:p<4.3?'helium':p<4.62?'agb':p<5.02?'wind':p<5.55?'heating':'ionized';
}
function colorMix(a:string,b:string,t:number){
 const channel=(hex:string,index:number)=>parseInt(hex.slice(index,index+2),16);
 return '#'+[1,3,5].map(index=>Math.round(mix(channel(a,index),channel(b,index),clamp(t))).toString(16).padStart(2,'0')).join('');
}
/** This phase coordinate is shared by controls, the linear comparison and 3D.
 * Cooling is a separate reversible fraction, not an extra nuclear-life stage. */
export function evolutionPosition(progress:number){
 const value=clampProgress(progress),after=PHASE_PROGRESS.findIndex(stop=>stop>value),phaseIndex=after<0?6:Math.max(0,after-1);
 const next=Math.min(6,phaseIndex+1),blend=phaseIndex===6?0:(value-PHASE_PROGRESS[phaseIndex]!)/(PHASE_PROGRESS[next]!-PHASE_PROGRESS[phaseIndex]!);
 return {phase:PHASES[phaseIndex]!,phaseIndex,blend,phaseCoordinate:phaseIndex+blend,remnantProgress:clamp((value-REMNANT_START)/(1-REMNANT_START))};
}
/** Enhanced recognition colors/radiance only. This is neither a cooling-age nor
 * a temperature calculation; a cooler white dwarf remains a visible remnant. */
export function evolutionAppearance(track:Track,progress:number){
 const {phaseCoordinate:p,remnantProgress}=evolutionPosition(progress),whiteDwarf=TRACKS[track].remnant==='white-dwarf',low=track==='low-mass';
 const main=low?'#efaf85':track==='solar'?'#fff0cf':'#c9e2ff',giant='#eda678',hot='#e4f5ff';
 const photosphereProfile=low?'red-dwarf' as const:p>=3?'red-giant' as const:'solar' as const;
 // The post-AGB photosphere first contracts to the core's displayed size.
 // Only then change its material: early transparency would reveal a ghost
 // sphere inside another sphere instead of one exposed, heating star.
 const compactBlend=smooth((p-(track==='solar'?5.8:low?5.45:4.98))/(track==='solar'?.18:low?.4:.14)),surfaceProfile=compactBlend===1?'compact' as const:photosphereProfile;
 const heliumWarmth=track==='solar'?smooth((p-4.02)/.2)*(1-smooth((p-4.3)/.28))*.3:0;
 const beforeCompact=low?colorMix(main,hot,smooth((p-3.5)/1.5)):colorMix(colorMix(colorMix(main,giant,smooth(p-2.5)),main,heliumWarmth),hot,smooth((p-(track==='solar'?4.8:5.0))/(track==='solar'?.95:.4)));
 const coolingProgress=whiteDwarf||TRACKS[track].remnant==='neutron-star'?remnantProgress:0,cooling=smooth(coolingProgress);
 return {surfaceProfile,photosphereProfile,compactBlend,coolingProgress,
  surfaceColor:whiteDwarf?colorMix(beforeCompact,'#fff1d8',cooling):beforeCompact,
  emission:mix(1,whiteDwarf?.45:.48,cooling),glare:mix(mix(1,.8,compactBlend),whiteDwarf?.4:.18,cooling),
  shellVisibility:mix(1,.025,smooth(remnantProgress/.58))};
}
/** A labelled, nonlinear recognition view: ordered radii remain ordered, but are not measurable here. */
export function recognitionRadius(track:Track,radiusSolar:number){
 const radius=Math.max(0,Number.isFinite(radiusSolar)?radiusSolar:0),largest=Math.max(...TRACKS[track].anchors.map(anchor=>anchor.radiusSolar));
 return radius<.1?9+27*radius/.1:36+110*(Math.log1p(radius)-Math.log1p(.1))/(Math.log1p(largest)-Math.log1p(.1));
}
export function evolutionState(track:Track,progress:number){
 const position=evolutionPosition(progress),{phaseIndex,blend,phaseCoordinate:p}=position,next=Math.min(6,phaseIndex+1);
 const model=TRACKS[track],a=model.anchors[phaseIndex]!,b=model.anchors[next]!;
 const engulfAt=(orbitAU:number)=>3+(orbitAU/RSUN_AU-model.anchors[3]!.radiusSolar)/(model.anchors[4]!.radiusSolar-model.anchors[3]!.radiusSolar);
 // The late solar illustrations share one rounded epoch. No post-AGB/nebular
 // elapsed age is solved; do not stretch a glowing nebula across 200 Myr.
 const massive=track==='massive'||track==='very-massive';
 const ageYears=track==='solar'&&p>=4?mix(model.anchors[4]!.ageYears,model.anchors[5]!.ageYears,smooth((p-4)/.58)):massive&&p>=5?model.anchors[5]!.ageYears:a.ageYears+(b.ageYears-a.ageYears)*blend;
 const radiusSolar=track==='solar'&&p>=4?solarLateRadius(p):massive&&p>=4?mix(model.anchors[4]!.radiusSolar,model.anchors[6]!.radiusSolar,smooth((p-5.02)/.10)):a.radiusSolar+(b.radiusSolar-a.radiusSolar)*blend;
 return {track,...position,...evolutionAppearance(track,progress),ageYears,ageUncalibrated:phaseIndex===6||track==='solar'&&p>=4.58||massive&&p>=5,
  radiusSolar,coreFuel:a.coreFuel+(b.coreFuel-a.coreFuel)*blend,
  mercuryEngulfed:track==='solar'&&p>=engulfAt(.387),
  venusEngulfed:track==='solar'&&p>=engulfAt(.723),
  remnant:model.remnant,massSolar:model.massSolar};
}
