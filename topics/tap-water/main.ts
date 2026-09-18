import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { composition, treatmentFrame, particleMotion, type Component, type Scenario, type Stage } from './model.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('tap-water');
const el = (id: string) => document.getElementById(id)!;
const write=(id:string,text:string)=>{if(el(id).textContent!==text)el(id).textContent=text;};
let component: Component = 'water';
let scenario: Scenario = 'normal';
let stage: Stage = 'before';
let events: AbortController | undefined;
let progress=0,frame=0,playing=false,cancelStep=()=>{};
const motion=matchMedia('(prefers-reduced-motion: reduce)');
function stop(){cancelAnimationFrame(frame);frame=0;playing=false;cancelStep();el('play-process').textContent=t('播放变化');}
function goTo(target:number){stop();cancelStep=animateValue({from:progress,to:target,duration:1200,onUpdate:value=>{progress=value;update();}});}
function play(){if(playing){stop();return;}stop();if(motion.matches){progress=1;update();return;}if(progress>=1)progress=0;playing=true;el('play-process').textContent=t('暂停');let previous=performance.now();const tick=(now:number)=>{progress=Math.min(1,progress+Math.min(50,now-previous)/7500);previous=now;update();if(progress<1)frame=requestAnimationFrame(tick);else stop();};frame=requestAnimationFrame(tick);}

