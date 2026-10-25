import type { StudyState } from './studyContract.ts';

export const CHAPTERS = ['interior', 'history', 'life', 'rocks', 'minerals', 'ores', 'climate', 'systems'] as const;
export type Chapter = typeof CHAPTERS[number];
export const GALLERY_IDS:Record<Chapter,string>={interior:'earth-interior',history:'earth-history',life:'earth-life',rocks:'earth-rocks',minerals:'earth-minerals',ores:'earth-ores',climate:'earth-climate',systems:'earth-systems'};
export function galleryChapter(href:string):Chapter|'museum'|undefined {
  const match=new URL(href,'https://local.invalid').pathname.match(/\/topics\/(earth(?:-[a-z]+)?)\/$/);
  if(match?.[1]==='earth')return 'museum';
  return CHAPTERS.find(chapter=>GALLERY_IDS[chapter]===match?.[1]);
}
export type EarthRoute = { chapter: Chapter; states: Record<Chapter, StudyState> };
const keyPattern = /^[a-zA-Z][a-zA-Z0-9]{0,39}$/;
const maxValueLength = 3072;
const maxChapterFields = 20;
const maxRouteFields = CHAPTERS.length * maxChapterFields;

export function isChapter(value: unknown): value is Chapter {
  return typeof value === 'string' && (CHAPTERS as readonly string[]).includes(value);
}

/** Topic query names are isolated from language, static reading and host routing. */
export function readEarthRoute(search: string): EarthRoute {
  const params = new URLSearchParams(search);
  const candidate = params.get('chapter');
  const states = Object.fromEntries(CHAPTERS.map(chapter => [chapter, Object.create(null)])) as Record<Chapter, StudyState>;
  let count = 0;
  for (const [name, value] of params) {
    const [prefix, chapter, key, ...extra] = name.split('.');
    if (prefix !== 'earth' || !isChapter(chapter) || !keyPattern.test(key ?? '') || extra.length
      || value.length > maxValueLength || ++count > maxRouteFields) continue;
    states[chapter][key] = value;
  }
  return { chapter: isChapter(candidate) ? candidate : 'interior', states };
}

export function boundedStudyState(state: StudyState): StudyState {
  const pairs = Object.entries(state).filter(([key, value]) => keyPattern.test(key)
    && typeof value === 'string' && value.length <= maxValueLength).slice(0, maxChapterFields);
  return Object.fromEntries(pairs);
}

export function earthRouteURL(href: string, route: EarthRoute): URL {
  const url = new URL(href);
  for (const name of [...url.searchParams.keys()]) if (name.startsWith('earth.')) url.searchParams.delete(name);
  url.searchParams.set('chapter', route.chapter);
  for (const chapter of CHAPTERS) {
    for (const [key, value] of Object.entries(boundedStudyState(route.states[chapter]))) {
      url.searchParams.set(`earth.${chapter}.${key}`, value);
    }
  }
  return url;
}
