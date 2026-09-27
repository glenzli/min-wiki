import { mountObservationMode } from '../../src/platform/observationMode.ts';
import { mountSceneReading } from '../../src/platform/sceneReading.ts';
import { language, languageHref, translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
import data from './content.json';
import evolutionWords from './evolutionContent.json';
import anatomyWords from './anatomyContent.json';
import {evolutionState,PHASES,type Track} from './evolutionModel.ts';
import { readState, distanceAU, solarObservation, chapterFrom } from './model.ts';
import {ORBIT_CASES} from './orbitSystems.ts';
import { StellarScene, type ViewState } from './scene.ts';
import { ThreeBodyExperiment } from './threeBody/controller.ts';
import { anatomyStudies, evolutionStudy, orbitStudies, threeBodyStudy, sunDistanceStudy, typesStudy } from './study.ts';
import './style.css';
translateDocument(t);mountTopicNavigation('stars');
const text=(value:{zh:string;en:string})=>language==='en'?value.en:value.zh;
const u=(key:keyof typeof data.ui)=>text(data.ui[key]);
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const initial=readState(location.search);
const state:ViewState={...initial,type:Math.round(initial.type),section:false,time:0,surfaceTime:0};
const observatory=document.querySelector<HTMLElement>('.observatory')!;
const threeBody=new ThreeBodyExperiment(text);observatory.after(threeBody.root);
const layerKey=document.createElement('ol');layerKey.className='stellar-layer-key';layerKey.hidden=true;el('stellar-canvas').after(layerKey);
const surfaceNote=document.createElement('p');surfaceNote.className='scale-note';surfaceNote.textContent=u('surfaceNote');layerKey.after(surfaceNote);
const observationRoot=document.createElement('section');observationRoot.id='stellar-observation';observationRoot.setAttribute('aria-label',u('workspace'));
observatory.before(observationRoot);observationRoot.append(el('chapters'),observatory,threeBody.root);
const stage=document.createElement('div');stage.className='stellar-stage';const notes=document.createElement('aside');notes.className='stellar-notes';
stage.append(observatory.querySelector('.scene-heading')!,el('stellar-canvas'),el('canvas-fallback'),el('scale-note'),el('controls'));
notes.append(layerKey,surfaceNote,el('readouts'),observatory.querySelector('.explanation')!);observatory.append(stage,notes);
const observation=mountObservationMode(observationRoot,{enter:u('immersive'),exit:u('exitImmersive')},{fit:true,panels:[{label:u('explanation'),elements:[notes,threeBody.notes]}]});
const observationTitle=document.createElement('strong');observationTitle.className='observation-title';observationTitle.textContent=t('恒星与多星系统');observation.toolbar.prepend(observationTitle);
const threeIntro=threeBody.notes.querySelector<HTMLElement>('.scale-note')!;
const reading=mountSceneReading(observationRoot,{id:'stellar-science-guide',childTarget:el('explain')});
const threeDetail=threeBody.notes.querySelector<HTMLElement>('.explanation')!;
reading.element.append(threeDetail);
const surfaceButton=document.createElement('button');surfaceButton.type='button';observation.toolbar.insertBefore(surfaceButton,observation.button);
const motion=matchMedia('(prefers-reduced-motion: reduce)');let surfacePlaying=!motion.matches,surfaceFrame=0,surfaceLast=0,surfacePaint=0;
let playing=false,last=0,frame=0,evolutionReadoutAt=0,disposed=false,scene:StellarScene|undefined;
function surfaceLabel(){surfaceButton.textContent=u(surfacePlaying?'pauseSurface':'playSurface');surfaceButton.setAttribute('aria-pressed',String(surfacePlaying));}
function surfaceTick(now:number){surfaceFrame=0;if(!surfacePlaying||document.hidden||disposed)return;state.surfaceTime+=Math.min(.1,(now-surfaceLast)/1000);surfaceLast=now;if(now-surfacePaint>=125){surfacePaint=now;if(state.chapter==='three-body')threeBody.setSurfaceTime(state.surfaceTime);else draw();}surfaceFrame=requestAnimationFrame(surfaceTick);}
function setSurface(active:boolean){surfacePlaying=active;cancelAnimationFrame(surfaceFrame);surfaceFrame=0;surfaceLabel();if(active&&!document.hidden&&!disposed){surfaceLast=performance.now();surfaceFrame=requestAnimationFrame(surfaceTick);}}
surfaceButton.onclick=()=>setSurface(!surfacePlaying);surfaceLabel();
try{scene=new StellarScene(el<HTMLCanvasElement>('stellar-canvas'),text);}catch{el('canvas-fallback').hidden=false;el('stellar-canvas').hidden=true;}
function writeUrl(){const url=new URL(location.href);url.searchParams.set('chapter',state.chapter);url.searchParams.set('distance',state.distance.toFixed(3));url.searchParams.set('type',String(state.type));url.searchParams.set('orbit',state.orbitCase);url.searchParams.delete('system');url.searchParams.set('track',state.evolutionTrack);url.searchParams.set('evolution',state.evolutionProgress.toFixed(5));url.searchParams.set('focus',String(state.anatomyFocus));history.replaceState(null,'',url);}
function draw(){if(state.chapter!=='three-body')scene?.draw(state);}
function stop(){playing=false;cancelAnimationFrame(frame);frame=0;el('play').textContent=state.chapter==='evolution'?evolveText(evolutionWords.ui[state.evolutionProgress>=1?'restart':'play']):u('play');el('play').setAttribute('aria-pressed','false');}
function toggle(){if(playing){stop();return;}if(disposed)return;if(state.chapter==='evolution'&&state.evolutionProgress>=1){state.evolutionProgress=0;updateEvolutionCopy();updateReadout();writeUrl();draw();}playing=true;last=performance.now();el('play').textContent=state.chapter==='evolution'?evolveText(evolutionWords.ui.pause):u('pause');el('play').setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);}
function tick(now:number){frame=0;if(!playing||disposed||document.hidden)return;const dt=Math.min(.08,(now-last)/1000);last=now;
  if(state.chapter==='evolution'){const before=Math.floor(state.evolutionProgress*6);state.evolutionProgress=Math.min(1,state.evolutionProgress+dt/16);const control=el<HTMLInputElement>('evolution-progress');control.value=String(state.evolutionProgress);if(Math.floor(state.evolutionProgress*6)!==before)updateEvolutionCopy();if(now-evolutionReadoutAt>120){updateReadout();evolutionReadoutAt=now;}draw();if(state.evolutionProgress>=1){stop();updateReadout();writeUrl();return;}}
  else {state.time+=dt*.25;const control=document.getElementById('phase') as HTMLInputElement|null;if(control)control.value=String(state.time%40);draw();}
  if(playing)frame=requestAnimationFrame(tick);
}
function button(label:string,selected:boolean,onClick:()=>void){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(selected));b.onclick=onClick;return b;}
function slider(label:string,value:number,min:number,max:number,callback:(v:number)=>void,id?:string){const l=document.createElement('label');l.append(label);const input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.step='any';input.value=String(value);if(id)input.id=id;input.oninput=()=>{callback(Number(input.value));writeUrl();updateReadout();draw();};l.append(input);return l;}
const evolveText=(value:{zh:string;en:string})=>text(value);
function ageLabel(age:number){const locale=language==='en'?'en':'zh',n=(v:number)=>v.toLocaleString(locale==='en'?'en-US':'zh-CN',{maximumSignificantDigits:3}),e=evolutionWords.ui;
  if(locale==='zh')return age>=1e8?`${n(age/1e8)} ${e.elapsed.zh}`:age>=1e4?`${n(age/1e4)} ${e.tenThousand.zh}`:`${n(age)} ${e.years.zh}`;
  return age>=1e9?`${n(age/1e9)} ${e.elapsed.en}`:age>=1e6?`${n(age/1e6)} ${e.million.en}`:`${n(age)} ${e.years.en}`;
}
function updateReadout(){
  const rows: [string,string][]=state.chapter==='evolution'?(()=>{const e=evolutionState(state.evolutionTrack,state.evolutionProgress),ui=evolutionWords.ui;
    const neutron=e.phaseIndex===6&&e.remnant==='neutron-star',blackHole=e.phaseIndex===6&&e.remnant==='black-hole';
    const radius=e.phaseIndex===0?evolveText(ui.cloudExtent):blackHole?evolveText(ui.blackHoleExtent):neutron?evolveText(ui.neutronReadout):`${e.radiusSolar.toLocaleString(language==='en'?'en-US':'zh-CN',{maximumSignificantDigits:3})} R☉`;
    return [[evolveText(ui.age),ageLabel(e.ageYears)],[evolveText(neutron||blackHole?ui.remnantSize:ui.radius),radius],[evolveText(ui.fuel),e.phaseIndex<2?evolveText(e.phaseIndex===1&&state.evolutionTrack!=='solar'?ui.fusionMayOverlap:ui.notStarted):e.coreFuel<=0?evolveText(ui.exhausted):`${Math.round(e.coreFuel*100)}% ${evolveText(ui.remaining)}`]] as [string,string][];})():
    state.chapter==='anatomy'?(()=>{const a=anatomyWords.features[state.anatomyFocus]!;return [[evolveText(anatomyWords.ui.location),evolveText(a.location)],[evolveText(anatomyWords.ui.cause),evolveText(a.cause)],[evolveText(anatomyWords.ui.observe),evolveText(a.observe)]] as [string,string][];})():
    state.chapter==='sun'?(()=>{const o=solarObservation(distanceAU(state.distance));return [[u('angle'),o.angularDiameterDegrees.toFixed(4)+'°'],[u('delay'),(o.lightTravelSeconds/60).toFixed(1)+' min'],[u('flux'),(o.relativeIrradiance*100).toPrecision(3)+'%']] as [string,string][];})():
    state.chapter==='types'?[[u('radius'),String(data.types[state.type]!.radius)],[u('mass'),String(data.types[state.type]!.mass)],[u('temperature'),data.types[state.type]!.temp+' K']]:
    [[u('starsCount'),String(state.orbitCase==='hierarchical'?3:2)],[u('planetsCount'),String(state.orbitCase==='circumbinary'?3:1)],[u('planetPath'),text(data.orbitCases[state.orbitCase].planetPath)]];
  el('readouts').replaceChildren(...rows.map(([label,value])=>{const div=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;strong.textContent=value;div.append(span,strong);return div;}));
}
function update(){
  const chapter=chapterFrom(state.chapter);el('chapters').replaceChildren(...data.chapters.map(ch=>button(text(ch.name),chapter===ch.id,()=>{stop();state.chapter=chapterFrom(ch.id);writeUrl();update();})));
  reading.setChildTarget(chapter==='three-body'?threeIntro:el('explain'));
  threeDetail.hidden=chapter!=='three-body';
  observatory.hidden=chapter==='three-body';threeBody.setActive(chapter==='three-body');if(chapter==='three-body'){reading.set(threeBodyStudy);stop();return;}
  surfaceNote.hidden=chapter==='evolution'||chapter==='anatomy';
  el('play').hidden=chapter!=='orbits'&&chapter!=='evolution';el('play').textContent=chapter==='evolution'?evolveText(evolutionWords.ui[playing?'pause':state.evolutionProgress>=1?'restart':'play']):u(playing?'pause':'play');
  const controls=el('controls');controls.replaceChildren();controls.className='controls';
  if(chapter==='evolution'){
    const ui=evolutionWords.ui,trackWords=evolutionWords.tracks[state.evolutionTrack],select=document.createElement('select');select.setAttribute('aria-label',evolveText(ui.title));
    for(const track of ['solar','massive','very-massive'] as const){const option=document.createElement('option');option.value=track;option.textContent=evolveText(evolutionWords.tracks[track].name);select.append(option);}select.value=state.evolutionTrack;
    select.onchange=()=>{stop();state.evolutionTrack=select.value as Track;writeUrl();update();};controls.classList.add('evolution-controls');controls.append(select);
    const phases=document.createElement('div');phases.className='evolution-phases';for(let i=0;i<PHASES.length;i++){const b=button(evolveText(trackWords.stages[i]!.name),Math.floor(state.evolutionProgress*6)===i,()=>{stop();state.evolutionProgress=i/6;writeUrl();update();});phases.append(b);}controls.append(phases);
    const progress=slider(evolveText(ui.progress),state.evolutionProgress,0,1,v=>{state.evolutionProgress=v;stop();updateEvolutionCopy();},'evolution-progress');controls.append(progress);
    el('scene-title').textContent=evolveText(ui.title);el('context').textContent=evolveText(ui.context);el('scale-note').textContent=evolveText(state.evolutionTrack==='solar'?ui.scale:ui.scaleMassive);updateEvolutionCopy();updateReadout();draw();return;
  }
  if(chapter==='anatomy'){
    const ui=anatomyWords.ui;controls.classList.add('anatomy-controls');for(const [i,feature]of anatomyWords.features.entries())controls.append(button(evolveText(feature.name),state.anatomyFocus===i,()=>{state.anatomyFocus=i;writeUrl();update();}));
    const focus=anatomyWords.features[state.anatomyFocus]!;el('scene-title').textContent=evolveText(ui.title);el('context').textContent=evolveText(ui.context);el('scale-note').textContent=evolveText(ui.scale);
    el('explain-title').textContent=evolveText(focus.name);el('explain').textContent=evolveText(focus.body);el('boundary').textContent=evolveText(focus.boundary);el<HTMLAnchorElement>('source').href=focus.source;reading.set(anatomyStudies[state.anatomyFocus]!);updateReadout();draw();return;
  }
  el('scene-title').textContent=u(chapter==='sun'?'sunTitle':chapter==='types'?'typesTitle':'orbitsTitle');
  el('context').textContent=u(chapter==='sun'?'sunContext':chapter==='types'?'typesContext':'orbitsContext');
  el('scale-note').textContent=u(chapter==='sun'?'sunScale':chapter==='types'?(state.section?'sectionScale':'typeScale'):'orbitScale');
  layerKey.hidden=chapter!=='types'||!state.section;
  layerKey.replaceChildren(...(layerKey.hidden?[]:data.types[state.type]!.layers.map(layer=>{const item=document.createElement('li');item.textContent=text(layer.name);return item;})));
  if(chapter==='sun')controls.append(slider(u('distance'),state.distance,0,1,v=>state.distance=v));
  if(chapter==='types'){for(const [index,model]of data.types.entries())controls.append(button(text(model.name),state.type===index,()=>{state.type=index;writeUrl();update();}));controls.append(button(u(state.section?'compare':'section'),state.section,()=>{state.section=!state.section;update();}));}
  if(chapter==='orbits'){controls.classList.add('orbit-controls');for(const kind of ORBIT_CASES)controls.append(button(text(data.orbitCases[kind].name),state.orbitCase===kind,()=>{stop();state.orbitCase=kind;state.time=0;writeUrl();update();}));controls.append(slider(u('phase'),state.time%40,0,40,v=>{stop();state.time=v;},'phase'));}
  el('explain-title').textContent=chapter==='types'?text(data.types[state.type]!.name):el('scene-title').textContent;
  el('explain').textContent=chapter==='sun'?u('sunExplain'):chapter==='types'?text(data.types[state.type]!.description):text(data.orbitCases[state.orbitCase].explain);
  el('boundary').textContent=chapter==='sun'?u('sunBoundary'):chapter==='types'?u('sectionScale'):text(data.orbitCases[state.orbitCase].boundary);
  el<HTMLAnchorElement>('source').href=chapter==='sun'?'https://science.nasa.gov/sun/facts/':chapter==='types'?'https://science.nasa.gov/universe/stars/types/':data.orbitCases[state.orbitCase].source;
  reading.set(chapter==='sun'?sunDistanceStudy:chapter==='types'?typesStudy:orbitStudies[state.orbitCase]);
  updateReadout();draw();
}
function updateEvolutionCopy(){const track=evolutionWords.tracks[state.evolutionTrack],stage=Math.min(6,Math.floor(state.evolutionProgress*6)),words=track.stages[stage]!;
  el('explain-title').textContent=evolveText(words.name);el('explain').textContent=evolveText(words.body);el('boundary').textContent=evolveText(track.summary);
  el<HTMLAnchorElement>('source').href=stage<=1?evolutionWords.sources.formation:state.evolutionTrack==='very-massive'&&stage===6?evolutionWords.sources.accretion:state.evolutionTrack==='solar'&&stage===4?evolutionWords.sources.planets:stage>=5?evolutionWords.sources.remnants:evolutionWords.sources.life;
  [...el('controls').querySelectorAll<HTMLButtonElement>('.evolution-phases button')].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===stage)));
  reading.set(evolutionStudy(state.evolutionTrack,stage));
}
el('play').onclick=toggle;
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();setSurface(false);threeBody.suspend();}else if(!disposed&&state.chapter==='three-body')threeBody.setActive(true);});
window.addEventListener('pagehide',event=>{stop();setSurface(false);threeBody.suspend();if(!event.persisted){disposed=true;scene?.dispose();threeBody.dispose();}});
window.addEventListener('pageshow',()=>{if(!disposed){draw();threeBody.setActive(state.chapter==='three-body');}});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches){stop();setSurface(false);threeBody.suspend();}});
window.addEventListener('popstate',()=>{stop();Object.assign(state,readState(location.search));state.type=Math.round(state.type);update();});
for(const a of document.querySelectorAll<HTMLAnchorElement>('.next-links a'))a.href=languageHref(a.getAttribute('href')!);
update();setSurface(surfacePlaying);
