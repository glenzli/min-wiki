import { mountObservationMode } from '../../src/platform/observationMode.ts';
import { language, languageHref, translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
import data from './content.json';
import { readState, distanceAU, solarObservation, chapterFrom } from './model.ts';
import { StellarScene, type ViewState } from './scene.ts';
import { ThreeBodyExperiment } from './threeBody/controller.ts';
import './style.css';
translateDocument(t);mountTopicNavigation('stars');
const text=(value:{zh:string;en:string})=>language==='en'?value.en:value.zh;
const u=(key:keyof typeof data.ui)=>text(data.ui[key]);
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const initial=readState(location.search);
const state:ViewState={...initial,type:Math.round(initial.type),section:false,ratio:1,time:0,surfaceTime:0};
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
const surfaceButton=document.createElement('button');surfaceButton.type='button';observation.toolbar.insertBefore(surfaceButton,observation.button);
const motion=matchMedia('(prefers-reduced-motion: reduce)');let surfacePlaying=!motion.matches,surfaceFrame=0,surfaceLast=0,surfacePaint=0;
let playing=false,last=0,frame=0,disposed=false,scene:StellarScene|undefined;
function surfaceLabel(){surfaceButton.textContent=u(surfacePlaying?'pauseSurface':'playSurface');surfaceButton.setAttribute('aria-pressed',String(surfacePlaying));}
function surfaceTick(now:number){surfaceFrame=0;if(!surfacePlaying||document.hidden||disposed)return;state.surfaceTime+=Math.min(.1,(now-surfaceLast)/1000);surfaceLast=now;if(now-surfacePaint>=125){surfacePaint=now;if(state.chapter==='three-body')threeBody.setSurfaceTime(state.surfaceTime);else draw();}surfaceFrame=requestAnimationFrame(surfaceTick);}
function setSurface(active:boolean){surfacePlaying=active;cancelAnimationFrame(surfaceFrame);surfaceFrame=0;surfaceLabel();if(active&&!document.hidden&&!disposed){surfaceLast=performance.now();surfaceFrame=requestAnimationFrame(surfaceTick);}}
surfaceButton.onclick=()=>setSurface(!surfacePlaying);surfaceLabel();
try{scene=new StellarScene(el<HTMLCanvasElement>('stellar-canvas'),text);}catch{el('canvas-fallback').hidden=false;el('stellar-canvas').hidden=true;}
function writeUrl(){const url=new URL(location.href);url.searchParams.set('chapter',state.chapter);url.searchParams.set('distance',state.distance.toFixed(3));url.searchParams.set('type',String(state.type));url.searchParams.set('system',state.triple?'triple':'binary');history.replaceState(null,'',url);}
function draw(){if(state.chapter!=='three-body')scene?.draw(state);}
function stop(){playing=false;cancelAnimationFrame(frame);frame=0;el('play').textContent=u('play');el('play').setAttribute('aria-pressed','false');}
function toggle(){if(playing){stop();return;}if(disposed)return;playing=true;last=performance.now();el('play').textContent=u('pause');el('play').setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);}
function tick(now:number){frame=0;if(!playing||disposed||document.hidden)return;state.time+=Math.min(.08,(now-last)/1000)*.09;last=now;const slider=document.getElementById('phase') as HTMLInputElement|null;if(slider)slider.value=String(state.triple?state.time%40:state.time%1);draw();if(playing)frame=requestAnimationFrame(tick);}
function button(label:string,selected:boolean,onClick:()=>void){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(selected));b.onclick=onClick;return b;}
function slider(label:string,value:number,min:number,max:number,callback:(v:number)=>void,id?:string){const l=document.createElement('label');l.append(label);const input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.step='any';input.value=String(value);if(id)input.id=id;input.oninput=()=>{callback(Number(input.value));writeUrl();updateReadout();draw();};l.append(input);return l;}
function updateReadout(){
  const rows: [string,string][]=state.chapter==='sun'?(()=>{const o=solarObservation(distanceAU(state.distance));return [[u('angle'),o.angularDiameterDegrees.toFixed(4)+'°'],[u('delay'),(o.lightTravelSeconds/60).toFixed(1)+' min'],[u('flux'),(o.relativeIrradiance*100).toPrecision(3)+'%']] as [string,string][];})():
    state.chapter==='types'?[[u('radius'),String(data.types[state.type]!.radius)],[u('mass'),String(data.types[state.type]!.mass)],[u('temperature'),data.types[state.type]!.temp+' K']]:
    state.triple?[[u('separation'),'12 : 1'],[u('period'),Math.sqrt(12**3*2/3).toFixed(1)+' : 1'],[u('construction'),u('hierarchical')]]:[[u('ratio'),state.ratio.toFixed(2)],[u('mass')+' A','1'],[u('construction'),u('circular')]];
  el('readouts').replaceChildren(...rows.map(([label,value])=>{const div=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;strong.textContent=value;div.append(span,strong);return div;}));
}
function update(){
  const chapter=chapterFrom(state.chapter);el('chapters').replaceChildren(...data.chapters.map(ch=>button(text(ch.name),chapter===ch.id,()=>{stop();state.chapter=chapterFrom(ch.id);writeUrl();update();})));
  observatory.hidden=chapter==='three-body';threeBody.setActive(chapter==='three-body');if(chapter==='three-body'){stop();return;}
  el('play').hidden=chapter!=='orbits';el('play').textContent=u(playing?'pause':'play');
  el('scene-title').textContent=u(chapter==='sun'?'sunTitle':chapter==='types'?'typesTitle':'orbitsTitle');
  el('context').textContent=u(chapter==='sun'?'sunContext':chapter==='types'?'typesContext':'orbitsContext');
  el('scale-note').textContent=u(chapter==='sun'?'sunScale':chapter==='types'?(state.section?'sectionScale':'typeScale'):'orbitScale');
  layerKey.hidden=chapter!=='types'||!state.section;
  layerKey.replaceChildren(...(layerKey.hidden?[]:data.types[state.type]!.layers.map(layer=>{const item=document.createElement('li');item.textContent=text(layer.name);return item;})));
  const controls=el('controls');controls.replaceChildren();
  if(chapter==='sun')controls.append(slider(u('distance'),state.distance,0,1,v=>state.distance=v));
  if(chapter==='types'){for(const [index,model]of data.types.entries())controls.append(button(text(model.name),state.type===index,()=>{state.type=index;writeUrl();update();}));controls.append(button(u(state.section?'compare':'section'),state.section,()=>{state.section=!state.section;update();}));}
  if(chapter==='orbits'){controls.append(button(u('binary'),!state.triple,()=>{state.triple=false;writeUrl();update();}),button(u('triple'),state.triple,()=>{state.triple=true;writeUrl();update();}));if(!state.triple)controls.append(slider(u('ratio'),state.ratio,.25,4,v=>state.ratio=v));controls.append(slider(u('phase'),state.triple?state.time%40:state.time%1,0,state.triple?40:1,v=>{stop();state.time=v;},'phase'));}
  el('explain-title').textContent=chapter==='types'?text(data.types[state.type]!.name):el('scene-title').textContent;
  el('explain').textContent=chapter==='sun'?u('sunExplain'):chapter==='types'?text(data.types[state.type]!.description):u('orbitExplain');
  el('boundary').textContent=chapter==='sun'?u('sunBoundary'):chapter==='types'?u('sectionScale'):u('orbitBoundary');
  el<HTMLAnchorElement>('source').href=chapter==='sun'?'https://science.nasa.gov/sun/facts/':chapter==='types'?'https://science.nasa.gov/universe/stars/types/':'https://www.nasa.gov/universe/nasas-tess-spots-record-breaking-stellar-triplets/';
  updateReadout();draw();
}
el('play').onclick=toggle;
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();setSurface(false);threeBody.suspend();}else if(!disposed&&state.chapter==='three-body')threeBody.setActive(true);});
window.addEventListener('pagehide',event=>{stop();setSurface(false);threeBody.suspend();if(!event.persisted){disposed=true;scene?.dispose();threeBody.dispose();}});
window.addEventListener('pageshow',()=>{if(!disposed){draw();threeBody.setActive(state.chapter==='three-body');}});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches){stop();setSurface(false);threeBody.suspend();}});
window.addEventListener('popstate',()=>{stop();Object.assign(state,readState(location.search));state.type=Math.round(state.type);update();});
for(const a of document.querySelectorAll<HTMLAnchorElement>('.next-links a'))a.href=languageHref(a.getAttribute('href')!);
update();setSurface(surfacePlaying);
