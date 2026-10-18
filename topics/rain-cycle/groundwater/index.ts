import './style.css';
import content from './content.json';
import { conditions, DEFAULT_CONDITIONS, experiment, INITIAL_STORAGE, RIVER_HEAD, riverDirection, STEPS, waterBalance, wellState, type Conditions } from './model';
import { GroundwaterPlayback } from './playback';
import { escape, mountSection, setSectionView, type SectionView } from './scene';

let mounts = 0;
export interface GroundwaterStudy { setActive(active: boolean): void; dispose(): void }
/** The caller owns when the ground view is visible; mounting never starts time. */
export function mountGroundwaterStudy(host: HTMLElement, language: 'zh' | 'en'): GroundwaterStudy {
  const copy = content[language];
  const id = `gw-study-${++mounts}`;
  const e = escape;
  const root = document.createElement('section');
  root.className = 'gw-study'; root.lang = language;
  root.setAttribute('aria-labelledby', `${id}-heading`);
  const control = (key: 'rain' | 'permeability' | 'pumping', max: number) => `<div class="gw-control"><div class="gw-control-head"><label for="${id}-${key}">${e(copy[key])}</label><output data-output="${key}" for="${id}-${key}"></output></div><input id="${id}-${key}" data-condition="${key}" type="range" min="0" max="${max}" step="0.01" value="${DEFAULT_CONDITIONS[key]}"><small>${e(key === 'permeability' ? copy.permeabilityHint : copy.unitRate)}</small></div>`;
  const metric = (key: string, title: string, unit: string) => `<div class="gw-metric"><span>${e(title)}</span><strong data-metric="${key}"></strong><small data-unit="${key}">${e(unit)}</small></div>`;
  const tracer = (key: string, title: string) => `<div class="gw-tracer-cell"><span>${e(title)}</span><strong data-tracer="${key}"></strong><div class="gw-tracer-bar" aria-hidden="true"><i data-bar="${key}"></i></div></div>`;
  root.innerHTML = `
    <p class="gw-eyebrow">${e(copy.eyebrow)}</p><h3 id="${id}-heading">${e(copy.title)}</h3><p class="gw-intro">${e(copy.intro)}</p><p class="gw-separate">${e(copy.separate)}</p>
    <div class="gw-controls">${control('rain', 1.2)}${control('permeability', 1)}${control('pumping', 1.4)}</div>
    <p class="gw-hint">${e(copy.changeHint)}</p>
    <div class="gw-presets"><span>${e(copy.presets)}</span>${(['wet', 'dry', 'pumped', 'blocked'] as const).map(key => `<button type="button" data-preset="${key}" aria-pressed="false">${e(copy[key])}</button>`).join('')}</div>
    <p class="gw-hint" data-role="schedule"></p><div class="gw-scene"><div class="gw-camera" role="group" aria-label="${e(copy.viewLabel)}"><button type="button" data-section-view="full" aria-pressed="true" aria-controls="${id}-drawing">${e(copy.cameraFull)}</button><button type="button" data-section-view="well" aria-pressed="false" aria-controls="${id}-drawing">${e(copy.cameraWell)}</button></div><div class="gw-section" data-role="scene" id="${id}-drawing"></div><p class="gw-camera-hint" data-role="view-hint" id="${id}-view-hint">${e(copy.fullViewHint)}</p></div><p class="gw-hint">${e(copy.heightProjection)}</p><div class="gw-scene-key"><span><i class="gw-key-table" aria-hidden="true"></i>${e(copy.waterTable)}</span><span><i class="gw-key-river" aria-hidden="true"></i>${e(copy.riverLevel)}</span><span>${e(copy.soilMarker)}</span><span>${e(copy.groundMarker)}</span><span>${e(copy.riverMarker)}</span></div>
    <p class="gw-hint" data-role="well-reading"></p>
    <div class="gw-playback"><button type="button" data-role="play">${e(copy.play)}</button><button type="button" data-role="reset">${e(copy.reset)}</button><output data-role="step" for="${id}-timeline"></output></div>
    <label class="gw-timeline-label" for="${id}-timeline">${e(copy.timeline)}</label><input id="${id}-timeline" data-role="timeline" type="range" min="0" max="${STEPS}" step="1" value="0">
    <div class="gw-metrics">${metric('storage', copy.storage, copy.storageUnit)}${metric('head', copy.head, copy.headUnit)}${metric('recharge', copy.recharge, copy.unitRate)}${metric('exchange', copy.exchange, copy.unitRate)}</div>
    <p class="gw-message" data-role="message"></p><p class="gw-sr-only" aria-live="polite" data-role="announcement"></p>
    <div class="gw-history"><h4>${e(copy.plot)}</h4><svg viewBox="0 0 720 100" preserveAspectRatio="none" role="img" aria-label="${e(copy.plotHint)}"><path d="M12 10V89H708" fill="none" stroke="#bccfc7"/><path d="M12 ${88 - RIVER_HEAD * 76}H708" stroke="#7d979b" stroke-dasharray="5 5"/><path data-role="plot" d="" fill="none" stroke="#186d7f" stroke-width="2.5"/><circle data-role="plot-point" r="4" fill="#186d7f"/></svg><p class="gw-hint">${e(copy.plotHint)}</p></div>
    <div class="gw-tracer"><h4>${e(copy.tracerTitle)}</h4><p>${e(copy.tracerIntro)}</p><div class="gw-tracer-grid">${tracer('soil', copy.tracerSoil)}${tracer('ground', copy.tracerGround)}${tracer('river', copy.tracerRiver)}${tracer('other', copy.tracerOther)}</div><p data-role="tracer-status"></p></div>
    <details><summary>${e(copy.budget)}</summary><dl class="gw-budget">${(['Start', 'Rain', 'RiverIn', 'Out', 'Stored', 'Error'] as const).map(key => `<dt>${e(copy[`budget${key}`])}</dt><dd data-budget="${key}"></dd>`).join('')}</dl><p>${e(copy.boundary)}</p><p>${e(copy.wellBoundary)}</p><p>${e(copy.limits)}</p><h4>${e(copy.sourceLabel)}</h4><div class="gw-sources"><a href="https://www.usgs.gov/water-science-school/science/infiltration-and-water-cycle" target="_blank" rel="noopener noreferrer">${e(copy.sourceInfiltration)}</a><a href="https://www.usgs.gov/water-science-school/science/groundwater-flow-and-water-cycle" target="_blank" rel="noopener noreferrer">${e(copy.sourceFlow)}</a><a href="https://www.usgs.gov/water-science-school/science/rivers-contain-groundwater" target="_blank" rel="noopener noreferrer">${e(copy.sourceRiver)}</a><a href="https://www.usgs.gov/water-science-school/science/groundwater-wells" target="_blank" rel="noopener noreferrer">${e(copy.sourceWell)}</a></div></details>`;
  host.append(root);
  const find = <T extends Element = HTMLElement>(role: string) => root.querySelector<T>(`[data-role="${role}"]`)!;
  const play = find<HTMLButtonElement>('play');
  const timeline = find<HTMLInputElement>('timeline');
  const clock = new GroundwaterPlayback(STEPS);
  clock.setVisible(!document.hidden);
  let configuration = conditions();
  let history = experiment(configuration);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = new AbortController();
  const listen = { signal: abort.signal };
  const renderScene = mountSection(find('scene'), copy, id);
  const sectionSvg = find('scene').querySelector<SVGSVGElement>('svg')!;
  sectionSvg.setAttribute('aria-describedby', `${id}-view-hint`);
  let sectionView: SectionView = 'full';
  const fixed = (value: number, digits = 2) => value.toFixed(digits);
  const put = (selector: string, value: string) => { root.querySelector<HTMLElement>(selector)!.textContent = value; };
  const inputs = [...root.querySelectorAll<HTMLInputElement>('[data-condition]')];
  const syncConditions = () => {
    for (const input of inputs) {
      const key = input.dataset.condition as 'rain' | 'permeability' | 'pumping';
      input.value = String(configuration[key]);
      put(`[data-output="${key}"]`, fixed(configuration[key]));
      input.setAttribute('aria-valuetext', `${fixed(configuration[key])} ${key === 'permeability' ? '' : copy.unitRate}`.trim());
    }
    find('schedule').textContent = configuration.rainStopsAt === 24 ? copy.drySchedule : copy.steadySchedule;
  };
  function cancelTimer(): void { if (timer !== undefined) clearTimeout(timer); timer = undefined; }
  function render(): void {
    const frame = history[clock.position];
    const direction = riverDirection(frame);
    const well = wellState(frame.storage);
    renderScene(frame);
    play.textContent = clock.running ? copy.pause : clock.position === STEPS ? copy.replay : clock.position > 0 ? copy.resume : copy.play;
    play.disabled = !clock.active || !clock.visible;
    play.setAttribute('aria-pressed', String(clock.running));
    timeline.value = String(clock.position);
    const timeLabel = `${copy.step} ${clock.position} / ${STEPS}`;
    timeline.setAttribute('aria-valuetext', timeLabel);
    find('step').textContent = timeLabel;
    const values = { storage: fixed(frame.storage, 1), head: `${frame.head >= RIVER_HEAD ? '+' : ''}${fixed(frame.head - RIVER_HEAD, 3)}`, recharge: fixed(frame.flux.recharge, 3), exchange: fixed(Math.abs(frame.flux.river), 3) };
    for (const [key, value] of Object.entries(values)) put(`[data-metric="${key}"]`, value);
    put('[data-unit="exchange"]', `${copy[direction]} · ${copy.unitRate}`);
    find('well-reading').textContent = `${copy.actualPumping}: ${fixed(frame.flux.pumped, 3)} / ${fixed(configuration.pumping, 3)} ${copy.unitRate} · ${copy.wetScreen}: ${Math.round(well.wetFraction * 100)}%`;
    let message = clock.position === 0 ? copy.initial : direction === 'toRiver' ? copy.gaining : direction === 'fromRiver' ? copy.losing : copy.balanced;
    if (frame.flux.unmet > .005) message += ` ${copy.dryWell}`;
    if (frame.step > (configuration.rainStopsAt ?? STEPS) && frame.flux.recharge > .002) message += ` ${copy.soilDelay}`;
    if (clock.position === STEPS) message += ` ${copy.finished}`;
    find('message').textContent = message;
    const x = (step: number) => 12 + step / STEPS * 696;
    const y = (head: number) => 88 - head * 76;
    find<SVGPathElement>('plot').setAttribute('d', history.slice(0, clock.position + 1).map((point, i) => `${i === 0 ? 'M' : 'L'}${fixed(x(i), 1)} ${fixed(y(point.head), 1)}`).join(''));
    const dot = find<SVGCircleElement>('plot-point'); dot.setAttribute('cx', String(x(clock.position))); dot.setAttribute('cy', String(y(frame.head)));
    const tagged = { soil: frame.taggedSoil, ground: frame.taggedGround, river: frame.totals.taggedRiver, other: frame.totals.taggedRunoff + frame.totals.taggedPumped };
    for (const [key, value] of Object.entries(tagged)) {
      put(`[data-tracer="${key}"]`, fixed(value, 2));
      root.querySelector<HTMLElement>(`[data-bar="${key}"]`)!.style.width = `${frame.totals.taggedInput > 0 ? 100 * value / frame.totals.taggedInput : 0}%`;
    }
    find('tracer-status').textContent = frame.totals.taggedInput > 0 ? `${copy.tracerUnits}: ${fixed(frame.totals.taggedInput)} · ${copy.storageUnit}` : copy.tracerNone;
    const t = frame.totals;
    const budget = { Start: INITIAL_STORAGE, Rain: t.rain, RiverIn: t.riverIn, Out: t.runoff + t.riverOut + t.pumped, Stored: frame.soil + frame.storage, Error: Math.abs(waterBalance(frame)) < 1e-8 ? 0 : waterBalance(frame) };
    for (const [key, value] of Object.entries(budget)) put(`[data-budget="${key}"]`, fixed(value, 3));
  }
  function schedule(): void {
    cancelTimer();
    if (!clock.running) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (clock.tick()) render();
      if (clock.running) schedule();
      else if (clock.position === STEPS) find('announcement').textContent = copy.finished;
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 350 : 130);
  }
  function pause(): void { clock.pause(); cancelTimer(); }
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-section-view]')) button.addEventListener('click', () => {
    const next = button.dataset.sectionView as SectionView;
    if (next === sectionView) return;
    pause(); sectionView = next; setSectionView(sectionSvg, sectionView);
    for (const choice of root.querySelectorAll<HTMLButtonElement>('[data-section-view]')) choice.setAttribute('aria-pressed', String(choice.dataset.sectionView === sectionView));
    find('view-hint').textContent = sectionView === 'well' ? copy.wellViewHint : copy.fullViewHint;
    render(); find('announcement').textContent = find('view-hint').textContent;
  }, listen);
  function rerun(next: Conditions, preset = ''): void {
    pause(); configuration = conditions(next); history = experiment(configuration); clock.seek(0);
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-preset]')) button.setAttribute('aria-pressed', String(button.dataset.preset === preset));
    syncConditions(); render(); find('announcement').textContent = copy.changeHint;
  }
  play.addEventListener('click', () => { if (clock.running) pause(); else clock.play(); render(); schedule(); }, listen);
  find('reset').addEventListener('click', () => { pause(); clock.seek(0); render(); }, listen);
  timeline.addEventListener('input', () => { pause(); clock.seek(Number(timeline.value)); render(); }, listen);
  for (const input of inputs) input.addEventListener('input', () => {
    rerun({ ...configuration, [input.dataset.condition!]: Number(input.value), rainStopsAt: STEPS + 1 });
  }, listen);
  const presets: Record<string, Conditions> = {
    wet: { rain: .8, permeability: .7, pumping: 0 },
    dry: { rain: .8, permeability: .7, pumping: 0, rainStopsAt: 24 },
    pumped: { rain: .25, permeability: .65, pumping: 1.2 },
    blocked: { rain: .8, permeability: .05, pumping: .12 },
  };
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-preset]')) button.addEventListener('click', () => rerun(presets[button.dataset.preset!], button.dataset.preset), listen);
  document.addEventListener('visibilitychange', () => { clock.setVisible(!document.hidden); cancelTimer(); render(); }, listen);
  window.addEventListener('pagehide', () => { pause(); render(); }, listen);
  syncConditions(); render();
  return {
    setActive(active: boolean): void { if (clock.disposed) return; clock.setActive(active); if (!active) cancelTimer(); render(); },
    dispose(): void { if (clock.disposed) return; clock.dispose(); cancelTimer(); abort.abort(); root.remove(); },
  };
}
