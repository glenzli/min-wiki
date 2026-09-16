import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t);
mountTopicNavigation('fish-gills');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const report = (n: number, title: string, text: string) => { el('badge').textContent = String(n); el('state-title').textContent = title; el('state-text').textContent = text; };
const titles=[t('水里溶着氧气'),t('鳃像许多薄薄的小片'),t('氧气穿过薄薄的表面'),t('水流出去，继续换新水')];const texts=[t('鱼嘴吸入水。水中溶解的氧气不是图里这么大的小球，也不是必须看见的气泡。'),t('水流过鳃。放大镜里，粉红色小片有很大的表面积，里面有细小血管。'),t('水中的一部分氧气进入血液，由血液送到身体各处。鱼不是把水拆成氧气。'),t('水从鳃盖附近流出去。不断有新水流过鳃，带来新的氧气；二氧化碳也能由鳃进入水中。')];
let step = 0, shown = 0;
let cancelFlow: () => void = () => {};
function drawFlow(value: number) {
  const enter = Math.min(1,value), transfer = Math.min(1,Math.max(0,value-1));
  el('flow-in').setAttribute('opacity',String(1-.55*enter));
  el('flow-gill').setAttribute('visibility','visible');
  el('flow-gill').setAttribute('opacity',String(enter));
  el('flow-out').setAttribute('visibility','visible');
  el('flow-out').setAttribute('opacity',String(Math.max(0,value-2)));
  el('oxygen').setAttribute('transform',`translate(${-175*enter-35*transfer} ${35*transfer})`);
  el('oxygen').setAttribute('opacity',String(1-.8*transfer));
  el('exchange-detail').setAttribute('opacity',String(.38+.62*enter));
  el('exchange-oxygen').setAttribute('transform',`translate(0 ${65*transfer})`);
  el('exchange-oxygen').setAttribute('opacity',String(1-transfer));
  el('oxygen-blood').setAttribute('visibility','visible');
  el('oxygen-blood').setAttribute('opacity',String(transfer));
  // In the inset oxygen crosses the surface before entering the depicted blood side.
  el('oxygen-blood').setAttribute('transform',`translate(${32*(1-transfer)} ${-15*(1-transfer)})`);
}
function render() {
  document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===step)));
  report(step+1,titles[step]!,texts[step]!);
  drawFlow(shown);
}
document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b=>b.addEventListener('click',()=>{
  cancelFlow(); step=Number(b.dataset.step); render();
  cancelFlow=animateValue({from:shown,to:step,duration:1100,onUpdate:value=>{shown=value;drawFlow(value);}});
}));
render();

mountReadingMode('details:not(.references)');
