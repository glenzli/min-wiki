import type { StudyContext, StudyInstance } from '../studyContract';
import content from './content.json';
import {
  EARTH, compositionAtDepth, plateFrame, radialPosition, representativeDepth,
  restoreState, serializeState, waveObservation,
  type Boundary, type InteriorLayer, type InteriorState, type InteriorView,
} from './model';
import './style.css';
import type { InteriorScene } from './scene3d';
import type { mountRiftStudy } from './rift/study';

type Copy = typeof content.en;
const escape = (value: string | number) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const fmt = (n: number) => n.toLocaleString('en-US');
const palette = { crust: '#8b6044', mantle: '#d19c63', outerCore: '#dcad45', innerCore: '#f5dc89', lithosphere: '#315b6a' };
const sourceLinks = [
  ['NASA · Earth Fact Sheet', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html'],
  ['NASA · Facts About Earth', 'https://science.nasa.gov/earth/facts/'],
  ['USGS · Are tectonic plates floating on magma?', 'https://www.usgs.gov/faqs/are-tectonic-plates-floating-magma'],
  ['IRIS / EarthScope · Seismic shadow zone', 'https://www.iris.edu/hq/inclass/animation/seismic_shadow_zone_basic_introduction'],
  ['USGS · Understanding plate motions', 'https://pubs.usgs.gov/gip/dynamic/understanding.html'],
  ['NASA JPL · Iron meteorites and asteroid cores', 'https://www.jpl.nasa.gov/news/curiosity-mars-rover-checks-odd-looking-iron-meteorite/'],
  ['USGS · The Science of Earthquakes', 'https://www.usgs.gov/programs/earthquake-hazards/science-earthquakes'],
  ['Dziewonski & Gilbert · Inner-core normal modes (1971)', 'https://www.nature.com/articles/234465a0'],
  ['McKenzie & Bickle · Mantle upwelling and melting (1988)', 'https://academic.oup.com/petrology/article-abstract/29/3/625/1432023'],
];

function button(value: string, label: string, attribute: string, current: string): string {
  return `<button type="button" ${attribute}="${escape(value)}" aria-pressed="${current === value}">${escape(label)}</button>`;
}

function globe(cx: number, cy: number, r: number, opacity = 1): string {
  const core = EARTH.coreRadiusKm / EARTH.radiusKm * r;
  const inner = EARTH.innerCoreRadiusKm / EARTH.radiusKm * r;
  const mantle = radialPosition(EARTH.referenceContinentalCrustKm, r);
  return `<g opacity="${opacity}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${palette.crust}"/>
    <circle cx="${cx}" cy="${cy}" r="${mantle}" fill="${palette.mantle}"/>
    <circle cx="${cx}" cy="${cy}" r="${core}" fill="${palette.outerCore}"/>
    <circle cx="${cx}" cy="${cy}" r="${inner}" fill="${palette.innerCore}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--earth-line)" stroke-width=".7"/>
  </g>`;
}

function layersDiagram(state: InteriorState, c: Copy): string {
  const cx = 210, cy = 202, r = 171;
  const pinR = radialPosition(state.interiorDepth, r);
  const pinX = cx + pinR * .76, pinY = cy - pinR * .65;
  const lithoR = radialPosition(EARTH.referenceLithosphereKm, r);
  const insetY = 42, zoomScale = .86, insetH = EARTH.zoomDepthKm * zoomScale;
  const continental = EARTH.referenceContinentalCrustKm * zoomScale;
  const oceanic = EARTH.referenceOceanicCrustKm * zoomScale;
  const markerY = insetY + state.interiorDepth * zoomScale;
  const mechanical = state.interiorLens === 'mechanical';
  const dashed = mechanical ? `<circle cx="${cx}" cy="${cy}" r="${lithoR}" fill="none" stroke="${palette.lithosphere}" stroke-width="1.5" stroke-dasharray="5 3"/>` : '';
  const whole = `<svg viewBox="0 0 420 412" role="img" aria-label="${escape(c.trueScale)}">
    ${globe(cx, cy, r)}${dashed}
    <line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="var(--earth-ink)" stroke-width="1"/>
    <line x1="${cx}" y1="${cy - 5}" x2="${cx}" y2="${cy + 5}" stroke="var(--earth-ink)"/>
    <line x1="${cx + r}" y1="${cy - 5}" x2="${cx + r}" y2="${cy + 5}" stroke="var(--earth-ink)"/>
    <text x="${cx + r / 2}" y="${cy + 23}" text-anchor="middle" class="interior-svg-label">${escape(c.radius)} ${fmt(EARTH.radiusKm)} km</text>
    <line x1="${cx}" y1="${cy}" x2="${cx + r * .76}" y2="${cy - r * .65}" stroke="var(--earth-ink)" stroke-width="1" stroke-dasharray="3 4"/>
    <circle cx="${pinX}" cy="${pinY}" r="5" fill="var(--earth-paper)" stroke="var(--earth-ink)" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="2" fill="var(--earth-ink)"/>
    <text x="${cx}" y="${cy - 13}" text-anchor="middle" class="interior-svg-label">${escape(c.center)}</text>
    <text x="${cx}" y="398" text-anchor="middle" class="interior-svg-label">${escape(c.layers[compositionAtDepth(state.interiorDepth)].label)} · ${fmt(state.interiorDepth)} km</text>
  </svg>`;
  const ticks = [0, 30, 100, 200, 300].map(depth => {
    const y = insetY + depth * zoomScale;
    return `<line x1="30" y1="${y}" x2="38" y2="${y}" stroke="var(--earth-ink)"/><text x="24" y="${y + 4}" text-anchor="end" class="interior-svg-small">${depth}</text>`;
  }).join('');
  const inset = `<svg viewBox="0 0 290 350" role="img" aria-label="${escape(c.thinZoom)}">
    <line x1="37" y1="${insetY}" x2="37" y2="${insetY + insetH}" stroke="var(--earth-ink)"/>${ticks}
    <text x="19" y="22" text-anchor="middle" class="interior-svg-small">km</text>
    <rect x="55" y="${insetY}" width="82" height="${insetH}" fill="${palette.mantle}"/>
    <rect x="55" y="${insetY}" width="82" height="${continental}" fill="${palette.crust}"/>
    <rect x="163" y="${insetY}" width="82" height="${insetH}" fill="${palette.mantle}"/>
    <rect x="163" y="${insetY}" width="82" height="${oceanic}" fill="${palette.crust}"/>
    <text x="96" y="324" text-anchor="middle" class="interior-svg-small">${escape(c.zoomContinental)}</text>
    <text x="204" y="324" text-anchor="middle" class="interior-svg-small">${escape(c.zoomOceanic)}</text>
    <text x="96" y="${insetY + continental + 17}" text-anchor="middle" class="interior-svg-small">${EARTH.referenceContinentalCrustKm} km</text>
    <text x="204" y="${insetY + oceanic + 17}" text-anchor="middle" class="interior-svg-small">${EARTH.referenceOceanicCrustKm} km</text>
    ${mechanical ? `<rect x="53" y="${insetY}" width="194" height="${EARTH.referenceLithosphereKm * zoomScale}" fill="none" stroke="${palette.lithosphere}" stroke-width="2" stroke-dasharray="6 3"/><text x="150" y="${insetY + EARTH.referenceLithosphereKm * zoomScale + 18}" text-anchor="middle" class="interior-svg-small">${escape(c.layers.lithosphere.label)}</text>` : ''}
    ${state.interiorDepth <= EARTH.zoomDepthKm ? `<line x1="43" y1="${markerY}" x2="257" y2="${markerY}" stroke="var(--earth-ink)" stroke-width="2"/><circle cx="259" cy="${markerY}" r="4" fill="var(--earth-ink)"/>` : ''}
  </svg>`;
  return `<div class="interior-visual-grid">
    <figure><figcaption>${escape(c.trueScale)}</figcaption>${whole}<p>${escape(c.trueScaleNote)}</p></figure>
    <figure><figcaption>${escape(c.thinZoom)}</figcaption>${inset}<p>${escape(c.zoomNote)}</p>${mechanical ? `<p>${escape(c.lithosphereVariable)}</p>` : ''}${state.interiorDepth > EARTH.zoomDepthKm ? `<p>${escape(c.outOfZoom)}</p>` : ''}</figure>
  </div>`;
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  const rad = (angle - 90) * Math.PI / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

function evidenceDiagram(state: InteriorState, c: Copy): string {
  const cx = 215, cy = 198, r = 154, core = EARTH.coreRadiusKm / EARTH.radiusKm * r;
  const source = polar(cx, cy, r, 0);
  const receiver = polar(cx, cy, r + 8, state.interiorStation);
  const near = polar(cx, cy, r, 60), far = polar(cx, cy, r, 160);
  const obs = waveObservation(state.interiorWave, state.interiorStation);
  const color = state.interiorWave === 'P' ? '#286b99' : '#815494';
  let path = '';
  if (state.interiorStation === 60) {
    path = `<path d="M ${source.join(' ')} Q ${cx + 8} ${cy - 34} ${near.join(' ')}" fill="none" stroke="${color}" stroke-width="4"/>`;
  } else if (state.interiorWave === 'P') {
    // Path shape encodes boundary crossing, not a solved ray or travel time.
    const pFar = `<path d="M ${source.join(' ')} Q ${cx - 50} ${cy - 128} ${cx - 52} ${cy - 67} L ${cx + 24} ${cy + 81} Q ${cx + 90} ${cy + 103} ${far.join(' ')}" fill="none" stroke="${color}" stroke-width="4"/>`;
    path = state.interiorStation === 160 ? pFar : `${pFar}<path d="M ${source.join(' ')} Q ${cx + 8} ${cy - 34} ${near.join(' ')}" fill="none" stroke="${color}" stroke-width="3"/>`;
  } else {
    const stopX = cx + core * .55, stopY = cy - core * .835;
    path = `<path d="M ${source.join(' ')} Q ${cx - 15} ${cy - 115} ${stopX} ${stopY}" fill="none" stroke="${color}" stroke-width="4"/><path d="M ${stopX - 6} ${stopY - 6} l 12 12 m -12 0 l 12 -12" stroke="${color}" stroke-width="3"/>`;
  }
  const shadowAngles: [number, number] = state.interiorWave === 'P' ? [103, 140] : [103, 180];
  const s1 = polar(cx, cy, r + 17, shadowAngles[0]), s2 = polar(cx, cy, r + 17, shadowAngles[1]);
  const waveKey = `${state.interiorWave.toLowerCase()}${state.interiorStation === 60 ? 'Near' : state.interiorStation === 120 ? 'Shadow' : 'Far'}` as 'pNear' | 'pShadow' | 'pFar' | 'sNear' | 'sShadow' | 'sFar';
  return `<div class="interior-evidence-grid">
    <figure><svg viewBox="0 0 430 400" role="img" aria-label="${escape(c[waveKey])}">
      ${globe(cx, cy, r, .72)}
      <path d="M ${s1.join(' ')} A ${r + 17} ${r + 17} 0 0 1 ${s2.join(' ')}" fill="none" stroke="var(--earth-muted)" stroke-width="7" stroke-dasharray="3 4" opacity=".6"/>
      ${path}
      <circle cx="${source[0]}" cy="${source[1]}" r="6" fill="var(--earth-ink)"/>
      <text x="${source[0]}" y="${source[1] - 16}" text-anchor="middle" class="interior-svg-label">${escape(c.earthquake)}</text>
      <circle cx="${receiver[0]}" cy="${receiver[1]}" r="8" fill="var(--earth-paper)" stroke="${obs.arrives ? color : 'var(--earth-ink)'}" stroke-width="3"/>
      ${obs.arrives ? `<circle cx="${receiver[0]}" cy="${receiver[1]}" r="3" fill="${color}"/>` : `<path d="M ${receiver[0] - 4} ${receiver[1] - 4} l8 8 m-8 0 l8 -8" stroke="var(--earth-ink)" stroke-width="1.5"/>`}
      <text x="${receiver[0] + (state.interiorStation === 120 ? 8 : 0)}" y="${receiver[1] + 26}" text-anchor="middle" class="interior-svg-label">${escape(c.receiver)} ${state.interiorStation}°</text>
      <text x="${cx}" y="${cy - 30}" text-anchor="middle" class="interior-svg-label">${escape(c.layers.outerCore.label)}</text>
    </svg><figcaption>${escape(c.pathGuide)}</figcaption></figure>
    <div class="interior-evidence-reading"><p class="interior-eyebrow">${escape(c.observation)}</p><h4>${escape(obs.arrives ? c.waveArrives : c.waveAbsent)}</h4><p>${escape(c[waveKey])}</p><p class="interior-eyebrow">${escape(c.inference)}</p><p>${escape(c.waveInference)}</p></div>
  </div>`;
}

function arrow(x1: number, y1: number, x2: number, y2: number): string {
  const a = Math.atan2(y2 - y1, x2 - x1), size = 8;
  const p1 = [x2 - size * Math.cos(a - .5), y2 - size * Math.sin(a - .5)];
  const p2 = [x2 - size * Math.cos(a + .5), y2 - size * Math.sin(a + .5)];
  return `<g stroke="var(--earth-ink)" fill="var(--earth-ink)"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="2.5"/><path d="M${p1.join(' ')} L${x2} ${y2} L${p2.join(' ')} Z"/></g>`;
}

function plateDiagram(state: InteriorState, c: Copy): string {
  const f = plateFrame(state.interiorBoundary, state.interiorMotion, state.interiorProgress);
  const p = f.effectiveProgress, active = state.interiorMotion === 'moving';
  const isPlan = state.interiorBoundary === 'transform';
  let diagram = '';
  const background = `<rect x="18" y="175" width="644" height="170" rx="8" fill="#cfaa7b" opacity=".45"/><path d="M40 274h95m15 38h105m230-45h135m-270 55h90" stroke="#9c754f" stroke-width="2" opacity=".45"/>`;
  if (state.interiorBoundary === 'divergent') {
    const leftX = 80 + f.leftShift, rightX = 340 + f.rightShift;
    diagram = `${background}
      <rect x="${leftX}" y="125" width="260" height="18" fill="#4e7181"/><rect x="${leftX}" y="143" width="260" height="62" fill="#7b8e8d"/>
      <rect x="${rightX}" y="125" width="260" height="18" fill="#746349"/><rect x="${rightX}" y="143" width="260" height="62" fill="#96917b"/>
      ${f.newCrust ? `<path d="M${340 - f.opening / 2} 125 Q340 ${120 - 8 * p} ${340 + f.opening / 2} 125 L${340 + f.opening / 2} 143 L${340 - f.opening / 2} 143Z" fill="#bd6a47"/><path d="M${340 - f.opening / 2} 143 L${340 + f.opening / 2} 143 L${340 + f.opening / 2} 205 Q340 165 ${340 - f.opening / 2} 205Z" fill="#ba9774"/><text x="340" y="98" text-anchor="middle" class="interior-svg-label">${escape(c.newCrust)}</text>` : ''}
      ${f.mantleMelt ? `<path d="M315 259 Q340 220 365 259 Q340 280 315 259" fill="#d7784c" opacity=".8"/>${arrow(340, 231, 340, 173)}<text x="340" y="294" text-anchor="middle" class="interior-svg-label interior-plate-detail">${escape(c.partialMelt)}</text>` : ''}
      <text x="${leftX + 100}" y="169" class="interior-svg-label">${escape(c.plateA)}</text><text x="${rightX + 95}" y="169" class="interior-svg-label">${escape(c.plateB)}</text>
      ${active ? `${arrow(240, 73, 187, 73)}${arrow(440, 73, 493, 73)}` : ''}`;
  } else if (state.interiorBoundary === 'subduction') {
    const d = f.slabDepth, tipX = 345 + d * .56;
    diagram = `${background}
      <path d="M${45 + f.leftShift} 138 L305 138 L${tipX} ${138 + d} L${tipX - 9} ${193 + d} L290 193 L${45 + f.leftShift} 193Z" fill="#7b8e8d"/>
      <path d="M${45 + f.leftShift} 120 L310 120 L${tipX + 5} ${120 + d} L${tipX} ${138 + d} L305 138 L${45 + f.leftShift} 138Z" fill="#4e7181"/>
      <path d="M340 102 L635 102 L635 133 L340 133 L323 123Z" fill="#a27c51"/><path d="M340 133 L635 133 L635 186 L371 186Z" fill="#96917b"/>
      <text x="140" y="164" class="interior-svg-label">${escape(c.plateA)}</text><text x="485" y="164" class="interior-svg-label">${escape(c.plateB)}</text>
      ${f.mantleMelt ? `<path d="M439 223 Q457 197 480 217 Q464 239 439 223Z" fill="#d7784c"/>${arrow(400, 245, 440, 213)}<text x="410" y="267" text-anchor="middle" class="interior-svg-label">1</text><text x="466" y="257" text-anchor="middle" class="interior-svg-label">2</text><path d="M454 102 L480 69 L507 102Z" fill="#a27c51"/><path d="M480 205L480 111" stroke="#b86849" stroke-width="2" stroke-dasharray="4 4"/>` : ''}
      ${active ? `${arrow(180, 77, 230, 77)}${arrow(545, 62, 495, 62)}` : ''}`;
  } else if (state.interiorBoundary === 'collision') {
    const h = f.crustalThickening;
    diagram = `${background}
      <path d="M${60 + f.leftShift} 137 L270 137 L306 ${137 - h * .45} L340 ${137 - h * .7} L340 ${183 + h * .65} L290 183 L${60 + f.leftShift} 183Z" fill="#4e7181"/>
      <path d="M340 ${137 - h * .7} L371 ${137 - h * .38} L405 137 L${620 + f.rightShift} 137 L${620 + f.rightShift} 183 L392 183 L340 ${183 + h * .65}Z" fill="#a27c51"/>
      <path d="M${60 + f.leftShift} 183 L290 183 L340 ${183 + h * .65} L340 ${238 + h * .65} L${60 + f.leftShift} 238Z" fill="#7b8e8d"/>
      <path d="M340 ${183 + h * .65} L392 183 L${620 + f.rightShift} 183 L${620 + f.rightShift} 238 L340 ${238 + h * .65}Z" fill="#96917b"/>
      <path d="M245 155 Q285 ${155 - h * .5} 325 ${155 + h * .4} M355 ${155 + h * .4} Q395 ${155 - h * .5} 435 155" fill="none" stroke="var(--earth-paper)" stroke-width="2" opacity=".65"/>
      <text x="150" y="165" class="interior-svg-label">${escape(c.plateA)}</text><text x="505" y="165" class="interior-svg-label">${escape(c.plateB)}</text>
      ${p > 0 ? `<text x="340" y="${105 - h * .7}" text-anchor="middle" class="interior-svg-label">${escape(c.mountains)}</text>` : ''}
      ${active ? `${arrow(175, 79, 230, 79)}${arrow(505, 79, 450, 79)}` : ''}`;
  } else {
    const offset = f.alongFaultOffset / 2;
    diagram = `<rect x="72" y="${62 - offset}" width="268" height="230" rx="4" fill="#8aabae"/><rect x="340" y="${62 + offset}" width="268" height="230" rx="4" fill="#bdb18e"/>
      <path d="M340 12V350" stroke="var(--earth-ink)" stroke-width="2" stroke-dasharray="6 4"/>
      <path d="M120 ${177 - offset}H337 M343 ${177 + offset}H560" stroke="var(--earth-paper)" stroke-width="5"/>
      <path d="M120 ${177 - offset}H337 M343 ${177 + offset}H560" stroke="var(--earth-ink)" stroke-width="1.2"/>
      <circle cx="240" cy="${177 - offset}" r="5" fill="var(--earth-ink)"/><circle cx="440" cy="${177 + offset}" r="5" fill="var(--earth-ink)"/>
      <text x="150" y="${118 - offset}" class="interior-svg-label">${escape(c.plateA)}</text><text x="445" y="${118 + offset}" class="interior-svg-label">${escape(c.plateB)}</text>
      <text x="340" y="375" text-anchor="middle" class="interior-svg-label">${escape(c.marker)}</text>
      ${active ? `${arrow(285, 133, 285, 75)}${arrow(395, 218, 395, 276)}` : ''}`;
  }
  return `<figure class="interior-plate-figure"><svg viewBox="0 0 680 390" role="img" aria-label="${escape(c.boundaries[state.interiorBoundary].label + ': ' + (state.interiorMotion === 'still' ? c.stillResult : c.boundaries[state.interiorBoundary].stages[f.stage]))}">${diagram}</svg><figcaption>${escape(isPlan ? c.planLabel : c.sectionLabel)}${!isPlan ? `<br>${escape(c.underPlate)}` : ''}</figcaption>${f.mantleMelt ? `<div class="interior-feature-notes">${state.interiorBoundary === 'subduction' ? `<span>${escape(c.featureFluid)}</span><span>${escape(c.featureMelt)}</span>` : `<span>${escape(c.partialMelt)} · ${escape(c.featureRising)}</span>`}</div>` : ''}</figure>`;
}

export function mountStudy(host: HTMLElement, context: StudyContext): StudyInstance {
  const c: Copy = content[context.language];
  let state = restoreState(context.initialState);
  let disposed = false;
  let threeScene: InteriorScene | undefined;
  let threeLoading = false;
  let threeFailed = false;
  let threeEpoch = 0, riftEpoch = 0, riftLoading = false;
  let riftStudy: ReturnType<typeof mountRiftStudy> | undefined;
  const events = new AbortController();
  const root = document.createElement('div');
  root.className = 'earth-module interior-study';
  const layers = Object.keys(c.layers) as InteriorLayer[];
  const boundaries = Object.keys(c.boundaries) as Boundary[];
  const views = Object.keys(c.views) as InteriorView[];
  root.innerHTML = `<nav class="interior-journey" data-reader-menu="chapters" aria-label="${escape(c.journeyLabel)}">${views.map(v => button(v, c.views[v].tab, 'data-view', state.interiorView)).join('')}</nav>
    <header class="interior-heading"><h3 class="earth-section-title" data-heading></h3><p data-intro></p></header>
    <div class="earth-controls interior-layer-controls" data-controls="layers">
      <label>${escape(c.rendererLabel)}<select data-key="interiorRenderer"><option value="three">${escape(c.threeView)}</option><option value="section">${escape(c.sectionView)}</option></select></label>
      <label>${escape(c.lens)}<select data-key="interiorLens"><option value="composition">${escape(c.composition)}</option><option value="mechanical">${escape(c.mechanical)}</option></select></label>
      <label>${escape(c.layerLabel)}<select data-key="interiorLayer">${layers.map(l => `<option value="${l}">${escape(c.layers[l].label)}</option>`).join('')}</select></label>
      <label class="interior-wide">${escape(c.depth)}<span class="interior-range"><input type="range" min="0" max="${EARTH.radiusKm}" step="1" data-key="interiorDepth"><output data-depth-output></output></span></label>
    </div>
    <div class="earth-controls" data-controls="evidence">
      <label>${escape(c.waveLabel)}<select data-key="interiorWave"><option value="P">${escape(c.pWave)}</option><option value="S">${escape(c.sWave)}</option></select></label>
      <label>${escape(c.station)}<select data-key="interiorStation"><option value="60">60° · ${escape(c.stationNear)}</option><option value="120">120° · ${escape(c.stationShadow)}</option><option value="160">160° · ${escape(c.stationFar)}</option></select></label>
    </div>
    <div class="earth-controls interior-plate-controls" data-controls="plates">
      <label>${escape(c.boundaryLabel)}<select data-key="interiorBoundary">${boundaries.map(b => `<option value="${b}">${escape(c.boundaries[b].label)}</option>`).join('')}</select></label>
      <label>${escape(c.relativeMotion)}<select data-key="interiorMotion"><option value="moving">${escape(c.moving)}</option><option value="still">${escape(c.still)}</option></select></label>
      <label class="interior-wide">${escape(c.progress)}<span class="interior-range"><input type="range" min="0" max="100" step="1" data-key="interiorProgress"><output data-progress-output></output></span><small>${escape(c.progressUnits)}</small></label>
      <div class="interior-progress-buttons"><button type="button" data-action="start">${escape(c.rewind)}</button><button type="button" data-action="back">${escape(c.stepBack)}</button><button type="button" data-action="forward">${escape(c.stepForward)}</button></div>
    </div>
    <div class="earth-stage interior-stage" data-stage>
      <div data-scene="layers"><div data-three-status class="interior-three-status" role="status"></div><button type="button" data-action="retry" hidden>${escape(c.retryThree)}</button><div class="interior-layers-view" data-layers-view><figure class="interior-three-shell" data-three-shell><figcaption>${escape(c.threeTitle)}</figcaption><div data-three-host></div><div class="interior-three-toolbar"><button type="button" data-action="camera">${escape(c.resetCamera)}</button></div><p>${escape(c.threeHint)}</p><p>${escape(c.threeNote)}</p><p><a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">${escape(c.mapCredit)}</a></p></figure><div data-two-section></div></div></div>
      <div data-scene="evidence" hidden></div><div data-scene="plates" hidden></div><div data-scene="rift" hidden></div>
    </div>
    <div class="interior-legend" data-legend></div>
    <div class="earth-readout interior-readout" data-readout aria-live="polite" aria-atomic="true"></div>
    <details class="earth-deeper interior-deeper" data-deeper><summary>${escape(c.deeper)}</summary><div data-explanation></div></details>
    <footer class="earth-note interior-bridge"><p data-bridge></p><button type="button" data-next></button></footer>
    <details class="interior-sources"><summary>${escape(c.sourceTitle)}</summary><p>${escape(c.sourceNote)}</p><ul>${sourceLinks.map(([label, url]) => `<li><a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a></li>`).join('')}</ul></details>`;
  host.append(root);
  root.insertBefore(root.querySelector('[data-stage]')!, root.querySelector('[data-controls]')!);
  const get = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const layersStage = get<HTMLElement>('[data-layers-view]');
  const twoSection = get<HTMLElement>('[data-two-section]');
  const threeHost = get<HTMLElement>('[data-three-host]');
  const threeStatus = get<HTMLElement>('[data-three-status]');
  const readout = get<HTMLElement>('[data-readout]');
  const deeper = get<HTMLDetailsElement>('[data-deeper]');
  deeper.open = state.interiorExplain;
  const explanation = get<HTMLElement>('[data-explanation]');
  const legend = get<HTMLElement>('[data-legend]');
  let renderedExplanation = '';

  function failThree() {
    if (disposed) return;
    threeFailed = true; threeLoading = false;
    threeScene?.dispose(); threeScene = undefined;
    threeStatus.textContent = c.threeUnavailable;
    get<HTMLButtonElement>('[data-action="retry"]').hidden = false;
    render();
  }

  function ensureThree() {
    if (disposed || threeScene || threeLoading || threeFailed) return;
    const own = ++threeEpoch;
    threeLoading = true; threeStatus.textContent = c.threeLoading;
    void import('./scene3d').then(module => {
      if (disposed || own !== threeEpoch || state.interiorView === 'rift') return;
      threeScene = module.mountInteriorScene(threeHost, state, {
        label: c.threeTitle + '. ' + c.threeHint,
        onUnavailable: failThree,
        onCamera: camera => update({ ...state, ...camera }),
      });
      threeLoading = false;
      if (threeFailed || disposed) { threeScene.dispose(); threeScene = undefined; return; }
      threeStatus.textContent = '';
      threeScene.pause(state.interiorView !== 'layers' || state.interiorRenderer !== 'three');
    }).catch(() => { if (own === threeEpoch) failThree(); });
  }

  function ensureRift() {
    if (disposed || riftStudy || riftLoading) return;
    const own = ++riftEpoch; riftLoading = true;
    const target = get<HTMLElement>('[data-scene="rift"]');
    void import('./rift/study').then(module => {
      if (disposed || own !== riftEpoch || state.interiorView !== 'rift') return;
      riftLoading = false;
      riftStudy = module.mountRiftStudy(target, { language: context.language, initialState: state.interiorRift, onStateChange(value) {
        if (disposed || own !== riftEpoch) return;
        state = { ...state, interiorRift: value }; context.onStateChange(serializeState(state));
      } });
    }).catch(error => {
      if (disposed || own !== riftEpoch) return;
      riftLoading = false; target.textContent = c.threeUnavailable;
      const retry = host.ownerDocument.createElement('button'); retry.type = 'button'; retry.textContent = c.retryThree;
      retry.addEventListener('click', () => location.reload(), { signal: events.signal }); target.append(retry);console.error('Rift study failed', error);
    });
  }

  function render() {
    const v = c.views[state.interiorView];
    get<HTMLElement>('[data-heading]').textContent = v.title;
    get<HTMLElement>('[data-intro]').textContent = v.intro;
    get<HTMLElement>('.interior-heading').hidden = state.interiorView === 'rift';
    get<HTMLElement>('[data-bridge]').textContent = v.bridge;
    get<HTMLButtonElement>('[data-next]').textContent = state.interiorView === 'rift' ? c.backToLayers : c.next;
    root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === state.interiorView)));
    root.querySelectorAll<HTMLElement>('[data-controls]').forEach(el => { el.hidden = el.dataset.controls !== state.interiorView; });
    root.querySelectorAll<HTMLElement>('[data-scene]').forEach(el => { el.hidden = el.dataset.scene !== state.interiorView; });
    if (state.interiorView !== 'rift' && (riftStudy || riftLoading)) {
      ++riftEpoch; riftLoading = false; riftStudy?.dispose(); riftStudy = undefined; get('[data-scene="rift"]').replaceChildren();
    }
    if (state.interiorView === 'rift' && (threeScene || threeLoading)) {
      ++threeEpoch; threeLoading = false; threeScene?.dispose(); threeScene = undefined;
    }
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-key]').forEach(el => { el.value = String(state[el.dataset.key as keyof InteriorState]); });
    get<HTMLOutputElement>('[data-depth-output]').textContent = `${fmt(state.interiorDepth)} km`;
    get<HTMLOutputElement>('[data-progress-output]').textContent = `${state.interiorProgress}%`;
    get<HTMLInputElement>('[data-key="interiorDepth"]').setAttribute('aria-valuetext', `${fmt(state.interiorDepth)} km · ${c.layers[compositionAtDepth(state.interiorDepth)].label}`);
    get<HTMLInputElement>('[data-key="interiorProgress"]').setAttribute('aria-valuetext', `${state.interiorProgress}% · ${c.progressUnits}`);
    get<HTMLButtonElement>('[data-action="back"]').disabled = state.interiorProgress === 0;
    get<HTMLButtonElement>('[data-action="forward"]').disabled = state.interiorProgress === 100;
    get<HTMLButtonElement>('[data-action="start"]').disabled = state.interiorProgress === 0;
    let sections: [string, string][] = [];
    if (state.interiorView === 'layers') {
      const useThree = state.interiorRenderer === 'three' && !threeFailed;
      get<HTMLElement>('[data-three-shell]').hidden = !useThree;
      layersStage.classList.toggle('interior-show-three', useThree);
      twoSection.classList.toggle('interior-complement', useThree);
      twoSection.innerHTML = layersDiagram(state, c);
      if (useThree) ensureThree();
      threeStatus.hidden = !threeStatus.textContent;
      const comp = compositionAtDepth(state.interiorDepth);
      const layer = c.layers[state.interiorLayer];
      const mechanical = state.interiorDepth < EARTH.referenceLithosphereKm ? c.mechanicalShallow : comp === 'mantle' ? c.mechanicalDeep : c.coreMechanical;
      readout.innerHTML = `<div><span>${escape(c.depthReadout)}</span><strong>${fmt(state.interiorDepth)} km</strong></div><div><span>${escape(c.compositionReadout)}</span><strong>${escape(c.layers[comp].label)}</strong></div><div class="interior-wide"><span>${escape(c.mechanicalReadout)}</span><strong>${escape(mechanical)}</strong></div><div class="interior-selected-layer"><h4>${escape(layer.label)} · ${escape(layer.state)}</h4><p>${escape(layer.short)}</p></div>`;
      legend.innerHTML = Object.entries(palette).filter(([key]) => key !== 'lithosphere' || state.interiorLens === 'mechanical').map(([key, color]) => `<span><i style="background:${color}"></i>${escape(c.layers[key as InteriorLayer].label)}</span>`).join('');
      sections = [[layer.label, layer.detail], [c.layerMechanismTitle, c.layerMechanism], [c.layerEvidenceTitle, c.layerEvidence]];
    } else if (state.interiorView === 'evidence') {
      get<HTMLElement>('[data-scene="evidence"]').innerHTML = evidenceDiagram(state, c);
      legend.innerHTML = `<span><i style="background:${state.interiorWave === 'P' ? '#286b99' : '#815494'}"></i>${escape(state.interiorWave === 'P' ? c.pWave : c.sWave)}</span><span><i class="interior-shadow-key"></i>${escape(c.stationShadow)}</span>`;
      readout.innerHTML = '';
      sections = [[c.waveMechanismTitle, c.waveMechanism], [c.waveLimitsTitle, c.waveLimits], [c.waveInnerTitle, c.waveInner]];
    } else if (state.interiorView === 'plates') {
      const boundary = c.boundaries[state.interiorBoundary], f = plateFrame(state.interiorBoundary, state.interiorMotion, state.interiorProgress);
      get<HTMLElement>('[data-scene="plates"]').innerHTML = plateDiagram(state, c);
      legend.innerHTML = state.interiorBoundary === 'transform' ? '' : `<span><i style="background:#4e7181"></i>${escape(c.crustBand)} A</span><span><i style="background:#7b8e8d"></i>${escape(c.mantleBand)} A</span><span><i style="background:#a27c51"></i>${escape(c.crustBand)} B</span><span><i style="background:#96917b"></i>${escape(c.mantleBand)} B</span>`;
      readout.innerHTML = `<div class="interior-wide"><span>${escape(c.condition)}</span><strong>${escape(boundary.condition)}</strong></div><div class="interior-wide"><span>${escape(c.result)}</span><strong>${escape(state.interiorMotion === 'still' ? c.stillResult : boundary.stages[f.stage])}</strong></div>`;
      sections = [[boundary.label, boundary.detail], [c.plateDriveTitle, c.plateDrive], [c.plateQuakeTitle, c.plateQuake], [c.plateStillTitle, c.plateStill]];
    } else {
      readout.innerHTML = ''; legend.innerHTML = ''; ensureRift();
    }
    deeper.hidden = state.interiorView === 'rift';
    readout.hidden = !readout.innerHTML;
    legend.hidden = !legend.innerHTML;
    const explanationHTML = sections.map(([title, text]) => `<section><h4>${escape(title)}</h4><p>${escape(text)}</p></section>`).join('');
    if (explanationHTML !== renderedExplanation) { explanation.innerHTML = explanationHTML; renderedExplanation = explanationHTML; }
    threeScene?.update(state);
    threeScene?.pause(state.interiorView !== 'layers' || state.interiorRenderer !== 'three' || threeFailed);
  }

  function update(next: InteriorState) {
    if (disposed || JSON.stringify(next) === JSON.stringify(state)) return;
    state = next;
    render();
    context.onStateChange(serializeState(state));
  }

  root.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!target || !root.contains(target)) return;
    if (target.dataset.view) update({ ...state, interiorView: target.dataset.view as InteriorView });
    if (target.hasAttribute('data-next')) update({ ...state, interiorView: state.interiorView === 'layers' ? 'evidence' : state.interiorView === 'evidence' ? 'plates' : state.interiorView === 'plates' ? 'rift' : 'layers' });
    if (target.dataset.action === 'start') update({ ...state, interiorProgress: 0 });
    if (target.dataset.action === 'back') update({ ...state, interiorProgress: Math.max(0, state.interiorProgress - 25) });
    if (target.dataset.action === 'forward') update({ ...state, interiorProgress: Math.min(100, state.interiorProgress + 25) });
    if (target.dataset.action === 'camera') threeScene?.resetCamera();
    if (target.dataset.action === 'retry') {
      if (state.interiorRenderer === 'section') update({ ...state, interiorRenderer: 'three' });
      location.reload();
    }
  }, { signal: events.signal });

  function acceptControl(event: Event) {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    const key = input.dataset.key;
    if (!key) return;
    if (event.type === 'input' && input.tagName === 'SELECT') return;
    const next = { ...state };
    if (key === 'interiorDepth') {
      next.interiorDepth = Number(input.value);
      next.interiorLayer = next.interiorLens === 'mechanical' && next.interiorDepth < EARTH.referenceLithosphereKm ? 'lithosphere' : compositionAtDepth(next.interiorDepth);
    } else if (key === 'interiorLayer') {
      next.interiorLayer = input.value as InteriorLayer;
      next.interiorDepth = representativeDepth(next.interiorLayer);
      next.interiorLens = next.interiorLayer === 'lithosphere' ? 'mechanical' : 'composition';
    } else if (key === 'interiorLens') {
      next.interiorLens = input.value as InteriorState['interiorLens'];
      next.interiorLayer = next.interiorLens === 'mechanical' && next.interiorDepth < EARTH.referenceLithosphereKm ? 'lithosphere' : compositionAtDepth(next.interiorDepth);
    } else if (key === 'interiorProgress') next.interiorProgress = Number(input.value);
    else if (key === 'interiorStation') next.interiorStation = Number(input.value) as InteriorState['interiorStation'];
    else if (key === 'interiorBoundary') next.interiorBoundary = input.value as Boundary;
    else if (key === 'interiorMotion') next.interiorMotion = input.value as InteriorState['interiorMotion'];
    else if (key === 'interiorWave') next.interiorWave = input.value as InteriorState['interiorWave'];
    else if (key === 'interiorRenderer') next.interiorRenderer = input.value as InteriorState['interiorRenderer'];
    update(next);
  }
  root.addEventListener('input', acceptControl, { signal: events.signal });
  root.addEventListener('change', acceptControl, { signal: events.signal });
  deeper.addEventListener('toggle', () => {
    if (!disposed && state.interiorExplain !== deeper.open) {
      state = { ...state, interiorExplain: deeper.open };
      context.onStateChange(serializeState(state));
    }
  }, { signal: events.signal });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) threeScene?.pause(state.interiorView !== 'layers' || state.interiorRenderer !== 'three');
  }, { signal: events.signal });

  render();
  return {
    pause() { threeScene?.pause(true); riftStudy?.pause(); },
    dispose() { if (disposed) return; disposed = true; ++threeEpoch; ++riftEpoch; events.abort(); threeScene?.dispose(); threeScene = undefined; riftStudy?.dispose(); riftStudy = undefined; root.remove(); },
  };
}
