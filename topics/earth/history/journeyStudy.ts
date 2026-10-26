import { createFinitePlayback } from '../finitePlayback';
import { GALLERY_IDS } from '../journey';
import { HISTORY_OBSERVATION_HOLD, HISTORY_STATIONS, journeyFrame, journeySample, type HistoryJourneyFrame, type HistoryScienceClass } from './journeyModel';
import type { EventId, HistoryState } from './model';
import content from './journeyContent.json';

type View = 'globe' | 'local' | 'evidence';
type Camera = { azimuth: number; elevation: number; distance: number };
type Scene = {
  update(frame: HistoryJourneyFrame, view: View): void;
  pause(): void;
  resume(): void;
  resetCamera(): void;
  dispose(): void;
};
type Options = {
  language: 'zh' | 'en';
  initialState: Record<string, string>;
  read(): HistoryState;
  select(ageMa: number, event: EventId): void;
  onPresentationChange(): void;
};
const escape = (value: string | number) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
function cameraFrom(raw?: string): Camera | undefined {
  if (!raw || raw.length > 200) return;
  try {
    const c = JSON.parse(raw);
    if (c && ['azimuth', 'elevation', 'distance'].every(k => typeof c[k] === 'number' && Number.isFinite(c[k]))
      && c.azimuth >= 0 && c.azimuth <= 360 && c.elevation >= -80 && c.elevation <= 80 && c.distance >= 2.6 && c.distance <= 12) {
      return { azimuth: c.azimuth, elevation: c.elevation, distance: c.distance };
    }
  } catch { /* A malformed presentation value cannot change scientific state. */ }
}

