import './style.css';
import { t } from './i18n.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { clamp, submarineState, type Environment, type Supply, type Viewpoint } from './model.ts';
import { createScene, viewCamera } from './scene.ts';

translateDocument(t);
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id)! as T;
const svg = document.getElementById('ocean-scene') as unknown as SVGSVGElement;
const draw = createScene(svg);
const slider = byId<HTMLInputElement>('progress');
const environments: Environment[] = ['deep', 'shallow', 'island'];
let progress = 0, playing = false, environment: Environment = 'deep', supply: Supply = 'sustained';
let weights: [number, number, number] = [1, 0, 0];
let view: Viewpoint = 'ocean';
let supplyMix = 0;
let camera = viewCamera(view, progress, weights, supplyMix), cameraMoving = false, section = .15;
let lastStatus = '', cancelPlay = () => {}, cancelEnvironment = () => {}, cancelCamera = () => {}, cancelSupply = () => {};

function render() {
  if (!cameraMoving) camera = viewCamera(view, progress, weights, supplyMix);
  draw({ progress, weights, supplyMix, camera, section });
  slider.value = String(progress * 100);
  slider.setAttribute('aria-valuetext', t('教学进度 {{value}}%，不是实际时长', { value: Math.round(progress * 100) }));
  byId('progress-value').textContent = `${Math.round(progress * 100)}%`;
  byId<HTMLButtonElement>('play').disabled = playing || progress >= 1;
  byId<HTMLButtonElement>('pause').disabled = !playing;
  byId('supply-controls').hidden = environment !== 'island';
  const s = submarineState(progress, environment, supply);
  const stage = progress === 0 ? 'start' : progress >= 1 ? 'end' : environment === 'island' ? s.erosion > 0 ? 'erosion' : s.emerged ? 'emerged' : 'building' : progress > .78 ? 'cooling' : 'active';
  const key = `${environment}-${supply}-${stage}`;
  if (key !== lastStatus) {
    lastStatus = key;
    const messages = environment === 'deep'
      ? stage === 'start'
        ? [t('深水 · 选看缓慢溢流'), t('海水上方平静，海底也可能在生长。点“运行一次”，再靠近喷口看新熔岩的外壳。')]
        : stage === 'end' || stage === 'cooling'
          ? [t('外壳先冷，里面后冷'), t('新熔岩一团团堆在旧岩石上。深色外壳不等于里面立刻全冷；这个例子最后冷却成形，山顶仍在水下。')]
          : [t('鼓出一团，再长出下一团'), t('本例选择缓慢流出的海底熔岩：表面迅速结壳，较热的内部还可继续供应新熔岩，形成枕状团块。')]
      : environment === 'shallow'
        ? stage === 'start'
          ? [t('浅水 · 选看强烈相互作用'), t('喷口靠近海面。本例让海水与岩浆充分接触，观察碎屑、水汽和气体怎样向外扩散。')]
          : stage === 'end' || stage === 'cooling'
            ? [t('喷发停止，碎屑仍会留下'), t('喷出的碎屑冷却并沉积；水汽和气体逐渐散去。海水没有把火山内部的供给一概“扑灭”。')]
            : [t('冷却也能伴随破碎和爆炸'), t('快速传热和气体膨胀可以把物质喷散。浅水并非一定爆炸，深水也并非保证安静；还要看岩浆含气量、供给和混合条件。')]
        : stage === 'start'
          ? [t('成岛 · 压缩许多次堆积'), t('这一段跳到更长的地质过程，压缩许多次喷发。切换“持续较多”与“供给较少”，先猜哪一种可能露出海面。')]
          : stage === 'erosion' || stage === 'end'
            ? [s.emerged ? t('岛已经出现，海浪仍在改变它') : t('一直留在海面下的山'), t('最后一段停止增加岩石，示意侵蚀削低山体。虚线保留先前轮廓；有限供给的例子始终没有长成岛。真实火山还会沉降或发生坍塌。')]
            : s.emerged
              ? [t('露出的只是山顶'), t('切到“山体剖面”：岛下还有宽大的水下山体。这里露出海面，是因为累计堆积足够多，并不是海水突然消失。')]
              : [t('岩石一层层增加'), t('海底的山正在变高。并不是每次喷发都能造出岛，也不是每座海底火山最终都会露出海面。')];
    byId('status-title').textContent = messages[0];
    byId('status-text').textContent = messages[1];
    byId('scene-caption').textContent = environment === 'deep'
      ? t('深海喷口由探测器的灯局部照亮，远处水体逐渐变暗。冷却皮层包住较热熔岩；少量橙色剖口是透视说明，水下细颗粒带不是蒸汽泡。')
      : environment === 'shallow'
        ? t('浅水相互作用的一个例子：水下灰色带表示悬浮细颗粒，海面上的白雾示意凝结水滴，可夹带气体与火山灰。水蒸气本身不可见，颜色不是成分测量。')
        : t('这里压缩许多次堆积，时间尺度与前两种情境不同。看海岸的深色湿润带、白色浪花和水下山体；最后的虚线保留侵蚀前轮廓，海面保持固定。');
  }
  byId('position-value').textContent = s.emerged ? t('山顶露出水面') : t('山顶仍在水下');
  byId('activity-value').textContent = progress === 0 ? t('准备观察') : s.erosion > 0 ? t('侵蚀阶段') : s.activity > .01 ? t('物质仍在增加') : t('本段已经结束');
}

