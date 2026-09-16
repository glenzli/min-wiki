import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { stopping, stateAt, type Road } from './model.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('car-safety');
document.querySelector('.hero img')?.setAttribute('alt', t('汽车剖面插画：后排的后向儿童座椅、前排安全带和车轮刹车装置'));
const el = (id: string) => document.getElementById(id)!;
const speedInput = el('speed') as HTMLInputElement;
const progress = el('progress') as HTMLInputElement;
const playButton = el('play') as HTMLButtonElement;
let road: Road = 'dry';
let frame = 0;
let lastTime = 0;
let playing = false;
let phase = '';
const speed = () => Number(speedInput.value);
const meters = (value: number) => t('{{value}} 米', { value: value.toFixed(1) });
const xFor = (distance: number) => 180 + distance * 8;

for (const value of [0, 20, 40, 60, 80]) {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', String(xFor(value))); text.setAttribute('y', '338');
  text.setAttribute('text-anchor', 'middle'); text.textContent = t('{{value}} 米', { value });
  el('ruler').append(text);
}
function draw() {
  const plan = stopping(speed(), road);
  const time = plan.totalTime * Number(progress.value) / 100;
  const state = stateAt(speed(), road, time);
  el('car').setAttribute('transform', `translate(${5 + state.distance * 8} 120)`);
  const rotation = state.distance * 8 / 22 * 180 / Math.PI;
  el('rear-spoke').setAttribute('transform', `rotate(${rotation} 39 92)`);
  el('front-spoke').setAttribute('transform', `rotate(${rotation} 140 92)`);
  el('brake-light').setAttribute('fill', state.phase === 'braking' ? '#ef886c' : '#894b43');
  const nextPhase = state.phase;
  if (phase !== nextPhase) {
    phase = nextPhase;
    el('stage').textContent = state.phase === 'reaction'
      ? t('① 发现需要停车：司机在反应，汽车仍按原来的速度前进。')
      : state.phase === 'braking'
        ? t('② 刹车正在工作：车轮继续转，速度逐渐变小，还没有停下。')
        : t('③ 现在才停下：反应距离加上制动距离，才是完整的停车距离。');
  }
  progress.setAttribute('aria-valuetext', t('时间 {{time}} 秒，车速 {{speed}} 千米/小时', {
    time: time.toFixed(1), speed: (state.speed * 3.6).toFixed(0),
  }));
}
function updatePlan() {
  const plan = stopping(speed(), road);
  el('speed-value').textContent = t('{{value}} 千米/小时', { value: speed() });
  speedInput.setAttribute('aria-valuetext', t('{{value}} 千米/小时', { value: speed() }));
  el('reaction-value').textContent = meters(plan.reactionDistance);
  el('braking-value').textContent = meters(plan.brakingDistance);
  el('total-value').textContent = meters(plan.totalDistance);
  el('reaction-path').setAttribute('d', `M180 300H${xFor(plan.reactionDistance)}`);
  el('braking-path').setAttribute('d', `M${xFor(plan.reactionDistance)} 300H${xFor(plan.totalDistance)}`);
  el('stop-marker').setAttribute('d', `M${xFor(plan.totalDistance)} 279V320`);
  el('wet-shine').setAttribute('opacity', road === 'wet' ? '1' : '0');
  el('comparison').textContent = road === 'wet'
    ? t('同样速度下，本例湿滑路面的绿色制动距离是干燥路面的两倍；金色反应距离不变。')
    : t('试试把 30 调到 60：本例反应距离变两倍，绿色制动距离变四倍。');
  draw();
}
function pause() {
  playing = false; cancelAnimationFrame(frame); frame = 0; lastTime = 0;
  playButton.textContent = Number(progress.value) >= 100 ? t('再看一次') : t('播放停车过程');
}
function animate(now: number) {
  if (!playing) return;
  if (lastTime) progress.value = String(Math.min(100, Number(progress.value) + Math.min(now - lastTime, 80) / 80));
  lastTime = now; draw();
  if (Number(progress.value) >= 100) { pause(); return; }
  frame = requestAnimationFrame(animate);
}
playButton.addEventListener('click', () => {
  if (playing) { pause(); return; }
  if (Number(progress.value) >= 100) progress.value = '0';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    progress.value = '100'; draw(); pause(); return;
  }
  playing = true; playButton.textContent = t('暂停');
  frame = requestAnimationFrame(animate);
});
el('reset').addEventListener('click', () => { progress.value = '0'; pause(); draw(); });
progress.addEventListener('input', () => { pause(); draw(); });
speedInput.addEventListener('input', () => { progress.value = '0'; pause(); updatePlan(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-road]')) {
  button.addEventListener('click', () => {
    road = button.dataset.road as Road; progress.value = '0'; pause();
    for (const peer of document.querySelectorAll('[data-road]')) peer.setAttribute('aria-pressed', String(peer === button));
    updatePlan();
  });
}
let beltY = 208, beltRadius = 66, cancelBelt = () => {};
function selectFit(fit: 'shoulder' | 'lap') {
  el('fit-title').textContent = fit === 'shoulder' ? t('肩带跨过肩膀和胸前') : t('腰带低而贴，经过髋骨');
  el('fit-description').textContent = fit === 'shoulder'
    ? t('肩带贴合肩部和胸前，避开颈部与脸，不能滑到肩膀外。肩带不是一条可以藏起来的带子。')
    : t('腰带贴紧髋部和大腿根部附近，不压在柔软的肚子上。坐直、贴靠椅背，让带子保持在正确的位置。');
  const highlight = el('belt-highlight');
  cancelBelt();
  const fromY = beltY, fromRadius = beltRadius;
  const toY = fit === 'shoulder' ? 208 : 282, toRadius = fit === 'shoulder' ? 66 : 61;
  cancelBelt = animateValue({ from: 0, to: 1, duration: 380, onUpdate: p => {
    beltY = fromY + (toY - fromY) * p; beltRadius = fromRadius + (toRadius - fromRadius) * p;
    highlight.setAttribute('cy', String(beltY)); highlight.setAttribute('r', String(beltRadius));
  } });
  for (const button of document.querySelectorAll('[data-fit]')) button.setAttribute('aria-pressed', String((button as HTMLElement).dataset.fit === fit));
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-fit]')) button.addEventListener('click', () => selectFit(button.dataset.fit as 'shoulder' | 'lap'));
type Seat = 'rear' | 'forward' | 'booster';
const seatOutline = '<path d="M27 143H160V154H27Z" fill="#b7c3ae"/><path d="M27 137V59" stroke="#b7c3ae" stroke-width="15" stroke-linecap="round"/>';
function selectSeat(seat: Seat) {
  let title: string, direction: string, description: string, shape: string;
  if (seat === 'rear') {
    title = t('尽可能保持后向'); direction = t('车头向右 · 座椅朝后');
    description = t('后向座椅用靠背承托头、颈和躯干。在允许的身高和体重范围内，尽可能继续后向使用；达到相应上限后，再按产品要求转到合适的下一阶段。');
    shape = '<path d="M43 130Q95 141 112 114L143 37Q144 27 132 29L115 34L86 107L40 106Z" fill="#617f6b"/><path d="M45 108L82 113Q94 102 100 85" fill="none" stroke="#91a993" stroke-width="12"/>';
  } else if (seat === 'forward') {
    title = t('用合身的内置安全带'); direction = t('车头向右 · 座椅朝前');
    description = t('超出后向适用范围后，使用适合孩子的前向安全座椅。继续使用内置安全带，直到达到对应身高或体重上限；按产品和汽车说明固定座椅。');
    shape = '<path d="M57 135L36 39Q36 26 52 28L70 37L84 104L140 107L144 132Z" fill="#617f6b"/><path d="M67 62L94 118M93 77L71 116" stroke="#d3b682" stroke-width="7"/><rect x="74" y="114" width="20" height="12" rx="3" fill="#b98452"/>';
  } else {
    title = t('把普通安全带放对位置'); direction = t('车头向右 · 配合三点式安全带');
    description = t('超出前向内置安全带的适用范围后，合适的增高座椅帮助肩带经过肩胸、腰带低贴髋部。直到不用增高座椅也能正确贴合，并能全程坐好，才改用车辆安全带。');
    shape = '<path d="M46 110Q91 103 144 111V135H45Z" fill="#617f6b"/><path d="M48 48L131 113L46 120" fill="none" stroke="#ba915b" stroke-width="8"/>';
  }
  el('seat-title').textContent = title; el('seat-direction').textContent = direction; el('seat-description').textContent = description;
  el('seat-symbol').innerHTML = `<svg viewBox="0 0 190 175">${seatOutline}${shape}<path d="M130 15H168L161 9M168 15L161 21" stroke="#8a9c84" stroke-width="2" fill="none"/></svg>`;
  for (const button of document.querySelectorAll('[data-seat]')) button.setAttribute('aria-pressed', String((button as HTMLElement).dataset.seat === seat));
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-seat]')) button.addEventListener('click', () => selectSeat(button.dataset.seat as Seat));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('pagehide', pause);
window.addEventListener('pageshow', () => { pause(); draw(); });
selectFit('shoulder'); selectSeat('rear'); updatePlan();

mountReadingMode('details:not(.references)');
