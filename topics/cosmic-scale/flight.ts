import { clamp, smooth } from './model.ts';
/** A single cancellable camera journey. Manual seeking owns the state immediately. */
export class ScaleFlight {
  progress:number;
  private from=0;private target=0;private elapsed=0;private duration=0;
  running=false;
  constructor(progress=0){this.progress=clamp(progress);}
  seek(progress:number){this.running=false;this.progress=clamp(progress);}
  stop(){this.running=false;}
  go(target:number,reduced=false,tour=false){this.from=this.progress;this.target=clamp(target);this.elapsed=0;this.duration=tour?Math.max(.1,65*Math.abs(this.target-this.from)):1.2+7*Math.abs(this.target-this.from);this.running=!reduced&&Math.abs(this.target-this.from)>1e-8;if(!this.running)this.progress=this.target;}
  step(seconds:number){if(!this.running)return this.progress;this.elapsed+=clamp(seconds,0,.08);const t=Math.min(1,this.elapsed/this.duration);this.progress=this.from+(this.target-this.from)*smooth(t);if(t===1){this.progress=this.target;this.running=false;}return this.progress;}
}
