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
  const ns = 'http://www.w3.org/2000/svg';
  const group = get<SVGGElement>('microbes');
  group.replaceChildren();
  positions.forEach(([x, y], i) => {
    if (current === 'air' && i > 3) return;
    const item = document.createElementNS(ns, 'g');
    item.setAttribute('transform', `translate(${x} ${y}) rotate(${i * 43})`);
    const oval = document.createElementNS(ns, 'ellipse');
    const green = current === 'water' && i % 3 === 1;
    oval.setAttribute('rx', green ? '20' : i % 3 === 0 ? '11' : '23');
    oval.setAttribute('ry', green ? '20' : '11');
    oval.setAttribute('fill', green ? '#80ac60' : i % 2 ? '#799dac' : '#b5a46e');
    oval.setAttribute('stroke', green ? '#4e834b' : '#577e77');
    oval.setAttribute('stroke-width', '2'); item.append(oval);
    const strand = document.createElementNS(ns, 'path');
    strand.setAttribute('d', 'M-7 0q4-8 8 0t8 0'); strand.setAttribute('stroke', '#f7f4cb'); strand.setAttribute('fill', 'none'); strand.setAttribute('stroke-width', '2'); item.append(strand);
    group.append(item);
  });
  if (current === 'soil') {
    const fungus = document.createElementNS(ns, 'path');
    fungus.setAttribute('d', 'M569 265Q621 257 645 291T714 322M625 276l-16-34m57 67l16-19');
    fungus.setAttribute('fill', 'none'); fungus.setAttribute('stroke', '#b99887'); fungus.setAttribute('stroke-width', '6'); fungus.setAttribute('stroke-linecap', 'round'); group.append(fungus);
  }
}
function render() {
  const scene = scenes.find(s => s.id === current)!;
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.place === current));
  for (const group of document.querySelectorAll<SVGGElement>('[data-scene]')) group.style.display = group.dataset.scene === current ? '' : 'none';
  get('state-title').textContent = scene.title; get('state-text').textContent = scene.text; get('niche').textContent = scene.niche;
  get('microbes').style.display = revealed ? '' : 'none'; get('closed-lens').style.display = revealed ? 'none' : '';
  get('reveal').setAttribute('aria-pressed', String(revealed));
  get('reveal').textContent = revealed ? t("收起想象放大镜") : t("打开想象放大镜");
  drawResidents();
}
// Event-driven SVG: no timers, audio or background resources to stop on navigation.
buttons.forEach(button => button.addEventListener('click', () => { current = button.dataset.place!; render(); }));
get('reveal').addEventListener('click', () => { revealed = !revealed; render(); });
// SVG visibility uses display, since hidden is not supported consistently on SVG elements.
for (const item of document.querySelectorAll('svg [hidden]')) item.removeAttribute('hidden');
render();

mountReadingMode('details:not(.references)');
