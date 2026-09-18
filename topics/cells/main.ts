import './style.css';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { t } from './i18n.ts';
import { focusBox,wholeBox,mixBox,hasPart,hitPart,processFor,processState,respirationState,type Cell,type Part,type Process } from './model.ts';
import { createScene,setCameras,selectPart,drawProcess } from './scene.ts';
translateDocument(t);
const el = (id:string):HTMLElement=>document.getElementById(id)!;
function text(id:string,value:string){const node=el(id);if(node.textContent!==value)node.textContent=value;}
let cell:Cell='animal',part:Part='membrane',choice:Process='photosynthesis',outer=0,outerTarget=0;
let whole=wholeBox(cell),detail=focusBox(cell,part),playing=false,lastAnnouncement='';
const progress={animal:{respiration:0,photosynthesis:0},plant:{respiration:0,photosynthesis:0},bacterium:{respiration:0,photosynthesis:0}};
let cancelCamera=()=>{},cancelSurface=()=>{},cancelPlay=()=>{};
const cells = {
  animal: { name:t('动物细胞'), tag:t('身体里的一个小单位'), note:t('先找最外面的一圈膜，再找里面装着大部分 DNA 的细胞核。') },
  plant: { name:t('叶肉植物细胞'), tag:t('叶片里的一个小单位'), note:t('绿色的小椭圆是叶绿体。注意：这里看的是叶肉细胞，不是所有植物细胞。') },
  bacterium: { name:t('细菌细胞'), tag:t('一个细胞，也是一个生物'), note:t('它也有膜和 DNA，但 DNA 外面没有细胞核的膜。细菌也是细胞！') },
};
const partNames:Record<Part,string> = { membrane:t('细胞膜'), dna:'DNA', nucleus:t('细胞核'), chloroplast:t('叶绿体'), mitochondrion:t('线粒体'), vacuole:t('大液泡') };
const membrane = t('细胞膜把里面与外面分开，也调节一些物质的进出。它不是一堵完全封死的墙。');
const explanations: Record<Cell, Record<Part, string>> = {
  animal: {
    membrane,
    mitochondrion:t('线粒体有外膜和向内折叠的内膜，参与把营养物质中的能量转成细胞可用的形式。能量不是凭空制造的。'),
    vacuole:t('这个动物细胞没有像叶肉细胞那样占据中央的大液泡。动物细胞仍可有较小的囊泡。'),
    dna:t('DNA 携带遗传信息，参与指导细胞制造所需的物质。这个动物细胞的大部分 DNA 在细胞核里，少量在线粒体里。'),
    nucleus:t('这个动物细胞有一个膜包围的细胞核，大部分 DNA 保存在里面。细胞核不是会思考的小脑袋。'),
    chloroplast:t('动物细胞没有叶绿体。动物不能像绿色叶片那样靠叶绿体进行光合作用。'),
  },
  plant: {
    mitochondrion:t('植物细胞也有线粒体，也从糖等物质中释放可用能量。植物的呼吸作用白天和夜晚都能进行。'),
    vacuole:t('中央浅色的大液泡含有细胞液，有自己的膜。它帮助储存物质、调节水分，并与细胞壁一起维持细胞的支撑状态。'),
    membrane:t('植物细胞也有细胞膜！膜外还有一层细胞壁，帮助支撑形状。图上较粗的外圈表示细胞壁。'),
    dna:t('叶肉细胞的大部分 DNA 在细胞核里。叶绿体和线粒体也各有少量 DNA，图里没有逐一画出。'),
    nucleus:t('植物细胞也有膜包围的细胞核。图中的大液泡占了不少地方，把细胞核和其他结构挤到旁边。'),
    chloroplast:t('叶绿体捕捉光能，参与把水和二氧化碳变成糖的光合作用。很多根部细胞没有叶绿体，所以不能把所有植物细胞都画成这样。'),
  },
  bacterium: {
    mitochondrion:t('细菌没有线粒体，却也能进行能量转换。不同细菌使用的物质和方式不同，不能把这两段动植物示例套给所有细菌。'),
    vacuole:t('这张典型细菌图没有植物中央大液泡。微生物的内部结构有许多差异，这里只比较选出的结构。'),
    membrane:t('细菌虽小，也有把内部和外部隔开的细胞膜。大多数细菌在膜外还有细胞壁，但它与植物的细胞壁不同。'),
    dna:t('细菌也有 DNA！它主要集中在细胞内的一个区域，叫拟核；这里没有一层核膜把 DNA 包起来。'),
    nucleus:t('细菌没有膜包围的细胞核，但这不等于没有 DNA。点一下 DNA，看遗传物质在什么地方。'),
    chloroplast:t('细菌没有叶绿体。不过，有些细菌能用自己的光合结构进行光合作用，例如蓝细菌。'),
  },
};
const questions:Record<Part,string> = {
  mitochondrion:t('把植物细胞也选来看看：它不只制造糖，也会利用糖。'),
  vacuole:t('放大浅色中央区域，再找它外侧的薄薄细胞质。'),
  membrane:t('换着看：三种细胞的边界形状一样吗？'),
  dna:t('试着找：哪个细胞的 DNA 没有被细胞核包住？'),
  nucleus:t('有没有细胞核，能帮助我们分辨这几类细胞。'),
  chloroplast:t('记住这个例外：植物的根部细胞通常没有叶绿体。'),
};

