import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation('sun-star');
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => Number((el(id) as HTMLInputElement).value);
(el('distance') as HTMLInputElement).step = 'any';
import { angularRatio } from './model.ts';
function update(){const factor=10**value('distance'),radius=Math.max(1.5,112*angularRatio(factor));el('view-sun').setAttribute('r',String(radius));el('view-surface').setAttribute('transform',`translate(664 218) scale(${radius/112})`);el('view-halo').setAttribute('r',String(Math.max(7,radius*1.35)));el('distance-label').textContent=t('距离：地日距离的 {{factor}} 倍',{factor:factor.toFixed(1)});el('readout').textContent=t('你离太阳约远了 {{factor}} 倍，太阳的真实大小没变。右边只是看起来更小了。',{factor:factor.toFixed(1)});}
let cancelJourney = () => {};
function travel(to: number) {
  cancelJourney();
  cancelJourney = animateValue({ from: value('distance'), to, duration: 1500,
    onUpdate: position => { (el('distance') as HTMLInputElement).value = String(position); update(); } });
}
el('distance').addEventListener('input', () => { cancelJourney(); update(); });
el('near').addEventListener('click', () => travel(0));
el('far').addEventListener('click', () => travel(3));
update();

mountReadingMode('details:not(.references)');
