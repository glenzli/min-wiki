import { mountPresentationFrame, foldPresentationContext } from '../../src/platform/presentation.ts';
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
import { receiverArrival } from './model.ts';
import { readSoundChapter, soundHref, soundConditions, comparisonSample, type SoundChapter } from './projectModel.ts';
const el = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id)! as T;
el('source-panel').innerHTML=sourcePanel;el('ear-panel').innerHTML=earPanel;
translateDocument((source,values)=>{const translated=t(source,values);return translated===source?earT(source,values):translated;});
let chapter=readSoundChapter(location.search),condition=soundConditions(1,28),medium:'air'|'vacuum'='air';
let source:ReturnType<typeof mountSourceStudy>,ear:ReturnType<typeof mountHearingStudy>;
const earHandoff=document.createElement('p');earHandoff.className='ear-handoff';earHandoff.setAttribute('role','status');
el('ear-panel').querySelector('.lab-heading')!.after(earHandoff);
const arrivalButton=document.createElement('button');arrivalButton.setAttribute('id','arrival-ear');arrivalButton.type='button';arrivalButton.className='arrival-button';arrivalButton.textContent=t('扰动到了鼓膜 · 接着看耳朵 →');arrivalButton.hidden=true;
el('source-panel').querySelector('.scene-wrap')!.append(arrivalButton);
const waveMechanism=document.createElement('p');waveMechanism.textContent=t('空气镜头用 u(x,t)=uₛ(t−x/vₑ) 把同一次有限声源振动延迟到不同位置；vₑ=145 图上单位／教学秒。接收端距声源 688 图上单位，前沿约在第 4.74 教学秒到达，声源停后尾段约在第 13.74 教学秒通过。图上秒数与距离不可换算成真实声速，也不计算反射、衰减或绝对声压。');
el('source-panel').querySelector('details')!.append(waveMechanism);
const densityMechanism=document.createElement('p');densityMechanism.textContent=t('学术线索：一维小振幅声波里，位移梯度决定局部压缩与稀疏，近似有 Δp ≈ −B∂u/∂x（B 为体积模量）。图中的深浅带只取位移梯度的方向与相对变化，没有代入空气的 B、密度或真实声压；橡皮筋的横向运动与空气的纵向运动也不是同一种位移。');
el('source-panel').querySelector('details')!.append(densityMechanism);
const waveReference=document.createElement('a');waveReference.setAttribute('href','https://openstax.org/books/university-physics-volume-1/pages/16-2-mathematics-of-waves');waveReference.setAttribute('target','_blank');waveReference.setAttribute('rel','noreferrer');waveReference.textContent='OpenStax · Mathematics of Waves ↗';
el('source-panel').querySelector('details')!.append(waveReference);
const densityReference=document.createElement('a');densityReference.href='https://openstax.org/books/university-physics-volume-1/pages/17-3-sound-intensity';densityReference.target='_blank';densityReference.rel='noreferrer';densityReference.textContent='OpenStax · Sound Intensity ↗';
el('source-panel').querySelector('details')!.append(densityReference);
function renderHandoff(){
 const academic=document.documentElement.dataset.readingMode==='academic';
 earHandoff.textContent=academic?t('这一站沿用声源的音高与幅度条件（当前合成音约 {{hz}} Hz），并从鼓膜附近单独放大。两个慢镜头不共用真实时间轴；耳蜗位置是定性趋势。',{hz:Math.round(condition.frequency)}):source.snapshot().time>=receiverArrival?t('同一段扰动已经走到右端。这里放大看鼓膜怎样接住它。'):t('这里从声波到达鼓膜时放大观察；想看它怎样传来，可以回到第一站。');
}
function setConditions(tension:number,amplitude:number,origin:'source'|'ear'|'preset'){
 condition=soundConditions(tension,amplitude);
 if(origin!=='source')source.setConditions(condition.tension,condition.amplitude);
 if(origin!=='ear')ear.setConditions(condition.pitch,condition.strength);
 renderComparison();renderHandoff();
}
source=mountSourceStudy(el('source-panel'),(tension,amplitude)=>setConditions(tension,amplitude,'source'),(time,airView)=>{arrivalButton.hidden=!airView||time<receiverArrival;});
ear=mountHearingStudy(el('ear-panel'),(pitch,strength)=>setConditions(Math.pow(4,pitch),10+40*strength,'ear'));
ear.setConditions(condition.pitch,condition.strength);
arrivalButton.addEventListener('click',()=>select('ear',true));
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
 if(next==='ear')renderHandoff();
}
document.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.chapter as SoundChapter,true)));
document.querySelectorAll<HTMLButtonElement>('[data-condition]').forEach(b=>b.addEventListener('click',()=>setConditions(b.dataset.condition==='pitch'?4:1,b.dataset.condition==='amplitude'?50:28,'preset')));
el('medium').addEventListener('change',()=>{medium=el<HTMLSelectElement>('medium').value==='vacuum'?'vacuum':'air';renderComparison();});
el('previous').addEventListener('click',()=>select(chapters[Math.max(0,chapters.indexOf(chapter)-1)]!,true));el('next').addEventListener('click',()=>select(chapters[Math.min(2,chapters.indexOf(chapter)+1)]!,true));
el('label-toggle').addEventListener('click',()=>{const hidden=document.querySelector('main')!.classList.toggle('no-labels');el('label-toggle').setAttribute('aria-pressed',String(hidden));el('label-toggle').textContent=hidden?t('显示图内文字'):t('隐藏图内文字');});
function restoreAnchor(){let id:string;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}if(!id)return;const target=document.getElementById(chapter==='ear'&&!id.startsWith('h-')?'h-'+id:id)??document.getElementById(id);target?.closest('details')?.setAttribute('open','');target?.scrollIntoView?.({block:'start'});}
window.addEventListener('popstate',()=>{select(readSoundChapter(location.search));restoreAnchor();});window.addEventListener('hashchange',restoreAnchor);
select(chapter);renderComparison();mountReadingMode('.advanced, #source-panel details:not(.references)');mountTopicNavigation('sound-vibrations');restoreAnchor();
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.addEventListener('click',renderHandoff));renderHandoff();

