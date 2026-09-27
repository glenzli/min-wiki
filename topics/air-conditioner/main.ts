import { mountPresentationFrame, foldPresentationContext } from '../../src/platform/presentation.ts';
import './style.css';
import './project.css';
import '../refrigerator/panel.css';
import refrigeratorPanel from '../refrigerator/panel.html?raw';
import {t} from './i18n.ts';
import {translateDocument,languageHref} from '../../src/platform/i18n.ts';
import {mountTopicNavigation} from '../../src/platform/topicNavigation.ts';
import {mountReadingMode} from '../../src/platform/readingMode.ts';
import {animateValue} from '../../src/visuals/transition.ts';
import {mountAirStudy,type AirBudget} from './airStudy.ts';
import {mountRefrigeratorStudy} from '../refrigerator/study.ts';
import {initialState,type ThermalState} from '../refrigerator/model.ts';
import {readChapter,coolingHref,boundaryBalance,type Chapter,type HeatPlacement} from './projectModel.ts';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
el('fridge-panel').innerHTML=refrigeratorPanel;
translateDocument(t);
let chapter=readChapter(location.search),placement:HeatPlacement='outside',work=1;
let hotVisualX=555,cancelHotMove=()=>{};
let air:AirBudget={cold:3,work:1,hot:4,fan:0},fridge:ThermalState=initialState();
function drawHotPlacement(){
 const outside=(hotVisualX-290)/265;
 el('boundary-hot-node').setAttribute('transform',`translate(${hotVisualX} 80)`);
 el('boundary-hot-path').setAttribute('d',`M${310+10*outside} ${205+21*outside}L${355+225*outside} 174`);
 document.getElementById('boundary-mobile-hot')?.setAttribute('transform',`translate(0 ${150+190*outside})`);
 document.getElementById('boundary-mobile-arrow-path')?.setAttribute('d',`M208 262L257 ${226+114*outside}`);
}
function makeMobileBoundary(){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('boundary-mobile');svg.setAttribute('viewBox','0 0 360 460');svg.setAttribute('role','img');svg.setAttribute('aria-label',t('虚线框出房间，蓝色冷端在框内，橙色热端可在框内或室外，电功从外部输入。'));
 svg.innerHTML=`<defs><marker id="mobile-heat-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#7f7770"/></marker></defs>
 <rect width="360" height="460" fill="#eff1ef"/><rect x="13" y="12" width="334" height="296" rx="16" fill="#e7edeb" stroke="#788b83" stroke-width="2" stroke-dasharray="6 6"/>
 <text x="29" y="43" font-size="21" fill="#314149">${t('房间')}</text><text x="28" y="346" font-size="19" fill="#314149">${t('室外')}</text>
 <rect x="28" y="88" width="143" height="78" rx="12" fill="#b7d9db"/><text x="99" y="120" text-anchor="middle" font-size="19" fill="#314149">${t('冷端取热')}</text><text id="boundary-mobile-cold" x="99" y="151" text-anchor="middle" font-size="23" fill="#314149">3.0</text>
 <path d="M111 174L158 247" stroke="#619da7" stroke-width="4" fill="none" marker-end="url(#mobile-heat-arrow)"/>
 <circle cx="180" cy="265" r="29" fill="#d5c5a4"/><text x="180" y="273" text-anchor="middle" font-size="24" fill="#3e4b48">W</text>
 <path d="M46 442L157 288" stroke="#a28458" stroke-width="4" fill="none" marker-end="url(#mobile-heat-arrow)"/><text x="45" y="433" font-size="16" fill="#715a3f">${t('输入功 W')}</text>
 <path id="boundary-mobile-arrow-path" d="M208 262L257 340" stroke="#b97859" stroke-width="4" fill="none" marker-end="url(#mobile-heat-arrow)"/>
 <g id="boundary-mobile-hot" transform="translate(0 340)"><rect x="188" width="156" height="80" rx="12" fill="#e3b79e"/><text x="266" y="33" text-anchor="middle" font-size="19" fill="#423d39">${t('热端放热')}</text><text id="boundary-mobile-hot-value" x="266" y="64" text-anchor="middle" font-size="23" fill="#423d39">4.0</text></g>`;
 return svg;
}
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
  const mobileCold=document.getElementById('boundary-mobile-cold'),mobileHot=document.getElementById('boundary-mobile-hot-value');
  if(mobileCold)mobileCold.textContent=b.cold.toFixed(1);if(mobileHot)mobileHot.textContent=b.hot.toFixed(1);
  drawHotPlacement();
 }
 el('shared-cold-place').textContent=coldPlace;el('shared-hot-place').textContent=hotPlace;
 el('shared-cold').textContent=cold.toFixed(1)+' '+unit;el('shared-work').textContent=power.toFixed(1)+' '+unit;el('shared-hot').textContent=hot.toFixed(1)+' '+unit;el('shared-note').textContent=note;
}
const airStudy=mountAirStudy(b=>{air=b;if(chapter==='air')renderBudget();});
const fridgeStudy=mountRefrigeratorStudy(s=>{fridge=s;if(chapter==='fridge')renderBudget();});
const chapters:Chapter[]=['air','fridge','room'];
function select(next:Chapter,push=false){
 if(chapter==='room'&&next!=='room'){cancelHotMove();hotVisualX=placement==='outside'?555:290;drawHotPlacement();}
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
el('heat-placement').addEventListener('change',()=>{cancelHotMove();placement=el<HTMLSelectElement>('heat-placement').value==='same-room'?'same-room':'outside';renderBudget();const destination=placement==='outside'?555:290;cancelHotMove=animateValue({from:hotVisualX,to:destination,duration:650,onUpdate:x=>{hotVisualX=x;drawHotPlacement();if(x!==destination)el('room-net').textContent=t('热端移动中 · 到位后读房间账');},onComplete:renderBudget});});
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

foldPresentationContext('.heat-map');
mountPresentationFrame({ root: '#air-panel .lab', visual: '#scene', transport: '#play,#pause,#reset' });
mountPresentationFrame({ root: '#fridge-panel .lab', visual: '#fr-fridge-scene' });
const roomFrame=mountPresentationFrame({ root: '#room-panel', visual: '.boundary-scene' });
if(roomFrame){roomFrame.stage.querySelector('.presentation-visual')!.append(makeMobileBoundary());roomFrame.stage.append(el('room-net'));drawHotPlacement();}