function currentProcess(){return processFor(cell,choice);}
function currentProgress(){const process=currentProcess();return process?progress[cell][process]:0;}
function moveCamera(){
 cancelCamera();const fromWhole=whole,fromDetail=detail,toWhole=wholeBox(cell),toDetail=focusBox(cell,part);
 cancelCamera=animateValue({from:0,to:1,duration:850,onUpdate:v=>{whole=mixBox(fromWhole,toWhole,v);detail=mixBox(fromDetail,toDetail,v);setCameras(whole,detail);}});
}
function renderProgress(){
 const process=currentProcess(),p=currentProgress();
 (el('process-progress') as HTMLInputElement).value=String(p*100);
 const valueText=t('已观察 {{value}}%',{value:Math.round(p*100)});if(el('process-progress').getAttribute('aria-valuetext')!==valueText)el('process-progress').setAttribute('aria-valuetext',valueText);text('process-value',`${Math.round(p*100)}%`);
 const phase=process==='respiration'?respirationState(p).phase:processState(p).phase,key=`${cell}-${process}-${phase}-${playing}`;
 if(key!==lastAnnouncement){
  lastAnnouncement=key;
  const respirationNotes={
   input:t('沿着路径，看看糖和氧去哪里。'),
   breakdown:t('糖先在细胞质中分解；金色小块会继续移动。'),
   converge:t('跟着金色小块：它们与氧来到同一处线粒体区域，参与后续多步变化。'),
   change:t('这里正在转换能量：形成 ATP，也形成二氧化碳和水。'),
   supply:t('跟着金色标记：ATP 把可用能量带给制造蛋白质等细胞活动。'),
   work:t('绿圆点代表氨基酸；它们正连接成蛋白质链。ATP 为其中一些步骤提供能量。'),
  };
  text('process-status',!process?t('请换成动物或叶肉细胞观察这两种行为。'):process==='respiration'?respirationNotes[phase as keyof typeof respirationNotes]:phase==='input'?t('先看需要的物质'):phase==='change'?t('细胞内部正在发生变化'):t('再看形成了什么'));
  text('energy-status',phase==='work'?t('能量用在制造蛋白质的过程中，绿圆点正连接成链。'):phase==='supply'?t('送到需要处：ATP 在细胞内传递可用能量。'):phase==='change'?t('正在形成 ATP：糖中的一部分能量转成可用形式。'):t('留意线粒体旁的金色标记：它代表 ATP，再跟着它看能量用在哪里。'));
  el('energy-readout').dataset.phase=phase;
 }

 drawProcess(cell,process,p);
}
function render(){
 const present=hasPart(cell,part),process=currentProcess(),p=currentProgress();
 text('specimen-name',cells[cell].name);text('specimen-tag',cells[cell].tag);text('observation',cells[cell].note);
 text('part-title',partNames[part]);text('part-description',explanations[cell][part]);text('part-question',questions[part]);
 text('presence',!present?t('这里没有这种结构'):part==='membrane'||part==='dna'?t('这三种都有'):t('在这张图里找一找'));
 text('detail-title',present?t('放大观察：{{part}}',{part:partNames[part]}):t('整体对照：这里没有{{part}}',{part:partNames[part]}));
 text('detail-note',outerTarget?t('半透明表面盖在原有结构上；切回剖视可看清内部。'):t('虚线框与放大窗口对应同一处；膜和细胞器都经过教学放大。'));
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-cell]'))b.setAttribute('aria-pressed',String(b.dataset.cell===cell));
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-part]'))b.setAttribute('aria-pressed',String(b.dataset.part===part));
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-surface]'))b.setAttribute('aria-pressed',String(Number(b.dataset.surface)===outerTarget));
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-process]')){b.setAttribute('aria-pressed',String(b.dataset.process===process));b.disabled=cell!=='plant'&&b.dataset.process==='photosynthesis'||cell==='bacterium';}
 (el('process-progress') as HTMLInputElement).disabled=!process;
 (el('play') as HTMLButtonElement).disabled=!process||playing||p>=1;(el('pause') as HTMLButtonElement).disabled=!playing;(el('replay') as HTMLButtonElement).disabled=!process;
 text('process-heading',process==='photosynthesis'?t('有光时，叶肉细胞制造糖'):process?t('从营养物质中释放可用能量'):t('细菌也有多样的生命活动'));
 text('process-description',process==='photosynthesis'?t('光提供能量。水和二氧化碳参与变化，形成糖，并释放氧气。糖留在细胞里，也可以供植物其他部分使用。'):process?t('这里看有氧呼吸的例子：糖等营养物质与氧参与一连串变化，细胞获得可用能量，并产生二氧化碳和水。'):t('细菌也会交换物质、利用能量。它们的方式很多，这里保留结构比较，不用同一段动画代表所有细菌。'));
 el('plant-reminder').hidden=cell!=='plant';
 el('flow-key').hidden=!process;
 el('flow-extra').hidden=!process;
 el('energy-readout').hidden=process!=='respiration';
 el('fragment-key').hidden=process!=='respiration';
 el('reaction-key').hidden=process!=='respiration';
 el('assembly-key').hidden=process!=='respiration';
 for(const key of document.querySelectorAll<HTMLElement>('[data-respiration-key]'))key.hidden=process!=='respiration';
 el('process-boundary').hidden=!process;
 text('process-boundary',process==='photosynthesis'?t('这里把光合作用的多步反应合在一起看。光提供能量，糖的碳来自二氧化碳，释放的氧主要来自水。路径不是固定管道，符号数量不代表分子比例。'):t('糖先在细胞质中分解，分解后的物质继续进入线粒体；氧参与后续反应。圈出的区域把多步过程合在一起看，并不是糖和氧碰一下就变成能量。路径不是固定管道，符号数量不代表分子比例。'));
 text('flow-input',process==='photosynthesis'?t('进入：二氧化碳、水；光带来能量'):cell==='plant'?t('使用：糖、氧'):t('进入：糖等营养物质、氧'));
 text('flow-output',process==='photosynthesis'?t('形成：糖；释放：氧'):t('形成：二氧化碳、水；获得可用能量'));
 text('flow-extra',process==='photosynthesis'?t('金色六边形表示糖，蓝色小滴表示水；小点不按真实分子数量。'):t('绿圆点表示氨基酸，来自细胞已有的原料；金色标记表示 ATP，它提供可用能量，不会变成绿圆点。棕色波纹表示热，颜色和形状只是示意。'));
 selectPart(cell,part,outer);renderProgress();
 el('cell-scene').setAttribute('aria-label',t('{{cell}}结构示意图；当前观察：{{part}}。使用结构按钮探索。',{cell:cells[cell].name,part:partNames[part]}));
 el('detail-scene').setAttribute('aria-label',present?t('同一细胞的{{part}}局部放大',{part:partNames[part]}):t('整体对照：这里没有{{part}}',{part:partNames[part]}));
}
function stop(){cancelPlay();playing=false;}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-cell]'))b.addEventListener('click',()=>{stop();cell=b.dataset.cell as Cell;render();moveCamera();});
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-part]'))b.addEventListener('click',()=>{part=b.dataset.part as Part;render();moveCamera();});
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-surface]'))b.addEventListener('click',()=>{cancelSurface();outerTarget=Number(b.dataset.surface);render();cancelSurface=animateValue({from:outer,to:outerTarget,duration:700,onUpdate:v=>{outer=v;selectPart(cell,part,outer);}});});
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-process]'))b.addEventListener('click',()=>{stop();choice=b.dataset.process as Process;render();});
el('play').addEventListener('click',()=>{const process=currentProcess();if(!process||playing)return;playing=true;const specimen=cell;render();cancelPlay=animateValue({from:progress[specimen][process],to:1,duration:9000*(1-progress[specimen][process]),onUpdate:v=>{progress[specimen][process]=v;renderProgress();},onComplete:()=>{playing=false;render();}});});
el('pause').addEventListener('click',()=>{stop();render();});
el('replay').addEventListener('click',()=>{stop();const process=currentProcess();if(process)progress[cell][process]=0;render();});
el('process-progress').addEventListener('input',()=>{const value=Number((el('process-progress') as HTMLInputElement).value)/100;stop();const process=currentProcess();if(process)progress[cell][process]=value;render();});
// Native structure buttons are the keyboard equivalent of diagram hit regions.
el('cell-scene').addEventListener('click',(event)=>{
 const svg=document.getElementById('cell-scene') as unknown as SVGSVGElement,matrix=svg.getScreenCTM();
 if(!matrix)return;
 const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
 part=hitPart(cell,p.matrixTransform(matrix.inverse()));render();moveCamera();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});
window.addEventListener('pagehide',()=>{stop();cancelCamera();cancelSurface();whole=wholeBox(cell);detail=focusBox(cell,part);outer=outerTarget;});
window.addEventListener('pageshow',()=>{setCameras(whole,detail);render();});
createScene();setCameras(whole,detail);render();mountReadingMode('details:not(.references)');mountTopicNavigation('cells');
