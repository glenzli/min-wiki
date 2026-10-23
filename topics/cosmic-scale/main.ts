import { mountObservationMode } from '../../src/platform/observationMode.ts';
import { mountSceneReading } from '../../src/platform/sceneReading.ts';
import { language, translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import data from './content.json';
import { readJourney, originStart, stageFor, stops, zoomRoute, scaleState, formatLength, halfWidthKm, LIGHT_YEAR_KM, anchorForScale } from './model.ts';
import { CosmicScene } from './scene.ts';
import { ScaleFlight } from './flight.ts';
import {ComparisonJourney} from './comparison.ts';
import {readExploration,type Chapter} from './comparisonModel.ts';
import comparisonWords from './comparisonContent.json';
import { pairStudy, homeStudy, zoomStudy, galaxyStudy } from './study.ts';
import { GalacticStudy } from './galacticStudy.ts';
import { readGalacticState, saveGalacticState } from './galacticModel.ts';
import galacticContent from './galacticContent.json';
import './style.css';
translateDocument(t);
const text=(v:{zh:string;en:string})=>language==='en'?v.en:v.zh;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const state={...readJourney(location.search),tilt:.35};
let exploration=readExploration(location.search);
let galacticState=readGalacticState(location.search),galaxies:GalacticStudy|undefined;
const flight=new ScaleFlight(state.progress),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const layers={disk:true,bulge:true,halo:true,dark:false};
let frame=0,last=0,scene:CosmicScene|undefined,previous=-1,disposed=false,zoomAttempted=false;
let reading:ReturnType<typeof mountSceneReading>|undefined,studyKey='';
const distanceLabel=(km:number)=>formatLength(km,language==='en'?'en':'zh');
function showWidth(km:number){el('width').textContent=distanceLabel(km);}
function ensureScene(){if(scene||zoomAttempted||document.hidden)return;zoomAttempted=true;try{scene=new CosmicScene(el<HTMLCanvasElement>('cosmic-canvas'),text,failed=>{el('canvas-fallback').hidden=!failed;el('zoom-retry').hidden=!failed;if(failed)stop();},showWidth,distanceLabel);}catch{el('canvas-fallback').hidden=false;el('zoom-retry').hidden=false;el('cosmic-canvas').hidden=true;}}
const note=document.createElement('p');note.className='scene-note';note.textContent=text(data.ui.sceneNote);
const credit=document.createElement('a');credit.textContent=text(data.ui.credit);credit.href='https://www.solarsystemscope.com/textures/';credit.target='_blank';credit.rel='noopener';note.append(credit);document.querySelector('.scale-readout')!.after(note);
function stop(){flight.stop();cancelAnimationFrame(frame);frame=0;el('travel').textContent=text(data.ui[state.progress>=1?'restart':'play']);el('travel').setAttribute('aria-pressed','false');}
const originLabel=document.createElement('span');originLabel.textContent=text(data.ui.chooseOrigin);el('origin-controls').append(originLabel);
for(const origin of ['earth','sun'] as const){const b=document.createElement('button');b.dataset.origin=origin;b.textContent=text(data.ui[origin==='earth'?'fromEarth':'fromSun']);b.onclick=()=>{stop();state.origin=origin;flight.seek(originStart(origin));state.progress=flight.progress;previous=-1;update(true);};el('origin-controls').append(b);}
el('size-memory').remove();
const words=language==='en'?comparisonWords.en:comparisonWords.zh;
const comparison=new ComparisonJourney(el('comparison-panel'),language,(pair,home)=>{exploration.pair=pair;exploration.home=home;saveRoute();syncStudy();},setChapter);
galaxies=new GalacticStudy(el('galaxies-panel'),language,galacticState,(next,checkpoint)=>{galacticState=next;if(checkpoint)saveRoute();syncStudy();},()=>setChapter('zoom'));
const retryZoom=document.createElement('button');retryZoom.id='zoom-retry';retryZoom.hidden=true;retryZoom.textContent=text(data.ui.retryView);retryZoom.onclick=()=>{stop();scene?.dispose();scene=undefined;zoomAttempted=false;el('cosmic-canvas').hidden=false;update();};el('canvas-fallback').after(retryZoom);
const zoomSettings=document.createElement('aside');zoomSettings.className='cosmic-settings';zoomSettings.id='cosmic-settings';
zoomSettings.append(el('origin-controls'),el('galaxy-controls'));el('cosmic-observation').append(zoomSettings);
el('cosmic-observation').dataset.readerChoices='#journey-chapters,.comparison-choices,.comparison-home-path,.comparison-home-aside,.galactic-choices';
const observation=mountObservationMode(el('cosmic-observation'),{enter:t('沉浸演示'),exit:t('退出沉浸 · Esc')},{fit:true,panels:[
  {label:t('解说'),elements:[document.querySelector<HTMLElement>('.comparison-copy')!,document.querySelector<HTMLElement>('.explanation')!,galaxies.copy,note]},
  {label:t('设置'),elements:[zoomSettings],open:false},
]});
const comparisonNote=document.querySelector<HTMLElement>('.comparison-copy p')!;
reading=mountSceneReading(el('cosmic-observation'),{id:'cosmic-science-guide',childTarget:comparisonNote});
comparison.setChildSummary(()=>text(exploration.chapter==='compare'?pairStudy(Math.round(exploration.pair)).child:homeStudy(exploration.home).child));
function saveRoute(){const url=new URL(location.href);url.searchParams.set('mode',exploration.chapter);url.searchParams.set('pair',exploration.pair.toFixed(5));url.searchParams.set('pairVersion','2');url.searchParams.set('home',String(exploration.home));url.searchParams.set('scale',state.progress.toFixed(5));url.searchParams.set('scaleVersion','2');url.searchParams.set('origin',state.origin);saveGalacticState(url.searchParams,galacticState);history.replaceState(null,'',url);}
function setChapter(chapter:Chapter){stop();comparison.stop();exploration.chapter=chapter;update(true);}
function syncStudy(){
  const stage=stageFor(state.progress);
  const key=exploration.chapter==='compare'?`compare:${Math.round(exploration.pair)}`:exploration.chapter==='homes'?`home:${exploration.home}`:exploration.chapter==='galaxies'?`galaxy:${galacticState.selected}`:`zoom:${state.origin}:${stage}`;
  if(key===studyKey||!reading)return;
  studyKey=key;
  reading.setChildTarget(exploration.chapter==='zoom'?el('explain'):exploration.chapter==='galaxies'?galaxies!.childTarget:comparisonNote);
  reading.set(exploration.chapter==='compare'?pairStudy(Math.round(exploration.pair)):exploration.chapter==='homes'?homeStudy(exploration.home):exploration.chapter==='galaxies'?galaxyStudy(galacticState.selected):zoomStudy(stage,state.origin));
}
for(const [i,chapter] of (['compare','homes','galaxies','zoom'] as const).entries()){const b=document.createElement('button');b.textContent=chapter==='galaxies'?text({zh:galacticContent.ui.zh.chapter,en:galacticContent.ui.en.chapter}):words.chapters[i>2?2:i]!;b.dataset.chapter=chapter;b.onclick=()=>setChapter(chapter);el('journey-chapters').append(b);}
function update(sync=false){
  if(disposed)return;
  el('cosmic-observation').dataset.chapter=exploration.chapter;
  el('zoom-panel').hidden=exploration.chapter!=='zoom';
  document.querySelectorAll('[data-chapter]').forEach(b=>b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.chapter===exploration.chapter)));
  comparison.show(exploration.chapter,exploration.pair,exploration.home);
  galaxies?.show(exploration.chapter==='galaxies',galacticState);
  if(!flight.running){el('travel').textContent=text(data.ui[state.progress>=1?'restart':'play']);el('travel').setAttribute('aria-pressed','false');}
  const stage=stageFor(state.progress),content=stage===0&&state.origin==='sun'?data.sunStart:data.stages[stage]!;
  el<HTMLInputElement>('scale').min=String(originStart(state.origin));el('anchor').textContent=text(data.ui[anchorForScale(state.progress,state.origin)]);
  document.querySelectorAll<HTMLButtonElement>('[data-origin]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.origin===state.origin)));
  const first=el('stops').querySelector('button');if(first)first.textContent=text(state.origin==='sun'?data.ui.sun:data.stages[0]!.name);el<HTMLInputElement>('scale').value=String(state.progress);
  showWidth(halfWidthKm(state.progress)*2);
  if(stage!==previous){previous=stage;const routePosition=zoomRoute.indexOf(stage as typeof zoomRoute[number]);el('stage-number').textContent=routePosition>=0?String(routePosition+1).padStart(2,'0')+' / '+String(zoomRoute.length).padStart(2,'0'):`${text(data.ui.alongWay)} · ${text(data.stages[stage]!.name)}`;el('stage-title').textContent=text(content.title);el('boundary').textContent=text(content.boundary);el<HTMLAnchorElement>('source').href=content.source;document.querySelectorAll<HTMLButtonElement>('[data-stop]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stop)===stage)));}
  syncStudy();
  el('galaxy-controls').hidden=!scaleState(state.progress).galaxy||halfWidthKm(state.progress)>10e6*LIGHT_YEAR_KM;if(exploration.chapter==='zoom'){ensureScene();scene?.draw(state.progress,state.tilt,layers,state.origin);}
  if(sync)saveRoute();
}
function tick(now:number){
  frame=0;if(!flight.running||document.hidden||disposed)return;
  state.progress=flight.step((now-last)/1000);last=now;update();
  if(flight.running)frame=requestAnimationFrame(tick);else{stop();update(true);}
}
function travelTo(target:number,tour=false){
  stop();flight.go(target,reduced.matches,tour);state.progress=flight.progress;update(true);
  if(flight.running){last=performance.now();el('travel').textContent=text(data.ui.pause);el('travel').setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);}else stop();
}
el('travel').onclick=()=>{if(flight.running){stop();update(true);}else travelTo(state.progress>=1?originStart(state.origin):1,state.progress<1);};
el<HTMLInputElement>('scale').oninput=e=>{stop();flight.seek(Number((e.target as HTMLInputElement).value));state.progress=flight.progress;update(true);};
el<HTMLInputElement>('tilt').oninput=e=>{state.tilt=Number((e.target as HTMLInputElement).value);update();};
zoomRoute.forEach(i=>{const content=data.stages[i]!;const b=document.createElement('button');b.textContent=text(content.name);b.dataset.stop=String(i);b.onclick=()=>travelTo(i===0?originStart(state.origin):stops[i]!);el('stops').append(b);});
for(const key of Object.keys(layers) as (keyof typeof layers)[]){const b=document.createElement('button');b.textContent=text(data.ui[key]);b.setAttribute('aria-pressed',String(layers[key]));b.onclick=()=>{layers[key]=!layers[key];b.setAttribute('aria-pressed',String(layers[key]));update();};el('layers').append(b);}
document.addEventListener('visibilitychange',()=>{if(document.hidden){comparison.pauseSurface();comparison.stop();galaxies?.pause();stop();update(true);}else update();});
window.addEventListener('pagehide',event=>{stop();galaxies?.pause();if(!event.persisted){disposed=true;comparison.dispose();galaxies?.dispose();scene?.dispose();}});
window.addEventListener('pageshow',()=>update());
window.addEventListener('popstate',()=>{stop();comparison.stop();exploration=readExploration(location.search);galacticState=readGalacticState(location.search);const next=readJourney(location.search);state.origin=next.origin;flight.seek(next.progress);state.progress=flight.progress;previous=-1;update();});
reduced.addEventListener('change',event=>{if(event.matches){comparison.pauseSurface();comparison.stop();stop();}});
update();
