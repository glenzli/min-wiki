import { mountObservationMode,mountObservationChoices } from '../../src/platform/observationMode.ts';
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
import {MagnificationInput,magnifyJourney} from './viewNavigation.ts';
import {scaleReading} from './scaleReading.ts';
import {chapters,isSceneChapter,sceneChapter,readCaseMemory,rememberCase,saveCaseMemory} from './explorationNavigation.ts';
import explorationWords from './explorationContent.json';
import {ExplorationGuide} from './explorationGuide.ts';
import {JourneyNavigation} from './journeyNavigation.ts';
import {readLesson,saveLesson,lessonForView,lessonSteps,journeyCopy,lessonCue,type LessonSelection,type LessonStep} from './journeyRoutes.ts';
import './style.css';
translateDocument(t);
const text=(v:{zh:string;en:string})=>language==='en'?v.en:v.zh;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const state={...readJourney(location.search),tilt:.35};
let exploration=readExploration(location.search);
let galacticState=readGalacticState(location.search),galaxies:GalacticStudy|undefined;
let caseMemory=readCaseMemory(new URLSearchParams(location.search),galacticState.selected);
let lesson=readLesson(new URLSearchParams(location.search),exploration.chapter,galacticState.selected,exploration.home);
const visitedLessonSteps=new Set([`${lesson.route}:${lesson.step}`]);
const journeyWords=language==='en'?journeyCopy.en:journeyCopy.zh;
if(!new URLSearchParams(location.search).has('mode')&&!new URLSearchParams(location.search).has('scale')&&!new URLSearchParams(location.search).has('origin')){exploration.chapter='sky';galacticState.selected='sky';galacticState.sky.view='ground';caseMemory=rememberCase(caseMemory,'sky');}
if(isSceneChapter(exploration.chapter))galacticState.selected=caseMemory[exploration.chapter];
const flight=new ScaleFlight(state.progress),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const routeSnapshots=new Map<string,{lesson:LessonSelection;exploration:typeof exploration;galactic:typeof galacticState;origin:typeof state.origin;progress:number}>();
function rememberRoute(){routeSnapshots.set(lesson.route,{lesson:{...lesson},exploration:{...exploration},galactic:structuredClone(galacticState),origin:state.origin,progress:state.progress});}
const layers={disk:true,bulge:true,halo:true,dark:false};
let frame=0,last=0,scene:CosmicScene|undefined,previous=-1,disposed=false,zoomAttempted=false;
let chapterFocusFrame=0,chapterFocusTarget:HTMLElement|undefined;
let reading:ReturnType<typeof mountSceneReading>|undefined,studyKey='';
let guide:ExplorationGuide|undefined;
const distanceLabel=(km:number)=>formatLength(km,language==='en'?'en':'zh');
function showWidth(km:number){el('width').textContent=distanceLabel(km);refreshScaleReading();}
function ensureScene(){if(scene||zoomAttempted||document.hidden)return;zoomAttempted=true;try{scene=new CosmicScene(el<HTMLCanvasElement>('cosmic-canvas'),text,failed=>{el('canvas-fallback').hidden=!failed;el('zoom-retry').hidden=!failed;if(failed)stop();},showWidth,distanceLabel);}catch{el('canvas-fallback').hidden=false;el('zoom-retry').hidden=false;el('cosmic-canvas').hidden=true;}}
const note=document.createElement('p');note.className='scene-note';note.textContent=text(data.ui.sceneNote);
const credit=document.createElement('a');credit.textContent=text(data.ui.credit);credit.href='https://www.solarsystemscope.com/textures/';credit.target='_blank';credit.rel='noopener';note.append(credit);document.querySelector('.scale-readout')!.after(note);
function stop(){flight.stop();cancelAnimationFrame(frame);frame=0;el('travel').textContent=text(data.ui[state.progress>=1?'restart':'play']);el('travel').setAttribute('aria-pressed','false');}
const originLabel=document.createElement('span');originLabel.textContent=text(data.ui.chooseOrigin);el('origin-controls').append(originLabel);
for(const origin of ['earth','sun'] as const){const b=document.createElement('button');b.dataset.origin=origin;b.textContent=text(data.ui[origin==='earth'?'fromEarth':'fromSun']);b.onclick=()=>{stop();state.origin=origin;flight.seek(originStart(origin));state.progress=flight.progress;previous=-1;update(true);};el('origin-controls').append(b);}
el('size-memory').remove();
const words=language==='en'?comparisonWords.en:comparisonWords.zh;
const comparison=new ComparisonJourney(el('comparison-panel'),language,(pair,home)=>{exploration.pair=pair;exploration.home=home;saveRoute();syncStudy();},(chapter,target)=>{if(target){galacticState.selected=target;caseMemory=rememberCase(caseMemory,target);galacticState.zoom=1;if(target==='trappist-1')galacticState.sky.systemWhole=true;chapter=sceneChapter(target);}lesson=lessonForView(chapter,galacticState.selected,exploration.home);setChapter(chapter);});
galaxies=new GalacticStudy(el('galaxies-panel'),language,galacticState,(next,checkpoint)=>{const changed=next.selected!==galacticState.selected;galacticState=next;caseMemory=rememberCase(caseMemory,next.selected);const chapter=sceneChapter(next.selected);if(changed&&checkpoint&&!(lesson.route==='outward'&&next.selected==='milky-way'))lesson=lessonForView(chapter,next.selected,exploration.home);if(checkpoint&&isSceneChapter(exploration.chapter)&&chapter!==exploration.chapter){setChapter(chapter);return;}if(checkpoint)saveRoute();syncStudy();},enterZoom);
comparison.useJourneyNavigation();galaxies.useJourneyNavigation();
function enterZoom(restart:boolean){rememberRoute();lesson={route:'flight',step:'continuous'};if(restart){stop();flight.seek(originStart(state.origin));state.progress=flight.progress;previous=-1;}setChapter('zoom');}
const retryZoom=document.createElement('button');retryZoom.id='zoom-retry';retryZoom.hidden=true;retryZoom.textContent=text(data.ui.retryView);retryZoom.onclick=()=>{stop();scene?.dispose();scene=undefined;zoomAttempted=false;el('cosmic-canvas').hidden=false;update();};el('canvas-fallback').after(retryZoom);
const zoomSettings=document.createElement('aside');zoomSettings.className='cosmic-settings';zoomSettings.id='cosmic-settings';
zoomSettings.append(el('origin-controls'),el('galaxy-controls'));el('cosmic-observation').append(zoomSettings);
el('cosmic-observation').dataset.readerWorkbench='';el('cosmic-observation').dataset.readerLayout='stage';el('cosmic-observation').dataset.readerDensity='compact';el('cosmic-observation').dataset.readerToggleAnchor='stage';
el('cosmic-observation').dataset.readerHeader='auto';
// Each retained drawing has its own actual observation area.
function composeObservation(panel:HTMLElement,visual:HTMLElement,essentialSelectors:string) {
 panel.removeAttribute('data-reader-stage');panel.dataset.readerLayout='stage';
 const main=document.createElement('div');main.className='cosmic-main';main.dataset.readerMain='';
 const context=document.createElement('div');context.dataset.readerControlRow='';
 let drawing=visual;
 if(visual instanceof HTMLCanvasElement){drawing=document.createElement('div');drawing.className='cosmic-visual';visual.before(drawing);drawing.append(visual);}
 drawing.dataset.readerStage='';drawing.dataset.readerFit='available';
 const essentials=document.createElement('div');essentials.className='cosmic-essential';essentials.dataset.readerEssential='';
 essentials.append(...panel.querySelectorAll(essentialSelectors));main.append(context,drawing,essentials);panel.prepend(main);return context;
}
const comparisonContext=composeObservation(el('comparison-panel'),comparison.visual,'.comparison-heading,.comparison-readings,.comparison-ratio-task,.comparison-transport,.membership-hint,.comparison-home-cues,.comparison-boundary,.comparison-home-path,.comparison-home-aside');
comparisonContext.append(comparison.caseNavigation);
const galaxyStage=el('galaxies-panel').querySelector<HTMLElement>('.galactic-stage')!;
const galaxyContext=composeObservation(el('galaxies-panel'),galaxyStage,'.galactic-heading,.sky-controls,.stellar-family-controls,.galactic-tools,.galactic-hint,.galactic-coordinate,.galactic-boundary');
galaxyContext.append(galaxies.caseNavigation,galaxies.detailNavigation);
composeObservation(el('zoom-panel'),el('cosmic-canvas'),'.scene-heading,.scale-readout,.zoom-control,#stops,#canvas-fallback,#zoom-retry');
// Short action labels keep their normal height; whole buttons wrap as units on phones.
for(const group of el('cosmic-observation').querySelectorAll<HTMLElement>('.comparison-choices,.comparison-transport,.comparison-buttons,.comparison-side-buttons,.membership-views,.galactic-choices,.galactic-presets,.galactic-layers,.sky-directions,.sky-observer-tools,.sky-system-tools,.origin-controls,#stops'))group.dataset.readerActions='single-line';
const navigation=language==='en'?data.navigation.en:data.navigation.zh;
const scaleGuide=document.createElement('aside'),guideHeading=document.createElement('strong'),guideDetail=document.createElement('span'),guideOrigin=document.createElement('small');
scaleGuide.className='scale-reading-guide';scaleGuide.id='scale-reading-guide';scaleGuide.append(guideHeading,guideDetail,guideOrigin);el('zoom-panel').querySelector('.scene-heading')!.after(scaleGuide);
const gestureHint=document.createElement('small');gestureHint.id='physical-gesture-hint';gestureHint.className='physical-gesture-hint';gestureHint.textContent=navigation.physicalHint;el('scale').parentElement!.append(gestureHint);
const physicalCanvas=el<HTMLCanvasElement>('cosmic-canvas');physicalCanvas.tabIndex=0;physicalCanvas.setAttribute('aria-describedby','scale-reading-guide physical-gesture-hint');
const physicalInput=new MagnificationInput(physicalCanvas,()=>exploration.chapter==='zoom'&&!disposed&&!document.hidden,(factor,checkpoint)=>{const before=state.progress,next=Math.min(lesson.route==='inward'?stops[3]!:1,magnifyJourney(before,state.origin,factor));if(Math.abs(next-before)<1e-12){if(checkpoint)saveRoute();return false;}stop();flight.seek(next);state.progress=flight.progress;update(checkpoint);return true;});
const originalScaleLabel=el('scale').parentElement!.firstChild!.textContent;
let guideKey='';
function refreshScaleReading(){
 const canvas=el<HTMLCanvasElement>('cosmic-canvas'),width=canvas.parentElement?.clientWidth||1040,height=canvas.parentElement?.clientHeight||560,reading=scaleReading(state.progress,state.origin,width,height),key=`${reading.kind}:${reading.subpixel}:${state.origin}`;
 if(key===guideKey)return;guideKey=key;
 guideHeading.textContent=navigation[`${reading.kind}Title`];guideDetail.textContent=navigation[`${reading.kind}Detail`];
 guideOrigin.textContent=[reading.subpixel?navigation[state.origin==='earth'?'subpixelEarth':'subpixelSun']:'',navigation.positionKey].filter(Boolean).join(' · ');
}
el('cosmic-observation').dataset.readerChoices='#journey-chapters';
const lessonWords=language==='en'?explorationWords.en:explorationWords.zh;
const observation=mountObservationMode(el('cosmic-observation'),{enter:t('沉浸演示'),exit:t('退出沉浸 · Esc')},{fit:true,choices:[],panels:[
  {label:lessonWords.explanation,elements:[document.querySelector<HTMLElement>('.comparison-copy')!,document.querySelector<HTMLElement>('.explanation')!,galaxies.copy,note]},
  {label:t('设置'),elements:[zoomSettings],open:false},
]});
el('journey-chapters').dataset.readerCompactLabel=lessonWords.question;
const routeChoices=mountObservationChoices(observation.toolbar,[el('journey-chapters')]);
const comparisonNote=document.querySelector<HTMLElement>('.comparison-copy p')!;
reading=mountSceneReading(el('cosmic-observation'),{id:'cosmic-science-guide',childTarget:comparisonNote});
// Reuse the original Reader explanation and depth controls beside the current observation.
const explanationControl=[...observation.toolbar.querySelectorAll<HTMLButtonElement>('button[aria-controls]')].find(button=>button.getAttribute('aria-controls')?.split(' ').includes(galaxies!.copy.id))!;
const depthControls=el('cosmic-observation').querySelector<HTMLElement>('.scene-reading-switch')!;
guide=new ExplorationGuide(el('cosmic-observation'),explanationControl,depthControls,language);
comparison.setChildSummary(()=>text(exploration.chapter==='compare'?pairStudy(Math.round(exploration.pair)).child:homeStudy(exploration.home).child));
function saveRoute(){const url=new URL(location.href);url.searchParams.set('mode',exploration.chapter);url.searchParams.set('pair',exploration.pair.toFixed(5));url.searchParams.set('pairVersion','2');url.searchParams.set('home',String(exploration.home));url.searchParams.set('scale',state.progress.toFixed(5));url.searchParams.set('scaleVersion','2');url.searchParams.set('origin',state.origin);saveGalacticState(url.searchParams,galacticState);saveCaseMemory(url.searchParams,caseMemory);saveLesson(url.searchParams,lesson);history.replaceState(null,'',url);}
function releaseChapterFocus(){
  const target=chapterFocusTarget;if(!target)return;chapterFocusTarget=undefined;
  target.removeEventListener('blur',releaseChapterFocus);
  if(target.getAttribute('tabindex')==='-1')target.removeAttribute('tabindex');
}
function setChapter(chapter:Chapter){
  const changed=chapter!==exploration.chapter;
  caseMemory=rememberCase(caseMemory,galacticState.selected);
  if(isSceneChapter(chapter))galacticState.selected=caseMemory[chapter];
  stop();comparison.stop();physicalInput.cancel();exploration.chapter=chapter;update(true);
  if(!changed)return;
  cancelAnimationFrame(chapterFocusFrame);releaseChapterFocus();
  // Let the original chooser close before handing focus to the newly visible observation.
  chapterFocusFrame=requestAnimationFrame(()=>{
    chapterFocusFrame=0;if(disposed||document.hidden||exploration.chapter!==chapter)return;
    const panel=el(chapter==='zoom'?'zoom-panel':isSceneChapter(chapter)?'galaxies-panel':'comparison-panel');
    const stage=panel.querySelector<HTMLElement>('[data-reader-stage]');
    const visualTarget=stage?.matches('[role]')?stage:stage?.querySelector<HTMLElement>('[role="img"]');
    const target=visualTarget&&!visualTarget.closest('[hidden]')?visualTarget:panel.querySelector<HTMLElement>('h2');
    if(!target)return;
    if(!target.hasAttribute('tabindex')){chapterFocusTarget=target;target.tabIndex=-1;target.addEventListener('blur',releaseChapterFocus,{once:true});}
    // Include the existing toolbar/heading strip rather than aligning the canvas beneath it.
    const observation=el('cosmic-observation');observation.scrollTop=0;
    observation.scrollIntoView({block:'start',behavior:'instant'});target.focus({preventScroll:true});
  });
}
function syncStudy(){
  const stage=stageFor(state.progress);
  const sceneChapterActive=isSceneChapter(exploration.chapter);
  if(guide){
    const panel=el(exploration.chapter==='zoom'?'zoom-panel':sceneChapterActive?'galaxies-panel':'comparison-panel');
    const action=lessonCue(lesson,language);
    const explanation=sceneChapterActive?galaxies!.copy:exploration.chapter==='zoom'?el('zoom-panel').querySelector<HTMLElement>('.explanation')!:el('comparison-panel').querySelector<HTMLElement>('.comparison-copy')!;
    const row=panel.querySelector<HTMLElement>('[data-reader-control-row]')!;journeyNavigation.show(row,lesson);guide.show(row,explanation,action);
  }
  const key=exploration.chapter==='compare'?`compare:${Math.round(exploration.pair)}`:exploration.chapter==='homes'?`home:${exploration.home}`:sceneChapterActive?`galaxy:${galacticState.selected}`:`zoom:${state.origin}:${stage}`;
  if(key===studyKey||!reading)return;
  studyKey=key;
  reading.setChildTarget(exploration.chapter==='zoom'?el('explain'):sceneChapterActive?galaxies!.childTarget:comparisonNote);
  reading.set(exploration.chapter==='compare'?pairStudy(Math.round(exploration.pair)):exploration.chapter==='homes'?homeStudy(exploration.home):sceneChapterActive?galaxyStudy(galacticState.selected):zoomStudy(stage,state.origin));
}
function chooseLesson(next:LessonSelection,step:LessonStep,resume=false){
 if(next.route===lesson.route&&next.step===lesson.step&&(step.scale===undefined||Math.abs(state.progress-Math.max(originStart(step.origin??'earth'),step.scale))<1e-6))return;
 if(next.route!==lesson.route){rememberRoute();const retained=resume?routeSnapshots.get(next.route):undefined;if(retained){lesson={...retained.lesson};exploration={...retained.exploration};galacticState=structuredClone(retained.galactic);caseMemory=rememberCase(caseMemory,galacticState.selected);state.origin=retained.origin;flight.seek(retained.progress);state.progress=flight.progress;previous=-1;setChapter(exploration.chapter);return;}}
 const firstVisit=!visitedLessonSteps.has(`${next.route}:${next.step}`);visitedLessonSteps.add(`${next.route}:${next.step}`);lesson=next;stop();comparison.stop();galaxies?.pause();
 if(step.selected){const selected=step.id==='families'?caseMemory.systems:step.selected;galacticState.selected=selected;caseMemory=rememberCase(caseMemory,selected);if(selected==='sky'&&firstVisit){galacticState.sky.view=step.ground?'ground':'space';galacticState.sky.milkyProgress=0;}if(selected==='galaxy-comparison'&&firstVisit)galacticState.zoom=1;}
 if(step.home!==undefined)exploration.home=step.home;
 if(step.chapter==='zoom'){state.origin=step.origin??'earth';const target=Math.max(originStart(state.origin),step.scale??0);if(next.route==='flight'||!scene){flight.seek(target);state.progress=flight.progress;}else{state.progress=Math.max(originStart(state.origin),Math.min(stops[3]!,state.progress));flight.seek(state.progress);}previous=-1;setChapter('zoom');if(step.scale!==undefined&&Math.abs(state.progress-target)>1e-6)travelTo(target);return;}
 setChapter(step.chapter);
}
const journeyNavigation=new JourneyNavigation(el('journey-chapters'),language,chooseLesson,()=>routeChoices.append([]));
function update(sync=false){
  if(disposed)return;
  el('cosmic-observation').dataset.chapter=exploration.chapter;
  el('cosmic-observation').dataset.lessonRoute=lesson.route;
  el('zoom-panel').hidden=exploration.chapter!=='zoom';
  document.querySelectorAll('[data-chapter]').forEach(b=>b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.chapter===exploration.chapter)));
  comparison.show(exploration.chapter,exploration.pair,exploration.home);
  galaxies?.show(isSceneChapter(exploration.chapter),galacticState,state.progress>originStart(state.origin)+1e-6);
  const sunClose=lesson.route==='inward'&&lesson.step==='sun';
  el('stops').hidden=lesson.route==='inward';el('scale').parentElement!.firstChild!.textContent=sunClose?journeyWords.sunRuler:lesson.route==='inward'?journeyWords.inwardRuler:originalScaleLabel;el<HTMLInputElement>('scale').max=String(lesson.route==='inward'?stops[3]:1);
  if(!flight.running){el('travel').textContent=sunClose?journeyWords.returnSolar:lesson.route==='inward'?journeyWords[state.progress<1e-6?'inwardReset':'inwardPlay']:text(data.ui[state.progress>=1?'restart':'play']);el('travel').setAttribute('aria-pressed','false');}
  const stage=stageFor(state.progress),content=stage===0&&state.origin==='sun'?data.sunStart:data.stages[stage]!;
  el<HTMLInputElement>('scale').min=String(originStart(state.origin));el('anchor').textContent=text(data.ui[anchorForScale(state.progress,state.origin)]);
  document.querySelectorAll<HTMLButtonElement>('[data-origin]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.origin===state.origin)));
  const first=el('stops').querySelector('button');if(first)first.textContent=text(state.origin==='sun'?data.ui.sun:data.stages[0]!.name);el<HTMLInputElement>('scale').value=String(state.progress);
  showWidth(halfWidthKm(state.progress)*2);
  if(stage!==previous){previous=stage;const routePosition=zoomRoute.indexOf(stage as typeof zoomRoute[number]);el('stage-number').textContent=routePosition>=0?String(routePosition+1).padStart(2,'0')+' / '+String(zoomRoute.length).padStart(2,'0'):`${text(data.ui.alongWay)} · ${text(data.stages[stage]!.name)}`;el('stage-title').textContent=text(content.title);el('boundary').textContent=text(content.boundary);el<HTMLAnchorElement>('source').href=content.source;document.querySelectorAll<HTMLButtonElement>('[data-stop]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stop)===stage)));}
  if(lesson.route==='inward'&&lesson.step==='moon')el('stage-title').textContent=journeyWords.moonTitle;
  syncStudy();
  el('galaxy-controls').hidden=!scaleState(state.progress).galaxy||halfWidthKm(state.progress)>10e6*LIGHT_YEAR_KM;if(exploration.chapter==='zoom'){ensureScene();scene?.setSolarPhase(comparison.solarPhase);scene?.draw(state.progress,state.tilt,layers,state.origin);}
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
el('travel').onclick=()=>{if(flight.running){stop();update(true);}else if(lesson.route==='inward'&&lesson.step==='sun')chooseLesson({route:'inward',step:'solar'},lessonSteps.inward.find(step=>step.id==='solar')!);else if(lesson.route==='inward')travelTo(state.progress<1e-6?stops[3]!:originStart(state.origin),true);else travelTo(state.progress>=1?originStart(state.origin):1,state.progress<1);};
el<HTMLInputElement>('scale').oninput=e=>{stop();flight.seek(Number((e.target as HTMLInputElement).value));state.progress=flight.progress;update(true);};
el<HTMLInputElement>('tilt').oninput=e=>{state.tilt=Number((e.target as HTMLInputElement).value);update();};
zoomRoute.forEach(i=>{const content=data.stages[i]!;const b=document.createElement('button');b.textContent=text(content.name);b.dataset.stop=String(i);b.onclick=()=>travelTo(i===0?originStart(state.origin):stops[i]!);el('stops').append(b);});
for(const key of Object.keys(layers) as (keyof typeof layers)[]){const b=document.createElement('button');b.textContent=text(data.ui[key]);b.setAttribute('aria-pressed',String(layers[key]));b.onclick=()=>{layers[key]=!layers[key];b.setAttribute('aria-pressed',String(layers[key]));update();};el('layers').append(b);}
document.addEventListener('visibilitychange',()=>{if(document.hidden){physicalInput.cancel();comparison.pauseSurface();comparison.stop();galaxies?.pause();stop();update(true);}else update();});
window.addEventListener('pagehide',event=>{cancelAnimationFrame(chapterFocusFrame);chapterFocusFrame=0;releaseChapterFocus();physicalInput.cancel();stop();galaxies?.pause();if(!event.persisted){disposed=true;journeyNavigation.dispose();guide?.dispose();physicalInput.dispose();comparison.dispose();galaxies?.dispose();scene?.dispose();}});
window.addEventListener('pageshow',()=>update());
window.addEventListener('popstate',()=>{stop();comparison.stop();exploration=readExploration(location.search);galacticState=readGalacticState(location.search);lesson=readLesson(new URLSearchParams(location.search),exploration.chapter,galacticState.selected,exploration.home);const next=readJourney(location.search);state.origin=next.origin;flight.seek(next.progress);state.progress=flight.progress;previous=-1;update();});
reduced.addEventListener('change',event=>{if(event.matches){comparison.pauseSurface();comparison.stop();stop();}});
update();
