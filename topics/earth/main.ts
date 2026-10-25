import './style.css';
import { language, languageHref, translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { CHAPTERS, GALLERY_IDS, galleryChapter, boundedStudyState, earthRouteURL, isChapter, readEarthRoute, type Chapter } from './journey.ts';
import journeyContent from './journeyContent.json';
import type { MountStudy, StudyInstance } from './studyContract.ts';
import { createRoutePersistence } from './routePersistence.ts';

translateDocument(t);
const root = document.querySelector<HTMLElement>('.earth-project')!;
const get = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
const host = get('earth-workspace');
const copy = language === 'en' ? journeyContent.en : journeyContent.zh;
const locale = language === 'en' ? 'en' : 'zh';
const loaders: Record<Chapter, () => Promise<{ mountStudy: MountStudy }>> = {
  interior: () => import('./interior/study.ts'),
  history: () => import('./history/study.ts'),
  life: () => import('../earth-life/study.ts'),
  rocks: () => import('./rocks/study.ts'),
  minerals: () => import('../earth-minerals/study.ts'),
  ores: () => import('../earth-ores/study.ts'),
  climate: () => import('../earth-climate/study.ts'),
  systems: () => import('./systems/study.ts'),
};
let route = readEarthRoute(location.search);
let instance: StudyInstance | undefined;
let epoch = 0;
let disposed = false;

function updateGalleryLinks() {
  get<HTMLAnchorElement>('earth-open-gallery').href=languageHref(`/topics/${GALLERY_IDS[route.chapter]}/`);
  for(const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const target=galleryChapter(link.href);if(!target)continue;
    const next=target==='museum'?route.chapter:target;
    link.href=earthRouteURL(new URL(languageHref(link.href),location.href).href,{chapter:next,states:route.states}).href;
  }
}

function writeRoute(push: boolean) {
  routePersistence.write(push);
}
const routePersistence = createRoutePersistence({
  url: () => earthRouteURL(location.href, route),
  afterWrite: updateGalleryLinks,
  isPlaying: () => !!host.querySelector('[data-playback-state="playing"]'),
});
function heading() {
  const index = CHAPTERS.indexOf(route.chapter);
  root.dataset.earthChapter = route.chapter;
  get('earth-question').textContent = copy[route.chapter].title;
  get('earth-bridge').textContent = copy[route.chapter].bridge;
  get('earth-next-bridge').textContent = copy[route.chapter].next;
  get('earth-route-name').textContent = copy[route.chapter].title;
  get('earth-route-index').textContent = `${String(index + 1).padStart(2, '0')} / ${String(CHAPTERS.length).padStart(2, '0')}`;
  updateGalleryLinks();
  get<HTMLButtonElement>('earth-previous').disabled = index === 0;
  get<HTMLButtonElement>('earth-next').disabled = index === CHAPTERS.length - 1;
  for (const button of root.querySelectorAll<HTMLElement>('.earth-chapters [data-earth-chapter]')) {
    button.setAttribute('aria-pressed', String(button.dataset.earthChapter === route.chapter));
  }
}
async function mountChapter(focus = false) {
  const ticket = ++epoch;
  const chapter = route.chapter;
  instance?.dispose(); instance = undefined;
  host.replaceChildren(); host.setAttribute('aria-busy', 'true');
  get('earth-recovery').hidden = true;
  get('earth-load-status').hidden = false;
  get('earth-load-status').textContent = t('正在准备这一站的示意与操作……');
  heading();
  try {
    const module = await loaders[chapter]();
    if (ticket !== epoch || disposed) return;
    instance = module.mountStudy(host, {
      language: locale,
      initialState: { ...route.states[chapter] },
      onStateChange(state) {
        if (ticket !== epoch || disposed) return;
        route.states[chapter] = boundedStudyState(state);
        writeRoute(false);
      },
    });
    translateDocument(t, host);
    updateGalleryLinks();
    host.setAttribute('aria-busy', 'false');
    get('earth-load-status').hidden = true;
    if (focus) get('earth-question').focus({ preventScroll: true });
  } catch (error) {
    if (ticket !== epoch || disposed) return;
    instance?.dispose(); instance = undefined; host.replaceChildren();
    host.setAttribute('aria-busy', 'false');
    get('earth-load-status').hidden = true;
    get('earth-recovery').hidden = false;
    console.error('Earth chapter failed to load', chapter, error);
  }
}
function select(chapter: Chapter) {
  if (chapter === route.chapter) return;
  instance?.pause(); route.chapter = chapter; writeRoute(true);
  void mountChapter(true);
}
root.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-earth-chapter]');
  if (button && root.contains(button) && isChapter(button.dataset.earthChapter)) select(button.dataset.earthChapter);
});
get('earth-previous').addEventListener('click', () => {
  const previous = CHAPTERS[CHAPTERS.indexOf(route.chapter) - 1]; if (previous) select(previous);
});
get('earth-next').addEventListener('click', () => {
  const next = CHAPTERS[CHAPTERS.indexOf(route.chapter) + 1]; if (next) select(next);
});
// A failed dynamic import is cached by a document's module map. A new document
// retries the resource while the URL retains every gallery's validated state.
get('earth-retry').addEventListener('click', () => { location.reload(); });
window.addEventListener('popstate', () => {
  routePersistence.cancel(); route = readEarthRoute(location.search); void mountChapter();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) instance?.pause(); });
window.addEventListener('pagehide', event => {
  instance?.pause();
  routePersistence.flush();
  if (!event.persisted) { disposed = true; ++epoch; instance?.dispose(); instance = undefined; routePersistence.dispose(); }
});
void mountChapter();
