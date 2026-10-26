import { language } from '../../../src/platform/i18n.ts';
import { siteFor, sitesFor, descentState } from '../../solar-system/explorer/model.ts';
import type { ExplorerScene } from '../../solar-system/explorer/scene.ts';
import { INTERIORS } from '../../planet-surfaces/interior.ts';
import { CITIES, EARTH_ESCAPE, energyBalance, realWorld, STEPS, SEASON_STEPS, tiltOutcome, VIEWS, WORLD_IDS, type Step, type View, type WorldId } from './model.ts';
import {TiltViewport} from './tiltView.ts';
import { conditionsURL, destination, readConditions, type ConditionsState } from './route.ts';
import words from './content.json';
import './style.css';

const sources = [
  ['NASA · Earth energy budget', 'https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/'],
  ['NASA · Solar irradiance and effective temperature', 'https://sunclimate.gsfc.nasa.gov/science'],
  ['NASA · Venus', 'https://science.nasa.gov/venus/venus-facts/'],
  ['NASA · Mars', 'https://science.nasa.gov/mars/facts/'],
  ['NASA · Uranus and seasonal illumination', 'https://science.nasa.gov/uranus/facts/'],
];
const svgNS = 'http://www.w3.org/2000/svg';

export function mountConditions(host: HTMLElement) {
  const c = words[language === 'en' ? 'en' : 'zh'];
  let state = readConditions(location.search);
  let scene: ExplorerScene | undefined, loading = false, failed = false, disposed = false;
  let frame = 0, previousTime = 0, activityTime = 0, playing = false, activity = false;
  let inView = true;
  const root = document.createElement('section'); root.id = 'earth-conditions'; root.className = 'earth-conditions';
  root.dataset.readerWorkbench = '';
  // Markup is static; all authored/user-visible strings are assigned as text below.
  root.innerHTML = `
    <header class="if-heading"><h2 data-if-title></h2><p data-if-intro></p></header>
    <nav class="if-route" data-if-route></nav>
    <div class="if-question"><span data-if-kind></span><h3 data-if-question></h3><p data-if-observation></p></div>
    <div class="if-controls" data-if-distance-controls>
      <label class="if-range"><span><span data-if-distance-label></span><output data-if-distance-value></output></span><input data-if-distance type="range" min="0.65" max="1.7" step="0.001"></label>
      <div class="if-actions" data-if-presets></div><p class="if-held" data-if-distance-held></p>
    </div>
    <div class="if-controls" data-if-world-controls><label><span data-if-world-label></span><select data-if-world></select></label><label><span data-if-site-label></span><select data-if-site></select></label><div class="if-actions" data-if-views></div></div>
    <div class="if-controls" data-if-air-controls>
      <label class="if-range"><span><span data-if-escape-label></span><output data-if-escape-value></output></span><input data-if-escape type="range" min="0.4" max="1" step="0.01"></label>
      <div class="if-range-ends"><span data-if-easy></span><span data-if-hard></span></div><p class="if-held" data-if-air-held></p>
    </div>
    <div class="if-controls" data-if-tilt-controls hidden>
      <label class="if-range"><span><span data-if-tilt-label></span><output data-if-tilt-value></output></span><input data-if-tilt type="range" min="0" max="98" step="0.01"></label><div class="if-actions" data-if-tilt-presets></div>
      <label><span data-if-city-label></span><select data-if-city></select></label><label><span data-if-season-label></span><select data-if-season></select></label><p class="if-held" data-if-tilt-held></p>
    </div>
    <section class="if-tilt-readings" data-if-tilt-readings hidden><h4 data-if-tilt-readings-title></h4><table><thead><tr><th></th><th data-if-zero-label></th><th data-if-selected-tilt></th></tr></thead><tbody><tr><th data-if-daylight-label></th><td data-if-zero-daylight></td><td data-if-daylight></td></tr><tr><th data-if-noon-label></th><td data-if-zero-noon></td><td data-if-noon></td></tr></tbody></table></section>
    <div data-if-ruler-wrap class="if-ruler"><svg data-if-ruler role="img"></svg><p data-if-ruler-note></p></div>
    <div class="if-stage" data-if-stage data-reader-stage><canvas data-if-canvas tabindex="0"></canvas><div data-if-tilt-host hidden></div><p data-if-loading role="status"></p><div class="if-failure" data-if-failure hidden><p data-if-failed></p><button type="button" data-if-retry></button></div></div>
    <div class="if-transport" data-if-transport><button type="button" data-if-play></button><label class="if-range"><span data-if-progress-label></span><input data-if-progress type="range" min="0" max="1000" step="1"><output data-if-progress-value></output></label></div>
    <div class="if-scene-caption"><strong data-if-site-name></strong><p data-if-site-observation></p><p class="if-held" data-if-scene-boundary></p><a data-if-source target="_blank" rel="noreferrer"></a><button type="button" data-if-activity></button></div>
    <section class="if-energy" data-if-energy><div class="if-sunlight"><span data-if-sunlight-label></span><strong data-if-flux></strong></div><div class="if-budget" data-if-budget></div><p class="if-conclusion" data-if-conclusion aria-live="polite"></p><p class="if-held" data-if-balance-note></p></section>
    <section class="if-actual" data-if-actual><dl data-if-actual-values></dl><p data-if-world-note></p><p class="if-held" data-if-actual-note></p></section>
    <section class="if-summary" data-if-summary hidden><h4 data-if-summary-title></h4><p data-if-summary-values></p><p data-if-summary-text></p><p class="if-held" data-if-saved></p><button type="button" data-if-baseline></button></section>
    <nav class="if-onward"><a data-if-world-link></a><a data-if-air-link></a><a data-if-seasons-link></a></nav>
    <div class="if-actions" data-if-extensions><button type="button" data-if-tilt-entry></button><button type="button" data-if-energy-entry></button></div>
    <details class="if-science"><summary data-if-academic></summary><p data-if-formula></p><dl><dt data-if-temperature-label></dt><dd data-if-temperature></dd></dl><p data-if-limitations></p><ul data-if-sources></ul></details>
    <nav class="if-next"><button type="button" data-if-previous></button><button type="button" data-if-next></button></nav>`;
  host.append(root);
  // Bind controls before either lazy renderer creates canvases and diagnostic
  // attributes. Later scene metadata must never become a UI mutation target.
  const elements=new Map<string,Element>();
  for(const element of root.querySelectorAll('*'))for(const attribute of element.attributes)if(attribute.name.startsWith('data-if-'))elements.set(attribute.name.slice(8),element);
  const get = <T extends HTMLElement = HTMLElement>(key: string) => elements.get(key)! as T;
  const text = (key: string, value: string) => { get(key).textContent = value; };
  const show = (key: string, value: boolean) => { get(key).hidden = !value; };
  const workbench=document.createElement('div'),visual=document.createElement('div'),experiment=document.createElement('div');
  workbench.className='if-workbench';visual.className='if-visual';experiment.className='if-experiment';
  get('question').parentElement!.after(workbench);workbench.append(visual,experiment);
  for(const key of ['stage','transport'])visual.append(get(key));visual.append(root.querySelector('.if-scene-caption')!);
  for(const key of ['distance-controls','world-controls','air-controls','tilt-controls','tilt-readings','ruler-wrap','energy','actual','summary'])experiment.append(get(key));
  experiment.append(root.querySelector('.if-onward')!,get('extensions'));
  for (const [key, value] of Object.entries({ title:c.title,intro:c.intro,'distance-label':c.distance,'distance-held':c.distanceHeld,'world-label':c.world,'site-label':c.site,'escape-label':c.escape,'air-held':c.escapeHeld,easy:c.easy,hard:c.hard,'ruler-note':c.rulerNote,'failed':c.failed,retry:c.retry,'sunlight-label':c.sunlight,'balance-note':c.balanceNote,'actual-note':c.actualNote,'summary-title':c.summary,'summary-text':c.summaryText,saved:c.saved,baseline:c.baseline,academic:c.academic,formula:c.formula,'temperature-label':c.temperature,limitations:c.limitations,previous:c.previous })) text(key, value);
  get('route').setAttribute('aria-label', c.route);
  const canvas = get<HTMLCanvasElement>('canvas'); canvas.setAttribute('aria-label', c.sceneLabel);
  get('question').tabIndex=-1;
  get('tilt-host').setAttribute('aria-label',c.sceneLabel);
  const stepButtons = new Map<Step, HTMLButtonElement>();
  for (const [i, step] of [...STEPS,'tilt' as const].entries()) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = `${i+1} · ${c.steps[step]}`;
    b.dataset.ifStep = step; b.onclick = () => setStep(step); get('route').append(b); stepButtons.set(step,b);
  }
  for (const id of WORLD_IDS) { const o = document.createElement('option'); o.value=id; o.textContent=c.worldNames[id]; get('world').append(o); }
  for(const city of CITIES){const o=document.createElement('option');o.value=city.id;o.textContent=city.displayName;get('city').append(o);}
  for(const[value,label]of Object.entries(c.seasonNames)){const o=document.createElement('option');o.value=value;o.textContent=label;get('season').append(o);}
  for(const[label,value]of [[c.noTilt,0],[c.earthTilt,23.44],[c.uranusTilt,97.77]] as const){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{state.tilt=value;update();};get('tilt-presets').append(b);}
  for(const[key,value]of Object.entries({'tilt-label':c.tiltLabel,'city-label':c.city,'season-label':c.season,'tilt-held':c.tiltHeld,'tilt-readings-title':c.tiltReadingsTitle,'zero-label':c.zeroLabel,'selected-tilt':c.selectedTilt,'daylight-label':c.daylight,'noon-label':c.noonAltitude,'tilt-entry':c.tiltEntry,'energy-entry':c.energyEntry}))text(key,value);
  const viewButtons = new Map<View, HTMLButtonElement>();
  for (const view of VIEWS) {
    const b = document.createElement('button'); b.type='button'; b.textContent=c.views[view]; b.dataset.ifView=view;
    b.onclick=()=>{ playing=false; observation().view=view; update(); }; get('views').append(b); viewButtons.set(view,b);
  }
  for (const [label, au] of [[c.nearVenus,realWorld('venus').distanceAU],[c.nearMars,realWorld('mars').distanceAU],[c.earthReference,1]] as const) {
    const b=document.createElement('button'); b.type='button'; b.textContent=label; b.onclick=()=>{state.distance=au; update();}; get('presets').append(b);
  }
  const budgetBars: HTMLElement[]=[];
  for (const label of [c.absorbed,c.outgoing]) {
    const row=document.createElement('div'), name=document.createElement('span'), track=document.createElement('span'), bar=document.createElement('i'), value=document.createElement('output');
    row.className='if-budget-row'; name.textContent=label; track.className='if-budget-track'; track.append(bar); row.append(name,track,value); get('budget').append(row); budgetBars.push(row);
  }
  for (const [name,href] of sources) { const li=document.createElement('li'),a=document.createElement('a'); a.href=href;a.textContent=name;a.target='_blank';a.rel='noreferrer';li.append(a);get('sources').append(li); }
  const observation=()=>state.observations[state.world];
  const route=()=>state.track==='seasons'?SEASON_STEPS:STEPS;
  let renderedTrack='';
  const tiltViewport=new TiltViewport(get('tilt-host'),()=>{if(state.step==='tilt')renderScene();});
  const persist=(push=false)=>{const url=conditionsURL(location.href,state); if(url.href!==location.href)history[push?'pushState':'replaceState'](null,'',url);};
  function setStep(step:Step) {
    playing=false;if(step==='tilt')state.track='seasons';else if(step==='distance'||step==='atmosphere')state.track='energy';state.step=step;
    persist(true);update();get('question').focus({preventScroll:true});root.scrollIntoView({block:'start',behavior:'auto'});
  }
  function syncSites() {
    const select=get<HTMLSelectElement>('site');
    if(select.dataset.world!==state.world){select.replaceChildren(...sitesFor(state.world).map(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name[language==='en'?'en':'zh'];return o;}));select.dataset.world=state.world;}
    select.value=observation().site;
  }
  function diagram() {
    const svg=get<SVGSVGElement & HTMLElement>('ruler'),w=Math.max(280,svg.clientWidth),x=(r:number)=>32+r*(w-70)/1.8;
    svg.setAttribute('viewBox',`0 0 ${w} 88`);svg.setAttribute('aria-label',`${c.distance}: ${state.distance.toFixed(3)} AU. ${c.au}`);svg.replaceChildren();
    const add=(tag:string,attrs:Record<string,string|number>,label?:string)=>{const n=document.createElementNS(svgNS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(label)n.textContent=label;svg.append(n);return n;};
    add('line',{x1:x(0),y1:34,x2:x(1.8),y2:34,stroke:'currentColor',opacity:.3});
    add('circle',{cx:x(0),cy:34,r:12,fill:'#d3a45e'});add('text',{x:x(0),y:67,'text-anchor':'middle'},c.sun);
    for(const r of [.5,1,1.5]){add('line',{x1:x(r),y1:29,x2:x(r),y2:39,stroke:'currentColor',opacity:.5});add('text',{x:x(r),y:15,'text-anchor':'middle'},`${r} AU`);}
    add('circle',{cx:x(1),cy:34,r:5,fill:'currentColor',opacity:.25});
    add('circle',{cx:x(state.distance),cy:34,r:8,fill:'#4f9bb9'});add('text',{x:x(state.distance),y:67,'text-anchor':'middle'},`${state.distance.toFixed(3)} AU`);
  }
  function renderScene() {
    if(disposed||document.hidden||!inView)return;
    if(state.step==='tilt'){
      tiltViewport.set({tilt:state.tilt,season:state.season,city:state.city});tiltViewport.draw(1/60);
      show('failure',tiltViewport.state==='failed');show('loading',tiltViewport.state==='loading');
      return;
    }
    show('failure',failed);show('loading',loading&&!scene);
    if(!scene){void prepareScene();return;}
    const actual=state.step==='worlds',body=actual?state.world:'earth',o=state.observations[body];
    const view=actual?o.view:'globe',p=view==='descent'?o.descent:view==='section'?o.section:0;
    try{scene.set(body,view,p,activityTime,o.site);}catch{failScene();}
  }
  function failScene(){failed=true;playing=false;activity=false;if(state.step!=='tilt'){show('failure',true);show('loading',false);}get('stage').dataset.failed='true';}
  async function prepareScene(){
    if(disposed||scene||loading||failed)return;loading=true;show('loading',true);text('loading',c.loading);
    try { const {ExplorerScene}=await import('../../solar-system/explorer/scene.ts');if(disposed)return;scene=new ExplorerScene(canvas);scene.onFailure=failScene;scene.onInteraction=()=>schedule();failed=false;renderScene(); }
    catch{failScene();}
    finally{loading=false;show('loading',false);}
  }
  function update() {
    root.dataset.ifStep=state.step;root.dataset.ifWorld=state.world;
    const actual=state.step==='worlds',isReturn=state.step==='return',model=state.step==='distance'||state.step==='atmosphere',tilt=state.step==='tilt',seasons=state.track==='seasons';
    if(renderedTrack!==state.track){get('route').replaceChildren(...route().map(step=>stepButtons.get(step)!));renderedTrack=state.track;}
    text('kind',actual||isReturn?c.real:c.hypothesis);text('question',seasons&&actual?c.tiltWorldQuestion:c.questions[state.step]);text('observation',seasons&&actual?c.tiltWorldObservation:c.observations[state.step]);text('next',seasons&&actual?c.tiltWorldNext:seasons&&isReturn?c.tiltAgain:c.next[state.step]);
    for(const[step,b]of stepButtons){b.setAttribute('aria-current',step===state.step?'step':'false');b.setAttribute('aria-pressed',String(step===state.step));const index=(route() as readonly Step[]).indexOf(step);b.textContent=`${index+1} · ${seasons&&step==='worlds'?c.realWorldStep:c.steps[step]}`;}
    show('distance-controls',state.step==='distance');show('world-controls',actual);show('air-controls',state.step==='atmosphere');show('ruler-wrap',model);show('energy',model);show('actual',actual);show('summary',isReturn);
    show('tilt-controls',tilt);show('tilt-readings',tilt);show('tilt-host',tilt);show('canvas',!tilt);show('activity',!tilt);
    show('tilt-entry',!seasons&&isReturn);show('energy-entry',seasons);
    get<HTMLButtonElement>('previous').disabled=state.step===route()[0];
    const daylight=tiltOutcome(state.tilt,state.season,state.city),hours=(n:number|null)=>n===null?c.horizon:`${n.toFixed(2)} ${c.hours}`;
    get<HTMLInputElement>('tilt').value=String(state.tilt);get('tilt').setAttribute('aria-label',c.tiltLabel);text('tilt-value',`${state.tilt.toFixed(2)}°`);
    get<HTMLSelectElement>('city').value=state.city;get('city').setAttribute('aria-label',c.city);get<HTMLSelectElement>('season').value=String(state.season);get('season').setAttribute('aria-label',c.season);
    text('zero-daylight',hours(daylight.zeroDaylight));text('daylight',hours(daylight.daylight));text('zero-noon',`${daylight.zeroNoonAltitude.toFixed(1)}°`);text('noon',`${daylight.noonAltitude.toFixed(1)}°`);
    get<HTMLInputElement>('distance').value=String(state.distance);text('distance-value',`${state.distance.toFixed(3)} AU`);get<HTMLInputElement>('distance').setAttribute('aria-label',c.distance);
    get<HTMLInputElement>('escape').value=String(state.escape);text('escape-value',state.escape.toFixed(2));get<HTMLInputElement>('escape').setAttribute('aria-label',c.escape);
    get<HTMLSelectElement>('world').value=state.world;get('world').setAttribute('aria-label',c.world);get('site').setAttribute('aria-label',c.site);
    syncSites();const body=actual?state.world:'earth',o=state.observations[body],site=siteFor(body,o.site),view=actual?o.view:'globe';
    for(const[v,b]of viewButtons){b.setAttribute('aria-pressed',String(v===view));if(v==='landscape')b.textContent=body==='uranus'?c.gasClose:c.views.landscape;}
    const travel=actual&&(view==='descent'||view==='section');show('transport',travel);show('play',view==='descent');
    const progress=view==='section'?o.section:o.descent;
    text('play',playing?c.pause:progress>=1?c.replay:progress>0?c.continue:c.play);get('play').setAttribute('aria-pressed',String(playing));
    get<HTMLInputElement>('progress').value=String(Math.round(progress*1000));get('progress').setAttribute('aria-label',view==='section'?c.interiorProgress:c.progress);text('progress-label',view==='section'?c.interiorProgress:c.progress);text('progress-value',`${Math.round(progress*100)}%`);
    text('activity',activity?c.pauseActivity:c.activity);get('activity').setAttribute('aria-pressed',String(activity));
    const profile=INTERIORS[body],layer=profile.layers.find(l=>progress<1-l.inner)??profile.layers.at(-1)!;
    text('site-name',`${c.worldNames[body]} · ${tilt?daylight.city.displayName:view==='section'?layer.name[language==='en'?'en':'zh']:site.name[language==='en'?'en':'zh']}`);
    const stage=descentState(body,view==='landscape'?1:progress).stage;
    text('site-observation',tilt?c.tiltBoundary:(view==='section'?layer.kids:view==='descent'?site.stages[stage].text:site.description)[language==='en'?'en':'zh']);
    text('scene-boundary',tilt?c.tiltLimitations:view==='section'?c.sectionBoundary:body==='uranus'?c.gasBoundary:c.sceneBoundary);text('source',c.source);get<HTMLAnchorElement>('source').href=tilt?'https://science.nasa.gov/helio-and-you-seasons-on-earth-mars-and-beyond/':view==='section'?profile.sources[0].url:site.source;
    const result=energyBalance(state.distance,state.escape);
    text('flux',`${result.sunlightRatio.toFixed(2)} ${c.relative} · ${Math.round(result.sunlight)} W/m²`);
    for(const[i,value]of [result.absorbed,result.outgoingAtReference].entries()){budgetBars[i].querySelector('i')!.style.width=`${value/600*100}%`;budgetBars[i].querySelector('output')!.textContent=`${Math.round(value)} W/m²`;}
    text('conclusion',Math.abs(result.imbalance)<.05?c.balanced:result.imbalance>0?c.warming:c.cooling);
    text('temperature',`${result.temperatureC.toFixed(1)} °C (${result.temperatureK.toFixed(1)} K)`);
    const data=realWorld(state.world),dl=get('actual-values');dl.replaceChildren();
    for(const[name,value]of [[c.actualDistance,`${data.distanceAU} AU`],[c.actualPressure,data.pressureHpa===null?c.missingSurface:`${data.pressureHpa/1000} bar`],[c.actualTemperature,data.temperatureC===null?c.missingSurface:`${data.temperatureC} °C`]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;dl.append(dt,dd);}
    text('world-note',c.worldNotes[state.world]);text('summary-values',`${c.distance}: ${state.distance.toFixed(3)} AU · ${c.escape}: ${state.escape.toFixed(2)} · ${c.sunlight}: ${result.sunlightRatio.toFixed(2)} ×`);
    if(seasons)text('summary-values',`${daylight.city.displayName} · ${c.tiltLabel}: ${state.tilt.toFixed(2)}° · ${c.daylight}: ${hours(daylight.daylight)}`);
    text('summary-text',seasons?c.tiltReturnText:c.summaryText);text('formula',seasons?c.tiltFormula:c.formula);text('limitations',seasons?c.tiltLimitations:c.limitations);get('temperature').closest('dl')!.hidden=seasons;
    const worldLink=get<HTMLAnchorElement>('world-link');worldLink.textContent=c.moreWorld+' →';worldLink.href=destination(location.href,'solar-system',state).href;worldLink.hidden=!actual;
    const airLink=get<HTMLAnchorElement>('air-link');airLink.textContent=c.moreAir+' →';airLink.href=destination(location.href,'atmosphere',state).href;airLink.hidden=state.step!=='atmosphere';
    const seasonsLink=get<HTMLAnchorElement>('seasons-link');seasonsLink.textContent=c.moreSeasons+' →';seasonsLink.href=destination(location.href,'earth-seasons',state).href;seasonsLink.hidden=!tilt;
    persist();diagram();renderScene();schedule();
  }
  let lastProgressWrite=0;
  function tick(time:number){
    frame=0;if(disposed||document.hidden||!inView)return;const dt=previousTime?Math.min(.08,(time-previousTime)/1000):0;previousTime=time;
    if(activity)activityTime+=dt;
    if(playing&&state.step==='worlds'&&observation().view==='descent'){
      observation().descent=Math.min(1,observation().descent+dt/24);
      if(observation().descent>=1)playing=false;
      // Only the time-dependent projection changes during travel. Do not rebuild
      // controls, site options or static scientific text at animation frequency.
      const o=observation(),site=siteFor(state.world,o.site),stage=descentState(state.world,o.descent).stage;
      get<HTMLInputElement>('progress').value=String(Math.round(o.descent*1000));text('progress-value',`${Math.round(o.descent*100)}%`);
      text('site-observation',site.stages[stage].text[language==='en'?'en':'zh']);
      if(time-lastProgressWrite>200||!playing){persist();lastProgressWrite=time;}
      if(!playing){text('play',c.replay);get('play').setAttribute('aria-pressed','false');}
      renderScene();
    }else renderScene();
    schedule();
  }
  function schedule(){if(!disposed&&!frame&&inView&&!document.hidden){frame=requestAnimationFrame(tick);}}
  get<HTMLInputElement>('distance').oninput=e=>{state.distance=Number((e.target as HTMLInputElement).value);update();};
  get<HTMLInputElement>('escape').oninput=e=>{state.escape=Number((e.target as HTMLInputElement).value);update();};
  get<HTMLInputElement>('tilt').oninput=e=>{state.tilt=Number((e.target as HTMLInputElement).value);update();};
  get<HTMLSelectElement>('city').onchange=e=>{state.city=(e.target as HTMLSelectElement).value;update();};
  get<HTMLSelectElement>('season').onchange=e=>{state.season=Number((e.target as HTMLSelectElement).value);update();};
  get<HTMLSelectElement>('world').onchange=e=>{playing=false;state.world=(e.target as HTMLSelectElement).value as WorldId;update();};
  get<HTMLSelectElement>('site').onchange=e=>{playing=false;observation().site=(e.target as HTMLSelectElement).value;observation().descent=0;update();};
  get<HTMLInputElement>('progress').oninput=e=>{playing=false;const o=observation(),p=Number((e.target as HTMLInputElement).value)/1000;if(o.view==='section')o.section=p;else o.descent=p;update();};
  get('play').onclick=()=>{if(observation().descent>=1)observation().descent=0;playing=!playing;previousTime=0;update();};
  get('activity').onclick=()=>{activity=!activity;previousTime=0;update();};
  get('retry').onclick=()=>{if(state.step==='tilt'){tiltViewport.retry();return;}scene?.dispose();scene=undefined;failed=false;show('failure',false);void prepareScene();};
  get('baseline').onclick=()=>{if(state.track==='seasons'){state.tilt=23.44;state.season=.25;state.city='beijing';}else{state.distance=1;state.escape=EARTH_ESCAPE;}update();};
  get('tilt-entry').onclick=()=>setStep('tilt');get('energy-entry').onclick=()=>setStep('distance');
  get('previous').onclick=()=>{const list=route() as readonly Step[],i=list.indexOf(state.step);if(i>0)setStep(list[i-1]);};
  get('next').onclick=()=>{if(state.step==='tilt')state.world='uranus';const list=route() as readonly Step[],i=list.indexOf(state.step);setStep(list[(i+1)%list.length]);};
  const onPop=()=>{playing=false;state=readConditions(location.search);update();};
  const onVisibility=()=>{cancelAnimationFrame(frame);frame=0;previousTime=0;playing=false;activity=false;update();};
  const onPageHide=(e:PageTransitionEvent)=>{persist();cancelAnimationFrame(frame);frame=0;playing=false;activity=false;if(!e.persisted)dispose();};
  const onPageShow=()=>{previousTime=0;update();};
  const resizer=new ResizeObserver(()=>{diagram();tiltViewport.resize();});resizer.observe(get('ruler'));resizer.observe(get('tilt-host'));
  const observer=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??false;if(!inView){cancelAnimationFrame(frame);frame=0;playing=false;activity=false;}previousTime=0;update();});observer.observe(root);
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);scene?.dispose();tiltViewport.dispose();observer.disconnect();resizer.disconnect();window.removeEventListener('popstate',onPop);window.removeEventListener('pageshow',onPageShow);window.removeEventListener('pagehide',onPageHide);document.removeEventListener('visibilitychange',onVisibility);}
  window.addEventListener('popstate',onPop);window.addEventListener('pagehide',onPageHide);window.addEventListener('pageshow',onPageShow);document.addEventListener('visibilitychange',onVisibility);
  const library=document.querySelector<HTMLElement>('[data-guide-library]');if(library)library.textContent=c.deeper;
  update();
  return { dispose };
}
