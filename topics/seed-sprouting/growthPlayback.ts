/** Finite, user-started clock for the two growth observations in this journey.
 * A pause freezes the displayed observation, including between named stages.
 * It never completes a seek when a case is detached or conditions change. */
export interface GrowthClock {
  request(callback:(now:number)=>void):number;
  cancel(id:number):void;
}
const bounded=(p:number)=>Number.isFinite(p)?Math.max(0,Math.min(3,p)):0;
export class GrowthPlayback {
  private value:number;
  private frame=0;
  private last:number|undefined;
  private elapsed=0;
  private mode:'paused'|'play'|'seek'='paused';
  private from=0;
  private target=0;
  private disposed=false;
  constructor(private options:{
    initial:number;
    update:(value:number,playing:boolean)=>void;
    allowed?:(requested:number)=>number;
    reduced:()=>boolean;
    clock?:GrowthClock;
  }) { this.value=bounded(options.initial); }
  private get clock():GrowthClock {
    return this.options.clock??{request:callback=>requestAnimationFrame(callback),cancel:id=>cancelAnimationFrame(id)};
  }
  read(){return {progress:this.value,playing:this.mode==='play'};}
  private limit(p:number){return bounded(this.options.allowed?.(bounded(p))??p);}
  private emit(){if(!this.disposed)this.options.update(this.value,this.mode==='play');}
  pause(){
    this.clock.cancel(this.frame);this.frame=0;this.last=undefined;this.mode='paused';this.emit();
  }
  scrub(p:number){if(this.disposed)return;this.pause();this.value=this.limit(p);this.emit();}
  seek(p:number){
    if(this.disposed)return;this.pause();this.from=this.value;this.target=this.limit(p);this.elapsed=0;
    if(this.options.reduced()||Math.abs(this.target-this.value)<.00001){this.value=this.target;this.emit();return;}
    this.mode='seek';this.frame=this.clock.request(this.tick);
  }
  play(){
    if(this.disposed)return;this.pause();
    if(this.value>=3)this.value=0;
    if(this.options.reduced()){this.seek(Math.min(3,Math.floor(this.value)+1));return;}
    if(this.limit(3)<=this.value){this.emit();return;}
    this.mode='play';this.emit();this.frame=this.clock.request(this.tick);
  }
  private tick=(now:number)=>{
    this.frame=0;if(this.disposed||this.mode==='paused')return;
    const dt=this.last===undefined?0:Math.max(0,Math.min(100,now-this.last));this.last=now;
    if(this.mode==='play'){
      const next=this.limit(this.value+dt/8000);
      const end=this.limit(3);this.value=next;
      if(next>=end)this.mode='paused';
    }else{
      this.elapsed+=dt;const p=Math.min(1,this.elapsed/1050),eased=p*p*(3-2*p);
      this.value=this.limit(this.from+(this.target-this.from)*eased);
      if(p===1)this.mode='paused';
    }
    this.emit();if(this.mode!=='paused')this.frame=this.clock.request(this.tick);else this.last=undefined;
  };
  dispose(){this.pause();this.disposed=true;}
}
