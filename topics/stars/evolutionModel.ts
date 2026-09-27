/** Representative evolutionary tracks, not solutions of stellar structure equations. */
export type Track='solar'|'massive'|'very-massive';
export type Phase='cloud'|'protostar'|'main'|'core-depletion'|'giant'|'release'|'remnant';
export const PHASES:readonly Phase[]=['cloud','protostar','main','core-depletion','giant','release','remnant'];
export const RSUN_AU=0.00465047;
type Anchor={ageYears:number;radiusSolar:number;coreFuel:number};
export const TRACKS:Record<Track,{massSolar:number;remnant:'white-dwarf'|'neutron-star'|'black-hole';anchors:readonly Anchor[]}>= {
 solar:{massSolar:1,remnant:'white-dwarf',anchors:[
  {ageYears:0,radiusSolar:0,coreFuel:1},{ageYears:1e6,radiusSolar:3,coreFuel:1},
  {ageYears:5e7,radiusSolar:1,coreFuel:1},{ageYears:1e10,radiusSolar:1.4,coreFuel:0},
  {ageYears:1.15e10,radiusSolar:180,coreFuel:0},{ageYears:1.18e10,radiusSolar:.8,coreFuel:0},
  {ageYears:1.2e10,radiusSolar:.01,coreFuel:0}]},
 massive:{massSolar:15,remnant:'neutron-star',anchors:[
  {ageYears:0,radiusSolar:0,coreFuel:1},{ageYears:1e4,radiusSolar:12,coreFuel:1},
  {ageYears:5e5,radiusSolar:6,coreFuel:1},{ageYears:1e7,radiusSolar:15,coreFuel:0},
  {ageYears:1.1e7,radiusSolar:700,coreFuel:0},{ageYears:1.11e7,radiusSolar:3,coreFuel:0},
  {ageYears:1.12e7,radiusSolar:0,coreFuel:0}]},
 'very-massive':{massSolar:30,remnant:'black-hole',anchors:[
  {ageYears:0,radiusSolar:0,coreFuel:1},{ageYears:1e4,radiusSolar:15,coreFuel:1},
  {ageYears:3e5,radiusSolar:10,coreFuel:1},{ageYears:5e6,radiusSolar:24,coreFuel:0},
  {ageYears:5.5e6,radiusSolar:900,coreFuel:0},{ageYears:5.51e6,radiusSolar:3,coreFuel:0},
  {ageYears:5.52e6,radiusSolar:0,coreFuel:0}]},
};
export const clampProgress=(v:number)=>{const bounded=Number.isFinite(v)?Math.max(0,Math.min(1,v)):0,stop=Math.round(bounded*6)/6;
 // URLs keep five decimal places; recover an explicitly selected phase on reload.
 return Math.abs(bounded-stop)<1e-5?stop:bounded;
};
/** A labelled, nonlinear recognition view: ordered radii remain ordered, but are not measurable here. */
export function recognitionRadius(track:Track,radiusSolar:number){
 const radius=Math.max(0,Number.isFinite(radiusSolar)?radiusSolar:0),largest=TRACKS[track].anchors[4]!.radiusSolar;
 return radius<.1?9+27*radius/.1:36+110*Math.log1p(radius)/Math.log1p(largest);
}
export function evolutionState(track:Track,progress:number){
 const p=clampProgress(progress)*(PHASES.length-1),phaseIndex=Math.min(PHASES.length-1,Math.floor(p)),next=Math.min(PHASES.length-1,phaseIndex+1),blend=p-phaseIndex;
 const model=TRACKS[track],a=model.anchors[phaseIndex]!,b=model.anchors[next]!;
 const engulfAt=(orbitAU:number)=>3+(orbitAU/RSUN_AU-model.anchors[3]!.radiusSolar)/(model.anchors[4]!.radiusSolar-model.anchors[3]!.radiusSolar);
 return {track,phase:PHASES[phaseIndex]!,phaseIndex,blend,ageYears:a.ageYears+(b.ageYears-a.ageYears)*blend,
  radiusSolar:a.radiusSolar+(b.radiusSolar-a.radiusSolar)*blend,coreFuel:a.coreFuel+(b.coreFuel-a.coreFuel)*blend,
  mercuryEngulfed:track==='solar'&&p>=engulfAt(.387),
  venusEngulfed:track==='solar'&&p>=engulfAt(.723),
  remnant:model.remnant,massSolar:model.massSolar};
}
