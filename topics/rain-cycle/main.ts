import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { translateDocument, language, languageHref } from '../../src/platform/i18n.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { enhanceDisclosure, setDisclosureOpen } from '../../src/platform/disclosure.ts';
import { StudySlot, type StudyStatus } from './studies.ts';
import { t } from './i18n.ts';
import content from './watershedContent.json';
import explorer from './explorerContent.json';
import { cameraFrames, mix3, spatialWatershedState, type CameraFrame } from './watershedGeography.ts';
import { poreSection } from './poreSection.ts';
import type { Watershed3D } from './watershed3d.ts';
import { readRoute, waterHref, views, focuses, tracerFor, destination, type View, type Pool, type Surface } from './watershedModel.ts';
import { rainState } from '../rain-formation/model.ts';
import { CONTENT as cloudCopy } from '../rain-formation/content.ts';
import { drawWatershed } from './watershedScene.ts';
import type { TopicScene } from '../rain-formation/scene.ts';
import './style.css';

translateDocument(t);
const copy=language==='en'?content.en:content.zh;
const text=language==='en'?explorer.en:explorer.zh;
const studyLanguage=language==='en'?'en':'zh';
document.title=copy.title;
const root=document.querySelector('[data-wiki-document] .study-content')!;
root.classList.add('water-explorer');
root.innerHTML=`<header class="hero rain-hero"><h1>${copy.title}</h1><p>${copy.intro}</p></header>
<nav class="experiments" id="views" aria-label="${text.chapters}" data-reader-menu="chapters" data-reader-toolbar="water-observation"></nav>
<section class="lab" id="water-observation" aria-label="${copy.title}">
<div id="basin-stage" class="basin-stage" data-reader-stage><canvas id="basin-canvas" role="img" tabindex="0" aria-label="${text.sceneLabel}" aria-describedby="basin-gesture basin-scale" hidden></canvas><svg id="scene" viewBox="0 0 1000 620" role="img" aria-label="${copy.intro}"></svg><div id="basin-labels" class="basin-labels"></div>
<div class="basin-camera"><button id="camera-reset" aria-label="${text.resetCamera}">↺</button><button id="zoom-in" aria-label="${text.zoomIn}">＋</button><button id="zoom-out" aria-label="${text.zoomOut}">−</button></div><div class="basin-render-error" id="basin-error" hidden><p role="status">${text.renderFailure}</p><button id="basin-retry">${text.retry}</button></div></div>
<div class="stage-controls" data-reader-transport><button id="play" aria-pressed="false">${copy.play}</button><label class="batch-progress"><span>${copy.progress}</span><input id="progress" type="range" min="0" max="1000" step="1" value="0" aria-label="${copy.progress}"></label><output id="progress-value">0%</output><button id="reset">${copy.reset}</button></div>
<article class="water-story"><p class="eyebrow" id="view-title"></p><h2 id="question"></h2><p id="watch"></p><h3 id="story-title"></h3><p id="story"></p><p class="water-academic" id="cause"></p><p id="try"></p><button id="next-view">${text.next}</button><button id="cloud-jump" hidden>${text.cloudDetail}</button><button id="pore-jump" hidden>${text.groundDetail}</button></article>
<aside class="water-settings"><h2>${text.conditions}</h2><label for="scenario">${text.conditions}</label><select id="scenario">${Object.entries(text.scenarios).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}<option value="custom" disabled>${text.custom}</option></select><p class="small">${text.comparison}</p>
<label for="humidity">${copy.humidity} <output id="humidity-value"></output></label><input id="humidity" type="range" min="0" max="100" step="1"><label for="surface">${copy.surface}</label><select id="surface">${Object.entries(copy.surfaces).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><label for="route">${copy.route}</label><select id="route">${Object.entries(copy.routes).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select>
<label for="follow">${copy.follow}</label><select id="follow">${Object.entries(copy.followOptions).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><p id="trace" class="small"></p><label class="check"><input id="labels" type="checkbox" checked>${copy.labels}</label><p id="basin-gesture" class="small">${text.camera}</p></aside>
<div class="batch-readout"><strong>${copy.poolTitle}</strong><p id="batch-summary"></p><p id="basin-scale">${text.scale}</p></div>
<section class="pool-section"><h2>${copy.poolTitle}</h2><div class="pool-grid" id="pools"></div><p class="small">${text.gasKey}</p><p class="small">${text.surfaceKey}</p></section>
<nav class="slow-jumps" aria-label="${copy.longTime}"><p>${copy.longTime}</p><button data-study="ground">${copy.groundStudy}</button><button data-study="ice">${copy.glacierStudy}</button></nav>
<details class="water-detail"><summary>${text.readMore}</summary><p id="description"></p><p id="view-limit"></p><p>${copy.time}</p></details></section>
<section class="cloud-study" id="cloud-panel" hidden><div><h2>${copy.cloudTitle}</h2><p>${copy.cloudNote}</p><div class="cloud-explanation"><h3 id="cloud-step-title"></h3><p class="cloud-kids" id="cloud-step-kids"></p><p class="cloud-academic cloud-formula" id="cloud-step-formula"></p><p class="cloud-academic" id="cloud-step-academic"></p><p class="cloud-academic cloud-terms" id="cloud-step-terms">${cloudCopy.terms}</p></div><div id="cloud-error" hidden><p>${copy.error}</p><button id="retry">${copy.retry}</button></div></div><canvas id="cloud-canvas" role="img" aria-label="${copy.cloudNote}"></canvas></section>
<section class="pore-study" id="pore-panel" hidden><div><h2>${text.groundTitle}</h2><p>${text.groundNote}</p><p id="pore-explanation"></p><dl class="pore-counts" id="pore-counts"></dl></div><svg id="pore-section" viewBox="0 0 380 290" role="img" aria-label="${text.groundTitle}"></svg></section>
<section class="ice-study" id="ice-panel" hidden data-reader-prose><h2>${copy.iceProgress}</h2><p>${copy.iceNote}</p><button id="prepare-ice">${copy.prepareIce}</button><label>${copy.iceProgress}<input id="ice-progress" type="range" min="0" max="1000" step="1" value="0"></label></section>
${(['ground','ice'] as const).map(id=>`<section class="long-study" id="${id}-study" hidden aria-label="${id==='ground'?copy.groundStudy:copy.glacierStudy}"><p class="study-bridge" data-reader-prose>${id==='ground'?copy.groundBridge:copy.iceBridge}</p><div class="study-status" id="${id}-study-status"><p role="status">${copy.loadingStudy}</p><button id="${id}-study-retry" hidden>${copy.retryStudy}</button></div><div id="${id}-study-host"></div><button class="return-to-batch" data-return="${id}">${copy.backToBatch}</button></section>`).join('')}
<details class="grownups" data-reader-prose><summary>${copy.notesTitle}</summary><p>${copy.notes}</p><h2>${copy.sources}</h2><ul><li><a href="https://www.usgs.gov/water-science-school/water-cycle">USGS · Water cycle</a></li><li><a href="https://www.usgs.gov/water-science-school/science/runoff-surface-and-overland-water-runoff">USGS · Runoff and surface conditions</a></li><li><a href="https://science.nasa.gov/kids/earth/how-do-clouds-form/">NASA · Cloud droplets and ice</a></li><li><a href="https://wa.water.usgs.gov/pubs/fs/fs_rainier.html">USGS · Glacier flow</a></li></ul></details>
<nav class="related" data-reader-prose><h2>${copy.connections}</h2><a href="${languageHref('/topics/atmosphere/?view=motion')}">${copy.atmosphere}</a><a href="${languageHref('/topics/water-states/')}">${copy.phase}</a><a href="${languageHref('/topics/wind/')}">${copy.wind}</a></nav>`;


