import './style.css';
import content from './content.json';
import { ICE_EVENTS,CLIMATE_VIEWS,CLIMATE_RANGES,parseClimateState,serializeClimateState,rangeMaximum,agePosition,timeTicks,reflectionBudget,meltComparison,type ClimateState } from './model.ts';
import type {StudyContext,StudyInstance} from '../earth/studyContract.ts';
import {createFinitePlayback} from '../earth/finitePlayback';
import {glacierFrame,glacierRoundParts} from './glacierPlayback';
import {mountJourney} from './journeyStudy';
import {glacierTracers} from './glacierTracers';

export function mountStudy(host:HTMLElement,context:StudyContext):StudyInstance {
  const c=context.language==='en'?content.en:content.zh;
  let state=parseClimateState(context.initialState),disposed=false;
  let scene3d:ReturnType<typeof import('./scene3d.ts').mountGlacier3D>|undefined,threeEpoch=0,threePending=false,threeFailed=false;
  const events=new AbortController();
  const root=document.createElement('section');root.className='earth-module climate-study';host.append(root);
  const options=(items:readonly string[],labels:Record<string,string>)=>items.map(key=>`<option value="${key}">${labels[key]}</option>`).join('');
  const slider=(name:string,label:string,min:number,max:number,step:number)=>`<label>${label}<output data-output="${name}"></output><input type="range" data-number="${name}"${name==='steps'?' data-playback-scrub':''} min="${min}" max="${max}" step="${step}" aria-label="${label}"></label>`;
  root.innerHTML=`<nav class="climate-switch" aria-label="${c.title}" data-reader-menu="chapters">${CLIMATE_VIEWS.map(key=>`<button type="button" data-climate-view="${key}" aria-pressed="false">${c.tabs[key]}</button>`).join('')}</nav>
  <section data-climate-panel="journey"></section>
  <section data-climate-panel="history"><h3 class="climate-heading">${c.tabs.history}</h3><p class="climate-intro">${c.historyIntro}</p><div class="earth-controls"><label>${c.eventLabel}<select data-select="event">${ICE_EVENTS.map((e,i)=>`<option value="${e.id}">${String(i+1).padStart(2,'0')} · ${c.events[e.id].name}</option>`).join('')}</select></label><label>${c.rangeLabel}<select data-select="range">${options(CLIMATE_RANGES,c.ranges)}</select></label></div>
  <div class="earth-stage"><svg class="climate-diagram" data-scene="history" viewBox="0 0 860 310" role="img" aria-label="${c.rangeLabel}"></svg></div><div class="climate-time-axis"><span data-time-start></span><span data-time-unit>${c.maUnit}</span><span>0 · ${c.present}</span></div><p class="earth-note">${c.timelineNote}</p><p class="earth-note" data-outside hidden>${c.outside}</p><article class="climate-evidence" aria-live="polite" data-event-copy></article><details class="earth-deeper"><summary>${c.eventList}</summary><ol class="climate-timeline-list">${ICE_EVENTS.map(e=>`<li><b>${c.events[e.id].name}</b> · ${c.events[e.id].time}</li>`).join('')}</ol><p>${c.historyNote}</p></details></section>
  <section data-climate-panel="reflection" hidden><h3 class="climate-heading">${c.tabs.reflection}</h3><p class="climate-intro">${c.reflectionIntro}</p><div class="climate-grid"><div><div class="earth-stage"><svg class="climate-diagram" data-scene="reflection" viewBox="0 0 860 460" role="img" aria-label="${c.reflectionIntro}"></svg></div><p class="climate-stage-caption">${c.reflectionCaption}</p></div><div class="climate-controls">${slider('iceCover',c.iceCover,0,100,1)}${slider('snowReflect',c.snowReflect,50,90,1)}<p class="earth-note">${c.waterReflect}</p><div class="climate-amounts" aria-live="polite" data-reflection-readout></div></div></div><div class="climate-feedback">${c.feedback.map((s,i)=>`<span>${s}</span>${i<c.feedback.length-1?'<b aria-hidden="true">→</b>':''}`).join('')}</div><details class="earth-deeper"><summary>${c.deepTitle}</summary><p>${c.feedbackDeep}</p></details></section>
  <section data-climate-panel="glacier" hidden><h3 class="climate-heading">${c.tabs.glacier}</h3><p class="climate-intro">${c.glacierIntro}</p><div class="climate-grid"><div data-glacier-figure><div data-glacier-visual><div data-three-frame><div data-three-host></div><p class="climate-stage-caption">${c.threeCaption}</p></div><div data-three-failure hidden><p class="earth-note">${c.threeFailure}</p><button type="button" data-three-retry>${c.threeRetry}</button></div><details class="earth-deeper" data-glacier-two><summary>${c.twoView}</summary><div class="earth-stage"><svg class="climate-diagram" data-scene="glacier" viewBox="0 0 860 430" role="img" aria-label="${c.glacierIntro}"></svg></div><p class="climate-stage-caption">${c.glacierCaption}</p></details></div><div class="earth-controls climate-playback"><button type="button" data-playback-toggle aria-pressed="false">${c.play}</button><button type="button" data-playback-reset>${c.rewind}</button><button type="button" data-playback-next>${c.advance}</button></div><output class="climate-playback-position" data-playback-position></output><p class="climate-tracer-status" data-tracer-status></p><p class="earth-note">${c.tracerNote}</p><p class="earth-note">${c.playbackNote}</p><p class="earth-note" data-reduced-note hidden>${c.playbackReduced}</p></div><div class="climate-controls"><div class="climate-presets"><button type="button" data-balance="growth">${c.growth}</button><button type="button" data-balance="steady">${c.steady}</button><button type="button" data-balance="retreat">${c.retreat}</button></div>${slider('accumulation',c.accumulation,0,10,1)}${slider('ablation',c.ablation,0,10,1)}${slider('steps',c.steps,0,12,.001)}<div class="climate-amounts" aria-live="polite" data-glacier-readout></div></div></div><details class="earth-deeper"><summary>${c.deepTitle}</summary><p>${c.balanceDeep}</p></details><h3 class="earth-section-title">${c.meltTitle}</h3><div class="earth-controls"><label>${c.iceLocation}<select data-select="iceLocation"><option value="land">${c.land}</option><option value="floating">${c.floating}</option></select></label>${slider('melt',c.melt,0,100,1)}</div><div class="earth-stage"><svg class="climate-diagram" data-scene="melt" viewBox="0 0 860 320" role="img" aria-label="${c.meltTitle}"></svg></div><p class="earth-readout" aria-live="polite" data-melt-readout></p><p class="climate-stage-caption">${c.meltCaption}</p><details class="earth-deeper"><summary>${c.deepTitle}</summary><p>${c.meltDeep}</p></details></section>
  <p class="earth-controls"><button type="button" data-earth-chapter="history">${c.historyLink} →</button><button type="button" data-earth-chapter="systems">${c.oceanLink} →</button></p><details class="earth-deeper"><summary>${c.sources}</summary><ul class="climate-reference-list">${content.references.map(r=>`<li><a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.title}</a></li>`).join('')}</ul></details>`;
  const query=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const n=(number:number)=>Number.isInteger(number)?String(number):number.toFixed(1);
  const observation=()=>glacierFrame(state.accumulation,state.ablation,state.steps,state.glacierPhase);
  const glacierPanel=query<HTMLElement>('[data-climate-panel="glacier"]');
  const glacierHome=document.createComment('independent-glacier-home');glacierPanel.before(glacierHome);
  const wantsGlacier=()=>state.view==='glacier'||state.view==='journey'&&state.scope==='region';
  function drawHistory(){
    const maximum=rangeMaximum(state.range),left=55,width=750,ticks=timeTicks(state.range);
    let drawing='<rect width="860" height="310" fill="#eef3f1"/>';
    for(let i=0;i<=5;i++){const x=left+width*i/5;drawing+=`<path d="M${x} 15V285" stroke="#cedbdc"/><text x="${x}" y="303" text-anchor="middle">${n(ticks.values[i])}</text>`;}
    ICE_EVENTS.forEach((event,i)=>{
      const y=30+i*29,selected=event.id===state.event;
      drawing+=`<text x="20" y="${y+5}" font-weight="${selected?700:400}">${String(i+1).padStart(2,'0')}</text><path d="M55 ${y}H805" stroke="#d8e1df"/>`;
      if(event.endMa>maximum)return;
      const x1=left+agePosition(event.startMa,state.range)*width,x2=left+agePosition(event.endMa,state.range)*width;
      drawing+=x2-x1<1?`<circle cx="${x2}" cy="${y}" r="${selected?5:3}" fill="${selected?'#a56a2b':'#4a91a6'}"/>`:`<rect x="${x1}" y="${y-7}" width="${x2-x1}" height="14" rx="3" fill="${selected?'#a56a2b':'#4a91a6'}"/>`;
      if(event.startMa>maximum)drawing+=`<path d="M49 ${y}L59 ${y-7}V${y+7}Z" fill="${selected?'#a56a2b':'#4a91a6'}"/>`;
    });
    query('[data-scene="history"]').innerHTML=drawing;
    query('[data-time-start]').textContent=n(ticks.values[0])+' · '+c.past;
    query('[data-time-unit]').textContent=ticks.unit==='ka'?c.kaUnit:c.maUnit;
    const e=c.events[state.event],selected=ICE_EVENTS.find(e=>e.id===state.event)!;
    query<HTMLElement>('[data-outside]').hidden=selected.endMa<=maximum;
    query('[data-event-copy]').innerHTML=`<h4>${e.name}</h4><p><b>${e.time}</b></p><p>${e.story}</p><details class="earth-deeper"><summary>${c.evidence}</summary><p>${e.evidence}</p></details><details class="earth-deeper"><summary>${c.mechanism}</summary><p>${e.mechanism}</p></details><details class="earth-deeper"><summary>${c.uncertainty}</summary><p>${e.uncertainty}</p></details>`;
  }
  function drawReflection(){
    const b=reflectionBudget(state.iceCover,state.snowReflect);
    let cells='';
    for(let i=0;i<100;i++){const x=65+(i%10)*26,y=150+Math.floor(i/10)*25;cells+=`<rect x="${x}" y="${y}" width="25" height="24" rx="2" fill="${i<state.iceCover?'#e7f5f7':'#246a84'}" stroke="${i<state.iceCover?'#9dbfc8':'#1c5974'}"/>`;}
    const rw=6+b.reflected*.45,aw=6+b.absorbed*.45;
    query('[data-scene="reflection"]').innerHTML=`<defs><linearGradient id="climate-rays" x2="0" y2="1"><stop stop-color="#f9e7a7"/><stop offset="1" stop-color="#db9e35"/></linearGradient></defs><rect width="860" height="460" fill="#e9f0ef"/><circle cx="195" cy="61" r="27" fill="#e6b64d"/><path d="M195 97V132" stroke="url(#climate-rays)" stroke-width="50"/><path d="M170 120L195 142L220 120" fill="#dca43c"/>${cells}<text x="195" y="432" text-anchor="middle">${n(state.iceCover)}% · ${c.iceCover}</text><path d="M345 195Q470 125 560 75" fill="none" stroke="#acbfcb" stroke-width="${rw}"/><path d="M535 63L582 61L560 106Z" fill="#acbfcb"/><path d="M345 320Q470 390 560 385" fill="none" stroke="#cb8c42" stroke-width="${aw}"/><path d="M550 361L592 385L550 409Z" fill="#cb8c42"/><text x="620" y="78">${c.reflected}</text><text x="620" y="109">${n(b.reflected)} / 100</text><text x="620" y="376">${c.absorbed}</text><text x="620" y="407">${n(b.absorbed)} / 100</text>`;
    query('[data-reflection-readout]').innerHTML=`<span>${c.reflected}<b>${n(b.reflected)}</b></span><span>${c.absorbed}<b>${n(b.absorbed)}</b></span><small>${c.energyUnit}</small>`;
  }
  function drawGlacier(){
    const b=observation(),mass=b.mass;
    const tracers=glacierTracers(mass,b.round),end=120+(tracers.front-tracers.reference.start)/tracers.reference.length*610,thickness=mass/180*115,control=Math.max(300,end-50);
    const ice=mass>0?`<path d="M120 140Q200 ${173-thickness} 300 ${224-thickness}Q${control} ${280-thickness/3} ${end} 310L${end-9} 328Q300 307 120 170Z" fill="#c9e9ef" stroke="#8db7c6" stroke-width="2"/><path d="M145 154Q290 ${222-thickness} ${end-25} 309" fill="none" stroke="#f5fdff" stroke-width="5"/>`:'';
    const topAt=(x:number)=>{
      const a=x<=300?{x:120,y:140}:{x:300,y:224-thickness},middle=x<=300?{x:200,y:173-thickness}:{x:control,y:280-thickness/3},last=x<=300?{x:300,y:224-thickness}:{x:end,y:310};
      let lo=0,hi=1;for(let i=0;i<18;i++){const t=(lo+hi)/2,q=(1-t)**2*a.x+2*(1-t)*t*middle.x+t*t*last.x;if(q<x)lo=t;else hi=t;}
      const t=(lo+hi)/2;return (1-t)**2*a.y+2*(1-t)*t*middle.y+t*t*last.y;
    };
    const arrows=tracers.markers.map(marker=>{
      const x=120+marker.referenceFraction*610,y=marker.tracked?topAt(x)+8:150+marker.referenceFraction*170,color=marker.tracked?marker.color:'#8b9394';
      return `<g data-glacier-tracer="${marker.id}" data-world-z="${marker.z}" data-tracked="${marker.tracked}"><path d="M${x-7} ${y-5}L${x+15} ${y+5}L${x-5} ${y+9}L${x-1} ${y+2}Z" fill="${color}" stroke="#fffaf0" stroke-width="1.5"/><rect x="${x-19}" y="${y-41}" width="${marker.tracked?43:56}" height="29" rx="5" fill="#fffdf2" stroke="${color}"/><text x="${x-12}" y="${y-19}" fill="${color}" font-size="25" font-weight="700">${marker.id}${marker.tracked?'':'†'}</text></g>`;
    }).join('');
    const points=b.trajectory.map(point=>`${550+point.round*22},${150-point.mass*.58}`).join(' ');
    query('[data-scene="glacier"]').innerHTML=`<defs><linearGradient id="climate-sky" x2="0" y2="1"><stop stop-color="#cadde1"/><stop offset="1" stop-color="#eff1e8"/></linearGradient></defs><rect width="860" height="430" fill="url(#climate-sky)"/><path d="M0 259L135 96L280 239L350 147L516 287L667 220L860 323V430H0Z" fill="#8d9b99"/><path d="M0 325L135 143Q300 285 720 340L860 350V430H0Z" fill="#a6aaa0"/><path d="M86 155L135 97L193 162L156 143L134 156L110 139Z" fill="#edf5f2"/>${ice}<path d="M${Math.max(230,end)} 325Q600 353 674 366T850 385" fill="none" stroke="#4f9eb1" stroke-width="${2+Math.min(7,state.ablation)}"/>${arrows}<path d="M550 160H826M550 160V32" stroke="#627e85" stroke-width="1"/><polyline points="${points}" stroke="#a66e2b" stroke-width="3" fill="none"/><circle cx="${550+b.round*22}" cy="${150-mass*.58}" r="5" fill="#a66e2b"/><text x="565" y="25">${c.mass}</text><text x="650" y="190">${n(b.round)} · ${c.steps}</text><text x="40" y="397">${n(mass)} · ${c.massUnit}</text>`;
    query('[data-glacier-readout]').innerHTML=`<span>${c.mass}<b>${n(b.mass)}</b></span><span>${c.net}<b>${b.netPerStep>0?'+':''}${n(b.netPerStep)}</b></span><small>${c.massUnit}</small>`;
    root.dataset.glacierMass=String(b.mass);root.dataset.glacierRound=String(b.round);
    query('[data-playback-position]').textContent=`${n(b.round)} / 12 · ${c.steps} · ${c.mass}: ${n(b.mass)} ${c.massUnit}`;
    query<HTMLInputElement>('[data-number="steps"]').value=String(b.round);
    query('[data-output="steps"]').textContent=n(b.round);
    query<HTMLButtonElement>('[data-playback-next]').disabled=b.round>=12;
    query('[data-tracer-status]').textContent=tracers.markers.map(marker=>marker.id+(marker.tracked?'':'†')).join(' · ')+(tracers.markers.some(marker=>!marker.tracked)?' · '+c.tracerUnknown:'');
  }
  function drawMelt(){
    const b=meltComparison(state.melt,state.iceLocation),fraction=1-state.melt/100;
    let svg='<rect width="860" height="320" fill="#eef2ed"/>';
    for(const [index,location] of ['land','floating'].entries()){
      const x=35+index*425,y=location==='land'?210-state.melt*.4:210;
      svg+=`<rect x="${x}" y="45" width="365" height="240" rx="10" fill="#fafbf6" stroke="${state.iceLocation===location?'#a56e31':'#8ca4aa'}" stroke-width="${state.iceLocation===location?3:1}"/><path d="M${x+1} ${y}H${x+364}V275H${x+1}Z" fill="#87b9ca"/><path d="M${x} 210H${x+365}" stroke="#a78253" stroke-dasharray="5 5"/><text x="${x+15}" y="31">${location==='land'?c.land:c.floating}</text>`;
      if(location==='land')svg+=`<path d="M${x+15} 264V160H${x+155}V265Z" fill="#8e9c8b"/>`;
      if(fraction>0){const h=80*fraction,w=96*Math.sqrt(fraction),iceX=location==='land'?x+35:x+160,iceY=location==='land'?152-h:210-h*.1;svg+=`<path d="M${iceX} ${iceY}L${iceX+w*.36} ${iceY-13*fraction}L${iceX+w} ${iceY+4}L${iceX+w*.9} ${iceY+h}L${iceX+8} ${iceY+h+8}Z" fill="#deeff3" stroke="#7cabbc"/>`;}
    }
    query('[data-scene="melt"]').innerHTML=svg;
    query('[data-melt-readout]').textContent=`${c.oceanAddition}: ${n(b.directSeaLevelEquivalent)} / 100 · ${c.meltwater}: ${n(b.melted)} / 100 · ${c.remaining}: ${n(b.remaining)} / 100`;
  }
  function releaseThree(){++threeEpoch;threePending=false;scene3d?.dispose();scene3d=undefined;}
  function failedThree(){
    threeFailed=true;releaseThree();query<HTMLElement>('[data-three-frame]').hidden=true;
    query<HTMLElement>('[data-three-failure]').hidden=false;query<HTMLDetailsElement>('[data-glacier-two]').open=true;
  }
  function ensureThree(){
    if(disposed||threeFailed||!wantsGlacier())return;
    const frame=observation();
    if(scene3d){scene3d.resume();scene3d.update(frame.mass,frame.round);return;}
    if(threePending)return;threePending=true;const ticket=++threeEpoch;
    void import('./scene3d.ts').then(module=>{
      if(disposed||ticket!==threeEpoch||!wantsGlacier())return;
      threePending=false;scene3d=module.mountGlacier3D(query('[data-three-host]'),c.threeLabel,failedThree);
      const frame=observation();scene3d.update(frame.mass,frame.round);
    }).catch(()=>{if(!disposed&&ticket===threeEpoch)failedThree();});
  }
  function update(){
    if(disposed)return;
    if(state.view==='journey'&&state.scope==='region')journey.regionHost.append(glacierPanel);else glacierHome.after(glacierPanel);
    root.querySelectorAll<HTMLElement>('[data-climate-panel]').forEach(panel=>panel.hidden=panel===glacierPanel?!wantsGlacier():panel.dataset.climatePanel!==state.view);
    root.querySelectorAll<HTMLElement>('[data-climate-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.climateView===state.view)));
    root.querySelectorAll<HTMLInputElement>('[data-number]').forEach(input=>{const key=input.dataset.number as keyof ClimateState;input.value=String(state[key]);query(`[data-output="${key}"]`).textContent=String(state[key])+(key==='iceCover'||key==='snowReflect'||key==='melt'?'%':'');});
    root.querySelectorAll<HTMLSelectElement>('[data-select]').forEach(select=>select.value=String(state[select.dataset.select as keyof ClimateState]));
    if(state.view==='history')drawHistory();else if(state.view==='reflection')drawReflection();else if(wantsGlacier()){drawGlacier();drawMelt();}
    if(!wantsGlacier())releaseThree();
    journey.render();
    if(wantsGlacier())ensureThree();
    playback.sync();context.onStateChange(serializeClimateState(state));
  }
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const playback=createFinitePlayback({
    element:root,id:'glacier-budget',durationMs:12000,frameIntervalMs:matchMedia('(pointer: coarse)').matches||innerWidth<700?125:80,reducedMotionSteps:12,visibilityTarget:query('[data-glacier-visual]'),
    readProgress:()=>(state.steps+state.glacierPhase/1000)/12,
    writeProgress:fraction=>{
      if(disposed||!wantsGlacier())return;
      state={...state,...glacierRoundParts(fraction*12)};
      drawGlacier();const frame=observation();scene3d?.update(frame.mass,frame.round);context.onStateChange(serializeClimateState(state));
    },
    onPlayingChange:playing=>{
      const button=glacierPanel.querySelector<HTMLButtonElement>('[data-playback-toggle]')!;button.textContent=playing?c.pause:c.play;button.setAttribute('aria-pressed',String(playing));
      for(const selector of ['[data-glacier-readout]','[data-output="steps"]','[data-playback-position]'])query(selector).setAttribute('aria-live',playing?'off':'polite');
      if(!playing&&!disposed){drawGlacier();context.onStateChange(serializeClimateState(state));}
    },
  });
  const journey=mountJourney(query('[data-climate-panel="journey"]'),{language:context.language,read:()=>state,change:next=>{state=next;update();},emit:()=>{if(!disposed)context.onStateChange(serializeClimateState(state));},pauseBudget:()=>playback.pause()});
  const motionNote=()=>{query<HTMLElement>('[data-reduced-note]').hidden=!motion.matches;};
  motion.addEventListener('change',()=>{playback.pause();journey.pause();motionNote();},{signal:events.signal});motionNote();
  root.addEventListener('click',event=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button)return;
    if(button.hasAttribute('data-playback-toggle')){if(button.closest('[data-climate-panel="glacier"]')&&wantsGlacier()){journey.pause();playback.toggle();}return;}
    if(button.hasAttribute('data-playback-reset')){if(button.closest('[data-climate-panel="glacier"]')){journey.pause();playback.reset();}return;}
    if(button.hasAttribute('data-playback-next')){journey.pause();playback.setProgress(Math.min(12,Math.floor(state.steps+state.glacierPhase/1000)+1)/12);return;}
    if(button.hasAttribute('data-three-retry')){location.reload();return;}
    playback.pause();journey.pause();
    const view=button.dataset.climateView;
    if(CLIMATE_VIEWS.includes(view as ClimateState['view']))state.view=view as ClimateState['view'];
    else if(button.dataset.balance){state.accumulation=button.dataset.balance==='growth'?8:4;state.ablation=button.dataset.balance==='retreat'?7:4;}
    else return;
    update();
  },{signal:events.signal});
  root.addEventListener('input',event=>{
    const input=event.target as HTMLInputElement;if(!input.dataset.number)return;
    if(input.dataset.number==='steps'){journey.pause();playback.setProgress(Number(input.value)/12);return;}
    playback.pause();journey.pause();
    state=parseClimateState({...serializeClimateState(state),[input.dataset.number]:input.value});update();
  },{signal:events.signal});
  root.addEventListener('change',event=>{
    const select=event.target as HTMLSelectElement;if(!select.dataset.select)return;
    playback.pause();journey.pause();
    state=parseClimateState({...serializeClimateState(state),[select.dataset.select]:select.value});update();
  },{signal:events.signal});
  update();
  return {pause(){journey.pause();playback.pause();scene3d?.pause();},dispose(){if(disposed)return;journey.dispose();playback.dispose();disposed=true;releaseThree();events.abort();root.remove();}};
}
