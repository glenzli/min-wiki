import { animateValue } from '../../src/visuals/transition.ts';
import { habitats, specimenDefinitions, specimenArt, closeFrames, type Habitat } from './scene.ts';
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
let current: Habitat = 'soil';
let revealed = true, closer = false;
let frame = [0, 0, 600, 440];
let cancelCamera: () => void = () => {};
const details = {
  soil: { context:t('从落叶和根附近，走进土粒间的孔隙。'), title:t('不是空白的缝隙'), text:t('灰绿的水膜贴着土粒，细菌分布在其中。浅色分枝是真菌的菌丝，可以穿过颗粒之间的空间；画面把它们放大到容易比较。'), key:[t('土粒'),t('水膜中的细菌'),t('分枝的菌丝')] },
  water: { context:t('水面看起来很平静，微小世界却很丰富。'), title:t('一滴水里，身体也不一样'), text:t('绿色细胞示意微小藻类，体内有叶绿体；较大的长圆形示意有纤毛的原生生物。它们和细菌的结构不同，不能只按颜色认出真实物种。'), key:[t('微小藻类'),t('有纤毛的原生生物'),t('细菌')] },
  skin: { context:t('皮肤的表面并不是一块光滑的玻璃。'), title:t('沿着表面的沟纹找一找'), text:t('层层角质细胞形成表面，沟纹、毛孔附近的条件也不同。这里放大的细菌只是居民的代表；真实皮肤还有其他微生物。'), key:[t('表面角质细胞'),t('沟纹与毛孔'),t('细菌的代表')] },
  air: { context:t('风会搬运微小颗粒，也可能带着微生物。'), title:t('尘粒，是一段旅程'), text:t('圆形的小孢子附在这颗尘粒上，旁边还有带着细菌的液滴示意。这里画的是运输；被风带着走，不等于正在空气里繁殖。'), key:[t('尘粒'),t('附着的孢子'),t('液滴中的细菌')] },
};
get('specimen-drawing').innerHTML = specimenDefinitions + habitats.map(id => `<g data-specimen="${id}" opacity="${id === current ? 1 : 0}">${specimenArt[id]}</g>`).join('');
function updateCamera() {
  cancelCamera();
  const from = [...frame];
  const to = closer && revealed ? closeFrames[current] : [0,0,600,440];
  cancelCamera = animateValue({from:0,to:1,duration:800,onUpdate:amount => {
    frame = from.map((value,i) => value + (to[i]! - value) * amount);
    get('specimen').setAttribute('viewBox',frame.map(value => value.toFixed(3)).join(' '));
  }});
}
function render() {
  const scene = scenes.find(s => s.id === current)!;
  const detail = details[current];
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.place === current));
  for (const group of document.querySelectorAll<SVGGElement>('[data-scene]')) group.style.opacity=group.dataset.scene===current?'1':'0';
  for (const group of document.querySelectorAll<SVGGElement>('[data-specimen]')) group.style.opacity=group.dataset.specimen===current?'1':'0';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    button.setAttribute('aria-pressed',String((button.dataset.view === 'close') === closer));
    button.disabled = !revealed;
  }
  get('state-title').textContent = scene.title; get('state-text').textContent = scene.text; get('niche').textContent = scene.niche;
  get('context-note').textContent = detail.context;
  get('detail-title').textContent = detail.title;
  get('detail-text').textContent = detail.text;
  get('resident-key').replaceChildren(...detail.key.map((label,i) => {
    const item = document.createElement('span'); item.textContent=label; item.dataset.key=String(i); return item;
  }));
  get('specimen').style.opacity=revealed?'1':'0';
  get('specimen').setAttribute('aria-hidden',String(!revealed));
  get('specimen').setAttribute('aria-label',t('{{habitat}}；{{view}}。{{description}}',{habitat:scene.title,view:closer?t('靠近看细节'):t('看小环境'),description:detail.text}));
  get('closed-lens').toggleAttribute('hidden',revealed);
  get('view-title').textContent=closer?t('沿着同一幅画，靠近一点'):t('想象中的微观视野');
  get('reveal').setAttribute('aria-pressed', String(revealed));
  get('reveal').textContent = revealed ? t('收起想象放大镜') : t('打开想象放大镜');
  updateCamera();
}
buttons.forEach(button => button.addEventListener('click', () => { current = button.dataset.place as Habitat; render(); }));
get('reveal').addEventListener('click', () => { revealed = !revealed; render(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) button.addEventListener('click',() => {closer=button.dataset.view==='close';render();});
window.addEventListener('pagehide',() => {
  cancelCamera();
  frame = [...(closer && revealed ? closeFrames[current] : [0,0,600,440])];
  get('specimen').setAttribute('viewBox',frame.join(' '));
});
for (const item of document.querySelectorAll('#world [hidden]')) item.removeAttribute('hidden');
render();

mountReadingMode('details:not(.references)');
