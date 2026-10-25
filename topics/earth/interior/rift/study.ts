import type { StudyInstance } from '../../studyContract';
import { createFinitePlayback } from '../../finitePlayback';
import copy from './content.json';
import { basinPoint, faultX, parseRiftState, riftFrame, serializeRiftState, type RiftScale, type RiftState } from './model';
import type { RiftScene } from './scene3d';
import './style.css';

type RiftContext = { language: 'zh'|'en'; initialState: string; onStateChange(value: string): void };
const escape=(value:string|number)=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const SOURCES=[
  ['USGS · Understanding plate motions','https://pubs.usgs.gov/gip/dynamic/understanding.html'],
  ['USGS · Elastic rebound','https://www.usgs.gov/media/videos/elastic-rebound'],
  ['EarthScope / IRIS · Rift-related normal faulting','https://web-archive-2022.iris.edu/hq/science_highlights/damaging_quakes_in_the_east_african_rift_zone_moderate_quakes_cause_great_damage_in_small_african_villages_mozambique_experiences_damaging_rift_related_earthquakes'],
  ['McKenzie & Bickle (1988) · Mantle upwelling and partial melting','https://academic.oup.com/petrology/article-abstract/29/3/625/1432023'],
  ['Brune et al. (2023) · Continental rift initiation and evolution','https://www.nature.com/articles/s43017-023-00391-3'],
  ['Ajala et al. (2024) · Blind magmatism in a nonvolcanic rift','https://www.nature.com/articles/s43247-024-01244-7'],
  ['USGS · Cooling and igneous textures','https://www.usgs.gov/media/images/components-igneous-rocks'],
];

function sectionDiagram(state:RiftState,c:typeof copy.en):string{
  const f=riftFrame(state), q=f.quake, X=(x:number)=>400+x*103,Y=(y:number)=>114-y*104;
  if(state.scale==='global'){
    const shift=f.extension*30;
    return `<svg viewBox="0 0 800 430" role="img" aria-label="${escape(c.scaleNotes.global)}"><circle cx="400" cy="205" r="175" fill="#193f51"/>${f.p<=.86?`<path d="M400 68Q385 205 400 330" stroke="#817e61" stroke-width="${32+shift*2}" fill="none"/>`:''}<path d="M${393-shift} 68 Q${282-shift} 58 ${275-shift} 164 Q${251-shift} 220 ${330-shift} 322 L${392-shift} 330 Q${378-shift} 190 ${393-shift} 68" fill="#858d66"/><path d="M${407+shift} 68 Q${508+shift} 81 ${526+shift} 178 Q${548+shift} 255 ${471+shift} 332 L${408+shift} 330 Q${422+shift} 190 ${407+shift} 68" fill="#a09e74"/><path d="M400 90Q388 210 400 313" stroke="#efcf85" stroke-width="3" stroke-dasharray="6 5" fill="none"/><circle cx="400" cy="204" r="6" fill="#efcf85"/><text x="419" y="209" fill="#edf5e8" font-size="20">Rift A</text></svg>`;
  }
  if(state.scale==='material'){
    return `<svg viewBox="0 0 800 430" role="img" aria-label="${escape(c.scaleNotes.material)}"><path d="M110 211H690" stroke="#749689" stroke-dasharray="7 6"/>${f.tags.map(tag=>{
      const startX=115+(tag.index%5)*82,startY=91+Math.floor(tag.index/5)*77;
      const endX=577+((tag.index-16)%2)*80,endY=154+Math.floor((tag.index-16)/2)*80;
      const travel=tag.index>=16?Math.min(1,tag.rise*(state.path==='open'?1:2.6)):0;
      const x=startX+(endX-startX)*travel,y=startY+(endY-startY)*travel;
      const color=tag.phase==='melt'?'#d19a50':tag.phase==='crystal'?'#a0b0a0':'#78866b';
      return `<g data-rift-tag-figure="${tag.id}"><path d="M${x-18} ${y-10}l18-12 20 13-4 22-25 3Z" fill="${color}" stroke="${tag.index===state.tag?'#f4d17f':'#c0caba'}" stroke-width="${tag.index===state.tag?4:1}"/><text x="${x}" y="${y+42}" text-anchor="middle" fill="#dae5dc" font-size="13">${tag.id}</text></g>`;
    }).join('')}</svg>`;
  }
  const left=(y:number)=>X(faultX(y,f,'left')),right=(y:number)=>X(faultX(y,f,'right')),drop=f.basinDrop;
  const top=.43,bottom=-.4,bed=.22,sourceY=Y(-1.1),front=state.path==='open'?f.rise:f.rise*.23;
  const line=(y:number,reverse=false)=>Array.from({length:21},(_,i)=>basinPoint(reverse?1-i/20:i/20,y-drop,f)).map(([x,y])=>`${X(x)} ${Y(y)}`).join(' L');
  return `<svg viewBox="0 0 800 430" role="img" aria-label="${escape(c.scaleNotes.region)}"><rect x="65" y="${Y(bottom)}" width="670" height="${Y(-1.85)-Y(bottom)}" rx="6" fill="#66766a"/><path d="M65 ${Y(top)}L${left(top)} ${Y(top)}L${left(bottom)} ${Y(bottom)}H65Z" fill="#a58d68"/><path d="M${line(top)}L${line(bottom,true)}Z" fill="#a58d68"/><path d="M${right(top)} ${Y(top)}H735V${Y(bottom)}H${right(bottom)}Z" fill="#a58d68"/><path d="M65 ${Y(bed)}H${left(bed)}M${line(bed)}M${right(bed)} ${Y(bed)}H735" stroke="#e2c1a1" stroke-width="3" fill="none"/><path d="M${left(top)} ${Y(top)}L${left(bottom-drop-.11*q.slip)} ${Y(bottom-drop-.11*q.slip)}M${right(top)} ${Y(top)}L${right(bottom-drop)} ${Y(bottom-drop)}" stroke="#eec573" stroke-width="2"/><text x="${left(top)-20}" y="${Y(top)-17}" fill="#f5dfac" class="rift-key-label" font-size="20">F1</text>${f.p>.86?`<path d="M${left(-.065)} ${Y(-.065)}H${right(-.065)}" stroke="#5b9ead" stroke-width="7"/>`:''}<circle cx="414" cy="${sourceY}" r="8" fill="#b8c88d"/><text x="432" y="${sourceY+6}" fill="#edf4da" class="rift-key-label" font-size="20">P1</text>${f.melt>.01?`<path d="M414 ${sourceY}Q400 ${Y(-1.1+front*.5)} 419 ${Y(-1.1+front*.97)}" stroke="#d4a155" stroke-width="${3+f.melt*5}" fill="none"/>`:''}${state.focus==='fault'&&q.wave>0&&q.wave<1?`<circle cx="${left(-.04)}" cy="${Y(-.04)}" r="${18+q.wave*130}" stroke="#f3d89b" stroke-width="2" fill="none" opacity="${1-q.wave}"/>`:''}<text x="83" y="365" fill="#e0e8da" font-size="16">Rift A · F1 · P1</text></svg>`;
}

