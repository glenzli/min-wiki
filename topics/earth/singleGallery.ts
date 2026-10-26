import {language,languageHref,translateDocument,translator} from '../../src/platform/i18n.ts';
import {earthRouteURL,readEarthRoute,boundedStudyState,isChapter,CHAPTERS,GALLERY_IDS,galleryChapter,type Chapter} from './journey.ts';
import type {MountStudy,StudyInstance} from './studyContract.ts';
import {t} from './i18n.ts';
import './style.css';
import journeyContent from './journeyContent.json';
import {createRoutePersistence} from './routePersistence.ts';
import {mountGalleryPresentations} from './galleryPresentation.ts';

/** One module and one scene lifetime for a gallery's independent native route. */
export function mountSingleGallery(chapter:Chapter,topicId:string,english:Record<string,string>,load:()=>Promise<{mountStudy:MountStudy}>) {
  translateDocument(translator(topicId,english));
  const root=document.querySelector<HTMLElement>('.earth-single-gallery')!;
  const host=root.querySelector<HTMLElement>('[data-gallery-host]')!;
  const recovery=root.querySelector<HTMLElement>('[data-gallery-recovery]')!;
  const status=root.querySelector<HTMLElement>('[data-gallery-status]')!;
  const navigation=root.querySelector<HTMLElement>('.earth-independent-header')??undefined;
  const copy=language==='en'?journeyContent.en:journeyContent.zh;
  const neighbors=root.querySelector<HTMLElement>('.earth-gallery-links');
  if(neighbors)neighbors.replaceChildren(...CHAPTERS.filter(target=>target!==chapter).map(target=>{
    const link=root.ownerDocument.createElement('a');link.dataset.galleryChapter=target;
    link.textContent=copy[target].title;link.href=languageHref(`/topics/${GALLERY_IDS[target]}/`);return link;
  }));
  let route=readEarthRoute(location.search);route.chapter=chapter;
  let instance:StudyInstance|undefined,epoch=0,disposed=false;
  let releasePresentation=()=>{};
  function linkTo(target:Chapter,museum=false){
    const url=new URL(location.href);
    const destination=languageHref(`/topics/${museum?'earth':GALLERY_IDS[target]}/`);
    url.pathname=new URL(destination,location.href).pathname;
    url.searchParams.set('lang',language==='en'?'en':'zh');
    const next=earthRouteURL(url.href,{chapter:target,states:route.states});
    if(museum)next.searchParams.delete('chapter');
    return next.href;
  }
  function updateLinks(){
    root.querySelectorAll<HTMLAnchorElement>('[data-gallery-chapter]').forEach(link=>{
      if(isChapter(link.dataset.galleryChapter))link.href=linkTo(link.dataset.galleryChapter);
    });
    (navigation??root).querySelectorAll<HTMLAnchorElement>('[data-gallery-home]').forEach(link=>link.href=linkTo(chapter,true));
    root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link=>{
      const target=galleryChapter(link.href);if(target)link.href=linkTo(target==='museum'?chapter:target,target==='museum');
    });
  }
  const persistence=createRoutePersistence({url:()=>earthRouteURL(location.href,route),afterWrite:updateLinks,isPlaying:()=>!!host.querySelector('[data-playback-state="playing"]')});
  async function mount(){
    const ticket=++epoch;releasePresentation();releasePresentation=()=>{};instance?.dispose();instance=undefined;host.replaceChildren();
    status.hidden=false;recovery.hidden=true;host.setAttribute('aria-busy','true');
    try{
      const module=await load();if(ticket!==epoch||disposed)return;
      instance=module.mountStudy(host,{language:language==='en'?'en':'zh',initialState:{...route.states[chapter]},onStateChange(state){
        if(ticket!==epoch||disposed)return;
        route.states[chapter]=boundedStudyState(state);persistence.write();
      }});
      releasePresentation=mountGalleryPresentations(host,navigation);
      translateDocument(t,host);updateLinks();status.hidden=true;host.setAttribute('aria-busy','false');
    }catch(error){if(ticket!==epoch||disposed)return;releasePresentation();releasePresentation=()=>{};instance?.dispose();instance=undefined;host.replaceChildren();status.hidden=true;recovery.hidden=false;host.setAttribute('aria-busy','false');console.error('Gallery load failed',chapter,error);}
  }
  root.querySelector('[data-gallery-retry]')!.addEventListener('click',()=>{location.reload();});
  root.addEventListener('click',event=>{
    const target=(event.target as Element).closest<HTMLElement>('[data-earth-chapter]');
    if(target&&isChapter(target.dataset.earthChapter))location.assign(linkTo(target.dataset.earthChapter));
  });
  window.addEventListener('popstate',()=>{persistence.cancel();route=readEarthRoute(location.search);route.chapter=chapter;void mount();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)instance?.pause();});
  window.addEventListener('pagehide',event=>{instance?.pause();persistence.flush();if(!event.persisted){disposed=true;++epoch;releasePresentation();instance?.dispose();instance=undefined;persistence.dispose();}});
  updateLinks();void mount();
}
