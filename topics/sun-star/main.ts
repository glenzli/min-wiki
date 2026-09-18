import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { angularRatio, solarObservation } from './model.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('sun-star');
const el = (id: string) => document.getElementById(id)!;
const distance = el('distance') as HTMLInputElement;
distance.step = 'any';
let playing = false, frame = 0, last = 0, cancelJourney = () => {};
function update() {
  const factor = 10 ** Number(distance.value), radius = Math.max(1.5, 112 * angularRatio(factor)), observation = solarObservation(factor);
  el('view-sun').setAttribute('r', String(radius)); el('view-surface').setAttribute('transform', `translate(664 218) scale(${radius / 112})`); el('view-halo').setAttribute('r', String(Math.max(7, radius * 1.35)));
  el('distance-label').textContent = t('距离：{{factor}} AU', {factor: factor.toFixed(1)});
  el('angle').textContent = `${observation.angularDiameterDegrees.toFixed(4)}°`;
  const seconds = Math.round(observation.lightTravelSeconds);
  el('delay').textContent = seconds < 3600 ? t('{{minutes}} 分 {{seconds}} 秒', {minutes: Math.floor(seconds / 60), seconds: Math.round(seconds % 60)}) : seconds < 86400 ? t('{{hours}} 小时', {hours: (seconds / 3600).toFixed(1)}) : t('{{days}} 天', {days: (seconds / 86400).toFixed(2)});
  const percent = observation.relativeIrradiance * 100;
  el('flux').textContent = `${percent.toFixed(percent < .01 ? 4 : percent < 1 ? 2 : 1)}%`;
  el('scale-note').textContent = radius <= 1.5 ? t('右图已保留最小亮点；请看角直径数值继续比较。') : t('左右两图使用同一基准；右边改变的是视大小。');
  el('play').textContent = playing ? t('暂停旅行') : Number(distance.value) >= 3 ? t('从头旅行') : t('慢慢移远');
  distance.setAttribute('aria-valuetext', t('距离：{{factor}} AU', {factor: factor.toFixed(1)}));
}
function stop() { playing = false; cancelAnimationFrame(frame); frame = 0; cancelJourney(); }
function tick(now: number) { frame = 0; if (!playing || document.hidden) return; distance.value = String(Math.min(3, Number(distance.value) + Math.min((now - last) / 1000, .1) * .18)); last = now; if (Number(distance.value) >= 3) playing = false; update(); if (playing) frame = requestAnimationFrame(tick); }
function resume() { playing = true; last = performance.now(); frame = requestAnimationFrame(tick); update(); }
function travel(to: number, after?: () => void) { stop(); cancelJourney = animateValue({ from: Number(distance.value), to, duration: 1500, onUpdate: value => { distance.value = String(value); update(); }, onComplete: after }); }
distance.addEventListener('input', () => { stop(); update(); });
el('near').addEventListener('click', () => travel(0)); el('far').addEventListener('click', () => travel(3));
el('play').addEventListener('click', () => { cancelJourney(); if (playing) {stop(); update();} else if (Number(distance.value) >= 3) travel(0, resume); else resume(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-distance]')) b.addEventListener('click', () => travel(Number(b.dataset.distance)));
document.addEventListener('visibilitychange', () => { if (document.hidden) {stop(); update();} }); window.addEventListener('pagehide', stop);
update(); mountReadingMode('details:not(.references)');
