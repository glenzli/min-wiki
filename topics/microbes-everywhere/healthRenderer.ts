import type {WorkspaceState} from './workspaceModel';
import type {WorkspaceRenderer,RendererFactory} from './workspaceRenderer';
import type content from './healthContent.json';
type Copy=typeof content.en;
export function rendererKey(s:WorkspaceState):string{
 if(s.chapter==='environment')return 'environment';
 if(s.chapter==='bacteria'&&s.process!=='structure')return 'bacteria-process';
 if(s.chapter==='viruses'&&s.virusProcess==='structure'&&s.flat&&s.virus==='phage')return 'phage-structure';
 if(s.chapter==='bacteria'||s.chapter==='viruses'&&s.virusProcess==='structure')return `structure:${s.flat?'2d':'3d'}`;
 if(s.chapter==='viruses')return s.virus==='phage'?'phage-cycle':'virus-cycle';
 return s.chapter;
}
/** Admission remains in the workspace's single SceneLease; no nested loader or extra clock. */
export async function loadHealthRenderer(s:WorkspaceState,copy:Copy,failed:()=>void):Promise<RendererFactory>{
 const key=rendererKey(s);
 if(key==='environment'||key==='bacteria-process'||key==='phage-cycle'||key==='phage-structure'){
  const {loadRenderer}=await import('./workspaceRenderer');
  const factory=await loadRenderer(key==='environment'?'environment':key==='bacteria-process'?'bacteria':'viruses');
  return (host,old)=>{const renderer=factory(host,old);return{render(next,animate){renderer.render(key==='phage-structure'?{...next,view:'attachment',viruses:{...next.viruses,[next.host]:0}}:next.chapter==='bacteria'&&next.process==='exchange'?{...next,process:'structure',part:'membrane'}:next,animate);},pause:()=>renderer.pause(),dispose:()=>renderer.dispose()};};
 }
 if(key==='structure:3d'){
  const {Specimen3D}=await import('./specimen3d');
  return host=>new Specimen3D(host,copy,failed);
 }
 const {HealthScene2D}=await import('./healthScene2d');
 return host=>new HealthScene2D(host,copy,key==='structure:2d'?'specimen':key as 'virus-cycle'|'infection'|'immunity'|'care');
}
