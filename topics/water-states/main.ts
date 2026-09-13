import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { clamp, phaseState, moleculePosition, icePosition, type Process } from './model.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation('water-states');
const el = (id: string) => document.getElementById(id)!;
const setText=(id:string,value:string)=>{if(el(id).textContent!==value)el(id).textContent=value;};
const range=el('progress') as HTMLInputElement;
const process=el('process') as HTMLSelectElement;
const attr=(id:string,key:string,value:string|number)=>el(id).setAttribute(key,String(value));
const svg=(name:string, attrs:Record<string,string>, parent:string)=>{
  const node=document.createElementNS('http://www.w3.org/2000/svg',name);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);
  el(parent).append(node);return node;
};
const molecules=Array.from({length:36},()=>svg('use',{href:'#molecule'},'molecules'));
const neighbours: [number,number][]=[];
for(let a=0;a<36;a++)for(let b=a+1;b<36;b++){
  const x=icePosition(a),y=icePosition(b);
  if(Math.hypot(x.x-y.x,x.y-y.y)<29)neighbours.push([a,b]);
}
const bonds=neighbours.map(()=>svg('path',{stroke:'#90b8c1','stroke-width':'1.2','stroke-dasharray':'3 4',fill:'none'},'bonds'));
const vapor=Array.from({length:12},()=>svg('use',{href:'#vapor-molecule'},'vapor'));
const drops=Array.from({length:10},()=>svg('path',{d:'M0 0C-2 5-7 10-7 15A7 7 0 0 0 7 15C7 10 2 5 0 0Z',fill:'#a5dce4',stroke:'#6cabbc','stroke-width':'1'},'droplets'));
function update(){
  const kind=process.value as Process,p=Number(range.value)/100,s=phaseState(kind,p);
  attr('lid','display',kind==='condense'?'block':'none');
  attr('water','y',s.front);attr('water','height',s.liquidDepth);
  attr('water-surface','cy',s.top);attr('water-surface','opacity',1-s.ice);
  // One connected ice slab grows down into the remaining liquid.
  const ripple=Math.sin(Math.PI*s.ice)*4;
  const outline=`M150 ${s.top}Q300 ${s.top-9} 450 ${s.top}V${s.front}Q375 ${s.front+ripple} 300 ${s.front}T150 ${s.front}Z`;
  attr('ice-shape','d',outline);attr('ice-boundary','d',outline);attr('ice','opacity',clamp(s.ice*25));
  molecules.forEach((node,i)=>{const m=moleculePosition(i,kind,p);node.setAttribute('transform',`translate(${m.x} ${m.y}) rotate(${(1-m.order)*Math.sin(i*3+p*8)*45})`);});
  bonds.forEach((node,i)=>{const [first,second]=neighbours[i],a=moleculePosition(first,kind,p),b=moleculePosition(second,kind,p);node.setAttribute('d',`M${a.x} ${a.y}L${b.x} ${b.y}`);node.setAttribute('opacity',String(Math.min(a.order,b.order)*.7));});
  attr('micro-water','opacity',kind==='condense'?0:kind==='evaporate'?.6:.6*(1-s.ice));
  attr('micro-lid','opacity',kind==='condense'?1:0);
  attr('micro-drops','opacity',kind==='condense'?p*.45:0);
  vapor.forEach((node,i)=>{
    const f=clamp((p-i*.055)/.34),x=175+(i*47)%250;
    const visible=kind==='evaporate'?Math.sin(Math.PI*f)*.7:0;
    node.setAttribute('opacity',String(visible));
    node.setAttribute('transform',`translate(${x+Math.sin(i)*f*32} ${s.top-f*175}) rotate(${i*29+f*40})`);
  });
  drops.forEach((node,i)=>{const f=kind==='condense'?clamp((p-i*.055)*2.2):0;node.setAttribute('transform',`translate(${167+i*29} ${112-7*Math.sin(i/9*Math.PI)}) scale(${Math.sqrt(f)})`);});
  setText('environment',kind==='melt'?t('温暖的房间'):kind==='freeze'?t('冷冻室'):kind==='evaporate'?t('敞口的杯子'):t('冷盖子下方'));
  setText('state',kind==='condense'?t('冷盖子上出现小水滴'):kind==='evaporate'?t('水面降低，水进入空气'):s.ice>.98?t('固态：冰'):s.ice<.02?t('液态：水'):t('冰和水在一起'));
  setText('readout',kind==='melt'?t('连成一体的冰慢慢融化，液态水越来越多。'):kind==='freeze'?t('水面先出现薄冰，冰层逐渐向里面长厚，最后整杯水结成冰。'):kind==='evaporate'?t('看，水分子从水面离开，散到空气里。它们还是水；真实的水蒸气看不见。'):t('分散的水分子遇到冷表面，聚在一起成为小水滴。'));
  setText('micro-caption',kind==='melt'||kind==='freeze'?t('在冰中有序排列，在液态水中彼此靠近、位置会变。'):kind==='evaporate'?t('从水面离开后，分子之间的距离变大。'):t('气态分子靠近冷表面，逐渐聚成液态水。'));
}
let frame=0,playing=false;
function stop(){cancelAnimationFrame(frame);playing=false;el('play').textContent=t('慢慢播放');el('play').setAttribute('aria-pressed','false');}
function reset(){stop();range.value='0';update();}
range.addEventListener('input',()=>{stop();update();});process.addEventListener('change',reset);el('restart').addEventListener('click',reset);
el('play').addEventListener('click',()=>{
  if(playing){stop();return;}if(Number(range.value)>=100)range.value='0';
  playing=true;el('play').textContent=t('暂停');el('play').setAttribute('aria-pressed','true');
  let last=performance.now(),progress=Number(range.value);
  const tick=(now:number)=>{progress=Math.min(100,progress+Math.min(now-last,100)/200);range.value=String(progress);last=now;update();if(Number(range.value)<100)frame=requestAnimationFrame(tick);else stop();};
  frame=requestAnimationFrame(tick);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
update();mountReadingMode('details:not(.references)');
