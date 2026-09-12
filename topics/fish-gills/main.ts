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
let step=0;function render(){document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===step)));el('flow-in').setAttribute('opacity',step===0?'1':'.25');el('flow-gill').setAttribute('visibility',step>=1?'visible':'hidden');el('flow-out').setAttribute('visibility',step===3?'visible':'hidden');el('oxygen').setAttribute('transform',step===0?'':step===1?'translate(-175 0)':'translate(-210 35)');el('oxygen').setAttribute('opacity',step>=2?'.25':'1');el('oxygen-blood').setAttribute('visibility',step>=2?'visible':'hidden');report(step+1,titles[step]!,texts[step]!);}
document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b=>b.addEventListener('click',()=>{step=Number(b.dataset.step);render();}));render();

mountReadingMode('details:not(.references)');
