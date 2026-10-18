import {create2DMotion} from '@glenzli/wiki-reader/animation2d';
import {HOP_COUNT,stationForPosition,type Part,type Conditions,type JourneyState,type BlockedAt} from './model.ts';
export type Point={x:number;y:number};
export type NetworkCoordinates=Record<'sender'|'a'|'b'|'source'|'service'|'destination'|'receiverStation'|'receiver',Point>;
export function networkCoordinates(position:number,compact:boolean): NetworkCoordinates {
  const q=position/100;
  return compact ? {sender:{x:65+q*48,y:150},a:{x:235,y:93},b:{x:440,y:93},source:{x:335,y:282},service:{x:145,y:441},destination:{x:403,y:542},receiverStation:{x:183,y:697},receiver:{x:450,y:697}} : {sender:{x:90+q*110,y:354},a:{x:155,y:135},b:{x:303,y:158},source:{x:349,y:360},service:{x:510,y:156},destination:{x:639,y:360},receiverStation:{x:808,y:137},receiver:{x:888,y:354}};
}

export function partRoute(part:Part,c:NetworkCoordinates,position:number):Point[]{return [c.sender,c[part.station??stationForPosition(position)],c.source,c.service,c.destination,c.receiverStation,c.receiver];}
export function packetPosition(part:Part,c:NetworkCoordinates,position:number,fraction:number){
 const path=partRoute(part,c,position),a=path[part.hop]!,b=path[Math.min(HOP_COUNT,part.hop+1)]!;
 const f=Number.isFinite(fraction)?Math.max(0,Math.min(1,fraction)):0;
 const anchor={x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};
 const start=part.hop===0||part.hop===HOP_COUNT?73:58,end=part.hop+1===HOP_COUNT?73:58;
 return {anchor,x:anchor.x+(part.id-2)*25,y:anchor.y-start-(end-start)*f};
}

export function createNetworkScene(scene:SVGSVGElement,t:(s:string)=>string){
 let compact=false,conditions:Conditions={senderOnline:true,backboneOnline:true,receiverOnline:true,position:10};
 let state:JourneyState={completedSteps:0,parts:[],read:false},blocked:BlockedAt=null,layoutKey='';
 const progress={value:0},motion=create2DMotion({duration:1000}).add(progress,{value:[0,1],ease:'inOutSine'});
 scene.replaceChildren();
 const ns='http://www.w3.org/2000/svg';
 const artwork=document.createElementNS(ns,'g');scene.append(artwork);
function node<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string,string|number>, parent: SVGElement = artwork): SVGElementTagNameMap[K] {
  const n = document.createElementNS(ns, tag);
  for (const [key,value] of Object.entries(attrs)) n.setAttribute(key, String(value));
  parent.append(n); return n;
}
function label(text: string, x: number, y: number, parent: SVGElement = artwork, className = 'node-label') {
  const n = node('text',{x,y,'text-anchor':'middle',class:className},parent);
  text.split('|').forEach((line,i) => { const span=node('tspan',{x,dy:i ? (compact ? 27 : 22) : 0},n);span.textContent=line; });
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
  node('path',{d:'M -38 -10 L -18 7 L 40 -5',fill:'none',stroke:'#ffffff','stroke-width':1.2,opacity:.7},g);
  node('path',{d:'M -13 17 L 35 6 M -13 21 L 35 10',fill:'none',stroke:'#719889','stroke-width':1.2,opacity:.6},g);
  for(let i=0;i<3;i++)node('rect',{x:-8+i*12,y:15-i*2.6,width:8,height:5,rx:1,fill:'#3e6354',stroke:'#bfd2c2','stroke-width':.6,transform:'skewY(-12)'},g);
  label(text,0,64,g);
}
function service(p: Point) {
  const g=node('g',{transform:`translate(${p.x} ${p.y})`});
  node('ellipse',{cx:0,cy:40,rx:64,ry:14,fill:'#cfdbd4'},g);
  node('path',{d:'M -46 -32 L 28 -44 L 49 -23 L -25 -10 Z',fill:'#ebefe7',stroke:'#849787','stroke-width':2},g);
  node('path',{d:'M -46 -32 V 25 L -25 44 V -10 M -25 44 L 49 31 V -23',fill:'#b8c8bb',stroke:'#849787','stroke-width':2,'stroke-linejoin':'round'},g);
  for(let col=0;col<3;col++)for(let row=0;row<3;row++)node('rect',{x:-18+col*19,y:-3+row*11,width:14,height:7,rx:1,fill:row===1?'#73948b':'#52736a'},g);
  node('path',{d:'M -43 -31 L -25 -13 L 46 -25 M -23 42 L 46 29',fill:'none',stroke:'#f5f8ef','stroke-width':1.3,opacity:.8},g);
  for(let row=0;row<3;row++){node('path',{d:`M -19 ${-5+row*11} L 37 ${-14+row*11}`,stroke:'#d4dfd3','stroke-width':.8,opacity:.65},g);node('circle',{cx:40,cy:-6+row*11,r:1.5,fill:'#dfd0a0'},g);}
  label(t('网络与服务'),0,77,g);
}
function coordinates(): NetworkCoordinates {
  return networkCoordinates(conditions.position,compact);
}

