import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { clamp, phaseState, moleculePosition, icePosition, type Process } from './model.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { createIceRenderer } from './iceRenderer.ts';
import './style.css';
import { heatState, changeCondition, type HeatSegment, type HeatCondition } from './heatModel.ts';
translateDocument(t);
mountTopicNavigation('water-states');
const el = (id: string) => document.getElementById(id)!;
const setText=(id:string,value:string)=>{if(el(id).textContent!==value)el(id).textContent=value;};
const range=el('progress') as HTMLInputElement;
const process=el('process') as HTMLSelectElement;
const showGrains=el('show-grains') as HTMLInputElement;
const iceRenderer=createIceRenderer(el('ice') as unknown as SVGGElement,el('water') as unknown as SVGPathElement);
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
let heatSegment:HeatSegment={initialLiquid:.5,condition:'warm'}, heatProgress=0;
function update(){
  const experiment=process.value==='experiment';
  if(experiment)heatProgress=Number(range.value)/100;
  const thermal=heatState(heatSegment,heatProgress);
  const kind:Process=experiment?'freeze':process.value as Process,p=experiment?thermal.ice:Number(range.value)/100,s=phaseState(kind,p);
  el('heat-controls').hidden=!experiment;el('heat-boundary').hidden=!experiment;
  el('ice-observation').querySelector<HTMLElement>('.ice-stages')!.hidden=experiment;
  document.querySelectorAll<HTMLButtonElement>('[data-heat-condition]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.heatCondition===heatSegment.condition)));
  setText('heat-readout',t('冰 {{ice}} g · 液态水 {{water}} g · 本段交换热量 {{heat}} kJ',{ice:thermal.iceMass.toFixed(0),water:thermal.liquidMass.toFixed(0),heat:(thermal.heat/1000).toFixed(1)}));
  attr('lid','display',kind==='condense'?'block':'none');
  iceRenderer.update(s,showGrains.checked);
  attr('water-surface','cy',s.top);attr('water-surface','rx',Math.max(124,150-(s.top-145)*.1));attr('water-surface','opacity',1-clamp(s.ice*16));
  el('ice-observation').hidden=kind!=='melt'&&kind!=='freeze';
  setText('progress-value',`${Math.round(Number(range.value))}%`);
  setText('ice-detail-note',showGrains.checked?t('虚线标出不同晶粒相遇的位置；它们不是裂开的缝。'):t('透亮的区域也是冰。细小气泡与晶粒边界是两回事。'));
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
  setText('readout',kind==='melt'?t('沿着冰水交界看：晶粒的末端慢慢退去，液态水越来越多。'):kind==='freeze'?t('小晶粒先在表面长出，逐渐相接。冰水交界继续向下推进，透亮的冰层越来越厚。'):kind==='evaporate'?t('看，水分子从水面离开，散到空气里。它们还是水；真实的水蒸气看不见。'):t('分散的水分子遇到冷表面，聚在一起成为小水滴。'));
  if(experiment){
    setText('environment',heatSegment.condition==='warm'?t('热量进入这份水'):heatSegment.condition==='cold'?t('热量离开这份水'):t('没有热量交换'));
    setText('readout',heatSegment.condition==='insulated'?t('理想隔热时，这份冰水的比例保持不变。播放不会让冰自己融化。'):heatSegment.condition==='warm'?t('热量进入，更多冰变成液态水。冰水共存时，吸热不意味着温度持续升高。'):t('热量离开，更多液态水变成冰。换条件后仍然观察同一份水。'));
  }
  setText('micro-caption',kind==='melt'||kind==='freeze'?t('在冰中有序排列，在液态水中彼此靠近、位置会变。'):kind==='evaporate'?t('从水面离开后，分子之间的距离变大。'):t('气态分子靠近冷表面，逐渐聚成液态水。'));
}
let frame=0,playing=false;
let cancelStage: (()=>void)|undefined;
function stop(){cancelStage?.();cancelStage=undefined;cancelAnimationFrame(frame);playing=false;el('play').textContent=t('慢慢播放');el('play').setAttribute('aria-pressed','false');}
function reset(){stop();if(process.value==='experiment'){heatSegment={initialLiquid:.5,condition:heatSegment.condition};heatProgress=0;}range.value='0';update();}
showGrains.addEventListener('change',update);
document.querySelectorAll<HTMLButtonElement>('[data-ice-stage]').forEach(button=>button.addEventListener('click',()=>{
  stop();
  const target=Number(button.dataset.iceStage);
  const from=Number(range.value),to=process.value==='melt'?100-target:target;
  cancelStage=animateValue({from,to,duration:900,onUpdate:value=>{range.value=String(value);update();},onComplete:()=>{cancelStage=undefined;}});
}));
range.addEventListener('input',()=>{stop();update();});process.addEventListener('change',()=>{stop();range.value=process.value==='experiment'?String(heatProgress*100):'0';update();});el('restart').addEventListener('click',reset);
el('play').addEventListener('click',()=>{
  if(playing){stop();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){range.value='100';update();return;}if(Number(range.value)>=100)range.value='0';
  playing=true;el('play').textContent=t('暂停');el('play').setAttribute('aria-pressed','true');
  let last=performance.now(),progress=Number(range.value);
  const tick=(now:number)=>{progress=Math.min(100,progress+Math.min(now-last,100)/200);range.value=String(progress);last=now;update();if(Number(range.value)<100)frame=requestAnimationFrame(tick);else stop();};
  frame=requestAnimationFrame(tick);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
update();mountReadingMode('details:not(.references)');

document.querySelectorAll<HTMLButtonElement>('[data-heat-condition]').forEach(b=>b.addEventListener('click',()=>{stop();heatSegment=changeCondition(heatSegment,heatProgress,b.dataset.heatCondition as HeatCondition);heatProgress=0;range.value='0';update();}));


let showMolecules=!matchMedia('(max-width:760px)').matches;
function setMolecularView(){el('molecular-view').hidden=!showMolecules;document.querySelector('.observation-grid')!.classList.toggle('without-molecules',!showMolecules);el('molecular-toggle').textContent=showMolecules?t('收起分子图'):t('放大看水分子');el('molecular-toggle').setAttribute('aria-expanded',String(showMolecules));}
el('molecular-toggle').addEventListener('click',()=>{showMolecules=!showMolecules;setMolecularView();});setMolecularView();

mountPresentationFrame({"root": ".lab", "visual": ".observation-grid", "paired": true, "transport": "#play,#restart"});