const components = {
  water: [t('绝大部分，是水分子'), t('一杯水的主体是水。它还能溶解少量别的物质，就像盐溶进水里后，用眼睛找不到盐粒。放大图里的淡蓝圆点只是水的符号。')],
  minerals: [t('矿物质：溶在水里的小成分'), t('水流过土壤和岩石时，可以带走少量矿物成分，例如钙、镁。它们不是一颗颗小石头。煮沸不会让全部矿物质消失，有些会形成水垢。')],
  disinfectant: [t('少量消毒剂，守护输送的路'), t('采用氯或氯胺的供水系统，常保留受控制的少量消毒剂，帮助保护管网中的水。各地工艺不同；不能凭气味判断是否达标，也不要自己往水里加药。')],
  risk: [t('风险：不能靠眼睛排除'), t('处理、输送或储存出问题时，病原体或有害化学物质可能进入水中，却仍看不出来。选择下面的警示情境，看它们遇到煮沸有什么不同。')],
};
const scenarioCopy = {
  normal: t('情境：供水正常，符合当地饮用水要求。以供水信息和当地饮用建议为准；不是每个地区的自来水都适合直接喝。'),
  microbial: t('情境：当地发出了微生物风险的煮沸通知。这里的符号表示“可能有病原体”，不是检测发现了多少。请大人按通知处理。'),
  chemical: t('情境：已知或怀疑有煮沸不能去除的化学污染，例如铅。请按当地通知改用安全水源，不要把烧开当作补救。'),
};
function update() {
  const process=treatmentFrame(scenario,progress);stage=process.complete?'after':'before';
  const state = composition(scenario, stage);
  (el('process') as HTMLInputElement).value=String(Math.round(progress*1000));
  el('process').setAttribute('aria-valuetext',t('概念演示进度 {{n}}%；不是煮沸计时',{n:Math.round(progress*100)}));
  write('process-status',progress===0?t('先认出同一组符号，再播放变化。'):progress<1?t('正在对照处理影响：进度不是温度、时间或存活比例。'):t('比较停在这里；可拖回前面检查哪些符号一直存在。'));
  document.querySelectorAll<HTMLButtonElement>('[data-component]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.component === component)));
  document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scenario === scenario)));
  document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(button => button.setAttribute('aria-pressed', String(progress===0?button.dataset.stage==='before':progress===1?button.dataset.stage==='after':false)));
  write('component-title', components[component][0]);
  write('component-copy', components[component][1]);
  write('scenario-copy', scenarioCopy[scenario]);
  const opacity = (type: Component) => type === component ? '1' : '.28';
  const water = Array.from({length: 32}, (_, i) => {
    const r=Math.sqrt((i+.5)/32)*111,a=i*2.399963,m=particleMotion(i,progress);
    const x=170+Math.cos(a)*r+m.dx,y=150+Math.sin(a)*r+m.dy;
    return `<circle cx="${x}" cy="${y}" r="${4 + i % 4}" fill="#629cad" opacity="${opacity('water')}" stroke="#f0ffff" stroke-width="1.5"/>`;
  }).join('');
  const minerals = [[110,103],[191,182],[226,104],[114,224],[265,202]].map(([a,b],i)=>{const m=particleMotion(i+40,progress),x=a+m.dx,y=b+m.dy;return `<circle cx="${x}" cy="${y}" r="11" fill="url(#mineral-light)" stroke="#aa8246" opacity="${opacity('minerals')}"/>`;}).join('');
  // Outlined residual symbols mean the heated residual is not modeled, never zero chlorine.
  const disinfectant = scenario === 'normal' ? [[146,144],[195,63],[80,186]].map(([x,y])=>`<rect x="${x}" y="${y}" width="13" height="13" rx="3" fill="#518a70" fill-opacity="${1-progress*.88}" stroke="#518a70" stroke-dasharray="${progress>0?'2 2':'0'}" opacity="${opacity('disinfectant')}" transform="rotate(12 ${x} ${y})"/>`).join('') : '';
  const risks = state.pathogenSymbol === 'not-shown' ? '' : [[126,165],[213,134],[164,226]].map(([a,b],i)=>{
    const m=particleMotion(i+50,progress),x=a+m.dx,y=b+m.dy;
    const inactive = process.inactivation>=1;
    const fade=process.inactivation;
    return `<g opacity="${opacity('risk')}" transform="translate(${x} ${y}) rotate(-25)"><rect x="-15" y="-8" width="30" height="16" rx="8" fill="${inactive?'#8b9990':'#b27359'}" stroke="${inactive?'#71867e':'#94563f'}" stroke-width="2"/><path d="M-10 -9v-5M0 -9v-5M10 -9v-5M-10 9v5M0 9v5M10 9v5" stroke="${inactive?'#71867e':'#94563f'}" stroke-width="2"/><rect x="-15" y="-8" width="30" height="16" rx="8" fill="#8b9990" opacity="${fade}"/><path d="M-21 17L21 -17" stroke="#597166" stroke-width="3" pathLength="100" stroke-dasharray="${fade*100} 100"/></g>`;
  }).join('');
  const chemical = state.chemicalWarning ? [[143,143],[210,218],[84,167]].map(([a,b],i)=>{const m=particleMotion(i+60,progress),x=a+m.dx,y=b+m.dy;return `<path d="M${x} ${y-12}l12 12-12 12-12-12Z" fill="#85677d" stroke="#62495b" stroke-width="2" opacity="${opacity('risk')}"/>`;}).join('') : '';
  el('particles').innerHTML = water + minerals + disinfectant + risks + chemical;
  el('lens').setAttribute('aria-label', scenario === 'chemical'
    ? t('示意放大图：水与矿物质仍在，紫色菱形表示煮沸不能去除的化学污染。')
    : scenario === 'microbial' ? stage === 'after'
      ? t('示意放大图：水和矿物质仍在，灰色划线表示病原体被灭活，并非消失。')
      : t('示意放大图：水和矿物质之外，棕色符号表示可能的病原体。')
    : t('正常供水示意：水、溶解矿物质，以及采用含氯消毒工艺时的少量消毒剂；不是成分检测。'));
  let title: string, copy: string;
  if (scenario === 'chemical') {
    title = stage === 'after' ? t('烧开了，化学污染问题还在') : t('这次，不能靠烧开解决');
    copy = t('紫色菱形仍然保留：煮沸不能去除铅等重金属及多数化学污染物。请大人按当地通知使用安全替代水源，并联系供水或卫生部门。');
  } else if (scenario === 'microbial') {
    title = stage === 'after' ? t('病原体可被灭活，矿物质仍在') : t('清澈的水，也可能有病原体');
    copy = stage === 'after'
      ? t('这里假设大人已按适用指引完成煮沸。灰色划线表示失去感染能力，不是被捞走。还要放凉、清洁加盖保存，并继续遵循通知。')
      : t('在微生物警示情境，不能因为水看起来清澈就喝。按当地通知使用安全瓶装水，或由大人按指引煮沸。');
  } else {
    title = stage === 'after' ? t('烧开，不会把水变成纯水') : t('先了解家里的供水情况');
    copy = stage === 'after'
      ? t('高温可以灭活病原体，但溶解矿物质不会全部消失。绿色虚线框表示本页未模拟加热后的消毒剂残留，不代表全部除氯或水质认证。')
      : t('主体是水，还有溶解矿物质等少量成分。正常情境没有画病原体，不表示绝对无菌。是否需要烧开，请大人查看当地供水与饮用建议。');
  }
  if(progress>0&&progress<1&&scenario==='microbial'){title=t('热处理影响病原体的示意');copy=t('同一组符号仍在，灰色划线逐渐出现；矿物质没有被全部捞走。画面进度不代表存活比例，也不能判断现实中的水是否安全。');}
  write('outcome-label', progress>0&&progress<1?t('比较过程 · 不是实际计时'):stage === 'after' ? t('比较结果 · 按适用指引煮沸后') : t('比较结果 · 煮沸前'));
  write('outcome-title', title);
  write('outcome-copy', copy);
  el('outcome').dataset.tone = scenario === 'chemical' || (scenario === 'microbial' && stage === 'before') ? 'caution' : 'neutral';
}
function bind() {
  events?.abort(); events = new AbortController();
  const { signal } = events;
  el('play-process').addEventListener('click',play,{signal});
  el('process').addEventListener('input',()=>{stop();progress=Number((el('process') as HTMLInputElement).value)/1000;update();},{signal});
  document.querySelectorAll<HTMLButtonElement>('[data-component]').forEach(button=>button.addEventListener('click',()=>{component = button.dataset.component as Component; update();},{signal}));
  document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button=>button.addEventListener('click',()=>{stop();scenario = button.dataset.scenario as Scenario; component = scenario === 'normal' ? 'water' : 'risk'; update();},{signal}));
  document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(button=>button.addEventListener('click',()=>{goTo(button.dataset.stage==='after'?1:0);},{signal}));
}
// Finite user-started progression; backgrounding pauses and bfcache retains its frame.
window.addEventListener('pagehide',()=>{stop();events?.abort();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
motion.addEventListener('change',stop);
window.addEventListener('pageshow',event=>{if(event.persisted){bind();update();}});
bind(); update();

mountReadingMode('details:not(.references)');
