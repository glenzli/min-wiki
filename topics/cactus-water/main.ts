import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t); mountTopicNavigation('cactus-water');
const scene = document.querySelector<SVGSVGElement>('#scene')!;
const result = document.querySelector<HTMLElement>('#result')!;
const background = `<defs><linearGradient id="cactus-skin"><stop stop-color="#416d4c"/><stop offset=".3" stop-color="#91ad73"/><stop offset=".56" stop-color="#658c57"/><stop offset="1" stop-color="#365f45"/></linearGradient><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#e4f0e8"/><stop offset="1" stop-color="#f7f5df"/></linearGradient><linearGradient id="soil" x2="0" y2="1"><stop stop-color="#d5b78e"/><stop offset="1" stop-color="#b58b62"/></linearGradient><linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#8dbc64"/><stop offset="1" stop-color="#3c8750"/></linearGradient><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="none" stroke="#2f9eb8" stroke-width="2"/></marker></defs><rect width="760" height="530" fill="url(#sky)"/><circle cx="656" cy="87" r="37" fill="#f7d477"/>`;
const el = <T extends HTMLElement>(id: string) => document.getElementById(id)! as T;
const label = (x: number, y: number, text: string, cls = '') => {
  const lines: string[] = [''];
  if (cls === 'small' && text.includes(' ') && text.length > 18) {
    for (const word of text.split(' ')) {
      const last = lines.length - 1;
      if (lines[last] && lines[last]!.length + word.length + 1 > 18) lines.push(word);
      else lines[last] += (lines[last] ? ' ' : '') + word;
    }
  } else lines[0] = text;
  return `<text x="${x}" y="${y}" text-anchor="middle" class="${cls}">${lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : 22}">${line} </tspan>`).join('')}</text>`;
};
let reserve=2,night=false;el('rain').addEventListener('click',()=>{reserve=3;draw()});el('dry').addEventListener('click',()=>{reserve=Math.max(0,reserve-1);draw()});el('day').addEventListener('click',()=>{night=false;draw()});el('night').addEventListener('click',()=>{night=true;draw()});el('layer').addEventListener('change',draw);
function draw() { const skin=el<HTMLSelectElement>('layer').value==='skin';const width=58+reserve*11;
let art=`<rect width="760" height="530" fill="${night?'#253d58':'#f5e9bf'}"/><circle cx="660" cy="89" r="34" fill="${night?'#f3efd7':'#f8ce69'}"/>${night?'<circle cx="673" cy="78" r="30" fill="#253d58"/>':''}<path d="M0 415 Q184 376 360 420 T760 410 V530 H0" fill="#d6b889"/><path d="M306 418 Q267 436 155 439 M306 418 Q349 442 471 446 M256 435 L227 458 M361 436 L394 461" stroke="#aa8655" stroke-width="7" fill="none" class="line"/>`;
art+=`<path d="M${306-width} 417 V165 Q${306-width} 100 306 100 Q${306+width} 100 ${306+width} 165 V417Z" fill="url(#cactus-skin)" stroke="#42784c" stroke-width="5"/><path d="M${306-width} 298 H187 Q166 298 166 271 V219 M${306+width} 243 H437 Q459 243 459 212 V172" fill="none" stroke="url(#cactus-skin)" stroke-width="43" class="line"/>`;
art+=`<path d="M${306-width} 289H191Q175 289 175 269V219M${306+width} 235H435Q449 235 449 211V172" stroke="#a8bd81" stroke-width="2" fill="none" opacity=".6"/>`;
for(let i=-1;i<=1;i++)art+=`<path d="M${306+i*width*.55} 405 V166 Q${306+i*width*.55} 130 306 110" fill="none" stroke="#91b276" stroke-width="5"/>`;
for(let i=0;i<16;i++){const x=306+(i%3-1)*width*.8,y=160+Math.floor(i/3)*43;art+=`<ellipse cx="${x}" cy="${y}" rx="3.8" ry="5" fill="#c7bd91"/>${Array.from({length:7},(_,j)=>{const a=j*Math.PI*2/7;return `<path d="M${x} ${y}l${Math.cos(a)*(8+j%3)} ${Math.sin(a)*(8+j%3)}" stroke="#e9dfb2" stroke-width="1.1"/>`;}).join('')}`;}
art+=`<rect x="505" y="210" width="211" height="215" rx="24" fill="#fff" opacity=".93"/>`;
if(!skin){art+=`<rect x="535" y="251" width="55" height="127" rx="17" fill="#dbe5ce"/><rect x="540" y="${370-reserve*30}" width="45" height="${reserve*30+3}" rx="11" fill="#60b9c9"/>`;for(let i=0;i<reserve;i++)art+=`<ellipse cx="639" cy="${270+i*35}" rx="22" ry="14" fill="#a3c783"/>`;art+=label(610,236,t('茎内储水'),'small')+label(610,404,[t('所剩不多'),t('还有一些'),t('比较充足'),t('刚吸饱水')][reserve]!,'small');}
else{art+=`<rect x="530" y="275" width="160" height="34" rx="10" fill="#b6cd8c"/><rect x="530" y="267" width="160" height="8" rx="4" fill="#e3cb7e"/><ellipse cx="602" cy="291" rx="${night?12:4}" ry="24" fill="#426c43"/>${night?'<path d="M602 255 v-26" stroke="#59adc3" stroke-width="4" marker-end="url(#arrow)"/>':''}`+label(610,350,night?t('夜晚：小孔开放'):t('白天：小孔关闭'),'small')+label(610,389,t('蜡质表层减少失水'),'small');}
scene.innerHTML=background+art;
result.textContent=skin?(night?t('多数沙漠仙人掌在较凉的夜晚开放气孔，吸收二氧化碳，也会损失一些水。'):t('白天很热，许多沙漠仙人掌关闭气孔，减少失水。蜡质表层也能帮助留住水。')):(reserve===3?t('雨水被根吸收，茎里的细胞储存了更多水，茎变得饱满。它不是装满清水的空瓶子。'):reserve===0?t('储水所剩不多，茎收缩了。仙人掌也不能永远不喝水，试试下一场雨。'):t('干燥时间过去，储水逐渐减少，茎会收缩。刺、表皮和气孔的工作方式帮助它省水。'));
el('day').setAttribute('aria-pressed',String(!night));el('night').setAttribute('aria-pressed',String(night));el<HTMLButtonElement>('dry').disabled=reserve===0; }
draw();

mountReadingMode('details:not(.references)');