foldPresentationContext('.causal-bridge');
const sourceFrame=mountPresentationFrame({ root: '#source-panel .lab', visual: '.scene-wrap', transport: '#play,#stop,#pluck' });
sourceFrame?.stage.querySelector('.presentation-transport')?.append(arrivalButton);
const hearingFrame = mountPresentationFrame({ root: '#ear-panel .lab', visual: '.specimen-pair', paired: true, transport: '.play-controls' });
if (hearingFrame) {
 for (const caption of hearingFrame.stage.querySelectorAll('figcaption')) hearingFrame.notes.append(caption);
 document.querySelector('main>header')?.append(el('label-toggle'));
 const figures=[...hearingFrame.stage.querySelectorAll<HTMLElement>('.specimen')];
 const lens=document.createElement('button');lens.type='button';lens.className='ear-lens';
 hearingFrame.stage.prepend(lens);
 let closeup=false;
 function setEarLens(){
  const academic=document.documentElement.dataset.readingMode==='academic';
  lens.hidden=academic;figures[0]!.hidden=!academic&&closeup;figures[1]!.hidden=!academic&&!closeup;
  lens.textContent=closeup?t('回看整只耳朵'):t('放大看耳蜗');
  lens.setAttribute('aria-pressed',String(closeup));
 }
 lens.addEventListener('click',()=>{closeup=!closeup;setEarLens();});
 document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.addEventListener('click',()=>{closeup=false;setEarLens();}));
 setEarLens();
}
const comparisonFrame = mountPresentationFrame({ root: '#compare-panel', visual: '.compare-grid', paired: true });
if (comparisonFrame) comparisonFrame.notes.prepend(el('medium').closest('label')!);
