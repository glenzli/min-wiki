import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
import { oxygenAt } from './model.ts';
import { conditionAt, waterConditions, type WaterCondition } from './exchangeStudy.ts';
translateDocument(t); mountTopicNavigation('fish-gills');
const el=<T extends Element = HTMLElement>(id:string):T=>document.getElementById(id)! as unknown as T;
const titles=[t('水里溶着氧气'),t('鳃像许多薄薄的小片'),t('氧气穿过薄薄的表面'),t('水流出去，继续换新水')];const texts=[t('鱼嘴吸入水。水中溶解的氧气不是图里这么大的小球，也不是必须看见的气泡。'),t('水流过鳃。放大镜里，粉红色小片有很大的表面积，里面有细小血管。'),t('水中的一部分氧气进入血液，由血液送到身体各处。鱼不是把水拆成氧气。'),t('水从鳃盖附近流出去。不断有新水流过鳃，带来新的氧气；二氧化碳也能由鳃进入水中。')];

const conditionCopy: Record<WaterCondition, {label:string, child:string, academic:string}> = {
 'renewed': {label:t('持续换水'), child:t('新水不断流过鳃，带来更多溶解氧。'), academic:t('水持续经过鳃小片，水侧氧浓度与血侧氧浓度保持差别；图中的方向是逆流交换的概念剖面。')},
 'low-oxygen': {label:t('水中氧少'), child:t('水还在流动，但能带来的氧气变少了。'), academic:t('假设水流速度不变而入流水的溶解氧降低：水侧浓度梯度和可供输入的氧都可能减小。点数仅用于表示这一变化。')},
 'slow-flow': {label:t('换水变慢'), child:t('水里仍有氧气，可是新水来得慢了。'), academic:t('假设入流水含氧不变而经过鳃的水量降低：单位时间送到交换面的氧可能减少；图示不求解通气、血流和摄氧率。')},
};

const scene=el<SVGSVGElement>('scene');
const conditionPanel=document.createElement('section');conditionPanel.className='condition-panel';
conditionPanel.innerHTML=`<h3>${t('让水发生一点变化')}</h3><div class="condition-options" role="group" aria-label="${t('水的条件')}">${waterConditions.map(id=>`<button type="button" data-condition="${id}">${conditionCopy[id].label}</button>`).join('')}</div><p id="condition-child" class="condition-child"></p><p id="condition-academic" class="condition-academic"></p>`;
document.querySelector('.readout')!.before(conditionPanel);
const zoomButton=document.createElement('button');zoomButton.id='gill-zoom';zoomButton.type='button';zoomButton.setAttribute('aria-pressed','false');el('restart').after(zoomButton);
const theory=document.createElement('section');theory.className='gill-theory';theory.innerHTML=`<h3>${t('交换为什么会改变？')}</h3><p>${t('薄鳃小片提供较大的交换面积。氧气从水侧向血侧扩散，逆向流动的水与血液有助于沿鳃小片维持浓度差。')}</p><p class="equation" aria-label="${t('扩散通量近似与扩散系数、面积、浓度差成正比，与交换层厚度成反比')}">Ṅ ≈ D · A · (C<sub>w</sub> − C<sub>b</sub>) / ℓ</p><p>${t('这里的 D 是有效扩散系数，A 是交换面积，ℓ 是交换层厚度，Cw 与 Cb 是交换面两侧的氧浓度。另一个约束是入流水每秒可带来的氧量，约为 Qw × Cin。两式只是辨认限制因素的近似关系，并非这条鱼的计算结果。')}</p><p class="small">${t('水侧点数和运动速度是定性编码；黄色大点只追踪一份溶解氧。没有模拟真实浓度、血红蛋白结合、物种差异或低氧生存结局。播放进度表示事件顺序，不代表不同条件下相同的秒数。')}</p><p class="small"><a href="https://www.amnh.org/learn-teach/resources-for-learning/hall-of-ocean-life/water-vertebrates-breathing" target="_blank" rel="noopener noreferrer">AMNH · Vertebrates Breathing in Water</a> · <a href="https://openstax.org/books/biology/pages/39-1-systems-of-gas-exchange" target="_blank" rel="noopener noreferrer">OpenStax · Systems of Gas Exchange</a> · <a href="https://oceanexplorer.noaa.gov/ocean-fact/omz/" target="_blank" rel="noopener noreferrer">NOAA · Oxygen Minimum Zone</a></p>`;
conditionPanel.after(theory);

