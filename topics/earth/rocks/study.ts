import type { StudyContext, StudyInstance } from '../studyContract';
import { MAX_STEPS, MINERAL_IDS, SPECIMEN_IDS, availableProcesses, chooseProcess, currentRock, finishStep, frameStates, historySnapshots, parseRockState, redoStep, serializeRockState, visitStep } from './model';
import type { MineralId, ProcessId, RockSession, SpecimenId } from './model';
import { createRockScene, sceneDescription } from './scene';
import content from './content.json';
import './style.css';
import type { SpecimenViewer } from './specimen3d';
import { createFinitePlayback } from '../finitePlayback';

const SOURCES = [
  ['USGS · Rocks and minerals', 'https://www.usgs.gov/faqs/what-difference-between-a-rock-and-a-mineral'],
  ['NPS · Igneous rocks', 'https://www.nps.gov/subjects/geology/igneous.htm'],
  ['NPS · Sedimentary rocks', 'https://www.nps.gov/subjects/geology/sedimentary.htm'],
  ['USGS · Metamorphic rocks', 'https://www.usgs.gov/faqs/what-are-metamorphic-rocks'],
  ['BGS · Weathering', 'https://www.bgs.ac.uk/discovering-geology/geological-processes/weathering/'],
  ['BGS · Erosion', 'https://www.bgs.ac.uk/discovering-geology/geological-processes/erosion/'],
  ['USGS · Lava-flow cooling estimates', 'https://www.usgs.gov/observatories/hvo/news/volcano-watch-how-do-lava-flows-cool-and-how-long-does-it-take'],
  ['NPS · Grand Canyon geology', 'https://www.nps.gov/grca/learn/nature/grca-geology.htm'],
] as const;

function escape(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}

