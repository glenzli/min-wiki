import { renderAnimal } from './scene.ts';
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
let frame = 0;
let playing = false;
let shownStage = -1;
const play = el<HTMLButtonElement>('play');
function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
  playing = false;
  play.textContent = t('慢慢播放');
  play.setAttribute('aria-pressed', 'false');
}
function render() {
  const p = Number(range.value);
  const stage = Math.min(4, Math.floor(p));
  renderAnimal(p);
  el<HTMLButtonElement>('prev').disabled = p === 0;
  el<HTMLButtonElement>('next').disabled = p === 4;
  range.setAttribute('aria-valuetext', titles[stage]!);
  if (stage !== shownStage) {
    report(stage + 1, titles[stage]!, texts[stage]!);
    shownStage = stage;
  }
}
function animateTo(target: number, duration: number) {
  stop();
  const from = Number(range.value);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { range.value = String(target); render(); return; }
  const start = performance.now();
  playing = true;
  play.textContent = t('暂停');
  play.setAttribute('aria-pressed', 'true');
  const tick = (now: number) => {
    const fraction = Math.min(1, (now-start)/duration);
    range.value = String(from + (target-from)*fraction);
    render();
    if (fraction < 1) frame = requestAnimationFrame(tick);
    else stop();
  };
  frame = requestAnimationFrame(tick);
}
range.addEventListener('input', () => { stop(); render(); });
for (const [id, delta] of [['prev', -1], ['next', 1]] as const) {
  el(id).addEventListener('click', () => {
    const p = Number(range.value);
    const target = Math.max(0, Math.min(4, delta > 0 ? Math.floor(p)+1 : Math.ceil(p)-1));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stop(); range.value = String(target); render();
    } else animateTo(target, 1000);
  });
}
play.addEventListener('click', () => {
  if (playing) { stop(); return; }
  if (Number(range.value) === 4) { range.value = '0'; render(); }
  animateTo(4, (4-Number(range.value))*6500);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('pagehide', stop);
render();

mountReadingMode('details:not(.references)');
