import { translateDocument } from '../../src/platform/i18n.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { MessageJourney, HOP_COUNT, TOTAL_STEPS, stationForPosition } from './model.ts';
import { t } from './i18n.ts';
import {createNetworkScene} from './scene.ts';
import './style.css';
translateDocument(t);

const journey = new MessageJourney();
const el = (id: string): HTMLElement => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const button = (id: string) => el(id) as HTMLButtonElement;
const scene = el('network-scene') as unknown as SVGSVGElement;
const mobile = matchMedia('(max-width: 700px)');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const drawing=createNetworkScene(scene,t);
const stageTitles=()=>[t('先把消息交给接入点'),t('基站也需要后面的路'),t('网络继续转发'),t('经过网络与消息服务'),t('找到对方的接入网络'),t('最后一段，再用无线电')];
const stageNotes=()=>[
 t('消息已准备好。本机用无线电接入附近能连接的基站，不是把文字直接抛到对方手机。'),
 t('这一部分到了基站。接下来经过本例的有线回程；基站不是旅程终点。'),
 t('这一部分到了发送方的网络。设备按照地址，把信息交给下一段网络。'),
 t('这一部分经过图中合并表示的网络与服务。真实应用的服务位置和数量各不相同。'),
 t('这一部分到了对方的网络。还需要到达对方能连接的基站。'),
 t('这一部分到了对方基站。对方手机接通时，最后一段无线接入才能完成。'),
];
function renderFrame() {
  const state=journey.state,arrived=state.parts.filter(p=>p.hop===HOP_COUNT).length;
  const status = journey.blockedAt==='sender'?t('本机待发送：还没有可用接入连接。'):journey.blockedAt==='network'?t('网络中等待：本例中间路径不通。'):journey.blockedAt==='receiver'?t('还没送达：对方接入连接未接通。'):journey.status==='read'?t('已送达 · 已模拟对方打开'):journey.status==='delivered'?t('已送达 · 还没有模拟对方打开'):journey.status==='pending'&&journey.playbackPhase===0?t('待发送 · 三个编号都还在本机'):t('旅途中 · 对方收齐 {{arrived}} / 3 部分',{arrived});
  if(el('status').textContent!==status)el('status').textContent=status;
  drawing.render(state,journey.conditions,journey.blockedAt,journey.playbackPhase,mobile.matches,reduced.matches);
}
function render() {
  const state=journey.state,arrived=state.parts.filter(p=>p.hop===HOP_COUNT).length;
  input('sender-online').checked=journey.conditions.senderOnline;
  input('backbone-online').checked=journey.conditions.backboneOnline;
  input('receiver-online').checked=journey.conditions.receiverOnline;
  input('phone-position').value=String(journey.conditions.position);
  input('progress').value=String(state.completedSteps);
  el('progress-value').textContent=t('{{step}} / {{total}} 步',{step:state.completedSteps,total:TOTAL_STEPS});
  input('progress').setAttribute('aria-valuetext',t('消息旅程，第 {{step}} 步，共 {{total}} 步',{step:state.completedSteps,total:TOTAL_STEPS}));
  el('station-value').textContent=stationForPosition(journey.conditions.position)==='a'?t('接入区 A'):t('接入区 B');
  button('play').textContent=journey.playing?t('暂停旅程'):state.completedSteps===TOTAL_STEPS?t('回到起点播放'):state.completedSteps===0&&journey.playbackPhase===0?t('开始旅程'):t('继续旅程');
  button('play').setAttribute('aria-pressed',String(journey.playing));
  button('step').disabled=state.completedSteps===TOTAL_STEPS||Boolean(journey.blockedAt);
  // Seeking recorded earlier states is a local replay. A new disconnected route cannot be completed by seeking ahead.
  button('play').disabled=Boolean(journey.blockedAt)&&state.completedSteps<TOTAL_STEPS;
  const active=journey.activePart;
  el('stage-title').textContent=active?stageTitles()[active.hop]!:t('消息已经拼齐');
  el('stage-note').textContent=active?stageNotes()[active.hop]!:t('三个编号都到了同一部手机。完整消息能显示了；是否被人读过，是下一件事。');
  el('received-parts').replaceChildren(...state.parts.map(part=>{
    const n=document.createElement('span');n.className='received-part';n.dataset.arrived=String(part.hop===HOP_COUNT);
    n.textContent=t('{{id}}：{{state}}',{id:part.id,state:part.hop===HOP_COUNT?t('已到'):t('等待')});return n;
  }));
  el('received-message').textContent=arrived===3?t('公园见！'):t('还没拼齐整条消息。');
  button('read-message').disabled=journey.status!=='delivered';
  button('read-message').textContent=journey.status==='read'?t('已模拟打开'):t('模拟对方打开消息');
  renderFrame();
}
let frame=0,last=0;
function cancelFrame(){cancelAnimationFrame(frame);frame=0;}
function pause(){journey.pause();cancelFrame();render();}
function tick(now:number){frame=0;if(!journey.playing||document.hidden)return;const changed=journey.tick((now-last)/1000);last=now;if(changed)render();else renderFrame();if(journey.playing)frame=requestAnimationFrame(tick);else render();}
button('play').addEventListener('click',()=>{if(journey.playing){pause();return;}if(journey.state.completedSteps===TOTAL_STEPS)journey.seek(0);journey.play();last=performance.now();cancelFrame();if(journey.playing)frame=requestAnimationFrame(tick);render();});
button('step').addEventListener('click',()=>{journey.pause();cancelFrame();journey.step();render();});
input('progress').addEventListener('input',()=>{cancelFrame();journey.seek(Number(input('progress').value));render();});
for(const [id,key] of [['sender-online','senderOnline'],['backbone-online','backboneOnline'],['receiver-online','receiverOnline']] as const)input(id).addEventListener('change',()=>{cancelFrame();journey.configure({[key]:input(id).checked});render();});
input('phone-position').addEventListener('input',()=>{cancelFrame();journey.configure({position:Number(input('phone-position').value)});render();});
button('read-message').addEventListener('click',()=>{journey.markRead();render();});
button('reset').addEventListener('click',()=>{cancelFrame();journey.configure({senderOnline:true,backboneOnline:true,receiverOnline:true,position:10});journey.reset();for(const id of ['sender-online','backbone-online','receiver-online'])input(id).checked=true;input('phone-position').value='10';render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',(event)=>{pause();if(!event.persisted)drawing.dispose();});
reduced.addEventListener('change',()=>{pause();});
window.addEventListener('pageshow',()=>render());
mobile.addEventListener('change',render);
render();mountReadingMode('main > details.advanced');
const presentation=mountPresentationFrame({root:'.lab',visual:'.scene-wrap',transport:'.transport'});
const readingMode=document.querySelector<HTMLElement>('.reading-mode-disclosure');
if(presentation&&readingMode){const controls=readingMode.querySelector<HTMLElement>('.reading-mode');if(controls){controls.dataset.readerMenu='options';presentation.mode.toolbar.prepend(controls);}readingMode.remove();}

if(presentation){
 const progressLabel=document.querySelector<HTMLLabelElement>('label[for="progress"]');
 progressLabel?.append(input('progress'));
 const caption=el('status');caption.dataset.readerCaption='';
 presentation.stage.insertBefore(caption,presentation.stage.querySelector('.presentation-transport'));
}
