import { language, translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
import data from './content.json';
import { readJourney, originStart, stageFor, stops, scaleState, displayLength, halfWidthKm } from './model.ts';
import { CosmicScene } from './scene.ts';
import { ScaleFlight } from './flight.ts';
import {ComparisonJourney} from './comparison.ts';
import {readExploration,type Chapter} from './comparisonModel.ts';
import comparisonWords from './comparisonContent.json';
import './style.css';
translateDocument(t);mountTopicNavigation('cosmic-scale');
const text=(v:{zh:string;en:string})=>language==='en'?v.en:v.zh;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const state={...readJourney(location.search),tilt:.35};
let exploration=readExploration(location.search);
const flight=new ScaleFlight(state.progress),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const layers={disk:true,bulge:true,halo:true,dark:false};
let frame=0,last=0,scene:CosmicScene|undefined,previous=-1,disposed=false;
function ensureScene(){if(scene)return;try{scene=new CosmicScene(el<HTMLCanvasElement>('cosmic-canvas'),text,failed=>{el('canvas-fallback').hidden=!failed;if(failed)stop();});}catch{el('canvas-fallback').hidden=false;el('cosmic-canvas').hidden=true;}}
const note=document.createElement('p');note.className='scene-note';note.textContent=text(data.ui.sceneNote);
const credit=document.createElement('a');credit.textContent=text(data.ui.credit);credit.href='https://www.solarsystemscope.com/textures/';credit.target='_blank';credit.rel='noopener';note.append(credit);document.querySelector('.scale-readout')!.after(note);
function stop(){flight.stop();cancelAnimationFrame(frame);frame=0;el('travel').textContent=text(data.ui[state.progress>=1?'restart':'play']);el('travel').setAttribute('aria-pressed','false');}
const originLabel=document.createElement('span');originLabel.textContent=text(data.ui.chooseOrigin);el('origin-controls').append(originLabel);
for(const origin of ['earth','sun'] as const){const b=document.createElement('button');b.dataset.origin=origin;b.textContent=text(data.ui[origin==='earth'?'fromEarth':'fromSun']);b.onclick=()=>{stop();state.origin=origin;flight.seek(originStart(origin));state.progress=flight.progress;previous=-1;update(true);};el('origin-controls').append(b);}
el('size-memory').remove();
const words=language==='en'?comparisonWords.en:comparisonWords.zh;
const comparison=new ComparisonJourney(el('comparison-panel'),language,(pair,home)=>{exploration.pair=pair;exploration.home=home;saveRoute();},setChapter);
function saveRoute(){const url=new URL(location.href);url.searchParams.set('mode',exploration.chapter);url.searchParams.set('pair',exploration.pair.toFixed(5));url.searchParams.set('home',String(exploration.home));url.searchParams.set('scale',state.progress.toFixed(5));url.searchParams.set('origin',state.origin);history.replaceState(null,'',url);}
function setChapter(chapter:Chapter){stop();comparison.stop();exploration.chapter=chapter;update(true);}
for(const [i,chapter] of (['compare','homes','zoom'] as const).entries()){const b=document.createElement('button');b.textContent=words.chapters[i]!;b.dataset.chapter=chapter;b.onclick=()=>setChapter(chapter);el('journey-chapters').append(b);}
function update(sync=false){
  if(disposed)return;
  el('zoom-panel').hidden=exploration.chapter!=='zoom';
  document.querySelectorAll('[data-chapter]').forEach(b=>b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.chapter===exploration.chapter)));
  comparison.show(exploration.chapter,exploration.pair,exploration.home);
  if(!flight.running){el('travel').textContent=text(data.ui[state.progress>=1?'restart':'play']);el('travel').setAttribute('aria-pressed','false');}
  const stage=stageFor(state.progress),content=stage===0&&state.origin==='sun'?data.sunStart:data.stages[stage]!;
  el<HTMLInputElement>('scale').min=String(originStart(state.origin));el('anchor').textContent=text(data.ui[state.origin==='sun'?'sunAnchor':'earthAnchor']);
  document.querySelectorAll<HTMLButtonElement>('[data-origin]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.origin===state.origin)));
  const first=el('stops').querySelector('button');if(first)first.textContent=text(state.origin==='sun'?data.ui.sun:data.stages[0]!.name);el<HTMLInputElement>('scale').value=String(state.progress);
  const d=displayLength(halfWidthKm(state.progress)*2);el('width').textContent=d.value.toLocaleString(language==='en'?'en-US':'zh-CN',{maximumSignificantDigits:3})+' '+d.unit;
  if(stage!==previous){previous=stage;el('stage-number').textContent='0'+(stage+1)+' / 05';el('stage-title').textContent=text(content.title);el('explain').textContent=text(content.body);el('boundary').textContent=text(content.boundary);el<HTMLAnchorElement>('source').href=content.source;document.querySelectorAll<HTMLButtonElement>('[data-stop]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stop)===stage)));}
  el('galaxy-controls').hidden=!scaleState(state.progress).galaxy;if(exploration.chapter==='zoom'){ensureScene();scene?.draw(state.progress,state.tilt,layers,state.origin);}
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
data.stages.forEach((content,i)=>{const b=document.createElement('button');b.textContent=text(content.name);b.dataset.stop=String(i);b.onclick=()=>travelTo(i===0?originStart(state.origin):stops[i]!);el('stops').append(b);});
for(const key of Object.keys(layers) as (keyof typeof layers)[]){const b=document.createElement('button');b.textContent=text(data.ui[key]);b.setAttribute('aria-pressed',String(layers[key]));b.onclick=()=>{layers[key]=!layers[key];b.setAttribute('aria-pressed',String(layers[key]));update();};el('layers').append(b);}
document.addEventListener('visibilitychange',()=>{if(document.hidden){comparison.stop();stop();update(true);}});
window.addEventListener('pagehide',event=>{stop();if(!event.persisted){disposed=true;comparison.dispose();scene?.dispose();}});
window.addEventListener('pageshow',()=>update());
window.addEventListener('popstate',()=>{stop();comparison.stop();exploration=readExploration(location.search);const next=readJourney(location.search);state.origin=next.origin;flight.seek(next.progress);state.progress=flight.progress;previous=-1;update();});
reduced.addEventListener('change',event=>{if(event.matches){comparison.stop();stop();}});
update();
