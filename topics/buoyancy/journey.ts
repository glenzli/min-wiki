import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { DEFAULT_JOURNEY, CHAPTER_DURATION, sampleJourney, type JourneyChapter, type JourneyObject, type JourneyFrame } from './journeyModel.ts';
import { CHAPTERS, chapterName, objectName, moments, journeyCopy } from './journeyContent.ts';
import { JourneyPlayback } from './journeyPlayback.ts';
import { ShoreScene } from './shoreScene.ts';
import { drawJourneyExplanation } from './journeyExplanation.ts';
import './journey.css';

translateDocument(t);
mountPresentationFrame({ root: '.journey-lab', visual: '.journey-stage', transport: '#journey-transport', choices: '.journey-stations' });
const el = (id: string) => document.getElementById(id)!;
const button = (id: string) => el(id) as HTMLButtonElement;
const slider = el('journey-progress') as HTMLInputElement;
const svg = el('journey-diagram') as unknown as SVGSVGElement;
const stage = document.querySelector<HTMLElement>('.journey-stage')!;
const abort = new AbortController();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = { ...DEFAULT_JOURNEY, progress: 1 };
const remembered: Record<JourneyChapter, number> = { shore: 1, water: 0, pressure: 0, metal: 0 };
let physicalWaterProgress = 0;
let visitedWater = false;
let frame: JourneyFrame = sampleJourney(state);
let camera: 'oblique' | 'front' | 'top' = 'oblique';
let scene: ShoreScene | undefined;
let disposed = false;

function text(id: string, value: string) {
  const node = el(id); if (node.textContent !== value) node.textContent = value;
}
function diagram() {
  if (disposed) return;
  drawJourneyExplanation(svg, frame, {
    width: stage.clientWidth, height: stage.clientHeight,
    project: scene?.available ? point => scene!.project(point) : undefined,
    fallback: !scene?.available,
    motionPhase: state.chapter === 'pressure' ? remembered.pressure : frame.settings.progress,
  });
}
const player = new JourneyPlayback((progress, playing) => {
  remembered[state.chapter] = progress;
  if (state.chapter === 'water') physicalWaterProgress = progress;
  state.progress = state.chapter === 'pressure' ? physicalWaterProgress : progress;
  frame = sampleJourney(state);
  scene?.update(frame);
  diagram();
  const copy = journeyCopy(frame), micro = state.chapter === 'pressure' && state.lens === 'micro';
  text('journey-title', copy.title); text('journey-story', copy.body); text('journey-hint', copy.hint);
  el('metal-mass').hidden = state.chapter !== 'metal';
  el('journey-objects').hidden = state.chapter === 'metal';
  el('journey-lenses').hidden = state.chapter !== 'pressure';
  const microButton = document.querySelector<HTMLButtonElement>('[data-lens=micro]')!;
  microButton.disabled = state.chapter === 'pressure' && frame.comparison < 1;
  el('journey-viewbar').hidden = micro;
  el('journey-cargo').hidden = !(state.chapter === 'metal' && progress >= .84 || state.object === 'boat' && state.chapter !== 'metal');
  el('journey-balance').hidden = state.chapter !== 'water';
  el('journey-playback').hidden = state.chapter === 'pressure' && !micro;
  text('journey-play', playing ? t('暂停') : reduced.matches ? t('看下一步') : progress >= 1 ? t('再看一次') : micro ? t('看分子活动') : t('播放过程'));
  button('journey-play').setAttribute('aria-pressed', String(playing));
  text('journey-motion-note', reduced.matches ? t('简化动态 · 可逐步查看') : micro ? t('暂停只是暂停这段观察') : t('过程可暂停、回看'));
  slider.value = String(Math.round(progress * 1000));
  slider.setAttribute('aria-valuetext', t('过程 {{percent}}%', { percent: Math.round(progress * 100) }));
  text('journey-cargo-count', t('货物 {{count}} 块', { count: state.cargo }));
  button('journey-less').disabled = state.cargo === 0;
  button('journey-more').disabled = state.cargo === 8;
  const waterMass = frame.hydro.displacedMassG;
  const contentsMass = waterMass + (frame.hydro.massG - waterMass) * frame.comparison;
  const maxMass = Math.max(waterMass, frame.hydro.massG, 1);
  text('water-mass', t('{{mass}} 克', { mass: Number(waterMass.toFixed(1)) }));
  text('object-mass', t('{{mass}} 克', { mass: Number(contentsMass.toFixed(1)) }));
  text('object-mass-label', frame.comparison === 0 ? t('这份水') : objectName(state.object));
  el('water-mass-bar').style.width = `${waterMass / maxMass * 100}%`;
  el('object-mass-bar').style.width = `${contentsMass / maxMass * 100}%`;
  text('read-mass', `${frame.hydro.massG.toFixed(1)} g`);
  text('read-displaced', `${frame.hydro.displacedMl.toFixed(1)} mL`);
  text('read-buoyancy', `${frame.forces.buoyancy.toFixed(2)} N`);
  text('read-weight', `${frame.forces.weight.toFixed(2)} N`);
  svg.dataset.chapter = state.chapter; svg.dataset.beat = frame.beat; svg.dataset.object = state.object;
  svg.dataset.mass = String(frame.hydro.massG); svg.dataset.displaced = String(frame.hydro.displacedMl);
  svg.dataset.form = String(frame.body.form); svg.dataset.bottom = String(frame.body.bottom);
  svg.dataset.flooded = String(frame.hydro.flooded); svg.dataset.playing = String(playing);
  svg.dataset.available = String(Boolean(scene?.available)); svg.dataset.cargo = String(state.cargo);
  document.querySelectorAll<HTMLButtonElement>('[data-moment]').forEach(node => {
    const p = Number(node.dataset.moment); node.classList.toggle('passed', progress + .001 >= p);
  });
});

