import { mountPresentationFrame, foldPresentationContext } from '../../src/platform/presentation.ts';
import './style.css';
import './project.css';
import '../car-safety/panel.css';
import carPanel from '../car-safety/panel.html?raw';
import carContact from '../car-safety/contact.html?raw';
import {t} from './i18n.ts';
import {t as carT} from '../car-safety/i18n.ts';
import {translateDocument,languageHref} from '../../src/platform/i18n.ts';
import {mountTopicNavigation} from '../../src/platform/topicNavigation.ts';
import {mountReadingMode} from '../../src/platform/readingMode.ts';
import {mountSlidingStudy,type SlidingSnapshot} from './slidingStudy.ts';
import {mountContactStudy} from './contactStudy.ts';
import {mountCarStudy,type BrakingSnapshot} from '../car-safety/study.ts';
import {readMotionChapter,motionHref,type MotionChapter,type ContactMode} from './projectModel.ts';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
el('car-host').innerHTML=carPanel;el('contact-mechanism').innerHTML=carContact;
translateDocument(t);translateDocument(carT);
let chapter=readMotionChapter(location.search),contactMode:ContactMode='rolling';
let slide:SlidingSnapshot={initialSpeed:2.5,speed:2.5,time:0,kinetic:1,transferred:0,lane:0};
let car:BrakingSnapshot={initialSpeed:30/3.6,speed:30/3.6,time:0,phase:'reaction',kinetic:1,transferred:0};
function reference(){
 const showEnergy=chapter==='slide'||chapter==='braking';
 el('motion-energy-reference').hidden=!showEnergy;
 const s=chapter==='slide'?slide:car;
 el('motion-kinetic').style.width=s.kinetic*100+'%';el('motion-transferred').style.width=s.transferred*100+'%';
 el('motion-k-value').textContent=Math.round(s.kinetic*100)+'%';el('motion-t-value').textContent=Math.round(s.transferred*100)+'%';
 if(chapter==='slide'){
  el('motion-question').textContent=t('谁让选中接触窗口的木块慢下来？');
  el('motion-force').textContent=slide.speed>0?t('地面对向右滑的木块施加向左的滑动摩擦力；松手后没有持续推力。'):t('木块已经停下。没有水平外力使它重新滑动，模型也不会让它倒滑。');
  el('motion-boundary').textContent=t('滑块模型：{{time}} 秒；初速 {{initial}} 米/秒，当前 {{speed}} 米/秒。能量条以同一初始平动动能为 100%。',{time:slide.time.toFixed(2),initial:slide.initialSpeed.toFixed(1),speed:slide.speed.toFixed(1)});
  el('motion-bridge').textContent=t('接下来换成轮子：物体向前移动时，接触处一定在滑动吗？');
 }else if(chapter==='contact'){
  el('motion-question').textContent=t('两个接触处，摩擦做着不同的事');
  el('motion-force').textContent=contactMode==='rolling'?t('正常制动且轮胎未滑时：路面静摩擦给车辆向后的外力，刹车片与盘的滑动摩擦给车轮制动力矩。'):t('锁止轮滑行时：胎面与路面有相对滑动；这与正常滚动接触是不同条件。');
  el('motion-boundary').textContent=t('本章只显示接触运动约束与作用位置，不计算车轮受力大小、热量或停止距离。');
  el('motion-bridge').textContent=t('接下来把时间加回来：发现情况后，车不会立即开始减速，更不会立即停住。');
 }else if(chapter==='braking'){
  el('motion-question').textContent=t('同一辆车：先反应，再制动，最后停下');
  el('motion-force').textContent=car.phase==='reaction'?t('反应段尚未施加本例的制动力，速度和动能保持不变。'):car.phase==='braking'?t('制动段中，路面给车辆向后的作用；本例平动动能持续减少，常规制动主要向内能转移。'):t('车辆速度已为零，停车距离不会再增加。');
  el('motion-boundary').textContent=t('停车模型：{{time}} 秒；当前 {{speed}} 米/秒。能量条仅追踪平动动能，省略车轮转动；它不是刹车温度或实测损耗。',{time:car.time.toFixed(2),speed:car.speed.toFixed(1)});
  el('motion-bridge').textContent=t('下一步仍是这次减速的问题：车受到作用后，乘员又通过什么真实作用一起慢下来？');
 }else{
  el('motion-question').textContent=t('车慢下来，不代表身体会自动一起慢下来');
  el('motion-force').textContent=t('约束系统对身体施加真实外力，让乘员随车减速。惯性不是另一个向前推身体的力。');
  el('motion-boundary').textContent=t('这里是合身约束和作用部位示意，不计算人体受力、伤害概率或碰撞成绩；前章汽车实验的状态保留。');
  el('motion-bridge').textContent=t('把尺度从车换到人，规律仍成立：改变运动需要作用；儿童还需要符合身材与产品条件的保护。');
 }
}
const slider=mountSlidingStudy(s=>{slide=s;if(chapter==='slide')reference();});
const contact=mountContactStudy(mode=>{contactMode=mode;if(chapter==='contact')reference();});
const carStudy=mountCarStudy(s=>{car=s;if(chapter==='braking')reference();});
const chapters:MotionChapter[]=['slide','contact','braking','restraints'];
function select(next:MotionChapter,push=false){
 chapter=next;slider.setActive(next==='slide');contact.setActive(next==='contact');
 // Braking and restraint controls share one finite car study, but changing either chapter pauses it.
 carStudy.setActive(false);
 for(const item of chapters)el(item+'-panel').hidden=item!==next;
 el('car-notes').hidden=next!=='braking'&&next!=='restraints';
 document.querySelectorAll<HTMLButtonElement>('[data-motion-chapter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.motionChapter===next)));
 el<HTMLButtonElement>('motion-back').disabled=next==='slide';el<HTMLButtonElement>('motion-next').disabled=next==='restraints';
 if(push)history.pushState(null,'',languageHref(motionHref(next,location.search,location.hash)));reference();
}
document.querySelectorAll<HTMLButtonElement>('[data-motion-chapter]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.motionChapter as MotionChapter,true)));
el('motion-back').addEventListener('click',()=>select(chapters[Math.max(0,chapters.indexOf(chapter)-1)]!,true));
el('motion-next').addEventListener('click',()=>select(chapters[Math.min(3,chapters.indexOf(chapter)+1)]!,true));
function restoreAnchor(){
 let id:string;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}if(!id)return;
 const targetId=(chapter==='braking'||chapter==='restraints')&&!id.startsWith('car-')?'car-'+id:id;
 const target=Array.from(document.querySelectorAll<HTMLElement>('[id]')).find(node=>node.getAttribute('id')===targetId);
 target?.closest?.('details')?.setAttribute('open','');target?.scrollIntoView?.({block:'start'});
}
window.addEventListener('popstate',()=>{select(readMotionChapter(location.search));restoreAnchor();});window.addEventListener('hashchange',restoreAnchor);
select(chapter);mountReadingMode('details:not(.references)');mountTopicNavigation('friction');restoreAnchor();

foldPresentationContext('.motion-ref');
mountPresentationFrame({ root: '#slide-panel .lab', visual: '.scene-wrap' });
mountPresentationFrame({ root: '#contact-panel', visual: '.contact-motion>svg', transport: '#contact-play,#contact-reset' });
const brakingFrame=mountPresentationFrame({ root: '#car-braking', visual: '.road-scene', transport: '.playback' });
if(brakingFrame){
 brakingFrame.stage.querySelector('.road-scene svg')?.setAttribute('viewBox','0 80 900 270');
 const metrics=document.querySelector('#braking-panel .metrics');if(metrics)brakingFrame.stage.append(metrics);
}
mountPresentationFrame({ root: '#restraints-panel .restraint-mechanism', visual: '.restraint-scene', transport: '.restraint-controls' });
mountPresentationFrame({ root: '#restraints-panel .protection-grid', visual: '.belt-art' });
