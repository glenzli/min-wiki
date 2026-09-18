import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { cameraFor, clampProgress, hostLimit, mixCamera, sampleCycle, type Host, type View } from './model.ts';
import { mountScene } from './scene.ts';
import { t } from './i18n.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('viruses');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const host = el<HTMLSelectElement>('host'), progress = el<HTMLInputElement>('progress');
const draw = mountScene(el<SVGSVGElement>('virus-diagram'));
let position = 0, target = 0, playing = false, view: View = 'whole';
let cancelStage: () => void = () => {}, cancelCamera: () => void = () => {};
let camera = cameraFor(view, sampleCycle(position, 'compatible')), cameraFrom = camera, cameraBlend = 1;
let lastAnnouncement = '';
const titles = [t('相遇之前'), t('先与表面结合'), t('遗传信息进入'), t('借用细胞，制造部件'), t('组装新的噬菌体'), t('释放，寻找下一次相遇')];
const texts = [
  t('这个例子中的病毒叫噬菌体，会感染某些细菌。外壳包着 DNA，但它不能独自制造新病毒。'),
  t('先与合适的表面结合，再看尾鞘缩短。中央尾管没有跟着缩短，它帮助形成 DNA 进入的通路；外面的头部留在原处附近。'),
  t('沿着金色细线看：遗传信息已经进了细菌，原来的蛋白质外壳还在外面。接下来，细胞里的工具会参与制造新的部件。'),
  t('DNA 的新副本和蛋白质部件正在形成。空的头部要装入 DNA，单独做好的尾部再接上；这些部件起初还不是完整病毒。'),
  t('新的噬菌体已经组装好了。继续往后看，细菌的边界先打开，子代才沿开口释放；原来的病毒没有长大后分成两半。'),
  t('这个裂解性周期中，细菌裂开，新噬菌体释放出来。画面只画了少量代表；不是所有病毒都用这种方式离开细胞。'),
];
const notes: Record<View, string> = {
  whole: t('透明剖面帮助我们看里面；病毒和细胞的颜色是教学配色。'),
  attachment: t('跟着同一个噬菌体看头部、尾管和尾纤维。切换视角，不会重新开始过程。'),
  inside: t('细菌里面有自己的 DNA 和制造蛋白质的工具，却没有细胞核。金色细线表示病毒 DNA。'),
};
function render(): void {
  const kind = host.value as Host, state = sampleCycle(position, kind), limit = hostLimit(kind);
  camera = mixCamera(cameraFrom, cameraFor(view, state), cameraBlend);
  draw(state, camera);
  const blocked = position >= limit - 1e-7 && kind !== 'compatible';
  const title = blocked ? (kind === 'mismatch' ? t('这一关：不能附着') : t('这一关：被内部防御阻止')) : titles[state.stage]!;
  const text = blocked ? (kind === 'mismatch' ? t('这个细菌的表面与该噬菌体不匹配，过程在附着前停下。换一个宿主再观察。') : t('虽然表面匹配，遗传信息也进入了细胞，但这个例子中的内部防御阻断了复制，没有产生新病毒。')) : texts[state.stage]!;
  const announcement = `${kind}:${state.stage}:${blocked}`;
  if (announcement !== lastAnnouncement) {
    el('step-title').textContent = title; el('step-text').textContent = text;
    el('scene-stage').textContent = title; el('diagram-desc').textContent = text;
    el('step-number').textContent = `${String(state.stage + 1).padStart(2, '0')} / 06`;
    lastAnnouncement = announcement;
  }
  progress.value = String(Math.round(position * 100));
  progress.max = String(limit * 100);
  progress.setAttribute('aria-valuetext', `${title} · ${Math.round(position / 5 * 100)}%`);
  el('progress-label').textContent = `${Math.round(position / 5 * 100)}%`;
  el<HTMLButtonElement>('prev').disabled = position <= 0;
  el<HTMLButtonElement>('next').disabled = position >= limit;
  el('play').textContent = playing ? t('停在这里') : position >= limit ? t('再看一遍') : t('连续看一遍');
  el('view-note').textContent = notes[view];
}
function seek(value: number, continuous = false): void {
  cancelStage();
  target = clampProgress(value, host.value as Host);
  playing = continuous;
  cancelStage = animateValue({ from: position, to: target, duration: Math.abs(target - position) * (continuous ? 3600 : 1500),
    onUpdate: value => { position = value; render(); },
    onComplete: () => { playing = false; render(); },
  });
}
host.addEventListener('change', () => {
  cancelStage(); cancelCamera(); position = target = 0; playing = false; cameraBlend = 1; render();
});
el('prev').addEventListener('click', () => seek(Math.max(0, Math.ceil(position - .001) - 1)));
el('next').addEventListener('click', () => seek(Math.floor(position + .001) + 1));
el('restart').addEventListener('click', () => seek(0));
el('play').addEventListener('click', () => {
  if (playing) { cancelStage(); playing = false; target = position; render(); return; }
  if (position >= hostLimit(host.value as Host)) position = 0;
  seek(hostLimit(host.value as Host), true);
});
progress.addEventListener('input', () => {
  cancelStage(); playing = false; position = target = clampProgress(Number(progress.value) / 100, host.value as Host); render();
});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
  cancelCamera(); cameraFrom = camera; cameraBlend = 0; view = button.dataset.view as View;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  cancelCamera = animateValue({ from: 0, to: 1, duration: 560, onUpdate: value => { cameraBlend = value; render(); } });
}));
window.addEventListener('pagehide', () => {
  cancelStage(); cancelCamera(); position = target; playing = false; cameraBlend = 1; render();
});
window.addEventListener('pageshow', () => render());
render();
mountReadingMode('details:last-of-type');
