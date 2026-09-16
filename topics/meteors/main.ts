import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { createMeteorScene } from './scene.ts';
import type { JourneyKind } from './model.ts';
import { t } from './i18n.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('meteors');
const el = (id: string) => document.getElementById(id)!;
const journey = el('journey') as HTMLInputElement;
const kind = el('kind') as HTMLSelectElement;
const scene = createMeteorScene(el('scene') as unknown as SVGSVGElement);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let playing = false, frame = 0, lastTime = 0;
let cancelJourney = () => {};
let lastStage = '';
const labels = {
  space: t('流星体：太空里的小碎片'), luminous: t('流星：大气里的短暂亮迹'),
  lost: t('小碎片已经消散'), dark: t('剩下一块：不再明亮发光'), landed: t('陨石：到达地面的碎片'),
};
const messages = {
  space: t('还在太空中，没有流星亮迹；它不是远处的恒星。'),
  luminous: t('亮点跟着碎片向前，余迹留在经过的空气里，慢慢散开。碎片正在失去物质。'),
  lost: t('这一条旅程没有陨石落地。留下的余迹还会渐渐变淡，它不是继续飞行的石头。'),
  dark: t('幸存碎片已经减速，不再明亮发光。它继续向下落，留在高处的余迹渐渐散去。'),
  landed: t('幸存的碎片落地了，现在叫陨石。远处的恒星从来没有掉下来。'),
};
function update() {
  const state = scene.draw(Number(journey.value) / 100, kind.value as JourneyKind);
  el('stage-label').textContent = labels[state.stage];
  if (lastStage !== state.stage) { el('readout').textContent = messages[state.stage]; lastStage = state.stage; }
  journey.setAttribute('aria-valuetext', `${Math.round(Number(journey.value))}% · ${labels[state.stage]}`);
  el('remaining-fill').style.width = `${state.mass * 100}%`;
  el('remaining-status').textContent = state.mass === 0 ? t('已经消散') : state.mass < .11 ? t('还有一小块') : t('正在旅途中');
}
function stop() {
  playing = false; cancelAnimationFrame(frame); lastTime = 0;
  el('play').textContent = (reducedMotion.matches ? t('每次看一步') : t('播放旅程')); el('play').setAttribute('aria-pressed', 'false');
}
function tick(now: number) {
  if (!playing) return;
  const dt = lastTime ? Math.min(.05, (now - lastTime) / 1000) : 0;
  lastTime = now;
  journey.value = String(Math.min(100, Number(journey.value) + dt * 100 / 15));
  update();
  if (Number(journey.value) >= 100) stop(); else frame = requestAnimationFrame(tick);
}
function travel(to: number) {
  stop(); cancelJourney();
  cancelJourney = animateValue({ from: Number(journey.value), to, duration: 1600,
    onUpdate: p => { journey.value = String(p); update(); } });
}
el('play').addEventListener('click', () => {
  cancelJourney();
  if (playing) { stop(); return; }
  if (reducedMotion.matches) { travel(Number(journey.value) >= 100 ? 0 : Math.min(100, Number(journey.value) + 15)); return; }
  if (Number(journey.value) >= 100) journey.value = '0';
  playing = true; lastTime = 0;
  el('play').textContent = t('暂停观察'); el('play').setAttribute('aria-pressed', 'true');
  frame = requestAnimationFrame(tick);
});
journey.addEventListener('input', () => { stop(); cancelJourney(); update(); });
kind.addEventListener('change', () => { stop(); cancelJourney(); lastStage = ''; update(); });
for (const [id, p] of [['reset', 0], ['enter', 43], ['dark', 79], ['end', 100]] as const) el(id).addEventListener('click', () => travel(p));
function motionPreference() { if (reducedMotion.matches) { stop(); cancelJourney(); } else if (!playing) stop(); }
reducedMotion.addEventListener('change', motionPreference);
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); cancelJourney(); } });
window.addEventListener('pagehide', () => { stop(); cancelJourney(); reducedMotion.removeEventListener('change', motionPreference); });
stop(); update();
mountReadingMode('details:not(.references)');
