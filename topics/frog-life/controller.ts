import { bounded, COMPARISON_PAIRS, type Aspect, type Chapter, type View, readMetamorphosisRoute } from './metamorphosisModel.ts';
export interface FrameClock { request(callback:(time:number)=>void):number; cancel(id:number):void; now():number }
export interface MetamorphosisState {
  chapter:Chapter;aspect:Aspect;
  frog:{progress:number;view:View};butterfly:{stage:number;growth:number;wing:number;peek:boolean;view:View};
  playing:'frog'|'wings'|'butterfly'|null;
}
/** One real controller owns both independent observation histories and all finite frame work. */
export class MetamorphosisController {
  private state:MetamorphosisState;
  private frame=0;
  private generation=0;
  private disposed=false;
  private reduced=false;
  private listeners=new Set<(state:MetamorphosisState)=>void>();
  constructor(search:string,private clock:FrameClock){const r=readMetamorphosisRoute(search);this.state={chapter:r.chapter,aspect:r.aspect,frog:{progress:r.growth,view:r.chapter==='frog'?r.view:'whole'},butterfly:{stage:r.stage,growth:r.stage+(r.stage===3?r.wing:0),wing:r.wing,peek:r.peek,view:r.chapter==='butterfly'?r.view:'whole'},playing:null};}
  read():MetamorphosisState{return {...this.state,frog:{...this.state.frog},butterfly:{...this.state.butterfly}};}
  subscribe(listener:(state:MetamorphosisState)=>void){this.listeners.add(listener);listener(this.read());return ()=>this.listeners.delete(listener);}
  private emit(){if(!this.disposed)for(const listener of this.listeners)listener(this.read());}
  private stop(){this.generation++;this.clock.cancel(this.frame);this.frame=0;this.state.playing=null;}
  pause(){this.stop();this.emit();}
  setChapter(chapter:Chapter){if(this.disposed)return;this.stop();this.state.chapter=chapter;this.emit();}
  setAspect(aspect:Aspect){if(this.disposed)return;this.state.aspect=aspect;this.emit();}
  setView(animal:'frog'|'butterfly',view:View){if(this.disposed)return;this.state[animal].view=view;this.emit();}
  setFrogProgress(value:number){if(this.disposed)return;this.stop();this.state.frog.progress=bounded(value,0,4);this.emit();}
  setButterflyStage(value:number){if(this.disposed)return;this.stop();const b=this.state.butterfly;b.stage=Math.round(bounded(value,0,3));b.growth=b.stage+(b.stage===3?b.wing:0);this.emit();}
  setWingProgress(value:number){if(this.disposed)return;this.stop();this.state.butterfly.wing=bounded(value,0,1);if(this.state.butterfly.stage===3)this.state.butterfly.growth=3+this.state.butterfly.wing;this.emit();}
  private butterflyAt(value:number){const b=this.state.butterfly;b.growth=bounded(value,0,4);b.stage=Math.min(3,Math.floor(b.growth));if(b.stage===3)b.wing=b.growth-3;}
  setButterflyGrowth(value:number){if(this.disposed)return;this.stop();this.butterflyAt(value);this.emit();}
  setPeek(value:boolean){if(this.disposed)return;this.state.butterfly.peek=value;this.emit();}
  comparePair(pair:keyof typeof COMPARISON_PAIRS){if(this.disposed)return;this.stop();const p=COMPARISON_PAIRS[pair];this.state.frog.progress=p.growth;this.state.butterfly.stage=p.stage;this.state.butterfly.growth=p.stage+(p.stage===3?this.state.butterfly.wing:0);this.state.chapter='compare';this.emit();}
  setReducedMotion(reduced:boolean){this.reduced=reduced;if(reduced)this.pause();}
  stepFrog(delta:number){const p=this.state.frog.progress,target=bounded(delta>0?Math.floor(p)+1:Math.ceil(p)-1,0,4);this.animate('frog',target,1000);}
  play(){
    if(this.disposed)return;if(this.state.playing){this.pause();return;}
    if(this.state.chapter==='frog'){
      if(this.state.frog.progress>=4)this.state.frog.progress=0;
      if(this.reduced){this.setFrogProgress(Math.min(4,Math.floor(this.state.frog.progress)+1));return;}
      this.animate('frog',4,(4-this.state.frog.progress)*6500);
    }else if(this.state.chapter==='butterfly'&&this.state.butterfly.stage===3){
      if(this.state.butterfly.wing>=1)this.state.butterfly.wing=0;
      if(this.reduced){this.setWingProgress(this.state.butterfly.wing+.25);return;}
      this.animate('wings',1,(1-this.state.butterfly.wing)*12000);
    }
  }
  playGrowth(animal:'frog'|'butterfly'){
    if(this.disposed)return;
    if(this.state.playing===animal){this.pause();return;}
    const current=animal==='frog'?this.state.frog.progress:this.state.butterfly.growth;
    const from=current>=4?0:current;
    if(animal==='frog')this.state.frog.progress=from;else this.butterflyAt(from);
    const target=this.reduced?Math.min(4,Math.floor(from)+1):4;
    this.animate(animal,target,(target-from)*(animal==='frog'?6500:8000));
  }
  private animate(kind:'frog'|'wings'|'butterfly',target:number,duration:number){
    if(this.disposed)return;this.stop();const from=kind==='frog'?this.state.frog.progress:kind==='butterfly'?this.state.butterfly.growth:this.state.butterfly.wing;
    const assign=(value:number)=>{if(kind==='frog')this.state.frog.progress=value;else if(kind==='butterfly')this.butterflyAt(value);else {this.state.butterfly.wing=value;this.state.butterfly.growth=3+value;}};
    if(this.reduced||duration<=0){assign(target);this.emit();return;}
    const generation=this.generation;let last=this.clock.now(),elapsed=0;this.state.playing=kind;this.emit();
    const tick=(now:number)=>{if(this.disposed||generation!==this.generation)return;this.frame=0;elapsed+=bounded(now-last,0,100);last=now;const p=Math.min(1,elapsed/duration),value=from+(target-from)*p;assign(value);if(p===1)this.state.playing=null;this.emit();if(p<1&&generation===this.generation&&!this.disposed)this.frame=this.clock.request(tick);};
    this.frame=this.clock.request(tick);
  }
  dispose(){this.stop();this.disposed=true;this.listeners.clear();}
}
