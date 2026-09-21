import './style.css';
import './project.css';
import '../refrigerator/panel.css';
import refrigeratorPanel from '../refrigerator/panel.html?raw';
import {t} from './i18n.ts';
import {translateDocument,languageHref} from '../../src/platform/i18n.ts';
import {mountTopicNavigation} from '../../src/platform/topicNavigation.ts';
import {mountReadingMode} from '../../src/platform/readingMode.ts';
import {mountAirStudy,type AirBudget} from './airStudy.ts';
import {mountRefrigeratorStudy} from '../refrigerator/study.ts';
import {initialState,type ThermalState} from '../refrigerator/model.ts';
import {readChapter,coolingHref,boundaryBalance,type Chapter,type HeatPlacement} from './projectModel.ts';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
el('fridge-panel').innerHTML=refrigeratorPanel;
translateDocument(t);
let chapter=readChapter(location.search),placement:HeatPlacement='outside',work=1;
let air:AirBudget={cold:3,work:1,hot:4,fan:0},fridge:ThermalState=initialState();
function renderBudget(){
 let cold:number,power:number,hot:number,unit:string,coldPlace:string,hotPlace:string,note:string;
 if(chapter==='air'){
  ({cold,work:power,hot}=air);unit=t('份');coldPlace=t('冷端：房间');hotPlace=t('热端：室外');
  note=air.work>0?t('空调循环的教学份数，不含风扇等辅助用电；一圈冷媒不是整间房间降温的时间。'):t('只送风：制冷循环这三项为零，室内风扇仍耗电并向房间加热。');
 }else if(chapter==='fridge'){
  cold=fridge.removed/1000;power=fridge.work/1000;hot=fridge.roomGain/1000;unit='kJ';coldPlace=t('冷端：冰箱内部');hotPlace=t('热端：同一房间');
  note=t('冰箱模型累计 {{minutes}} 分钟：从房间漏回箱内 {{leak}} kJ，房间净交换 {{net}} kJ；空气与食物仍在储存或释放能量。',{minutes:(fridge.time/60).toFixed(0),leak:(fridge.leaked/1000).toFixed(1),net:((fridge.roomGain-fridge.leaked)/1000).toFixed(1)});
 }else{
  const b=boundaryBalance(work,placement);({cold,work:power,hot}=b);unit=t('份');coldPlace=t('冷端：房间');hotPlace=placement==='outside'?t('热端：室外'):t('热端：同一房间');
  note=t('独立假想循环，3 + 1 = 4 只为比较空间边界；不是空调或冰箱的实测能效。');
  el('room-placement-note').textContent=placement==='outside'?t('冷端在屋里取热，热端把热交给屋外；输入功也随放热到达室外。'):t('冷端与热端都在虚线内：取走的热又回来了，还多了输入功。');
  el('room-net').textContent=t('房间净收支：{{net}} 份',{net:(b.roomNet>0?'+':'')+b.roomNet.toFixed(1)});
  el('boundary-work-value').textContent=work.toFixed(1);
  el('boundary-cold').textContent=b.cold.toFixed(1);el('boundary-hot').textContent=b.hot.toFixed(1);
  el('boundary-hot-node').setAttribute('transform',placement==='outside'?'translate(555 80)':'translate(290 80)');
  el('boundary-hot-path').setAttribute('d',placement==='outside'?'M320 226L580 174':'M310 205L355 174');
 }
 el('shared-cold-place').textContent=coldPlace;el('shared-hot-place').textContent=hotPlace;
 el('shared-cold').textContent=cold.toFixed(1)+' '+unit;el('shared-work').textContent=power.toFixed(1)+' '+unit;el('shared-hot').textContent=hot.toFixed(1)+' '+unit;el('shared-note').textContent=note;
}
const airStudy=mountAirStudy(b=>{air=b;if(chapter==='air')renderBudget();});
const fridgeStudy=mountRefrigeratorStudy(s=>{fridge=s;if(chapter==='fridge')renderBudget();});
const chapters:Chapter[]=['air','fridge','room'];
function select(next:Chapter,push=false){
 chapter=next;
 airStudy.setActive(next==='air');fridgeStudy.setActive(next==='fridge');
 for(const item of chapters)el(item==='fridge'?'fridge-panel':item+'-panel').hidden=item!==next;
 document.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chapter===next)));
 el<HTMLButtonElement>('journey-back').disabled=next==='air';el<HTMLButtonElement>('journey-next').disabled=next==='room';
 if(push)history.pushState(null,'',languageHref(coolingHref(next,location.search,location.hash)));
 renderBudget();
}
document.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.chapter as Chapter,true)));
el('journey-next').addEventListener('click',()=>select(chapters[Math.min(2,chapters.indexOf(chapter)+1)]!,true));
el('journey-back').addEventListener('click',()=>select(chapters[Math.max(0,chapters.indexOf(chapter)-1)]!,true));
el('heat-placement').addEventListener('change',()=>{placement=el<HTMLSelectElement>('heat-placement').value==='same-room'?'same-room':'outside';renderBudget();});
el('boundary-work').addEventListener('input',()=>{work=Number(el<HTMLInputElement>('boundary-work').value);renderBudget();});
function restoreAnchor(){
 let id:string;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
 if(!id)return;
 const targetId=chapter==='fridge'&&!id.startsWith('fr-')?'fr-'+id:id;
 const target=Array.from(document.querySelectorAll<HTMLElement>('[id]')).find(node=>node.getAttribute('id')===targetId);
 target?.closest?.('details')?.setAttribute('open','');
 target?.scrollIntoView?.({block:'start'});
}
window.addEventListener('popstate',()=>{select(readChapter(location.search));restoreAnchor();});
window.addEventListener('hashchange',restoreAnchor);
select(chapter);mountReadingMode('.advanced');mountTopicNavigation('air-conditioner');restoreAnchor();
