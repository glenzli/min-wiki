import {GALLERY_IDS,isChapter} from './journey.ts';

/** Old eight-chapter URLs retain their selected study, query and anchor. */
export function legacyGalleryURL(href:string):URL|undefined {
  const url=new URL(href),chapter=url.searchParams.get('chapter');
  if(!isChapter(chapter)||! /\/topics\/earth\/$/.test(url.pathname))return;
  url.pathname=url.pathname.replace(/\/earth\/$/,`/${GALLERY_IDS[chapter]}/`);
  return url;
}
