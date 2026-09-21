export const CHAPTERS = ['anatomy', 'star', 'planet', 'companion', 'scale'] as const;
export type ChapterId = typeof CHAPTERS[number];
export const LEGACY_CHAPTERS = { 'black-hole': 'star', 'planet-black-hole': 'planet', 'galactic-center': 'companion' } as const;
export function readChapter(search: string): ChapterId {
  const value = new URLSearchParams(search).get('chapter');
  return CHAPTERS.includes(value as ChapterId) ? value as ChapterId : 'anatomy';
}
export function chapterHref(chapter: ChapterId, search = '', base = '/') {
  const params = new URLSearchParams(search);
  params.set('chapter', chapter);
  return base.replace(/\/?$/, '/') + 'topics/black-holes/?' + params.toString();
}
export function redirectLegacy(id: keyof typeof LEGACY_CHAPTERS) {
  location.replace(chapterHref(LEGACY_CHAPTERS[id], location.search, import.meta.env.BASE_URL) + location.hash);
}
