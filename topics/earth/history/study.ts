import type { StudyContext, StudyInstance } from '../studyContract';
import content from './content.json';
import {
  EARTH_AGE_MA, EONS, EVENTS, GOE_INTERVAL, ICE_INTERVALS,
  MAX_OXYGEN_STEPS, SOURCES, STRATIGRAPHY_BOUNDARIES, STRATIGRAPHY_VERSION, WINDOWS, ageAtFraction, historyParameters,
  oxygenBudget, parseHistoryState, selectAge, selectEvent, selectZoom,
  serializeHistoryState, timeFraction,
  type EventId, type HistoryState, type SourceId, type Zoom,
} from './model';
import './style.css';
import { mountHistoryJourneyControls } from './journeyStudy';

const escape = (value: string | number) => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

let illustrationSerial = 0;

export function mountStudy(host: HTMLElement, context: StudyContext): StudyInstance {
  const c = content[context.language];
  const diagramId = `history-mineral-${++illustrationSerial}`;
  const zh = context.language === 'zh';
  const w = (chinese: string, english: string) => zh ? chinese : english;
  const number = (value: number, maximumFractionDigits = 3) => value.toLocaleString(zh ? 'zh-CN' : 'en-US', { maximumFractionDigits });
  const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
  const ageText = (ageMa: number) => {
    if (ageMa === 0) return c.units.today;
    const amount = zh ? ageMa >= 100 ? ageMa / 100 : ageMa >= 0.01 ? ageMa * 100 : ageMa * 1e6
      : ageMa >= 1000 ? ageMa / 1000 : ageMa >= 1 ? ageMa : ageMa * 1e6;
    const unit = zh ? ageMa >= 100 ? c.units.billion : ageMa >= 0.01 ? c.units.million : c.units.years
      : ageMa >= 1000 ? c.units.billion : ageMa >= 1 ? c.units.million : c.units.years;
    return fill(c.units.approx, { time: `${number(amount)}${zh ? '' : ' '}${unit}` });
  };
  const sourceLinks = (ids: readonly SourceId[]) => ids.map(id => `<a href="${SOURCES[id]}" target="_blank" rel="noopener noreferrer">${escape(c.sources[id])}</a>`).join('');
  let state = parseHistoryState(context.initialState);
  if (!context.initialState.ageMa && !context.initialState.event && !context.initialState.zoom) state = selectEvent(state, 'formation');
  let journey: ReturnType<typeof mountHistoryJourneyControls> | undefined;
  let disposed = false;
  let pointer: number | null = null;
  const abort = new AbortController();
  const root = host.ownerDocument.createElement('section');
  root.className = 'earth-module history-study'; root.dataset.readerWorkbench = '';
  // Original cut-slab illustration. Band contours and grains are authored, not sampled thicknesses.
  const bandY = (row: number, x: number) => 42 + row * 17.1 + 3.7 * Math.sin(x * .011 + row * .8) + 1.7 * Math.sin(x * .052 + row * .35);
  const slabBands = Array.from({ length: 10 }, (_, row) => {
    const top = Array.from({ length: 24 }, (_, i) => { const x = 66 + i * 640 / 23; return `${i ? 'L' : 'M'}${x.toFixed(1)} ${bandY(row, x).toFixed(1)}`; }).join(' ');
    const lower = Array.from({ length: 24 }, (_, i) => { const x = 66 + (23 - i) * 640 / 23; return `L${x.toFixed(1)} ${bandY(row + 1, x).toFixed(1)}`; }).join(' ');
    return `<path d="${top} ${lower}Z" fill="url(#${diagramId}-${row % 2 ? 'iron' : 'silica'})"/><path d="${top}" fill="none" stroke="${row % 2 ? '#dbb58a' : '#493e37'}" stroke-opacity=".4" stroke-width="1.2"/>`;
  }).join('');
  const slabGrains = Array.from({ length: 210 }, (_, i) => `<ellipse cx="${70 + i * 47.713 % 649}" cy="${42 + i * 29.173 % 175}" rx="${.5 + i % 4 * .3}" ry="${.3 + i % 3 * .18}" fill="${i % 3 ? '#d5b28d' : '#211c1b'}" opacity=".22"/>`).join('');
  // The same authored contacts meet the front and cut face, rather than ending at a painted edge.
  const slabSideBands = Array.from({ length: 10 }, (_, row) => {
    const top = bandY(row, 706), bottom = bandY(row + 1, 706);
    return `<path d="M706 ${top}l34-19V${bottom - 19}l-34 19Z" fill="url(#${diagramId}-${row % 2 ? 'iron' : 'silica'})"/><path d="M706 ${top}l34-19" stroke="#44372f" stroke-opacity=".42" fill="none"/>`;
  }).join('');
  const slabPointers = [5, 2].map((row, i) => {
    const y = (bandY(row, 148) + bandY(row + 1, 148)) / 2;
    return `<g><path d="M43 ${y}H148" stroke="#463e34" stroke-width="1.7"/><circle cx="148" cy="${y}" r="4.5" fill="none" stroke="#f4e7cf" stroke-width="2"/><circle cx="24" cy="${y}" r="18" fill="#f5eedf" stroke="#665342" stroke-width="1.5"/><text x="24" y="${y + 9}" text-anchor="middle" fill="#493f32" font-size="27" font-weight="600">${i + 1}</text></g>`;
  }).join('');
  root.innerHTML = `
    <header class="history-intro" data-reader-prose><p class="history-eyebrow">${escape(c.title)}</p><p>${escape(c.intro)}</p></header>
    <section class="history-time" aria-label="${escape(c.timelineTitle)}">
      <h2 class="earth-section-title">${escape(c.timelineTitle)}</h2>
      <p class="earth-note">${escape(c.timelineHint)}</p>
      <div class="history-time-grid"><div class="history-ruler-workspace"><div class="earth-stage history-time-stage" data-reader-stage>
        <div class="history-axis-heading">${escape(c.overviewTitle)}</div>
        <div class="history-overview"></div>
        <div class="history-eon-key" data-reader-legend>${EONS.map(eon => `<span><i class="history-swatch history-${eon.id}"></i>${escape(c.eons[eon.id])}</span>`).join('')}</div>
        <p class="history-scale-note" data-reader-caption>${escape(c.overviewNote)}</p>
        <div class="history-time-key" data-reader-legend><span><i class="history-swatch history-ice"></i>${escape(c.iceLegend)}</span><span><i class="history-swatch history-oxygen"></i>${escape(c.oxygenLegend)}</span></div>
        <div class="history-window-axis" hidden></div>
        <div class="history-cursor earth-readout" aria-live="off" data-reader-readout></div>
        <label class="history-range-label" data-reader-scrub><span class="history-time-slider-label"></span><input class="history-time-slider" type="range" min="0" max="${EARTH_AGE_MA}" step="0.001" aria-label="${escape(c.timelineTitle)}"></label>
      </div>
      <details class="history-options"><summary>${escape(w('放大时间窗口', 'Enlarge the time window'))}</summary><div class="earth-controls history-window-controls" data-reader-controls><label><span>${escape(c.zoomTitle)}</span><select class="history-zoom">
        <option value="all">${escape(c.zoomAll)}</option><option value="animals">${escape(c.zoomAnimals)}</option><option value="ice">${escape(c.zoomIce)}</option><option value="human">${escape(c.zoomHuman)}</option>
      </select></label><p class="earth-note history-zoom-factor"></p></div>
      <p class="earth-note">${escape(c.zoomNote)} ${escape(c.compressed)}</p></details>
      <div class="history-event-navigation earth-controls" data-reader-controls><button type="button" data-action="older">← ${escape(c.older)}</button><label><span>${escape(c.eventSelect)}</span><select class="history-event-select">${EVENTS.map(event => `<option value="${event.id}">${escape(ageText(event.ageMa))} · ${escape(c.events[event.id].title)}</option>`).join('')}</select></label><button type="button" data-action="younger">${escape(c.younger)} →</button></div>
      </div><article class="history-story" data-reader-prose>
        <div class="history-story-meta"><span class="history-event-kind"></span><span class="history-event-date"></span></div>
        <p class="history-nearby">${escape(c.nearby)}</p><h3 class="history-event-title"></h3>
        <p class="history-event-lead"></p><p class="history-event-mechanism"></p>
        <p class="history-event-interval earth-note"></p>
        <div class="history-event-links"></div>
        <details class="earth-deeper history-deep-time"><summary>${escape(c.deepTimeTitle)}</summary><div class="history-details-body" data-reader-prose>
          <h4>${escape(c.evidenceLabel)}</h4><p class="history-event-evidence"></p><h4>${escape(c.uncertaintyLabel)}</h4><p class="history-event-uncertainty"></p>
          <p>${escape(c.dating)}</p><p class="earth-note">${escape(c.allDates)}</p>
          <h4>${escape(c.stratigraphyTitle)} · ICS ${STRATIGRAPHY_VERSION}</h4><p>${escape(c.stratigraphyNote)}</p>
          <table class="history-boundaries"><caption>${escape(c.stratigraphyCaption)}</caption><thead><tr><th scope="col">${escape(c.periodBase)}</th><th scope="col">${escape(c.boundaryAge)}</th></tr></thead><tbody>${STRATIGRAPHY_BOUNDARIES.map(boundary => `<tr><th scope="row">${escape(c.periods[boundary.id])}</th><td>${number(boundary.ageMa)}${boundary.uncertaintyMa === null ? '' : ` ± ${number(boundary.uncertaintyMa)}`} Ma</td></tr>`).join('')}</tbody></table>
          <p class="earth-note">${escape(c.hadeanNote)} <a href="${SOURCES.timeChart}" target="_blank" rel="noopener noreferrer">ICS ${STRATIGRAPHY_VERSION}</a></p>
          <p class="earth-note">${escape(c.climateRangeNote)}</p><div class="history-sources"><strong>${escape(c.sourceLabel)}</strong><div class="history-event-sources"></div></div>
        </div></details>
        <aside class="history-question"><strong>${escape(c.questionLabel)}</strong><p class="history-event-question"></p></aside>
      </article></div>
      <p class="earth-note">${escape(c.historyNotLadder)}</p>
    </section>
    <section class="history-oxygen-lab" aria-label="${escape(c.oxygenTitle)}">
      <h2 class="earth-section-title">${escape(c.oxygenTitle)}</h2><p>${escape(c.oxygenIntro)}</p>
      <p class="earth-note history-model-boundary">${escape(c.oxygenBoundary)}</p>
      <details class="history-options history-budget-options"><summary>${escape(w('调节氧的来源与去向', 'Adjust oxygen sources and uses'))} · <span class="history-budget-choice"></span></summary><div class="history-presets earth-controls" data-reader-actions><button type="button" data-action="high">${escape(c.highPreset)}</button><button type="button" data-action="low">${escape(c.lowPreset)}</button></div>
      <div class="history-budget-controls earth-controls" data-reader-controls>
        <label><span>${escape(c.sourceControl)}</span><output class="history-source-value"></output><input class="history-source" type="range" min="0" max="12" step="1" aria-label="${escape(c.sourceControl)}"></label>
        <label><span>${escape(c.recycleControl)}</span><output class="history-recycle-value"></output><input class="history-recycle" type="range" min="0" max="100" step="10" aria-label="${escape(c.recycleControl)}"></label>
        <label><span>${escape(c.sinkControl)}</span><output class="history-sink-value"></output><input class="history-sink" type="range" min="0" max="12" step="1" aria-label="${escape(c.sinkControl)}"></label>
      </div>
      </details><div class="history-ledger" data-reader-readout>
        <div class="history-ledger-cell history-source-cell"><span>${escape(c.released)}</span><strong class="history-released"></strong><small>${escape(c.thisTurn)}</small></div>
        <div class="history-ledger-cell history-recycle-cell"><span>${escape(c.recycled)}</span><strong class="history-recycled"></strong><small>${escape(c.thisTurn)}</small></div>
        <div class="history-ledger-cell history-geology-cell"><span>${escape(c.geological)}</span><strong class="history-geological"></strong><small class="history-demand"></small></div>
        <div class="history-ledger-cell history-stock-cell"><span>${escape(c.remaining)}</span><strong class="history-stock"></strong><small>${escape(c.total)}</small></div>
      </div>
      <figure class="history-allocation-figure"><figcaption>${escape(w('累计释放的氧，到哪里去了？', 'Where has the released oxygen gone?'))}</figcaption><div class="history-allocation" aria-live="off"></div><p class="earth-note">${escape(w('同一累计总量内的分配；色带长度表示教学氧单位的份额，不是大气浓度。', 'Shares of the same cumulative total. Band lengths encode teaching oxygen units, not atmospheric concentration.'))}</p></figure>
      <p class="history-result earth-readout" aria-live="polite" data-reader-readout></p>
      <div class="history-turn-controls earth-controls" data-reader-actions><button type="button" data-action="back">${escape(c.stepBack)}</button><button type="button" data-action="forward">${escape(c.stepForward)}</button><button type="button" data-action="reset">${escape(c.resetBudget)}</button></div>
      <label class="history-range-label" data-reader-scrub><span>${escape(c.stepsControl)}</span><input class="history-steps" type="range" min="0" max="${MAX_OXYGEN_STEPS}" step="1" aria-label="${escape(c.stepsControl)}"><output class="history-step-value"></output></label>
      <p class="earth-note">${escape(c.recompute)}</p>
      <figure class="history-budget-figure"><figcaption>${escape(c.chartTitle)}</figcaption><div class="history-chart-legend" data-reader-legend><span class="history-current-key">${escape(c.currentLegend)}</span><span class="history-reference-key">${escape(c.referenceLegend)}</span></div><div class="history-chart-y">${escape(c.chartY)}</div><div class="history-budget-chart"></div><div class="history-chart-x"><span>0</span><span>12</span><span>24</span></div><p class="earth-note">${escape(c.chartX)}</p><p class="history-reference-readout earth-note"></p></figure>
      <details class="earth-deeper history-deep-oxygen"><summary>${escape(c.deepOxygenTitle)}</summary><div class="history-details-body" data-reader-prose>${c.deepOxygen.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}<div class="history-sources">${sourceLinks(['oxygenBudget', 'oxygen', 'ironExample'])}</div></div></details>
    </section>
    <section class="history-rock-record" aria-label="${escape(c.rockTitle)}"><h2 class="earth-section-title">${escape(c.rockTitle)}</h2><p>${escape(c.rockIntro)}</p>
      <figure class="history-rock-figure"><div class="history-rock-process" data-reader-caption><span>${escape(c.ironWater)}</span><span>${escape(c.ironReaction)}</span><span>${escape(c.ironRecord)}</span></div>
        <svg data-reader-stage viewBox="0 0 800 260" role="img" aria-label="${escape(c.rockDiagramLabel)}"><defs><linearGradient id="${diagramId}-iron" x2=".2" y2="1"><stop stop-color="#9b6448"/><stop offset=".55" stop-color="#713f33"/><stop offset="1" stop-color="#a1694d"/></linearGradient><linearGradient id="${diagramId}-silica" x2=".1" y2="1"><stop stop-color="#c0ab8e"/><stop offset=".5" stop-color="#a48f78"/><stop offset="1" stop-color="#d0b99a"/></linearGradient><clipPath id="${diagramId}-slab"><path d="M66 59 706 41V215L66 233Z"/></clipPath><clipPath id="${diagramId}-cut"><path d="M706 41 740 22V196L706 215Z"/></clipPath></defs><ellipse cx="406" cy="229" rx="331" ry="10" fill="#312c27" opacity=".12"/><path d="M66 59 100 40 740 22 706 41Z" fill="#c5b296" stroke="#9b8266"/><g clip-path="url(#${diagramId}-cut)"><path d="M706 22H741V216H706Z" fill="#7e614a"/>${slabSideBands}<path d="M706 22H741V216H706Z" fill="#3b3028" fill-opacity=".2"/></g><g clip-path="url(#${diagramId}-slab)"><path d="M50 25H750V240H50Z" fill="#8e6c53"/>${slabBands}${slabGrains}<path d="m188 40-13 69 15 38-6 73m344-182-10 72 10 48-7 53" fill="none" stroke="#352d29" stroke-opacity=".3" stroke-width="1.1"/></g><path d="M66 59 706 41V215L66 233Z M706 41 740 22V196L706 215" class="history-rock-edge"/>${slabPointers}</svg>
        <div class="history-rock-key" data-reader-legend><span><b aria-hidden="true">1</b><i class="history-swatch history-iron"></i>${escape(c.ironBand)}</span><span><b aria-hidden="true">2</b><i class="history-swatch history-silica"></i>${escape(c.silicaBand)}</span></div><figcaption class="earth-note" data-reader-caption>${escape(c.rockDiagramLabel)}</figcaption>
      </figure>
      <details class="earth-deeper history-rock-evidence"><summary>${escape(c.rockMore)}</summary><div class="history-details-body" data-reader-prose>${c.rockEvidence.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}<div class="history-sources">${sourceLinks(['iron', 'ironExample', 'oxygen'])}</div></div></details>
      <button type="button" class="history-crosslink" data-earth-chapter="rocks">${escape(c.rocksLink)} →</button>
    </section>`;
  host.replaceChildren(root);
  const extended = host.ownerDocument.createElement('details');
  extended.className = 'history-extended'; extended.dataset.readerProse = '';
  const extendedSummary = host.ownerDocument.createElement('summary');
  extendedSummary.textContent = w('时间尺、全部历史线索与氧收支实验', 'Time rulers, all historical clues and the oxygen experiment');
  const existing = [...root.childNodes];
  extended.append(extendedSummary, ...existing); root.append(extended);
  extended.open = context.initialState.historyDetails === 'open' || state.deepTime || state.deepOxygen || state.rockEvidence;
  const query = <T extends Element = HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const setText = (selector: string, text: string) => { query(selector).textContent = text; };
  const overview = query('.history-overview');
  const active = query<HTMLElement>('.history-window-axis');
  const timeSlider = query<HTMLInputElement>('.history-time-slider');
  const zoom = query<HTMLSelectElement>('.history-zoom');
  const eventSelect = query<HTMLSelectElement>('.history-event-select');
  const source = query<HTMLInputElement>('.history-source');
  const recycle = query<HTMLInputElement>('.history-recycle');
  const sink = query<HTMLInputElement>('.history-sink');
  const steps = query<HTMLInputElement>('.history-steps');
  const deepTime = query<HTMLDetailsElement>('.history-deep-time');
  const deepOxygen = query<HTMLDetailsElement>('.history-deep-oxygen');
  const rockEvidence = query<HTMLDetailsElement>('.history-rock-evidence');
  const currentTickUnits = w('刻度：距今百万年（Ma）；1 Ma = 100万年', 'Ticks: million years ago (Ma); 1 Ma = 1 million years');

  function axis(maxMa: number, isOverview: boolean): string {
    const position = (age: number) => 100 * timeFraction(age, maxMa);
    const band = (older: number, younger: number, className: string) => {
      if (younger >= maxMa) return '';
      const left = position(Math.min(older, maxMa));
      return `<i class="${className}" style="left:${left}%;width:${position(younger) - left}%"></i>`;
    };
    const ticks = maxMa === EARTH_AGE_MA ? [EARTH_AGE_MA, 3000, 2000, 1000, 0]
      : maxMa === 600 ? [600, 500, 400, 300, 200, 100, 0]
      : maxMa === 3 ? [3, 2.5, 2, 1.5, 1, 0.5, 0] : [1, 0.8, 0.6, 0.4, 0.2, 0];
    return `<div class="history-axis" role="img" aria-label="${escape(`${c.cursor.replace('{age}', ageText(state.ageMa))}. ${currentTickUnits}. ${c.overviewNote}`)}">
      <div class="history-event-marks">${EVENTS.filter(event => event.ageMa <= maxMa).map((event, index) => `<i class="history-event-mark ${event.id === state.event ? 'is-selected' : ''}" style="left:${position(event.ageMa)}%;height:${10 + index % 3 * 5}px" title="${escape(c.events[event.id].title)}"></i>`).join('')}</div>
      <div class="history-eon-track">${EONS.map(eon => band(eon.oldMa, eon.youngMa, `history-${eon.id}`)).join('')}</div>
      <div class="history-interval-track">${band(GOE_INTERVAL.oldMa, GOE_INTERVAL.youngMa, 'history-oxygen')}</div>
      <div class="history-ice-track">${ICE_INTERVALS.map(interval => band(interval.oldMa, interval.youngMa, 'history-ice')).join('')}</div>
      ${isOverview && state.zoom !== 'all' ? `<div class="history-zoom-bracket" style="left:${position(WINDOWS[state.zoom])}%;width:${100 - position(WINDOWS[state.zoom])}%"></div>` : ''}
      <div class="history-axis-cursor" style="left:${position(state.ageMa)}%"><i></i></div>
      <div class="history-ticks">${ticks.map((tick, index) => `<span class="${index === 0 ? 'is-first' : index === ticks.length - 1 ? 'is-last' : ''}" style="left:${position(tick)}%">${number(tick)}</span>`).join('')}</div>
    </div><div class="history-tick-units" data-reader-caption>${escape(currentTickUnits)}</div>`;
  }

  function renderTimeline(): void {
    const event = EVENTS.find(candidate => candidate.id === state.event)!;
    const eventContent = c.events[event.id];
    overview.innerHTML = axis(EARTH_AGE_MA, true);
    active.hidden = state.zoom === 'all';
    if (!active.hidden) active.innerHTML = `<div class="history-axis-heading">${escape(state.zoom === 'animals' ? c.zoomAnimals : state.zoom === 'ice' ? c.zoomIce : c.zoomHuman)}</div>${axis(WINDOWS[state.zoom], false)}`;
    zoom.value = state.zoom;
    timeSlider.max = String(WINDOWS[state.zoom]);
    timeSlider.step = '0.001';
    timeSlider.value = String(WINDOWS[state.zoom] - state.ageMa);
    timeSlider.setAttribute('aria-valuetext', ageText(state.ageMa));
    setText('.history-cursor', fill(c.cursor, { age: ageText(state.ageMa) }));
    setText('.history-time-slider-label', state.zoom === 'all' ? c.zoomAll : state.zoom === 'animals' ? c.zoomAnimals : state.zoom === 'ice' ? c.zoomIce : c.zoomHuman);
    setText('.history-zoom-factor', fill(c.zoomScale, { factor: number(EARTH_AGE_MA / WINDOWS[state.zoom], 2) }));
    eventSelect.value = state.event;
    root.dataset.historyEvent = state.event;
    setText('.history-event-kind', c.typeLabels[event.kind]);
    setText('.history-event-date', fill(c.selectedDate, { age: ageText(event.ageMa) }));
    setText('.history-event-title', eventContent.title);
    setText('.history-event-lead', eventContent.lead);
    setText('.history-event-mechanism', eventContent.mechanism);
    setText('.history-event-evidence', eventContent.evidence);
    setText('.history-event-uncertainty', eventContent.uncertainty);
    setText('.history-event-question', eventContent.question);
    const interval = query<HTMLElement>('.history-event-interval');
    interval.hidden = !('youngMa' in event);
    interval.textContent = 'youngMa' in event ? fill(c.intervalGeneral, { older: ageText(event.ageMa), younger: ageText(event.youngMa) }) : '';
    query('.history-event-sources').innerHTML = sourceLinks(event.sourceIds);
    const climateEvents: string[] = ['oxygen', 'huronian', 'cryogenian', 'ordovician', 'paleoIce', 'antarctic', 'quaternary', 'lgm', 'megafauna'];
    const chapter = climateEvents.includes(event.id) ? 'climate' : event.id === 'separation' ? 'interior' : event.id === 'forests' ? 'systems' : 'rocks';
    const label = chapter === 'climate' ? c.climateLink : chapter === 'interior' ? c.interiorLink : chapter === 'systems' ? c.systemsLink : c.rocksLink;
    query('.history-event-links').innerHTML = `<button type="button" class="history-crosslink" data-earth-chapter="${chapter}">${escape(label)} →</button>`;
    const index = EVENTS.findIndex(item => item.id === state.event);
    query<HTMLButtonElement>('[data-action="older"]').disabled = index === 0;
    query<HTMLButtonElement>('[data-action="younger"]').disabled = index === EVENTS.length - 1;
    if (deepTime.open !== state.deepTime) deepTime.open = state.deepTime;
  }

  function renderBudget(): void {
    source.value = String(state.oxygenSource); recycle.value = String(state.oxygenRecycle);
    sink.value = String(state.oxygenSink); steps.value = String(state.oxygenSteps);
    setText('.history-budget-choice', `${state.oxygenSource} / ${state.oxygenRecycle}% / ${state.oxygenSink}`);
    setText('.history-source-value', `${number(state.oxygenSource)} ${c.unitsPerTurn}`);
    setText('.history-recycle-value', `${number(state.oxygenRecycle)}%`);
    setText('.history-sink-value', `${number(state.oxygenSink)} ${c.unitsPerTurn}`);
    setText('.history-step-value', `${state.oxygenSteps} / ${MAX_OXYGEN_STEPS}`);
    const parameters = historyParameters(state);
    const frames = oxygenBudget(parameters, state.oxygenSteps);
    const reference = oxygenBudget({ ...parameters, geologicalDemand: 2 }, state.oxygenSteps);
    const current = frames.at(-1)!;
    const ref = reference.at(-1)!;
    const allocations = [
      { value: current.totalRecycled, label: c.recycled, color: '#b48857' },
      { value: current.totalGeological, label: c.geological, color: '#925a46' },
      { value: current.stock, label: c.remaining, color: '#497a8c' },
    ];
    let allocationX = 0;
    query('.history-allocation').innerHTML = `<svg viewBox="0 0 720 50" preserveAspectRatio="none" role="img" aria-label="${escape(allocations.map(part => `${part.label}: ${number(part.value)}`).join('; '))}"><rect x="1" y="5" width="718" height="38" rx="4" fill="none" stroke="currentColor" opacity=".25"/>${allocations.map(part => {
      const width = current.totalReleased > 0 ? part.value / current.totalReleased * 718 : 0;
      const rect = width > 0 ? `<rect x="${1 + allocationX}" y="6" width="${width}" height="36" fill="${part.color}"/>` : '';
      allocationX += width; return rect;
    }).join('')}</svg><div class="history-allocation-key" data-reader-legend>${allocations.map(part => `<span><i style="background:${part.color}"></i>${escape(part.label)} <strong>${number(part.value)}</strong></span>`).join('')}</div>`;
    setText('.history-released', number(current.released));
    setText('.history-recycled', number(current.recycled));
    setText('.history-geological', number(current.geologicalConsumed));
    setText('.history-stock', number(current.stock));
    setText('.history-demand', fill(c.demand, { demand: state.oxygenSink, actual: number(current.geologicalConsumed) }));
    setText('.history-result', state.oxygenSteps === 0 ? c.stockResultStart : state.oxygenSource === 0 ? c.stockResultNoSource : current.stock > 1e-9 ? c.stockResultGrowth : c.stockResultZero);
    setText('.history-reference-readout', fill(c.comparisonReadout, { turn: state.oxygenSteps, current: number(current.stock), reference: number(ref.stock) }) + (frames.every((frame, index) => Math.abs(frame.stock - reference[index].stock) < 1e-9) ? ` ${c.curvesCoincide}` : ''));
    const maxY = Math.max(12, state.oxygenSource * (1 - state.oxygenRecycle / 100) * MAX_OXYGEN_STEPS);
    const point = (step: number, stock: number) => `${step / MAX_OXYGEN_STEPS * 680 + 36},${204 - stock / maxY * 180}`;
    query('.history-budget-chart').innerHTML = `<div class="history-chart-max">${number(maxY)}</div><div class="history-chart-zero">0</div><svg viewBox="0 0 720 224" preserveAspectRatio="none" role="img" aria-label="${escape(c.chartDescription)}">
      <path class="history-chart-grid" d="M36 24H716M36 114H716M36 204H716M36 24V204M376 24V204M716 24V204"/>
      <polyline class="history-current-line" points="${frames.map(frame => point(frame.step, frame.stock)).join(' ')}"/>
      <polyline class="history-reference-line" points="${reference.map(frame => point(frame.step, frame.stock)).join(' ')}"/>
      <circle class="history-reference-dot" cx="${36 + state.oxygenSteps / MAX_OXYGEN_STEPS * 680}" cy="${204 - ref.stock / maxY * 180}" r="4"/>
      <circle class="history-current-dot" cx="${36 + state.oxygenSteps / MAX_OXYGEN_STEPS * 680}" cy="${204 - current.stock / maxY * 180}" r="4"/>
    </svg>`;
    query<HTMLButtonElement>('[data-action="back"]').disabled = state.oxygenSteps === 0;
    query<HTMLButtonElement>('[data-action="forward"]').disabled = state.oxygenSteps === MAX_OXYGEN_STEPS;
    query<HTMLButtonElement>('[data-action="high"]').setAttribute('aria-pressed', String(state.oxygenSource === 8 && state.oxygenRecycle === 50 && state.oxygenSink === 6));
    query<HTMLButtonElement>('[data-action="low"]').setAttribute('aria-pressed', String(state.oxygenSource === 8 && state.oxygenRecycle === 50 && state.oxygenSink === 2));
    if (deepOxygen.open !== state.deepOxygen) deepOxygen.open = state.deepOxygen;
    if (rockEvidence.open !== state.rockEvidence) rockEvidence.open = state.rockEvidence;
  }

  function publish() {
    context.onStateChange({ ...serializeHistoryState(state), ...journey?.serialize(), historyDetails: extended.open ? 'open' : 'closed' });
  }
  let lastSaved = JSON.stringify(serializeHistoryState(state));
  function commit(next: HistoryState, area: 'timeline' | 'budget' | 'details' = 'timeline'): void {
    if (disposed) return;
    const serialized = serializeHistoryState(next);
    const encoded = JSON.stringify(serialized);
    if (encoded === lastSaved) return;
    state = next; lastSaved = encoded;
    root.dataset.historyEvent = state.event;
    if (area === 'timeline') { if (extended.open) renderTimeline(); journey?.update(); }
    else if (area === 'budget') renderBudget();
    publish();
  }

  timeSlider.addEventListener('input', () => commit(selectAge(state, WINDOWS[state.zoom] - Number(timeSlider.value))), { signal: abort.signal });
  timeSlider.addEventListener('keydown', event => {
    const increment = state.zoom === 'human' || state.zoom === 'ice' ? 0.001 : state.zoom === 'animals' ? 0.1 : 1;
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp' ? 1
      : event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown' ? -1 : 0;
    if (direction) {
      event.preventDefault();
      commit(selectAge(state, state.ageMa + direction * increment * (event.key.startsWith('Page') || event.shiftKey ? 10 : 1)));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); commit(selectAge(state, event.key === 'Home' ? WINDOWS[state.zoom] : 0));
    }
  }, { signal: abort.signal });
  zoom.addEventListener('change', () => commit(selectZoom(state, zoom.value as Zoom)), { signal: abort.signal });
  eventSelect.addEventListener('change', () => commit(selectEvent(state, eventSelect.value as EventId)), { signal: abort.signal });
  for (const [element, key] of [[source, 'oxygenSource'], [recycle, 'oxygenRecycle'], [sink, 'oxygenSink'], [steps, 'oxygenSteps']] as const) {
    element.addEventListener('input', () => commit({ ...state, [key]: Number(element.value) }, 'budget'), { signal: abort.signal });
  }
  for (const [element, key] of [[deepTime, 'deepTime'], [deepOxygen, 'deepOxygen'], [rockEvidence, 'rockEvidence']] as const) {
    element.addEventListener('toggle', () => commit({ ...state, [key]: element.open }, 'details'), { signal: abort.signal });
  }
  root.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    if (action === 'older' || action === 'younger') {
      const index = EVENTS.findIndex(item => item.id === state.event) + (action === 'older' ? -1 : 1);
      if (EVENTS[index]) commit(selectEvent(state, EVENTS[index].id));
    } else if (action === 'high' || action === 'low') {
      commit({ ...state, oxygenSource: 8, oxygenRecycle: 50, oxygenSink: action === 'high' ? 6 : 2, oxygenSteps: Math.max(1, state.oxygenSteps) }, 'budget');
    } else if (action === 'forward' || action === 'back') {
      commit({ ...state, oxygenSteps: Math.min(MAX_OXYGEN_STEPS, Math.max(0, state.oxygenSteps + (action === 'forward' ? 1 : -1))) }, 'budget');
    } else if (action === 'reset') commit({ ...state, oxygenSteps: 0 }, 'budget');
  }, { signal: abort.signal });

  function attachRuler(element: HTMLElement, window: () => number): void {
    const move = (event: PointerEvent) => {
      const axisElement = element.querySelector<HTMLElement>('.history-axis');
      if (!axisElement) return;
      const bounds = axisElement.getBoundingClientRect();
      if (bounds.width <= 0) return;
      let next = state;
      if (element === overview && state.zoom !== 'all') next = { ...state, zoom: 'all' };
      commit(selectAge(next, ageAtFraction((event.clientX - bounds.left) / bounds.width, window())));
    };
    element.addEventListener('pointerdown', event => {
      if (event.button !== 0 || disposed) return;
      pointer = event.pointerId; element.setPointerCapture(pointer); event.preventDefault(); move(event);
    }, { signal: abort.signal });
    element.addEventListener('pointermove', event => { if (pointer === event.pointerId) move(event); }, { signal: abort.signal });
    element.addEventListener('pointerup', event => {
      if (pointer === event.pointerId) { pointer = null; if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId); }
    }, { signal: abort.signal });
    element.addEventListener('pointercancel', () => { pointer = null; }, { signal: abort.signal });
  }
  attachRuler(overview, () => EARTH_AGE_MA);
  attachRuler(active, () => WINDOWS[state.zoom]);
  renderTimeline(); renderBudget();
  journey = mountHistoryJourneyControls(root, {
    language: context.language, initialState: context.initialState, read: () => state,
    select(ageMa, event) { commit({ ...state, ageMa, event, zoom: 'all' }); },
    onPresentationChange: publish,
  });
  extended.addEventListener('toggle', () => { if (disposed) return; if (extended.open) renderTimeline(); publish(); }, { signal: abort.signal });
  publish();
  const pause = () => {
    journey?.pause();
    if (pointer !== null) {
      for (const element of [overview, active]) if (element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
      pointer = null;
    }
  };
  return {
    pause,
    dispose() {
      if (disposed) return;
      pause(); disposed = true; journey?.dispose(); abort.abort(); root.remove();
    },
  };
}
