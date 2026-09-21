import './style.css';
import '../hearing/panel.css';
import './project.css';
import sourcePanel from './sourcePanel.html?raw';
import earPanel from '../hearing/panel.html?raw';
import { t } from './i18n.ts';
import { t as earT } from '../hearing/i18n.ts';
import { translateDocument, languageHref } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountSourceStudy } from './sourceStudy.ts';
import { mountHearingStudy } from '../hearing/study.ts';
import { readSoundChapter, soundHref, soundConditions, comparisonSample, type SoundChapter } from './projectModel.ts';
const el = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id)! as T;
el('source-panel').innerHTML=sourcePanel;el('ear-panel').innerHTML=earPanel;
translateDocument((source,values)=>{const translated=t(source,values);return translated===source?earT(source,values):translated;});
let chapter=readSoundChapter(location.search),condition=soundConditions(1,28),medium:'air'|'vacuum'='air';
let source:ReturnType<typeof mountSourceStudy>,ear:ReturnType<typeof mountHearingStudy>;
function setConditions(tension:number,amplitude:number,origin:'source'|'ear'|'preset'){
 condition=soundConditions(tension,amplitude);
 if(origin!=='source')source.setConditions(condition.tension,condition.amplitude);
 if(origin!=='ear')ear.setConditions(condition.pitch,condition.strength);
 renderComparison();
}
source=mountSourceStudy(el('source-panel'),(tension,amplitude)=>setConditions(tension,amplitude,'source'));
ear=mountHearingStudy(el('ear-panel'),(pitch,strength)=>setConditions(Math.pow(4,pitch),10+40*strength,'ear'));
ear.setConditions(condition.pitch,condition.strength);
function curve(tension:number,amplitude:number,pathMedium:'air'|'vacuum'='air'){
 return Array.from({length:361},(_,i)=>{const sample=comparisonSample(i/360*20,tension,amplitude,pathMedium);return `${i?'L':'M'}${25+i/360*450} ${110-sample.transmitted*72}`;}).join(' ');
}
function renderComparison(){
 el('condition-summary').textContent=t('合成音频率约 {{hz}} Hz · 示意幅度 {{amplitude}} / 50',{hz:Math.round(condition.frequency),amplitude:condition.amplitude.toFixed(0)});
 el('reference-wave').setAttribute('d',curve(1,28));el('source-wave').setAttribute('d',curve(condition.tension,condition.amplitude));el('medium-wave').setAttribute('d',curve(condition.tension,condition.amplitude,medium));
 el('source-comparison').textContent=t('20 毫秒内约 {{cycles}} 次往返。比较灰色参考线：是周期数量变了，还是曲线的高度变了？',{cycles:(condition.frequency*.02).toFixed(1)});
 el('medium-comparison').textContent=medium==='air'?t('空气提供传递扰动的介质。这里保留频率，不模拟传播损耗；不是小团空气从声源跑到耳朵。'):t('声源仍能振动，但理想真空路径没有介质传声。没有空气，也没有连接两端的固体。');
 document.querySelectorAll<HTMLButtonElement>('[data-condition]').forEach(b=>{const target=b.dataset.condition==='pitch'?[4,28]:b.dataset.condition==='amplitude'?[1,50]:[1,28];b.setAttribute('aria-pressed',String(condition.tension===target[0]&&condition.amplitude===target[1]));});
}
const chapters:SoundChapter[]=['source','ear','compare'];
function select(next:SoundChapter,push=false){
 chapter=next;source.setActive(next==='source');ear.setActive(next==='ear');
 for(const item of chapters)el(item==='source'?'source-panel':item==='ear'?'ear-panel':'compare-panel').hidden=item!==next;
 document.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chapter===next)));
 el<HTMLButtonElement>('previous').disabled=next==='source';el<HTMLButtonElement>('next').disabled=next==='compare';
 if(push)history.pushState(null,'',languageHref(soundHref(next,location.search,location.hash)));
}
document.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.chapter as SoundChapter,true)));
document.querySelectorAll<HTMLButtonElement>('[data-condition]').forEach(b=>b.addEventListener('click',()=>setConditions(b.dataset.condition==='pitch'?4:1,b.dataset.condition==='amplitude'?50:28,'preset')));
el('medium').addEventListener('change',()=>{medium=el<HTMLSelectElement>('medium').value==='vacuum'?'vacuum':'air';renderComparison();});
el('previous').addEventListener('click',()=>select(chapters[Math.max(0,chapters.indexOf(chapter)-1)]!,true));el('next').addEventListener('click',()=>select(chapters[Math.min(2,chapters.indexOf(chapter)+1)]!,true));
el('label-toggle').addEventListener('click',()=>{const hidden=document.querySelector('main')!.classList.toggle('no-labels');el('label-toggle').setAttribute('aria-pressed',String(hidden));el('label-toggle').textContent=hidden?t('显示图内文字'):t('隐藏图内文字');});
function restoreAnchor(){let id:string;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}if(!id)return;const target=document.getElementById(chapter==='ear'&&!id.startsWith('h-')?'h-'+id:id)??document.getElementById(id);target?.closest('details')?.setAttribute('open','');target?.scrollIntoView?.({block:'start'});}
window.addEventListener('popstate',()=>{select(readSoundChapter(location.search));restoreAnchor();});window.addEventListener('hashchange',restoreAnchor);
select(chapter);renderComparison();mountReadingMode('.advanced, #source-panel details:not(.references)');mountTopicNavigation('sound-vibrations');restoreAnchor();
