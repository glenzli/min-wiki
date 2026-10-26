import {language,languageHref} from '../../src/platform/i18n';
import {mountObservationMode} from '../../src/platform/observationMode';
import {mountSceneReading} from '../../src/platform/sceneReading';
import {chapters,readWorkspace,writeWorkspace,currentProgress,currentLimit,seekWorkspace,healthKey,canPlayWorkspace,WorkspaceClock,type Chapter,type WorkspaceState} from './workspaceModel';
import {SceneLease} from './sceneLifecycle';
import {escaped as e,namespaceSvg,type RendererFactory,type WorkspaceRenderer} from './workspaceRenderer';
import {loadHealthRenderer,rendererKey} from './healthRenderer';
import {observationFor,studyFor} from './healthReading';
import {habitatArt} from '../bacteria/habitats';
import health from './healthContent.json';
import legacy from './workspaceContent.json';
const c=health[language==='en'?'en':'zh'],l=legacy[language==='en'?'en':'zh'];
const options=(entries:Record<string,string>)=>Object.entries(entries).map(([key,label])=>`<option value="${key}">${e(label)}</option>`).join('');
const buttons=(entries:Record<string,string>,data:string)=>Object.entries(entries).map(([key,label])=>`<button type="button" data-${data}="${key}" aria-pressed="false">${e(label)}</button>`).join('');
/** One owner for route admission, remembered examples, finite playback and scene cleanup. */
export function mountMicrobialWorkspace(host:HTMLElement):()=>void{
 host.innerHTML=`<header><h1>${e(c.title)}</h1><p>${e(c.intro)}</p></header>
 <section class="micro-workspace" id="micro-observation" aria-label="${e(c.title)}">
 <nav class="micro-chapters" aria-label="${e(c.ui.process)}">${buttons(c.chapters,'chapter')}</nav>
 <div class="micro-body"><div class="micro-stage" data-reader-stage>
  <div class="micro-location" data-reader-caption><svg id="micro-body-locator" viewBox="0 0 100 170" aria-hidden="true"><path d="M50 9a14 14 0 1 1-.01 0M33 44Q50 36 67 44L78 90 69 94 59 65 61 108 67 157 55 159 49 121 43 159 31 156 38 107 39 65 27 95 18 90Z" fill="#c8c8ba" stroke="#92988b" stroke-width="2"/><g data-locator="airway"><path d="M48 28v37m0-11-12 17m12-17 14 17" stroke="#648995" stroke-width="5" fill="none"/><ellipse cx="37" cy="70" rx="8" ry="12" fill="#95b4b6"/><ellipse cx="60" cy="70" rx="8" ry="12" fill="#95b4b6"/></g><path data-locator="gut" d="M39 89q25-7 22 2t-21 8 20 5-20 7" stroke="#ab8a67" stroke-width="5" fill="none"/><circle data-locator="wound" cx="72" cy="79" r="8" fill="#a76f69"/></svg><span id="micro-location"></span><strong id="micro-specimen-name"></strong></div>
  <div class="micro-view-tools"><button type="button" id="micro-close">${e(l.close)}</button><button type="button" id="micro-cutaway"></button><button type="button" id="micro-flat"></button><button type="button" id="micro-reset-camera">${e(c.ui.resetCamera)}</button><span id="micro-gesture"></span></div>
  <div id="micro-renderer" class="micro-renderer"></div>
  <div id="micro-loading" role="status"><p id="loading-text"></p><button type="button" id="cancel-scene">${e(c.ui.cancel)}</button><button type="button" id="retry-scene">${e(c.ui.retry)}</button><button type="button" id="fallback-scene">${e(c.ui.fallback)}</button></div>
  <div class="micro-live" data-reader-caption><h2 id="micro-state-title"></h2><p id="micro-state-kids"></p></div>
  <div id="micro-player" data-reader-transport><div class="micro-player-buttons"><button type="button" id="micro-play"></button><button type="button" id="micro-reset">${e(c.ui.reset)}</button><output id="micro-position" for="micro-progress"></output></div><label for="micro-progress">${e(c.ui.progress)}</label><input type="range" id="micro-progress" min="0" max="1" step=".001" value="0"></div>
  <p class="micro-scale" id="micro-scale">${e(c.ui.common)}</p>
 </div>
 <aside class="micro-conditions" id="micro-conditions">
  <div data-condition="habitat"><label for="micro-habitat">${e(l.habitatLabel)}</label><select id="micro-habitat">${options(l.habitats)}</select></div>
  <div data-condition="bacteria"><label for="micro-process">${e(c.ui.process)}</label><select id="micro-process">${options(c.processes)}</select></div>
  <div data-condition="form"><label for="micro-form">${e(c.ui.form)}</label><select id="micro-form">${options(c.forms)}</select></div>
  <div data-condition="parts"><label>${e(c.ui.part)}</label><div class="micro-parts">${buttons(l.parts,'part')}</div></div>
  <div data-condition="resources"><label for="micro-resources">${e(l.resourcesLabel)}</label><select id="micro-resources">${options(l.resources)}</select><p>${e(l.resourceNote)}</p></div>
  <div data-condition="virus"><label for="micro-virus">${e(c.ui.virus)}</label><select id="micro-virus">${options(c.viruses)}</select><label for="micro-virus-process">${e(c.ui.virusProcess)}</label><select id="micro-virus-process">${options(c.virusProcesses)}</select></div>
  <div data-condition="phage"><label for="micro-host">${e(l.hostLabel)}</label><select id="micro-host">${options(l.hosts)}</select><div class="micro-views">${buttons(l.views,'view')}</div><p>${e(l.hostNote)}</p></div>
  <div data-condition="case"><label id="micro-case-label" for="micro-case">${e(c.ui.case)}</label><select id="micro-case">${options(c.cases)}</select></div>
  <div data-condition="entry"><label for="micro-entry">${e(c.ui.entry)}</label><select id="micro-entry">${options(c.entry)}</select></div>
  <div data-condition="memory"><label class="micro-checkbox"><input type="checkbox" id="micro-memory">${e(c.ui.memory)}</label><p>${e(c.memoryFact)}</p></div>
  <div data-condition="care"><label for="micro-care">${e(c.ui.care)}</label><select id="micro-care">${options(c.methods)}</select></div>
  <div data-condition="resistant"><label class="micro-checkbox"><input type="checkbox" id="micro-resistant">${e(c.ui.resistant)}</label></div>
 </aside>
 <aside class="micro-notes" id="micro-notes"><div class="micro-modes">${buttons({kids:c.ui.kids,academic:c.ui.academic},'mode')}</div><h2>${e(c.ui.facts)}</h2><p id="micro-misconception"></p><p id="micro-note-detail"></p><details><summary>${e(c.ui.source)}</summary><p id="micro-boundary"></p><ul id="micro-current-sources"></ul></details></aside></div>
 <button type="button" id="micro-next" class="micro-next"></button></section>
 <section class="micro-roles" id="micro-roles" data-reader-prose><h2>${e(c.rolesTitle)}</h2><div>${(['yogurt','soil','gut'] as const).map(key=>`<article><svg viewBox="0 0 410 280" aria-hidden="true">${namespaceSvg(habitatArt(key),`role-${key}-`)}</svg><h3>${e(l.roles[key].title)}</h3><p>${e(c[key==='yogurt'?'roleYogurt':key==='soil'?'roleSoil':'roleGut'])}</p></article>`).join('')}</div></section>
 <p class="micro-related" data-reader-prose><a href="${e(languageHref('/topics/handwashing/'))}">${e(c.ui.handwashing)}</a><a href="${e(languageHref('/topics/cells/'))}">${e(c.ui.cells)}</a><a href="${e(languageHref('/topics/tap-water/'))}">${e(c.ui.water)}</a></p>`;
 const get=<T extends HTMLElement=HTMLElement>(id:string)=>host.querySelector<T>(`#${id}`)!;
 const root=get('micro-observation'),stage=get('micro-renderer'),conditions=get('micro-conditions'),notes=get('micro-notes');
 root.dataset.readerWorkbench='';root.dataset.readerLayout='stage';conditions.dataset.readerSupport='';notes.dataset.readerSupport='';
 const main=root.querySelector<HTMLElement>('.micro-stage')!;main.removeAttribute('data-reader-stage');main.dataset.readerMain='';main.parentElement!.dataset.readerLayout='stage';
 const visual=document.createElement('div');visual.className='micro-visual';visual.dataset.readerStage='';visual.dataset.readerFit='available';
 visual.append(stage,get('micro-loading'));
 const essential=document.createElement('div');essential.className='micro-essential';essential.dataset.readerEssential='';essential.append(...main.childNodes);main.append(visual,essential);
 const abort=new AbortController(),events={signal:abort.signal};
 const observation=mountObservationMode(root,{enter:c.ui.enter,exit:c.ui.exit},{fit:true,choices:[host.querySelector<HTMLElement>('.micro-chapters')!],panels:[{label:c.ui.conditions,elements:[conditions],open:false},{label:c.ui.explanation,elements:[notes]}]});
 const reading=mountSceneReading(root,{id:'micro-reading',childTarget:get('micro-state-kids'),controls:host.querySelector<HTMLElement>('.micro-modes')!});
 notes.prepend(host.querySelector('.micro-modes')!);notes.append(reading.element);
 observation.toolbar.addEventListener('click',event=>{const b=(event.target as Element).closest<HTMLButtonElement>('button[aria-controls]');if(b?.getAttribute('aria-expanded')==='true')for(const peer of observation.toolbar.querySelectorAll<HTMLButtonElement>('button[aria-controls][aria-expanded=true]'))if(peer!==b)peer.click();},events);
 const clock=new WorkspaceClock();clock.visible=!document.hidden;
 const lease=new SceneLease<RendererFactory>();let state=readWorkspace(location.search),renderer:WorkspaceRenderer|undefined,currentKey='',frame=0,last=0,disposed=false,admission=0,lastCopy='';
 const progress=get<HTMLInputElement>('micro-progress'),play=get<HTMLButtonElement>('micro-play');
 const remember=(push=false)=>{const url=`${location.pathname}?${writeWorkspace(state,location.search)}${location.hash}`;if(push)history.pushState(null,'',url);else history.replaceState(null,'',url);};
 const playable=()=>canPlayWorkspace(state);
 const structural=()=>state.chapter==='bacteria'&&state.process==='structure'||state.chapter==='viruses'&&state.virusProcess==='structure';
 function stop(){clock.pause();cancelAnimationFrame(frame);frame=0;last=0;renderer?.pause();}
 function renderText(){
  const row=observationFor(state,c,l),key=JSON.stringify(row);
  if(key!==lastCopy){lastCopy=key;get('micro-state-title').textContent=row.title;get('micro-misconception').textContent=c.misconceptions[state.chapter];get('micro-note-detail').textContent=row.detail;get('micro-boundary').textContent=row.scope;get('micro-current-sources').innerHTML=row.sourceKeys.map(key=>`<li><a href="${e(c.sources[key].url)}" target="_blank" rel="noopener noreferrer">${e(c.sources[key].title)}</a></li>`).join('');reading.set(studyFor(state));}
  const p=currentProgress(state),limit=currentLimit(state),percent=Math.round(p/(state.chapter==='viruses'&&state.virus==='phage'?5:1)*100);
  progress.max=String(limit);progress.value=String(p);progress.setAttribute('aria-valuetext',`${percent}%. ${row.title}`);get('micro-position').textContent=`${percent}%`;
  play.textContent=clock.playing?c.ui.pause:p>=limit?c.ui.replay:p>0?c.ui.resume:c.ui.play;play.setAttribute('aria-pressed',String(clock.playing));play.disabled=!clock.ready||!clock.visible;progress.disabled=!clock.ready;
 }
 function controls(){
  root.dataset.chapter=state.chapter;
  for(const b of host.querySelectorAll<HTMLButtonElement>('[data-chapter]'))b.setAttribute('aria-pressed',String(b.dataset.chapter===state.chapter));
  for(const b of host.querySelectorAll<HTMLButtonElement>('[data-part]'))b.setAttribute('aria-pressed',String(b.dataset.part===state.part));
  for(const b of host.querySelectorAll<HTMLButtonElement>('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===state.view));
  const visible:Record<string,boolean>={habitat:state.chapter==='environment',bacteria:state.chapter==='bacteria',form:state.chapter==='bacteria'&&state.process==='structure',parts:state.chapter==='bacteria'&&state.process==='structure'&&state.form==='rod',resources:state.chapter==='bacteria'&&state.process==='division',virus:state.chapter==='viruses',phage:state.chapter==='viruses'&&state.virus==='phage'&&state.virusProcess==='cycle',case:['infection','immunity','care'].includes(state.chapter),entry:['infection','immunity'].includes(state.chapter)||state.chapter==='viruses'&&state.virus!=='phage'&&state.virusProcess==='cycle',memory:state.chapter==='immunity'&&state.entry==='entered',care:state.chapter==='care',resistant:state.chapter==='care'&&state.care==='antibiotic'&&state.healthCase==='wound'};
  for(const group of host.querySelectorAll<HTMLElement>('[data-condition]'))group.hidden=!visible[group.dataset.condition!];
  for(const [id,key]of [['micro-habitat','habitat'],['micro-process','process'],['micro-resources','resources'],['micro-form','form'],['micro-virus','virus'],['micro-virus-process','virusProcess'],['micro-host','host'],['micro-case','healthCase'],['micro-entry','entry'],['micro-care','care']] as const)get<HTMLSelectElement>(id).value=state[key];
  get<HTMLInputElement>('micro-memory').checked=state.memory;get<HTMLInputElement>('micro-resistant').checked=state.resistant;
  get('micro-body-locator').toggleAttribute('hidden',!['infection','immunity'].includes(state.chapter));get('micro-case-label').textContent=state.chapter==='care'?c.ui.target:c.ui.case;for(const option of get<HTMLSelectElement>('micro-case').options)option.textContent=(state.chapter==='care'?c.careTargets:c.cases)[option.value as WorkspaceState['healthCase']];for(const point of host.querySelectorAll<SVGElement>('[data-locator]'))point.toggleAttribute('hidden',point.dataset.locator!==state.healthCase);get('micro-location').textContent=c.locations[state.chapter];get('micro-specimen-name').textContent=state.chapter==='bacteria'?state.process==='structure'?c.forms[state.form]:l.identities.bacteria:state.chapter==='viruses'?c.viruses[state.virus]:state.chapter==='environment'?l.habitats[state.habitat]:state.chapter==='care'?c.careTargets[state.healthCase]:c.cases[state.healthCase];
  get('micro-player').hidden=!playable();get('micro-close').hidden=state.chapter!=='environment'&&!['infection','immunity','care'].includes(state.chapter)&&!(state.chapter==='viruses'&&state.virus!=='phage'&&state.virusProcess==='cycle');get('micro-close').textContent=state.chapter==='environment'?(state.closer?l.wide:l.close):(state.healthClose?c.ui.processWide:c.ui.processClose);
  get('micro-cutaway').hidden=!structural()||state.chapter==='bacteria'&&state.form!=='rod'||state.chapter==='viruses'&&state.virus==='phage'&&state.flat;get('micro-cutaway').textContent=state.cutaway?c.ui.exterior:c.ui.cutaway;get('micro-cutaway').setAttribute('aria-pressed',String(state.cutaway));
  get('micro-flat').hidden=!structural();get('micro-flat').textContent=state.flat?c.ui.three:c.ui.flat;
  get('micro-reset-camera').hidden=!structural()||state.flat;get('micro-reset-camera').toggleAttribute('disabled',!clock.ready);
  get('micro-gesture').hidden=!structural();get('micro-gesture').textContent=state.flat?c.ui.flatNote:c.ui.gesture;
  get('micro-scale').textContent=state.chapter==='infection'?c.ui.noDiagnosis:c.ui.common;get('micro-roles').hidden=state.chapter!=='environment';get('micro-next').textContent=`${c.ui.next} · ${c.chapters[chapters[(chapters.indexOf(state.chapter)+1)%chapters.length]!]}`;
  renderText();
 }
 function draw(){renderer?.render(state);renderText();}
 function tick(now:number){frame=0;if(last)clock.tick(state,(now-last)/1000);last=now;draw();if(clock.playing)frame=requestAnimationFrame(tick);else{last=0;remember();}}
 function failed(){if(disposed)return;stop();renderer?.dispose();renderer=undefined;clock.ready=false;currentKey='';stage.replaceChildren();get('micro-loading').hidden=false;get('loading-text').textContent=c.ui.failed;get('cancel-scene').hidden=true;get('retry-scene').hidden=false;get('fallback-scene').hidden=!structural()||state.flat;controls();}
 function prepare(){
  stop();lease.cancel();renderer?.dispose();renderer=undefined;clock.ready=false;stage.replaceChildren();get('micro-loading').hidden=false;get('loading-text').textContent=c.ui.loading;get('cancel-scene').hidden=false;get('retry-scene').hidden=true;get('fallback-scene').hidden=true;
  const ticket=++admission;currentKey=rendererKey(state);controls();
  void lease.request(()=>loadHealthRenderer(state,c,()=>{if(ticket===admission)failed();}),factory=>{try{renderer=factory(stage,l);renderer.render(state);clock.ready=true;get('micro-loading').hidden=true;controls();}catch{failed();}},failed);
 }
 function update(animate=false){controls();if(rendererKey(state)!==currentKey)prepare();else renderer?.render(state,animate);remember();}
 function changeChapter(next:Chapter){stop();remember();if(state.chapter==='viruses'&&next==='infection'&&state.virus!=='phage')state.healthCase=state.virus==='norovirus'?'gut':'airway';state.chapter=next;lastCopy='';remember(true);prepare();}
 root.addEventListener('click',event=>{const b=(event.target as Element).closest<HTMLButtonElement>('button');if(!b)return;
  if(b.dataset.chapter){changeChapter(b.dataset.chapter as Chapter);return;}
  if(b.dataset.part){state.part=b.dataset.part as WorkspaceState['part'];update(true);}
  if(b.dataset.view){state.view=b.dataset.view as WorkspaceState['view'];update(true);}
 },events);
 for(const [id,key]of [['micro-habitat','habitat'],['micro-process','process'],['micro-resources','resources'],['micro-form','form'],['micro-virus','virus'],['micro-virus-process','virusProcess'],['micro-host','host'],['micro-case','healthCase'],['micro-entry','entry'],['micro-care','care']] as const)get<HTMLSelectElement>(id).addEventListener('change',()=>{stop();Object.assign(state,{[key]:get<HTMLSelectElement>(id).value});lastCopy='';update();},events);
 get('micro-memory').addEventListener('change',()=>{stop();state.memory=get<HTMLInputElement>('micro-memory').checked;lastCopy='';update();},events);
 get('micro-resistant').addEventListener('change',()=>{stop();state.resistant=get<HTMLInputElement>('micro-resistant').checked;lastCopy='';update();},events);
 get('micro-close').addEventListener('click',()=>{if(state.chapter==='environment')state.closer=!state.closer;else state.healthClose=!state.healthClose;update(true);},events);
 get('micro-cutaway').addEventListener('click',()=>{state.cutaway=!state.cutaway;update();},events);
 get('micro-flat').addEventListener('click',()=>{state.flat=!state.flat;update();},events);
 get('micro-reset-camera').addEventListener('click',()=>renderer?.reset?.(),events);
 get('micro-next').addEventListener('click',()=>changeChapter(chapters[(chapters.indexOf(state.chapter)+1)%chapters.length]!),events);
 play.addEventListener('click',()=>{if(clock.playing){stop();renderText();remember();return;}clock.start(state);renderText();if(clock.playing){last=0;frame=requestAnimationFrame(tick);}},events);
 progress.addEventListener('input',()=>{stop();seekWorkspace(state,Number(progress.value));draw();remember();},events);
 get('micro-reset').addEventListener('click',()=>{stop();seekWorkspace(state,0);draw();remember();},events);
 get('cancel-scene').addEventListener('click',()=>{lease.cancel();admission++;currentKey='';clock.ready=false;get('loading-text').textContent=c.ui.cancelled;get('cancel-scene').hidden=true;get('retry-scene').hidden=false;controls();},events);
 get('retry-scene').addEventListener('click',prepare,events);
 get('fallback-scene').addEventListener('click',()=>{state.flat=true;prepare();remember();},events);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clock.hide();stop();remember();}else clock.visible=true;renderText();},events);
 window.addEventListener('popstate',()=>{stop();const next=readWorkspace(location.search);next.bacteria={...state.bacteria,[next.resources]:next.bacteria[next.resources]};next.viruses={...state.viruses,[next.host]:next.viruses[next.host]};next.healthProgress={...state.healthProgress,[healthKey(next)]:next.healthProgress[healthKey(next)]??0};state=next;lastCopy='';prepare();},events);
 const dispose=()=>{if(disposed)return;stop();disposed=true;admission++;lease.dispose();clock.dispose();abort.abort();renderer?.dispose();observation.dispose();host.replaceChildren();};
 window.addEventListener('pagehide',event=>{stop();lease.cancel();remember();if(!event.persisted)dispose();},events);
 window.addEventListener('pageshow',event=>{if(disposed)return;clock.visible=!document.hidden;if(event.persisted&&!renderer)prepare();renderText();},events);
 prepare();remember();if(reading.mode==='academic'){const panel=observation.toolbar.querySelector<HTMLButtonElement>(`button[aria-controls~="${notes.id}"]`);if(panel?.getAttribute('aria-expanded')==='false')panel.click();}
 return dispose;
}
