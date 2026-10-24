import type {SpaceInput} from './spaceModel.ts';
import type {StellarSpace3D} from './spaceScene3d.ts';

type Words={loading:string;failed:string;retry:string;canvas:string;ready:string;fallback:string};
/** Lazy, bounded viewport lifecycle. It preserves the supplied science snapshot
 * through loading, rapid chapter changes, loss of context, retry and teardown. */
export class StellarSpaceViewport {
  private root=document.createElement('div');
  private status=document.createElement('p');
  private retryButton=document.createElement('button');
  private renderer?:StellarSpace3D;
  private loading=false;
  private failed=false;
  private disposed=false;
  private current?:{input:SpaceInput;time:number;cutaway:boolean};
  private active=false;
  private canvas?:HTMLCanvasElement;
  private generation=0;
  constructor(private fallbackCanvas:HTMLCanvasElement,private words:Words,private redraw:()=>void,private load:()=>Promise<{StellarSpace3D:typeof StellarSpace3D}>=()=>import('./spaceScene3d.ts')){
    this.root.className='stellar-space-stage';this.root.hidden=true;
    this.status.className='stellar-space-status';this.status.setAttribute('role','status');
    this.retryButton.type='button';this.retryButton.textContent=words.retry;this.retryButton.hidden=true;
    this.retryButton.onclick=()=>{this.failed=false;this.ensureRenderer();};
    this.root.append(this.status,this.retryButton);fallbackCanvas.before(this.root);
  }
  draw(input:SpaceInput|undefined,time=0,cutaway=false):boolean{
    if(this.disposed)return false;
    this.active=!!input;this.root.hidden=!input;
    if(!input){this.fallbackCanvas.hidden=false;return false;}
    this.current={input,time,cutaway};
    if(this.renderer){this.fallbackCanvas.hidden=true;this.renderer.draw(input,time,cutaway);return true;}
    this.fallbackCanvas.hidden=!this.failed;this.status.textContent=this.failed?this.words.failed:this.words.loading;
    if(!this.failed)this.ensureRenderer();return !this.failed;
  }
  private async ensureRenderer(){
    if(this.disposed||this.loading||this.renderer)return;
    this.loading=true;this.root.dataset.renderState='loading';this.status.textContent=this.words.loading;this.retryButton.hidden=true;
    const generation=++this.generation;
    // A cheap canvas preserves the final stage's layout while its module loads.
    // Prepare the full CPU fallback only after an actual WebGL/import failure.
    const canvas=document.createElement('canvas');canvas.className='stellar-space-canvas';canvas.setAttribute('aria-label',this.words.canvas);canvas.setAttribute('role','img');canvas.tabIndex=0;
    this.root.prepend(canvas);this.canvas=canvas;this.fallbackCanvas.hidden=true;
    try{
      const {StellarSpace3D}=await this.load();
      if(this.disposed||generation!==this.generation)return;
      this.renderer=new StellarSpace3D(canvas,()=>this.fail());
      this.root.dataset.renderState='ready';this.status.textContent=this.words.ready;this.failed=false;
      if(this.active&&this.current){this.fallbackCanvas.hidden=true;this.renderer.draw(this.current.input,this.current.time,this.current.cutaway);}
      this.redraw();
    }catch{
      if(!this.disposed&&generation===this.generation)this.fail();
    }finally{if(generation===this.generation)this.loading=false;}
  }
  private fail(){
    if(this.disposed)return;
    this.renderer?.dispose();this.renderer=undefined;this.canvas?.remove();this.canvas=undefined;
    this.failed=true;this.root.dataset.renderState='fallback';this.status.textContent=this.words.failed;this.retryButton.hidden=false;
    this.fallbackCanvas.hidden=false;this.redraw();
  }
  resetCamera(){this.renderer?.resetCamera();}
  dispose(){if(this.disposed)return;this.disposed=true;++this.generation;this.renderer?.dispose();this.renderer=undefined;this.current=undefined;this.retryButton.onclick=null;this.canvas?.remove();this.root.remove();}
}
