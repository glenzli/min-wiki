import content from './content.json';
import { chapters, conditions, parts, readState, writeState, eventAt, broodStage, type Chapter, type Condition, type Part, type State } from './model';
import { createAntController } from './controller';
import { createAntRenderer, type Transition } from './renderer';
export const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const e = escape;
export function mountAntWorkspace(host: HTMLElement, language: 'zh' | 'en', transition: Transition): () => void {
  const copy = content[language]; document.title = copy.title;
  const cards = (items: { title: string; text: string }[]) => items.map(item => `<article><h3>${e(item.title)}</h3><p>${e(item.text)}</p></article>`).join('');
  host.innerHTML = `<header><p class="eyebrow">${e(copy.eyebrow)}</p><h1>${e(copy.title)}</h1><p class="intro">${e(copy.intro)}</p></header>
  <section class="ant-workbench" aria-label="${e(copy.title)}"><nav class="ant-chapters" aria-label="${e(copy.title)}">${chapters.map(key => `<button type="button" data-chapter="${key}" aria-pressed="false">${e(copy.chapters[key])}</button>`).join('')}</nav>
  <div class="ant-head"><h2 id="ant-question"></h2><p id="ant-chapter-note"></p></div>
  <div class="ant-toolbar"><label><input type="checkbox" id="ant-labels" checked>${e(copy.labels)}</label><label><input type="checkbox" id="ant-scent" checked>${e(copy.scent)}</label></div>
  <div id="ant-condition-panel" class="ant-condition-panel" hidden><label for="ant-condition">${e(copy.conditionLabel)}</label><select id="ant-condition">${conditions.map(key => `<option value="${key}">${e(copy.conditions[key])}</option>`).join('')}</select><p>${e(copy.conditionNote)}</p></div>
  <div class="ant-desk"><div class="ant-drawing"><p class="ant-identity">${e(copy.identity)}</p><div id="ant-body-panel"><svg id="ant-body" viewBox="-65 -46 140 92" role="img" aria-label="${e(copy.bodyCaption)}"></svg><div class="ant-parts">${parts.map(key => `<button type="button" data-part="${key}" aria-pressed="false">${e(copy.parts[key])}</button>`).join('')}</div></div><div id="ant-world-panel" hidden><div class="ant-mobile-focus"><svg id="ant-mobile-ant" viewBox="-52 -36 106 72" role="img" aria-label="${e(copy.mobileFocusCaption)}"></svg><p>${e(copy.mobileFocusCaption)}</p></div><svg id="ant-world" role="img" aria-label="${e(copy.mapCaption)}"></svg><p id="ant-caption" class="ant-caption"></p></div><p id="ant-legend" class="ant-legend"></p></div>
  <aside class="ant-notebook"><p class="ant-step" id="ant-event-step"></p><h3 id="ant-event-title"></h3><p class="ant-event-kids" id="ant-event-text-kids"></p><p class="ant-event-academic" id="ant-event-text-academic"></p><div class="ant-trail-research" id="ant-trail-research" hidden><p>${e(copy.trailResearch)}</p><p>${e(copy.trailEquation)}</p><a href="https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0149720" target="_blank" rel="noopener noreferrer">Czaczkes et al. (2016) ↗</a></div><div id="ant-player" hidden><div class="ant-player-buttons"><button id="ant-play" type="button">${e(copy.play)}</button><button id="ant-reset" type="button">${e(copy.restart)}</button></div><div class="ant-range-label"><label for="ant-progress">${e(copy.progress)}</label><output id="ant-position" for="ant-progress">0%</output></div><input type="range" id="ant-progress" min="0" max="100" step=".1" value="0"></div><div class="ant-player-note" id="ant-player-note" hidden><p class="ant-fine">${e(copy.timeNote)}</p><p class="ant-fine" id="ant-play-status" role="status"></p></div><button type="button" class="ant-next" id="ant-next">${e(copy.next)}</button></aside></div>
  <div id="ant-brood-panel" class="ant-brood-panel" hidden><div><h3>${e(copy.broodLabel)}</h3><p>${e(copy.broodClock)}</p><div class="ant-range-label"><label for="ant-brood-progress">${e(copy.broodLabel)}</label><output id="ant-brood-position" for="ant-brood-progress"></output></div><input type="range" id="ant-brood-progress" min="0" max="1" step=".001" value="0"><div class="ant-brood-steps">${copy.broodNames.map((name, i) => `<button type="button" data-brood="${[0,.36,.62,.9][i]}" aria-pressed="false">${e(name)}</button>`).join('')}</div></div><div><h3 id="ant-brood-title"></h3><p id="ant-brood-text"></p><button type="button" id="ant-care">${e(copy.careAction)}</button><p class="ant-fine">${e(copy.careNote)}</p></div></div></section>
  <section class="ant-roles"><h2>${e(copy.rolesTitle)}</h2><div class="ant-cards">${cards(copy.roles)}</div></section>
  <details class="ant-reading"><summary>${e(copy.readingTitle)}</summary><div class="ant-cards">${cards(copy.readings)}</div></details>
  <section class="ant-species"><h2>${e(copy.speciesTitle)}</h2><p>${e(copy.speciesNote)}</p><div class="ant-cards">${cards(copy.species)}</div></section>
  <details class="ant-reading"><summary>${e(copy.sourcesTitle)}</summary><p>${e(copy.limits)}</p><ul class="ant-sources"><li><a href="https://askabiologist.asu.edu/explore/ant-anatomy" target="_blank" rel="noopener noreferrer">ASU · Ant anatomy</a></li><li><a href="https://askabiologist.asu.edu/individual-life-cycle" target="_blank" rel="noopener noreferrer">ASU · Individual life cycle</a></li><li><a href="https://askabiologist.asu.edu/explore/secrets-superorganism" target="_blank" rel="noopener noreferrer">ASU · Secrets of a superorganism</a></li><li><a href="https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0149720" target="_blank" rel="noopener noreferrer">Czaczkes et al. (2016) · Trail pheromone and route learning in Lasius niger</a></li><li><a href="https://web.stanford.edu/~dmgordon/articles/other/Gordon%20Scientific%20American.pdf" target="_blank" rel="noopener noreferrer">Deborah Gordon · Collective wisdom of ants</a></li><li><a href="https://news.stanford.edu/stories/2017/10/algorithm-ants-create-trail-networks" target="_blank" rel="noopener noreferrer">Stanford · Turtle-ant trail networks</a></li><li><a href="https://askabiologist.asu.edu/leafcutter-ant-colony" target="_blank" rel="noopener noreferrer">ASU · Leafcutter ant colony</a></li></ul></details><p class="ant-safety">${e(copy.observeSafety)}</p>`;
  const get = <T extends Element = HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!;
  const world = get<SVGSVGElement>('ant-world'), body = get<SVGSVGElement>('ant-body');
  const renderer = createAntRenderer(world, body, copy.labelsText, transition, get<SVGSVGElement>('ant-mobile-ant'));
  const progress = get<HTMLInputElement>('ant-progress'), brood = get<HTMLInputElement>('ant-brood-progress'), play = get<HTMLButtonElement>('ant-play');
  let textKey = '', broodKey = -1, lastChapter = '', disposed = false, onScreen = true;
  function draw(state: State, playing: boolean) {
    renderer.render(state);
    host.dataset.chapter = state.chapter;
    const isBody = state.chapter === 'body', isNest = state.chapter === 'nest';
    get('ant-body-panel').hidden = !isBody; get('ant-world-panel').hidden = isBody; get('ant-player').hidden = isBody; get('ant-player-note').hidden = isBody;
    get('ant-brood-panel').hidden = !isNest; get('ant-condition-panel').hidden = state.chapter !== 'trails'; get('ant-trail-research').hidden = state.chapter !== 'trails';
    get('ant-next').hidden = isNest;
    get<HTMLInputElement>('ant-labels').checked = state.labels; get<HTMLInputElement>('ant-scent').checked = state.scent;
    get<HTMLSelectElement>('ant-condition').value = state.condition;
    host.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chapter === state.chapter)));
    host.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.part === state.part)));
    if (lastChapter !== state.chapter) {
      get('ant-question').textContent = copy.questions[state.chapter]; get('ant-chapter-note').textContent = copy.chapterNotes[state.chapter];
      get('ant-caption').textContent = isNest ? copy.nestCaption : copy.mapCaption;
      world.setAttribute('aria-label', isNest ? copy.nestCaption : copy.mapCaption);
      get('ant-legend').textContent = isNest ? copy.nestLegend : isBody ? copy.bodyCaption : copy.legend;
      lastChapter = state.chapter;
    }
    progress.value = String(state.time); get('ant-position').textContent = `${Math.round(state.time)}%`;
    play.textContent = playing ? copy.pause : state.time >= 100 ? copy.replay : copy.play;
    get('ant-play-status').textContent = playing ? '' : state.time >= 100 ? copy.completed : copy.paused;
    const event = eventAt(state.time, state.condition), key = isBody ? state.part : event;
    if (textKey !== `${state.chapter}:${state.condition}:${key}`) {
      const texts = copy.events[event as keyof typeof copy.events];
      get('ant-event-step').textContent = isBody ? 'W1' : copy.conditions[state.condition];
      get('ant-event-title').textContent = isBody ? copy.parts[state.part] : texts[0]!;
      get('ant-event-text-kids').textContent = isBody ? copy.partKids[state.part] : copy.eventKids[event as keyof typeof copy.eventKids];
      get('ant-event-text-academic').textContent = isBody ? copy.partTexts[state.part] : texts[1]!;
      textKey = `${state.chapter}:${state.condition}:${key}`;
    }
    brood.value = String(state.brood); const stage = broodStage(state.brood);
    if (stage !== broodKey) {
      get('ant-brood-title').textContent = `L1 · ${copy.broodNames[stage]}`; get('ant-brood-position').textContent = copy.broodNames[stage]!;
      get('ant-brood-text').textContent = copy.broodTexts[stage]!; get<HTMLButtonElement>('ant-care').disabled = stage === 3;
      host.querySelectorAll<HTMLButtonElement>('[data-brood]').forEach(button => button.setAttribute('aria-pressed', String(broodStage(Number(button.dataset.brood)) === stage)));
      broodKey = stage;
    }
  }
  const controller = createAntController(readState(location.search), { request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id) }, draw);
  const abort = new AbortController(), options = { signal: abort.signal };
  const remember = () => { if (!disposed) history.replaceState(null, '', `${location.pathname}?${writeState(controller.state, location.search)}${location.hash}`); };
  const stop = () => { controller.pause(); renderer.pause(); remember(); };
  const chapter = (next: Chapter) => { renderer.pause(); controller.chapter(next); remember(); };
  host.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(button => button.addEventListener('click', () => chapter(button.dataset.chapter as Chapter), options));
  host.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(button => button.addEventListener('click', () => { controller.patch({ part: button.dataset.part as Part }); remember(); }, options));
  host.querySelectorAll<HTMLButtonElement>('[data-brood]').forEach(button => button.addEventListener('click', () => { controller.patch({ brood: Number(button.dataset.brood) }); remember(); }, options));
  get('ant-condition').addEventListener('change', () => { renderer.pause(); controller.condition(get<HTMLSelectElement>('ant-condition').value as Condition); remember(); }, options);
  get('ant-labels').addEventListener('change', () => { controller.patch({ labels: get<HTMLInputElement>('ant-labels').checked }); remember(); }, options);
  get('ant-scent').addEventListener('change', () => { controller.patch({ scent: get<HTMLInputElement>('ant-scent').checked }); remember(); }, options);
  play.addEventListener('click', () => { if (controller.playing) stop(); else controller.play(); }, options);
  get('ant-reset').addEventListener('click', () => { renderer.pause(); controller.seek(0); remember(); }, options);
  progress.addEventListener('input', () => { renderer.pause(); controller.seek(Number(progress.value)); remember(); }, options);
  brood.addEventListener('input', () => { controller.patch({ brood: Number(brood.value) }); remember(); }, options);
  get('ant-care').addEventListener('click', () => renderer.care(), options);
  get('ant-next').addEventListener('click', () => chapter(chapters[Math.min(3, chapters.indexOf(controller.state.chapter) + 1)]!), options);
  const visibility = () => { const active = !document.hidden && onScreen; controller.visible(active); if (!active) { renderer.pause(); remember(); } };
  document.addEventListener('visibilitychange', visibility, options);
  window.addEventListener('pagehide', stop, options);
  window.addEventListener('pageshow', visibility, options);
  const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(entries => { onScreen = entries.some(entry => entry.isIntersecting); visibility(); });
  observer?.observe(get('ant-player')); visibility();
  return () => { if (disposed) return; remember(); disposed = true; abort.abort(); observer?.disconnect(); controller.dispose(); renderer.dispose(); };
}
