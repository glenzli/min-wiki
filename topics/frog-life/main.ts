import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t);
mountTopicNavigation('frog-life');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const report = (n: number, title: string, text: string) => { el('badge').textContent = String(n); el('state-title').textContent = title; el('state-text').textContent = text; };
const titles=[t('水里的卵'),t('长尾巴的小蝌蚪'),t('先看见后腿'),t('前腿也露出来了'),t('小青蛙来了')];
const texts=[t('卵外面有一层像果冻的胶质。里面的小生命慢慢发育，孵出蝌蚪。'),t('蝌蚪用尾巴游泳。多数青蛙会经历这样的水中幼体阶段。'),t('后腿先明显长出来。尾巴还在，身体正在继续变化。'),t('四条腿都看得见了，尾巴开始明显变短。肺等结构也在发育。'),t('尾巴被身体逐渐吸收了，不是掉下来了。小青蛙可以用腿游泳和跳跃。')];
const range=el<HTMLInputElement>('growth');
function render() {
  const s = Number(range.value);
  // Separate anatomical drawings keep newly visible limbs and the shortening tail legible.
  ['spawn', 'frog-stage-1', 'frog-stage-2', 'frog-stage-3', 'frog-stage-4'].forEach((id, i) => {
    el(id).setAttribute('visibility', i === s ? 'visible' : 'hidden');
  });
  el<HTMLButtonElement>('prev').disabled = s === 0;
  el<HTMLButtonElement>('next').disabled = s === 4;
  range.setAttribute('aria-valuetext', titles[s]!);
  report(s + 1, titles[s]!, texts[s]!);
}
range.addEventListener('input',render);for(const [id,delta] of [['prev',-1],['next',1]] as const)el(id).addEventListener('click',()=>{range.value=String(Number(range.value)+delta);render();});render();

mountReadingMode('details:not(.references)');