const el=(id:string)=>document.getElementById(id)!;
const input=(id:string)=>el(id) as HTMLInputElement;
const select=(id:string)=>el(id) as HTMLSelectElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let session=readRoute(location.search),p=session.progress,settings=session.settings,view=session.view;
let selectedPool:Pool='soil',tracer=tracerFor(selectedPool,settings),iceProgress=0,playing=false,frame=0;
let cameraPose:CameraFrame={...cameraFrames[view]};
let basin:Watershed3D|undefined,basinLoading:Promise<void>|undefined,basinFailed=false;
let camera=[...focuses[view]!],cancelCamera=()=>{},cloud:TopicScene|undefined,loading:Promise<void>|undefined,disposed=false,cloudFailed=false;
let suspended=document.hidden;
function syncStudyNotes() {
 const open=!!root.querySelector('[data-mode="academic"][aria-pressed="true"]');
 root.querySelectorAll<HTMLDetailsElement>('.long-study details').forEach(details=>{enhanceDisclosure(details);setDisclosureOpen(details,open);});
}
function studyStatus(id:'ground'|'ice',status:StudyStatus) {
 const box=el(`${id}-study-status`);box.hidden=status==='ready';
 box.querySelector('p')!.textContent=status==='error'?copy.failedStudy:copy.loadingStudy;
 el(`${id}-study-retry`).hidden=status!=='error';if(status==='ready') {
  syncStudyNotes();
  mountPresentationFrame(id==='ground'
   ? {root:'#ground-study-host .gw-study',visual:'.gw-scene',transport:'.gw-playback'}
   : {root:'#ice-study-host .glacier-study',visual:'.glacier-landscape',transport:'.glacier-playback,.glacier-timeline'});
 }
}
const studies={
 ground:new StudySlot(async()=>{const {mountGroundwaterStudy}=await import('./groundwater/index.ts');return ()=>mountGroundwaterStudy(el('ground-study-host'),studyLanguage);},status=>studyStatus('ground',status)),
 ice:new StudySlot(async()=>{const {mountGlacierStudy}=await import('./glacier/index.ts');return ()=>mountGlacierStudy(el('ice-study-host'),studyLanguage);},status=>studyStatus('ice',status)),
};
function updateStudies() {for(const id of ['ground','ice'] as const){el(`${id}-study`).hidden=view!==id;void studies[id].setActive(view===id&&!suspended&&!disposed);}}
function writeURL(push=false){const q=new URLSearchParams(location.search);q.set('view',view);q.set('humidity',String(settings.humidity));q.set('surface',settings.surface);q.set('route',settings.route);q.set('p',p.toFixed(3));const url=waterHref(view,q.toString(),import.meta.env.BASE_URL)+location.hash;(push?history.pushState.bind(history):history.replaceState.bind(history))(null,'',url);}
function stop(){playing=false;cancelAnimationFrame(frame);frame=0;}
function microProgress(){return Math.min(1,p<.44?p/.44*.67:.67+(p-.44)/.2*.33);}
async function ensureCloud(){
 if(cloud||loading||disposed||cloudFailed)return;
 loading=(async()=>{try{const {TopicScene}=await import('../rain-formation/scene.ts');if(disposed||view!=='cloud')return;cloud=new TopicScene(el('cloud-canvas') as HTMLCanvasElement);el('cloud-error').hidden=true;cloud.draw(microProgress(),settings,true);}catch(error){cloudFailed=true;el('cloud-error').hidden=false;console.error(error);}finally{loading=undefined;}})();await loading;
}
function showBasinFailure(failed:boolean){
 if(disposed)return;basinFailed=failed;el('basin-error').hidden=!failed;el('basin-canvas').hidden=failed;el('scene').toggleAttribute('hidden',!failed);el('basin-labels').hidden=failed;root.querySelectorAll<HTMLButtonElement>('.basin-camera button').forEach(button=>button.disabled=failed);
 // The fallback must sample the failure-time frame, not its last pre-GPU frame.
 if(failed)queueMicrotask(()=>{if(!disposed&&basinFailed)draw();});
}
async function ensureBasin(){
 if(basin||basinLoading||disposed||basinFailed)return;
 basinLoading=(async()=>{try{const {Watershed3D}=await import('./watershed3d.ts');if(disposed)return;basin=new Watershed3D(el('basin-canvas') as HTMLCanvasElement,el('basin-labels'),showBasinFailure);draw();}catch(error){showBasinFailure(true);console.error(error);}finally{basinLoading=undefined;}})();await basinLoading;
}
const presets:Record<string,{humidity:number;surface:Surface}>={permeable:{humidity:75,surface:'soil'},dry:{humidity:10,surface:'soil'},paved:{humidity:75,surface:'paved'},clay:{humidity:75,surface:'clay'}};
let ledgerKey='';
function draw(){
 const state=spatialWatershedState(p,settings,iceProgress),snapshot={...state,selected:state.parcels[tracer]};
 if(!basin||basinFailed){const fallback=drawWatershed(p,settings,iceProgress,tracer,input('labels').checked);el('scene').innerHTML=fallback.scene;el('scene').setAttribute('viewBox',camera.join(' '));}
 basin?.draw({progress:p,settings,iceProgress,tracer,labels:input('labels').checked,view,camera:cameraPose});if(!suspended)void ensureBasin();
 const largest=Object.entries(snapshot.pools).filter(([,count])=>count>0).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const summary=`100 ${copy.unit} · ${copy.leadingStores}: `+largest.map(([pool,count])=>`${copy.pools[pool as Pool]} ${count}`).join(' · ');
 if(el('batch-summary').textContent!==summary)el('batch-summary').textContent=summary;
 const stage=p<.22?0:p<.44?1:p<.64?2:3;
 el('story-title').textContent=copy.stages[stage]!;el('story').textContent=copy.stories[stage]!;
 const question=text.questions[view];el('watch').textContent=question.watch;el('cause').textContent=question.cause;el('try').textContent=question.try;el('view-limit').textContent=question.limit;el('progress-value').textContent=`${Math.round(p*100)}%`;select('scenario').value=Object.entries(presets).find(([,next])=>next.humidity===settings.humidity&&next.surface===settings.surface)?.[0]??'custom';
 el('view-title').textContent=copy.views[view];el('description').textContent=copy.descriptions[view];el('question').textContent=copy.questions[view];
 input('progress').value=String(Math.round(p*1000));input('progress').setAttribute('aria-valuetext',`${Math.round(p*100)}% · ${copy.stages[stage]}`);
 input('humidity').value=String(settings.humidity);el('humidity-value').textContent=`${settings.humidity}%`;select('surface').value=settings.surface;select('route').value=settings.route;
 el('play').textContent=playing?copy.pause:p>=1?copy.replay:copy.play;el('play').setAttribute('aria-pressed',String(playing));
 const destinations=Array.from({length:100},(_,id)=>destination(id,settings));
 el('trace').textContent=`${copy.trace} ${tracer+1} · ${copy.pools[snapshot.selected.pool]}${destinations.includes(selectedPool)?'':` · ${copy.unavailable}`}`;
 for(const option of select('follow').options)option.disabled=!destinations.includes(option.value as Pool);
 const ledger=Object.values(snapshot.pools).join(':');if(ledger!==ledgerKey){ledgerKey=ledger;el('pools').replaceChildren(...Object.entries(snapshot.pools).map(([pool,count])=>{const card=document.createElement('div');card.className=`pool-card${count?' occupied':''}`;const label=document.createElement('span');label.textContent=copy.pools[pool as Pool];const value=document.createElement('strong');value.textContent=String(count);card.append(label,value);return card;}));}
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 el('pore-panel').hidden=view!=='ground';el('pore-jump').hidden=view!=='ground';
 if(view==='ground'){const detail=poreSection(p,settings,tracer);el('pore-section').innerHTML=detail.scene;el('pore-explanation').textContent=settings.surface==='paved'?text.groundPaved:settings.surface==='clay'?text.groundClay:text.groundAir;el('pore-counts').replaceChildren(...[[text.soilCount,detail.soil],[text.surfaceCount,detail.surface],[text.runoffCount,detail.runoff]].flatMap(([label,count])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=String(label);dd.textContent=String(count);return [dt,dd];}));}
 el('cloud-panel').hidden=view!=='cloud';el('cloud-jump').hidden=view!=='cloud';el('ice-panel').hidden=view!=='ice';input('ice-progress').disabled=p<.64;input('ice-progress').value=String(Math.round(iceProgress*1000));
 if(view==='cloud'){
  const micro=microProgress(),phase=rainState(micro,settings).stage;
  el('cloud-step-title').textContent=cloudCopy.steps[phase]!;
  el('cloud-step-kids').textContent=phase===2
   ? (settings.route==='ice'?t('过冷水滴附着冰晶，随后融化'):t('小水滴接触后，才并入大水滴'))
   : cloudCopy.stories[phase]!;
  // The volume-addition formula describes liquid-drop coalescence, not ice growth.
  el('cloud-step-formula').hidden=settings.route==='ice'&&phase===2;
  el('cloud-step-terms').hidden=settings.route==='ice'&&phase===2;
  el('cloud-step-formula').textContent=cloudCopy.formulas[phase]!;
  el('cloud-step-academic').textContent=cloudCopy.academic[phase]!;
  void ensureCloud();cloud?.draw(micro,settings,true);
 }
 updateStudies();
}
function chooseView(next:View,push=true){stop();view=next;cancelCamera();const from=camera.slice(),target=focuses[next]!,poseFrom=cameraPose,poseTarget=cameraFrames[next];
 if(reduced.matches){camera=[...target];cameraPose={...poseTarget};}
 else cancelCamera=animateValue({from:0,to:1,duration:620,onUpdate:f=>{camera=from.map((n,i)=>n+(target[i]!-n)*f);cameraPose={target:mix3(poseFrom.target,poseTarget.target,f),span:poseFrom.span+(poseTarget.span-poseFrom.span)*f,pitch:poseFrom.pitch+(poseTarget.pitch-poseFrom.pitch)*f,distance:poseFrom.distance+(poseTarget.distance-poseFrom.distance)*f};draw();}});writeURL(push);draw();}
