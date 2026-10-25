import './style.css';
import {language,languageHref} from '../../src/platform/i18n.ts';
import {legacyGalleryURL} from './guideRoute.ts';
import {CHAPTERS,GALLERY_IDS,readEarthRoute,earthRouteURL} from './journey.ts';
import words from './guideContent.json';

const legacy=legacyGalleryURL(location.href);
if(legacy)location.replace(legacy.href);
else {
  const c=words[language==='en'?'en':'zh'];
  const root=document.querySelector<HTMLElement>('.earth-guide')!;
  root.querySelector('[data-guide-title]')!.textContent=c.title;
  root.querySelector('[data-guide-intro]')!.textContent=c.intro;
  root.querySelector('[data-guide-start]')!.textContent=c.start;
  root.querySelector('[data-guide-boundary]')!.textContent=c.boundary;
  const states=readEarthRoute(location.search).states;
  const cards=root.querySelector('[data-guide-cards]')!;
  for(const [index,chapter]of CHAPTERS.entries()){
    const item=c.topics[chapter],link=document.createElement('a');
    const url=new URL(languageHref(`/topics/${GALLERY_IDS[chapter]}/`),location.href);
    if(Object.keys(states[chapter]).length)link.href=earthRouteURL(url.href,{chapter,states:{...readEarthRoute('').states,[chapter]:states[chapter]}}).href;
    else link.href=url.href;
    link.className='earth-guide-card';
    const number=document.createElement('span'),title=document.createElement('h3'),question=document.createElement('p'),open=document.createElement('span');
    number.className='earth-guide-index';number.textContent=String(index+1).padStart(2,'0');
    title.textContent=item.title;question.textContent=item.question;open.className='earth-guide-open';open.textContent=c.open+' →';
    link.append(number,title,question,open);cards.append(link);
  }
  const related=root.querySelector('[data-guide-related]')!;
  for(const [path,label]of c.related){const a=document.createElement('a');a.href=languageHref(`/topics/${path}/`);a.textContent=label+' →';related.append(a);}
}
