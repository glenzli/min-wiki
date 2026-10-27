import { mountObservationMode } from '../../src/platform/observationMode.ts';
import { mountSceneReading } from '../../src/platform/sceneReading.ts';
import { language, languageHref, translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import data from './content.json';
import evolutionWords from './evolutionContent.json';
import anatomyWords from './anatomyContent.json';
import nebulaWords from './nebulaContent.json';
import {NEBULA_REFERENCES,ILLUMINATIONS} from './nebulaModel.ts';
import {evolutionState,evolutionPosition,solarTransition,PHASES,PHASE_PROGRESS,type Track} from './evolutionModel.ts';
import {advanceEvolution,type EvolutionDirection} from './evolutionPlayback.ts';
import {advanceSolarFlare,FLARE_DURATION,solarFlare} from './solarMechanisms.ts';
import {stellarSpaceFrame} from './spaceModel.ts';
import { readState, distanceAU, solarObservation, chapterFrom } from './model.ts';
import {ORBIT_CASES} from './orbitSystems.ts';
import { StellarScene, type ViewState } from './scene.ts';
import { ThreeBodyExperiment } from './threeBody/controller.ts';
import { anatomyStudies, evolutionStudy, nebulaStudy, orbitStudies, threeBodyStudy, sunDistanceStudy, typesStudy } from './study.ts';
import './style.css';
translateDocument(t);
const text=(value:{zh:string;en:string})=>language==='en'?value.en:value.zh;
const u=(key:keyof typeof data.ui)=>text(data.ui[key]);
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const playButton=el<HTMLButtonElement>('play');
const initial=readState(location.search);
const state:ViewState={...initial,type:Math.round(initial.type),section:false,time:0,surfaceTime:0};
const observatory=document.querySelector<HTMLElement>('.observatory')!;
const threeBody=new ThreeBodyExperiment(text);observatory.after(threeBody.root);
const layerKey=document.createElement('ol');layerKey.className='stellar-layer-key';layerKey.hidden=true;el('stellar-canvas').after(layerKey);
const surfaceNote=document.createElement('p');surfaceNote.className='scale-note';surfaceNote.textContent=u('surfaceNote');layerKey.after(surfaceNote);
const observationRoot=document.createElement('section');observationRoot.id='stellar-observation';observationRoot.setAttribute('aria-label',u('workspace'));
observatory.before(observationRoot);observationRoot.append(el('chapters'),observatory,threeBody.root);
const stage=document.createElement('div');stage.className='stellar-stage';const notes=document.createElement('aside');notes.className='stellar-notes';
const transport=document.createElement('div');transport.className='stellar-transport controls';
const conditions=document.createElement('aside');conditions.className='stellar-conditions';conditions.append(el('controls'));
stage.append(observatory.querySelector('.scene-heading')!,el('stellar-canvas'),el('canvas-fallback'),el('scale-note'),transport);
notes.append(layerKey,surfaceNote,el('readouts'),observatory.querySelector('.explanation')!);observatory.append(stage,conditions,notes);
observationRoot.dataset.readerWorkbench='';observationRoot.dataset.readerLayout='stage';
observatory.removeAttribute('data-reader-stage');observatory.dataset.readerLayout='stage';stage.dataset.readerMain='';
conditions.dataset.readerSupport='';notes.dataset.readerSupport='';transport.dataset.readerTransport='';
const stellarVisual=document.createElement('div');stellarVisual.className='stellar-visual';stellarVisual.dataset.readerStage='';stellarVisual.dataset.readerFit='available';
stellarVisual.append(el('stellar-canvas'),el('canvas-fallback'));
const stellarEssential=document.createElement('div');stellarEssential.className='stellar-essential';stellarEssential.dataset.readerEssential='';
stellarEssential.append(stage.querySelector('.scene-heading')!,el('scale-note'),transport);stage.replaceChildren(stellarVisual,stellarEssential);
// Retain the chapter controls so Reader can close the chooser and restore focus to its summary.
for(const chapter of data.chapters){
  const choice=button(text(chapter.name),chapterFrom(state.chapter)===chapter.id,()=>{stop();state.chapter=chapterFrom(chapter.id);writeUrl();update();});
  choice.dataset.chapter=chapter.id;el('chapters').append(choice);
}
const observation=mountObservationMode(observationRoot,{enter:u('immersive'),exit:u('exitImmersive')},{fit:true,choices:[el('chapters')],panels:[{label:t('改变条件'),elements:[conditions],open:false},{label:t('讲解'),elements:[notes,threeBody.notes]}]});
const conditionButton=observation.toolbar.querySelector<HTMLButtonElement>(`button[aria-controls~="${conditions.id}"]`)!;
// A single side panel leaves the retained scene at a useful size.
observation.toolbar.addEventListener('click',event=>{const control=(event.target as HTMLElement).closest<HTMLButtonElement>('button[aria-controls]');if(control?.getAttribute('aria-expanded')==='true')for(const peer of observation.toolbar.querySelectorAll<HTMLButtonElement>('button[aria-controls][aria-expanded=true]'))if(peer!==control)peer.click();});
const threeIntro=threeBody.notes.querySelector<HTMLElement>('.scale-note')!;
const reading=mountSceneReading(observationRoot,{id:'stellar-science-guide',childTarget:el('explain')});
notes.prepend(observationRoot.querySelector('.scene-reading-switch')!);
const threeDetail=threeBody.notes.querySelector<HTMLElement>('.explanation')!;
reading.element.append(threeDetail);
const surfaceButton=document.createElement('button');surfaceButton.type='button';observation.toolbar.insertBefore(surfaceButton,observation.button);
const motion=matchMedia('(prefers-reduced-motion: reduce)');let surfacePlaying=!motion.matches,surfaceFrame=0,surfaceLast=0,surfacePaint=0;
let playing=false,last=0,frame=0,evolutionReadoutAt=0,disposed=false,scene:StellarScene|undefined;
let evolutionDirection:EvolutionDirection=1;
function surfaceLabel(){surfaceButton.textContent=surfacePlaying?t('暂停动态'):t('继续动态');surfaceButton.setAttribute('aria-label',u(surfacePlaying?'pauseSurface':'playSurface'));surfaceButton.title=u(surfacePlaying?'pauseSurface':'playSurface');surfaceButton.setAttribute('aria-pressed',String(surfacePlaying));}
function surfaceTick(now:number){
 surfaceFrame=0;if(!surfacePlaying||state.chapter==='nebulae'||document.hidden||disposed)return;
 const elapsed=Math.min(.1,(now-surfaceLast)/1000);state.surfaceTime+=elapsed;
 state.flareTime=advanceSolarFlare(state.flareTime,elapsed,state.chapter==='anatomy'&&state.anatomyFocus===4);
 surfaceLast=now;if(now-surfacePaint>=125){surfacePaint=now;if(state.chapter==='three-body')threeBody.setSurfaceTime(state.surfaceTime);else {updateAnatomyFlare();draw();}}surfaceFrame=requestAnimationFrame(surfaceTick);
}
function setSurface(active:boolean){surfacePlaying=active;cancelAnimationFrame(surfaceFrame);surfaceFrame=0;surfaceLabel();if(active&&!document.hidden&&!disposed){surfaceLast=performance.now();surfaceFrame=requestAnimationFrame(surfaceTick);}}
surfaceButton.onclick=()=>{setSurface(!surfacePlaying);writeUrl();};surfaceLabel();
try{scene=new StellarScene(el<HTMLCanvasElement>('stellar-canvas'),text);}catch{el('canvas-fallback').hidden=false;el('stellar-canvas').hidden=true;}
function writeUrl(){const url=new URL(location.href);url.searchParams.set('chapter',state.chapter);url.searchParams.set('distance',state.distance.toFixed(3));url.searchParams.set('type',String(state.type));url.searchParams.set('orbit',state.orbitCase);url.searchParams.delete('system');url.searchParams.set('track',state.evolutionTrack);url.searchParams.set('evolution',state.evolutionProgress.toFixed(5));url.searchParams.set('focus',String(state.anatomyFocus));if(state.flareTime>0)url.searchParams.set('flare',state.flareTime.toFixed(3));else url.searchParams.delete('flare');url.searchParams.set('nebula',state.nebulaKind);url.searchParams.set('cloud',state.nebulaReference);url.searchParams.set('light',state.illumination);if(state.spaceView)url.searchParams.delete('view');else url.searchParams.set('view','comparison');if(state.cutaway)url.searchParams.set('cutaway','1');else url.searchParams.delete('cutaway');history.replaceState(null,'',url);}
function draw(){if(state.chapter!=='three-body')scene?.draw(state);}
function evolutionShellVisible(){return stellarSpaceFrame({chapter:'evolution',track:state.evolutionTrack,progress:state.evolutionProgress,nebula:'nursery',illumination:'emission'}).shellOpacity>.01;}
function evolutionPlayLabel(){return evolutionWords.ui[evolutionDirection===-1?(state.evolutionProgress<=0?'reverseRestart':'reversePlay'):state.evolutionProgress>=1?'restart':'play'];}
function stop(persist=true){playing=false;cancelAnimationFrame(frame);frame=0;playButton.textContent=state.chapter==='evolution'?evolveText(evolutionPlayLabel()):u('play');playButton.setAttribute('aria-pressed','false');if(persist)writeUrl();}
function toggle(){if(playing){stop();return;}if(disposed)return;if(state.chapter==='evolution'&&(evolutionDirection===1?state.evolutionProgress>=1:state.evolutionProgress<=0)){state.evolutionProgress=evolutionDirection===1?0:1;updateEvolutionCopy();updateReadout();writeUrl();draw();}playing=true;last=performance.now();playButton.textContent=state.chapter==='evolution'?evolveText(evolutionWords.ui.pause):u('pause');playButton.setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);}
function tick(now:number){frame=0;if(!playing||disposed||document.hidden)return;const dt=Math.min(.08,(now-last)/1000);last=now;
  if(state.chapter==='evolution'){const before=evolutionPosition(state.evolutionProgress).phaseIndex,solarBefore=solarTransition(state.evolutionProgress),next=advanceEvolution(state.evolutionProgress,dt,evolutionDirection);state.evolutionProgress=next.progress;const control=el<HTMLInputElement>('evolution-progress');control.value=String(state.evolutionProgress);if(evolutionPosition(state.evolutionProgress).phaseIndex!==before||state.evolutionTrack==='solar'&&solarTransition(state.evolutionProgress)!==solarBefore)updateEvolutionCopy();if(now-evolutionReadoutAt>160){updateReadout();writeUrl();evolutionReadoutAt=now;}draw();if(next.ended){stop();updateReadout();return;}}
  else {state.time+=dt*.25;const control=document.getElementById('phase') as HTMLInputElement|null;if(control)control.value=String(state.time%40);draw();}
  if(playing)frame=requestAnimationFrame(tick);
}
function button(label:string,selected:boolean,onClick:()=>void){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(selected));b.onclick=onClick;return b;}
function slider(label:string,value:number,min:number,max:number,callback:(v:number)=>void,id?:string){const l=document.createElement('label');l.append(label);const input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.step='any';input.value=String(value);if(id)input.id=id;input.oninput=()=>{callback(Number(input.value));writeUrl();updateReadout();draw();};l.append(input);return l;}
const evolveText=(value:{zh:string;en:string})=>text(value);
function updateAnatomyFlare(){
 if(state.chapter!=='anatomy'||state.anatomyFocus!==4)return;
 const frame=solarFlare(state.flareTime),words=anatomyWords.ui.flareStages[frame.stage];
 const progress=document.getElementById('flare-progress') as HTMLInputElement|null;
 if(progress){progress.value=String(state.flareTime);progress.setAttribute('aria-valuetext',text(words));}
 const status=document.getElementById('flare-status');if(status&&(status.dataset.stage!==frame.stage||status.dataset.complete!==String(frame.ended))){status.dataset.stage=frame.stage;status.dataset.complete=String(frame.ended);status.textContent=text(words);writeUrl();}
}
function ageLabel(age:number){const locale=language==='en'?'en':'zh',n=(v:number)=>v.toLocaleString(locale==='en'?'en-US':'zh-CN',{maximumSignificantDigits:3}),e=evolutionWords.ui;
  if(locale==='zh')return age>=1e8?`${n(age/1e8)} ${e.elapsed.zh}`:age>=1e4?`${n(age/1e4)} ${e.tenThousand.zh}`:`${n(age)} ${e.years.zh}`;
  return age>=1e9?`${n(age/1e9)} ${e.elapsed.en}`:age>=1e6?`${n(age/1e6)} ${e.million.en}`:`${n(age)} ${e.years.en}`;
}
function updateReadout(){
  const rows: [string,string][]=state.chapter==='evolution'?(()=>{const e=evolutionState(state.evolutionTrack,state.evolutionProgress),ui=evolutionWords.ui;
    const neutron=e.compactBlend>=.999&&e.remnant==='neutron-star',blackHole=e.compactBlend>=.999&&e.remnant==='black-hole';
    const radius=e.phaseIndex===0?evolveText(ui.cloudExtent):blackHole?evolveText(ui.blackHoleExtent):neutron?evolveText(ui.neutronReadout):`${e.radiusSolar.toLocaleString(language==='en'?'en-US':'zh-CN',{maximumSignificantDigits:3})} R☉`;
    const solarStep=state.evolutionTrack==='solar'?solarTransition(state.evolutionProgress):undefined;
    const control=document.getElementById('evolution-progress');control?.setAttribute('aria-valuetext',`${evolveText(solarStep?evolutionWords.solarTransitions[solarStep].name:evolutionWords.tracks[state.evolutionTrack].stages[e.phaseIndex]!.name)} · ${Math.round(state.evolutionProgress*100)}%`);
    const shell=transport.querySelector<HTMLElement>('[data-shell-control]');if(shell)shell.hidden=!evolutionShellVisible();
    return [[evolveText(e.ageUncalibrated?ui.afterAge:ui.age),ageLabel(e.ageYears)],[evolveText(neutron||blackHole?ui.remnantSize:ui.radius),radius],[evolveText(ui.fuel),e.phaseIndex<2?evolveText(e.phaseIndex===1&&state.evolutionTrack!=='solar'?ui.fusionMayOverlap:ui.notStarted):e.coreFuel<=0?evolveText(ui.exhausted):`${Math.round(e.coreFuel*100)}% ${evolveText(ui.remaining)}`]] as [string,string][];})():
    state.chapter==='nebulae'?(()=>{const n=nebulaWords.cases[state.nebulaKind];return [[text(nebulaWords.ui.material),text(n.material)],[text(nebulaWords.ui.power),text(state.nebulaKind==='nursery'?nebulaWords.illumination[state.illumination].power:nebulaWords.cases[state.nebulaKind].power)],[text(nebulaWords.ui.center),text(n.center)]] as [string,string][];})():
    state.chapter==='anatomy'?(()=>{const a=anatomyWords.features[state.anatomyFocus]!;return [[evolveText(anatomyWords.ui.location),evolveText(a.location)],[evolveText(anatomyWords.ui.cause),evolveText(a.cause)],[evolveText(anatomyWords.ui.observe),evolveText(a.observe)]] as [string,string][];})():
    state.chapter==='sun'?(()=>{const o=solarObservation(distanceAU(state.distance));return [[u('angle'),o.angularDiameterDegrees.toFixed(4)+'°'],[u('delay'),(o.lightTravelSeconds/60).toFixed(1)+' min'],[u('flux'),(o.relativeIrradiance*100).toPrecision(3)+'%']] as [string,string][];})():
    state.chapter==='types'?(()=>{const star=data.types[state.type]!;return [[u('radius'),star.radius+' R☉'],[u('mass'),star.mass+' M☉'],[u('temperature'),star.temp+' K'],[u('luminosity'),(star.radius**2*(star.temp/5772)**4).toLocaleString(language==='en'?'en-US':'zh-CN',{maximumSignificantDigits:3})+' L☉'],[u('lifespan'),text(star.lifetime)]] as [string,string][];})():
    [[u('starsCount'),String(state.orbitCase==='hierarchical'?3:2)],[u('planetsCount'),String(state.orbitCase==='circumbinary'?3:1)],[u('planetPath'),text(data.orbitCases[state.orbitCase].planetPath)]];
  el('readouts').replaceChildren(...rows.map(([label,value])=>{const div=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;strong.textContent=value;div.append(span,strong);return div;}));
}
function update(){
  const chapter=chapterFrom(state.chapter);observationRoot.dataset.chapter=chapter;conditionButton.hidden=chapter==='sun'||chapter==='three-body';if(conditionButton.hidden&&conditionButton.getAttribute('aria-expanded')==='true')conditionButton.click();el('chapters').querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(choice=>choice.setAttribute('aria-pressed',String(choice.dataset.chapter===chapter)));
  surfaceButton.hidden=chapter==='nebulae';if(chapter==='nebulae'){cancelAnimationFrame(surfaceFrame);surfaceFrame=0;}else if(surfacePlaying&&!surfaceFrame&&!document.hidden&&!disposed){surfaceLast=performance.now();surfaceFrame=requestAnimationFrame(surfaceTick);}
  reading.setChildTarget(chapter==='three-body'?threeIntro:el('explain'));
  threeDetail.hidden=chapter!=='three-body';
  observatory.hidden=chapter==='three-body';threeBody.setActive(chapter==='three-body');if(chapter==='three-body'){reading.set(threeBodyStudy);stop();return;}
  surfaceNote.hidden=chapter==='evolution'||chapter==='anatomy'||chapter==='nebulae';layerKey.hidden=true;
  playButton.hidden=chapter!=='orbits'&&chapter!=='evolution';playButton.textContent=chapter==='evolution'?evolveText(playing?evolutionWords.ui.pause:evolutionPlayLabel()):u(playing?'pause':'play');
  const controls=el('controls');controls.replaceChildren();transport.replaceChildren();controls.className='controls';
  // Keep the original playback control and handler when changing control layouts.
  if(chapter==='orbits')transport.append(playButton);else if(chapter!=='evolution')observatory.querySelector('.scene-heading')!.append(playButton);
  if(chapter==='evolution'){
    const ui=evolutionWords.ui,trackWords=evolutionWords.tracks[state.evolutionTrack],select=document.createElement('select');select.setAttribute('aria-label',evolveText(ui.title));
    for(const track of ['low-mass','solar','massive','very-massive'] as const){const option=document.createElement('option');option.value=track;option.textContent=evolveText(evolutionWords.tracks[track].name);select.append(option);}select.value=state.evolutionTrack;
    select.onchange=()=>{stop();state.evolutionTrack=select.value as Track;writeUrl();update();};controls.classList.add('evolution-controls');
    controls.append(select);
    const phases=document.createElement('div');phases.className='evolution-phases';for(let i=0;i<PHASES.length;i++){const b=button(evolveText(trackWords.stages[i]!.name),evolutionPosition(state.evolutionProgress).phaseIndex===i,()=>{stop();state.evolutionProgress=PHASE_PROGRESS[i]!;writeUrl();update();});phases.append(b);}controls.append(phases);
    const progress=slider(evolveText(ui.progress),state.evolutionProgress,0,1,v=>{state.evolutionProgress=v;stop();updateEvolutionCopy();},'evolution-progress');progress.className='evolution-progress';
    const direction=document.createElement('label'),directionSelect=document.createElement('select');direction.append(evolveText(ui.direction));directionSelect.setAttribute('aria-label',evolveText(ui.direction));
    direction.className='evolution-direction';
    for(const [value,label]of [[1,ui.forward],[-1,ui.backward]] as const){const option=document.createElement('option');option.value=String(value);option.textContent=evolveText(label);directionSelect.append(option);}directionSelect.value=String(evolutionDirection);
    directionSelect.onchange=()=>{stop();evolutionDirection=Number(directionSelect.value)===-1?-1:1;playButton.textContent=evolveText(evolutionPlayLabel());};direction.append(directionSelect);
    const playback=document.createElement('div');playback.className='evolution-playback';playback.append(playButton,progress,direction);transport.append(playback);
    const tools=document.createElement('div');tools.className='evolution-view-tools';
    tools.append(button(evolveText(state.spaceView?ui.comparison:ui.space),false,()=>{state.spaceView=!state.spaceView;writeUrl();update();}));
    if(state.spaceView){tools.append(button(evolveText(ui.resetCamera),false,()=>scene?.resetSpaceCamera()));if(state.evolutionTrack!=='low-mass'){const shell=button(evolveText(state.cutaway?ui.exterior:ui.cutaway),state.cutaway,()=>{state.cutaway=!state.cutaway;writeUrl();update();});shell.dataset.shellControl='';shell.hidden=!evolutionShellVisible();tools.append(shell);}}
    const timing=document.createElement('p');timing.className='scale-note evolution-timing';timing.textContent=evolveText(ui.playbackNote);transport.append(tools,timing);
    el('scene-title').textContent=evolveText(ui.title);el('context').textContent=evolveText(ui.context);el('scale-note').textContent=evolveText(state.spaceView?ui.spaceScale:state.evolutionTrack==='low-mass'?ui.scaleLow:state.evolutionTrack==='solar'?ui.scale:ui.scaleMassive);updateEvolutionCopy();updateReadout();draw();return;
  }
  if(chapter==='nebulae'){
    const ui=nebulaWords.ui,words=nebulaWords.cases[state.nebulaKind],reference=nebulaWords.references[state.nebulaReference],nursery=state.nebulaKind==='nursery';controls.classList.add('nebula-controls');
    const cases=document.createElement('div');cases.className='nebula-cases';cases.setAttribute('role','group');cases.setAttribute('aria-label',text(ui.choices));
    for(const key of [...NEBULA_REFERENCES,'planetary','supernova'] as const){
      const isCloud=key!=='planetary'&&key!=='supernova',label=isCloud?nebulaWords.references[key]:nebulaWords.cases[key];
      const choice=button(text(label.shortName),isCloud?nursery&&state.nebulaReference===key:state.nebulaKind===key,()=>{
        if(key==='planetary'||key==='supernova')state.nebulaKind=key;
        else {state.nebulaKind='nursery';state.nebulaReference=key;}
        writeUrl();update();el('controls').querySelector<HTMLButtonElement>(`[data-nebula-choice="${key}"]`)?.focus({preventScroll:true});
      });
      choice.dataset.nebulaChoice=key;choice.title=text(label.name);choice.setAttribute('aria-label',text(label.name));cases.append(choice);
    }
    controls.append(cases);
    if(nursery){const group=document.createElement('div');group.className='nebula-light';group.setAttribute('role','group');group.setAttribute('aria-label',text(ui.lightLabel));for(const light of ILLUMINATIONS)group.append(button(text(nebulaWords.illumination[light].name),state.illumination===light,()=>{state.illumination=light;writeUrl();update();}));controls.append(group);}
    else transport.append(button(evolveText(state.cutaway?evolutionWords.ui.exterior:evolutionWords.ui.cutaway),state.cutaway,()=>{state.cutaway=!state.cutaway;writeUrl();update();}));
    transport.append(button(evolveText(evolutionWords.ui.resetCamera),false,()=>scene?.resetSpaceCamera()));
    if(nursery){
      const prompt=document.createElement('p'),source=document.createElement('a');prompt.className='nebula-reference-prompt';prompt.append(text(reference.observe)+' ');source.textContent=text(ui.referencePhoto);source.href=reference.source;source.target='_blank';source.rel='noopener noreferrer';source.setAttribute('aria-label',text(ui.referencePhoto)+' · '+text(reference.name));prompt.append(source);controls.append(prompt);
    }
    el('scene-title').textContent=text(ui.title);el('context').textContent=text(nursery?reference.name:words.name);el('scale-note').textContent=text(nursery?ui.referenceBoundary:ui.scale);
    el('explain-title').textContent=text(nursery?reference.name:words.name);el('explain').textContent=text(words.body)+(nursery?' '+text(nebulaWords.illumination[state.illumination].body):'');el('boundary').textContent=text(words.boundary);el<HTMLAnchorElement>('source').href=nursery?reference.source:words.source;
    reading.set(nebulaStudy(state.nebulaKind,state.illumination,state.nebulaReference));updateReadout();draw();return;
  }
  if(chapter==='anatomy'){
    const ui=anatomyWords.ui;controls.classList.add('anatomy-controls');for(const [i,feature]of anatomyWords.features.entries())controls.append(button(evolveText(feature.name),state.anatomyFocus===i,()=>{state.anatomyFocus=i;writeUrl();update();}));
    if(state.anatomyFocus===4){
      const seek=slider(text(ui.flareProgress),state.flareTime,0,FLARE_DURATION,value=>{setSurface(false);state.flareTime=value;updateAnatomyFlare();},'flare-progress');
      const replay=button(text(ui.replayFlare),false,()=>{state.flareTime=0;updateAnatomyFlare();writeUrl();draw();setSurface(true);});
      const status=document.createElement('p');status.id='flare-status';status.className='scale-note';status.setAttribute('role','status');
      const note=document.createElement('p');note.className='scale-note';note.textContent=text(ui.flareNote);transport.append(replay,seek,status,note);
    }
    const focus=anatomyWords.features[state.anatomyFocus]!;el('scene-title').textContent=evolveText(ui.title);el('context').textContent=evolveText(focus.name);el('scale-note').textContent=evolveText(ui.scale);
    el('explain-title').textContent=evolveText(focus.name);el('explain').textContent=evolveText(focus.body);el('boundary').textContent=evolveText(focus.boundary);el<HTMLAnchorElement>('source').href=focus.source;reading.set(anatomyStudies[state.anatomyFocus]!);updateAnatomyFlare();updateReadout();draw();return;
  }
  el('scene-title').textContent=u(chapter==='sun'?'sunTitle':chapter==='types'?'typesTitle':'orbitsTitle');
  el('context').textContent=chapter==='types'?text(data.types[state.type]!.name):chapter==='orbits'?text(data.orbitCases[state.orbitCase].name):u('sunContext');
  el('scale-note').textContent=u(chapter==='sun'?'sunScale':chapter==='types'?(state.section?'sectionScale':'typeScale'):'orbitScale');
  layerKey.hidden=chapter!=='types'||!state.section;
  layerKey.replaceChildren(...(layerKey.hidden?[]:data.types[state.type]!.layers.map(layer=>{const item=document.createElement('li');item.textContent=text(layer.name);return item;})));
  if(chapter==='sun')transport.append(slider(u('distance'),state.distance,0,1,v=>state.distance=v));
  if(chapter==='types'){for(const [index,model]of data.types.entries())controls.append(button(text(model.name),state.type===index,()=>{state.type=index;writeUrl();update();}));transport.append(button(u(state.section?'compare':'section'),state.section,()=>{state.section=!state.section;update();}));}
  if(chapter==='orbits'){controls.classList.add('orbit-controls');for(const kind of ORBIT_CASES)controls.append(button(text(data.orbitCases[kind].name),state.orbitCase===kind,()=>{stop();state.orbitCase=kind;state.time=0;writeUrl();update();}));transport.append(slider(u('phase'),state.time%40,0,40,v=>{stop();state.time=v;},'phase'));}
  el('explain-title').textContent=chapter==='types'?text(data.types[state.type]!.name):el('scene-title').textContent;
  el('explain').textContent=chapter==='sun'?u('sunExplain'):chapter==='types'?text(data.types[state.type]!.description):text(data.orbitCases[state.orbitCase].explain);
  el('boundary').textContent=chapter==='sun'?u('sunBoundary'):chapter==='types'?u(state.section?'sectionScale':'typeScale'):text(data.orbitCases[state.orbitCase].boundary);
  el<HTMLAnchorElement>('source').href=chapter==='sun'?'https://science.nasa.gov/sun/facts/':chapter==='types'?'https://science.nasa.gov/universe/stars/types/':data.orbitCases[state.orbitCase].source;
  reading.set(chapter==='sun'?sunDistanceStudy:chapter==='types'?typesStudy:orbitStudies[state.orbitCase]);
  updateReadout();draw();
}
function updateEvolutionCopy(){const track=evolutionWords.tracks[state.evolutionTrack],position=evolutionPosition(state.evolutionProgress),stage=position.phaseIndex,solarStep=state.evolutionTrack==='solar'?solarTransition(state.evolutionProgress):undefined,words=solarStep?evolutionWords.solarTransitions[solarStep]:track.stages[stage]!;
  el('scene-title').textContent=evolveText(words.name);el('context').textContent=evolveText(track.name);
  const shell=transport.querySelector<HTMLElement>('[data-shell-control]');if(shell)shell.hidden=!evolutionShellVisible();
  el('explain-title').textContent=evolveText(words.name);el('explain').textContent=evolveText(words.body);el('boundary').textContent=evolveText(track.summary);
  el<HTMLAnchorElement>('source').href=solarStep?evolutionWords.sources[solarStep==='helium'||solarStep==='agb'?'heliumBurning':'preplanetary']:stage<=1?evolutionWords.sources.formation:state.evolutionTrack==='low-mass'&&stage>=3?evolutionWords.sources.lowMass:stage===6?(state.evolutionTrack==='very-massive'?evolutionWords.sources.accretion:state.evolutionTrack==='massive'?evolutionWords.sources.neutronCooling:evolutionWords.sources.whiteDwarfCooling):state.evolutionTrack==='solar'&&stage===4?evolutionWords.sources.planets:stage>=5?evolutionWords.sources.remnants:evolutionWords.sources.life;
  [...el('controls').querySelectorAll<HTMLButtonElement>('.evolution-phases button')].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===stage)));
  reading.set(evolutionStudy(state.evolutionTrack,stage,state.evolutionProgress));
}
playButton.onclick=toggle;
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();setSurface(false);threeBody.suspend();}else if(!disposed&&state.chapter==='three-body')threeBody.setActive(true);});
window.addEventListener('pagehide',event=>{stop();setSurface(false);threeBody.suspend();if(!event.persisted){disposed=true;scene?.dispose();threeBody.dispose();}});
window.addEventListener('pageshow',()=>{if(!disposed){draw();threeBody.setActive(state.chapter==='three-body');}});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches){stop();setSurface(false);threeBody.suspend();}});
window.addEventListener('popstate',()=>{stop(false);Object.assign(state,readState(location.search));state.type=Math.round(state.type);update();});
for(const a of document.querySelectorAll<HTMLAnchorElement>('.next-links a'))a.href=languageHref(a.getAttribute('href')!);
update();setSurface(surfacePlaying);
