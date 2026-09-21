import type { Camera, WindSession, World } from './session.ts';
export interface Scene { draw(s:WindSession):void; setCamera?(camera:Camera):void; dispose():void; }
/** One persistent state and canvas per visited environment. Stale loads never replace the active view. */
export class SceneSlot {
  private slots=new Map<World,{canvas:HTMLCanvasElement;scene?:Scene;promise?:Promise<void>}>();
  private disposed=false;
  constructor(private host:HTMLElement,private report:(status:'loading'|'ready'|'error')=>void){}
  async select(s:WindSession){
    const world=s.world;
    for(const [id,slot] of this.slots)slot.canvas.hidden=id!==world;
    let slot=this.slots.get(world);
    if(slot?.scene){slot.canvas.hidden=false;slot.scene.setCamera?.(s.camera);slot.scene.draw(s);this.report('ready');return;}
    if(slot?.promise){this.report('loading');await slot.promise;return;}
    const canvas=slot?.canvas??document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',this.host.getAttribute('aria-label')??'');canvas.hidden=false;
    if(!slot){this.host.prepend(canvas);slot={canvas};this.slots.set(world,slot);}
    this.report('loading');
    const target=slot;
    target.promise=(async()=>{
      try{
        let scene:Scene;
        if(world==='coast'){const {CoastScene}=await import('./coastScene.ts');if(this.disposed)return;scene=new CoastScene(canvas);}
        else if(world==='typhoon'){const {TopicScene}=await import('../typhoon/scene.ts');if(this.disposed)return;const engine=new TopicScene(canvas);scene={draw:state=>engine.draw({...state.typhoon,circulation:state.typhoon.time,view:state.typhoon.section?'section':state.traces?'flow':'natural'}),setCamera:view=>engine.setCamera(view),dispose:()=>{engine.dispose();canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();}};}
        else{const {TopicScene}=await import('../tornado/scene.ts');if(this.disposed)return;const engine=new TopicScene(canvas);scene={draw:state=>engine.draw(state.tornado.progress,state.tornado.settings,state.traces?'annotated':'natural',state.tornado.time),dispose:()=>engine.dispose()};}
        target.scene=scene;
        if(s.world===world){scene.setCamera?.(s.camera);scene.draw(s);this.report('ready');}
      }catch(error){console.error(error);if(s.world===world)this.report('error');}
      finally{target.promise=undefined;}
    })();
    await target.promise;
  }
  draw(s:WindSession){this.slots.get(s.world)?.scene?.draw(s);}
  camera(s:WindSession){this.slots.get(s.world)?.scene?.setCamera?.(s.camera);}
  describe(s:WindSession,label:string){this.slots.get(s.world)?.canvas.setAttribute('aria-label',label);}
  dispose(){this.disposed=true;for(const slot of this.slots.values()){slot.scene?.dispose();slot.canvas.remove();}this.slots.clear();}
}
