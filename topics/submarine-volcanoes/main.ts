import './style.css';
import { t } from './i18n.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { clamp, islandAccretion, submarineState, type Environment, type Supply, type Viewpoint } from './model.ts';
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
  byId('island-sequence').hidden = environment !== 'island';
  const s = submarineState(progress, environment, supply);
  const accretion = islandAccretion(progress, supply);
  document.querySelectorAll<HTMLElement>('[data-accretion-phase]').forEach(step => {
    const phase = step.dataset.accretionPhase;
    const order = ['deep-base', 'spreading-flows', 'shallow-fragments', 'lava-cap'];
    const current = order.indexOf(accretion.phase);
    const own = order.indexOf(phase ?? '');
    step.classList.toggle('is-current', environment === 'island' && own === current && progress < .82 && (progress === 0 || accretion.adding));
    step.classList.toggle('is-complete', environment === 'island' && own < current);
  });
  const stage = progress === 0 ? 'start' : progress >= 1 ? 'end' : environment === 'island'
    ? s.erosion > 0 ? 'erosion' : supply === 'limited' && accretion.completed === accretion.available ? 'stopped' : s.emerged ? 'emerged' : 'building'
    : progress > .78 ? 'cooling' : 'active';
  const key = `${environment}-${supply}-${stage}-${environment === 'island' ? accretion.phase : ''}`;
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
          ? [t('成岛案例 · 逐次留下沉积'), t('这一段把许多次喷发压缩到一条时间线上。山体先在水下变宽、再变高；切换“持续供给”与“较早停止”，猜哪一种能越过海面。')]
          : stage === 'erosion' || stage === 'end'
            ? [s.emerged ? t('岛已经出现，海浪仍在改变它') : t('一直留在海面下的山'), t('最后一段停止增加岩石，示意海浪从边缘和顶部带走物质。虚线保留先前轮廓；较早停止供给的例子仍是海山。真实火山还会沉降或发生坍塌。')]
            : stage === 'stopped'
              ? [t('供给停了，海山并没有消失'), t('已有的熔岩已经冷却成岩石，宽大的水下山体会保留下来；只是这条历史没有继续增加到海面。')]
            : s.emerged
              ? [t('地上熔岩盖住较松散的浅水碎屑'), t('山顶越过海面后，熔岩还会沿地表铺展，形成较坚固的熔岩盖层。露出的仍只是宽大水下山体的一小部分。')]
              : accretion.phase === 'deep-base'
                ? [t('低流量熔岩先堆成水下基座'), t('圆鼓或管状的熔岩单元相互搭接，形成陡一些的小丘；这只是低流量玄武质熔岩的一种形态。')]
                : accretion.phase === 'spreading-flows'
                  ? [t('较宽的熔岩流向低处铺开'), t('新的叶状和片状熔岩越过旧地形，在低处摊开，让山体先明显变宽，再逐步抬高。')]
                  : [t('接近海面，破碎物和熔岩交替增加'), t('浅水中岩浆与海水接触可产生碎屑；碎屑会落回坡面，也可与后来的熔岩流交错堆积。不是每次浅水喷发都如此猛烈。')];
    byId('status-title').textContent = messages[0];
    byId('status-text').textContent = messages[1];
    byId('scene-caption').textContent = environment === 'deep'
      ? t('深海喷口由探测器的灯局部照亮，远处水体逐渐变暗。冷却皮层包住较热熔岩；少量橙色剖口是透视说明，水下细颗粒带不是蒸汽泡。')
      : environment === 'shallow'
        ? t('浅水相互作用的一个例子：水下灰色带表示悬浮细颗粒，海面上的白雾示意凝结水滴，可夹带气体与火山灰。水蒸气本身不可见，颜色不是成分测量。')
        : t('这是玄武质火山岛的一条可能路径，不是所有海底火山的固定剧本。每条色带是一组新增加的物质：深水团块、较宽熔岩流、浅水碎屑与露出海面后的熔岩盖层；最后的虚线保留侵蚀前轮廓。');
  }
  byId('position-value').textContent = s.emerged ? t('山顶露出水面') : t('山顶仍在水下');
  byId('activity-value').textContent = progress === 0 ? t('准备观察') : s.erosion > 0 ? t('侵蚀阶段') : environment === 'island' && supply === 'limited' && accretion.completed === accretion.available
    ? t('供给停止，海山保留下来')
    : environment === 'island' && accretion.adding ? t('第 {{value}} 组物质正在加入', { value: Math.max(1, accretion.deposited) })
    : s.activity > .01 ? t('物质仍在增加') : t('本段已经结束');
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
