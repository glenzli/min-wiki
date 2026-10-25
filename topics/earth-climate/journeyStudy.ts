import {createFinitePlayback} from '../earth/finitePlayback';
import type {ClimateState} from './model';
import {EVIDENCE_MODES,JOURNEY_SCOPES,REGION_A,regionSnapshot} from './journeyModel';
import {evidenceDrawing,regionDrawing} from './journeyEvidence';
import content from './journeyContent.json';

type Hooks={language:'zh'|'en';read:()=>ClimateState;change:(next:ClimateState)=>void;emit:()=>void;pauseBudget:()=>void};
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function mountJourney(host:HTMLElement,hooks:Hooks) {
  const c=content[hooks.language];let disposed=false,scene:ReturnType<typeof import('./journeyScene3d').mountIceEdge3D>|undefined,pending=false,epoch=0,failed=false;
  const events=new AbortController();
  host.innerHTML=`<h3 class="climate-heading">${escape(c.title)}</h3><p class="climate-intro">${escape(c.intro)}</p>
  <nav class="climate-scopes" aria-label="${escape(c.title)}">${JOURNEY_SCOPES.map(scope=>`<button type="button" data-journey-scope="${scope}">${escape(c.scopes[scope])}</button>`).join('')}</nav>
  <div class="climate-site-strip"><strong>${escape(c.site)}</strong><span data-site-status></span><span data-site-stage></span></div>
  <section data-journey-scale="global" data-ice-edge-workbench><div data-ice-edge-visual><div class="climate-global-host" data-ice-edge-three></div><p class="climate-stage-caption">${escape(c.globalCaption)}</p><p class="earth-note" data-ice-edge-failure hidden>${escape(c.fallback)}</p><button type="button" data-ice-edge-retry hidden>${escape(c.retry)}</button><details class="earth-deeper" data-ice-edge-fallback><summary>${escape(c.fallbackTitle)}</summary><svg class="climate-diagram" data-ice-edge-section viewBox="0 0 760 380" role="img" aria-label="${escape(c.fallbackTitle)}"></svg></details></div>
  <div class="earth-controls climate-playback"><button type="button" data-ice-edge-play data-playback-toggle aria-pressed="false">${escape(c.play)}</button><button type="button" data-ice-edge-reset data-playback-reset>${escape(c.reset)}</button><label>${escape(c.direction)}<select data-journey-direction><option value="advance">${escape(c.advance)}</option><option value="retreat">${escape(c.retreat)}</option></select></label></div><p class="earth-note">${escape(c.timeNote)}</p></section>
  <div class="climate-global-controls"><label>${escape(c.stage)}<output data-global-cover></output><input type="range" min="0" max="100" step=".1" data-ice-edge-scrub data-playback-scrub aria-label="${escape(c.stage)}"></label><label>${escape(c.edge)}<output data-edge-latitude></output></label><div class="climate-light-budget"><span data-global-reflected></span><span data-global-absorbed></span><span class="climate-light-bar"><i data-light-reflection></i></span></div><p class="earth-note">${escape(c.lightNote)}</p></div>
  <section data-journey-scale="region" hidden><h4>${escape(c.regionTitle)}</h4><p>${escape(c.regionIntro)}</p><svg class="climate-diagram climate-coast-section" data-region-section viewBox="0 0 760 240" role="img" aria-label="${escape(c.regionIntro)}"></svg><p class="climate-two-sources"><span>${escape(c.seaBranch)} · <b data-sea-state></b></span><span>${escape(c.landBranch)}</span></p><p class="earth-note">${escape(c.budgetClock)}</p><div data-journey-region-host></div></section>
  <section data-journey-scale="evidence" data-sample-workbench hidden><h4>${escape(c.evidenceTitle)}</h4><p>${escape(c.evidenceIntro)}</p><label class="climate-sample-select">${escape(c.sampleSelect)}<select data-journey-sample>${EVIDENCE_MODES.map(mode=>`<option value="${mode}">${escape(c.samples[mode].name)}</option>`).join('')}</select></label><div class="earth-stage climate-sample-stage" data-sample-visual><svg class="climate-diagram" data-sample-section viewBox="0 0 660 340" role="img"></svg></div><div class="earth-controls climate-playback"><button type="button" data-sample-play data-playback-toggle aria-pressed="false">${escape(c.samplePlay)}</button><button type="button" data-sample-reset data-playback-reset>${escape(c.sampleReset)}</button></div><label>${escape(c.sampleProgress)}<output data-sample-output></output><input type="range" min="0" max="100" step="1" data-sample-scrub data-playback-scrub aria-label="${escape(c.sampleProgress)}"></label><p class="earth-note">${escape(c.sampleNote)}</p><div class="climate-sample-copy"><h4 data-sample-title></h4><p data-sample-clue></p><p data-sample-test></p><p class="earth-note" data-sample-limit></p></div></section>
  <p class="earth-note">${escape(c.scaleNote)}</p><details class="earth-deeper"><summary>${escape(c.deepTitle)}</summary>${c.deeper.map(p=>`<section><h4>${escape(p.title)}</h4><p>${escape(p.text)}</p></section>`).join('')}</details>`;
  const get=<T extends Element=HTMLElement>(s:string)=>host.querySelector<T>(s)!;
  const text=(s:string,v:string)=>{get(s).textContent=v;};
  const release=()=>{++epoch;pending=false;scene?.dispose();scene=undefined;};
  const unavailable=()=>{failed=true;release();get<HTMLElement>('[data-ice-edge-three]').hidden=true;get<HTMLElement>('[data-ice-edge-failure]').hidden=false;get<HTMLElement>('[data-ice-edge-retry]').hidden=false;get<HTMLDetailsElement>('[data-ice-edge-fallback]').open=true;};
  function ensure(){
    const s=hooks.read();if(disposed||failed||s.view!=='journey'||s.scope!=='global')return;
    if(scene){scene.resume();scene.update(s.iceCover);return;}if(pending)return;
    pending=true;const ticket=++epoch;
    void import('./journeyScene3d').then(module=>{
      if(disposed||ticket!==epoch||hooks.read().view!=='journey'||hooks.read().scope!=='global')return;
      pending=false;scene=module.mountIceEdge3D(get('[data-ice-edge-three]'),`${c.title}. ${c.globalCaption}`,unavailable);scene.update(hooks.read().iceCover);
    }).catch(()=>{if(!disposed&&ticket===epoch)unavailable();});
  }
  function frame(){
    const s=hooks.read(),snapshot=regionSnapshot(s.iceCover,s.snowReflect);
    host.dataset.regionId=REGION_A.id;host.dataset.globalStage=String(s.iceCover);host.dataset.regionIce=snapshot.inside?'inside':'outside';host.dataset.scope=s.scope;
    text('[data-site-status]',snapshot.inside?c.inside:c.outside);text('[data-site-stage]',`${c.coverage}: ${s.iceCover.toFixed(1)}%`);
    text('[data-global-cover]',`${s.iceCover.toFixed(1)}%`);text('[data-edge-latitude]',`${snapshot.edgeLatitude.toFixed(2)}° N / S`);
    get<HTMLInputElement>('[data-ice-edge-scrub]').value=String(s.iceCover);
    text('[data-global-reflected]',`${c.reflect}: ${snapshot.reflection.reflected.toFixed(1)}`);text('[data-global-absorbed]',`${c.absorbed}: ${snapshot.reflection.absorbed.toFixed(1)}`);
    get<HTMLElement>('[data-light-reflection]').style.width=`${snapshot.reflection.reflected}%`;
    get<SVGElement>('[data-region-section]').innerHTML=regionDrawing(snapshot);text('[data-sea-state]',snapshot.inside?c.iceSea:c.waterSea);
    const latitude=snapshot.edgeLatitude*Math.PI/180,r=157,cx=340,cy=190,x=r*Math.cos(latitude),y=r*Math.sin(latitude);
    const caps=s.iceCover<=0?'':s.iceCover>=100?'<circle cx="340" cy="190" r="157" fill="#e0edef"/>':`<path d="M${cx-x} ${cy-y}A${r} ${r} 0 0 1 ${cx+x} ${cy-y}Z" fill="#e0edef"/><path d="M${cx+x} ${cy+y}A${r} ${r} 0 0 1 ${cx-x} ${cy+y}Z" fill="#e0edef"/>`;
    get('[data-ice-edge-section]').innerHTML=`<rect width="760" height="380" fill="#173543"/><circle cx="340" cy="190" r="157" fill="#39798c"/>${caps}<circle cx="425" cy="79" r="7" fill="#e0aa4d" stroke="#fff0c3" stroke-width="2"/><text x="441" y="85" fill="#f7deb2" font-size="21">A · 45°N</text>`;
    scene?.update(s.iceCover);
  }
  function sampleFrame(){
    const s=hooks.read(),copy=c.samples[s.evidenceMode];
    get('[data-sample-section]').innerHTML=evidenceDrawing(s.evidenceMode,s.samplePhase);get('[data-sample-section]').setAttribute('aria-label',`${copy.name}. ${copy.limit}`);
    get('[data-sample-section]').setAttribute('data-sample-id',`A-P${EVIDENCE_MODES.indexOf(s.evidenceMode)+1}`);
    get<HTMLInputElement>('[data-sample-scrub]').value=String(s.samplePhase);text('[data-sample-output]',`${Math.round(s.samplePhase)}%`);
    text('[data-sample-title]',copy.name);text('[data-sample-clue]',copy.clue);text('[data-sample-test]',copy.test);text('[data-sample-limit]',copy.limit);
  }
  const edge=createFinitePlayback({element:get('[data-ice-edge-workbench]'),id:'ice-edge',durationMs:18000,frameIntervalMs:100,reducedMotionSteps:10,visibilityTarget:get('[data-ice-edge-visual]'),
    readProgress:()=>hooks.read().edgeDirection==='advance'?hooks.read().iceCover/100:1-hooks.read().iceCover/100,
    writeProgress:f=>{const s=hooks.read();hooks.change({...s,iceCover:Math.round((s.edgeDirection==='advance'?f:1-f)*1000)/10});},
    onPlayingChange:playing=>{text('[data-ice-edge-play]',playing?c.pause:c.play);get('[data-ice-edge-play]').setAttribute('aria-pressed',String(playing));get('[data-global-cover]').setAttribute('aria-live',playing?'off':'polite');if(!playing){text('[data-global-cover]',`${hooks.read().iceCover.toFixed(1)}%`);hooks.emit();}},
  });
  const sample=createFinitePlayback({element:get('[data-sample-workbench]'),id:'ice-sample',durationMs:12000,frameIntervalMs:125,reducedMotionSteps:10,visibilityTarget:get('[data-sample-visual]'),
    readProgress:()=>hooks.read().samplePhase/100,writeProgress:f=>hooks.change({...hooks.read(),samplePhase:Math.round(f*1000)/10}),
    onPlayingChange:playing=>{text('[data-sample-play]',playing?c.samplePause:c.samplePlay);get('[data-sample-play]').setAttribute('aria-pressed',String(playing));get('[data-sample-output]').setAttribute('aria-live',playing?'off':'polite');if(!playing){text('[data-sample-output]',`${Math.round(hooks.read().samplePhase)}%`);hooks.emit();}},
  });
  const pause=()=>{edge.pause();sample.pause();scene?.pause();};
  host.addEventListener('click',event=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button)return;
    if(button.hasAttribute('data-ice-edge-retry')){pause();hooks.emit();location.reload();}
    else if(button.dataset.journeyScope){pause();hooks.pauseBudget();hooks.change({...hooks.read(),scope:button.dataset.journeyScope as ClimateState['scope']});}
    else if(button.hasAttribute('data-ice-edge-play')){sample.pause();hooks.pauseBudget();edge.toggle();}
    else if(button.hasAttribute('data-ice-edge-reset')){sample.pause();hooks.pauseBudget();edge.reset();}
    else if(button.hasAttribute('data-sample-play')){edge.pause();hooks.pauseBudget();sample.toggle();}
    else if(button.hasAttribute('data-sample-reset')){edge.pause();hooks.pauseBudget();sample.reset();}
  },{signal:events.signal});
  host.addEventListener('input',event=>{
    const target=event.target as HTMLInputElement;
    if(target.hasAttribute('data-ice-edge-scrub')){sample.pause();hooks.pauseBudget();edge.setProgress(hooks.read().edgeDirection==='advance'?Number(target.value)/100:1-Number(target.value)/100);}
    else if(target.hasAttribute('data-sample-scrub')){edge.pause();hooks.pauseBudget();sample.setProgress(Number(target.value)/100);}
  },{signal:events.signal});
  host.addEventListener('change',event=>{
    const target=event.target as HTMLSelectElement;
    if(target.hasAttribute('data-journey-direction')){pause();hooks.pauseBudget();hooks.change({...hooks.read(),edgeDirection:target.value==='retreat'?'retreat':'advance'});}
    else if(target.hasAttribute('data-journey-sample')){pause();hooks.pauseBudget();hooks.change({...hooks.read(),evidenceMode:target.value as ClimateState['evidenceMode'],samplePhase:0});}
  },{signal:events.signal});
  return {pause,regionHost:get('[data-journey-region-host]'),render(){
    if(disposed)return;const s=hooks.read(),active=s.view==='journey';
    host.querySelectorAll<HTMLElement>('[data-journey-scale]').forEach(panel=>panel.hidden=panel.dataset.journeyScale!==s.scope);
    get<HTMLElement>('.climate-global-controls').hidden=s.scope!=='global';
    host.querySelectorAll<HTMLButtonElement>('[data-journey-scope]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.journeyScope===s.scope)));
    get<HTMLSelectElement>('[data-journey-direction]').value=s.edgeDirection;get<HTMLSelectElement>('[data-journey-sample]').value=s.evidenceMode;
    if(!active||s.scope!=='global'){edge.pause();release();}else ensure();
    if(!active||s.scope!=='evidence')sample.pause();
    frame();if(active&&s.scope==='evidence')sampleFrame();edge.sync();sample.sync();
  },dispose(){if(disposed)return;edge.dispose();sample.dispose();disposed=true;release();events.abort();host.replaceChildren();}};
}
