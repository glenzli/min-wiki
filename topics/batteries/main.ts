import { mountPresentationFrame, foldPresentationContext } from '../../src/platform/presentation.ts';
import './style.css';
import { t } from './i18n.ts';
import { language, translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { createBatteryScene,drawJourney } from './scene.ts';
import { BatteryExperiment,admitted,chapters,readChapter,packValues,type Chapter,type Load,type Charger } from './journeyModel.ts';
import content from './journeyContent.json';
import { specimen,renderPack } from './familyScene.ts';
const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id)! as T;
const setText=(id:string,value:string)=>{const el=byId(id);if(el.textContent!==value)el.textContent=value;};
const txt=(b:{zh:string;en:string})=>language==='en'?b.en:b.zh;
translateDocument(t);createBatteryScene();
const experiment=new BatteryExperiment();
const initialAcademic=new URLSearchParams(location.search).get('reading')==='academic';
let chapter:Chapter=readChapter(location.search),playing=false,view=0,familyIndex=1,cut=0,packZoom=1,layer='wiring',series=initialAcademic?4:1,parallel=initialAcademic?3:1,lens: 'circuit'|'cell'=chapter==='inside'?'cell':'circuit';
if(chapter==='charge')experiment.configure({mode:'charge'});
let cancelPlay=()=>{},cancelCamera=()=>{},cameraView=0,zoom=false;
const range=byId<HTMLInputElement>('progress');
const chapterButtons=content.chapters.map(item=>{const b=document.createElement('button');b.type='button';b.textContent=txt(item.title);b.dataset.chapter=item.id;b.onclick=()=>selectChapter(item.id as Chapter,true);byId('chapters').append(b);return b;});
function stop(){cancelPlay();playing=false;}
function camera(target:number){cancelCamera();view=target;cancelCamera=animateValue({from:cameraView,to:target,duration:650,onUpdate:v=>{cameraView=v;byId('detail-scene').setAttribute('viewBox',`0 ${v*510} 600 480`);}});}
function selectChapter(next:Chapter,push=false){
 stop();const wasCharge=chapter==='charge',changed=chapter!==next;chapter=next;
 if(changed)lens=next==='inside'?'cell':'circuit';
 if(wasCharge!==(chapter==='charge'))experiment.configure({mode:chapter==='charge'?'charge':'discharge',closed:false,charger:'none'});
 if(chapter==='inside'||chapter==='charge')camera(0);
 if(push){const url=new URL(location.href);url.searchParams.set('chapter',chapter);history.pushState(null,'',url);}
 render();
}
function render(){
 const s=experiment.state,c=experiment.conditions,allowed=admitted(s,c),charging=chapter==='charge';
 drawJourney(s,c,allowed);
 const item=content.chapters.find(x=>x.id===chapter)!;
 byId('chapter-number').textContent=`${String(chapters.indexOf(chapter)+1).padStart(2,'0')} / 06`;
 byId('chapter-question').textContent=chapter==='family'?familyQuestion():txt(item.question);byId('chapter-body').textContent=txt(item.body);
 const questionSummary=document.querySelector<HTMLElement>('.presentation-context>summary');if(questionSummary)questionSummary.textContent=byId('chapter-question').textContent;
 chapterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chapter===chapter)));
 byId('lab').dataset.lens=lens;
 document.querySelectorAll<HTMLButtonElement>('[data-lab-lens]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.labLens===lens)));
 byId('lab').hidden=chapter==='family'||chapter==='pack';byId('family').hidden=chapter!=='family';byId('pack').hidden=chapter!=='pack';
 byId('load-controls').hidden=charging;byId('charge-controls').hidden=!charging;byId('switch-controls').hidden=charging;
 byId('lab-kicker').textContent=charging?t('充电实验'):t('放电实验');byId('lab-title').textContent=charging?t('外部做功，重新储能'):t('一条完整的路，才能持续供电');
 byId('circuit-scene').setAttribute('aria-label',charging?t('同一电池接入外部能源'):t('电池、开关与所选负载'));
 byId<HTMLSelectElement>('charger').value=c.charger;
 document.querySelectorAll<HTMLButtonElement>('[data-load]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.load===c.load)));
 range.value=String(experiment.progress*100);range.disabled=!(c.mode==='charge'?c.charger==='matched'&&c.rechargeable:c.closed);
 range.setAttribute('aria-valuetext',`${Math.round(experiment.progress*100)}%`);byId('progress-value').textContent=`${Math.round(experiment.progress*100)}%`;
 byId<HTMLButtonElement>('play').disabled=!allowed||playing;byId<HTMLButtonElement>('pause').disabled=!playing;
 byId('switch').textContent=c.closed?t('断开开关'):t('合上开关');byId('switch').setAttribute('aria-pressed',String(c.closed));
 byId('circuit-title').textContent=charging?t('同一电池接入外部能源'):t('电池、开关与所选负载');
 const status=charging?(c.charger==='none'?t('未接入外部能源，不能充电。'):c.charger==='wrong'?t('设备不匹配：保护条件不允许接通。'):s.energy>=1-1e-9?(s.input>0?t('本次充电完成；输入中也有一部分转为热。'):t('初始示例已充足；先到负载章节用掉一些能量。')):playing?t('外部能量正在进入；负载隔离，电机不倒转。'):t('适配电源已接入。运行或拖动这一段，观察重新储能。')):!c.closed?t('回路断开；剩余能量保留。'):s.energy<=1e-9?t('可用能量耗尽，电子仍然存在。'):playing?t('化学能经回路转为光、机械作用与热。'):t('观察已暂停；开关闭合不等于画面必须一直播放。');
 setText('circuit-state',charging?t('充电实验'):t('放电实验'));setText('status-title',charging?t('外部做功，重新储能'):t('同一电池，不同负载'));setText('status-text',status);
 const amounts=[[t('剩余化学能'),s.energy],[t('累计输出：光'),s.light],[t('累计输出：机械作用'),s.work],[t('累计转为热'),s.heat],[t('外部累计输入'),s.input]] as const;
 byId('energy-ledger').replaceChildren(...amounts.map(([label,value])=>{const row=document.createElement('div'),name=document.createElement('span'),number=document.createElement('strong');name.textContent=label;number.textContent=value.toFixed(2);row.append(name,number);return row;}));
 byId('energy-balance').textContent=t('初始 1 + 输入 = 剩余 + 光 + 机械作用 + 热');
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.view)===view));b.disabled=charging&&b.dataset.view==='1';});
 byId('detail-name').textContent=view?t('马达里的磁力与线圈'):t('电池里的两种通路');
 byId('detail-caption').textContent=view?t('固定磁体与通电线圈相互作用，带动转轴。换向结构和真实传动细节只做简化示意。'):charging?t('充电时，锂离子的净迁移方向改变；负极与正极的材料占位随同一储能状态变化。金色离子不走外部导线。'):t('金色带加号的点代表锂离子。隔膜帮助隔开两极，同时允许离子通行；它不是让电子直接穿过电池的捷径。');
}
byId('switch').onclick=()=>{stop();experiment.configure({closed:!experiment.conditions.closed});render();};
byId('play').onclick=()=>{if(!admitted(experiment.state,experiment.conditions))return;stop();playing=true;const from=experiment.progress;
 cancelPlay=animateValue({from,to:1,duration:(1-from)*16000,onUpdate:p=>{experiment.replay(p);render();},onComplete:()=>{playing=false;render();}});render();};
