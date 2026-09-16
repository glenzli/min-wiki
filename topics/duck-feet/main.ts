import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t);
mountTopicNavigation('duck-feet');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const report = (n: number, title: string, text: string) => { el('badge').textContent = String(n); el('state-title').textContent = title; el('state-text').textContent = text; };
let phase=0;const titles=[t('脚趾之间连着蹼'),t('推水向后，身体向前'),t('缩小脚掌，轻轻收回')];const texts=[t('蹼就是脚趾之间连接的皮肤。张开脚时，它让脚掌像一把宽宽的小船桨。'),t('张开的蹼增大推水的面积。脚向后划，水也会给鸭子一个向前的力。'),t('收脚时，脚掌缩拢，迎着水的面积变小，回程的阻力也会减小。')];
let shown = 0;
let cancelStroke: () => void = () => {};
function pose(value: number) {
  const without = el<HTMLInputElement>('without').checked;
  const push = Math.min(1, value), recovery = Math.max(0, value - 1);
  const scale = 1 - .7 * recovery;
  el('foot').setAttribute('transform', `translate(${755 - 35 * push + 35 * recovery} 234) scale(${scale} 1)`);
  el('small-foot').setAttribute('transform', `translate(-20 100) rotate(${45 * push - 65 * recovery}) scale(${scale} 1)`);
  // Recovery changes the foot, never snaps the whole duck back to its starting point.
  el('duck').setAttribute('transform', `translate(${315 + 58 * push} 183)`);
  el('web').setAttribute('opacity', without ? '0' : '1');
  el('water-push').setAttribute('visibility', 'visible');
  el('duck-go').setAttribute('visibility', 'visible');
  el('water-push').setAttribute('opacity',String(push * (1 - recovery)));
  el('duck-go').setAttribute('opacity',String(push * (1 - recovery)));
  el('water-push').setAttribute('stroke-width', without ? '4' : '10');
}
function render() {
  const without=el<HTMLInputElement>('without').checked;
  document.querySelectorAll<HTMLButtonElement>('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.phase)===phase)));
  pose(shown);
  report(phase+1,without?t('想象只剩分开的脚趾'):titles[phase]!,without?t('这个对照图把蹼藏起来：只剩脚趾，推水的面积小了。这是比较形状的想象实验，真实的鸭子仍然有蹼。'):texts[phase]!);
}
document.querySelectorAll<HTMLButtonElement>('[data-phase]').forEach(b=>b.addEventListener('click',()=>{
  cancelStroke(); phase=Number(b.dataset.phase); render();
  cancelStroke=animateValue({from:shown,to:phase,duration:1050,onUpdate:value=>{shown=value;pose(value);}});
}));
el('without').addEventListener('change',render);
render();

mountReadingMode('details:not(.references)');
