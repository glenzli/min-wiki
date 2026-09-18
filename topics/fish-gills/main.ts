import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
import { oxygenAt } from './model.ts';
translateDocument(t); mountTopicNavigation('fish-gills');
const el=<T extends Element = HTMLElement>(id:string):T=>document.getElementById(id)! as unknown as T;
const titles=[t('水里溶着氧气'),t('鳃像许多薄薄的小片'),t('氧气穿过薄薄的表面'),t('水流出去，继续换新水')];const texts=[t('鱼嘴吸入水。水中溶解的氧气不是图里这么大的小球，也不是必须看见的气泡。'),t('水流过鳃。放大镜里，粉红色小片有很大的表面积，里面有细小血管。'),t('水中的一部分氧气进入血液，由血液送到身体各处。鱼不是把水拆成氧气。'),t('水从鳃盖附近流出去。不断有新水流过鳃，带来新的氧气；二氧化碳也能由鳃进入水中。')];

let progress=0,playing=false,frame=0,last=0,reported=-1;
let cancelSeek:()=>void=()=>{};
el('exchange-oxygen').innerHTML='<circle r="7"/>';
el('oxygen-blood').remove();
const detail=el('exchange-detail');
detail.insertAdjacentHTML('beforeend','<g id="water-parcels" fill="#77babf" opacity=".55"><circle r="3"/><circle r="3"/><circle r="3"/><circle r="3"/></g><g id="blood-parcels" fill="#c57670"><ellipse rx="10" ry="5"/><ellipse rx="10" ry="5"/><ellipse rx="10" ry="5"/></g><path d="M882 48H765M480 152H585" stroke="#407f91" fill="none" stroke-width="2.5" marker-end="url(#arrow)"/>');
function draw(){const s=oxygenAt(progress);
 el('flow-in').setAttribute('opacity','.6');
 for(const [id,opacity] of [['flow-gill',s.enter],['flow-out',Math.max(0,(progress-.3)/.7)]] as const){el(id).setAttribute('visibility','visible');el(id).setAttribute('opacity',String(opacity));}
 el('oxygen').setAttribute('transform',`translate(${-205*s.enter} 0)`);el('oxygen').setAttribute('opacity',String(1-.8*s.enter));
 el('exchange-oxygen').setAttribute('transform',`translate(${s.x} ${s.y})`);
 [...el('water-parcels').children].forEach((c,i)=>{const x=895-350*progress-i*37;c.setAttribute('cx',String(x));c.setAttribute('cy',String(58+i%2*23));c.setAttribute('opacity',x<465?'0':'1');});
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
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelSeek();pause();}});window.addEventListener('pagehide',()=>{cancelSeek();pause();});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>pause());
draw();mountReadingMode('details:not(.references)');
