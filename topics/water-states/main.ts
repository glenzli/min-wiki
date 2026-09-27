import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { clamp, phaseState, moleculePosition, icePosition, waterRoute, routeMoleculePosition, type Process } from './model.ts';
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
process.add(new Option(t('敞口杯到冷盖：追踪这份水'),'route'),1);
const pathNav=document.createElement('nav');
pathNav.className='scene-paths';pathNav.setAttribute('aria-label',t('选择观察路径'));
for(const [value,label] of [['experiment',t('冰水与热量')],['route',t('从水面到冷盖')],['melt',t('单独看局部')]] as const){
 const button=document.createElement('button');button.type='button';button.dataset.path=value;button.textContent=label;pathNav.append(button);
}
document.querySelector('.lab')!.prepend(pathNav);
const routeBoundary=document.createElement('p');routeBoundary.id='route-boundary';routeBoundary.className='observation-boundary';routeBoundary.hidden=true;
routeBoundary.textContent=t('这是另一杯敞口水的定性路径：杯中水减少，部分水汽遇到后来放上的冷盖形成液滴。水位、标记和进度为示意；不沿用冰水实验的 100 g 热量账本。');
el('heat-boundary').after(routeBoundary);
el('heat-controls').lastElementChild!.textContent=t('换条件保留此刻的冰和水，再点播放继续观察。这是冰水热量实验；从水面到冷盖是另一杯水。');
const routeMechanism=document.createElement('section');routeMechanism.id='route-mechanism';routeMechanism.className='route-mechanism';routeMechanism.hidden=true;
const routeHeading=document.createElement('h3');routeHeading.textContent=t('蒸发与凝结的条件');
const routeTheory=document.createElement('p');routeTheory.textContent=t('蒸发是液面上的净分子通量；温度、湿度、气流与面积会改变其速率。冷盖附近的水汽若达到局部饱和，就有机会在表面凝结，但并非离杯的水都会回到盖下。');
const routeFormula=document.createElement('p');routeFormula.className='route-formula';routeFormula.textContent=t('相对湿度 RH = pᵥ / pₛₐₜ(T)；当 pᵥ ≥ pₛₐₜ(T_lid)，冷表面可能凝结。');
const routeLimit=document.createElement('p');routeLimit.textContent=t('这只是近似判据。要求真实速率，还需要局部水汽分压、传热、扩散与气流边界；本动画不计算这些量。');
routeMechanism.append(routeHeading,routeTheory,routeFormula,routeLimit);routeBoundary.after(routeMechanism);
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
svg('g',{id:'route-trace','aria-hidden':'true'},'scene');
svg('path',{id:'route-trail',fill:'none',stroke:'#bc8940','stroke-width':'2','stroke-dasharray':'4 6',opacity:'.65'},'route-trace');
svg('circle',{id:'route-ring',r:'13',fill:'none',stroke:'#b8782e','stroke-width':'2'},'route-trace');
svg('circle',{id:'route-dot',r:'5',fill:'#f7c96f',stroke:'#855522','stroke-width':'1.5'},'route-trace');
const routeLabel=svg('text',{id:'route-label',fill:'#6e4d24','font-size':'15'},'route-trace');
routeLabel.textContent=t('追踪这份水');
routeLabel.setAttribute('text-anchor','end');
let heatSegment:HeatSegment={initialLiquid:.5,condition:'warm'}, heatProgress=0;
function update(){
  const experiment=process.value==='experiment';
  const route=process.value==='route', routeProgress=Number(range.value)/100, routeView=waterRoute(routeProgress);
  if(experiment)heatProgress=Number(range.value)/100;
  const thermal=heatState(heatSegment,heatProgress);
  const kind:Process=experiment?'freeze':route?'evaporate':process.value as Process,p=experiment?thermal.ice:route?routeView.evaporation*.4:Number(range.value)/100,s=route?routeView.cup:phaseState(kind,p);
  const academic=document.documentElement.dataset.readingMode==='academic';
  el('heat-controls').hidden=!experiment;el('heat-readout').hidden=!academic;el('heat-boundary').hidden=!experiment||!academic;routeBoundary.hidden=!route||!academic;routeMechanism.hidden=!route||!academic;
  document.querySelectorAll<HTMLButtonElement>('[data-path]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.path===(experiment?'experiment':route?'route':'melt'))));
  el('ice-observation').querySelector<HTMLElement>('.ice-stages')!.hidden=experiment;
  document.querySelectorAll<HTMLButtonElement>('[data-heat-condition]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.heatCondition===heatSegment.condition)));
  setText('heat-readout',t('冰 {{ice}} g · 液态水 {{water}} g · 本段交换热量 {{heat}} kJ',{ice:thermal.iceMass.toFixed(0),water:thermal.liquidMass.toFixed(0),heat:(thermal.heat/1000).toFixed(1)}));
  const lidArrival=route?clamp((routeProgress-.47)/.2):kind==='condense'?1:0;
  attr('lid','display',lidArrival>0?'block':'none');attr('lid','opacity',lidArrival);attr('lid','transform',`translate(0 ${-34*(1-lidArrival)})`);
  iceRenderer.update(s,showGrains.checked);
  attr('water-surface','cy',s.top);attr('water-surface','rx',Math.max(124,150-(s.top-145)*.1));attr('water-surface','opacity',1-clamp(s.ice*16));
  el('ice-observation').hidden=experiment||route||kind!=='melt'&&kind!=='freeze';
  setText('progress-value',`${Math.round(Number(range.value))}%`);
  setText('ice-detail-note',showGrains.checked?t('虚线标出不同晶粒相遇的位置；它们不是裂开的缝。'):t('透亮的区域也是冰。细小气泡与晶粒边界是两回事。'));
  const position=(index:number)=>route?routeMoleculePosition(index,routeProgress):moleculePosition(index,kind,p);
  molecules.forEach((node,i)=>{const m=position(i);node.setAttribute('transform',`translate(${m.x} ${m.y}) rotate(${(1-m.order)*Math.sin(i*3+p*8)*45})`);});
  bonds.forEach((node,i)=>{const [first,second]=neighbours[i],a=position(first),b=position(second);node.setAttribute('d',`M${a.x} ${a.y}L${b.x} ${b.y}`);node.setAttribute('opacity',String(Math.min(a.order,b.order)*.7));});
  attr('micro-water','opacity',kind==='condense'?0:kind==='evaporate'?.6:.6*(1-s.ice));
  attr('micro-lid','opacity',route?lidArrival:kind==='condense'?1:0);
  attr('micro-drops','opacity',route?routeView.condensation*.45:kind==='condense'?p*.45:0);
  vapor.forEach((node,i)=>{
    const f=clamp(((route?routeView.evaporation:p)-i*.055)/.34),x=175+(i*47)%250;
    const visible=kind==='evaporate'?Math.sin(Math.PI*f)*.7*(route?1-routeView.condensation*.5:1):0;
    node.setAttribute('opacity',String(visible));
    node.setAttribute('transform',`translate(${x+Math.sin(i)*f*32} ${s.top-f*175}) rotate(${i*29+f*40})`);
  });
  drops.forEach((node,i)=>{const f=route?clamp((routeView.condensation-i*.055)*2.2):kind==='condense'?clamp((p-i*.055)*2.2):0;node.setAttribute('transform',`translate(${167+i*29} ${112-7*Math.sin(i/9*Math.PI)}) scale(${Math.sqrt(f)})`);});
  attr('route-trace','display',route?'block':'none');
  if(route){
    const leaving=clamp((routeProgress-.06)/.49),settling=routeView.condensation;
    const dotX=settling>0?350-54*settling:300+50*Math.sin(leaving*Math.PI/2);
    const dotY=settling>0?145-25*settling:s.top-14+(145-(s.top-14))*leaving;
    for(const id of ['route-ring','route-dot']){attr(id,'cx',dotX);attr(id,'cy',dotY);}
    attr('route-trail','d',`M300 ${s.top-10}Q365 190 ${dotX} ${dotY}`);
    attr('route-label','x',dotX-19);attr('route-label','y',settling>0?dotY+54:dotY-13);
  }
  setText('environment',kind==='melt'?t('温暖的房间'):kind==='freeze'?t('冷冻室'):kind==='evaporate'?t('敞口的杯子'):t('冷盖子下方'));
  setText('state',kind==='condense'?t('冷盖子上出现小水滴'):kind==='evaporate'?t('水面降低，水进入空气'):s.ice>.98?t('固态：冰'):s.ice<.02?t('液态：水'):t('冰和水在一起'));
  setText('readout',kind==='melt'?t('沿着冰水交界看：晶粒的末端慢慢退去，液态水越来越多。'):kind==='freeze'?t('小晶粒先在表面长出，逐渐相接。冰水交界继续向下推进，透亮的冰层越来越厚。'):kind==='evaporate'?t('看，水分子从水面离开，散到空气里。它们还是水；真实的水蒸气看不见。'):t('分散的水分子遇到冷表面，聚在一起成为小水滴。'));
  if(experiment){
    setText('environment',heatSegment.condition==='warm'?t('热量进入这份水'):heatSegment.condition==='cold'?t('热量离开这份水'):t('没有热量交换'));
    setText('readout',academic?(heatSegment.condition==='insulated'?t('理想隔热时，这份冰水的比例保持不变。播放不会让冰自己融化。'):heatSegment.condition==='warm'?t('热量进入，更多冰变成液态水。冰水共存时，吸热不意味着温度持续升高。'):t('热量离开，更多液态水变成冰。换条件后仍然观察同一份水。')):heatSegment.condition==='insulated'?t('没有热量进出，冰和水的多少就不变。'):heatSegment.condition==='warm'?t('给这杯冰水供热，冰渐渐变少。'):t('从这杯冰水取热，冰渐渐变多。'));
  }
  if(route){
    const lid=routeProgress>=.58;
    setText('environment',lidArrival>0?t('冷盖靠近杯口'):t('敞口杯中的水'));
    setText('state',lid?t('冷盖下出现水滴'):routeProgress>0?t('部分水进入空气'):t('杯中的液态水'));
    setText('readout',lid?(academic?t('把冷盖放到水汽附近后，其中一部分遇冷凝结在盖下；这是同一杯水的定性示意，不能由图中水位推算真实速率或收集率。'):t('冷盖靠近后，有些看不见的水汽在盖下变成小水珠。')):routeProgress===0&&!academic?t('现在杯中还是液态水。慢慢向前，看它怎样进入空气。'):academic?t('开放杯中的水可在沸点以下从表面蒸发；金色标记追踪一小份水，气态水本身不可见。水位降低经过夸张。'):t('有些水从杯面进入空气。金色点帮我们追踪它，真正的水汽看不见。'));
  }
  setText('micro-caption',route?(routeView.condensation>0?t('同一批水分子中的一部分在冷盖下重新靠近，形成液滴。'):t('有些水分子离开液面，间距变大；分子没有变成别的物质。')):kind==='melt'||kind==='freeze'?t('在冰中有序排列，在液态水中彼此靠近、位置会变。'):kind==='evaporate'?t('从水面离开后，分子之间的距离变大。'):t('气态分子靠近冷表面，逐渐聚成液态水。'));
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
pathNav.querySelectorAll<HTMLButtonElement>('[data-path]').forEach(button=>button.addEventListener('click',()=>{
  stop();process.value=button.dataset.path!;range.value=process.value==='experiment'?String(heatProgress*100):'0';update();
}));
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


let showMolecules=document.documentElement.dataset.readingMode==='academic';
function setMolecularView(){el('molecular-view').hidden=!showMolecules;document.querySelector('.observation-grid')!.classList.toggle('without-molecules',!showMolecules);attr('scene','viewBox',showMolecules?'90 65 420 410':'110 65 380 410');el('molecular-toggle').textContent=showMolecules?t('收起分子图'):t('放大看水分子');el('molecular-toggle').setAttribute('aria-expanded',String(showMolecules));}
el('molecular-toggle').addEventListener('click',()=>{showMolecules=!showMolecules;setMolecularView();});setMolecularView();update();
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  showMolecules=button.dataset.mode==='academic';setMolecularView();update();
}));

mountPresentationFrame({"root": ".lab", "visual": ".observation-grid", "paired": true, "choices": ".scene-paths", "transport": "#play,#restart"});
