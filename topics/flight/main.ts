import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { t } from './i18n.ts';
import { flightSnapshot, type FlightSnapshot, type Conditions } from './model.ts';
import { drawWing, drawRunway } from './scene.ts';

translateDocument(t);
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
let conditions: Conditions = { speed: 38, pitch: 8 }, progress = 0, playing = false, frame = 0;
let chapter: 'wing' | 'runway' = new URLSearchParams(location.search).get('chapter') === 'runway' ? 'runway' : 'wing';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const write = (id: string, text: string) => { if (el(id).textContent !== text) el(id).textContent = text; };
function explanation(s: FlightSnapshot) {
 if (s.airspeed < .1) return t('机翼和空气没有相对运动，模型升力为零。抬起翼头，也不会凭空飞起来。');
 if (s.stalled) return t('翼头抬得太多，上方气流明显分离。超过本模型的临界迎角后，升力系数从峰值下降，阻力增加；失速不是发动机停了。');
 if (s.height > .01) return t('这组条件让飞机离地。上升改变了迎面气流的方向，所以迎角会减小；抬翼头的角度一直没有变。');
 if (s.netVertical > 0) return t('空气给出的向上作用超过重量，地面不再需要托住它。播放短窗口，看看这次是否离地。');
 return t('气流被机翼改变了，但向上作用还不够抵消重量。轮子仍由跑道托住；再比较速度或翼头角度。');
}
function update() {
 const s = flightSnapshot(conditions, progress);
 drawWing(s, progress); drawRunway(s);
 el<HTMLInputElement>('speed').value = String(conditions.speed); el<HTMLInputElement>('pitch').value = String(conditions.pitch);
 el<HTMLInputElement>('progress').value = String(Math.round(progress * 1000));
 write('speed-value', t('{{n}} 米/秒', { n: conditions.speed })); write('pitch-value', `${conditions.pitch}°`);
 write('response-value', t('{{n}}% · 短观察窗口', { n: Math.round(progress * 100) }));
 el('progress').setAttribute('aria-valuetext', t('短观察窗口 {{n}}%，可回退重看', { n: Math.round(progress * 100) }));
 write('current-title', s.airspeed < .1 ? t('没有迎面气流') : s.stalled ? t('气流分离：角度过大') : s.height > .01 ? t('离地后，迎角也在变') : s.netVertical > 0 ? t('这次有向上的加速趋势') : t('有升力，还不一定离地'));
 write('current-copy', explanation(s));
 write('angle-readout', t('当前迎角 {{n}}°：机翼弦线与相对气流的夹角。', { n: s.angleOfAttack.toFixed(1) }));
 write('model-readout', t('教学模型：升力/重量 {{ratio}}；升力系数 {{cl}}；观察 {{time}} 秒。', { ratio: (s.lift / s.weight).toFixed(2), cl: s.cl.toFixed(2), time: s.time.toFixed(2) }));
 write('support-note', s.support > 0 ? t('跑道还在向上托住轮子。') : t('跑道的支持力为零。'));
 write('play-flight', playing ? t('暂停观察') : progress >= 1 ? t('重播短窗口') : t('播放短窗口'));
 el('play-flight').setAttribute('aria-pressed', String(playing));
 for (const button of document.querySelectorAll<HTMLButtonElement>('[data-flight-chapter]')) button.setAttribute('aria-pressed', String(button.dataset.flightChapter === chapter));
 el('wing-panel').hidden = chapter !== 'wing'; el('runway-panel').hidden = chapter !== 'runway';
 el('flight-lab').dataset.flightState = s.airspeed < .1 ? 'still' : s.stalled ? 'separated' : s.height > .01 ? 'airborne' : 'ground';
}
function stop() { cancelAnimationFrame(frame); frame = 0; playing = false; }
function play() {
 if (playing) { stop(); update(); return; }
 stop(); if (progress >= 1) progress = 0;
 if (reduced.matches) { progress = 1; update(); return; }
 playing = true; let previous = performance.now();
 const tick = (now: number) => { progress = Math.min(1, progress + Math.min(60, now - previous) / 6000); previous = now; if (progress >= 1) stop(); update(); if (playing) frame = requestAnimationFrame(tick); };
 frame = requestAnimationFrame(tick); update();
}
for (const id of ['speed', 'pitch']) el(id).addEventListener('input', () => { stop(); conditions = { speed: Number(el<HTMLInputElement>('speed').value), pitch: Number(el<HTMLInputElement>('pitch').value) }; progress = 0; update(); });
el('progress').addEventListener('input', () => { stop(); progress = Number(el<HTMLInputElement>('progress').value) / 1000; update(); });
el('play-flight').addEventListener('click', play);
el('step-flight').addEventListener('click', () => { stop(); progress = Math.min(1, progress + .2); update(); });
el('reset-flight').addEventListener('click', () => { stop(); progress = 0; update(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) button.addEventListener('click', () => { stop(); progress = 0; conditions = button.dataset.preset === 'still' ? { speed: 0, pitch: 12 } : button.dataset.preset === 'stalled' ? { speed: 38, pitch: 26 } : { speed: 38, pitch: 12 }; update(); });
function select(next: 'wing' | 'runway', push = false) {
 stop(); chapter = next; if (push) { const url = new URL(location.href); url.searchParams.set('chapter', chapter); history.pushState(null, '', url); } update();
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-flight-chapter]')) button.addEventListener('click', () => select(button.dataset.flightChapter as 'wing' | 'runway', true));
window.addEventListener('popstate', () => select(new URLSearchParams(location.search).get('chapter') === 'runway' ? 'runway' : 'wing'));
function pauseHidden() { stop(); update(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseHidden(); });
window.addEventListener('pagehide', pauseHidden); reduced.addEventListener('change', pauseHidden);
matchMedia('(max-width: 600px)').addEventListener('change', update);
update(); mountTopicNavigation('flight'); mountReadingMode('details.advanced');
