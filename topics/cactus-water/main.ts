import { cactusAt, type CactusEvent } from './model.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t); mountTopicNavigation('cactus-water');
const scene = document.querySelector<SVGSVGElement>('#scene')!;
const result = document.querySelector<HTMLElement>('#result')!;
const background = `<defs><linearGradient id="cactus-skin"><stop stop-color="#416d4c"/><stop offset=".3" stop-color="#91ad73"/><stop offset=".56" stop-color="#658c57"/><stop offset="1" stop-color="#365f45"/></linearGradient><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#e4f0e8"/><stop offset="1" stop-color="#f7f5df"/></linearGradient><linearGradient id="soil" x2="0" y2="1"><stop stop-color="#d5b78e"/><stop offset="1" stop-color="#b58b62"/></linearGradient><linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#8dbc64"/><stop offset="1" stop-color="#3c8750"/></linearGradient><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="none" stroke="#2f9eb8" stroke-width="2"/></marker></defs><rect width="760" height="530" fill="url(#sky)"/><circle cx="656" cy="87" r="37" fill="#f7d477"/>`;

const el=<T extends Element=HTMLElement>(id:string):T=>document.getElementById(id)! as unknown as T;
let reserve=2,startReserve=2,shownReserve=2,progress=0,night=false,nightAmount=0,event:CactusEvent='rain',playing=false,frame=0,last=0,zoom=0,close=false,reported='';
let cancelNight:()=>void=()=>{},cancelView:()=>void=()=>{};
function draw(){const state=cactusAt(event,progress,startReserve);shownReserve=state.reserve;const skin=el<HTMLSelectElement>('layer').value==='skin',width=58+shownReserve*11;
let art=`<rect width="760" height="530" fill="#f5e9bf"/><rect width="760" height="530" fill="#253d58" opacity="${nightAmount}"/><circle cx="660" cy="89" r="34" fill="${night?'#f3efd7':'#f8ce69'}"/><circle cx="673" cy="78" r="30" fill="#253d58" opacity="${nightAmount}"/><path d="M0 415 Q184 376 360 420 T760 410 V530 H0" fill="#d6b889"/><path d="M306 418 Q267 436 155 439 M306 418 Q349 442 471 446 M256 435 L227 458 M361 436 L394 461" stroke="#aa8655" stroke-width="7" fill="none" class="line"/>`;
art+=`<path d="M${306-width} 417 V165 Q${306-width} 100 306 100 Q${306+width} 100 ${306+width} 165 V417Z" fill="url(#cactus-skin)" stroke="#42784c" stroke-width="5"/><path d="M${306-width} 298 H187 Q166 298 166 271 V219 M${306+width} 243 H437 Q459 243 459 212 V172" fill="none" stroke="url(#cactus-skin)" stroke-width="43" class="line"/>`;
art+=`<path d="M${306-width} 289H191Q175 289 175 269V219M${306+width} 235H435Q449 235 449 211V172" stroke="#a8bd81" stroke-width="2" fill="none" opacity=".6"/>`;
for(let i=-1;i<=1;i++)art+=`<path d="M${306+i*width*.55} 405 V166 Q${306+i*width*.55} 130 306 110" fill="none" stroke="#91b276" stroke-width="5"/>`;
for(let i=0;i<16;i++){const x=306+(i%3-1)*width*.8,y=160+Math.floor(i/3)*43;art+=`<ellipse cx="${x}" cy="${y}" rx="3.8" ry="5" fill="#c7bd91"/>${Array.from({length:7},(_,j)=>{const a=j*Math.PI*2/7;return `<path d="M${x} ${y}l${Math.cos(a)*(8+j%3)} ${Math.sin(a)*(8+j%3)}" stroke="#e9dfb2" stroke-width="1.1"/>`;}).join('')}`;}

const rain=Array.from({length:24},(_,i)=>{const y=105+((i*67+progress*510)%290),x=115+i%8*47;return `<path d="M${x} ${y}l-4 12" stroke="#70bfd0" stroke-width="2" opacity="${state.rain*.6}"/>`;}).join('');
art+=rain;
if(event==='rain'&&progress>.16&&progress<1){for(let i=0;i<6;i++){const u=Math.max(0,Math.min(1,state.uptake-i*.085));const x=u<.45?175+131*u/.45:306,y=u<.45?442-24*u/.45:418-165*(u-.45)/.55;art+=`<circle cx="${x}" cy="${y}" r="${3+i%2}" fill="#57bbd0" stroke="#ebfaff" stroke-width="1" opacity="${u>0&&u<1?.85:0}"/>`;}}
art+=`<rect x="505" y="210" width="211" height="215" rx="24" fill="#fffcf0" stroke="#a6ba8b" stroke-width="2"/>`;
if(!skin){for(let i=0;i<12;i++){const x=537+i%3*66,y=243+Math.floor(i/3)*48;const r=10+shownReserve*3.3;art+=`<path d="M${x-25} ${y-20}l35-5 17 20-11 22-31 4-15-19Z" fill="#c6d59a" stroke="#7c985b" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.7}" fill="#78c0c8" opacity=".85"/><circle cx="${x+18}" cy="${y+11}" r="3.5" fill="#7b8b54"/>`;}}
else{const gap=3+11*nightAmount;art+=`<path d="M520 303H699V325H520Z" fill="#adc488"/><path d="M520 297H699" stroke="#d6b763" stroke-width="7"/><path d="M${610-gap} 313q-21-29-31 0q10 29 31 0M${610+gap} 313q21-29 31 0q-10 29-31 0" fill="#76a16b" stroke="#496d47" stroke-width="2"/><ellipse cx="610" cy="313" rx="${gap}" ry="15" fill="#455f45"/>`;
for(let i=0;i<4;i++){const u=Math.max(0,Math.min(1,progress*1.45-i*.17));const co2Y=246+112*u,vapourY=350-107*u;art+=`<circle cx="${610-gap*.15}" cy="${co2Y}" r="4" fill="#a46e46" opacity="${nightAmount*(u>0&&u<1?.85:0)}"/><circle cx="${610+gap*.3}" cy="${vapourY}" r="3.5" fill="none" stroke="#449db8" stroke-width="1.7" opacity="${(.1+.55*nightAmount)*(u>0&&u<1?1:0)}"/>`;}
art+=`<g fill="#94b877" stroke="#648c57" stroke-width="1.5"><ellipse cx="550" cy="380" rx="23" ry="18"/><ellipse cx="610" cy="380" rx="23" ry="18"/><ellipse cx="670" cy="380" rx="23" ry="18"/></g>`;
}
scene.innerHTML=background+art;
el('day').setAttribute('aria-pressed',String(!night));el('night').setAttribute('aria-pressed',String(night));el<HTMLButtonElement>('dry').disabled=shownReserve<=.001;
el('play').textContent=playing?t('暂停'):progress>=1?t('再观察一次'):t('继续观察');el<HTMLInputElement>('progress').value=String(Math.round(progress*1000));el('zoom').textContent=close?t('看全株'):t('放大组织');
const key=`${skin}-${night}-${event}-${state.stage}`;
if(reported!==key){reported=key;result.textContent=skin?(night?t('多数沙漠仙人掌在较凉的夜晚开放气孔，吸收二氧化碳，也会损失一些水。'):t('白天很热，许多沙漠仙人掌关闭气孔，减少失水。蜡质表层也能帮助留住水。')):event==='rain'?[t('先下雨：水要到达土壤和根，茎才会逐渐补充水分。'),t('蓝色标记沿根进入茎。它是追踪水的记号，不是根里真实可见的大水珠。'),t('雨水被根吸收，茎里的细胞储存了更多水，茎变得饱满。它不是装满清水的空瓶子。')][state.stage]!:t('干燥时间过去，储水逐渐减少，茎会收缩。刺、表皮和气孔的工作方式帮助它省水。');}
}
function pause(){playing=false;cancelAnimationFrame(frame);draw();reserve=shownReserve;}
function tick(now:number){if(!playing)return;progress=Math.min(1,progress+Math.min(.06,(now-last)/1000)/(event==='rain'?12:16));last=now;draw();if(progress>=1)pause();else frame=requestAnimationFrame(tick);}
function play(){if(matchMedia('(prefers-reduced-motion: reduce)').matches){progress=Math.min(1,progress+.25);draw();reserve=shownReserve;return;}playing=true;last=performance.now();draw();frame=requestAnimationFrame(tick);}
function begin(kind:CactusEvent){pause();event=kind;startReserve=reserve;progress=0;reported='';play();}
el('rain').addEventListener('click',()=>begin('rain'));el('dry').addEventListener('click',()=>begin('dry'));el('exchange').addEventListener('click',()=>{el<HTMLSelectElement>('layer').value='skin';begin('exchange');});
el('play').addEventListener('click',()=>{if(playing){pause();return;}if(progress>=1){startReserve=reserve;progress=0;}play();});
el('progress').addEventListener('input',()=>{const p=Number(el<HTMLInputElement>('progress').value)/1000;pause();progress=p;draw();reserve=shownReserve;});
function setNight(value:boolean){cancelNight();night=value;cancelNight=animateValue({from:nightAmount,to:value?1:0,duration:1000,onUpdate:v=>{nightAmount=v;draw();}});}
el('day').addEventListener('click',()=>setNight(false));el('night').addEventListener('click',()=>setNight(true));el('layer').addEventListener('change',()=>{reported='';draw();});
el('zoom').addEventListener('click',()=>{close=!close;cancelView();cancelView=animateValue({from:zoom,to:close?1:0,duration:850,onUpdate:z=>{zoom=z;const w=760/(1+1.2*z),h=530/(1+1.2*z);scene.setAttribute('viewBox',`${(610-w/2)*z} ${(318-h/2)*z} ${w} ${h}`);}});draw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelNight();pause();}});window.addEventListener('pagehide',()=>{cancelNight();cancelView();pause();});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>pause());
draw();mountReadingMode('details:not(.references)');