let progress=0,playing=false,frame=0,last=0,reported=-1;
const params=new URLSearchParams(location.search);
let condition:WaterCondition=waterConditions.find(id=>id===params.get('water'))??'renewed';
let zoom=0, zoomed=false;
let cancelSeek:()=>void=()=>{};
let cancelZoom:()=>void=()=>{};
el('exchange-oxygen').innerHTML='<circle r="7"/>';
el('oxygen-blood').remove();
const detail=el('exchange-detail');
detail.insertAdjacentHTML('beforeend',`<g id="lamellae" fill="#e8a99d" stroke="#b97575" stroke-width="1.3">${Array.from({length:13},(_,i)=>`<path d="M${473+i*34} 105q-5 -12 0 -18q6 -2 8 0q4 6 0 18Z"/>`).join('')}</g><g id="water-parcels" fill="#77babf" opacity=".55"><circle r="3"/><circle r="3"/><circle r="3"/><circle r="3"/></g><g id="oxygen-supply" fill="#e4b345">${Array.from({length:12},()=>'<circle r="2.7"/>').join('')}</g><g id="blood-parcels" fill="#c57670"><ellipse rx="10" ry="5"/><ellipse rx="10" ry="5"/><ellipse rx="10" ry="5"/></g><path id="water-current" d="M882 48H765" stroke="#407f91" fill="none" stroke-width="2.5" marker-end="url(#arrow)"/><path d="M480 152H585" stroke="#a55d66" fill="none" stroke-width="2.5" marker-end="url(#arrow)"/><text x="475" y="65" class="detail-label">${t('水侧')}</text><text x="810" y="145" class="detail-label">${t('血液侧')}</text>`);
detail.append(el('exchange-oxygen'));
const macro=document.createElementNS('http://www.w3.org/2000/svg','g');macro.id='fish-macro';
[...scene.children].filter(node=>node!==detail&&node.tagName.toLowerCase()!=='defs').forEach(node=>macro.append(node));scene.insertBefore(macro,detail);
function setCondition(id:WaterCondition){condition=id;document.querySelectorAll<HTMLButtonElement>('[data-condition]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.condition===id)));el('condition-child').textContent=conditionCopy[id].child;el('condition-academic').textContent=conditionCopy[id].academic;const url=new URL(location.href);if(id==='renewed')url.searchParams.delete('water');else url.searchParams.set('water',id);history.replaceState(null,'',url);draw();}
function setZoom(open:boolean){zoomed=open;zoomButton.setAttribute('aria-pressed',String(open));zoomButton.textContent=open?t('回到整条鱼'):t('放大这片鳃');scene.setAttribute('aria-label',open?t('鳃小片交换面的概念放大图'):t('互动观察图'));cancelZoom();if(matchMedia('(prefers-reduced-motion: reduce)').matches){zoom=open?1:0;draw();return;}cancelZoom=animateValue({from:zoom,to:open?1:0,duration:650,onUpdate:v=>{zoom=v;draw();}});}
function draw(){const s=oxygenAt(progress);
 const inputs=conditionAt(condition);
 scene.setAttribute('viewBox',`${410*zoom} ${-30*zoom} ${1000-466*zoom} ${480-226*zoom}`);
 macro.setAttribute('opacity',String(1-Math.max(0,Math.min(1,(zoom-.12)/.76))));
 el('flow-in').setAttribute('opacity','.6');
 for(const [id,opacity] of [['flow-gill',s.enter],['flow-out',Math.max(0,(progress-.3)/.7)]] as const){el(id).setAttribute('visibility','visible');el(id).setAttribute('opacity',String(opacity));}
 el('oxygen').setAttribute('transform',`translate(${-205*s.enter} 0)`);el('oxygen').setAttribute('opacity',String(1-.8*s.enter));
 el('exchange-oxygen').setAttribute('transform',`translate(${s.x} ${s.y})`);
 [...el('water-parcels').children].forEach((c,i)=>{const x=895-350*progress*inputs.flow-i*37;c.setAttribute('cx',String(x));c.setAttribute('cy',String(58+i%2*23));c.setAttribute('opacity',x<465?'0':'1');});
 [...el('oxygen-supply').children].forEach((c,i)=>{const x=884-((progress*190*inputs.flow+i*47)%420);c.setAttribute('cx',String(x));c.setAttribute('cy',String(62+(i%3)*11));c.setAttribute('opacity',i<inputs.oxygenDots&&x>455?'0.72':'0');});
 el('water-current').setAttribute('opacity',String(.3+.7*inputs.flow));
 [...el('blood-parcels').children].forEach((c,i)=>{const x=465+340*progress+i*38;c.setAttribute('cx',String(x));c.setAttribute('cy','132');c.setAttribute('opacity',x>905?'0':'.7');});
 el<HTMLInputElement>('progress').value=String(Math.round(progress*1000));el('play').textContent=playing?t('暂停'):progress>=1?t('再看一次'):t('播放一次');
 document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===s.stage)));
 if(reported!==s.stage){reported=s.stage;el('badge').textContent=String(s.stage+1);el('state-title').textContent=titles[s.stage]!;el('state-text').textContent=texts[s.stage]!;}
}
function pause(){playing=false;cancelAnimationFrame(frame);draw();}
function seek(p:number){pause();cancelSeek();cancelSeek=animateValue({from:progress,to:p,duration:850,onUpdate:v=>{progress=v;draw();}});}
function tick(now:number){if(!playing)return;progress=Math.min(1,progress+Math.min(.06,(now-last)/1000)/20);last=now;draw();if(progress>=1)pause();else frame=requestAnimationFrame(tick);}
const stops=[0,.28,.56,1];
el('play').addEventListener('click',()=>{cancelSeek();if(playing){pause();return;}if(progress>=1)progress=0;if(matchMedia('(prefers-reduced-motion: reduce)').matches){progress=stops.find(p=>p>progress+.01)??1;draw();return;}playing=true;last=performance.now();draw();frame=requestAnimationFrame(tick);});
el('restart').addEventListener('click',()=>seek(0));el('progress').addEventListener('input',()=>{const p=Number(el<HTMLInputElement>('progress').value)/1000;pause();cancelSeek();progress=p;draw();});
document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b=>b.addEventListener('click',()=>seek(stops[Number(b.dataset.step)]!)));
document.querySelectorAll<HTMLButtonElement>('[data-condition]').forEach(b=>b.addEventListener('click',()=>setCondition(b.dataset.condition as WaterCondition)));
zoomButton.addEventListener('click',()=>setZoom(!zoomed));
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelSeek();cancelZoom();pause();}});window.addEventListener('pagehide',()=>{cancelSeek();cancelZoom();pause();});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{cancelZoom();pause();});
setCondition(condition);setZoom(false);mountReadingMode('details:not(.references)');

mountPresentationFrame({"root": ".lab", "visual": ".scene", "transport": ".motion-controls"});
