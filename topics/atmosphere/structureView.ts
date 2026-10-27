import * as THREE from 'three';
import type content from './content.json';
import { journeyFrame, worlds, type Settings, type World } from './model.ts';
import type { MechanismFrame } from './layerMechanism.ts';
import { displayHeight, structureProfiles } from './structureModel.ts';
import { AtmosphereStructureWorld } from './structureScene.ts';
import { defaultPhenomena, phenomenonFocus, readPhenomenonQuery, writePhenomenonQuery, type PhenomenonOptions, type WeatherCase } from './phenomenaModel.ts';

type Text=typeof content.zh;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const bound=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
interface Orbit { yaw:number;pitch:number;zoom:number;focus:boolean }
/** A single renderer with one or two independent scissored world windows.
 * Selection never couples foreign regions to Earth layer indices. GPU worlds
 * are retained only while requested (at most Earth plus one comparison).
 * Natural activity is separate from height/narration progress, capped at 24
 * updates/s and suspended when hidden. Reduced-motion starts it paused. */
export class AtmosphereStructureView {
 private renderer?:THREE.WebGLRenderer;
 private readonly camera=new THREE.OrthographicCamera();
 private readonly models=new Map<World,AtmosphereStructureWorld>();
 private readonly orbit=new Map<World,Orbit>();
 private readonly selected=new Map<World,string>();
 private readonly observer:ResizeObserver;
 private canvas:HTMLCanvasElement;
 private panel:HTMLElement;
 private key='';private state?:Settings;private labels=true;private mechanism:MechanismFrame|null=null;
 private visible=false;private disposed=false;private lost=false;private failed=false;
 private readonly reduced=matchMedia('(prefers-reduced-motion: reduce)');
 private playing=!this.reduced.matches;private phase=0;private frame=0;private last=0;private dirty=true;private renders=0;
 private clues=true;
 private composition=false;
 private readonly conditions=new Map<World,PhenomenonOptions>();
 private pointer:{world:World;x:number;y:number}|null=null;
 private readonly touches=new Map<number,{x:number;y:number}>();
 private pinch=0;
 private readonly click=(event:Event)=>{
  const button=(event.target as Element).closest<HTMLButtonElement>('button[data-feature],button[data-structure-action]');if(!button||!this.root.contains(button))return;
  if(button.dataset.feature){this.chooseFeature(button.dataset.world as World,button.dataset.feature);}
  else if(button.dataset.structureAction==='reset'){this.orbit.clear();this.projectSelection();}
  else if(button.dataset.structureAction==='play'){this.playing=!this.playing;this.last=0;this.projectActivity();}
  else if(button.dataset.structureAction==='focus'){const orbit=this.getOrbit(button.dataset.world as World);orbit.focus=!orbit.focus;orbit.zoom=1;this.projectSelection();}
  else if(button.dataset.structureAction==='retry')this.retry();
  this.persist();this.invalidate();
 };
 private readonly change=(event:Event)=>{
  const target=event.target as HTMLInputElement|HTMLSelectElement;
  if(target.matches('[data-structure-clues]'))this.clues=(target as HTMLInputElement).checked;
  else if(target.matches('[data-structure-composition]'))this.composition=(target as HTMLInputElement).checked;
  else if(target.matches('[data-feature-choice]'))this.chooseFeature(target.dataset.world as World,target.value);
  else if(target.dataset.condition){const world=target.dataset.world as World,conditions=this.getConditions(world);
   if(target.dataset.condition==='weather')conditions.weather=target.value as WeatherCase;
   else if(target.dataset.condition==='aurora')conditions.aurora=(target as HTMLInputElement).checked;
   else if(target.dataset.condition==='meteor')conditions.meteorOutcome=target.value as 'fade'|'fragment';
  }
  this.projectSelection();this.persist();this.invalidate();
 };
 private readonly reducedChange=()=>{if(this.reduced.matches){this.playing=false;this.last=0;this.projectActivity();this.invalidate();}};
 private readonly down=(e:PointerEvent)=>{
  const window=(e.target as Element).closest<HTMLElement>('[data-volume-world]');if(!window)return;
  window.setPointerCapture(e.pointerId);this.touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(this.touches.size===1)this.pointer={world:window.dataset.volumeWorld as World,x:e.clientX,y:e.clientY};
  if(this.touches.size===2){const [a,b]=[...this.touches.values()];this.pinch=Math.hypot(a.x-b.x,a.y-b.y);}
 };
 private readonly move=(e:PointerEvent)=>{
  if(!this.pointer||!this.touches.has(e.pointerId))return;
  const orbit=this.getOrbit(this.pointer.world);this.touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(this.touches.size===2){const [a,b]=[...this.touches.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(this.pinch>0)orbit.zoom=bound(orbit.zoom*this.pinch/Math.max(1,distance),.62,1.6);this.pinch=distance;}
  else{orbit.yaw=bound(orbit.yaw+(e.clientX-this.pointer.x)*.006,-1.1,1.1);orbit.pitch=bound(orbit.pitch+(e.clientY-this.pointer.y)*.004,.04,.75);}
  this.pointer.x=e.clientX;this.pointer.y=e.clientY;this.invalidate();
 };
 private readonly up=(e:PointerEvent)=>{this.touches.delete(e.pointerId);if(!this.touches.size)this.pointer=null;this.pinch=0;};
 private readonly wheel=(e:WheelEvent)=>{
  const window=(e.target as Element).closest<HTMLElement>('[data-volume-world]');if(!window)return;e.preventDefault();const orbit=this.getOrbit(window.dataset.volumeWorld as World);orbit.zoom=bound(orbit.zoom*Math.exp(e.deltaY*.001),.62,1.6);this.invalidate();
 };
 private readonly keyboard=(e:KeyboardEvent)=>{
  const window=(e.target as Element).closest<HTMLElement>('[data-volume-world]');if(!window||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;
  e.preventDefault();const world=window.dataset.volumeWorld as World,o=this.getOrbit(world);
  if(e.key==='Home')this.orbit.delete(world);else if(e.key==='ArrowLeft'||e.key==='ArrowRight')o.yaw=bound(o.yaw+(e.key==='ArrowLeft'?-.09:.09),-1.1,1.1);
  else if(e.key==='ArrowUp'||e.key==='ArrowDown')o.pitch=bound(o.pitch+(e.key==='ArrowUp'?-.06:.06),.04,.75);
  else o.zoom=bound(o.zoom*(e.key==='-'?1.08:.92),.62,1.6);this.invalidate();
 };
 private readonly visibility=()=>{this.cancel();this.last=0;if(!document.hidden)this.invalidate();};
 private readonly pageHide=()=>this.cancel();
 private readonly lostContext=(e:Event)=>{e.preventDefault();this.lost=true;this.cancel();this.projectFailure();};
 private readonly restored=()=>{this.lost=false;this.failed=false;this.projectFailure();this.invalidate();};
 constructor(private root:HTMLElement,private text:Text,private notes:HTMLElement,private selectLayer:(layer:number)=>void){
  const restored=readPhenomenonQuery(location.search);this.conditions.set('earth',restored.earth);this.conditions.set('titan',restored.titan);this.clues=restored.clues;this.composition=restored.composition;
  for(const detail of restored.detail){this.selected.set(detail.world,detail.id);this.getOrbit(detail.world).focus=true;}
  const copy=text.structure;
  root.classList.add('atmo-structure');root.innerHTML=`<div class="structure-tools"><span>${esc(copy.guide)}</span><div><label class="structure-clues"><input type="checkbox" data-structure-clues checked>${esc(copy.clues)}</label><label class="structure-clues structure-composition-control"><input type="checkbox" data-structure-composition>${esc(copy.composition)}</label><button type="button" data-structure-action="play">${esc(copy.play)}</button><button type="button" data-structure-action="reset">${esc(copy.reset)}</button></div></div><div class="structure-scenes"><canvas aria-hidden="true"></canvas><div class="structure-panels"></div></div><p class="structure-composition-key" hidden><span>${esc(copy.compositionEarth)}</span><span class="composition-water">${esc(copy.compositionWater)}</span><span class="composition-ozone">${esc(copy.compositionOzone)}</span><span>${esc(copy.compositionNote)}</span></p><p class="structure-scale"></p><div class="structure-failure" hidden><p>${esc(copy.noGpu)}</p><button type="button" data-structure-action="retry">${esc(copy.retry)}</button></div>`;
  this.canvas=root.querySelector('canvas')!;this.panel=root.querySelector('.structure-panels')!;
  root.querySelector<HTMLInputElement>('[data-structure-clues]')!.checked=this.clues;
  root.querySelector<HTMLInputElement>('[data-structure-composition]')!.checked=this.composition;
  root.addEventListener('click',this.click);root.addEventListener('change',this.change);root.addEventListener('pointerdown',this.down);root.addEventListener('pointermove',this.move);root.addEventListener('pointerup',this.up);root.addEventListener('pointercancel',this.up);root.addEventListener('wheel',this.wheel,{passive:false});root.addEventListener('keydown',this.keyboard);this.reduced.addEventListener('change',this.reducedChange);
  document.addEventListener('visibilitychange',this.visibility);window.addEventListener('pagehide',this.pageHide);window.addEventListener('pageshow',this.visibility);
  this.observer=new ResizeObserver(()=>this.invalidate());this.observer.observe(root);
  this.projectActivity();
 }
 private getConditions(world:World){let conditions=this.conditions.get(world);if(!conditions){conditions={...defaultPhenomena,weather:world==='titan'?'cloud':'rain'};this.conditions.set(world,conditions);}return conditions;}
 private chooseFeature(world:World,id:string){const feature=structureProfiles[world].features.find(item=>item.id===id);if(!feature)return;this.selected.set(world,id);const orbit=this.getOrbit(world);orbit.focus=true;orbit.zoom=1;if(this.state?.view==='layers'&&feature.layer!==undefined)this.selectLayer(feature.layer);this.projectSelection();}
 private persist(){
  if(!this.state)return;const active:World[]=this.state.view==='worlds'?['earth',this.state.world]:['earth'];
  const detail=active.filter(world=>this.getOrbit(world).focus).map(world=>({world,id:this.selected.get(world)!}));
  const url=new URL(location.href);url.search=writePhenomenonQuery(url.search,this.getConditions('earth'),this.getConditions('titan'),this.clues,detail,this.composition).toString();history.replaceState(null,'',url);
 }
 private getOrbit(world:World){let orbit=this.orbit.get(world);if(!orbit){orbit={yaw:.25,pitch:.25,zoom:1,focus:false};this.orbit.set(world,orbit);}return orbit;}
 private getCopy(id:string){return this.text.structure.features[id as keyof typeof this.text.structure.features];}
 draw(state:Settings,labels:boolean,mechanism:MechanismFrame|null,visible:boolean){
  if(this.disposed)return;if(this.visible!==visible)this.last=0;this.state={...state};this.labels=labels;this.mechanism=mechanism;this.visible=visible;this.root.hidden=!visible;
  this.notes.hidden=!visible;if(!visible){this.cancel();return;}
  const active:World[]=state.view==='worlds'?['earth',state.world]:['earth'];
  const key=active.join(':');
  if(key!==this.key){
   this.key=key;for(const [world,model]of this.models)if(!active.includes(world)){model.dispose();this.models.delete(world);}
   this.panel.classList.toggle('is-pair',active.length===2);
   this.panel.innerHTML=active.map(world=>{
    const words=this.text.worlds[world],values=worlds[world],profile=structureProfiles[world];
    if(!this.selected.has(world))this.selected.set(world,world==='venus'?'acid-cloud':profile.features[0].id);
    return `<section class="structure-world" data-world="${world}"><header><div><h2>${esc(words.name)}</h2><p>${esc(words.composition)}</p></div><div class="structure-conditions"></div><button type="button" data-structure-action="focus" data-world="${world}" aria-pressed="${this.getOrbit(world).focus}">${esc(this.text.structure.close)}</button></header><label class="structure-feature-choice"><select data-feature-choice data-world="${world}" aria-label="${esc(words.name+' · '+this.text.structure.choose)}">${profile.features.map((f,i)=>`<option value="${f.id}">${i+1} · ${esc(this.getCopy(f.id).title)}</option>`).join('')}</select></label><div class="structure-features" aria-label="${esc(words.name+' · '+this.text.structure.choose)}">${profile.features.map((f,i)=>`<button type="button" data-scene-hit-target data-feature="${f.id}" data-world="${world}" aria-pressed="false"><span>${i+1}</span>${esc(this.getCopy(f.id).title)}</button>`).join('')}</div><div class="world-volume-window" tabindex="0" role="img" aria-label="${esc(words.name+' · '+this.text.structure.guide)}" data-volume-world="${world}"><span class="volume-window-note">${esc(this.text.structure.context)}</span><span class="volume-window-top">${profile.top} km · ${esc(this.text.structure.window)}</span>${world==='earth'?`<span class="volume-composition-key" hidden><span class="composition-water" data-composition-water>${esc(this.text.structure.compositionLocalWater)}</span><span class="composition-ozone" data-composition-ozone>${esc(this.text.structure.compositionLocalOzone)}</span><span>${esc(this.text.structure.compositionLocalNote)}</span></span>`:''}</div><div class="structure-selected"></div><footer><span>${values.pressure===null?esc(words.pressureNote):values.pressure.toLocaleString()+' hPa'}</span><span>${values.temperature===null?esc(words.temperatureNote):values.temperature+' °C'}</span></footer></section>`;
   }).join('');
   this.root.querySelector('.structure-scale')!.textContent=this.text.structure.shortScale;
  }
  const f=journeyFrame(state.journey);
  if(state.view==='layers'&&f.phase==='ascent')this.selected.set('earth',structureProfiles.earth.features[f.layer].id);
  this.root.classList.toggle('structure-labels-off',!labels);this.projectSelection();this.invalidate();
 }
 private projectSelection(){
  this.root.querySelector<HTMLElement>('.structure-composition-key')!.hidden=!this.composition;
  this.root.querySelectorAll<HTMLButtonElement>('button[data-feature]').forEach(b=>b.setAttribute('aria-pressed',String(this.selected.get(b.dataset.world as World)===b.dataset.feature)));
  for(const section of this.panel.querySelectorAll<HTMLElement>('.structure-world')){
   const world=section.dataset.world as World,id=this.selected.get(world)!,copy=this.getCopy(id),orbit=this.getOrbit(world),words=this.text.structure,conditions=this.getConditions(world);
   section.dataset.close=String(orbit.focus);
   const compositionKey=section.querySelector<HTMLElement>('.volume-composition-key');
   if(compositionKey)compositionKey.hidden=!this.composition||orbit.focus&&id!=='weather'&&id!=='ozone';
   const focus=section.querySelector<HTMLButtonElement>('[data-structure-action="focus"]')!;focus.textContent=orbit.focus?words.back:words.close;focus.setAttribute('aria-pressed',String(orbit.focus));
   const choice=section.querySelector<HTMLSelectElement>('[data-feature-choice]');if(choice)choice.value=id;
   section.querySelector('.volume-window-top')!.textContent=orbit.focus?copy.range:`${structureProfiles[world].top} km · ${words.window}`;
   section.querySelector('.volume-window-note')!.textContent=orbit.focus?('reference'in copy?copy.reference:words.focusNote):world==='earth'&&this.clues&&this.labels?words.earthContext:words.context;
   const controls=section.querySelector<HTMLElement>('.structure-conditions')!;
   if(controls.dataset.feature!==id){controls.dataset.feature=id;
    const weather=world==='earth'&&id==='weather',titan=world==='titan'&&id==='methane-cloud';
    controls.innerHTML=weather||titan?`<label><span>${esc(titan?words.titanWeather:words.weatherLabel)}</span><select data-condition="weather" data-world="${world}">${weather?`<option value="dry">${esc(words.weatherDry)}</option>`:''}<option value="cloud">${esc(titan?words.titanDry:words.weatherCloud)}</option><option value="rain">${esc(titan?words.titanRain:words.weatherRain)}</option></select></label>`:world==='earth'&&id==='aurora'?`<label class="aurora-input"><input type="checkbox" data-condition="aurora" data-world="earth">${esc(words.auroraInput)}</label>`:world==='earth'&&id==='meteor'?`<label><span>${esc(words.meteorLabel)}</span><select data-condition="meteor" data-world="earth"><option value="fade">${esc(words.meteorFade)}</option><option value="fragment">${esc(words.meteorFragment)}</option></select></label>`:'';
   }
   controls.hidden=!controls.children.length;
   const weather=controls.querySelector<HTMLSelectElement>('[data-condition="weather"]');if(weather)weather.value=conditions.weather;
   const aurora=controls.querySelector<HTMLInputElement>('[data-condition="aurora"]');if(aurora)aurora.checked=conditions.aurora;
   const meteor=controls.querySelector<HTMLSelectElement>('[data-condition="meteor"]');if(meteor)meteor.value=conditions.meteorOutcome;
   const visible=world==='earth'&&id==='weather'?words.weatherVisible[conditions.weather]:copy.visible;
   const frame=world==='earth'&&this.clues&&this.labels?this.mechanism:null;
   const cue=frame?.layer===0&&id==='weather'?(conditions.weather==='dry'?words.mechanismCues.dryWeather:words.mechanismCues.weather[frame.step])
     :frame?.layer===1&&id==='ozone'?words.mechanismCues.ozone[frame.step]
       :frame?.layer===3&&id==='aurora'?(frame.step===2&&!conditions.aurora?words.mechanismCues.noAurora:words.mechanismCues.thermosphere[frame.step]):'';
   const message=`<p>${esc(visible)}</p>`+(cue?`<p class="structure-mechanism-cue"><strong>${esc(words.mechanismCues.label)}</strong>${esc(cue)}</p>`:'');
   const caption=section.querySelector<HTMLElement>('.structure-selected')!;if(caption.innerHTML!==message)caption.innerHTML=message;
  }
  const active:World[]=this.state?.view==='worlds'?['earth',this.state.world]:['earth'];
  const key=active.map(world=>world+':'+this.selected.get(world)).join('|');if(this.notes.dataset.selection===key)return;this.notes.dataset.selection=key;
  this.notes.innerHTML=`<p class="structure-explanation-guide">${esc(this.text.structure.clueGuide)}</p><p>${esc(this.text.structure.compositionLimit)}</p>`+active.map(world=>{const copy=this.getCopy(this.selected.get(world)!);return `<section class="structure-focus"><p>${esc(this.text.worlds[world].name)} · ${esc(copy.range)}</p><h3>${esc(copy.title)}</h3><p><strong>${esc(this.text.structure.visibleLabel)}</strong> · ${esc(copy.visible)}</p><p><strong>${esc(this.text.structure.clueLabel)}</strong> · ${esc(copy.clue)}</p><p>${esc(copy.body)}</p></section>`;}).join('');
 }
 private prepare(){
  if(this.renderer||this.failed)return;
  try{
   this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.autoClear=false;
   this.renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{console.error('Atmosphere shader compilation failed',gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment));this.failed=true;this.projectFailure();};
   this.canvas.addEventListener('webglcontextlost',this.lostContext);this.canvas.addEventListener('webglcontextrestored',this.restored);
  }catch{this.failed=true;this.projectFailure();}
 }
 private retry(){
  this.canvas.removeEventListener('webglcontextlost',this.lostContext);this.canvas.removeEventListener('webglcontextrestored',this.restored);this.renderer?.dispose();this.renderer?.forceContextLoss();this.renderer=undefined;
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');this.canvas.replaceWith(canvas);this.canvas=canvas;this.failed=this.lost=false;this.projectFailure();
 }
 private projectFailure(){this.root.querySelector<HTMLElement>('.structure-failure')!.hidden=!this.failed&&!this.lost;this.root.dataset.renderer=this.failed||this.lost?'unavailable':'webgl';}
 private projectActivity(){const button=this.root.querySelector<HTMLButtonElement>('[data-structure-action="play"]')!;button.textContent=this.playing?this.text.structure.pause:this.text.structure.play;button.setAttribute('aria-pressed',String(this.playing));}
 private invalidate(){if(this.disposed)return;this.dirty=true;if(this.visible&&!document.hidden&&!this.frame)this.frame=requestAnimationFrame(this.tick);}
 private readonly tick=(now:number)=>{
  this.frame=0;if(this.disposed||!this.visible||document.hidden||this.lost||this.failed)return;
  const delta=this.last?Math.min(.1,(now-this.last)/1000):0;
  if(!this.last||delta>=1/24){if(this.playing)this.phase+=delta;this.last=now;if(this.dirty||this.playing){this.dirty=false;this.render();}}
  if(this.playing||this.dirty)this.frame=requestAnimationFrame(this.tick);
 };
 private render(){
  this.prepare();if(!this.renderer||this.failed||this.lost||!this.state)return;
  const bounds=this.canvas.parentElement!.getBoundingClientRect(),width=Math.round(bounds.width),height=Math.round(bounds.height);if(width<2||height<2)return;
  if(this.canvas.width!==Math.round(width*this.renderer.getPixelRatio())||this.canvas.height!==Math.round(height*this.renderer.getPixelRatio()))this.renderer.setSize(width,height,false);
  this.renderer.setScissorTest(false);this.renderer.setClearColor('#08131d');this.renderer.clear();this.renderer.setScissorTest(true);
  for(const window of this.panel.querySelectorAll<HTMLElement>('[data-volume-world]')){
   const world=window.dataset.volumeWorld as World,rect=window.getBoundingClientRect(),x=rect.left-bounds.left,y=height-(rect.bottom-bounds.top),w=rect.width,h=rect.height;if(w<2||h<2)continue;
   let model=this.models.get(world);if(!model){model=new AtmosphereStructureWorld(world);this.models.set(world,model);}
   const orbit=this.getOrbit(world),selected=this.selected.get(world)!,focus=phenomenonFocus(world,selected,this.phase),widthFit=focus.width/(w/h);
   // A portrait close-up shows a section of the long auroral arc rather than
   // shrinking the whole curtain until its rays become unreadable.
   const nearSpan=world==='earth'&&selected==='aurora'&&w/h<1.3?Math.max(focus.span,Math.min(widthFit,1.2)):Math.max(focus.span,widthFit);
   const overviewSpan=Math.max((displayHeight(world)+1.85)/2,4.8/(w/h));
   const span=(orbit.focus?nearSpan:overviewSpan)*orbit.zoom;
   window.dataset.focus=String(orbit.focus);
   const target=orbit.focus?new THREE.Vector3(focus.x,focus.y,focus.z):new THREE.Vector3(0,(displayHeight(world)-.85)/2,0);
   this.camera.left=-span*w/h;this.camera.right=span*w/h;this.camera.top=span;this.camera.bottom=-span;this.camera.near=.1;this.camera.far=60;
   this.camera.position.set(Math.sin(orbit.yaw)*14,Math.sin(orbit.pitch)*14,Math.cos(orbit.yaw)*14).add(target);this.camera.lookAt(target);this.camera.updateProjectionMatrix();
   // A completed explanation retains its evidence; it does not restart the
   // local mechanism or replace it with the independent scene activity.
   const mechanism=this.mechanism;
   model.update(this.selected.get(world)??null,this.phase,mechanism,world==='earth'&&!orbit.focus&&this.state.view==='layers'&&journeyFrame(this.state.journey).phase==='ascent'?journeyFrame(this.state.journey).height:null,{...this.getConditions(world),clues:this.clues&&this.labels,composition:world==='earth'&&this.composition,detail:orbit.focus});model.beforeRender(this.camera);
   this.renderer.setViewport(x,y,w,h);this.renderer.setScissor(x,y,w,h);this.renderer.render(model.scene,this.camera);
  }
  if(this.failed){this.projectFailure();return;}
  this.renders++;this.root.dataset.renderer='webgl';this.root.dataset.renderCount=String(this.renders);this.root.dataset.activeWorlds=[...this.models.keys()].join(',');this.root.dataset.geometryBytes=String([...this.models.values()].reduce((sum,model)=>sum+model.resourceBytes,0));this.root.dataset.phase=this.phase.toFixed(5);
 }
 private cancel(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}
 overview(){this.orbit.clear();this.selected.set('earth',structureProfiles.earth.features[0].id);this.projectSelection();this.persist();this.invalidate();}
 dispose(){if(this.disposed)return;this.disposed=true;this.cancel();this.observer.disconnect();for(const model of this.models.values())model.dispose();this.models.clear();
  this.canvas.removeEventListener('webglcontextlost',this.lostContext);this.canvas.removeEventListener('webglcontextrestored',this.restored);this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.root.removeEventListener('click',this.click);this.root.removeEventListener('change',this.change);this.reduced.removeEventListener('change',this.reducedChange);this.root.removeEventListener('pointerdown',this.down);this.root.removeEventListener('pointermove',this.move);this.root.removeEventListener('pointerup',this.up);this.root.removeEventListener('pointercancel',this.up);this.root.removeEventListener('wheel',this.wheel);this.root.removeEventListener('keydown',this.keyboard);
  document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('pagehide',this.pageHide);window.removeEventListener('pageshow',this.visibility);this.root.replaceChildren();
 }
}
