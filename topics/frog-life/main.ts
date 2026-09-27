import { mountPresentationFrame, presentationGroup } from '../../src/platform/presentation.ts';
import { language, translateDocument, languageHref } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { t } from './i18n.ts';
import copy from './content.json';
import { references } from './learning.json';
import { ASPECTS, CHAPTERS, frogObservation, readMetamorphosisRoute, type Chapter, type Aspect } from './metamorphosisModel.ts';
import { MetamorphosisController, type MetamorphosisState } from './controller.ts';
import { browserFrameClock } from './frameClock.ts';
import { Specimen } from './specimen.ts';
import { wingPreparation } from '../butterfly-life/model.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('frog-life');
const text=(v:{zh:string;en:string})=>language==='en'?v.en:v.zh;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const controller=new MetamorphosisController(location.search,browserFrameClock(window));
controller.setReducedMotion(reduced.matches);
const specimens={frog:new Specimen('frog'),butterfly:new Specimen('butterfly')};
const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;return b;};
const setText=(id:string,value:string)=>{if(el(id).textContent!==value)el(id).textContent=value;};
document.title=text(copy.title);el('title').textContent=text(copy.title);el('eyebrow').textContent=text(copy.eyebrow);el('intro').textContent=text(copy.intro);el('memory').textContent=text(copy.memory);el('kids-memory').textContent=text(copy.kidsMemory);
el('lens-label').textContent=text(copy.lensLabel);el('compare-title').textContent=text(copy.compareTitle);el('compare-note').textContent=text(copy.compareNote);el('compare-kids-note').textContent=text(copy.compareKidsNote);
const chapterButtons=new Map<Chapter,HTMLButtonElement>(),aspectButtons=new Map<Aspect,HTMLButtonElement>();
function select(chapter:Chapter,write=true){controller.setChapter(chapter);if(write){const url=new URL(location.href);url.searchParams.set('chapter',chapter);history.pushState(null,'',url);}}
for(const chapter of CHAPTERS){const b=button(text(copy.chapters[chapter]),()=>select(chapter));b.dataset.chapter=chapter;chapterButtons.set(chapter,b);el('chapters').append(b);}
for(const aspect of ASPECTS){const b=button(text(copy.aspects[aspect]),()=>controller.setAspect(aspect));b.dataset.aspect=aspect;aspectButtons.set(aspect,b);el('lenses').append(b);}
for(const pair of ['larvae','remodeling','after'] as const){const b=button(text(copy.pairs[pair]),()=>controller.comparePair(pair));b.dataset.pair=pair;el('pairs').append(b);}
for(const animal of ['frog','butterfly'] as const){
 el(`${animal}-name`).textContent=text(animal==='frog'?copy.frogName:copy.butterflyName);
 el(`${animal}-image`).append(specimens[animal].element);
 const cue=document.createElement('div'),cueLabel=document.createElement('span'),cueText=document.createElement('strong'),cueTail=document.createElement('small');
 cue.className='scene-cue';cueLabel.textContent=text(copy.sceneCueLabel);cueText.id=`${animal}-scene-cue`;cueTail.id=`${animal}-tail-memory`;cueTail.textContent=text(copy.tailMemory);cueTail.hidden=true;
 cue.append(cueLabel,cueText,cueTail);specimens[animal].element.append(cue);
 el(`${animal}-camera`).append(button(text(copy.whole),()=>controller.setView(animal,'whole')),button(text(copy.detail),()=>controller.setView(animal,'detail')));
 setText(`${animal}-theory`,text(copy.academicTheory[animal]));
 el(`${animal}-theory-source`).textContent=text(copy.academicSource);
}
const frogRange=el<HTMLInputElement>('growth'),wingRange=el<HTMLInputElement>('wing-progress');
frogRange.setAttribute('aria-label',text(copy.growth));wingRange.setAttribute('aria-label',text(copy.wing));
el('growth-label').textContent=text(copy.growth);el('wing-label').textContent=text(copy.wing);
const frogPlay=button(text(copy.play),()=>controller.playGrowth('frog')),wingPlay=button(text(copy.wingPlay),()=>controller.play());
const butterflyPlay=button(t('播放完整成长'),()=>controller.playGrowth('butterfly'));
butterflyPlay.id='butterfly-play';el('butterfly-actions').append(butterflyPlay);
const butterflyRange=el<HTMLInputElement>('butterfly-growth');
butterflyRange.oninput=()=>controller.setButterflyGrowth(Number(butterflyRange.value));
frogPlay.id='frog-play';wingPlay.id='wing-play';
const prev=button(text(copy.prev),()=>controller.stepFrog(-1)),next=button(text(copy.next),()=>controller.stepFrog(1));
el('frog-actions').append(prev,frogPlay,next);el('wing-actions').append(wingPlay);
frogRange.oninput=()=>controller.setFrogProgress(Number(frogRange.value));
wingRange.oninput=()=>controller.setWingProgress(Number(wingRange.value));
const butterflyButtons=copy.butterflyStages.map((stage,index)=>{const b=button(text(stage.title).split(':')[0]!.split('：')[0]!,()=>controller.setButterflyStage(index));b.dataset.stage=String(index);el('butterfly-stages').append(b);return b;});
el('peek-label').append(document.createTextNode(text(copy.peek)));el<HTMLInputElement>('peek').onchange=event=>controller.setPeek((event.target as HTMLInputElement).checked);
el('deeper-title').textContent=text(copy.deeperTitle);
for(const mechanism of copy.mechanisms){const article=document.createElement('article'),h=document.createElement('h3'),flow=document.createElement('ol'),p=document.createElement('p');h.textContent=text(mechanism.title);flow.className='mechanism-flow';for(const step of mechanism.steps){const li=document.createElement('li');li.textContent=text(step);flow.append(li);}p.textContent=text(mechanism.body);article.append(h,flow,p);el('mechanisms').append(article);}
el('grasshopper-title').textContent=text(copy.grasshopperTitle);el('grasshopper-intro').textContent=text(copy.grasshopperIntro);el('grasshopper-note').textContent=text(copy.grasshopperNote);
for(const step of copy.grasshopperSteps){const li=document.createElement('li');li.textContent=text(step);el('grasshopper-route').append(li);}
el('boundary').textContent=text(copy.boundary);el('sources-title').textContent=text(copy.sourcesTitle);
for(const source of references){const li=document.createElement('li'),a=document.createElement('a');a.href=source.url;a.textContent=source.title;a.target='_blank';a.rel='noopener noreferrer';li.append(a);el('sources').append(li);}
function render(state:MetamorphosisState){
 const compare=state.chapter==='compare',frogStage=copy.frogStages[frogObservation(state.frog.progress)]!,butterflyStage=copy.butterflyStages[state.butterfly.stage]!;
 el('specimens').classList.toggle('comparison',compare);el('frog-card').hidden=state.chapter==='butterfly';el('butterfly-card').hidden=state.chapter==='frog';el('compare-header').hidden=!compare;el('connection').hidden=!compare;el('grasshopper').hidden=!compare;
 for(const [key,b]of chapterButtons)b.setAttribute('aria-pressed',String(key===state.chapter));
 for(const [key,b]of aspectButtons)b.setAttribute('aria-pressed',String(key===state.aspect));
 for(const animal of ['frog','butterfly'] as const){
  const stage=animal==='frog'?frogStage:butterflyStage;
  setText(`${animal}-title`,text(stage.title));setText(`${animal}-observation`,text(stage[state.aspect]));setText(`${animal}-lens`,text(copy.aspects[state.aspect]));
  const stageIndex=animal==='frog'?frogObservation(state.frog.progress):state.butterfly.stage;
  setText(`${animal}-kids-observation`,text(copy.kidsStages[animal][stageIndex]!));
  setText(`${animal}-scene-cue`,text(copy.sceneCues[animal][stageIndex]!));
  el(`${animal}-tail-memory`).hidden=animal!=='frog'||state.frog.progress<2.55||state.frog.progress>=3.96;
  for(const [index,b]of [...el(`${animal}-camera`).querySelectorAll('button')].entries())b.setAttribute('aria-pressed',String(state[animal].view===(index===0?'whole':'detail')));
  if(compare||state.chapter===animal)specimens[animal].render(state,text(stage.title));
 }
 setText('kids-connection',text(copy.kidsConnections[state.aspect]));
 setText('academic-connection',text(copy.connections[state.aspect]));
 frogRange.value=String(state.frog.progress);frogRange.setAttribute('aria-valuetext',text(frogStage.title));el('growth-value').textContent=text(frogStage.title);
 prev.disabled=state.frog.progress===0;next.disabled=state.frog.progress===4;
 // Explicit species controls in comparison; one requested clock runs at a time,
 // preserving the other animal's observation rather than synchronizing ages.
 frogPlay.hidden=false;wingPlay.hidden=compare;
 butterflyRange.value=String(state.butterfly.growth);butterflyRange.setAttribute('aria-valuetext',text(butterflyStage.title));
 butterflyPlay.textContent=state.playing==='butterfly'?text(copy.pause):state.butterfly.growth>=4?text(copy.replay):t('播放完整成长');
 butterflyPlay.setAttribute('aria-pressed',String(state.playing==='butterfly'));
 frogPlay.textContent=text(state.playing==='frog'?copy.pause:reduced.matches?copy.next:state.frog.progress>=4?copy.replay:copy.play);frogPlay.setAttribute('aria-pressed',String(state.playing==='frog'));
 butterflyButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.butterfly.stage)));
 el('peek-label').hidden=state.butterfly.stage!==2;el<HTMLInputElement>('peek').checked=state.butterfly.peek;
 el('wing-controls').hidden=state.butterfly.stage!==3;wingRange.value=String(state.butterfly.wing);
 const wingNote=text(copy.wingNotes[wingPreparation(state.butterfly.wing).phase]!);wingRange.setAttribute('aria-valuetext',wingNote);setText('wing-note',wingNote);
 wingPlay.textContent=text(state.playing==='wings'?copy.pause:reduced.matches?copy.next:state.butterfly.wing>=1?copy.replay:copy.wingPlay);wingPlay.setAttribute('aria-pressed',String(state.playing==='wings'));
}
const unsubscribe=controller.subscribe(render);
const onHidden=()=>{if(document.hidden)controller.pause();},onMotion=()=>controller.setReducedMotion(reduced.matches),onPop=()=>select(readMetamorphosisRoute(location.search).chapter,false);
document.addEventListener('visibilitychange',onHidden);reduced.addEventListener('change',onMotion);window.addEventListener('popstate',onPop);
window.addEventListener('pagehide',event=>{controller.pause();if(!event.persisted){unsubscribe();controller.dispose();specimens.frog.dispose();specimens.butterfly.dispose();document.removeEventListener('visibilitychange',onHidden);reduced.removeEventListener('change',onMotion);window.removeEventListener('popstate',onPop);}});
for(const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]'))a.href=languageHref(a.getAttribute('href')!);
mountReadingMode('details:not(.references)');

const metamorphosisFrame = mountPresentationFrame({ root: presentationGroup('#chapters', '#specimens'), visual: '#specimens', choices: '#chapters' });
if (metamorphosisFrame) for (const animal of ['frog', 'butterfly']) {
 const observation = el(`${animal}-card`).querySelector<HTMLElement>('.observation')!;
 observation.classList.add(`${animal}-notes`); metamorphosisFrame.notes.append(observation);
}

const butterflyDetails = document.createElement('details'); butterflyDetails.className = 'butterfly-details';
const butterflySummary = document.createElement('summary'); butterflySummary.textContent = t('阶段与翅膀细节');
butterflyDetails.append(butterflySummary);
el('butterfly-stages').before(butterflyDetails);
for (const node of document.querySelectorAll('.growth-note,#butterfly-stages,#peek-label,#wing-controls')) butterflyDetails.append(node);
metamorphosisFrame?.notes.append(butterflyDetails);
