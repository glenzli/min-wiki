import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { divisionState, selectionWeights, type Part } from './model.ts';
import { drawAnatomy, drawDetail, drawDivision } from './scene.ts';
import { scenes, habitatArt, habitatKeys, type Habitat } from './habitats.ts';
import { t } from './i18n.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('bacteria');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const parts = {
  wall: [t('细胞壁：外面的支撑网'), t('这颗细菌的膜外有一层较厚的细胞壁，像相连的网，帮助保持形状。细胞壁和细胞膜不是同一层；不同细菌的外层结构也不一样。'), t('放大支撑网。这里只画一类较厚的细菌细胞壁，网格不是它的真实大小。')],
  membrane: [t('细胞膜：有选择的边界'), t('细胞膜把内部和外界分开，也参与控制物质进出。多数细菌在膜外还有细胞壁，帮助维持形状。'), t('上方是细胞外，下方是细胞内。膜上的蛋白质可以帮助某些物质通过；点按钮追踪一次进出。')],
  dna: [t('DNA：保存遗传信息'), t('DNA携带细菌生长和活动所需的遗传信息。细菌没有像我们细胞那样用膜包围的细胞核；DNA主要集中在叫作“拟核”的区域。'), t('紫色线表示折叠的 DNA。周围淡淡的颜色只标出区域，不是一层核膜。')],
  ribosomes: [t('核糖体：制造蛋白质'), t('这些小结构按照遗传信息制造蛋白质。细菌有自己的核糖体；病毒没有，复制时要借用宿主细胞的工具。'), t('两个部分组成一个核糖体。灰线表示信息的传递者 RNA，上方短链表示正在形成的蛋白质。')],
} as const;
const notes = [
  t('先长大一些：细胞利用合适的营养，增加自身的材料。'),
  t('留意紫色的 DNA：遗传信息正在复制，准备分给两个子细胞。'),
  t('两份 DNA 分开，中间逐渐形成分隔；不是把一份 DNA 随便剪成两半。'),
  t('现在成为两个子细胞，各有一份 DNA。条件合适才可能继续生长，画面停在这里。'),
];
let weights=[0,1,0,0], exchange=0, division=0, habitatWeights=[1,0,0], stage=-1;
let exchangePlaying=false;
let cancelPart=()=>{}, cancelExchange=()=>{}, cancelDivision=()=>{}, cancelHabitat=()=>{};
const range=el<HTMLInputElement>('division-progress');
function renderStructure(){
  el('bacterium-art').innerHTML=drawAnatomy(weights);
  el('detail-art').innerHTML=drawDetail(weights,exchange);
}
function selectPart(part:Part,animate=true){
  cancelPart(); pauseExchange();
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-part]'))button.setAttribute('aria-pressed',String(button.dataset.part===part));
  el('part-title').textContent=parts[part][0]; el('part-text').textContent=parts[part][1]; el('detail-caption').textContent=parts[part][2];
  el('detail-art').setAttribute('aria-label',`${parts[part][0]}. ${parts[part][2]}`);
  el('exchange-controls').hidden=part!=='membrane';
  const from=weights.slice();
  cancelPart=animateValue({from:0,to:1,duration:animate?650:0,onUpdate:p=>{weights=selectionWeights(from,part,p);renderStructure();}});
}
function renderDivision(){
  const nextStage=divisionState(division).stage;
  el('division-art').innerHTML=drawDivision(division);
  range.value=String(Math.round(division*100));
  range.setAttribute('aria-valuetext',`${Math.round(division*100)}%. ${notes[nextStage]}`);
  if(stage!==nextStage){stage=nextStage;el('division-note').textContent=notes[stage]!;}
}
function setExchangePlaying(playing:boolean){
  exchangePlaying=playing;
  el('exchange').textContent=playing?t('暂停进出'):exchange>0&&exchange<1?t('继续观察进出'):t('看一次物质进出');
}
function pauseExchange(){cancelExchange();setExchangePlaying(false);}
function setPlaying(playing:boolean){el<HTMLButtonElement>('division-pause').disabled=!playing;el<HTMLButtonElement>('division-play').disabled=playing;}
function pauseDivision(){cancelDivision();setPlaying(false);}
function selectHabitat(habitat:Habitat,animate=true){
  cancelHabitat();
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-habitat]'))button.setAttribute('aria-pressed',String(button.dataset.habitat===habitat));
  const scene=scenes[habitat],from=habitatWeights.slice();
  el('habitat-title').textContent=scene.title;el('habitat-text').textContent=scene.text;el('habitat-note').textContent=scene.note;
  el('habitat-art').setAttribute('aria-label',`${scene.title}. ${t('场景示意，不代表真实数量或比例。')}`);
  // Each setting is a different community. Fade complete illustrations, not one bacterium morphing into another.
  cancelHabitat=animateValue({from:0,to:1,duration:animate?650:0,onUpdate:p=>{
    habitatWeights=from.map((v,i)=>v+(Number(habitatKeys[i]===habitat)-v)*p);
    el('habitat-art').innerHTML=habitatKeys.map((key,i)=>`<g opacity="${habitatWeights[i]}">${habitatArt(key)}</g>`).join('');
  }});
}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-part]'))button.addEventListener('click',()=>selectPart(button.dataset.part as Part));
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-habitat]'))button.addEventListener('click',()=>selectHabitat(button.dataset.habitat as Habitat));
el('exchange').addEventListener('click',()=>{
  if(exchangePlaying){pauseExchange();return;}
  if(exchange>=1)exchange=0;
  setExchangePlaying(true);
  cancelExchange=animateValue({from:exchange,to:1,duration:6500*(1-exchange),onUpdate:p=>{exchange=p;el('detail-art').innerHTML=drawDetail(weights,exchange);},onComplete:()=>setExchangePlaying(false)});
});
el('division-play').addEventListener('click',()=>{
  pauseDivision(); if(division>=1)division=0;setPlaying(true);
  cancelDivision=animateValue({from:division,to:1,duration:12000*(1-division),onUpdate:p=>{division=p;renderDivision();},onComplete:()=>setPlaying(false)});
});
el('division-pause').addEventListener('click',pauseDivision);
range.addEventListener('input',()=>{pauseDivision();division=Number(range.value)/100;renderDivision();});
function stop(){cancelPart();pauseExchange();cancelHabitat();pauseDivision();}
// Register before any animations so hidden pages hold their current observation instead of finishing a life cycle offscreen.
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
selectPart('membrane',false);selectHabitat('yogurt',false);renderDivision();
mountReadingMode('details:not(.references)');
