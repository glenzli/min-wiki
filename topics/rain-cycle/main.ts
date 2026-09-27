import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument, language, languageHref } from '../../src/platform/i18n.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { enhanceDisclosure, setDisclosureOpen } from '../../src/platform/disclosure.ts';
import { StudySlot, type StudyStatus } from './studies.ts';
import { t } from './i18n.ts';
import content from './watershedContent.json';
import { readRoute, waterHref, views, focuses, tracerFor, destination, type View, type Pool, type Surface } from './watershedModel.ts';
import { drawWatershed } from './watershedScene.ts';
import type { TopicScene } from '../rain-formation/scene.ts';
import './style.css';

translateDocument(t);
const copy=language==='en'?content.en:content.zh;
const studyLanguage=language==='en'?'en':'zh';
document.title=copy.title;
const root=document.querySelector('main')!;
root.innerHTML=`<header class="hero"><p class="eyebrow">MINI WIKI · EARTH</p><h1>${copy.title}</h1><p class="intro">${copy.intro}</p></header>
<div class="experiments" id="views" aria-label="${copy.views.basin}"></div>
<nav class="slow-jumps" aria-label="${copy.longTime}"><span>${copy.longTime}</span><button data-study="ground">${copy.groundStudy}</button><button data-study="ice">${copy.glacierStudy}</button></nav>
<section class="lab"><div class="scene-column"><div class="scene-top"><strong id="question"></strong><label class="check"><input id="labels" type="checkbox" checked>${copy.labels}</label></div>
<svg id="scene" viewBox="0 0 1000 620" role="img" aria-label="${copy.intro}"></svg><p class="map-key">${copy.mapKey}</p>
<div class="stage-controls"><button id="play" aria-pressed="false">${copy.play}</button><input id="progress" type="range" min="0" max="1000" step="1" value="0" aria-label="${copy.progress}"><button id="reset">${copy.reset}</button></div><p class="time-note">${copy.time}</p></div>
<aside><div class="batch-readout"><strong>${copy.poolTitle}</strong><p id="batch-summary"></p></div><h2>${copy.follow}</h2><select id="follow" aria-label="${copy.follow}">${Object.entries(copy.followOptions).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><p id="trace" class="small"></p>
<label for="humidity">${copy.humidity} <output id="humidity-value"></output></label><input id="humidity" type="range" min="0" max="100" step="1">
<label for="surface">${copy.surface}</label><select id="surface">${Object.entries(copy.surfaces).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select>
<label for="route">${copy.route}</label><select id="route">${Object.entries(copy.routes).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></aside></section>
<section class="pool-section"><h2>${copy.poolTitle}</h2><div class="pool-grid" id="pools"></div></section>
<article class="discovery"><div><p class="eyebrow" id="view-title"></p><h2 id="story-title"></h2><p id="story"></p><p id="description"></p></div></article>
<section class="cloud-study" id="cloud-panel" hidden><div><h2>${copy.cloudTitle}</h2><p>${copy.cloudNote}</p><div id="cloud-error" hidden><p>${copy.error}</p><button id="retry">${copy.retry}</button></div></div><canvas id="cloud-canvas" role="img" aria-label="${copy.cloudNote}"></canvas></section>
<section class="ice-study" id="ice-panel" hidden><h2>${copy.iceProgress}</h2><p>${copy.iceNote}</p><button id="prepare-ice">${copy.prepareIce}</button><input id="ice-progress" type="range" min="0" max="1000" step="1" value="0" aria-label="${copy.iceProgress}"></section>
${(['ground','ice'] as const).map(id=>`<section class="long-study" id="${id}-study" hidden aria-label="${id==='ground'?copy.groundStudy:copy.glacierStudy}"><p class="study-bridge">${id==='ground'?copy.groundBridge:copy.iceBridge}</p><div class="study-status" id="${id}-study-status"><p role="status">${copy.loadingStudy}</p><button id="${id}-study-retry" hidden>${copy.retryStudy}</button></div><div id="${id}-study-host"></div><button class="return-to-batch" data-return="${id}">${copy.backToBatch}</button></section>`).join('')}
<details class="grownups"><summary>${copy.notesTitle}</summary><p>${copy.notes}</p><h2>${copy.sources}</h2><ul><li><a href="https://www.usgs.gov/water-science-school/water-cycle">USGS · Water cycle</a></li><li><a href="https://gpm.nasa.gov/resources/faq/what-are-clouds-made-are-they-more-likely-form-polluted-air-or-pristine-air">NASA · Cloud droplets and ice</a></li><li><a href="https://wa.water.usgs.gov/pubs/fs/fs_rainier.html">USGS · Glacier flow</a></li></ul></details>
<nav class="related"><h2>${copy.connections}</h2><a href="${languageHref('/topics/atmosphere/?view=motion')}">${copy.atmosphere}</a><a href="${languageHref('/topics/water-states/')}">${copy.phase}</a><a href="${languageHref('/topics/wind/')}">${copy.wind}</a></nav>`;
mountTopicNavigation('rain-cycle');
mountReadingMode('details:not(.references)');
const el=(id:string)=>document.getElementById(id)!;
const input=(id:string)=>el(id) as HTMLInputElement;
const select=(id:string)=>el(id) as HTMLSelectElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let session=readRoute(location.search),p=session.progress,settings=session.settings,view=session.view;
let selectedPool:Pool='soil',tracer=tracerFor(selectedPool,settings),iceProgress=0,playing=false,frame=0;
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
function draw(){
 const snapshot=drawWatershed(p,settings,iceProgress,tracer,input('labels').checked);
 el('scene').innerHTML=snapshot.scene;el('scene').setAttribute('viewBox',camera.join(' '));
 const largest=Object.entries(snapshot.pools).filter(([,count])=>count>0).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const summary=`100 ${copy.unit} · ${copy.leadingStores}: `+largest.map(([pool,count])=>`${copy.pools[pool as Pool]} ${count}`).join(' · ');
 if(el('batch-summary').textContent!==summary)el('batch-summary').textContent=summary;
 const stage=p<.22?0:p<.44?1:p<.64?2:3;
 el('story-title').textContent=copy.stages[stage]!;el('story').textContent=copy.stories[stage]!;
 el('view-title').textContent=copy.views[view];el('description').textContent=copy.descriptions[view];el('question').textContent=copy.questions[view];
 input('progress').value=String(Math.round(p*1000));input('progress').setAttribute('aria-valuetext',`${Math.round(p*100)}% · ${copy.stages[stage]}`);
 input('humidity').value=String(settings.humidity);el('humidity-value').textContent=`${settings.humidity}%`;select('surface').value=settings.surface;select('route').value=settings.route;
 el('play').textContent=playing?copy.pause:p>=1?copy.replay:copy.play;el('play').setAttribute('aria-pressed',String(playing));
 const destinations=Array.from({length:100},(_,id)=>destination(id,settings));
 el('trace').textContent=`${copy.trace} ${tracer+1} · ${copy.pools[snapshot.selected.pool]}${destinations.includes(selectedPool)?'':` · ${copy.unavailable}`}`;
 for(const option of select('follow').options)option.disabled=!destinations.includes(option.value as Pool);
 el('pools').replaceChildren(...Object.entries(snapshot.pools).map(([pool,count])=>{const card=document.createElement('div');card.className=`pool-card${count?' occupied':''}`;const label=document.createElement('span');label.textContent=copy.pools[pool as Pool];const value=document.createElement('strong');value.textContent=String(count);card.append(label,value);return card;}));
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 el('cloud-panel').hidden=view!=='cloud';el('ice-panel').hidden=view!=='ice';input('ice-progress').disabled=p<.64;input('ice-progress').value=String(Math.round(iceProgress*1000));
 if(view==='cloud'){void ensureCloud();cloud?.draw(microProgress(),settings,true);}
 updateStudies();
}
function chooseView(next:View,push=true){stop();view=next;cancelCamera();const from=camera.slice(),target=focuses[next]!;cancelCamera=animateValue({from:0,to:1,duration:720,onUpdate:f=>{camera=from.map((n,i)=>n+(target[i]!-n)*f);draw();}});writeURL(push);draw();}
el('views').replaceChildren(...views.map(id=>{const b=document.createElement('button');b.textContent=copy.views[id];b.dataset.view=id;b.addEventListener('click',()=>chooseView(id));return b;}));
root.querySelectorAll<HTMLButtonElement>('[data-study]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.study as 'ground'|'ice';chooseView(id);el(`${id}-study`).scrollIntoView({block:'start',behavior:'instant'});}));
root.querySelectorAll<HTMLButtonElement>('[data-return]').forEach(b=>b.addEventListener('click',()=>{stop();for(const study of Object.values(studies))void study.setActive(false);el('views').scrollIntoView({block:'start',behavior:'instant'});}));
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
el('play').addEventListener('click',()=>{if(playing){stop();draw();writeURL();return;}stop();if(p>=1){p=0;iceProgress=0;}if(reduced.matches){p=1;draw();writeURL();return;}playing=true;let last=performance.now();const tick=(now:number)=>{p=Math.min(1,p+Math.min(80,now-last)/28000);last=now;if(p>=1)playing=false;draw();if(playing)frame=requestAnimationFrame(tick);else writeURL();};draw();frame=requestAnimationFrame(tick);});
window.addEventListener('popstate',()=>{stop();session=readRoute(location.search);settings=session.settings;p=session.progress;view=session.view;cancelCamera();camera=[...focuses[view]!];draw();});
function suspend(){stop();cancelCamera();draw();}
document.addEventListener('visibilitychange',()=>{suspended=document.hidden;if(suspended)suspend();else updateStudies();});
window.addEventListener('pagehide',event=>{suspended=true;suspend();if(!event.persisted){disposed=true;cloud?.dispose();cloud=undefined;for(const study of Object.values(studies))study.dispose();}});
window.addEventListener('pageshow',()=>{suspended=document.hidden;draw();});
reduced.addEventListener('change',()=>{suspend();camera=[...focuses[view]!];draw();});
draw();

const watershedFrame=mountPresentationFrame({ root: '.lab', visual: '#scene', transport: '.stage-controls', choices: '#views, .scene-top' });
if(watershedFrame){
 watershedFrame.notes.prepend(watershedFrame.notes.querySelector('aside')!);
 watershedFrame.notes.append(root.querySelector('.slow-jumps')!);
}
mountPresentationFrame({ root: '#cloud-panel', visual: 'canvas' });
