import content from './content.json';
import './style.css';
import { languageHref } from '../../../src/platform/i18n.ts';
import type { StudyContext, StudyInstance } from '../studyContract.ts';
import type { EarthView } from './earthScene.ts';
import {mountWaterScene} from './waterScene';
import {createFinitePlayback,type FinitePlayback} from '../finitePlayback';
import {
  conditionKeys, observations, parseState, relativeSunlight, serializeState,
  skyFrame, waterFrame, waterPresets, type ConditionKey, type Observation, type WaterPreset,
} from './model.ts';

const escapeText = (value: string | number) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const refs = {
  water: [
    ['NOAA · Thermohaline circulation', 'https://oceanservice.noaa.gov/education/tutorial_currents/05conveyor1.html'],
    ['NOAA · Upwelling', 'https://oceanservice.noaa.gov/facts/upwelling.html'],
    ['JMA/MRI · Equation of State, chapter 4', 'https://www.mri-jma.go.jp/Publish/Technical/DATA/VOL_80/2.pdf'],
    ['IOC/SCOR/IAPSO · TEOS-10', 'https://www.teos-10.org/'],
    ['Vic et al. · Deep-ocean mixing driven by small-scale internal tides', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6506475/'],
  ],
  sky: [
    ['NASA · What Is an Aurora?', 'https://spaceplace.nasa.gov/aurora/en/'],
    ['NASA · Facts About Earth', 'https://science.nasa.gov/earth/facts/'],
    ['ESA · Leaky atmosphere linked to lightweight planet', 'https://www.esa.int/About_Us/ESAC/Leaky_atmosphere_linked_to_lightweight_planet'],
    ['Earth maps · Solar System Scope / INOVE', 'https://www.solarsystemscope.com/textures/'],
    ['Map license · CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'],
  ],
  conditions: [
    ['NASA/JPL · Inverse Square Law', 'https://www.jpl.nasa.gov/edu/resources/lesson-plan/collecting-light-inverse-square-law-demo/'],
    ['NASA · Earth’s Energy Budget', 'https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/'],
    ['ESA · Leaky atmosphere linked to lightweight planet', 'https://www.esa.int/About_Us/ESAC/Leaky_atmosphere_linked_to_lightweight_planet'],
    ['USGS · Earth’s internal heat', 'https://www.usgs.gov/news/volcano-watch-eruptions-help-cool-interior-earth-theres-a-long-way-go'],
    ['NASA · Rotation of a Moonless Earth', 'https://ntrs.nasa.gov/citations/20140011208'],
    ['NASA · The Carbon Cycle', 'https://science.nasa.gov/earth/earth-observatory/the-carbon-cycle/'],
  ],
};

export function mountStudy(host: HTMLElement, context: StudyContext): StudyInstance {
  const c = content[context.language];
  const w = (zh: string, en: string) => context.language === 'en' ? en : zh;
  let state = parseState(context.initialState), disposed = false;
  const legacyObservation=state.observation!=='water';
  let earthView: EarthView | null = null, sceneGeneration = 0;
  let waterView:ReturnType<typeof mountWaterScene>|undefined,waterPlayback:FinitePlayback|undefined;
  const root = host.ownerDocument.createElement('section');
  root.className = 'earth-module systems-study'; root.dataset.readerWorkbench = '';
  const events = new AbortController();
  const el = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const setText = (selector: string, value: string) => { const node = root.querySelector(selector); if (node) node.textContent = value; };
  const emit = () => { if (!disposed) context.onStateChange(serializeState(state)); };
  const clock = () => `${String(Math.floor(state.skyHour % 24)).padStart(2, '0')}:${state.skyHour % 1 ? '30' : '00'}`;
  const range = (key: string, label: string, min: number, max: number, step: number) => {
    const output = `<output data-value="${key}"></output>`, input = `<input type="range" data-control="${key}" min="${min}" max="${max}" step="${step}" aria-label="${escapeText(label)}">`;
    return key === 'waterProgress' ? `<label class="systems-slider" data-reader-scrub><span>${escapeText(label)}</span>${input}${output}</label>` : `<label class="systems-slider"><span>${escapeText(label)} ${output}</span>${input}</label>`;
  };
  const sourceList = (observation: Observation) => `<div class="systems-sources"><p>${escapeText(c.sources)}</p><ul>${refs[observation].map(([label,url]) => `<li><a href="${escapeText(url)}" target="_blank" rel="noopener noreferrer">${escapeText(label)}</a></li>`).join('')}</ul></div>`;
  const svg = (viewBox: string, label: string, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${escapeText(label)}">${body}</svg>`;

  root.innerHTML = `<nav class="systems-observations earth-controls" aria-label="${escapeText(c.title)}" data-reader-controls><label>${escapeText(w('当前观察','Current observation'))}<select data-control="observation">${(legacyObservation?observations:['water'] as Observation[]).map(key => `<option value="${key}">${escapeText(c.navigation[key])}</option>`).join('')}</select></label></nav><div data-observation-body></div><footer class="systems-footer" data-reader-actions><button type="button" data-action="previous">← ${escapeText(c.previous)}</button><button type="button" data-action="next">${escapeText(c.next)} →</button></footer>`;
  host.replaceChildren(root);
  if(legacyObservation){const notice=document.createElement('p');notice.className='earth-note';notice.textContent=w('这是此前保存的天空或宜居观察。相应问题也可以在大气、昼夜与四季等独立专题中继续。','This is a previously saved sky or habitability observation. Continue these questions in their independent atmosphere or day/night studies.');root.prepend(notice);}
  if(!legacyObservation){
    el<HTMLElement>('.systems-observations').hidden=true;
    const footer=el<HTMLElement>('.systems-footer');footer.replaceChildren();
    for(const [id,label] of [['atmosphere',w('继续观察大气与极光','Explore atmosphere and auroras')],['earth-seasons',w('继续观察昼夜与四季','Explore day, night and seasons')],['earth',w('返回地球探索地图','Earth exploration map')]]){
      const a=document.createElement('a');a.href=location.pathname.replace(/\/topics\/[^/]+\/$/,`/topics/${id}/`)+`?lang=${context.language}`;a.textContent=label+' →';footer.append(a);
    }
  }


  function updateInputs() {
    for (const input of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-control]')) {
      const key = input.dataset.control as keyof typeof state;
      const value = state[key];
      if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = value as boolean;
      else input.value = String(value);
    }
  }

  function waterMarkup() {
    const t = c.water;
    return `<header class="systems-heading" data-reader-prose><h3 class="earth-section-title">${escapeText(t.question)}</h3></header>
      <div class="systems-water-workspace" data-earth-presentation><div class="earth-stage systems-water-stage" data-water-stage data-reader-stage data-earth-visual data-reader-fit="available"></div>
        <div class="earth-controls systems-progress" data-reader-transport data-earth-transport><div data-reader-actions><button type="button" data-action="water-play" aria-pressed="false">${escapeText(t.play)}</button><button type="button" data-action="water-start">${escapeText(t.start)}</button><button type="button" data-action="water-finish">${escapeText(t.finish)}</button></div>${range('waterProgress',t.progress,0,1,.01)}</div>
        <div class="systems-water-result earth-readout" data-water-result role="status" aria-live="polite" data-reader-readout></div>
        <div class="systems-water-controls" data-reader-controls><div class="earth-controls">${range('waterTemp',t.temperature,5,25,1)}${range('waterSalt',t.salinity,30,38,.5)}</div><p class="systems-reference" data-reader-caption>${escapeText(t.reference)}</p></div>
      </div><p class="systems-introduction" data-reader-prose>${escapeText(t.hint)}</p>
      <details class="systems-comparison earth-deeper" data-reader-prose><summary>${escapeText(t.comparisonDetails)}</summary>
        <fieldset class="systems-presets"><legend>${escapeText(t.presets)}</legend><div class="earth-controls">${Object.keys(waterPresets).map(key => `<button type="button" data-preset="${key}" aria-pressed="false">${escapeText(t[key as WaterPreset])}</button>`).join('')}</div></fieldset>
        <div class="systems-density-readout" data-reader-readout><span>${escapeText(t.density)}</span><strong data-density-a></strong><strong data-density-b></strong><span>${escapeText(t.difference)} <output data-density-difference></output></span></div><p class="earth-note">${escapeText(t.saltNote)}</p></details>
      <p class="earth-note systems-section-note" data-reader-caption>${escapeText(t.sectionNote)}</p><p class="earth-note">${escapeText(t.progressNote)}</p>
      <details class="systems-global earth-deeper"><summary>${escapeText(t.globalTitle)}</summary><p>${escapeText(t.globalIntro)}</p><div class="earth-stage systems-global-stage" data-reader-stage>${globalOcean()}</div><ol class="systems-global-legend" data-reader-legend><li><span class="systems-key systems-surface-key"></span>${escapeText(t.surface)}</li><li><span class="systems-key systems-deep-key"></span>${escapeText(t.deep)}</li><li><span class="systems-key systems-return-key"></span>${escapeText(t.return)}</li></ol><p class="earth-note">${escapeText(t.globalNote)}</p></details>
      <details class="earth-deeper"><summary>${escapeText(c.more)}</summary><h4>${escapeText(t.deepTitle)}</h4><p>${escapeText(t.deepText)}</p><p>${escapeText(t.model)}</p>${sourceList('water')}</details><p class="systems-bridge">${escapeText(t.bridge)}</p>`;
  }

  function globalOcean() {
    const t = c.water;
    return svg('0 0 720 330', t.globalDiagram, `<rect class="systems-ocean-bg" x="28" y="28" width="664" height="242" rx="38"/>
      <g class="systems-basin-label"><text x="150" y="60">${escapeText(t.atlantic)}</text><text x="355" y="60">${escapeText(t.indian)}</text><text x="565" y="60">${escapeText(t.pacific)}</text></g>
      <path class="systems-basin-divider" d="M250 75V205M460 75V205"/>
      <g class="systems-surface-line"><path d="M70 118C70 78 218 80 218 120S70 158 70 118M278 118C278 78 430 80 430 120S278 158 278 118M488 118C488 78 650 80 650 120S488 158 488 118"/><path d="m212 104 6 16-17-2m223-14 6 16-17-2m231-14 6 16-17-2"/></g>
      <g class="systems-deep-line"><path d="M100 160V220C100 250 290 250 355 223S554 209 632 230M190 162V208C190 230 250 220 280 210M355 223C385 257 480 260 555 242M605 170C620 208 590 223 555 242"/><path d="M92 198 100 216 108 198M342 216 355 223 345 233M619 221 632 230 615 236M565 228 555 242 572 240"/></g>
      <g class="systems-return-line"><path d="M322 206C300 175 320 159 330 145M540 214C510 180 526 157 535 145M668 237C690 194 684 171 670 152"/><path d="M317 150 330 145 333 159M522 150 535 145 538 159M661 159 670 152 679 164"/></g>
      <text class="systems-southern-label" x="360" y="302">${escapeText(t.southern)}</text>`);
  }

  function updateWater() {
    const f = waterFrame(state), t = c.water;
    waterView?.update(f);
    setText('[data-water-result]',t[f.tendency]);
    setText('[data-density-a]',`A · ${f.densityA.toFixed(1)} kg/m³`);
    setText('[data-density-b]',`B · ${f.densityB.toFixed(1)} kg/m³`);
    setText('[data-density-difference]',`${f.delta > .05 ? '+' : ''}${f.delta.toFixed(1)} kg/m³`);
    setText('[data-value="waterTemp"]',`${state.waterTemp}°C`);
    setText('[data-value="waterSalt"]',`${state.waterSalt.toFixed(1)}`);
    setText('[data-value="waterProgress"]',`${Math.round(state.waterProgress*100)}%`);
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-preset]')) {
      const p = waterPresets[button.dataset.preset as WaterPreset];
      button.setAttribute('aria-pressed',String(state.waterTemp === p.waterTemp && state.waterSalt === p.waterSalt));
    }
    updateInputs();
  }

  function skyMarkup() {
    const t = c.sky;
    return `<header class="systems-heading" data-reader-prose><h3 class="earth-section-title">${escapeText(t.question)}</h3></header>
      <div class="systems-sky-grid"><figure><figcaption>${escapeText(t.daynightTitle)}</figcaption><div class="earth-stage systems-earth-three" data-earth-three></div><p class="earth-note" data-three-status role="status">${escapeText(w('正在准备地球图像…','Preparing the Earth view…'))}</p><button type="button" data-action="three-retry" hidden>${escapeText(w('重试三维图','Retry the 3D view'))}</button><div class="earth-controls">${range('skyHour',t.hour,0,24,.5)}</div><div class="systems-clock-stops">${[0,6,12,18].map((hour,i) => `<button type="button" data-hour="${hour}">${escapeText([t.zero,t.six,t.twelve,t.eighteen][i])}</button>`).join('')}</div><p class="earth-readout" data-daynight-result role="status" aria-live="polite"></p><p class="earth-note">${escapeText(w('EQ-A 是固定赤道站点；此处使用太阳时，不是当地民用时钟。','EQ-A is a fixed equatorial site. This is solar time, not a local civil clock.'))}</p><div class="systems-earth-camera"><p class="earth-note">${escapeText(w('拖动改变观察方向，双指／滚轮缩放；键盘方向键旋转，± 缩放，Home 还原视角。相机移动不会改变太阳时。','Drag to orbit; pinch or scroll to zoom. Arrow keys rotate, ± zoom, and Home resets the view. Moving the camera does not change solar time.'))}</p><button type="button" data-action="camera-reset">${escapeText(w('还原视角','Reset view'))}</button></div><details class="systems-polar-view" data-polar-view><summary>${escapeText(w('从北极上空核对昼夜（也可作为二维视图）','Check day and night from the North Pole · 2D view'))}</summary><div class="earth-stage systems-sky-stage" data-daynight-stage></div><p class="earth-note">${escapeText(t.timeNote)}</p></details></figure>
      <figure><figcaption>${escapeText(t.spaceTitle)}</figcaption><div class="earth-stage systems-space-stage" data-space-stage></div><p class="earth-note">${escapeText(t.scale)}</p><fieldset class="systems-layer-controls"><legend>${escapeText(t.layers)}</legend><div>${(['skyWind','skyField','skyAurora'] as const).map((key,i) => `<label><input type="checkbox" data-control="${key}"><span class="systems-layer-dot systems-layer-${i}"></span>${escapeText([t.wind,t.field,t.aurora][i])}</label>`).join('')}</div></fieldset><p class="earth-note">${escapeText(t.layerNote)}</p></figure></div>
      <p class="earth-note">${escapeText(w('三维图采用赤道直射日照的情景；轴在画面中竖直只是坐标选择，没有把真实地轴倾角改成零。静态地表与云纹理：Solar System Scope / INOVE，CC BY 4.0；不代表今天的云。站点与大气边缘为辨认而增强，层厚不可测量。','The 3D case has equatorial sunlight. A vertical axis is a coordinate choice, not a claim of zero real obliquity. Static Earth and cloud maps: Solar System Scope / INOVE, CC BY 4.0; not today’s clouds. The site marker and atmospheric rim are enhanced for visibility, not measurable layer thicknesses.'))}</p>
      <p>${escapeText(t.explain)}</p><p class="earth-readout">${escapeText(t.dayAurora)}</p>
      <details class="earth-deeper"><summary>${escapeText(c.more)}</summary><h4>${escapeText(t.deepTitle)}</h4><p>${escapeText(t.deepText)}</p>${sourceList('sky')}</details><p class="systems-bridge">${escapeText(t.bridge)}</p>`;
  }

  function updateSky() {
    const f = skyFrame(state.skyHour), t = c.sky;
    const cx = 280, cy = 202, r = 126;
    const siteX = cx + f.x*r, siteY = cy + f.y*r;
    el('[data-daynight-stage]').innerHTML = svg('0 0 540 440',t.daynightDiagram, `<circle class="systems-sun" cx="34" cy="202" r="24"/><g class="systems-light-rays"><path d="M70 155H138M70 202H138M70 249H138"/><path d="m128 148 10 7-10 7m0 33 10 7-10 7m0 33 10 7-10 7"/></g><text class="systems-svg-label" x="60" y="285">${escapeText(t.sunlight)}</text>
      <circle class="systems-day-globe" cx="${cx}" cy="${cy}" r="${r}"/><path class="systems-night-hemisphere" d="M280 76A126 126 0 0 1 280 328Z"/>
      <g class="systems-graticule" transform="rotate(${f.rotationDegrees} 280 202)"><circle cx="280" cy="202" r="82"/><circle cx="280" cy="202" r="40"/><path d="M154 202H406M280 76V328M191 113 369 291M191 291 369 113"/></g>
      <path class="systems-terminator" d="M280 76V328"/><circle class="systems-north" cx="280" cy="202" r="7"/><path class="systems-rotation" d="M205 58C230 43 268 41 295 46m-13-9 13 9-15 6"/>
      <circle class="systems-site-halo" cx="${siteX.toFixed(2)}" cy="${siteY.toFixed(2)}" r="13"/><circle class="systems-site-dot" cx="${siteX.toFixed(2)}" cy="${siteY.toFixed(2)}" r="6"/><text class="systems-site-label" x="${siteX.toFixed(2)}" y="${(siteY+31).toFixed(2)}">EQ-A</text>
      <text class="systems-svg-label" x="280" y="388">${escapeText(t.site)}</text><text class="systems-small-svg-label" x="280" y="420">${escapeText(t.north)}</text>`);
    const wind = `<g class="systems-solar-wind"><path d="M25 65H145Q170 65 198 48M25 120H133Q155 120 160 100M25 172H145M25 224H133Q155 224 160 245M25 278H145Q170 278 198 295"/><path d="m129 164 16 8-16 8m-10-62 14 2-8 13m-6 97 14-6-5-13"/>${[55,85,115].map(x => `<circle cx="${x}" cy="172" r="4"/>`).join('')}</g>`;
    const field = `<g class="systems-magnetic-lines"><path d="M254 119C215 67 198 72 181 91C138 139 141 204 176 245C195 268 229 267 254 223M266 119C296 73 390 64 548 58M266 223C296 269 390 278 548 284M253 124C207 112 201 141 201 172S207 231 253 218M267 124C328 87 446 93 554 112M267 218C328 256 446 249 554 231"/><path d="M257 115C222 12 160 38 143 92C123 160 124 211 148 259C178 323 236 315 257 227M267 115C312 31 434 21 568 28M267 227C312 311 434 321 568 314"/></g>`;
    const aurora = `<g class="systems-aurora"><path d="M237 135Q260 119 283 135M237 209Q260 225 283 209"/><path class="systems-incoming-particles" d="M231 81Q249 93 247 127M289 81Q271 93 273 127M231 263Q249 251 247 217M289 263Q271 251 273 217"/><path d="m241 116 6 11 6-11m14 0 6 11 6-11m-38 112 6-11 6 11m14 0 6-11 6 11"/></g>`;
    el('[data-space-stage]').innerHTML = svg('0 0 600 345',t.spaceDiagram, `<path class="systems-magnetopause" d="M575 29C350 24 187 7 148 97C126 149 127 207 148 257C188 340 350 325 575 315"/>
      ${state.skyWind ? wind : ''}${state.skyField ? field : ''}<circle class="systems-space-earth" cx="260" cy="172" r="49"/><path class="systems-space-night" d="M260 123A49 49 0 0 1 260 221Z"/><circle class="systems-atmosphere" cx="260" cy="172" r="54"/>${state.skyAurora ? aurora : ''}`);
    // The magnetopause belongs to the field explanation, not to illumination.
    const boundary = root.querySelector<SVGPathElement>('.systems-magnetopause');
    if (boundary) boundary.style.opacity = state.skyField ? '.65' : '0';
    setText('[data-value="skyHour"]',clock());
    setText('[data-daynight-result]',`${clock()} · ${t[f.phase]}`);
    earthView?.update(state);
    updateInputs();
  }

  function disposeEarth() {
    sceneGeneration++; earthView?.dispose(); earthView=null;
  }

  function prepareEarth() {
    const generation=++sceneGeneration;
    const valid=()=>!disposed && generation===sceneGeneration && state.observation==='sky';
    const unavailable=()=>{
      if(!valid())return;
      earthView?.dispose();earthView=null;
      el<HTMLElement>('[data-earth-three]').hidden=true;
      el<HTMLElement>('.systems-earth-camera').hidden=true;
      el<HTMLDetailsElement>('[data-polar-view]').open=true;
      setText('[data-three-status]',w('三维图暂不可用；下方二维视图保留同一时刻、站点和全部操作。','The 3D view is unavailable. The 2D view below keeps the same time, site and controls.'));
      el<HTMLButtonElement>('[data-action="camera-reset"]').disabled=true;
      el<HTMLButtonElement>('[data-action="three-retry"]').hidden=false;
    };
    void import('./earthScene.ts').then(module=>{
      if(!valid())return;
      try {
        earthView=module.mountEarthView(el<HTMLElement>('[data-earth-three]'),state,{
          label:w('地球三维昼夜；拖动旋转相机，方向键旋转，±缩放，Home还原。','3D Earth day and night. Drag or use arrow keys to orbit, ± to zoom, Home to reset.'),
          onCamera:camera=>{if(valid()){state={...state,...camera};emit();}},
          onReady:()=>{if(valid())setText('[data-three-status]',w('金色标记是同一个赤道站点 EQ-A；背面不可见时可以旋转相机寻找。','The gold marker is the same equatorial site, EQ-A. Orbit the camera to find it when it is on the far side.'));},
          onUnavailable:unavailable,
        });
      } catch { unavailable(); }
    }).catch(unavailable);
  }

  function conditionsMarkup() {
    const t = c.conditions;
    return `<header class="systems-heading" data-reader-prose><h3 class="earth-section-title">${escapeText(t.question)}</h3></header><p class="systems-thread">${escapeText(t.thread)}</p>
      <label class="systems-condition-select">${escapeText(t.choose)}<select data-control="condition">${conditionKeys.map(key => `<option value="${key}">${escapeText(t[key].name)}</option>`).join('')}</select></label><div data-condition-body></div>
      <p class="systems-closing">${escapeText(t.closing)}</p>${cycleMarkup()}<details class="earth-deeper"><summary>${escapeText(c.sources)}</summary>${sourceList('conditions')}</details>`;
  }

  function renderCondition() {
    const t = c.conditions, a = t[state.condition];
    const current = `${c.water.a}: ${state.waterTemp}°C / SP ${state.waterSalt}; EQ-A ${clock()}`;
    el('[data-condition-body]').innerHTML = `<h4 class="systems-what-if">${escapeText(a.ask)}</h4><ol class="systems-cause-chain">${a.chain.map(text => `<li>${escapeText(text)}</li>`).join('')}</ol>
      ${state.condition === 'orbit' ? `<div class="earth-stage systems-orbit-stage" data-orbit-stage></div><div class="earth-controls">${range('orbitDistance',t.distance,.9,1.1,.01)}</div><div class="earth-controls systems-orbit-presets"><button type="button" data-distance="0.95">${escapeText(t.closer)}</button><button type="button" data-distance="1">${escapeText(t.reset)}</button><button type="button" data-distance="1.05">${escapeText(t.farther)}</button></div><p class="earth-readout"><strong data-irradiance></strong><br>${escapeText(t.irradiance)}</p><p class="earth-note">${escapeText(t.formula)}</p>` : ''}
      <div class="systems-inference"><section><h5>${escapeText(t.robust)}</h5><p>${escapeText(a.robust)}</p></section><section><h5>${escapeText(t.unknown)}</h5><p>${escapeText(a.unknown)}</p></section></div><details class="earth-deeper" open><summary>${escapeText(t.evidence)}</summary><p>${escapeText(a.evidence)}</p></details><aside class="systems-connection"><strong>${escapeText(t.connection)}</strong><p>${escapeText(a.connection)}</p><p class="earth-note">${escapeText(current)}</p><div class="earth-controls"><button type="button" data-observation="water">${escapeText(c.navigation.water)}</button><button type="button" data-observation="sky">${escapeText(c.navigation.sky)}</button></div></aside>`;
    if (state.condition === 'orbit') updateOrbit();
    updateInputs();
  }

  function updateOrbit() {
    const t = c.conditions, ratio = relativeSunlight(state.orbitDistance);
    const baselineHeight = 120, changedHeight = baselineHeight*ratio;
    el('[data-orbit-stage]').innerHTML = svg('0 0 600 275',t.diagram, `<path class="systems-chart-axis" d="M90 38V217H548"/><path class="systems-chart-reference" d="M90 97H548"/><text class="systems-small-svg-label" x="61" y="105">1</text><text class="systems-small-svg-label" x="61" y="222">0</text>
      <rect class="systems-reference-bar" x="170" y="97" width="92" height="${baselineHeight}" rx="3"/><rect class="systems-changed-bar" x="360" y="${(217-changedHeight).toFixed(2)}" width="92" height="${changedHeight.toFixed(2)}" rx="3"/><text class="systems-bar-number" x="216" y="81">1.000 ×</text><text class="systems-bar-number" x="406" y="${(201-changedHeight).toFixed(2)}">${ratio.toFixed(3)} ×</text><text class="systems-chart-label" x="216" y="251">${escapeText(t.baseline)}</text><text class="systems-chart-label" x="406" y="251">${escapeText(t.changed)}</text>`);
    setText('[data-value="orbitDistance"]',`${state.orbitDistance.toFixed(2)} AU`);
    setText('[data-irradiance]',`${(ratio*100).toFixed(1)}% · ${ratio.toFixed(3)} ×`);
    updateInputs();
  }

  function cycleMarkup() {
    const locale = context.language === 'en' ? 'en' : 'zh-CN';
    const climateLink = languageHref('/topics/earth-climate/',locale);
    const rocksLink = languageHref('/topics/earth-minerals/',locale);
    return `<details class="earth-deeper systems-cycles"><summary>${escapeText(w('再深入：海洋、大气、岩石与生命怎样接在一起？','Explore how oceans, air, rocks and life connect'))}</summary>
      <p>${escapeText(w('先分清两件事：太阳能进入地球系统，最后多以热辐射离开；碳、水和营养元素则在不同储库间转移。能量的流动与物质的循环不能混成同一条传送带。','Separate energy from matter: sunlight enters Earth’s system and energy eventually leaves mainly as thermal radiation. Carbon, water and nutrients move among reservoirs. Energy flow and material cycling are different.'))}</p>
      <ol class="systems-cycle-thread"><li><strong>${escapeText(w('海洋 ↔ 大气','Ocean ↔ atmosphere'))}</strong><p>${escapeText(w('海面交换热量、水汽和二氧化碳；海流重分配热量和物质。海水能储存大量热量，但不会把太阳能永远留住。','The sea surface exchanges heat, water vapor and carbon dioxide with air. Currents redistribute heat and material. Water can store much heat, but does not retain solar energy forever.'))}</p></li>
      <li><strong>${escapeText(w('海洋 ↔ 生命','Ocean ↔ life'))}</strong><p>${escapeText(w('上升流能把深处的营养带向受光表层。浮游植物利用光合作用固定碳；呼吸和分解又使部分碳返回水中。下沉的有机物只有一部分进入较长时间的储存。','Upwelling can deliver deep nutrients to the sunlit surface. Phytoplankton fix carbon through photosynthesis; respiration and decomposition return some carbon to water. Only a fraction of sinking organic matter enters longer-term storage.'))}</p></li>
      <li><strong>${escapeText(w('海洋、大气 ↔ 岩石','Oceans and air ↔ rocks'))}</strong><p>${escapeText(w('风化把岩石中的元素送入水系；沉积能把碳储存在海底与岩石中。构造活动与火山又参与长期交换。这些路径可跨越数千年至上亿年，不能当成对今天排放的即时抵消。','Weathering transfers elements from rocks into water. Sediments can store carbon on the seafloor and in rocks; tectonics and volcanism participate in long-term exchanges. These paths can span thousands to hundreds of millions of years and cannot instantly cancel present-day emissions.'))}</p></li></ol>
      <p>${escapeText(w('温度、盐度、氧、养分与酸碱度会一起影响海洋生命。这里的 A/B 分层试验只计算密度，没有模拟生态系统或碳循环的快慢。','Temperature, salinity, oxygen, nutrients and acidity together affect marine life. The A/B experiment calculates density only, without predicting ecosystems or carbon-cycle rates.'))}</p><p class="systems-related"><a href="${escapeText(climateLink)}">${escapeText(w('去气候与冰期馆追踪反馈 →','Trace feedbacks in the climate and ice ages gallery →'))}</a><a href="${escapeText(rocksLink)}">${escapeText(w('去矿物与岩石馆观察物质 →','Explore materials in the minerals and rocks gallery →'))}</a></p></details>`;
  }

  function renderObservation() {
    waterPlayback?.dispose();waterPlayback=undefined;waterView=undefined;
    disposeEarth();
    el('[data-observation-body]').innerHTML = state.observation === 'water' ? waterMarkup() : state.observation === 'sky' ? skyMarkup() : conditionsMarkup();
    for (const button of root.querySelectorAll<HTMLButtonElement>('.systems-observations [data-observation]')) button.setAttribute('aria-pressed',String(button.dataset.observation === state.observation));
    if(legacyObservation)el<HTMLButtonElement>('[data-action="previous"]').hidden = state.observation === 'water';
    if(legacyObservation)el<HTMLButtonElement>('[data-action="next"]').hidden = state.observation === 'conditions';
    if (state.observation === 'water') {
      waterView=mountWaterScene(el<HTMLElement>('[data-water-stage]'),c.water);updateWater();
      waterPlayback=createFinitePlayback({element:el<HTMLElement>('.systems-water-workspace'),id:'water-density-order',durationMs:7000,frameIntervalMs:100,reducedMotionSteps:10,visibilityTarget:el('[data-water-stage]'),
        readProgress:()=>state.waterProgress,
        writeProgress:fraction=>{state={...state,waterProgress:Math.round(fraction*100)/100};updateWater();emit();},
        onPlayingChange:playing=>{const button=el<HTMLButtonElement>('[data-action="water-play"]');button.textContent=playing?c.water.pause:c.water.play;button.setAttribute('aria-pressed',String(playing));el('[data-water-result]').setAttribute('aria-live',playing?'off':'polite');},
      });
    }
    else if (state.observation === 'sky') { updateSky();prepareEarth(); }
    else renderCondition();
  }

  function selectObservation(observation: Observation) {
    if(!legacyObservation&&observation!=='water'){location.assign(location.pathname.replace(/\/topics\/[^/]+\/$/,`/topics/${observation==='sky'?'atmosphere':'earth'}/`)+`?lang=${context.language}`);return;}
    if (state.observation === observation) return;
    state = { ...state, observation };
    renderObservation(); emit();
  }

  root.addEventListener('input', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'range') return;
    const key = input.dataset.control;
    if (!key) return;
    if(state.observation==='water')waterPlayback?.pause();
    state = parseState({ ...serializeState(state), [key]: input.value });
    if (state.observation === 'water') {updateWater();waterPlayback?.sync();}
    else if (state.observation === 'sky') updateSky();
    else if (state.condition === 'orbit') updateOrbit();
    emit();
  },{signal:events.signal});

  root.addEventListener('change', event => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.type === 'checkbox') {
      const key = input.dataset.control;
      if (key) { state = parseState({...serializeState(state),[key]:input.checked ? '1' : '0'}); updateSky(); emit(); }
    } else if (input instanceof HTMLSelectElement && input.dataset.control === 'condition' && conditionKeys.includes(input.value as ConditionKey)) {
      state = {...state,condition:input.value as ConditionKey}; renderCondition(); emit();
    } else if (input instanceof HTMLSelectElement && input.dataset.control === 'observation' && observations.includes(input.value as Observation)) {
      selectObservation(input.value as Observation);
    }
  },{signal:events.signal});

  root.addEventListener('click',event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('button');
    if (!button || !root.contains(button)) return;
    const observation = button.dataset.observation;
    if (observation && observations.includes(observation as Observation)) selectObservation(observation as Observation);
    else if (button.dataset.action === 'camera-reset') earthView?.resetCamera();
    else if (button.dataset.action === 'three-retry') {
      location.reload();
    }
    else if (button.dataset.preset && button.dataset.preset in waterPresets) {
      waterPlayback?.pause();state = {...state,...waterPresets[button.dataset.preset as WaterPreset]}; updateWater();waterPlayback?.sync(); emit();
    } else if (button.dataset.hour !== undefined) {
      state = parseState({...serializeState(state),skyHour:button.dataset.hour}); updateSky(); emit();
    } else if (button.dataset.distance !== undefined) {
      state = parseState({...serializeState(state),orbitDistance:button.dataset.distance}); updateOrbit(); emit();
    } else if(button.dataset.action==='water-play'){waterPlayback?.toggle();
    } else if (button.dataset.action === 'water-start' || button.dataset.action === 'water-finish') {
      waterPlayback?.setProgress(button.dataset.action==='water-start'?0:1);
    } else if (button.dataset.action === 'next' || button.dataset.action === 'previous') {
      const index = observations.indexOf(state.observation) + (button.dataset.action === 'next' ? 1 : -1);
      if (observations[index]) selectObservation(observations[index]);
    }
  },{signal:events.signal});

  renderObservation();
  emit();
  return {
    // No scientific clock or ambient animation runs automatically.
    pause() { waterPlayback?.pause();earthView?.pause(); },
    dispose() { if (disposed) return; disposed = true; waterPlayback?.dispose();waterView=undefined;disposeEarth(); events.abort(); root.remove(); },
  };
}