function stop() { cancelPlay(); playing = false; render(); }
function settleCamera() { cancelCamera(); cameraMoving = false; section = view === 'section' ? 1 : view === 'vent' ? .65 : .15; }

byId('play').addEventListener('click', () => {
  if (playing || progress >= 1) return;
  settleCamera(); playing = true;
  cancelPlay = animateValue({ from: progress, to: 1, duration: 20000 * (1 - progress), onUpdate: value => { progress = value; render(); }, onComplete: () => { playing = false; render(); } });
});
byId('pause').addEventListener('click', stop);
slider.addEventListener('input', () => { const next = Number(slider.value) / 100; stop(); settleCamera(); progress = clamp(next); render(); });
byId('reset').addEventListener('click', () => { stop(); settleCamera(); progress = 0; render(); });

document.querySelectorAll<HTMLButtonElement>('[data-environment]').forEach(button => button.addEventListener('click', () => {
  stop(); settleCamera(); cancelEnvironment();
  environment = button.dataset.environment as Environment;
  const from = [...weights];
  const target = environments.indexOf(environment);
  document.querySelectorAll<HTMLButtonElement>('[data-environment]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  cancelEnvironment = animateValue({ from: 0, to: 1, duration: 650, onUpdate: value => { weights = from.map((weight, i) => weight + ((i === target ? 1 : 0) - weight) * value) as typeof weights; render(); } });
}));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
  cancelCamera(); view = button.dataset.view as Viewpoint;
  const from = [...camera], startSection = section;
  const endSection = view === 'section' ? 1 : view === 'vent' ? .65 : .15;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  cameraMoving = true;
  cancelCamera = animateValue({ from: 0, to: 1, duration: 820, onUpdate: value => { const target = viewCamera(view, progress, weights, supplyMix); camera = from.map((v, i) => v + (target[i] - v) * value) as typeof camera; section = startSection + (endSection - startSection) * value; render(); }, onComplete: () => { cameraMoving = false; render(); } });
}));
document.querySelectorAll<HTMLButtonElement>('[data-supply]').forEach(button => button.addEventListener('click', () => {
  stop(); settleCamera(); cancelSupply(); supply = button.dataset.supply as Supply;
  document.querySelectorAll<HTMLButtonElement>('[data-supply]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  cancelSupply = animateValue({ from: supplyMix, to: supply === 'sustained' ? 0 : 1, duration: 600, onUpdate: value => { supplyMix = value; render(); } });
}));
document.querySelectorAll<HTMLButtonElement>('[data-progress]').forEach(button => button.addEventListener('click', () => {
  stop(); settleCamera();
  cancelPlay = animateValue({ from: progress, to: Number(button.dataset.progress), duration: 700, onUpdate: value => { progress = value; render(); } });
}));

function suspend() {
  cancelPlay(); playing = false; cancelEnvironment(); cancelSupply(); settleCamera();
  weights = environments.map(value => value === environment ? 1 : 0) as typeof weights;
  supplyMix = supply === 'sustained' ? 0 : 1;
  render();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
window.addEventListener('pagehide', suspend);
window.addEventListener('pageshow', () => { playing = false; render(); });
render(); mountReadingMode('.advanced'); mountTopicNavigation('submarine-volcanoes');
