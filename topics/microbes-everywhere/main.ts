import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t);
mountTopicNavigation('microbes-everywhere');
const scenes = [
  {id: "soil", title: t("颗粒之间，也有小天地"), text: t("土粒之间有孔隙，里面可以有空气、水和养分。不同的细菌、真菌和其他微生物，住在适合自己的小环境里；一些参与分解落叶，让物质回到循环中。"), niche: t("水分、养分和孔隙各不相同。")},
  {id: "water", title: t("看起来清，不等于没有"), text: t("池水里可能有细菌、微小的藻类和原生生物。有的利用光，有的利用其他食物。清澈与浑浊，都不能单独告诉我们水里有哪些微生物。"), niche: t("光、水和可用养分影响谁能生长。")},
  {id: "skin", title: t("身体表面，也有邻居"), text: t("皮肤上生活着微生物。干燥、湿润和油脂较多的部位，常有不同的群落。遇见微生物不等于生病，种类、位置和我们的身体状态都很重要。"), niche: t("同一张皮肤，也有不同的小环境。")},
  {id: "air", title: t("有时，只是在搭便车"), text: t("一些微生物或它们的孢子，会随着尘粒、飞沫和气流迁移。被带到一个地方，不等于能在那里生长；干燥、阳光和缺少养分都会限制许多微生物。"), niche: t("到达、存活、繁殖，是三件不同的事。")}
];
const get = <T extends Element = HTMLElement>(id: string) => document.getElementById(id)! as unknown as T;
const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-place]')];
let current = 'soil', revealed = false;
const positions = [[625, 192], [740, 170], [814, 241], [689, 276], [615, 315], [755, 357], [787, 303], [688, 371], [666, 213]];
function drawResidents() {
  const group=get<SVGGElement>('microbes');
  const items:string[]=[];
  positions.forEach(([x,y],i)=>{
    if(current==='air'&&i>3)return;
    let anatomy='';
    if(current==='air') {
      // Air is a transport setting: spores sit on particulate carriers, not a growth culture.
      anatomy=`<path d="M-28 -4L-12 -21 12 -14 30 8 9 22-19 17Z" fill="#b9b3a2" opacity=".6"/><path d="M-21 -2l19-9 22 18-16 10" fill="none" stroke="#948d7d" opacity=".45"/><circle cx="-5" cy="-4" r="8" fill="#b5a46e" stroke="#87774f" stroke-width="2"/><circle cx="9" cy="5" r="6" fill="#c8bd91" stroke="#87774f" stroke-width="1.5"/>`;
    } else if(current==='water'&&i%3===1) {
      anatomy=`<ellipse rx="22" ry="18" fill="#b3cc82" stroke="#537c4d" stroke-width="2"/><ellipse cx="-5" cy="-3" rx="6" ry="5" fill="#867e9d"/><g fill="#5e974a"><ellipse cx="11" cy="-7" rx="5" ry="3"/><ellipse cx="10" cy="8" rx="6" ry="3"/><ellipse cx="-11" cy="8" rx="5" ry="3"/></g>`;
    } else if(current==='water'&&i%3===2) {
      const cilia=Array.from({length:20},(_,j)=>{const a=j*Math.PI/10;return `<path d="M${Math.cos(a)*26} ${Math.sin(a)*14}l${Math.cos(a)*7} ${Math.sin(a)*7}"/>`;}).join('');
      anatomy=`<g stroke="#799895" stroke-width="1.1">${cilia}</g><path d="M-27 0C-30-19 4-21 22-10S27 17 4 17-25 12-27 0Z" fill="#c1d3c6" stroke="#799895" stroke-width="2"/><ellipse cx="-4" rx="8" ry="5" fill="#948eab"/><circle cx="15" cy="4" r="4" fill="#e8edda"/>`;
    } else if(i%3===0) {
      anatomy=`<g fill="url(#resident-warm)" stroke="#887a4f" stroke-width="1.4"><circle cx="-8" r="9"/><circle cx="8" cy="4" r="9"/><circle cx="2" cy="-11" r="8"/></g>`;
    } else {
      anatomy=`<ellipse rx="24" ry="11" fill="url(#resident-cool)" stroke="#577e77" stroke-width="1.6"/><path d="M-10 0q5-7 10 0t10 0" stroke="#f0edc4" fill="none" stroke-width="1.7"/><path d="M-15-5Q-5-10 10-5" stroke="#eff4dc" opacity=".65" fill="none" stroke-width="1.2"/>`;
    }
    items.push(`<g transform="translate(${x} ${y}) rotate(${i*43})">${anatomy}</g>`);
  });
  if(current==='soil')items.push(`<g fill="none" stroke-linecap="round"><path d="M569 265Q621 257 645 291T714 322M625 276l-16-34m57 67l16-19" stroke="#b99887" stroke-width="7"/><path d="M569 263Q621 255 645 289T714 320M625 274l-16-34" stroke="#ead4bb" stroke-width="2"/><path d="M592 260l1 9M624 266l-5 7M646 286l-7 5M670 307l-4 7M696 317l-1 8" stroke="#977d6c" stroke-width="1.3"/></g>`);
  group.innerHTML=`<defs><radialGradient id="resident-cool" cx="30%" cy="25%"><stop stop-color="#d7e2ca"/><stop offset="1" stop-color="#799dac"/></radialGradient><radialGradient id="resident-warm" cx="30%" cy="25%"><stop stop-color="#eee0b0"/><stop offset="1" stop-color="#b5a46e"/></radialGradient></defs>`+items.join('');
}

function render() {
  const scene = scenes.find(s => s.id === current)!;
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.place === current));
  for (const group of document.querySelectorAll<SVGGElement>('[data-scene]')) { group.style.display=''; group.style.opacity=group.dataset.scene===current?'1':'0'; }
  get('state-title').textContent = scene.title; get('state-text').textContent = scene.text; get('niche').textContent = scene.niche;
  get('microbes').style.opacity=revealed?'1':'0';get('closed-lens').style.opacity=revealed?'0':'1';
  get('reveal').setAttribute('aria-pressed', String(revealed));
  get('reveal').textContent = revealed ? t("收起想象放大镜") : t("打开想象放大镜");
  drawResidents();
}
// Event-driven SVG: no timers, audio or background resources to stop on navigation.
buttons.forEach(button => button.addEventListener('click', () => { current = button.dataset.place!; render(); }));
get('reveal').addEventListener('click', () => { revealed = !revealed; render(); });
// SVG visibility is explicit; HTML hidden has inconsistent SVG support.
for (const item of document.querySelectorAll('svg [hidden]')) item.removeAttribute('hidden');
render();

mountReadingMode('details:not(.references)');
