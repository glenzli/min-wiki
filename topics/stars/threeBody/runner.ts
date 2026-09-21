import { createIntegration, initialConditions, PERTURBATION, type Experiment, type Trajectory } from './model.ts';
export interface Comparison { base:Trajectory; perturbed:Trajectory; count:number }
/** One caller-owned job; at most two fixed-size buffers. Abort is checked across every yield. */
export async function prepareComparison(experiment:Experiment,signal:AbortSignal,onProgress:(value:number)=>void=()=>{},yieldTask:()=>Promise<void>=()=>new Promise(resolve=>setTimeout(resolve,0))):Promise<Comparison> {
  const base=createIntegration(initialConditions(experiment)),perturbed=createIntegration(initialConditions(experiment,PERTURBATION));
  while(!base.done||!perturbed.done){
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    base.advance();perturbed.advance();onProgress(Math.min(base.done?1:base.progress,perturbed.done?1:perturbed.progress));
    await yieldTask();
  }
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  return {base:base.trajectory,perturbed:perturbed.trajectory,count:Math.min(base.trajectory.count,perturbed.trajectory.count)};
}
