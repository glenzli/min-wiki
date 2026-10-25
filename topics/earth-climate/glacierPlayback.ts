import {glacierBudget} from './model';

/** A reversible presentation coordinate; one round is not a year or a flow-model timestep. */
export function glacierRoundParts(position:number):{steps:number;glacierPhase:number} {
  const milli=Math.round(Math.max(0,Math.min(12,Number.isFinite(position)?position:0))*1000);
  return {steps:Math.floor(milli/1000),glacierPhase:milli%1000};
}

/** Interpolate two existing budget outcomes; never run an independent mass/ice-flow model. */
export function glacierFrame(accumulation:number,ablation:number,steps:number,glacierPhase=0) {
  const from=glacierBudget(accumulation,ablation,steps);
  const fraction=from.steps<12?Math.max(0,Math.min(1,Number.isFinite(glacierPhase)?glacierPhase/1000:0)):0;
  const to=glacierBudget(accumulation,ablation,Math.min(12,from.steps+1));
  const mix=(a:number,b:number)=>a+(b-a)*fraction;
  const mass=mix(from.mass,to.mass),round=from.steps+fraction;
  const trajectory=from.history.map((mass,round)=>({round,mass}));
  if(fraction>0)trajectory.push({round,mass});
  return {...from,mass,totalAdded:mix(from.totalAdded,to.totalAdded),totalLost:mix(from.totalLost,to.totalLost),round,fraction,trajectory};
}
