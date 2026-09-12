import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { HydrangeaScene } from './scene.ts';
import { bloomState, flowerOutcome, newBloom, type GardenConditions } from './model.ts';
import { steps, stories } from './content.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('hydrangea');
const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const select = (id: string) => el(id) as HTMLSelectElement;
const colors: Record<string, string> = { blue: t('蓝色'), purple: t('紫色'), pink: t('粉色'), white: t('白色') };
const settings = (): GardenConditions => ({ ph: Number(input('ph').value), aluminum: Number(input('aluminum').value) / 100, cultivar: select('cultivar').value === 'white' ? 'white' : 'pigmented' });
let progress = 1, planted = newBloom(settings()), playing = false, academic = false, view = 'plant', frame = 0, last = 0;
let scene: HydrangeaScene | undefined;
try { scene = new HydrangeaScene(el('scene') as HTMLCanvasElement); } catch (error) { el('scene-error').hidden = false; console.error(error); }
function update() {
  const config = settings(), next = flowerOutcome(config), s = bloomState(progress, planted), story = stories[s.stage];
  el('ph-value').textContent = `pH ${config.ph.toFixed(1)}`; el('aluminum-value').textContent = `${Math.round(config.aluminum * 100)}%`;
  el('color').textContent = colors[next.color]; el('swatch').style.background = `hsl(${next.hue} ${next.saturation}% ${next.lightness}%)`;
  el('available-value').textContent = `${Math.round(next.available * 100)}%`; el('available-bar').style.width = `${next.available * 100}%`;
  el('pending').hidden = config.ph === planted.ph && config.aluminum === planted.aluminum && config.cultivar === planted.cultivar;
  el('story-title').textContent = story.title;
  el('story').textContent = planted.cultivar === 'white' && s.stage === 2 ? t('白花品种缺少本例所需的有色色素，因此即使铝容易被吸收，也不会沿这条路径变成蓝色。') : story.body;
  const cultivar = planted.cultivar === 'white' ? t('白花对照品种') : t('能蓝变的有色大花绣球');
  el('observe').textContent = t('这朵花使用的条件：pH {{ph}}，铝供应 {{aluminum}}%，{{cultivar}}。', { ph: planted.ph.toFixed(1), aluminum: Math.round(planted.aluminum * 100), cultivar });
  el('scene-title').textContent = view === 'plant' ? t('花序的近距离观察') : t('装着色素的液泡');
  input('progress').value = String(Math.round(progress * 1000)); input('progress').setAttribute('aria-valuetext', steps[s.stage]);
  el('elapsed').textContent = `${(progress * 14).toFixed(1)} / 14 s`;
  el('pause').textContent = playing ? t('暂停') : t('继续观察'); (el('pause') as HTMLButtonElement).disabled = progress >= 1;
  el('science-panel').hidden = !academic;
  el('science-live').textContent = t('本轮成熟后的花色：{{color}}\n本轮 pH：{{ph}}\n本轮可利用铝趋势：{{available}}%\n新花成熟度：{{maturity}}%', { color: colors[s.color], ph: planted.ph.toFixed(1), available: Math.round(s.available * 100), maturity: Math.round(s.maturity * 100) });
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'academic') === academic)));
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  el('steps').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === s.stage)));
  scene?.draw(progress, planted, view);
}
function cancel() { cancelAnimationFrame(frame); frame = 0; }
function stop() { playing = false; cancel(); }
function tick(now: number) {
  frame = 0; if (!playing || document.hidden) return;
  progress = Math.min(1, progress + Math.min((now - last) / 1000, .1) / 14); last = now;
  if (progress >= 1) playing = false; update(); if (playing) frame = requestAnimationFrame(tick);
}
function resume() { playing = true; last = performance.now(); if (!frame) frame = requestAnimationFrame(tick); }
el('grow').addEventListener('click', () => { stop(); planted = newBloom(settings()); progress = 0; resume(); update(); });
el('pause').addEventListener('click', () => { if (playing) stop(); else resume(); update(); });
el('reset').addEventListener('click', () => { stop(); input('ph').value = '5.3'; input('aluminum').value = '80'; select('cultivar').value = 'pigmented'; planted = newBloom(settings()); progress = 1; update(); });
el('progress').addEventListener('input', () => { stop(); progress = Number(input('progress').value) / 1000; update(); });
for (const id of ['ph', 'aluminum', 'cultivar']) el(id).addEventListener('input', update);
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.addEventListener('click', () => { view = b.dataset.view!; update(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.addEventListener('click', () => { academic = b.dataset.mode === 'academic'; update(); });
el('steps').replaceChildren(...steps.map((label, i) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', () => { stop(); progress = [.08, .32, .61, 1][i]; update(); }); return b; }));
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); else if (playing) resume(); });
window.addEventListener('pagehide', e => { cancel(); if (!e.persisted) { stop(); scene?.dispose(); } });
window.addEventListener('pageshow', () => { if (playing && !frame) resume(); });
update();