export function mountStudy(host: HTMLElement, context: StudyContext): StudyInstance {
  const words = content[context.language === 'en' ? 'en' : 'zh'];
  let session = parseRockState(context.initialState);
  let disposed = false;
  let processView:ReturnType<typeof import('./process3d').mountRockProcess>|undefined,processPending=false,processFailed=false,processEpoch=0;
  let viewer: SpecimenViewer | null = null;
  let viewerSpecimen: SpecimenId | null = null;
  let viewerLoading = false;
  let viewerFailed = false;
  let viewerTicket = 0;
  const root = document.createElement('section');
  root.className = 'earth-module rocks-study';
  root.innerHTML = `
    <header class="rocks-heading">
      <p class="rocks-eyebrow">${escape(words.eyebrow)}</p>
      <h3 class="earth-section-title">${escape(words.title)}</h3>
      <p>${escape(words.intro)}</p>
    </header>
    <div class="earth-controls rocks-tabs" role="group" aria-label="${escape(words.title)}">
      <button type="button" data-view="journey">${escape(words.journeyTab)}</button>
      <button type="button" data-view="specimens">${escape(words.specimensTab)}</button>
    </div>
    <p class="rocks-question">${escape(words.question)}</p>
    <label class="rocks-select" data-specimen-select hidden><span>${escape(words.specimenSelect)}</span><select data-specimen>${SPECIMEN_IDS.map(id => `<option value="${id}">${escape(words.specimens[id].name)} · ${escape(words.specimens[id].type)}</option>`).join('')}</select></label>
    <label class="rocks-select rocks-process-choice" data-process-choice-row><span>${escape(words.choose)}</span><select data-process-choice></select></label><div class="earth-stage rocks-stage">
      <div class="rocks-webgl-host rocks-process-host" data-process-host hidden></div>
      <div class="rocks-webgl-host" data-webgl-host hidden></div>
      <canvas data-scene role="img" aria-label="${escape(words.stageLabel)}"></canvas>
      <div class="rocks-stage-caption" data-stage-caption></div>
    </div>
    <p class="earth-note" data-process-status role="status" hidden></p><p class="earth-note rocks-caption">${escape(words.illustration)}</p>
    <div data-journey-panel>
      <div class="earth-controls rocks-playback">
        <button type="button" data-playback-toggle aria-pressed="false">${escape(words.play)}</button>
        <button type="button" data-playback-reset>${escape(words.rewind)}</button>
        <button type="button" data-playback-next>${escape(words.advance)}</button>
      </div>
      <div class="rocks-slider"><label><span>${escape(words.progress)}</span><output data-progress-output></output><input data-progress data-playback-scrub type="range" min="0" max="100" step="1"></label></div>
      <p class="earth-note rocks-playback-note">${escape(words.playbackNote)}</p>
      <p class="earth-note" data-reduced-note hidden>${escape(words.playbackReduced)}</p>
      <div class="earth-readout rocks-readout">
        <div><span>${escape(words.current)}</span><strong data-form></strong></div>
        <div><span>${escape(words.location)}</span><strong data-setting></strong></div>
      </div>
      <fieldset class="rocks-processes"><legend>${escape(words.choose)}</legend>
        <p class="earth-note">${escape(words.chooseHint)}</p>
        <div class="earth-controls rocks-process-grid" data-processes></div>
      </fieldset>
      <div class="rocks-cause" aria-live="polite" aria-atomic="true"><strong data-process-title></strong><p data-process-description></p></div>
      <div class="earth-controls rocks-step-controls">
        <button type="button" data-back>${escape(words.back)}</button>
        <button type="button" data-redo>${escape(words.forward)}</button>
        <button type="button" class="rocks-primary" data-finish>${escape(words.finish)}</button>
      </div>
      <p class="earth-note">${escape(words.progressNote)}</p>
      <p class="earth-note rocks-identity">${escape(words.identity)}</p>
      <details class="earth-deeper rocks-process-detail"><summary>${escape(words.deepLabel)}</summary>
        <div><h4>${escape(words.processConditions)}</h4><p data-condition></p><p data-process-detail></p>
          <p><strong data-time-label></strong><span data-time></span></p><p><strong data-evidence-label></strong><span data-evidence></span></p>
          <p class="earth-note">${escape(words.noTime)}</p></div>
      </details>
      <section class="rocks-history-section"><h4>${escape(words.history)}</h4><p class="earth-note">${escape(words.historyHint)}</p>
        <ol class="rocks-history" data-history></ol><p class="earth-note" data-branch></p>
        <button type="button" class="rocks-reset" data-reset>${escape(words.reset)}</button>
      </section>
    </div>
    <section data-specimens-panel>
      <div class="earth-controls rocks-model-controls" role="group" aria-label="${escape(words.specimenSelect)}">
        <button type="button" data-renderer="3d">${escape(words.model3d)}</button>
        <button type="button" data-renderer="2d">${escape(words.model2d)}</button>
        <button type="button" data-model-reset>${escape(words.modelReset)}</button>
        <button type="button" data-model-retry hidden>${escape(words.modelRetry)}</button>
      </div>
      <p class="earth-note" data-model-status aria-live="polite"></p>
      <p class="earth-note" data-model-help>${escape(words.modelHelp)}</p>
      <p class="earth-note">${escape(words.modelLimit)}</p>
      <p>${escape(words.specimenIntro)}</p>
      <div class="rocks-specimen-copy" aria-live="polite"><h4 data-specimen-title></h4>
        <p><strong>${escape(words.look)} · </strong><span data-specimen-look></span></p>
        <p><strong>${escape(words.formed)} · </strong><span data-specimen-formed></span></p>
        <p><strong>${escape(words.ingredients)} · </strong><span data-specimen-ingredients></span></p>
        <p class="rocks-question" data-specimen-question></p><p data-specimen-detail></p>
      </div>
    </section>
    <details class="earth-deeper rocks-minerals">
      <summary>${escape(words.mineralTitle)}</summary>
      <div><p>${escape(words.mineralText)}</p>
        <label class="rocks-select"><span>${escape(words.mineralSelect)}</span><select data-mineral>${MINERAL_IDS.map(id => `<option value="${id}">${escape(words.minerals[id].name)}</option>`).join('')}</select></label>
        <canvas data-mineral-scene role="img"></canvas>
        <p data-mineral-habit></p><p data-mineral-structure></p><p class="earth-note">${escape(words.mineralModel)}</p>
        <a href="/topics/earth-minerals/" data-mineral-link></a>
      </div>
    </details>
    <details class="earth-deeper rocks-cooling">
      <summary>${escape(words.coolingTitle)}</summary>
      <div><p>${escape(words.coolingText)}</p>
        <canvas data-cooling-scene role="img" aria-label="${escape(words.coolingText)}"></canvas>
        <div class="rocks-cooling-labels"><strong>${escape(words.slow)}</strong><strong>${escape(words.fast)}</strong></div>
        <label class="rocks-select"><span>${escape(words.coolingSlider)}</span><input data-cooling type="range" min="0" max="100" step="1"></label>
        <p class="earth-note">${escape(words.coolingLimit)}</p>
      </div>
    </details>
    <details class="earth-deeper rocks-more"><summary>${escape(words.deepLabel)}</summary><div>
      ${words.deeper.map(item => `<section><h4>${escape(item.title)}</h4><p>${escape(item.text)}</p></section>`).join('')}
      <p class="rocks-forces">${escape(words.surfaceText)}<br>${escape(words.interiorText)}</p>
    </div></details>
    <nav class="rocks-related" aria-label="${escape(words.linksTitle)}"><h4>${escape(words.linksTitle)}</h4>
      <a href="/topics/volcano-eruption/">${escape(words.volcano)}</a>
      <a href="/topics/rain-cycle/">${escape(words.water)}</a>
      <a href="/topics/sand-journey/">${escape(words.sand)}</a>
    </nav>
    <details class="earth-deeper rocks-sources"><summary>${escape(words.sourcesTitle)}</summary><div><p>${escape(words.sourcesNote)}</p>
      <ul>${SOURCES.map(([label, href]) => `<li><a href="${href}" target="_blank" rel="noreferrer">${label}</a></li>`).join('')}</ul>
    </div></details>`;
  host.replaceChildren(root);
  const get = <T extends Element>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing rocks element: ${selector}`);
    return element;
  };
  const modelControls=get<HTMLElement>('.rocks-model-controls'),toolbar=document.createElement('div');toolbar.className='rocks-toolbar';const tabs=get<HTMLElement>('.rocks-tabs');tabs.before(toolbar);toolbar.append(tabs,modelControls);
  const mainCanvas = get<HTMLCanvasElement>('[data-scene]');
  const mineralCanvas = get<HTMLCanvasElement>('[data-mineral-scene]');
  const coolingCanvas = get<HTMLCanvasElement>('[data-cooling-scene]');
  const scenes = [createRockScene(mainCanvas), createRockScene(mineralCanvas, 'mineral'), createRockScene(coolingCanvas, 'cooling')];
  const progress = get<HTMLInputElement>('[data-progress]');
  progress.setAttribute('aria-label', words.progress);
  const specimenSelect = get<HTMLSelectElement>('[data-specimen]');
  const mineralSelect = get<HTMLSelectElement>('[data-mineral]');
  const coolingInput = get<HTMLInputElement>('[data-cooling]');
  coolingInput.setAttribute('aria-label', words.coolingSlider);
  const processDetail = get<HTMLDetailsElement>('.rocks-process-detail');
  const extraDetails = [...root.querySelectorAll<HTMLDetailsElement>('.rocks-minerals, .rocks-cooling, .rocks-more, .rocks-sources')];
  const aborter = new AbortController();
  const listen = (element: EventTarget, type: string, callback: EventListener) => element.addEventListener(type, callback, { signal: aborter.signal });
  function text(selector: string, value: string) { get<HTMLElement>(selector).textContent = value; }
  function draw() {
    if (disposed) return;
    if (!mainCanvas.hidden) scenes[0].draw(session, words);
    if(session.view==='journey')processView?.update(session);
    if (get<HTMLDetailsElement>('.rocks-minerals').open) scenes[1].draw(session, words);
    if (get<HTMLDetailsElement>('.rocks-cooling').open) scenes[2].draw(session, words);
  }
  function emit() { if (!disposed) context.onStateChange(serializeRockState(session)); }
  function update(next: RockSession) { if (disposed) return; playback.pause(); session = next; render(); playback.sync(); emit(); }
  function unavailable() {
    if (disposed) return;
    viewerFailed = true; viewerLoading = false;
    get<HTMLElement>('[data-webgl-host]').hidden = true; mainCanvas.hidden = false;
    text('[data-model-status]', words.modelFailed);
    get<HTMLButtonElement>('[data-model-retry]').hidden = false;
    get<HTMLButtonElement>('[data-model-reset]').disabled = true;
    draw();
  }
  async function ensureViewer() {
    if (disposed || viewerLoading || viewerFailed || viewer) return;
    const ticket = ++viewerTicket;
    viewerLoading = true; text('[data-model-status]', words.modelLoading);
    try {
      const { mountSpecimenViewer } = await import('./specimen3d');
      if (disposed || ticket !== viewerTicket) return;
      viewerLoading = false;
      // A switch made while importing should not create an invisible GPU context.
      if (session.view !== 'specimens' || session.renderer !== '3d') return;
      viewer = mountSpecimenViewer(get<HTMLElement>('[data-webgl-host]'), {
        specimen: session.specimen, label: `${words.model3d}. ${words.modelHelp}. ${words.modelLimit}`,
        camera: session.camera,
        onCamera(camera) {
          if (disposed) return;
          session = { ...session, camera: { x: Number(camera.x.toFixed(5)), y: Number(camera.y.toFixed(5)), z: Number(camera.z.toFixed(5)) } }; emit();
        },
        onUnavailable: unavailable,
      });
      viewerSpecimen = session.specimen;
      if (!viewerFailed) text('[data-model-status]', '');
      get<HTMLButtonElement>('[data-model-reset]').disabled = viewerFailed;
    } catch { if (!disposed && ticket === viewerTicket) unavailable(); }
  }

  function releaseProcess(){++processEpoch;processPending=false;processView?.dispose();processView=undefined;}
  async function ensureProcess(){
    if(disposed||processPending||processFailed||processView)return;
    processPending=true;const ticket=++processEpoch;
    const fail=()=>{if(disposed||ticket!==processEpoch||session.view!=='journey')return;processFailed=true;releaseProcess();get<HTMLElement>('[data-process-host]').hidden=true;mainCanvas.hidden=false;get<HTMLElement>('[data-process-status]').hidden=false;text('[data-process-status]',words.processFailure);get<HTMLButtonElement>('[data-model-retry]').hidden=false;draw();};
    try{const module=await import('./process3d');if(disposed||ticket!==processEpoch||session.view!=='journey')return;processPending=false;processView=module.mountRockProcess(get('[data-process-host]'),words.processLabel,fail);processView.update(session);get<HTMLButtonElement>('[data-model-reset]').disabled=false;}
    catch{if(!disposed&&ticket===processEpoch)fail();}
  }
  function render() {
    const rock = currentRock(session);
    mainCanvas.setAttribute('aria-label', sceneDescription(session, words));
    get<HTMLElement>('[data-journey-panel]').hidden = session.view !== 'journey';
    get<HTMLElement>('[data-specimens-panel]').hidden = session.view !== 'specimens';
    get<HTMLElement>('[data-specimen-select]').hidden = session.view !== 'specimens';
    get<HTMLButtonElement>('[data-renderer="3d"]').textContent=session.view==='journey'?words.process3d:words.model3d;
    get<HTMLButtonElement>('[data-renderer="2d"]').textContent=session.view==='journey'?words.process2d:words.model2d;
    get<HTMLElement>('.rocks-identity').textContent=session.view==='journey'&&session.renderer==='3d'?words.localNote:words.identity;
    const wantsProcess=session.view==='journey'&&session.renderer==='3d'&&!processFailed;
    get<HTMLElement>('[data-process-host]').hidden=!wantsProcess;
    if(wantsProcess)void ensureProcess();else releaseProcess();
    get<HTMLElement>('[data-process-choice-row]').hidden=session.view!=='journey';
    get<HTMLElement>('[data-process-status]').hidden=session.view!=='journey'||!processFailed;
    const wants3d = session.view === 'specimens' && session.renderer === '3d';
    get<HTMLElement>('[data-webgl-host]').hidden = !wants3d || viewerFailed;
    mainCanvas.hidden = wantsProcess || wants3d && !viewerFailed;
    get<HTMLElement>('[data-model-help]').hidden = !wants3d || viewerFailed;
    root.querySelectorAll<HTMLButtonElement>('[data-renderer]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.renderer === session.renderer)));
    get<HTMLButtonElement>('[data-model-reset]').disabled = wantsProcess?!processView:!wants3d || !viewer || viewerFailed;
    if (wants3d && !viewerFailed) {
      if (viewer) {
        if (viewerSpecimen !== session.specimen) { viewer.select(session.specimen); viewerSpecimen = session.specimen; }
        viewer.resume();
      } else void ensureViewer();
    } else {viewer?.dispose();viewer=null;viewerSpecimen=null;++viewerTicket;viewerLoading=false;}
    root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === session.view)));
    renderProgress();
    const processHost = get<HTMLElement>('[data-processes]');
    const allowed = availableProcesses(rock);
    const choice=get<HTMLSelectElement>('[data-process-choice]');
    choice.replaceChildren(...[null,...allowed].map(id=>{const o=document.createElement('option');o.value=id??'';o.textContent=id?words.processes[id].label:words.chooseHint;return o;}));choice.value=session.process??'';
    get<HTMLElement>('.rocks-processes').hidden=true;
    const existing = [...processHost.querySelectorAll<HTMLButtonElement>('button')];
    if (existing.map(button => button.dataset.process).join(',') !== allowed.join(',')) {
      processHost.innerHTML = allowed.map(id => `<button type="button" data-process="${id}">${escape(words.processes[id].label)}</button>`).join('');
    }
    processHost.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.process === session.process));
      button.disabled = session.cursor >= MAX_STEPS;
    });
    const chosen = session.process ? words.processes[session.process] : null;
    text('[data-process-title]', chosen?.label ?? words.noProcess);
    text('[data-process-description]', chosen?.child ?? words.chooseHint);
    text('[data-condition]', chosen?.condition ?? words.noProcess);
    text('[data-process-detail]', chosen?.detail ?? words.question);
    const evidence = session.process ? words.processEvidence[session.process] : null;
    text('[data-time-label]', words.timeLabel);
    text('[data-evidence-label]', words.evidenceLabel);
    text('[data-time]', evidence?.time ?? words.noTime);
    text('[data-evidence]', evidence?.evidence ?? words.question);
    get<HTMLButtonElement>('[data-finish]').disabled = !session.process || session.cursor >= MAX_STEPS;
    get<HTMLButtonElement>('[data-back]').disabled = session.cursor === 0 && session.progress === 0;
    get<HTMLButtonElement>('[data-redo]').disabled = session.cursor >= session.path.length;
    const snapshots = historySnapshots(session.path);
    const focusedStop = document.activeElement instanceof HTMLButtonElement && root.contains(document.activeElement) ? document.activeElement.dataset.stop : undefined;
    get<HTMLOListElement>('[data-history]').innerHTML = snapshots.map((snapshot, i) => `<li><button type="button" data-stop="${i}" ${i === session.cursor ? 'aria-current="step"' : ''}><span>${i === 0 ? '○' : i}</span><span>${escape(i === 0 ? words.origin : words.processes[session.path[i - 1]].label)}<small>${escape(words.rockLabels[snapshot.texture])}</small></span></button></li>`).join('');
    if (focusedStop !== undefined) root.querySelector<HTMLButtonElement>(`[data-stop="${focusedStop}"]`)?.focus({ preventScroll: true });
    text('[data-branch]', session.cursor >= MAX_STEPS ? words.limit : session.cursor < session.path.length ? words.branch : session.path.length ? '' : words.atOrigin);
    specimenSelect.value = session.specimen;
    const specimen = words.specimens[session.specimen];
    text('[data-specimen-title]', `${specimen.name} · ${specimen.type}`);
    text('[data-specimen-look]', specimen.look); text('[data-specimen-formed]', specimen.formed);
    text('[data-specimen-ingredients]', specimen.ingredients); text('[data-specimen-question]', `${words.ask} · ${specimen.question}`);
    text('[data-specimen-detail]', specimen.detail);
    mineralSelect.value = session.mineral;
    const mineral = words.minerals[session.mineral];
    text('[data-mineral-habit]', mineral.habit); text('[data-mineral-structure]', mineral.structure);
    mineralCanvas.setAttribute('aria-label', `${mineral.name}. ${mineral.habit}. ${words.mineralModel}`);
    text('[data-mineral-link]', words.mineralLink);
    coolingInput.value = String(session.cooling);
    if (processDetail.open !== session.deep) processDetail.open = session.deep;
    extraDetails.forEach((detail, index) => { const open = !!(session.panels & (1 << index)); if (detail.open !== open) detail.open = open; });
    draw();
  }
  function renderProgress() {
    const frame=frameStates(session),shown=session.process&&session.progress===100?frame.to:frame.from;
    mainCanvas.setAttribute('aria-label',sceneDescription(session,words));
    text('[data-stage-caption]',session.view==='journey'?words.rockLabels[shown.texture]:`${words.specimens[session.specimen].name} · ${words.specimens[session.specimen].type}`);
    text('[data-form]',words.rockLabels[shown.texture]);text('[data-setting]',words.settings[shown.setting]);
    progress.value=String(session.progress);progress.disabled=!session.process;
    text('[data-progress-output]',`${session.progress}%`);
    progress.setAttribute('aria-valuetext',`${session.progress}% · ${session.process?words.processes[session.process].cue:words.noProcess}`);
    root.querySelectorAll<HTMLButtonElement>('[data-playback-toggle], [data-playback-reset], [data-playback-next]').forEach(button=>button.disabled=!session.process);
    get<HTMLButtonElement>('[data-playback-next]').disabled=!session.process||session.progress>=100;
    get<HTMLButtonElement>('[data-back]').disabled=session.cursor===0&&session.progress===0;
  }
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const playback=createFinitePlayback({
    element:root,id:'rock-process',durationMs:7000,frameIntervalMs:matchMedia('(pointer: coarse)').matches||innerWidth<700?125:80,reducedMotionSteps:10,visibilityTarget:get<HTMLElement>('.rocks-stage'),
    readProgress:()=>session.progress/100,
    writeProgress:fraction=>{
      if(disposed||session.view!=='journey'||!session.process)return;
      session={...session,progress:Math.round(fraction*100)};renderProgress();draw();emit();
    },
    onPlayingChange:playing=>{
      const button=get<HTMLButtonElement>('[data-playback-toggle]');button.textContent=playing?words.pause:words.play;button.setAttribute('aria-pressed',String(playing));
      get<HTMLElement>('[data-progress-output]').setAttribute('aria-live',playing?'off':'polite');
      if(!playing){text('[data-progress-output]',`${session.progress}%`);emit();}
    },
  });
  const motionNote=()=>{get<HTMLElement>('[data-reduced-note]').hidden=!motion.matches;};
  listen(motion,'change',()=>{playback.pause();motionNote();});motionNote();
  listen(root, 'click', event => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!target || !root.contains(target)) return;
    if(target.hasAttribute('data-playback-toggle')){if(session.view==='journey'&&session.process)playback.toggle();}
    else if(target.hasAttribute('data-playback-reset'))playback.reset();
    else if(target.hasAttribute('data-playback-next'))playback.setProgress(Math.min(1,session.progress/100+.1));
    else if (target.dataset.view) update({ ...session, view: target.dataset.view === 'specimens' ? 'specimens' : 'journey' });
    else if (target.dataset.renderer) update({ ...session, renderer: target.dataset.renderer === '2d' ? '2d' : '3d' });
    else if (target.hasAttribute('data-model-reset')) {viewer?.reset();processView?.reset();}
    else if (target.hasAttribute('data-model-retry')) {
      update({ ...session, renderer: '3d' });
      location.reload();
    }
    else if (target.dataset.process) update(chooseProcess(session, target.dataset.process as ProcessId));
    else if (target.dataset.stop) update(visitStep(session, Number(target.dataset.stop)));
    else if (target.hasAttribute('data-back')) update(session.progress > 0 ? { ...session, progress: 0 } : visitStep(session, session.cursor - 1));
    else if (target.hasAttribute('data-redo')) update(redoStep(session));
    else if (target.hasAttribute('data-finish')) update(finishStep(session));
    else if (target.hasAttribute('data-reset')) update({ ...session, path: [], cursor: 0, process: null, progress: 0 });
  });
  listen(progress, 'input', () => playback.setProgress(Number(progress.value)/100));
  listen(get('[data-process-choice]'),'change',event=>{const id=(event.target as HTMLSelectElement).value;if(id)update(chooseProcess(session,id as ProcessId));});
  listen(specimenSelect, 'change', () => update({ ...session, specimen: specimenSelect.value as SpecimenId }));
  listen(mineralSelect, 'change', () => update({ ...session, mineral: mineralSelect.value as MineralId }));
  listen(coolingInput, 'input', () => update({ ...session, cooling: Math.max(0, Math.min(100, Number(coolingInput.value))) }));
  listen(processDetail, 'toggle', () => { if (session.deep !== processDetail.open) { session = { ...session, deep: processDetail.open }; emit(); } });
  const resumeVisible = () => {
    if(!document.hidden&&session.view==='journey')processView?.resume();
    if (!document.hidden && session.view === 'specimens' && session.renderer === '3d' && !viewerFailed) viewer?.resume();
  };
  listen(document, 'visibilitychange', () => { if (document.hidden) {playback.pause();viewer?.pause();processView?.pause();} else resumeVisible(); });
  // A host pause cancels pending work; a later deliberate gesture can resume this manual viewer.
  for (const event of ['pointerdown', 'keydown', 'wheel']) listen(root, event, resumeVisible);
  extraDetails.forEach((detail, index) => listen(detail, 'toggle', () => {
    const panels = detail.open ? session.panels | (1 << index) : session.panels & ~(1 << index);
    if (panels !== session.panels) { session = { ...session, panels }; emit(); }
    draw();
  }));
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
  observer?.observe(root);
  render(); emit();
  return {
    pause() { playback.pause();viewer?.pause();processView?.pause(); },
    dispose() {
      if (disposed) return;
      playback.dispose();releaseProcess();disposed = true; ++viewerTicket; aborter.abort(); observer?.disconnect(); viewer?.dispose(); viewer = null;
      scenes.forEach(scene => scene.dispose()); root.remove();
    },
  };
}