el('views').replaceChildren(...views.map(id=>{const b=document.createElement('button');b.textContent=copy.views[id];b.dataset.view=id;b.addEventListener('click',()=>chooseView(id));return b;}));
el('next-view').addEventListener('click',()=>chooseView(views[(views.indexOf(view)+1)%views.length]));
el('pore-jump').addEventListener('click',()=>el('pore-panel').scrollIntoView({block:'start',behavior:reduced.matches?'auto':'smooth'}));
select('scenario').addEventListener('change',()=>{stop();const next=presets[select('scenario').value];if(next)settings={...settings,...next};draw();writeURL();});
el('camera-reset').addEventListener('click',()=>basin?.resetCamera());el('zoom-in').addEventListener('click',()=>basin?.zoomBy(.88));el('zoom-out').addEventListener('click',()=>basin?.zoomBy(1.14));
el('basin-retry').addEventListener('click',()=>{
 if(basinLoading||disposed)return;
 basin?.dispose();basin=undefined;
 // A lost WebGL context belongs to its canvas. Recreate both together, while
 // retaining the controller's batch, conditions, selected water and camera.
 const previous=el('basin-canvas'),fresh=previous.cloneNode(false) as HTMLCanvasElement;
 fresh.removeAttribute('data-renders');fresh.removeAttribute('data-view');previous.replaceWith(fresh);
 basinFailed=false;void ensureBasin();
});
el('cloud-jump').addEventListener('click',()=>el('cloud-panel').scrollIntoView({block:'start',behavior:reduced.matches?'auto':'smooth'}));
root.querySelectorAll<HTMLButtonElement>('[data-study]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.study as 'ground'|'ice';chooseView(id);el(`${id}-study`).scrollIntoView({block:'start',behavior:'instant'});}));
root.querySelectorAll<HTMLButtonElement>('[data-return]').forEach(b=>b.addEventListener('click',()=>{stop();for(const study of Object.values(studies))void study.setActive(false);el('water-observation').scrollIntoView({block:'start',behavior:'instant'});}));
for(const id of ['ground','ice'] as const)el(`${id}-study-retry`).addEventListener('click',()=>{void studies[id].retry();});
root.addEventListener('click',event=>{if((event.target as Element).closest('[data-mode]'))syncStudyNotes();});
input('progress').addEventListener('input',()=>{stop();p=Number(input('progress').value)/1000;draw();writeURL();});
for(const id of ['humidity','surface','route'])el(id).addEventListener(id==='humidity'?'input':'change',()=>{stop();settings={humidity:Number(input('humidity').value),surface:select('surface').value as Surface,route:select('route').value as 'warm'|'ice'};draw();writeURL();});
select('follow').addEventListener('change',()=>{selectedPool=select('follow').value as Pool;tracer=tracerFor(selectedPool,settings);draw();});
input('labels').addEventListener('change',draw);
input('ice-progress').addEventListener('input',()=>{stop();iceProgress=Number(input('ice-progress').value)/1000;draw();});
el('prepare-ice').addEventListener('click',()=>{stop();p=1;selectedPool='ice';select('follow').value='ice';tracer=tracerFor('ice',settings);draw();writeURL();});
el('retry').addEventListener('click',()=>{cloudFailed=false;void ensureCloud();});
el('reset').addEventListener('click',()=>{stop();p=0;iceProgress=0;draw();writeURL();});
el('play').addEventListener('click',()=>{if(playing){stop();draw();writeURL();return;}stop();if(p>=1){p=0;iceProgress=0;}playing=true;let last=performance.now(),lastPaint=0;const tick=(now:number)=>{p=Math.min(1,p+Math.min(80,now-last)/28000);last=now;if(p>=1)playing=false;if(now-lastPaint>=42||!playing){draw();lastPaint=now;}if(playing)frame=requestAnimationFrame(tick);else writeURL();};draw();frame=requestAnimationFrame(tick);});
window.addEventListener('popstate',()=>{stop();session=readRoute(location.search);settings=session.settings;p=session.progress;view=session.view;cancelCamera();camera=[...focuses[view]!];cameraPose={...cameraFrames[view]};draw();});
function suspend(){stop();cancelCamera();writeURL();draw();}
const redrawOnResize=()=>{if(!disposed)draw();};
window.addEventListener('resize',redrawOnResize);
document.addEventListener('visibilitychange',()=>{suspended=document.hidden;if(suspended)suspend();else updateStudies();});
window.addEventListener('pagehide',event=>{suspended=true;suspend();if(!event.persisted){disposed=true;window.removeEventListener('resize',redrawOnResize);basin?.dispose();cloud?.dispose();cloud=undefined;for(const study of Object.values(studies))study.dispose();}});
window.addEventListener('pageshow',()=>{suspended=document.hidden;draw();});
reduced.addEventListener('change',()=>{suspend();camera=[...focuses[view]!];cameraPose={...cameraFrames[view]};draw();});

const watershedFrame=mountPresentationFrame({ root: '.lab', visual: '#basin-stage', transport: '.stage-controls', choices: '#views' });
if(watershedFrame){
 watershedFrame.notes.prepend(watershedFrame.notes.querySelector('.water-story')!);
 watershedFrame.notes.append(root.querySelector('.slow-jumps')!);
 watershedFrame.notes.append(root.querySelector('.pool-section')!);
 const batch=watershedFrame.notes.querySelector<HTMLElement>('.batch-readout')!;
 batch.dataset.readerCaption='';watershedFrame.stage.append(batch);
 const mode=root.querySelector<HTMLElement>('.reading-mode-disclosure');
 if(mode){const controls=mode.querySelector<HTMLElement>('.reading-mode');if(controls)el('views').append(controls);mode.remove();}

}
mountReadingMode('details.water-detail');
mountPresentationFrame({ root: '#cloud-panel', visual: 'canvas' });
draw();
