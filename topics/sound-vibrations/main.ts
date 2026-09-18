import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import { DURATION, frequency } from './model.ts';
import { SoundScene } from './scene.ts';
import './style.css';
translateDocument(t); mountTopicNavigation('sound-vibrations');
const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const value = (id: string) => Number(input(id).value);
const scene = new SoundScene(el('scene') as unknown as SVGElement);
let time = 0, playing = false, frame = 0, last = 0, view = 0, targetView = 0, cancelView = () => {};
let audio: AudioContext | undefined, oscillator: OscillatorNode | undefined, gainNode: GainNode | undefined, serial = 0;
function update() {
  scene.draw(time, value('tension'), value('amplitude'), view);
  el('pitch').textContent = t('实际音高约 {{frequency}} Hz', {frequency: Math.round(frequency(value('tension')))});
  el('clock').textContent = `${time.toFixed(1)} / ${DURATION} s`; input('phase').value = String(time * 100);
  el('play').textContent = playing ? t('暂停慢镜头') : time >= DURATION ? t('从头回看') : t('播放慢镜头');
  const message = time === 0 ? t('先播放，再切换到空气。金色小团的“家”用空心圈标出。') : time < 4.75 ? t('橡皮筋附近先开始动；远处要等一等，变化才传得到。') : time < 9 ? t('金色空气小团只在空心圈附近来回；疏密变化继续向右传。') : time < 13.75 ? t('声源已经停下，先前发出的变化仍在空气中继续前进。') : t('最后一段变化已经离开。空气小团回到各自的平衡位置。');
  if (el('readout').textContent !== message) el('readout').textContent = message;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.view) === targetView)));
}
function pause() { playing = false; cancelAnimationFrame(frame); frame = 0; }
function tick(now: number) { frame = 0; if (!playing || document.hidden) return; time = Math.min(DURATION, time + Math.min((now - last) / 1000, .1)); last = now; if (time >= DURATION) playing = false; update(); if (playing) frame = requestAnimationFrame(tick); }
function stopAudio() { serial++; if (oscillator) { try { oscillator.stop(); } catch { /* already finished */ } oscillator.disconnect(); oscillator = undefined; } gainNode?.disconnect(); gainNode = undefined; }
async function listen() {
  stopAudio(); const token = serial;
  try {
    audio ??= new AudioContext(); await audio.resume(); if (token !== serial || document.hidden) return;
    const current = audio.createOscillator(), gain = audio.createGain(); oscillator = current; gainNode = gain;
    current.type = 'triangle'; current.frequency.value = frequency(value('tension'));
    gain.gain.setValueAtTime(0, audio.currentTime); gain.gain.linearRampToValueAtTime(value('amplitude') / 50 * .09, audio.currentTime + .015); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + 1.6);
    current.connect(gain); gain.connect(audio.destination); current.start(); current.stop(audio.currentTime + 1.65);
    current.onended = () => { current.disconnect(); gain.disconnect(); if (oscillator === current) { oscillator = undefined; gainNode = undefined; } };
    el('audio-status').textContent = t('播放一次实际音高；慢镜头可以独立暂停。');
  } catch { if (token === serial) el('audio-status').textContent = t('声音暂时无法播放，仍可观察慢镜头。'); }
}
el('play').addEventListener('click', () => { if (playing) pause(); else { if (time >= DURATION) time = 0; playing = true; last = performance.now(); frame = requestAnimationFrame(tick); } update(); });
el('stop').addEventListener('click', () => { pause(); stopAudio(); time = 0; update(); });
el('pluck').addEventListener('click', () => { void listen(); });
for (const id of ['tension', 'amplitude']) el(id).addEventListener('input', () => { pause(); stopAudio(); time = 0; update(); });
el('phase').addEventListener('input', () => { pause(); time = value('phase') / 100; update(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.addEventListener('click', () => { cancelView(); targetView = Number(b.dataset.view); cancelView = animateValue({from: view, to: targetView, duration: 500, onUpdate: v => { view = v; update(); }}); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); stopAudio(); void audio?.suspend(); update(); } });
window.addEventListener('pagehide', event => { pause(); cancelView(); stopAudio(); if (event.persisted) void audio?.suspend(); else void audio?.close(); });
update(); mountReadingMode('details:not(.references)');
