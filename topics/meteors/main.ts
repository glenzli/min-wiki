import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation('meteors');
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => Number((el(id) as HTMLInputElement).value);
(el('journey') as HTMLInputElement).step = 'any';
function update(){const p=value('journey')/100,survive=(el('kind') as HTMLSelectElement).value==='stone',x=158+p*557,y=60+p*293,luminous=p>=.26&&p<.76,vanished=!survive&&p>=.76,entry=Math.max(0,(p-.26)/.5),size=survive?1-Math.min(1,entry)*.62:Math.max(0,1-entry);el('rock').setAttribute('transform',`translate(${x} ${y}) scale(${size})`);el('rock').setAttribute('display',vanished?'none':'block');const light = luminous ? Math.min(1, (p-.26)/.07, (.76-p)/.1) : 0; el('glow').setAttribute('opacity', String(light)); el('trail').setAttribute('opacity', String(light)); el('glow').setAttribute('cx',String(x));el('glow').setAttribute('cy',String(y));el('glow').setAttribute('display',luminous?'block':'none');el('trail').setAttribute('d',luminous?`M${x-78} ${y-41}L${x} ${y}`:'');el('stage-label').textContent=p<.26?t('流星体：太空里的小碎片'):luminous?t('流星：大气里的短暂亮迹'):!survive?t('小碎片已经消散'):p<1?t('剩下一块：不再明亮发光'):t('陨石：到达地面的碎片');el('readout').textContent=p<.26?t('还在太空中，没有流星亮迹；它不是远处的恒星。'):luminous?t('高速进入大气，与空气相互作用，产生亮迹，同时损失物质。'):!survive?t('这一条旅程没有陨石落地。小碎片在空中已经消散了。'):p<1?t('幸存碎片已经减速，亮迹消失，还会继续下落。'):t('幸存的碎片落地了，现在叫陨石。远处的恒星从来没有掉下来。');}let cancelJourney = () => {};
function travel(to: number) {
  cancelJourney();
  cancelJourney = animateValue({ from: value('journey'), to, duration: 2300,
    onUpdate: position => { (el('journey') as HTMLInputElement).value = String(position); update(); } });
}
el('journey').addEventListener('input', () => { cancelJourney(); update(); });
el('kind').addEventListener('change', () => { cancelJourney(); (el('journey') as HTMLInputElement).value = '0'; update(); });
for (const [id, p] of [['reset', 0], ['enter', 50], ['end', 100]] as const) el(id).addEventListener('click', () => travel(p));
update();

mountReadingMode('details:not(.references)');
