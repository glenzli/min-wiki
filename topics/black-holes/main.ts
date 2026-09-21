import { translateDocument, languageHref } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountTopicLearning } from '../../src/platform/learning/mount.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { CHAPTERS, readChapter, chapterHref } from './routes.ts';
import type { ChapterId } from './routes.ts';
import { SceneSlot } from './session.ts';
import type { ChapterState, ChapterScene, ChapterDefinition, ViewOptions } from './types.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('black-holes', { learning: false });
const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const loaders = {
  anatomy: () => import('./chapters/anatomy.ts').then(module => module.chapter),
  star: () => import('./chapters/star.ts').then(module => module.chapter),
  planet: () => import('./chapters/planet.ts').then(module => module.chapter),
  companion: () => import('./chapters/companion.ts').then(module => module.chapter),
  scale: () => import('./chapters/scale.ts').then(module => module.chapter),
};
const states: Record<ChapterId, ChapterState> = {
  anatomy: { progress: 0, scenario: '', planet: 'rocky', part: 'overview' },
  star: { progress: 0, scenario: 'flyby', planet: 'rocky', part: '' },
  planet: { progress: 0, scenario: 'safe', planet: 'rocky', part: '' },
  companion: { progress: 0, scenario: 'overflow', planet: 'rocky', part: '' },
  scale: { progress: 0, scenario: '', planet: 'rocky', part: '' },
};
const views: Record<ChapterId, ViewOptions['view']> = { anatomy: 'close', star: 'overview', planet: 'overview', companion: 'overview', scale: 'overview' };
const slot = new SceneSlot<ChapterScene>();
let chapterId = readChapter(location.search), definition: ChapterDefinition | null = null;
let playing = false, academic = false, disposed = false, failed = false, last = performance.now(), frame = 0;
let chapterAbort = new AbortController(), cancelStage = () => {}, lastCopy = '', lastStatus = '';
let demonstration = false, readingScroll = 0;
function setDemonstration(value: boolean) {
  if (value === demonstration) return;
  if (value) readingScroll = window.scrollY;
  demonstration = value;
  document.body.classList.toggle('demonstration-mode', value);
  el('demonstration').setAttribute('aria-pressed', String(value));
  write('demonstration', value ? t('退出纯演示 · Esc') : t('纯演示'));
  el('demonstration').focus({ preventScroll: true });
  window.scrollTo({ top: value ? 0 : readingScroll, behavior: 'instant' });
}
el('demonstration').addEventListener('click', () => setDemonstration(!demonstration));
const href = (id: ChapterId) => languageHref(chapterHref(id, location.search));
function options(): ViewOptions {
  return { view: views[chapterId], guides: input('guides').checked, annotations: input('annotations').checked,
    orbit: input('orbit').checked, sound: input('sound').checked, playing: playing && !document.hidden };
}
function write(id: string, text: string) { if (el(id).textContent !== text) el(id).textContent = text; }
function update() {
  const status = failed ? 'error' : slot.current?.status() ?? 'loading';
  document.body.classList.toggle('scene-failed', status === 'error');
  el('scene-loading').hidden = status !== 'loading'; el('scene-error').hidden = status !== 'error';
  el('scene-host').setAttribute('aria-busy', String(status === 'loading'));
  (el('play') as HTMLButtonElement).disabled = status !== 'ready';
  (el('reset') as HTMLButtonElement).disabled = !definition;
  input('progress').disabled = !definition;
  if (!definition) return;
  const state = states[chapterId], duration = definition.duration(state);
  input('progress').value = String(Math.round(state.progress * 1000));
  write('elapsed', (state.progress * duration).toFixed(1) + ' / ' + duration + ' s');
  write('play', playing ? t('暂停') : state.progress >= 1 ? t('重新播放') : t('开始观察'));
  const copy = definition.describe(state, academic), key = JSON.stringify(copy);
  if (key !== lastCopy) {
    lastCopy = key;
    for (const [id, text] of Object.entries({ 'story-title': copy.title, story: copy.body, prompt: copy.prompt, formula: copy.formula, terms: copy.terms, limits: copy.caution, 'scene-note': copy.note })) write(id, text);
  }
  el('science').hidden = !academic;
  write('scene-live', slot.current?.readout?.(state, academic) ?? '');
  const stages = definition.steps(state);
  const stage = stages.reduce((at, step, i) => state.progress + 1e-7 >= step.progress ? i : at, 0);
  el('steps').querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === stage)));
  input('progress').setAttribute('aria-valuetext', t('演示进度 {{percent}}%', { percent: Math.round(state.progress * 100) }));
}
function buildControls() {
  if (!definition) return;
  const state = states[chapterId];
  el('chapter-choices').replaceChildren(...definition.choices.map(choice => {
    const group = document.createElement('div'); group.className = 'choice-group'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', choice.label);
    const label = document.createElement('span'); label.className = 'choice-label'; label.textContent = choice.label; group.append(label);
    for (const item of choice.options) {
      const button = document.createElement('button'); button.textContent = item.label;
      button.setAttribute('aria-pressed', String(state[choice.key] === item.value));
      button.addEventListener('click', () => {
        cancelStage(); playing = false;
        if (definition?.change) definition.change(state, choice.key, item.value);
        else { if (choice.key === 'planet') state.planet = item.value as 'rocky' | 'gas'; else state[choice.key] = item.value; if (choice.key === 'scenario') state.progress = 0; }
        buildControls(); slot.current?.draw(state, options()); update();
      });
      group.append(button);
    }
    return group;
  }));
  el('steps').replaceChildren(...definition.steps(state).map(step => {
    const button = document.createElement('button'); button.textContent = step.label;
    button.addEventListener('click', () => {
      cancelStage(); playing = false;
      cancelStage = animateValue({ from: state.progress, to: step.progress, duration: 900, onUpdate: progress => { state.progress = progress; update(); } });
    });
    return button;
  }));
}
async function selectChapter(id: ChapterId, push = false) {
  if (push && id === chapterId && definition && !failed) return;
  cancelStage(); playing = false; definition = null; failed = false; lastCopy = ''; lastStatus = '';
  chapterAbort.abort(); chapterAbort = new AbortController();
  chapterId = id;
  document.body.dataset.chapter = id;
  if (push) history.pushState(null, '', href(id));
  (el('view') as HTMLSelectElement).value = views[id];
  el('orbit-option').hidden = id !== 'companion'; el('sound-option').hidden = id !== 'star';
  el('view-option').hidden = id === 'scale';
  el('back-to-anatomy').hidden = id === 'anatomy';
  document.querySelectorAll<HTMLAnchorElement>('[data-chapter]').forEach(link => { link.href = href(link.dataset.chapter as ChapterId); if (link.dataset.chapter === id) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  const index = CHAPTERS.indexOf(id);
  write('chapter-number', t('第 {{index}} / {{total}} 章', { index: index + 1, total: CHAPTERS.length }));
  write('chapter-title', document.querySelector('[data-chapter="' + id + '"] strong')!.textContent!);
  write('chapter-intro', ''); write('story-title', ''); write('story', ''); write('prompt', ''); write('scene-note', ''); write('scale-note', ''); write('scene-live', ''); write('limits', '');
  write('elapsed', '—'); input('progress').value = String(Math.round(states[id].progress * 1000));
  el('chapter-choices').replaceChildren(); el('steps').replaceChildren(); el('science').hidden = true;
  const previous = el('previous-chapter') as HTMLAnchorElement, next = el('next-chapter') as HTMLAnchorElement;
  previous.hidden = index === 0; next.hidden = index === CHAPTERS.length - 1;
  previous.href = href(CHAPTERS[Math.max(0, index - 1)]); next.href = href(CHAPTERS[Math.min(CHAPTERS.length - 1, index + 1)]);
  (el('back-to-anatomy') as HTMLAnchorElement).href = href('anatomy');
  el('chapter-learning').replaceChildren();
  // Slot clears the previous scene synchronously, before loading the next module.
  const loading = slot.activate(loaders[id], loaded => {
    definition = loaded;
    const host = el('scene-host'); host.replaceChildren();
    write('chapter-title', loaded.title); write('chapter-intro', loaded.intro); write('scale-note', loaded.scale);
    const signal = chapterAbort.signal;
    void mountTopicLearning(loaded.learningId, { host: el('chapter-learning'), signal }).catch(error => { if (!signal.aborted) console.error('Learning notes unavailable', error); });
    buildControls();
    const scene = loaded.create(host, states[id]);
    try { scene.draw(states[id], options()); } catch (error) { scene.dispose(); throw error; }
    return scene;
  });
  update();
  try { const scene = await loading; if (scene) { last = performance.now(); update(); } }
  catch (error) { failed = true; console.error('Chapter unavailable', error); update(); }
}
function navigate(event: MouseEvent, id: ChapterId) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); void selectChapter(id, true);
}
document.querySelectorAll<HTMLAnchorElement>('[data-chapter]').forEach(link => link.addEventListener('click', event => navigate(event, link.dataset.chapter as ChapterId)));
for (const id of ['previous-chapter', 'next-chapter', 'back-to-anatomy']) el(id).addEventListener('click', event => navigate(event as MouseEvent, readChapter(new URL((event.currentTarget as HTMLAnchorElement).href).search)));
window.addEventListener('popstate', () => { void selectChapter(readChapter(location.search)); });
document.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach(button => button.addEventListener('click', () => {
  academic = button.dataset.mode === 'academic';
  document.querySelectorAll('button[data-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); update();
}));
function togglePlay() { cancelStage(); if (!slot.current || slot.current.status() !== 'ready') return; if (states[chapterId].progress >= 1) states[chapterId].progress = 0; playing = !playing; update(); }
el('play').addEventListener('click', togglePlay);
el('reset').addEventListener('click', () => { cancelStage(); playing = false; states[chapterId].progress = 0; update(); });
el('progress').addEventListener('input', () => { cancelStage(); playing = false; states[chapterId].progress = Number(input('progress').value) / 1000; update(); });
el('view').addEventListener('change', () => { views[chapterId] = (el('view') as HTMLSelectElement).value as ViewOptions['view']; });
el('annotations').addEventListener('change', () => { el('scene-host').classList.toggle('hide-annotations', !input('annotations').checked); });
el('retry').addEventListener('click', () => { if (slot.current && !failed) { slot.current.retry(states[chapterId]); update(); } else void selectChapter(chapterId); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && demonstration) { event.preventDefault(); setDemonstration(false); return; }
  if (event.code === 'Space' && !event.repeat && !(event.target as HTMLElement)?.closest('button,input,select,a,textarea,summary,[contenteditable]')) { event.preventDefault(); togglePlay(); }
});
document.addEventListener('visibilitychange', () => { last = performance.now(); if (document.hidden) slot.current?.draw(states[chapterId], options()); });
function animate(now: number) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (!document.hidden && slot.current && definition && !failed) {
    const state = states[chapterId];
    if (playing && slot.current.status() === 'ready') { state.progress = Math.min(1, state.progress + dt * Number((el('speed') as HTMLSelectElement).value) / definition.duration(state)); if (state.progress === 1) playing = false; update(); }
    try { slot.current.draw(state, options()); } catch (error) { failed = true; playing = false; console.error('Scene unavailable', error); update(); }
    const status = slot.current.status(); if (lastStatus !== status) { lastStatus = status; update(); }
  }
  if (!disposed) frame = requestAnimationFrame(animate);
}
window.addEventListener('pagehide', event => {
  if (event.persisted) { slot.current?.draw(states[chapterId], { ...options(), playing: false }); return; }
  disposed = true; cancelStage(); cancelAnimationFrame(frame); chapterAbort.abort(); slot.clear();
});
window.addEventListener('pageshow', () => { last = performance.now(); });
void selectChapter(chapterId);
frame = requestAnimationFrame(animate);