export function mountRiftStudy(host:HTMLElement,context:RiftContext):StudyInstance {
  const c=copy[context.language];let state=parseRiftState(context.initialState),disposed=false,scene:RiftScene|undefined,loading=false,failed=false,ticket=0;
  const events=new AbortController();const root=host.ownerDocument.createElement('section');root.className='rift-study';root.dataset.riftSite='Rift A';root.dataset.riftFault='F1';root.dataset.riftParcel='P1';
  const buttons=(object:Record<string,string>,attribute:string)=>Object.entries(object).map(([value,label])=>`<button type="button" ${attribute}="${value}" aria-pressed="false">${escape(label)}</button>`).join('');
  const select=(key:string,label:string,values:[string,string][])=>`<label><span>${escape(label)}</span><select data-rift-key="${key}">${values.map(([v,text])=>`<option value="${v}">${escape(text)}</option>`).join('')}</select></label>`;
  root.innerHTML=`<div class="rift-identity"><span>Rift A</span><span>F1</span><span>P1</span></div>
    <div class="rift-scales" role="group" aria-label="${escape(c.title)}">${buttons(c.scales,'data-rift-scale')}</div>
    <div class="rift-heading"><h4 data-rift-question></h4></div>
    <figure class="rift-figure"><div class="rift-viewport" data-rift-viewport><div data-rift-three-host></div><div class="rift-diagram" data-rift-diagram></div><p class="rift-scene-status" data-rift-status role="status"></p></div><figcaption data-rift-scale-note></figcaption></figure>
    <div class="rift-branches" data-rift-branches><p>${escape(c.branchTitle)}</p><div role="group">${buttons(c.branches,'data-rift-focus')}</div></div>
    <div class="rift-camera-controls"><button type="button" data-rift-action="camera">${escape(c.camera)}</button><button type="button" data-rift-action="retry" hidden>${escape(c.retry)}</button><label>${escape(c.renderer)}<select data-rift-key="renderer"><option value="three">${escape(c.three)}</option><option value="diagram">${escape(c.diagram)}</option></select></label></div><p class="rift-camera-hint">${escape(c.cameraHint)}</p>
    <section class="rift-clock" data-rift-geology><label>${escape(c.geology)}<span class="rift-progress-row"><input type="range" min="0" max="100" step="1" data-rift-key="stage"><output data-rift-stage-output></output></span></label><div class="rift-play-controls"><button type="button" data-rift-action="play">${escape(c.play)}</button><button type="button" data-rift-action="back">${escape(c.back)}</button><button type="button" data-rift-action="forward">${escape(c.forward)}</button><button type="button" data-rift-action="reset">${escape(c.reset)}</button></div><p class="earth-note">${escape(c.geologyUnits)}</p><p class="earth-note">${escape(c.quakeHeld)}</p></section>
    <details class="earth-deeper rift-route-context"><summary>${escape(c.identity)}</summary><p>${escape(c.intro)}</p></details>
    <div class="rift-stage-copy"><strong data-rift-stage-name></strong><p data-rift-stage-body></p><p class="earth-note" data-rift-outcome></p></div>
    <section class="rift-fault-workbench" data-rift-fault-workbench><h4>${escape(c.quakeTitle)}</h4><p>${escape(c.quakeIntro)}</p>${select('event',c.event,[['loaded',c.loaded],['unloaded',c.unloaded]])}<div data-rift-quake><label><span data-rift-quake-phase></span><span class="rift-progress-row"><input type="range" min="0" max="100" step="1" data-rift-key="quake"><output data-rift-quake-output></output></span></label><div class="rift-play-controls"><button type="button" data-rift-action="quake-play">${escape(c.quakePlay)}</button><button type="button" data-rift-action="quake-reset">${escape(c.quakeReset)}</button></div></div><p class="earth-note" data-rift-event-disabled hidden>${escape(c.quakeDisabled)}</p><div class="rift-strain-bars"><label>${escape(c.strain)}<meter min="0" max="1" value="0" data-rift-strain></meter></label><label>${escape(c.slip)}<meter min="0" max="1" value="0" data-rift-slip></meter></label></div><p class="earth-note"><span>${escape(c.geologyHeld)} </span><strong data-rift-held-stage></strong></p><p class="earth-note">${escape(c.quakeUnits)}</p></section>
    <section class="rift-material-workbench" data-rift-material-workbench><h4>${escape(c.ledger)}</h4><dl class="rift-ledger"><div><dt>${escape(c.residue)}</dt><dd data-rift-count="residue"></dd></div><div><dt>${escape(c.melt)}</dt><dd data-rift-count="melt"></dd></div><div><dt>${escape(c.crystal)}</dt><dd data-rift-count="crystal"></dd></div></dl><p class="earth-note">${escape(c.total)}</p><p data-rift-material-note></p><p class="earth-note">${escape(c.crystalNote)}</p><details class="rift-track"><summary>${escape(c.track)}</summary><div class="rift-tag-grid">${Array.from({length:20},(_,i)=>`<button type="button" data-rift-tag="${i}" data-material-tag="P1-${String(i+1).padStart(2,'0')}" aria-pressed="false">${String(i+1).padStart(2,'0')}</button>`).join('')}</div><p class="earth-note">${escape(c.tagNote)}</p></details></section>
    <details class="rift-premises"><summary>${escape(c.premises)}</summary><div class="rift-premise-grid">${select('motion',c.motion,[['extend',c.extend],['still',c.still]])}${select('evolution',c.evolution,[['continue',c.continue],['stall',c.stall]])}${select('thermal',c.thermal,[['warm',c.warm],['cool',c.cool]])}${select('path',c.path,[['open',c.open],['sealed',c.sealed]])}${select('cooling',c.cooling,[['slow',c.slow],['fast',c.fast]])}</div><p class="earth-note">${escape(c.motionNote)}</p></details><p class="rift-condition-message" data-rift-condition-message role="status" hidden>${escape(c.conditionReset)}</p>
    <details class="earth-deeper rift-notes"><summary>${escape(c.deeper)}</summary>${c.notes.map(note=>`<section><h4>${escape(note.title)}</h4><p>${escape(note.body)}</p></section>`).join('')}</details><details class="rift-sources"><summary>${escape(c.sources)}</summary><p>${escape(c.asset)}</p><ul>${SOURCES.map(([title,url])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${escape(title)}</a></li>`).join('')}</ul></details>`;
  host.append(root);const get=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const viewport=get('[data-rift-viewport]'),threeHost=get('[data-rift-three-host]');
  const faultWorkbench=get('[data-rift-fault-workbench]');root.insertBefore(faultWorkbench,get('.rift-camera-controls'));faultWorkbench.insertBefore(get('[data-rift-quake]'),faultWorkbench.children[1]);
  root.insertBefore(get('[data-rift-geology]'),get('.rift-camera-controls'));
  const geology=createFinitePlayback({element:get('[data-rift-geology]'),visibilityTarget:viewport,id:'interior-rift-geology',durationMs:18000,readProgress:()=>state.stage/100,writeProgress:value=>setState({...state,stage:Math.round(value*100)}),onPlayingChange:syncPlayback,reducedMotionSteps:20});
  const earthquake=createFinitePlayback({element:get('[data-rift-quake]'),visibilityTarget:viewport,id:'interior-rift-quake',durationMs:3000,readProgress:()=>state.quake/100,writeProgress:value=>setState({...state,quake:Math.round(value*100)}),onPlayingChange:syncPlayback,reducedMotionSteps:16});
  function syncPlayback(){if(disposed)return;get('[data-rift-action="play"]').textContent=geology.isPlaying()?c.pause:c.play;get('[data-rift-action="quake-play"]').textContent=earthquake.isPlaying()?c.quakePause:c.quakePlay;root.dataset.riftPlaying=geology.isPlaying()?'geology':earthquake.isPlaying()?'quake':'paused';}
  function emit(){context.onStateChange(serializeRiftState(state));}
  function destroyScene(){++ticket;loading=false;scene?.dispose();scene=undefined;threeHost.replaceChildren();}
  function unavailable(){if(disposed)return;failed=true;destroyScene();render();}
  function ensureScene(){
    if(disposed||scene||loading||failed)return;loading=true;const own=++ticket;renderStatus();
    void import('./scene3d').then(module=>{
      if(disposed||own!==ticket||state.renderer!=='three')return;
      try{scene=module.mountRiftScene(threeHost,state,{label:c.title+'. '+c.cameraHint,labels:{site:'Rift A',fault:'F1',parcel:'P1',intrusion:c.intrusion},onUnavailable:unavailable,onCamera(scale,vector){if(!disposed){const normalized=vector.map(n=>Math.round(n*10000)/10000) as [number,number,number];if(JSON.stringify(state.camera[scale])===JSON.stringify(normalized))return;state={...state,camera:{...state.camera,[scale]:normalized}};emit();}}});}
      catch{unavailable();return;}
      if(own!==ticket||disposed){scene?.dispose();scene=undefined;return;}loading=false;renderStatus();
    }).catch(()=>{if(own===ticket)unavailable();});
  }
  function renderStatus(){const status=get('[data-rift-status]');status.textContent=failed?c.unavailable:loading?c.loading:'';status.hidden=!status.textContent;get('[data-rift-action="retry"]').hidden=!failed;}
  function render(){
    const f=riftFrame(state),isFault=state.scale==='region'&&state.focus==='fault',isMaterial=state.scale==='material'||state.scale==='region'&&state.focus==='magma';
    root.dataset.riftScale=state.scale;root.dataset.riftStage=String(state.stage);root.dataset.riftQuake=String(state.quake);root.dataset.riftEffectiveStage=String(Math.round(f.p*100));root.dataset.riftPlaying=geology.isPlaying()?'geology':earthquake.isPlaying()?'quake':'paused';
    get('[data-rift-question]').textContent=c.questions[state.scale];get('[data-rift-scale-note]').textContent=c.scaleNotes[state.scale];
    root.querySelectorAll<HTMLButtonElement>('button[data-rift-scale]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.riftScale===state.scale)));
    root.querySelectorAll<HTMLButtonElement>('[data-rift-focus]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.riftFocus===state.focus)));
    root.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-rift-key]').forEach(el=>el.value=String(state[el.dataset.riftKey as keyof RiftState]));
    root.querySelectorAll<HTMLButtonElement>('[data-rift-tag]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.riftTag)===state.tag)));
    get('[data-rift-branches]').hidden=state.scale!=='region';get('[data-rift-fault-workbench]').hidden=!isFault;get('[data-rift-material-workbench]').hidden=!isMaterial;get('[data-rift-geology]').hidden=isFault;
    get('[data-rift-stage-output]').textContent=`${state.stage} / 100`;get('[data-rift-quake-output]').textContent=`${state.quake} / 100`;get('[data-rift-held-stage]').textContent=`${state.stage} / 100`;
    get('[data-rift-stage-name]').textContent=c.stages[f.stage].title;get('[data-rift-stage-body]').textContent=c.stages[f.stage].body;
    get('[data-rift-outcome]').textContent=state.motion==='still'?c.noExtension:state.evolution==='stall'&&state.stage>32?c.stalled:state.thermal==='cool'&&f.p>.43?c.noMelt:'';
    get('[data-rift-quake-phase]').textContent=c.quakePhases[f.quake.phase];get<HTMLMeterElement>('[data-rift-strain]').value=f.quake.strain;get<HTMLMeterElement>('[data-rift-slip]').value=f.quake.slip;
    get('[data-rift-event-disabled]').hidden=state.event!=='unloaded';get<HTMLButtonElement>('[data-rift-action="quake-play"]').disabled=state.event==='unloaded';get<HTMLInputElement>('[data-rift-key="quake"]').disabled=state.event==='unloaded';
    for(const phase of ['residue','melt','crystal'] as const){const amount=f.portions[phase];get(`[data-rift-count="${phase}"]`).textContent=amount>0&&amount<.01?'＜0.01':Number(amount.toFixed(2)).toLocaleString(context.language==='zh'?'zh-CN':'en-US');}
    get('[data-rift-material-note]').textContent=f.melt<.01?c.noMelt:f.rise<.1?c.meltDevelops:state.path==='sealed'?c.meltRetained:c.meltRises;
    const useThree=state.renderer==='three'&&!failed;threeHost.hidden=!useThree;get('[data-rift-diagram]').hidden=useThree;
    if(useThree)ensureScene();else{if(scene||loading)destroyScene();get('[data-rift-diagram]').innerHTML=sectionDiagram(state,c);}
    scene?.update(state);scene?.pause(false);renderStatus();geology.sync();earthquake.sync();syncPlayback();
  }
  function setState(next:RiftState){if(disposed||JSON.stringify(next)===JSON.stringify(state))return;state=next;render();emit();}
  function pauseBoth(){geology.pause();earthquake.pause();scene?.pause(true);}
  root.addEventListener('click',event=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button||!root.contains(button))return;
    if(button.dataset.riftScale){pauseBoth();setState({...state,scale:button.dataset.riftScale as RiftScale});}
    if(button.dataset.riftFocus){pauseBoth();setState({...state,focus:button.dataset.riftFocus as RiftState['focus']});}
    if(button.dataset.riftTag!==undefined)setState({...state,tag:Number(button.dataset.riftTag)});
    const action=button.dataset.riftAction;
    if(action==='play'){earthquake.pause();geology.toggle();}
    if(action==='reset'){earthquake.pause();geology.reset();}
    if(action==='back'||action==='forward'){earthquake.pause();geology.setProgress(Math.min(100,Math.max(0,state.stage+(action==='back'?-10:10)))/100);}
    if(action==='quake-play'&&state.event==='loaded'){geology.pause();earthquake.toggle();}
    if(action==='quake-reset'){geology.pause();earthquake.reset();}
    if(action==='camera')scene?.resetCamera();if(action==='retry')location.reload();
    syncPlayback();root.dataset.riftPlaying=geology.isPlaying()?'geology':earthquake.isPlaying()?'quake':'paused';
  },{signal:events.signal});
  function input(event:Event){
    if(disposed)return;const element=event.target as HTMLInputElement|HTMLSelectElement,key=element.dataset.riftKey;if(!key)return;
    if(event.type==='input'&&element instanceof HTMLSelectElement)return;
    if(key==='stage'){earthquake.pause();geology.setProgress(Number(element.value)/100);return;}
    if(key==='quake'){geology.pause();earthquake.setProgress(Number(element.value)/100);return;}
    pauseBoth();const condition=['motion','evolution','thermal','path','cooling','event'].includes(key);
    const next=parseRiftState(JSON.stringify({...state,[key]:element.value,...(condition?{quake:0}:{})}));
    if(key==='renderer'&&next.renderer==='three')failed=false;
    get('[data-rift-condition-message]').hidden=!condition;setState(next);
  }
  root.addEventListener('input',input,{signal:events.signal});root.addEventListener('change',input,{signal:events.signal});
  render();emit();
  return{pause:pauseBoth,dispose(){if(disposed)return;disposed=true;geology.dispose();earthquake.dispose();events.abort();destroyScene();root.remove();}};
}
