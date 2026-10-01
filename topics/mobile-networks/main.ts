import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { MessageJourney, HOP_COUNT, TOTAL_STEPS, stationForPosition, type Part, type Station } from './model.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation('mobile-networks');
const journey = new MessageJourney();
const el = (id: string): HTMLElement => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const button = (id: string) => el(id) as HTMLButtonElement;
const scene = el('network-scene') as unknown as SVGSVGElement;
const mobile = matchMedia('(max-width: 700px)');
const ns = 'http://www.w3.org/2000/svg';
type Point = {x: number; y: number};
function node<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string,string|number>, parent: SVGElement = scene): SVGElementTagNameMap[K] {
  const n = document.createElementNS(ns, tag);
  for (const [key,value] of Object.entries(attrs)) n.setAttribute(key, String(value));
  parent.append(n); return n;
}
function label(text: string, x: number, y: number, parent: SVGElement = scene, className = 'node-label') {
  const n = node('text',{x,y,'text-anchor':'middle',class:className},parent);
  text.split('|').forEach((line,i) => { const span=node('tspan',{x,dy:i ? (mobile.matches ? 27 : 22) : 0},n);span.textContent=line; });
}
function tower(p: Point, name: string, active: boolean, receiver = false) {
  const g = node('g',{'transform':`translate(${p.x} ${p.y})`});
  node('ellipse',{cx:0,cy:40,rx:38,ry:9,fill:'#d3dbd2',opacity:.6},g);
  node('path',{d:'M -24 35 L 0 -35 L 24 35 M -17 16 H 17 M -12 -1 H 12 M -17 16 L 12 -1 M 17 16 L -12 -1 M -24 35 L 17 16 M 24 35 L -17 16',stroke:'#697c72','stroke-width':4,fill:'none','stroke-linejoin':'round'},g);
  node('rect',{x:-7,y:-54,width:14,height:40,rx:4,fill:active?'#d5ae64':'#b7c2b5',stroke:'#586c64','stroke-width':2},g);
  node('path',{d:'M -15 -45 Q -31 -33 -15 -21 M 15 -45 Q 31 -33 15 -21',fill:'none',stroke:active?'#b58b43':'#b7c2b5','stroke-width':3},g);
  label(name,0,77,g);
  if (!active && receiver) label(t('离线'),0,104,g,'offline-label');
}
function phone(p: Point, sender: boolean, connected: boolean) {
  const g=node('g',{transform:`translate(${p.x} ${p.y})`});
  node('ellipse',{cx:3,cy:57,rx:43,ry:10,fill:'#c4d2c8',opacity:.7},g);
  node('rect',{x:-36,y:-57,width:72,height:111,rx:13,fill:'#435d55',stroke:'#2f4942','stroke-width':2},g);
  node('rect',{x:-30,y:-49,width:60,height:91,rx:8,fill:'#fbfcf5'},g);
  node('rect',{x:-14,y:-45,width:28,height:5,rx:2.5,fill:'#708077'},g);
  node('path',{d:'M -19 -12 H 15 Q 22 -12 22 -5 V 11 Q 22 18 15 18 H -7 L -17 25 V 18 H -19 Q -24 18 -24 11 V -5 Q -24 -12 -19 -12',fill:sender?'#d4e3d8':'#dae6ed'},g);
  for(let i=0;i<3;i++)node('rect',{x:-17+i*11,y:0,width:7,height:5,rx:2,fill:connected?'#477a69':'#b5beb4'},g);
  node('circle',{cx:0,cy:48,r:2.5,fill:'#d9e3d7'},g);
  label(sender?t('本机'):t('对方手机'),0,88,g);
}
function network(p: Point, text: string) {
  const g=node('g',{transform:`translate(${p.x} ${p.y})`});
  node('ellipse',{cx:0,cy:28,rx:49,ry:10,fill:'#cfddd4'},g);
  node('path',{d:'M -40 -12 L 20 -23 L 42 -7 L -18 6 Z',fill:'#edf2e9',stroke:'#64897b','stroke-width':2},g);
  node('path',{d:'M -40 -12 V 13 L -18 31 L -18 6 M -18 31 L 42 17 V -7',fill:'#a9c7b8',stroke:'#64897b','stroke-width':2,'stroke-linejoin':'round'},g);
  node('path',{d:'M -12 -5 L 7 -9 M 0 -15 L 7 -9 L 3 -3',fill:'none',stroke:'#658376','stroke-width':3},g);
  for(let i=0;i<4;i++)node('rect',{x:-32+i*6,y:8+i*1.4,width:3,height:5,fill:'#477d6b'},g);
  label(text,0,64,g);
}
function service(p: Point) {
  const g=node('g',{transform:`translate(${p.x} ${p.y})`});
  node('ellipse',{cx:0,cy:40,rx:64,ry:14,fill:'#cfdbd4'},g);
  node('path',{d:'M -46 -32 L 28 -44 L 49 -23 L -25 -10 Z',fill:'#ebefe7',stroke:'#849787','stroke-width':2},g);
  node('path',{d:'M -46 -32 V 25 L -25 44 V -10 M -25 44 L 49 31 V -23',fill:'#b8c8bb',stroke:'#849787','stroke-width':2,'stroke-linejoin':'round'},g);
  for(let col=0;col<3;col++)for(let row=0;row<3;row++)node('rect',{x:-18+col*19,y:-3+row*11,width:14,height:7,rx:1,fill:row===1?'#73948b':'#52736a'},g);
  label(t('网络与服务'),0,77,g);
}
function coordinates(): {sender:Point,a:Point,b:Point,source:Point,service:Point,destination:Point,receiverStation:Point,receiver:Point} {
  const q=journey.conditions.position/100;
  return mobile.matches ? {sender:{x:65+q*48,y:150},a:{x:235,y:93},b:{x:440,y:93},source:{x:335,y:282},service:{x:145,y:441},destination:{x:403,y:542},receiverStation:{x:183,y:697},receiver:{x:450,y:697}} : {sender:{x:90+q*110,y:354},a:{x:155,y:135},b:{x:303,y:158},source:{x:349,y:360},service:{x:510,y:156},destination:{x:639,y:360},receiverStation:{x:808,y:137},receiver:{x:888,y:354}};
}
function route(part: Part, c: ReturnType<typeof coordinates>): Point[] { return [c.sender,c[part.station ?? stationForPosition(journey.conditions.position)],c.source,c.service,c.destination,c.receiverStation,c.receiver]; }
function draw() {
  scene.replaceChildren();
  const c=coordinates(), width=mobile.matches?560:980,height=mobile.matches?830:530;
  scene.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const description=node('desc',{});description.textContent=t('消息通过本地无线接入和中间网络，不直接从一部手机跳到另一部手机。编号保持不变；位置、时间和数量为示意。');
  const defs=node('defs',{}),gradient=node('linearGradient',{id:'mobile-sky',x2:0,y2:1},defs);
  node('stop',{offset:0,'stop-color':'#f4f7ef'},gradient);node('stop',{offset:1,'stop-color':'#e6eee4'},gradient);
  node('rect',{width,height,fill:'url(#mobile-sky)'});
  // A quiet street and building silhouettes give antennas a real-world anchor, not a metric coverage map.
  for(let i=0;i<7;i++){
    const x=mobile.matches?i*83:34+i*140,y=mobile.matches?355:435,h=31+(i%3)*15;
    node('rect',{x,y:y-h,width:mobile.matches?62:85,height:h,rx:3,fill:'#d6e1d5',opacity:.5});
    for(let k=0;k<3;k++)node('rect',{x:x+9+k*15,y:y-h+12,width:6,height:7,fill:'#f1f5ed'});
  }
  const streetY=mobile.matches?197:427;
  node('path',{d:`M 0 ${streetY} H ${mobile.matches?154:268}`,stroke:'#d3ded1','stroke-width':32});
  node('path',{d:`M 0 ${streetY} H ${mobile.matches?154:268}`,stroke:'#f5f8ef','stroke-width':2,'stroke-dasharray':'16 14'});
  const wire=(a:Point,b:Point,on:boolean)=>node('path',{d:`M ${a.x} ${a.y} L ${b.x} ${b.y}`,stroke:on?'#659d86':'#b5c6ba','stroke-width':6,'stroke-linecap':'round',fill:'none','stroke-dasharray':on?'':'8 9'});
  wire(c.a,c.source,journey.conditions.backboneOnline);wire(c.b,c.source,journey.conditions.backboneOnline);
  wire(c.source,c.service,journey.conditions.backboneOnline);wire(c.service,c.destination,journey.conditions.backboneOnline);wire(c.destination,c.receiverStation,journey.conditions.backboneOnline);
  const radio=(a:Point,b:Point,on:boolean)=>node('path',{d:`M ${a.x} ${a.y} L ${b.x} ${b.y}`,stroke:on?'#b18a47':'#b5bdb1','stroke-width':3,'stroke-dasharray':'7 8',fill:'none'});
  const station:Station=stationForPosition(journey.conditions.position);
  radio(c.sender,c[station],journey.conditions.senderOnline);radio(c.receiverStation,c.receiver,journey.conditions.receiverOnline);
  tower(c.a,t('基站 A'),station==='a'&&journey.conditions.senderOnline);
  tower(c.b,t('基站 B'),station==='b'&&journey.conditions.senderOnline);
  network(c.source,t('本机的网络'));service(c.service);network(c.destination,t('对方的网络'));
  tower(c.receiverStation,t('对方基站'),journey.conditions.receiverOnline,true);
  phone(c.sender,true,journey.conditions.senderOnline);phone(c.receiver,false,journey.conditions.receiverOnline);
  for(const part of journey.state.parts){
    const p=route(part,c)[part.hop]!;
    const x=p.x+(part.id-2)*25,y=p.y-(part.hop===0||part.hop===6?73:58);
    node('path',{d:`M ${p.x} ${p.y-12} L ${x} ${y+10}`,stroke:'#426f98','stroke-width':1.5,opacity:.5});
    const g=node('g',{'data-part':part.id,'data-hop':part.hop,'data-station':part.station??'pending',transform:`translate(${x} ${y})`});
    node('rect',{x:-12,y:-13,width:24,height:26,rx:6,fill:'#376eac',stroke:'#fff','stroke-width':2},g);
    label(String(part.id),0,6,g,'packet-label');
  }
  const active=journey.activePart;
  if(active && journey.blockedAt){
    const path=route(active,c),a=path[active.hop]!,b=path[active.hop+1]!,x=(a.x+b.x)/2,y=(a.y+b.y)/2;
    node('circle',{cx:x,cy:y,r:17,fill:'#fbf2e5',stroke:'#b18542','stroke-width':2});
    node('path',{d:`M ${x-6} ${y-6} L ${x+6} ${y+6} M ${x+6} ${y-6} L ${x-6} ${y+6}`,stroke:'#9c7435','stroke-width':3});
  }
}
const stageTitles=()=>[t('先把消息交给接入点'),t('基站也需要后面的路'),t('网络继续转发'),t('经过网络与消息服务'),t('找到对方的接入网络'),t('最后一段，再用无线电')];
const stageNotes=()=>[
 t('消息已准备好。本机用无线电接入附近能连接的基站，不是把文字直接抛到对方手机。'),
 t('这一部分到了基站。接下来经过本例的有线回程；基站不是旅程终点。'),
 t('这一部分到了发送方的网络。设备按照地址，把信息交给下一段网络。'),
 t('这一部分经过图中合并表示的网络与服务。真实应用的服务位置和数量各不相同。'),
 t('这一部分到了对方的网络。还需要到达对方能连接的基站。'),
 t('这一部分到了对方基站。对方手机接通时，最后一段无线接入才能完成。'),
];
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
  button('play').textContent=journey.playing?t('暂停旅程'):state.completedSteps===TOTAL_STEPS?t('回到起点播放'):state.completedSteps===0?t('开始旅程'):t('继续旅程');
  button('play').setAttribute('aria-pressed',String(journey.playing));
  button('step').disabled=state.completedSteps===TOTAL_STEPS||Boolean(journey.blockedAt);
  // Seeking recorded earlier states is a local replay. A new disconnected route cannot be completed by seeking ahead.
  button('play').disabled=Boolean(journey.blockedAt)&&state.completedSteps<TOTAL_STEPS;
  const status = journey.blockedAt==='sender'?t('本机待发送：还没有可用接入连接。'):journey.blockedAt==='network'?t('网络中等待：本例中间路径不通。'):journey.blockedAt==='receiver'?t('还没送达：对方接入连接未接通。'):journey.status==='read'?t('已送达 · 已模拟对方打开'):journey.status==='delivered'?t('已送达 · 还没有模拟对方打开'):journey.status==='pending'?t('待发送 · 三个编号都还在本机'):t('旅途中 · 对方收齐 {{arrived}} / 3 部分',{arrived});
  el('status').textContent=status;
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
  draw();
}
let frame=0,last=0;
function cancelFrame(){cancelAnimationFrame(frame);frame=0;}
function pause(){journey.pause();cancelFrame();render();}
function tick(now:number){frame=0;if(!journey.playing||document.hidden)return;const changed=journey.tick((now-last)/1000);last=now;if(changed)render();if(journey.playing)frame=requestAnimationFrame(tick);else render();}
button('play').addEventListener('click',()=>{if(journey.playing){pause();return;}if(journey.state.completedSteps===TOTAL_STEPS)journey.seek(0);journey.play();last=performance.now();cancelFrame();if(journey.playing)frame=requestAnimationFrame(tick);render();});
button('step').addEventListener('click',()=>{journey.pause();cancelFrame();journey.step();render();});
input('progress').addEventListener('input',()=>{cancelFrame();journey.seek(Number(input('progress').value));render();});
for(const [id,key] of [['sender-online','senderOnline'],['backbone-online','backboneOnline'],['receiver-online','receiverOnline']] as const)input(id).addEventListener('change',()=>{cancelFrame();journey.configure({[key]:input(id).checked});render();});
input('phone-position').addEventListener('input',()=>{cancelFrame();journey.configure({position:Number(input('phone-position').value)});render();});
button('read-message').addEventListener('click',()=>{journey.markRead();render();});
button('reset').addEventListener('click',()=>{cancelFrame();journey.configure({senderOnline:true,backboneOnline:true,receiverOnline:true,position:10});journey.reset();for(const id of ['sender-online','backbone-online','receiver-online'])input(id).checked=true;input('phone-position').value='10';render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',pause);
window.addEventListener('pageshow',()=>render());
mobile.addEventListener('change',render);
render();mountReadingMode('main > details.advanced');
mountPresentationFrame({root:'.lab',visual:'.scene-wrap',transport:'.transport'});
