import { mountObservationMode } from '../../src/platform/observationMode.ts';
import { mountSceneReading } from '../../src/platform/sceneReading.ts';
import { language, languageHref, translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { AtmosphereScene } from './scene.ts';
import { AtmosphereProfiles } from './profileView.ts';
import { AtmosphereStructureView } from './structureView.ts';
import { LayerMechanism } from './layerMechanism.ts';
import { advanceJourney, railPosition, APPROACH_END, journeyFrame, journeyAtHeight, heightPosition, heightFromPosition, layerStops, parseRoute, profile, routeQuery, worlds, type View, type ComparisonWorld, type Settings } from './model.ts';
import translations from './content.json';
import { overviewStudy, structureStudy, layerStudies, worldStudies } from './study.ts';
import './style.css';

translateDocument(t);
import {mountConditionsEntry} from '../earth/conditions/entry.ts';
mountConditionsEntry(document.querySelector<HTMLElement>('.atmo-workspace')?.parentElement??null);
const text=language==='en'?translations.en:translations.zh,journeyText=text.journey;
const el=(id:string)=>document.getElementById(id)!;
const input=(id:string)=>el(id) as HTMLInputElement;
const set=(id:string,value:string)=>{if(el(id).textContent!==value)el(id).textContent=value;};
let state=parseRoute(location.search),playing=false,frame=0,last=0,lastUI=0,holdRemaining=0;
let scene:AtmosphereScene|undefined;
function createScene(){try{scene=new AtmosphereScene(el('atmo-canvas') as HTMLCanvasElement,text);el('render-error').hidden=true;draw();}catch(error){el('render-error').hidden=false;console.error(error);}}
const workspace=document.querySelector<HTMLElement>('.atmo-workspace')!,inspector=document.querySelector<HTMLElement>('.atmo-inspector')!,stage=document.querySelector<HTMLElement>('.atmo-stage')!;
// The Reader supplies the current title; the authored introduction stays in its explanation panel.
inspector.prepend(document.querySelector<HTMLElement>('.atmo-hero')!);
const observationRoot=document.createElement('section');observationRoot.id='atmo-observation';observationRoot.setAttribute('aria-label',t('大气观察'));
workspace.before(observationRoot);observationRoot.append(document.querySelector('.atmo-tabs')!,document.querySelector('.atmo-options')!,workspace);
inspector.append(document.querySelector('.atmo-story')!);
const worldNotes=document.createElement('div');worldNotes.setAttribute('aria-live','polite');inspector.append(worldNotes);
inspector.append(el('atmo-profiles'));
const profiles=new AtmosphereProfiles(el('atmo-profiles'),text);
const structure=new AtmosphereStructureView(el('atmo-structure'),text,worldNotes,layer=>seek(journeyAtHeight(layerStops[layer])));
const mechanism=new LayerMechanism(el('layer-mechanism'),text.mechanisms,text.layers,()=>{if(!playing)draw();});
observationRoot.dataset.readerWorkbench='';observationRoot.dataset.readerLayout='stage';workspace.dataset.readerLayout='stage';
stage.removeAttribute('data-reader-stage');stage.dataset.readerMain='';inspector.dataset.readerSupport='';
const atmosphereVisual=document.createElement('div');atmosphereVisual.className='atmo-visual';atmosphereVisual.dataset.readerStage='';atmosphereVisual.dataset.readerFit='natural';
const journeyVisual=el('journey-visual');journeyVisual.dataset.readerStage='';journeyVisual.dataset.readerFit='available';
atmosphereVisual.append(journeyVisual,el('atmo-structure'));
const atmosphereEssential=document.createElement('div');atmosphereEssential.className='atmo-essential';atmosphereEssential.dataset.readerEssential='';
atmosphereEssential.append(stage.querySelector('.atmo-caption')!,el('journey-controls'),el('journey-clue'),el('transport'),el('render-error'));
stage.append(atmosphereVisual,atmosphereEssential);
// Mount reading before the observation toolbar so its authored switch stays
// inline. Common choices remain explicit rather than reopening a disclosure.
const reading=mountSceneReading(observationRoot,{id:'atmo-science-guide',childTarget:el('story'),controls:document.querySelector<HTMLElement>('.modes')!});
const observation=mountObservationMode(observationRoot,{enter:t('沉浸演示'),exit:t('退出沉浸 · Esc')},{fit:true,choices:[document.querySelector<HTMLElement>('.atmo-tabs')!,el('layer-display'),el('world-controls')],panels:[{label:t('解说'),elements:[inspector]}]});
// Relocate the authored controls once: changing a lens never replaces a scene.
inspector.prepend(document.querySelector('.modes')!);
const annotationControl=input('labels').closest('label')!;annotationControl.classList.add('atmo-annotations');
observation.toolbar.prepend(annotationControl);
document.querySelector('.atmo-options')!.remove();
function revealAcademic(){if(reading.mode==='academic'){const control=observation.toolbar.querySelector<HTMLButtonElement>(`button[aria-controls~="${inspector.id}"]`);if(control?.getAttribute('aria-expanded')==='false')control.click();}}
document.querySelector('.modes')!.addEventListener('click',revealAcademic);revealAcademic();
let studyKey='';
function saveRoute(){const url=new URL(location.href);for(const key of ['height','humidity','lift','wind','motion','p'])url.searchParams.delete(key);routeQuery(state).forEach((v,k)=>url.searchParams.set(k,v));history.replaceState(null,'',url);}
function stop(){holdRemaining=0;playing=false;cancelAnimationFrame(frame);frame=0;}
function readings(items:[string,string][]){const frag=document.createDocumentFragment();for(const [term,value]of items){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=value;frag.append(dt,dd);}el('readings').replaceChildren(frag);}
function draw(){
 const expanded=state.view==='worlds'||state.display==='structure';
 el('atmo-canvas').hidden=expanded;
 if(!expanded){if(!scene)createScene();else scene.draw(state,input('labels').checked,mechanism.current());}
 structure.draw(state,input('labels').checked,mechanism.current(),expanded);
 profiles.draw(state,input('labels').checked);
}
const rail=el('height-rail');
const railTitle=document.createElement('strong');railTitle.textContent=journeyText.rail;
const track=document.createElement('div');track.className='height-track';
for(const layer of [...text.layers].reverse()){const band=document.createElement('div');band.className='height-band';band.textContent=layer.name;track.append(band);}
const marker=document.createElement('span');marker.className='height-marker';marker.textContent='◀';marker.setAttribute('aria-hidden','true');track.append(marker);
const ground=document.createElement('strong');ground.textContent='▰ '+journeyText.ground;
const note=document.createElement('small');note.textContent=journeyText.railNote;
rail.append(railTitle,track,ground,note);
function update(save=false){
 observationRoot.dataset.view=state.view;observationRoot.dataset.display=state.display;
 const expanded=state.view==='worlds'||state.display==='structure';
 const mechanismParent=expanded?inspector:document.querySelector('.journey-window')!;
 if(el('layer-mechanism').parentElement!==mechanismParent)mechanismParent.append(el('layer-mechanism'));
 (el('display-choice') as HTMLSelectElement).value=state.display;el('layer-display').hidden=state.view!=='layers';
 const f=journeyFrame(state.journey),layer=text.layers[f.layer];
 const atLayerStop=Math.abs(f.height-layerStops[f.layer])<.02;
 mechanism.show(state.view==='layers'&&f.phase==='ascent'?f.layer:null,!playing||(holdRemaining>0&&atLayerStop));
 el('journey-visual').hidden=expanded;el('journey-clue').hidden=expanded;
 marker.style.bottom=`${railPosition(f.height)*100}%`;
 track.querySelectorAll('.height-band').forEach((b,i)=>b.classList.toggle('current',f.phase==='ascent'&&4-i===f.layer));
 const clueIndex=f.phase!=='ascent'||f.height<1?0:f.layer+1;
 set('journey-clue',`${holdRemaining>0?journeyText.holding:journeyText.above+' · '+f.height.toFixed(f.height<10?1:0)+' km'} — ${journeyText.clues[clueIndex]}`);
 el('world-controls').hidden=state.view!=='worlds';el('journey-controls').hidden=state.view!=='layers'||expanded;
 el('transport').hidden=state.view!=='layers';el('render-error').hidden=!!scene||expanded;
 document.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
 el('science').hidden=true;
 (el('world-choice') as HTMLSelectElement).value=state.world;
 input('progress').value=String((expanded?heightPosition(f.height):state.journey)*1000);set('play',expanded?(playing?text.structure.scanPause:text.structure.scanPlay):playing?journeyText.pause:journeyText.play);
 set('reset',expanded?text.structure.overview:t('回到开始'));
 set('scrub-label',expanded?text.structure.scan:t('地球到太空的旅程'));
 set('journey-position',expanded&&f.phase!=='ascent'?text.structure.cutaway:f.phase==='overview'?journeyText.overview:f.phase==='approach'?journeyText.approach:`${layer.name} · ${f.height.toFixed(f.height<10?1:0)} km`);
 input('progress').setAttribute('aria-valuetext',el('journey-position').textContent!);
 el('layer-stops').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(f.phase==='ascent'&&f.layer===i)));
 el('overview').setAttribute('aria-pressed',String(f.phase==='overview'));el('surface').setAttribute('aria-pressed',String(Math.abs(state.journey-APPROACH_END)<1e-6));
 const link=el('next-link') as HTMLAnchorElement;
 if(state.view==='layers'){
  set('projection',expanded?text.structure.cutaway:journeyText.projection);set('caution',expanded?text.structure.earthScale:journeyText.boundary);
  set('observation-title',f.phase==='ascent'?layer.name:expanded?text.structure.cutaway:journeyText.overview);
  set('observation',f.phase==='ascent'?layer.key:expanded?text.structure.earthScale:journeyText.overviewGuide);
  set('story-title',f.phase==='ascent'?layer.feature:journeyText.question);
  const p=profile(f.height);
  readings(f.phase==='ascent'?[[t('观察高度'),`${f.height.toFixed(1)} km`],[t('参考温度'),p.temperature===null?t('随环境变化'):`${p.temperature.toFixed(1)} °C`],[t('参考压力'),p.pressure===null?t('未外推'):`${p.pressure<1?p.pressure.toPrecision(3):p.pressure.toFixed(1)} hPa`]]:expanded?[[t('观察范围'),'0–1000 km'],[t('地表参照'),t('教学重建')]]:[[journeyText.anchor,journeyText.site],[journeyText.camera,journeyText.cameraDescription]]);
  set('next-link',journeyText.compare);link.href=languageHref(`/topics/atmosphere/?view=worlds&world=${state.world}&journey=${state.journey.toFixed(6)}`);
 }else{
  const w=worlds[state.world],words=text.worlds[state.world];
  set('observation-title',words.name);set('observation',words.composition);
  readings([[t('代表地表压力'),w.pressure===null?words.pressureNote:`${w.pressure.toLocaleString(language)} hPa`],[t('代表地表温度'),w.temperature===null?words.temperatureNote:`${w.temperature} °C`],[t('云与液体'),words.cloud]]);
  set('story-title',t('用同样的问题，看不同的天空'));
  set('caution',t('成分相近，不代表大气量相同。月球和土卫六是卫星；近真空不等于绝对没有粒子。'));
  set('projection',text.structure.comparison);
  set('next-link',t('到太阳系里，继续观察这个世界 →'));link.href=languageHref(`/topics/solar-system/?body=${w.worldId}&view=globe`);
 }
 const nextStudyKey=state.view==='worlds'?`world:${state.world}`:state.display+':'+(f.phase==='ascent'?`layer:${f.layer}`:'overview');
 if(nextStudyKey!==studyKey){studyKey=nextStudyKey;reading.set(state.view==='worlds'?worldStudies[state.world]!:f.phase==='ascent'?layerStudies[f.layer]!:expanded?structureStudy:overviewStudy);}
 draw();if(save)saveRoute();
}
function tick(now:number){
 frame=0;if(!playing||document.hidden)return;
 const dt=Math.min((now-last)/1000,.08);last=now;if(holdRemaining>0)holdRemaining=Math.max(0,holdRemaining-dt);
 else{const step=advanceJourney(state.journey,dt/55);state.journey=step.position;if(step.hold)holdRemaining=Math.abs(step.position-APPROACH_END)<1e-8?3:9;}
 if(state.journey===1)playing=false;
 draw();if(now-lastUI>100||!playing){update(!playing);lastUI=now;}if(playing)frame=requestAnimationFrame(tick);
}
function toggle(){if(playing){stop();update(true);return;}if(state.journey>=1)state.journey=state.display==='structure'?APPROACH_END:0;else if(state.display==='structure'&&state.journey<APPROACH_END)state.journey=APPROACH_END;playing=true;last=performance.now();frame=requestAnimationFrame(tick);update();}
function setView(view:View){stop();state.view=view;update(true);}
function seek(position:number){stop();state.journey=position;update(true);}
document.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view as View)));
el('next-link').addEventListener('click',e=>{if(state.view==='layers'){e.preventDefault();setView('worlds');}});
el('play').addEventListener('click',toggle);el('reset').addEventListener('click',()=>{seek(0);if(state.display==='structure')structure.overview();});el('overview').addEventListener('click',()=>seek(0));el('surface').addEventListener('click',()=>seek(APPROACH_END));
el('progress').addEventListener('input',()=>{const value=Number(input('progress').value)/1000;seek(state.display==='structure'?journeyAtHeight(heightFromPosition(value)):value);});
el('display-choice').addEventListener('change',()=>{stop();state.display=(el('display-choice') as HTMLSelectElement).value as Settings['display'];update(true);});
el('world-choice').addEventListener('change',()=>{state.world=(el('world-choice') as HTMLSelectElement).value as ComparisonWorld;update(true);});
el('labels').addEventListener('change',()=>update());el('retry').addEventListener('click',createScene);
el('layer-stops').replaceChildren(...text.layers.map((layer,i)=>{const b=document.createElement('button');b.textContent=layer.name;b.addEventListener('click',()=>seek(journeyAtHeight(layerStops[i])));return b;}));
window.addEventListener('popstate',()=>{stop();state=parseRoute(location.search);update();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;saveRoute();}else if(playing){last=performance.now();frame=requestAnimationFrame(tick);}});
window.addEventListener('pagehide',e=>{cancelAnimationFrame(frame);frame=0;saveRoute();if(!e.persisted){stop();scene?.dispose();profiles.dispose();structure.dispose();mechanism.dispose();}});
window.addEventListener('pageshow',()=>{if(playing&&!frame){last=performance.now();frame=requestAnimationFrame(tick);}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!(e.target as HTMLElement).closest('input,button,select,a,textarea,[contenteditable]')&&state.view==='layers'){e.preventDefault();toggle();}});
// Initial state is still. Reduced-motion users can select each stop without any tween.
update();saveRoute();