byId('pause').onclick=()=>{stop();render();};
range.oninput=()=>{stop();experiment.replay(Number(range.value)/100);render();};
byId('reset').onclick=()=>{stop();experiment.reset();render();};
document.querySelectorAll<HTMLButtonElement>('[data-load]').forEach(b=>b.onclick=()=>{stop();experiment.configure({load:b.dataset.load as Load});render();});
byId<HTMLSelectElement>('charger').onchange=e=>{stop();experiment.configure({charger:(e.target as HTMLSelectElement).value as Charger});render();};
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{camera(Number(b.dataset.view));render();});
document.querySelectorAll<HTMLButtonElement>('[data-lab-lens]').forEach(b=>b.onclick=()=>{lens=b.dataset.labLens as 'circuit'|'cell';render();});
byId('circuit-zoom').onclick=()=>{zoom=!zoom;byId('circuit-zoom').setAttribute('aria-pressed',String(zoom));byId('circuit-scene').setAttribute('viewBox',zoom?'170 55 410 284.7':'0 0 720 500');};
const familyPairs=[[1,2],[0,3],[4,5]] as const;
const pairIndex=()=>familyPairs.findIndex(pair=>pair[0]===familyIndex||pair[1]===familyIndex);
const familyQuestion=()=>[t('同样是 AA，为什么一个能充、一个不能？'),t('都提到锂，为什么充电规则不同？'),t('汽车上的两种电池，分别做什么？')][pairIndex()]!;
const familyComparisons=[
 t('两节都是 AA 外形；左边是一次碱性，右边是可充电镍氢。剖开图看看内部。'),
 t('这枚纽扣例子用锂金属，是一次电池；手机例子是可充电的锂离子软包。'),
 t('一种常用于启动与辅助供电，另一种负责牵引；它们并未按真实大小比较。'),
];
const familyKidSummaries=[
 t('它是一次电池；有“锂”字也不能拿去充电。'),
 t('这节能供电，但不是可充电电池。'),
 t('这节可以充电，但需要合适的充电器。'),
 t('它是可充电的锂离子例子，和纽扣电池不是同一体系。'),
 t('这里主要负责启动或辅助供电。'),
 t('许多电芯一起为牵引电机供能。'),
];
const familyTheory=document.createElement('details'),theoryTitle=document.createElement('summary'),theoryBody=document.createElement('p'),theorySource=document.createElement('a');
familyTheory.className='advanced family-theory';theoryTitle.textContent=t('深入看：材料与用途不等于外形');
theorySource.href='https://data.energizer.com/wp-content/uploads/2020/11/nimhhandbook_ver2-2.pdf';theorySource.target='_blank';theorySource.rel='noopener noreferrer';theorySource.textContent=t('镍氢电池结构资料 ↗');
familyTheory.append(theoryTitle,theoryBody,theorySource);byId('family-trade').after(familyTheory);
document.querySelectorAll<HTMLButtonElement>('[data-family-pair]').forEach(b=>b.onclick=()=>{familyIndex=familyPairs[Number(b.dataset.familyPair)]![0];drawFamily();});
function drawFamily(){const f=content.families[familyIndex]!,group=pairIndex();
 document.querySelectorAll<HTMLButtonElement>('[data-family-pair]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.familyPair)===group)));
 if(chapter==='family')byId('chapter-question').textContent=familyQuestion();
 const questionSummary=document.querySelector<HTMLElement>('.presentation-context>summary');if(questionSummary&&chapter==='family')questionSummary.textContent=familyQuestion();
 byId('family-comparison').textContent=familyComparisons[group]!;
 const pair=familyPairs[group]!.map(i=>{const example=content.families[i]!,button=document.createElement('button'),label=document.createElement('strong'),rule=document.createElement('span');
  button.type='button';button.className='family-sample';button.setAttribute('aria-pressed',String(i===familyIndex));button.setAttribute('aria-label',txt(example.name));
  button.innerHTML=specimen(example.id,cut,`pair-${example.id}`);label.textContent=txt(example.name);rule.textContent=example.rechargeable?t('可充电 · 须用适配设备'):t('一次电池 · 不可充电');button.append(label,rule);
  button.onclick=()=>{familyIndex=i;drawFamily();byId('family-pair').querySelectorAll<HTMLButtonElement>('button')[familyPairs[group]!.findIndex(index=>index===i)]?.focus();};return button;});
 byId('family-pair').replaceChildren(...pair);
 byId('family-name').textContent=txt(f.name);byId('family-kid-summary').textContent=familyKidSummaries[familyIndex]!;
 byId('family-structure').textContent=txt(f.structure);byId('family-trade').textContent=txt(f.trade);
 theoryBody.textContent=[t('一次碱性电池与镍氢电池都能做成 AA 尺寸。两者的电极材料和内部层次不同：本例碱性电池用于一次放电；镍氢电池的电极带与隔膜卷绕，需在适配条件下充电。可否充电不能由尺寸推断。'),t('这枚一次锂金属纽扣电池与手机锂离子软包都提到锂，但电极结构和充电规则不同。软包还需要配套保护；外形、材料名称和能否充电必须分别核对。'),t('启动与辅助电池和牵引电池包按职责区分。启动系统强调短时较大电流，牵引系统还要统筹储能、功率、监测和热管理；车辆用途不规定唯一化学体系。')][group]!;
 theorySource.hidden=group!==0;
 byId('family-facts').replaceChildren(...[[t('外形或尺寸'),txt(f.form)],[t('化学体系'),txt(f.chem)],[t('用途'),txt(f.use)],[t('充电规则'),f.rechargeable?t('可充电；必须使用适配设备'):t('本例为一次电池：不可充电')]].flatMap(([name,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name!;dd.textContent=value!;return[dt,dd];}));
}
byId<HTMLInputElement>('cutaway').oninput=e=>{cut=Number((e.target as HTMLInputElement).value);drawFamily();};
const packEquations=document.createElement('p');packEquations.className='pack-equations small';packEquations.textContent=t('理想相同电芯：V组 = Ns × V芯；Ah组 = Np × Ah芯；Wh组 ≈ V组 × Ah组。实际电池包受电芯匹配、工作电压、温度和损耗限制。');byId('pack-values').after(packEquations);
function drawPack(){const p=packValues(series,parallel);renderPack(byId('pack-scene') as unknown as SVGSVGElement,p,packZoom,layer);
 byId<HTMLInputElement>('series').value=String(p.series);byId<HTMLInputElement>('parallel').value=String(p.parallel);byId<HTMLInputElement>('pack-zoom').value=String(packZoom);
 const preset=series===1&&parallel===1?'single':series===4&&parallel===1?'series':series===4&&parallel===2?'parallel':'';
 document.querySelectorAll<HTMLButtonElement>('[data-pack-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.packPreset===preset)));
 byId('pack-story').textContent=preset==='single'?t('先看一颗电芯：它能储存能量，并向外供电。'):preset==='series'?t('四颗接成一条路：总电压变高，适合需要相应电压的设备。'):preset==='parallel'?t('再添一条并排的路：电压不变，这组可以储存更多能量。'):t('继续比较串联支路和并联支路各改变什么。');
 const packCount=language==='en'?`${p.series} in series × ${p.parallel} parallel ${p.parallel===1?'branch':'branches'} = ${p.cells} ${p.cells===1?'cell':'cells'}`:t('{{s}} 串 × {{p}} 并 = {{n}} 颗电芯',{s:p.series,p:p.parallel,n:p.cells});
 byId('pack-values').textContent=packCount+`\n${p.voltage.toFixed(1)} V · ${p.ampHours} Ah · ${p.wattHours.toFixed(1)} Wh`;
 byId('pack-explain').textContent=document.documentElement.dataset.readingMode==='kids'
  ?layer==='wiring'?t('连接起来，电芯才能一起供能。'):layer==='monitor'?t('监测装置会留意电芯的状态。'):t('散热结构帮助带走工作时产生的热。')
  :layer==='wiring'?t('连接：串联累加标称电压；并联累加安时容量。瓦时同时考虑电压和容量，不能只拿 mAh 比较不同电压电池的能量。'):layer==='monitor'?t('监测与保护：管理系统读取各处电压、温度等信息，在越界时限制或隔离输出。监测线不是给车辆输送主功率的通路。'):t('散热：冷却结构将工作产生的热带走；散热不是额外制造电能。不同车型的热管理设计不同。');
 document.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layer===layer)));
}
for(const id of ['pack-zoom','series','parallel'])byId<HTMLInputElement>(id).oninput=e=>{const v=Number((e.target as HTMLInputElement).value);if(id==='series')series=v;else if(id==='parallel')parallel=v;else packZoom=v;drawPack();};
document.querySelectorAll<HTMLButtonElement>('[data-pack-preset]').forEach(b=>b.onclick=()=>{const preset=b.dataset.packPreset;series=preset==='single'?1:4;parallel=preset==='parallel'?2:1;drawPack();});
document.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach(b=>b.onclick=()=>{layer=b.dataset.layer!;drawPack();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();cancelCamera();render();}});
window.addEventListener('pagehide',()=>{stop();cancelCamera();});
window.addEventListener('popstate',()=>selectChapter(readChapter(location.search)));
selectChapter(chapter);drawFamily();mountReadingMode('.advanced');drawPack();
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.addEventListener('click',drawPack));
mountTopicNavigation('batteries');

foldPresentationContext('.journey-intro');
document.querySelector<HTMLElement>('.presentation-context>summary')!.textContent=byId('chapter-question').textContent;
mountPresentationFrame({ root: '#lab', visual: '.specimen-pair', paired: true, transport: '.play-controls', choices: '#lab-lenses' });
mountPresentationFrame({ root: '#family', visual: '#family-art' });
mountPresentationFrame({ root: '#pack', visual: '.specimen-pair', paired: true });
