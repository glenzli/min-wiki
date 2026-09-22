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
let chapter:Chapter=readChapter(location.search),playing=false,view=0,familyIndex=0,cut=0,packZoom=1,layer='wiring',series=4,parallel=3;
if(chapter==='charge')experiment.configure({mode:'charge'});
let cancelPlay=()=>{},cancelCamera=()=>{},cameraView=0,zoom=false;
const range=byId<HTMLInputElement>('progress');
const chapterButtons=content.chapters.map(item=>{const b=document.createElement('button');b.type='button';b.textContent=txt(item.title);b.dataset.chapter=item.id;b.onclick=()=>selectChapter(item.id as Chapter,true);byId('chapters').append(b);return b;});
function stop(){cancelPlay();playing=false;}
function camera(target:number){cancelCamera();view=target;cancelCamera=animateValue({from:cameraView,to:target,duration:650,onUpdate:v=>{cameraView=v;byId('detail-scene').setAttribute('viewBox',`0 ${v*510} 600 480`);}});}
function selectChapter(next:Chapter,push=false){
 stop();const wasCharge=chapter==='charge';chapter=next;
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
 byId('chapter-question').textContent=txt(item.question);byId('chapter-body').textContent=txt(item.body);
 chapterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chapter===chapter)));
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
byId('circuit-zoom').onclick=()=>{zoom=!zoom;byId('circuit-zoom').setAttribute('aria-pressed',String(zoom));byId('circuit-scene').setAttribute('viewBox',zoom?'170 55 410 284.7':'0 0 720 500');};
const familyButtons=content.families.map((f,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML=specimen(f.id,0,f.id);const name=document.createElement('span');name.textContent=txt(f.name);b.append(name);b.onclick=()=>{familyIndex=i;drawFamily();};byId('family-cards').append(b);return b;});
function drawFamily(){const f=content.families[familyIndex]!;familyButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===familyIndex)));
 byId('family-art').innerHTML=specimen(f.id,cut);byId('family-name').textContent=txt(f.name);byId('family-structure').textContent=txt(f.structure);byId('family-trade').textContent=txt(f.trade);
 byId('family-facts').replaceChildren(...[[t('外形或尺寸'),txt(f.form)],[t('化学体系'),txt(f.chem)],[t('用途'),txt(f.use)],[t('充电规则'),f.rechargeable?t('可充电；必须使用适配设备'):t('本例为一次电池：不可充电')]].flatMap(([name,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name!;dd.textContent=value!;return[dt,dd];}));
}
byId<HTMLInputElement>('cutaway').oninput=e=>{cut=Number((e.target as HTMLInputElement).value);drawFamily();};
function drawPack(){const p=packValues(series,parallel);renderPack(byId('pack-scene') as unknown as SVGSVGElement,p,packZoom,layer);
 byId('pack-values').textContent=t('{{s}} 串 × {{p}} 并 = {{n}} 颗电芯',{s:p.series,p:p.parallel,n:p.cells})+`\n${p.voltage.toFixed(1)} V · ${p.ampHours} Ah · ${p.wattHours.toFixed(1)} Wh`;
 byId('pack-explain').textContent=layer==='wiring'?t('连接：串联累加标称电压；并联累加安时容量。瓦时同时考虑电压和容量，不能只拿 mAh 比较不同电压电池的能量。'):layer==='monitor'?t('监测与保护：管理系统读取各处电压、温度等信息，在越界时限制或隔离输出。监测线不是给车辆输送主功率的通路。'):t('散热：冷却结构将工作产生的热带走；散热不是额外制造电能。不同车型的热管理设计不同。');
 document.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layer===layer)));
}
for(const id of ['pack-zoom','series','parallel'])byId<HTMLInputElement>(id).oninput=e=>{const v=Number((e.target as HTMLInputElement).value);if(id==='series')series=v;else if(id==='parallel')parallel=v;else packZoom=v;drawPack();};
document.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach(b=>b.onclick=()=>{layer=b.dataset.layer!;drawPack();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();cancelCamera();render();}});
window.addEventListener('pagehide',()=>{stop();cancelCamera();});
window.addEventListener('popstate',()=>selectChapter(readChapter(location.search)));
selectChapter(chapter);drawFamily();drawPack();mountReadingMode('.advanced');mountTopicNavigation('batteries');

foldPresentationContext('.journey-intro');
mountPresentationFrame({ root: '#lab', visual: '.specimen-pair', paired: true, transport: '.play-controls' });
mountPresentationFrame({ root: '#family', visual: '#family-art' });
mountPresentationFrame({ root: '#pack', visual: '.specimen-pair', paired: true });
