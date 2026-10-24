export interface RenderFrames {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
}

/** One pending presentation per scene. Requests read the latest retained state
 * at the next browser frame; this never advances a model or owns an animation
 * loop. Dispose before releasing the scene's graphics resources. */
export class FrameRender {
  private frame=0;
  private disposed=false;
  constructor(private readonly draw:()=>void,private readonly frames:RenderFrames={request:callback=>requestAnimationFrame(callback),cancel:id=>cancelAnimationFrame(id)}){}
  request=()=>{
    if(this.disposed||this.frame)return;
    this.frame=this.frames.request(()=>{this.frame=0;if(!this.disposed)this.draw();});
  };
  dispose(){if(this.disposed)return;this.disposed=true;if(this.frame)this.frames.cancel(this.frame);this.frame=0;}
}
