import {PHASE_PROGRESS} from './evolutionModel.ts';

/** Screen seconds are authored observation time, never physical stellar ages.
 * Formation and contraction have room to read; the final 22 s show cooling. */
export const EVOLUTION_DURATION_SECONDS=84;
export const REMNANT_OBSERVATION_SECONDS=22;
const PROGRESS=[...PHASE_PROGRESS,1];
const SECONDS=[0,8,16,32,42,52,EVOLUTION_DURATION_SECONDS-REMNANT_OBSERVATION_SECONDS,EVOLUTION_DURATION_SECONDS];
export type EvolutionDirection=1|-1;

function interpolate(value:number,source:readonly number[],target:readonly number[]){
 const after=source.findIndex(stop=>stop>value),at=after<0?source.length-2:Math.max(0,after-1);
 const blend=(value-source[at]!)/(source[at+1]!-source[at]!);
 return target[at]!+(target[at+1]!-target[at]!)*blend;
}
const boundedProgress=(progress:number)=>Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
export const evolutionPlaybackSeconds=(progress:number)=>interpolate(boundedProgress(progress),PROGRESS,SECONDS);
export const evolutionPlaybackProgress=(seconds:number)=>boundedProgress(interpolate(Number.isFinite(seconds)?Math.max(0,Math.min(EVOLUTION_DURATION_SECONDS,seconds)):0,SECONDS,PROGRESS));

/** Seeking, reverse and forward playback all sample this one bounded timeline. */
export function advanceEvolution(progress:number,seconds:number,direction:EvolutionDirection=1){
 const current=evolutionPlaybackSeconds(progress),delta=Number.isFinite(seconds)?Math.max(0,seconds):0;
 const next=evolutionPlaybackProgress(current+delta*direction);
 return {progress:next,ended:direction===1?next>=1:next<=0};
}
