import { mountPresentationFrame, foldPresentationContext } from '../../src/platform/presentation.ts';
import { language, translateDocument, languageHref } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { t } from './i18n.ts';
import { t as flowerT } from '../flower-fruit/i18n.ts';
import { t as travelT } from '../seed-travel/i18n.ts';
import copy from './content.json';
import beanHTML from './study.html?raw';
import flowerHTML from '../flower-fruit/study.html?raw';
import travelHTML from '../seed-travel/study.html?raw';
import { mountStudy as mountBean } from './study.ts';
import { mountStudy as mountFlower } from '../flower-fruit/study.ts';
import { mountStudy as mountTravel } from '../seed-travel/study.ts';
import { CHAPTERS, readPlantRoute, cycleEvidence, type Chapter, type PlantStudy, type StudyState } from './lifecycleModel.ts';
import { studyHost } from './studyHost.ts';
translateDocument(t);mountTopicNavigation('seed-sprouting');
const text=(v:{zh:string;en:string})=>language==='en'?v.en:v.zh;
const el=(id:string)=>document.getElementById(id)!;
const route=readPlantRoute(location.search);
let chapter:Chapter=route.chapter,disposed=false,lastEvidence='';
const states:Record<Chapter,StudyState>={germination:route.bean,reproduction:route.flower,dispersal:route.travel};
const studies=new Map<Chapter,{root:HTMLElement;study:PlantStudy}>();
el('intro').textContent=text(copy.intro);el('map-title').textContent=text(copy.mapTitle);el('map-note').textContent=text(copy.mapNote);el('memory').textContent=text(copy.memory);
el('sources-title').textContent=text(copy.sources);el('boundary').textContent=text(copy.boundary);el('next-heading').textContent=text(copy.next);
const map=el('cycle-map');
const statuses:HTMLElement[]=[];
function node(title:string,target:Chapter|undefined,description:string){const item=document.createElement('li'),head=document.createElement(target?'button':'h3'),note=document.createElement('p');head.textContent=title;if(target){head.onclick=()=>select(target,true);head.dataset.chapter=target;}note.textContent=description;item.append(head,note);map.append(item);statuses.push(note);}
node(text(copy.germination.name),'germination','');
node(text(copy.mature),undefined,text(copy.matureNote));
node(text(copy.reproduction.name),'reproduction','');
node(text(copy.fruit),'reproduction','');
node(text(copy.dispersal.name),'dispersal','');
node(text(copy.landing),'germination','');
function updateMap(){
  const evidence=cycleEvidence(states.germination,states.reproduction,states.dispersal),key=JSON.stringify(evidence);
  if(key===lastEvidence)return;lastEvidence=key;
  statuses[0]!.textContent=text(copy.status[evidence.germination]);statuses[2]!.textContent=text(copy.status[evidence.reproduction]);
  statuses[3]!.textContent=text(evidence.reproduction==='fruit'?copy.fruitReady:evidence.reproduction==='developing'?copy.fruitGrowing:copy.fruitWaiting);
  statuses[4]!.textContent=text(copy.status[evidence.dispersal]);statuses[5]!.textContent=text(evidence.dispersal==='landed'?copy.landingAfter:copy.landingBefore);
}
function create(ch:Chapter){
  const config=ch==='germination'?{html:beanHTML,t,mount:mountBean}:ch==='reproduction'?{html:flowerHTML,t:flowerT,mount:mountFlower}:{html:travelHTML,t:travelT,mount:mountTravel};
  const root=studyHost(config.html,config.t);
  const study=config.mount(root,states[ch],state=>{states[ch]=state;updateMap();});
  const value={root,study};studies.set(ch,value);return value;
}
function select(next:Chapter,write=false){
  if(disposed)return;
  studies.get(chapter)?.study.pause();chapter=next;
  const value=studies.get(chapter)??create(chapter);
  // Detached fragments retain controls and finite state, without duplicate SVG/label ids in the document.
  el('study-host').replaceChildren(value.root);
  mountPresentationFrame({ root: value.root.querySelector<HTMLElement>('.lab')!, visual: '.scene', transport: '#next,#reset,#play,#restart' });
  for(const button of map.querySelectorAll<HTMLButtonElement>('button'))button.setAttribute('aria-current',String(button.dataset.chapter===chapter));
  const current=copy[chapter];el('case-label').textContent=text(current.species);el('question').textContent=text(current.question);el('before').textContent=text(current.before);el('after').textContent=text(current.after);el('next-chapter').textContent=text(current.next);
  if(write){const url=new URL(location.href);url.searchParams.set('chapter',chapter);history.pushState(null,'',url);}
  updateMap();
}
el('next-chapter').onclick=()=>select(CHAPTERS[(CHAPTERS.indexOf(chapter)+1)%CHAPTERS.length]!,true);
const pause=()=>{for(const {study}of studies.values())study.pause();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches)pause();});
window.addEventListener('pagehide',event=>{pause();if(!event.persisted){disposed=true;for(const {study}of studies.values())study.dispose();studies.clear();}});
window.addEventListener('popstate',()=>select(readPlantRoute(location.search).chapter));
for(const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]'))a.href=languageHref(a.getAttribute('href')!);
select(chapter);mountReadingMode('details:not(.references)');

foldPresentationContext('.cycle-panel, .chapter-context');