function choices() {
  document.querySelectorAll<HTMLButtonElement>('[data-journey]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.journey === state.chapter)));
  document.querySelectorAll<HTMLButtonElement>('[data-specimen]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.specimen === state.object)));
  document.querySelectorAll<HTMLButtonElement>('[data-lens]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.lens === state.lens)));
  const markers = el('journey-moments'); markers.replaceChildren();
  for (const item of moments(state.chapter)) {
    const node = document.createElement('button'); node.textContent = item.label; node.dataset.moment = String(item.p);
    markers.append(node);
  }
  const next = CHAPTERS[(CHAPTERS.indexOf(state.chapter) + 1) % CHAPTERS.length];
  text('journey-next', state.chapter === 'metal' ? t('回看船下的同形水 →') : t('下一步：{{chapter}} →', { chapter: chapterName(next) }));
}
function selectChapter(chapter: JourneyChapter) {
  player.pause();
  if (chapter === 'pressure' && !visitedWater) physicalWaterProgress = .43;
  if (chapter === 'pressure' && physicalWaterProgress < .43) state.lens = 'whole';
  if (chapter === 'water') { remembered.water = physicalWaterProgress; visitedWater = true; }
  state.chapter = chapter;
  choices();
  player.select(remembered[chapter], CHAPTER_DURATION[chapter]);
}
document.querySelectorAll<HTMLButtonElement>('[data-journey]').forEach(node => node.addEventListener('click', () => selectChapter(node.dataset.journey as JourneyChapter), { signal: abort.signal }));
document.querySelectorAll<HTMLButtonElement>('[data-specimen]').forEach(node => node.addEventListener('click', () => {
  player.pause(); state.object = node.dataset.specimen as JourneyObject;
  physicalWaterProgress = state.chapter === 'pressure' ? .43 : 0;
  remembered.water = physicalWaterProgress; remembered.shore = 0;
  choices(); player.select(state.chapter === 'pressure' ? remembered.pressure : 0, CHAPTER_DURATION[state.chapter]);
}, { signal: abort.signal }));
document.querySelectorAll<HTMLButtonElement>('[data-lens]').forEach(node => node.addEventListener('click', () => {
  player.pause(); state.lens = node.dataset.lens === 'micro' ? 'micro' : 'whole'; choices(); player.seek(remembered.pressure);
}, { signal: abort.signal }));
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(node => node.addEventListener('click', () => {
  camera = node.dataset.camera as typeof camera; scene?.setView(camera); svg.dataset.view = camera;
  document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(view => view.setAttribute('aria-pressed', String(view.dataset.camera === camera))); diagram();
}, { signal: abort.signal }));
for (const [id, delta] of [['journey-less', -1], ['journey-more', 1]] as const) button(id).addEventListener('click', () => {
  player.pause(); state.cargo = Math.max(0, Math.min(8, state.cargo + delta)); player.seek(player.progress);
}, { signal: abort.signal });
(el('journey-water') as HTMLSelectElement).addEventListener('change', event => {
  player.pause(); state.salt = (event.target as HTMLSelectElement).value === 'salt'; player.seek(player.progress);
}, { signal: abort.signal });
slider.addEventListener('input', () => player.seek(Number(slider.value) / 1000), { signal: abort.signal });
el('journey-moments').addEventListener('click', event => {
  const marker = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-moment]');
  if (marker) player.seek(Number(marker.dataset.moment));
}, { signal: abort.signal });
button('journey-play').addEventListener('click', () => {
  if (player.playing) player.pause();
  else if (reduced.matches) {
    const next = moments(state.chapter).find(item => item.p > player.progress + .001)?.p;
    player.seek(next ?? (state.chapter === 'pressure' && player.progress < 1 ? Math.min(1, player.progress + .2) : 0));
  } else player.play();
}, { signal: abort.signal });
button('journey-restart').addEventListener('click', () => player.seek(0), { signal: abort.signal });
button('journey-next').addEventListener('click', () => {
  if (state.chapter === 'metal') { state.object = 'boat'; physicalWaterProgress = 0; selectChapter('water'); }
  else selectChapter(CHAPTERS[(CHAPTERS.indexOf(state.chapter) + 1) % CHAPTERS.length]);
}, { signal: abort.signal });
scene = ShoreScene.create(el('shore-host'), () => { el('journey-fallback').hidden = false; diagram(); }, diagram);
el('journey-fallback').hidden = scene.available;
choices(); player.select(remembered.shore, CHAPTER_DURATION.shore);
document.addEventListener('visibilitychange', () => { if (document.hidden) player.pause(); }, { signal: abort.signal });
reduced.addEventListener('change', () => player.pause(), { signal: abort.signal });
window.addEventListener('pagehide', event => {
  player.pause();
  if (!event.persisted) { disposed = true; abort.abort(); player.dispose(); scene?.dispose(); }
}, { signal: abort.signal });