/** Owns finite presentation, one scene lease and view state. The caller still owns historical state. */
export function mountHistoryJourneyControls(parent: HTMLElement, options: Options) {
  const copy = content[options.language];
  let view: View = options.initialState.historyView === 'local' || options.initialState.historyView === 'evidence'
    ? options.initialState.historyView : 'globe';
  let camera = cameraFrom(options.initialState.historyCamera);
  const scientific = options.read();
  const rawCursor = options.initialState.historyJourneyProgress;
  let cursor = journeyFrame(scientific.ageMa, scientific.event,
    rawCursor && /^(?:0|1|0\.\d+|1\.0+)$/.test(rawCursor) ? Number(rawCursor) : undefined).journeyFraction;
  let disposed = false, epoch = 0, loading = false, failed = false, scene: Scene | undefined;
  let renderedStation = '', renderedView = '', renderedEvent = '', renderedTransition = false, cameraContext = '';
  const events = new AbortController();
  const root = parent.ownerDocument.createElement('section');
  root.className = 'history-journey'; root.dataset.earthPresentation = '';
  root.innerHTML = `<div class="history-journey-toolbar" data-reader-controls data-earth-choices>
    <label><span>${escape(copy.ui.journey)}</span><select data-journey-station>${HISTORY_STATIONS.map((station, i) => `<option value="${i}">${String(i + 1).padStart(2, '0')} · ${escape(copy.stages[station.id].label)}</option>`).join('')}</select></label>
    <label><span>${escape(copy.ui.scale)}</span><select data-journey-view>${(['globe', 'local', 'evidence'] as const).map(key => `<option value="${key}">${escape(copy.views[key])}</option>`).join('')}</select></label>
    <button type="button" data-journey-camera>${escape(copy.ui.reset)}</button>
  </div>
  <div class="history-journey-stage" data-reader-stage data-earth-visual data-reader-fit="available">
    <div class="history-journey-host" data-history-three></div>
    <div class="history-journey-fallback" data-history-fallback hidden></div>
    <div class="history-journey-loading" data-history-loading role="status"></div>
    <button class="history-journey-retry" type="button" data-history-retry hidden>${escape(copy.ui.retry)}</button>
    <div class="history-journey-badge" aria-hidden="true"><span data-journey-age></span><span data-journey-kind></span></div>
  </div>
  <p class="history-journey-scale-note" data-reader-caption data-journey-view-note></p>
  <p data-reader-caption data-journey-credit hidden><a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">${escape(copy.ui.mapCredit)}</a></p>
  <div data-reader-controls data-reader-transport data-earth-transport>
    <div data-reader-actions><button type="button" data-journey-play data-reader-primary aria-pressed="false">${escape(copy.ui.play)}</button><button type="button" data-journey-older>${escape(copy.ui.older)}</button><button type="button" data-journey-younger>${escape(copy.ui.younger)}</button></div>
    <label data-reader-scrub><span>${escape(copy.ui.progress)}</span><input type="range" min="0" max="100" step="0.001" data-journey-progress><output data-journey-output></output></label>
  </div>
  <p class="history-journey-time-note" data-reader-caption>${escape(copy.playbackQualification)}</p>
  <article class="history-journey-reading" data-reader-readout aria-live="polite"><h2 data-journey-question></h2><p data-journey-seeing></p><p data-journey-close-copy></p></article>
  <details class="history-journey-evidence" data-reader-prose><summary>${escape(copy.ui.evidence)}</summary><p data-journey-qualification></p><p>${escape(copy.cueQualification)}</p><p>${escape(copy.playbackDetails)}</p><p>${escape(copy.continuity)}</p><div class="history-journey-sources" data-journey-sources></div></details>
  <details class="history-journey-related" data-reader-prose><summary>${escape(copy.ui.related)}</summary><p>${escape(copy.ui.relatedIntro)}</p><div data-reader-actions>${copy.links.map(link => {
    const chapter = Object.entries(GALLERY_IDS).find(([, id]) => id === link.topicId)?.[0];
    return chapter ? `<button type="button" data-earth-chapter="${chapter}">${escape(link.label)} →</button>` : '';
  }).join('')}</div></details>`;
  parent.prepend(root);
  const get = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const host = get<HTMLElement>('[data-history-three]');
  const fallback = get<HTMLElement>('[data-history-fallback]');
  const loadingNote = get<HTMLElement>('[data-history-loading]');
  const retry = get<HTMLButtonElement>('[data-history-retry]');
  const scrub = get<HTMLInputElement>('[data-journey-progress]');
  const readFrame = () => {
    const state = options.read();
    return journeyFrame(state.ageMa, state.event, cursor);
  };
  function showFallback(frame: HistoryJourneyFrame) {
    // This is explicitly a fallback teaching section, not an invented photograph.
    const sea = frame.cues.ocean, ice = frame.cues.ice, melt = frame.cues.melt;
    fallback.innerHTML = `<svg viewBox="0 0 720 420" role="img" aria-label="${escape(copy.stages[frame.stationId].seeing)}"><defs><radialGradient id="history-fallback-globe"><stop stop-color="${melt > .5 ? '#e18b38' : '#719aa3'}"/><stop offset="1" stop-color="${melt > .5 ? '#552d26' : '#173f57'}"/></radialGradient></defs><circle cx="360" cy="210" r="158" fill="url(#history-fallback-globe)"/><path d="M247 173Q309 84 354 146T477 183Q448 260 397 233T270 288Z" fill="${ice > .5 ? '#d7e6e6' : '#7c8270'}" opacity="${.3 + sea * .6}"/><path d="M221 157Q360 95 500 157M214 224Q360 281 507 224" stroke="#e1ebdf" stroke-opacity=".35" fill="none"/><circle cx="360" cy="210" r="159" stroke="#d7e4e8" stroke-opacity=".5" fill="none"/></svg>`;
  }
  function unavailable(ticket: number) {
    if (disposed || ticket !== epoch) return;
    loading = false; failed = true; ++epoch; scene?.dispose(); scene = undefined;
    host.hidden = true; fallback.hidden = false; retry.hidden = false;
    loadingNote.textContent = copy.ui.unavailable;
    showFallback(readFrame());
  }
  function ensureScene() {
    if (disposed || loading || scene || failed) return;
    const ticket = ++epoch; loading = true;
    loadingNote.textContent = copy.ui.loading;
    void import('./journeyScene3d').then(module => {
      if (disposed || ticket !== epoch) return;
      const created = module.mountHistoryJourney(host, {
        language: options.language, labels: { scene: copy.title }, initialCamera: camera, initialLens: view,
        onUnavailable: () => unavailable(ticket),
        onCamera: next => {
          if (disposed || ticket !== epoch) return;
          camera = cameraFrom(JSON.stringify(next)); options.onPresentationChange();
        },
      });
      if (disposed || ticket !== epoch) { created.dispose(); return; }
      scene = created; loading = false; loadingNote.textContent = ''; scene.update(readFrame(), view);
    }).catch(() => unavailable(ticket));
  }
  function update() {
    if (disposed) return;
    const frame = readFrame(), stageCopy = copy.stages[frame.stationId];
    cursor = frame.journeyFraction;
    const nextCameraContext = view === 'local' ? ['accretion', 'differentiation', 'impact'].includes(frame.mode) ? 'local-body' : 'local-site' : view;
    if (cameraContext && cameraContext !== nextCameraContext) camera = undefined;
    cameraContext = nextCameraContext;
    root.dataset.historyJourneyStation = frame.stationId;
    root.dataset.historyJourneyView = view;
    root.dataset.historyJourneyAge = String(frame.ageMa);
    root.dataset.historyJourneyEvent = frame.eventId;
    const inTransition = frame.stationIndex < HISTORY_STATIONS.length - 1 && frame.progress > HISTORY_OBSERVATION_HOLD;
    root.dataset.historyJourneyTransition = String(inTransition);
    scrub.value = String(cursor * 100);
    const [amount, unit] = options.language === 'zh'
      ? frame.ageMa >= 100 ? [frame.ageMa / 100, copy.ui.billion] : frame.ageMa >= .01 ? [frame.ageMa * 100, copy.ui.tenThousand] : [frame.ageMa * 1e6, copy.ui.years]
      : frame.ageMa >= 1000 ? [frame.ageMa / 1000, copy.ui.billion] : frame.ageMa >= 1 ? [frame.ageMa, copy.ui.million] : [frame.ageMa * 1e6, copy.ui.years];
    const age = frame.ageMa === 0 ? copy.ui.today : copy.ui.approx.replace('{value}', Number(amount).toLocaleString(options.language === 'zh' ? 'zh-CN' : 'en-US', { maximumFractionDigits: 3 })).replace('{unit}', String(unit));
    get('[data-journey-age]').textContent = age;
    get('[data-journey-output]').textContent = `${Math.round(cursor * 100)}%`;
    scrub.setAttribute('aria-valuetext', `${stageCopy.label} · ${age}`);
    get<HTMLSelectElement>('[data-journey-view]').value = view;
    get<HTMLSelectElement>('[data-journey-station]').value = String(frame.stationIndex);
    get<HTMLButtonElement>('[data-journey-older]').disabled = cursor <= 0;
    get<HTMLButtonElement>('[data-journey-younger]').disabled = cursor >= 1;
    get<HTMLElement>('[data-journey-credit]').hidden = frame.mode !== 'present' || view === 'evidence';
    if (renderedStation !== frame.stationId || renderedView !== view || renderedEvent !== frame.eventId || renderedTransition !== inTransition) {
      get('[data-journey-kind]').textContent = copy.scienceClasses[stageCopy.scienceClass as HistoryScienceClass];
      get('[data-journey-view-note]').textContent = copy.viewQualifications[view];
      get('[data-journey-question]').textContent = inTransition ? copy.ui.moving : stageCopy.question;
      get('[data-journey-seeing]').textContent = inTransition ? copy.ui.transition : stageCopy.seeing;
      get('[data-journey-close-copy]').textContent = view === 'evidence' ? stageCopy.evidence : view === 'local' ? stageCopy.local : '';
      get('[data-journey-qualification]').textContent = stageCopy.qualification;
      get('[data-journey-sources]').innerHTML = stageCopy.sourceIds.map(id => {
        const source = content.sources[id as keyof typeof content.sources];
        return `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>`;
      }).join('');
      renderedStation = frame.stationId; renderedView = view; renderedEvent = frame.eventId; renderedTransition = inTransition;
    }
    if (failed) showFallback(frame); else { ensureScene(); scene?.update(frame, view); }
    playback.sync();
  }
  function select(fraction: number) {
    if (!document.hidden) scene?.resume();
    const sample = journeySample(fraction); cursor = sample.fraction;
    options.select(sample.ageMa, sample.eventId); update(); options.onPresentationChange();
  }
  const playback = createFinitePlayback({
    element: root, id: 'earth-history-journey', durationMs: 88000, visibilityTarget: host,
    frameIntervalMs: 100, reducedMotionSteps: HISTORY_STATIONS.length - 1,
    readProgress: () => cursor, writeProgress: select,
    onPlayingChange(playing) {
      if (disposed) return;
      const button = get<HTMLButtonElement>('[data-journey-play]');
      button.textContent = playing ? copy.ui.pause : copy.ui.play;
      button.setAttribute('aria-pressed', String(playing));
      get('[data-journey-question]').parentElement!.setAttribute('aria-live', playing ? 'off' : 'polite');
    },
  });
  root.addEventListener('change', event => {
    const target = event.target as HTMLSelectElement;
    if (target.hasAttribute('data-journey-station')) {
      const index = Number(target.value); playback.setProgress(index / (HISTORY_STATIONS.length - 1));
    } else if (target.hasAttribute('data-journey-view')) {
      if (!['globe', 'local', 'evidence'].includes(target.value)) return;
      playback.pause(); view = target.value as View; camera = undefined; if (!document.hidden) scene?.resume(); update(); options.onPresentationChange();
    }
  }, { signal: events.signal });
  scrub.addEventListener('input', () => playback.setProgress(Number(scrub.value) / 100), { signal: events.signal });
  root.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    if (button.hasAttribute('data-journey-play')) { scene?.resume(); playback.toggle(); }
    else if (button.hasAttribute('data-journey-older')) playback.setProgress(Math.max(0, Math.ceil(cursor * 11 - 1e-7) - 1) / 11);
    else if (button.hasAttribute('data-journey-younger')) playback.setProgress(Math.min(11, Math.floor(cursor * 11 + 1e-7) + 1) / 11);
    else if (button.hasAttribute('data-journey-camera')) { camera = undefined; scene?.resume(); scene?.resetCamera(); options.onPresentationChange(); }
    else if (button.hasAttribute('data-history-retry')) {
      failed = false; fallback.hidden = true; host.hidden = false; retry.hidden = true; ensureScene();
    }
  }, { signal: events.signal });
  function pause() { playback.pause(); scene?.pause(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else scene?.resume(); }, { signal: events.signal });
  update();
  return {
    update,
    pause,
    serialize(): Record<string, string> {
      return { historyView: view, historyJourneyProgress: String(cursor), ...(camera ? { historyCamera: JSON.stringify(camera) } : {}) };
    },
    dispose() {
      if (disposed) return;
      playback.dispose(); disposed = true; ++epoch; events.abort(); scene?.dispose(); scene = undefined; root.remove();
    },
  };
}