function drawArtwork() {
  artwork.replaceChildren();
  const c=coordinates(), width=compact?560:980,height=compact?830:530;
  // The wide route's useful bounds include the packet docks and bottom labels.
  // Crop unused sky/ground so a short desktop stage does not shrink its text.
  scene.setAttribute('viewBox',compact?`0 0 ${width} ${height}`:'0 48 980 420');
  const description=node('desc',{});description.textContent=t('消息通过本地无线接入和中间网络，不直接从一部手机跳到另一部手机。编号保持不变；位置、时间和数量为示意。');
  const defs=node('defs',{}),gradient=node('linearGradient',{id:'mobile-sky',x2:0,y2:1},defs);
  node('stop',{offset:0,'stop-color':'#f4f7ef'},gradient);node('stop',{offset:1,'stop-color':'#e6eee4'},gradient);
  node('rect',{width,height,fill:'url(#mobile-sky)'});
  // A quiet street and building silhouettes give antennas a real-world anchor, not a metric coverage map.
  for(let i=0;i<7;i++){
    const x=compact?i*83:34+i*140,y=compact?355:435,h=31+(i%3)*15;
    node('rect',{x,y:y-h,width:compact?62:85,height:h,rx:3,fill:'#d6e1d5',opacity:.5});
    for(let k=0;k<3;k++)node('rect',{x:x+9+k*15,y:y-h+12,width:6,height:7,fill:'#f1f5ed'});
  }
  const streetY=compact?197:427;
  node('path',{d:`M 0 ${streetY} H ${compact?154:268}`,stroke:'#d3ded1','stroke-width':32});
  node('path',{d:`M 0 ${streetY} H ${compact?154:268}`,stroke:'#f5f8ef','stroke-width':2,'stroke-dasharray':'16 14'});
  const wire=(a:Point,b:Point,on:boolean)=>node('path',{d:`M ${a.x} ${a.y} L ${b.x} ${b.y}`,stroke:on?'#659d86':'#b5c6ba','stroke-width':6,'stroke-linecap':'round',fill:'none','stroke-dasharray':on?'':'8 9'});
  wire(c.a,c.source,conditions.backboneOnline);wire(c.b,c.source,conditions.backboneOnline);
  wire(c.source,c.service,conditions.backboneOnline);wire(c.service,c.destination,conditions.backboneOnline);wire(c.destination,c.receiverStation,conditions.backboneOnline);
  const radio=(a:Point,b:Point,on:boolean)=>node('path',{d:`M ${a.x} ${a.y} L ${b.x} ${b.y}`,stroke:on?'#b18a47':'#b5bdb1','stroke-width':3,'stroke-dasharray':'7 8',fill:'none'});
  const station=stationForPosition(conditions.position);
  radio(c.sender,c[station],conditions.senderOnline);radio(c.receiverStation,c.receiver,conditions.receiverOnline);
  tower(c.a,t('基站 A'),station==='a'&&conditions.senderOnline);
  tower(c.b,t('基站 B'),station==='b'&&conditions.senderOnline);
  network(c.source,t('本机的网络'));service(c.service);network(c.destination,t('对方的网络'));
  tower(c.receiverStation,t('对方基站'),conditions.receiverOnline,true);
  phone(c.sender,true,conditions.senderOnline);phone(c.receiver,false,conditions.receiverOnline);
  const active=state.parts.find(p=>p.hop<HOP_COUNT);
  if(active && blocked){
    const path=partRoute(active,c,conditions.position),a=path[active.hop]!,b=path[active.hop+1]!,x=(a.x+b.x)/2,y=(a.y+b.y)/2;
    node('circle',{cx:x,cy:y,r:17,fill:'#fbf2e5',stroke:'#b18542','stroke-width':2});
    node('path',{d:`M ${x-6} ${y-6} L ${x+6} ${y+6} M ${x+6} ${y-6} L ${x-6} ${y+6}`,stroke:'#9c7435','stroke-width':3});
  }
}

 const guide=node('path',{fill:'none',stroke:'#7ca4b9','stroke-width':2,'stroke-linecap':'round',opacity:0},scene);
 const parts=Array.from({length:3},(_,i)=>{
  const connector=node('path',{stroke:'#426f98','stroke-width':1.5,opacity:.5},scene);
  const group=node('g',{'data-part':i+1},scene);
  node('ellipse',{cx:1,cy:16,rx:12,ry:3,fill:'#334f69',opacity:.14},group);
  node('rect',{x:-12,y:-13,width:24,height:26,rx:6,fill:'#376eac',stroke:'#fff','stroke-width':2},group);
  node('path',{d:'M-7 -9 H6',stroke:'#a5c4df','stroke-width':1.4,'stroke-linecap':'round'},group);
  label(String(i+1),0,6,group,'packet-label');
  return {connector,group};
 });
 return {render(next:JourneyState,nextConditions:Conditions,nextBlocked:BlockedAt,phase:number,isCompact:boolean,reducedMotion=false){
  state=next;conditions=nextConditions;blocked=nextBlocked;compact=isCompact;
  const key=JSON.stringify([compact,conditions,blocked,state.parts.find(p=>p.hop<HOP_COUNT)?.hop]);
  if(key!==layoutKey){layoutKey=key;drawArtwork();}
  motion.seek(reducedMotion?0:phase*1000);
  const c=coordinates(),active=state.parts.find(p=>p.hop<HOP_COUNT),fraction=blocked?0:progress.value;
  for(const [i,part]of state.parts.entries()){
   const f=part.id===active?.id?fraction:0,p=packetPosition(part,c,conditions.position,f),nodes=parts[i]!;
   nodes.group.setAttribute('transform',`translate(${p.x} ${p.y})`);
   nodes.group.setAttribute('data-hop',String(part.hop));nodes.group.setAttribute('data-station',part.station??'pending');nodes.group.setAttribute('data-transit',String(f));
   nodes.connector.setAttribute('d',`M${p.anchor.x} ${p.anchor.y-12} L${p.x} ${p.y+10}`);
  }
  if(active&&fraction>0){const a=partRoute(active,c,conditions.position)[active.hop]!,p=packetPosition(active,c,conditions.position,fraction);guide.setAttribute('d',`M${a.x} ${a.y} L${p.anchor.x} ${p.anchor.y}`);guide.setAttribute('opacity','.55');}
  else guide.setAttribute('opacity','0');
 },dispose(){motion.dispose();}};
}
