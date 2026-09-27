import { language, languageHref } from '../../src/platform/i18n';
import { mountReadingMode } from '../../src/platform/readingMode';
import { divisionState } from '../bacteria/model';
import { habitatArt } from '../bacteria/habitats';
import { sampleCycle, hostLimit } from '../viruses/model';
import { specimenDefinitions, specimenArt } from './scene';
import { chapters, readWorkspace, writeWorkspace, currentProgress, currentLimit, seekWorkspace, divisionLimit, WorkspaceClock, type Chapter, type Resources, type Process } from './workspaceModel';
import { SceneLease } from './sceneLifecycle';
import { loadRenderer, namespaceSvg, escaped, type RendererFactory, type WorkspaceRenderer } from './workspaceRenderer';
import content from './workspaceContent.json';

const copy = content[language === 'en' ? 'en' : 'zh'];
const e = escaped;
const options = (entries: Record<string, string>) => Object.entries(entries).map(([key, text]) => `<option value="${key}">${e(text)}</option>`).join('');
const choices = (entries: Record<string, string>, data: string) => Object.entries(entries).map(([key, text]) => `<button type="button" data-${data}="${key}" aria-pressed="false">${e(text)}</button>`).join('');

/** One workspace owns route state, process clocks and lazy-scene admission. */
export function mountMicrobialWorkspace(host: HTMLElement): () => void {
  document.title = copy.title;
  host.innerHTML = `<header><p class="eyebrow">${e(copy.eyebrow)}</p><h1>${e(copy.title)}</h1><p class="intro">${e(copy.intro)}</p></header>
  <section class="micro-workspace" aria-label="${e(copy.eyebrow)}"><nav class="micro-chapters" aria-label="${e(copy.eyebrow)}">${choices(copy.chapters, 'chapter')}</nav><p class="micro-question" id="micro-question"></p>
  <div class="micro-conditions"><div><label for="micro-habitat">${e(copy.habitatLabel)}</label><select id="micro-habitat">${options(copy.habitats)}</select></div><div><label for="micro-resources">${e(copy.resourcesLabel)}</label><select id="micro-resources">${options(copy.resources)}</select></div></div><p class="micro-hint" id="resource-note"></p>
  <div class="micro-desk"><aside class="micro-context"><svg id="micro-context-art" viewBox="0 0 600 440" role="img" aria-label="${e(copy.habitatLabel)}"></svg><h2 id="context-title"></h2><p id="context-text"></p><p class="micro-hint">${e(copy.contextCaption)}</p></aside>
  <div class="micro-observation"><p class="micro-identity" id="micro-identity"></p><div class="micro-specific">
  <div id="environment-controls"><button type="button" id="micro-close">${e(copy.close)}</button></div>
  <div id="bacteria-controls" hidden><label for="micro-process">${e(copy.processLabel)}</label><select id="micro-process">${options(copy.processes)}</select><div class="micro-choice-row" id="parts">${choices(copy.parts, 'part')}</div></div>
  <div id="virus-controls" hidden><label for="micro-host">${e(copy.hostLabel)}</label><select id="micro-host">${options(copy.hosts)}</select><div class="micro-choice-row">${choices(copy.views, 'view')}</div><p class="micro-hint">${e(copy.hostNote)}</p></div></div>
  <div id="micro-renderer" class="micro-renderer"></div><div id="micro-loading" role="status"><p id="loading-text"></p><button type="button" id="cancel-scene">${e(copy.cancel)}</button><button type="button" id="retry-scene" hidden>${e(copy.retry)}</button></div><p class="micro-scale">${e(copy.scale)}</p>
  <div id="micro-player"><div class="micro-player-buttons"><button type="button" id="micro-play">${e(copy.play)}</button><button type="button" id="micro-reset">${e(copy.reset)}</button><output id="micro-position" for="micro-progress"></output></div><label for="micro-progress">${e(copy.progress)}</label><input type="range" id="micro-progress" min="0" max="1" step=".001" value="0"></div><p class="micro-hint micro-player-note" id="micro-player-note">${e(copy.paused)}</p>
  <div class="micro-readout"><h2 id="micro-state-title"></h2><p id="micro-state-kids"></p><p id="micro-child-context" class="micro-hint"></p><p id="micro-state-text"></p><p id="micro-academic-note"></p><a id="micro-academic-source" class="micro-academic-source" target="_blank" rel="noopener noreferrer"></a><p id="micro-key" class="micro-hint"></p></div><button type="button" class="micro-next" id="micro-next"></button></div></div><p class="micro-hint micro-identity-note">${e(copy.identityNote)}</p></section>
  <section class="micro-comparison"><h2>${e(copy.mechanismTitle)}</h2><div>${chapters.map(chapter => `<p data-comparison="${chapter}">${e(copy.comparison[chapter])}</p>`).join('')}</div></section>
  <section class="micro-roles"><h2>${e(copy.rolesTitle)}</h2><p class="micro-hint">${e(copy.rolesNote)}</p><div>${(['yogurt','soil','gut'] as const).map(key => `<article><svg viewBox="0 0 410 280" aria-hidden="true">${namespaceSvg(habitatArt(key), 'role-')}</svg><h3>${e(copy.roles[key].title)}</h3><p>${e(copy.roles[key].text)}</p></article>`).join('')}</div></section>
  <details class="micro-science"><summary>${e(copy.notesTitle)}</summary><p>${e(copy.notes)}</p><p>${e(copy.limits)}</p><ul>
  <li><a href="https://www.nrcs.usda.gov/resources/education-and-teaching-materials/soil-biology-primer" target="_blank" rel="noopener noreferrer">USDA NRCS · Soil Biology Primer</a></li>
  <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2805064/" target="_blank" rel="noopener noreferrer">Grice et al. · Human skin microbiome</a></li>
  <li><a href="https://openstax.org/books/microbiology/pages/3-3-unique-characteristics-of-prokaryotic-cells" target="_blank" rel="noopener noreferrer">OpenStax · Prokaryotic cell structures</a></li>
  <li><a href="https://openstax.org/books/microbiology/pages/9-1-how-microbes-grow" target="_blank" rel="noopener noreferrer">OpenStax · How microbes grow</a></li>
  <li><a href="https://www.genome.gov/genetics-glossary/Virus" target="_blank" rel="noopener noreferrer">NHGRI · Virus</a></li>
  <li><a href="https://pdb101.rcsb.org/sci-art/goodsell-gallery/bacteriophage-t4-infection" target="_blank" rel="noopener noreferrer">RCSB PDB-101 · Bacteriophage T4 infection</a></li>
  <li><a href="https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3001424" target="_blank" rel="noopener noreferrer">Maffei et al. · Host compatibility and defense</a></li></ul></details><p class="micro-related"><a id="micro-cells-link" href="/topics/cells/">${e(copy.cellsLink)}</a></p>`;
  const get = <T extends Element = HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!;
  get<HTMLAnchorElement>('micro-cells-link').href = languageHref('/topics/cells/');
  let state = readWorkspace(location.search);
  const clock = new WorkspaceClock(); clock.visible = !document.hidden;
  const lease = new SceneLease<RendererFactory>();
  const abort = new AbortController(), events = { signal: abort.signal };
  let renderer: WorkspaceRenderer | undefined;
  let frameId = 0, lastTime = 0, lastContext = '', lastTextKey = '';
  const stage = get('micro-renderer');
  const habitat = get<HTMLSelectElement>('micro-habitat'), resources = get<HTMLSelectElement>('micro-resources');
  const process = get<HTMLSelectElement>('micro-process'), virusHost = get<HTMLSelectElement>('micro-host');
  const progress = get<HTMLInputElement>('micro-progress'), play = get<HTMLButtonElement>('micro-play');
  const remember = (push = false) => { const href = `${location.pathname}?${writeWorkspace(state, location.search)}${location.hash}`; if (push) history.pushState(null, '', href); else history.replaceState(null, '', href); };
  function stop(): void { clock.pause(); cancelAnimationFrame(frameId); frameId = 0; lastTime = 0; renderer?.pause(); }
  function renderText(): void {
    const p = currentProgress(state), limit = currentLimit(state);
    const cycle = state.chapter === 'viruses' ? sampleCycle(p, state.host) : undefined;
    const division = state.bacteria[state.resources].division;
    const blocked = cycle && state.host !== 'compatible' && p >= hostLimit(state.host) - 1e-7;
    const key = [state.chapter, state.habitat, state.resources, state.part, state.process, state.host, cycle?.stage, blocked, divisionState(division).stage, division >= divisionLimit(state.resources)].join(':');
    if (key !== lastTextKey) {
      lastTextKey = key;
      let title: string = copy.habitats[state.habitat], text: string = copy.habitatTexts[state.habitat], legend = copy.habitatKeys[state.habitat];
      let kids: string = copy.kids.habitats[state.habitat];
      let academicScope: keyof typeof copy.academicNotes = 'environment';
      if (state.chapter === 'bacteria') {
        title = state.process === 'structure' ? copy.parts[state.part] : copy.processes.division;
        text = state.process === 'structure' ? copy.partTexts[state.part] : state.resources === 'limited' && division >= divisionLimit('limited') - 1e-7 ? copy.limitedNote : copy.divisionNotes[divisionState(division).stage]!;
        legend = state.process === 'structure' && state.part === 'membrane' ? copy.membraneKey : copy.identities.bacteria;
        kids = state.process === 'structure' ? copy.kids.parts[state.part] : state.resources === 'limited' && division >= divisionLimit('limited') - 1e-7 ? copy.kids.limited : copy.kids.division[divisionState(division).stage]!;
        academicScope = state.process === 'structure' ? 'bacteriaStructure' : 'bacteriaDivision';
      } else if (cycle) {
        title = blocked ? state.host === 'mismatch' ? copy.mismatchTitle : copy.defendedTitle : copy.virusTitles[cycle.stage]!;
        text = blocked ? state.host === 'mismatch' ? copy.mismatchText : copy.defendedText : copy.virusTexts[cycle.stage]!;
        legend = copy.identities.viruses;
        kids = blocked ? state.host === 'mismatch' ? copy.kids.mismatch : copy.kids.defended : copy.kids.viruses[cycle.stage]!;
        academicScope = 'viruses';
      }
      const source = copy.academicSources[academicScope];
      get('micro-state-title').textContent = title; get('micro-state-kids').textContent = kids;
      get('micro-child-context').textContent = copy.kids.context[state.chapter];
      get('micro-state-text').textContent = text; get('micro-academic-note').textContent = copy.academicNotes[academicScope];
      const sourceLink = get<HTMLAnchorElement>('micro-academic-source'); sourceLink.href = source.url; sourceLink.textContent = `${source.label} ↗`;
      get('micro-key').textContent = legend;
    }
    progress.max = String(limit); progress.value = String(p);
    const percentage = Math.round(p / (state.chapter === 'viruses' ? 5 : 1) * 100);
    get('micro-position').textContent = `${percentage}%`; progress.setAttribute('aria-valuetext', `${percentage}%. ${get('micro-state-title').textContent}`);
    play.textContent = clock.playing ? copy.pause : p >= limit ? copy.replay : p > 0 ? copy.resume : copy.play;
    play.setAttribute('aria-pressed', String(clock.playing)); play.disabled = !clock.ready || !clock.visible; progress.disabled = !clock.ready;
  }
  function renderControls(): void {
    for (const button of host.querySelectorAll<HTMLButtonElement>('[data-chapter]')) button.setAttribute('aria-pressed', String(button.dataset.chapter === state.chapter));
    habitat.value = state.habitat; resources.value = state.resources; resources.disabled = state.chapter === 'viruses'; process.value = state.process; virusHost.value = state.host;
    get('resource-note').textContent = state.chapter === 'viruses' ? copy.resourceVirusNote : copy.resourceNote;
    get('micro-question').textContent = copy.chapterNotes[state.chapter]; get('micro-identity').textContent = copy.identities[state.chapter]; get('micro-next').textContent = copy.next[state.chapter];
    for (const chapter of chapters) get(`${chapter === 'viruses' ? 'virus' : chapter}-controls`).hidden = chapter !== state.chapter;
    for (const button of host.querySelectorAll<HTMLButtonElement>('[data-part]')) button.setAttribute('aria-pressed', String(button.dataset.part === state.part));
    for (const button of host.querySelectorAll<HTMLButtonElement>('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    get('parts').hidden = state.process !== 'structure'; get('micro-close').textContent = state.closer ? copy.wide : copy.close; get('micro-close').setAttribute('aria-pressed', String(state.closer));
    const playerHidden = state.chapter === 'environment' || state.chapter === 'bacteria' && state.process === 'structure' && state.part !== 'membrane';
    get('micro-player').hidden = playerHidden; get('micro-player-note').hidden = playerHidden;
    if (lastContext !== state.habitat) {
      lastContext = state.habitat; get('micro-context-art').innerHTML = namespaceSvg(specimenDefinitions + specimenArt[state.habitat], 'context-'); get('micro-context-art').setAttribute('aria-label', copy.habitatTexts[state.habitat]);
      get('context-title').textContent = copy.habitats[state.habitat]; get('context-text').textContent = copy.habitatTexts[state.habitat];
    }
    renderText();
  }
  function draw(): void { renderer?.render(state); renderText(); }
  function tick(now: number): void {
    frameId = 0; if (lastTime) clock.tick(state, (now - lastTime) / 1000); lastTime = now; draw();
    if (clock.playing) frameId = requestAnimationFrame(tick); else { lastTime = 0; remember(); }
  }
  function update(animate = false): void { renderControls(); renderer?.render(state, animate); remember(); }
  function failed(): void {
    renderer?.dispose(); renderer = undefined; clock.ready = false; stage.replaceChildren(); get('micro-loading').hidden = false; get('loading-text').textContent = copy.failed; get('cancel-scene').hidden = true; get('retry-scene').hidden = false; renderControls();
  }
  function prepare(): void {
    stop(); lease.cancel(); renderer?.dispose(); renderer = undefined; clock.ready = false; stage.replaceChildren(); get('micro-loading').hidden = false; get('loading-text').textContent = copy.loading; get('cancel-scene').hidden = false; get('retry-scene').hidden = true; renderControls();
    void lease.request(() => loadRenderer(state.chapter), factory => {
      try { renderer = factory(stage, copy); renderer.render(state); clock.ready = true; get('micro-loading').hidden = true; renderControls(); } catch { failed(); }
    }, failed);
  }
  function chapter(next: Chapter): void { stop(); state.chapter = next; remember(true); prepare(); }
  for (const button of host.querySelectorAll<HTMLButtonElement>('[data-chapter]')) button.addEventListener('click', () => chapter(button.dataset.chapter as Chapter), events);
  get('micro-next').addEventListener('click', () => chapter(chapters[(chapters.indexOf(state.chapter) + 1) % chapters.length]!), events);
  habitat.addEventListener('change', () => { stop(); state.habitat = habitat.value as typeof state.habitat; update(); }, events);
  resources.addEventListener('change', () => { stop(); state.resources = resources.value as Resources; update(); }, events);
  process.addEventListener('change', () => { stop(); state.process = process.value as Process; update(); }, events);
  virusHost.addEventListener('change', () => { stop(); state.host = virusHost.value as typeof state.host; update(); }, events);
  for (const button of host.querySelectorAll<HTMLButtonElement>('[data-part]')) button.addEventListener('click', () => { stop(); state.part = button.dataset.part as typeof state.part; update(true); }, events);
  for (const button of host.querySelectorAll<HTMLButtonElement>('[data-view]')) button.addEventListener('click', () => { state.view = button.dataset.view as typeof state.view; update(true); }, events);
  get('micro-close').addEventListener('click', () => { state.closer = !state.closer; update(true); }, events);
  play.addEventListener('click', () => {
    if (clock.playing) { stop(); renderText(); remember(); return; }
    clock.start(state); renderText(); if (clock.playing) { lastTime = 0; frameId = requestAnimationFrame(tick); }
  }, events);
  get('micro-reset').addEventListener('click', () => { stop(); seekWorkspace(state, 0); draw(); remember(); }, events);
  progress.addEventListener('input', () => { stop(); seekWorkspace(state, Number(progress.value)); draw(); remember(); }, events);
  get('cancel-scene').addEventListener('click', () => { lease.cancel(); get('loading-text').textContent = copy.cancelled; get('cancel-scene').hidden = true; get('retry-scene').hidden = false; }, events);
  get('retry-scene').addEventListener('click', prepare, events);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clock.hide(); stop(); remember(); } else clock.visible = true; renderText(); }, events);
  window.addEventListener('pagehide', () => { stop(); lease.cancel(); remember(); }, events);
  window.addEventListener('pageshow', event => { if (event.persisted && !renderer) prepare(); clock.visible = !document.hidden; renderText(); }, events);
  window.addEventListener('popstate', () => {
    stop(); const restored = readWorkspace(location.search); restored.bacteria = { ...state.bacteria, [restored.resources]: restored.bacteria[restored.resources] }; restored.viruses = { ...state.viruses, [restored.host]: restored.viruses[restored.host] }; state = restored; prepare();
  }, events);
  prepare(); mountReadingMode('.micro-science');
  return () => { stop(); lease.dispose(); clock.dispose(); abort.abort(); renderer?.dispose(); host.replaceChildren(); };
}
