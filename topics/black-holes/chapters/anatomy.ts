import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlackHoleOptics } from '../../../src/visuals/blackHoleOptics.ts';
import { t } from '../i18n.ts';
import { createCanvas, releaseCanvas } from '../types.ts';
import type { ChapterDefinition, ChapterScene, ChapterState, ViewOptions } from '../types.ts';

const parts = [
  { value: 'overview', label: t('整体观察'), title: t('黑暗中央，明亮周围'),
    body: t('先找中央的暗区，再看周围流动的亮光。发光的是黑洞外的热气体。选择下面的结构，或转到上方看一看。'),
    science: t('本章以无自旋黑洞和薄吸积盘为例。画面由弯曲光线的近似积分生成；它是解释结构的示意，不是某个黑洞的实测照片。'),
    formula: 'rₛ = 2GM/c²', terms: t('M 是黑洞质量，G 是引力常数，c 是光速。rₛ 适用于无自旋黑洞。'),
    prompt: t('关闭显示标注，先自由观察；再点一个结构读它的解释。') },
  { value: 'horizon', label: t('事件视界'), title: t('一条无法向外传出信号的边界'),
    body: t('现在切到几何示意：小球的表面标记事件视界。越过这条边界，向外发出的光也无法抵达远处。它不是坚硬外壳，蓝色线条只是帮助辨认。'),
    science: t('事件视界是因果边界。此处暂时关闭弯光画面，用内侧球面与外侧阴影参考轮廓区分两种尺度；我们并没有看见视界内部。'),
    formula: 'rₛ = 2GM/c²', terms: t('内侧球面标记 rₛ；外侧虚线是远方观察者的临界光线投影尺度，不是一层更大的物质外壳。'),
    prompt: t('比较小球与外圈，然后切回黑洞阴影：它们是不是同一个东西？') },
  { value: 'shadow', label: t('黑洞阴影'), title: t('看见的暗区，不等于视界表面'),
    body: t('光会被黑洞捕获，也会在附近转弯，因此我们看到一个暗区。它的轮廓与事件视界的大小并不相同。'),
    science: t('在无自旋、远方观察者的理想模型中，捕获光线的临界冲量参数约为 2.60 个视界半径。亮盘的遮挡与照明分布还会改变实际暗区的外观。'),
    formula: 'bcrit = 3√3 GM/c² ≈ 2.60 rₛ', terms: t('bcrit 是投影中的临界光线尺度，不是一个可触摸球面的半径；自旋与观察位置会改变这个简单关系。'),
    prompt: t('切换近景和上方视角，看看暗区周围的亮带怎样变化。') },
  { value: 'disk', label: t('吸积盘'), title: t('亮光来自外面的气体'),
    body: t('气体带着绕行的运动，在黑洞周围聚集。变热的气体会发光；要继续向内，气体还需要把一部分角动量向外传递。'),
    science: t('这里采用薄盘外观示意。吸积释放的部分引力束缚能可转为辐射，盘面颜色和亮度未标定为温度或观测光谱。并非每个黑洞都有明亮的吸积盘。'),
    formula: 'L ≈ η Ṁ c²', terms: t('L 是辐射功率，Ṁ 是吸积率，η 是辐射效率。真实效率取决于吸积状态和黑洞性质。'),
    prompt: t('播放后观察细纹的流动，再到伴星章节找一找：这些气体从哪里来？') },
  { value: 'lensing', label: t('引力弯光'), title: t('亮带拱起，盘没有竖起来'),
    body: t('盘后方的光在黑洞附近转弯，也能来到我们眼前，于是亮带好像绕到了上方和下方。换个方向看，弯曲的样子也会改变。'),
    science: t('弯曲的光路让远侧盘面形成畸变的像。此演示使用有限范围的无自旋光线积分，不含黑洞自旋、背景星光透镜或完整辐射输运。'),
    formula: 'rph = 3GM/c² = 1.5 rₛ', terms: t('rph 是无自旋黑洞的不稳定圆形光子轨道半径；它与投影中的阴影半径不同。此处没有画出实体光壳。'),
    prompt: t('先看黑洞近景，再选择从上方看；最后试试自由转动。') },
];

class AnatomyScene implements ChapterScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(25, 1, .01, 200);
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private hole = new BlackHoleOptics(.5);
  private geometryView = new THREE.Group();
  private shadowRing: THREE.LineLoop;
  private labels: HTMLSpanElement[] = [];
  private lastView = '';
  private target = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private moving = true;
  private previousTime = performance.now();
  private lastProgress = -1;
  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas: createCanvas(host), antialias: true });
    this.renderer.setClearColor(0x030812);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.minDistance = 4; this.controls.maxDistance = 22;
    this.camera.up.set(0, 0, 1); this.camera.position.set(0, -10.5, 3.8); this.camera.lookAt(0, 0, 0);
    this.controls.addEventListener('change', () => { this.moving = true; });
    this.scene.add(this.hole, this.geometryView);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(.5 / 2.6, 48, 32), new THREE.MeshBasicMaterial({ color: 0x051018 }));
    const grid = new THREE.Mesh(new THREE.SphereGeometry(.5 / 2.6 * 1.004, 24, 12), new THREE.MeshBasicMaterial({ color: 0x78c8cf, wireframe: true, transparent: true, opacity: .28 }));
    this.geometryView.add(sphere, grid);
    const points = Array.from({ length: 192 }, (_, i) => new THREE.Vector3(Math.cos(i / 192 * Math.PI * 2) * .5, Math.sin(i / 192 * Math.PI * 2) * .5, 0));
    this.shadowRing = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: 0xb7c9d2, dashSize: .018, gapSize: .014, transparent: true, opacity: .65 }));
    this.shadowRing.computeLineDistances(); this.geometryView.add(this.shadowRing);
    const stars = new Float32Array(450 * 3);
    for (let i = 0; i < 450; i++) { const a = i * 2.39996, z = Math.sin(i * 74.717); stars.set([Math.cos(a) * Math.sqrt(1 - z * z) * 55, Math.sin(a) * Math.sqrt(1 - z * z) * 55, z * 55], i * 3); }
    this.scene.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(stars, 3)), new THREE.PointsMaterial({ size: .07, color: 0x697f9a, transparent: true, opacity: .5 })));
    for (let i = 0; i < 2; i++) { const label = document.createElement('span'); label.className = 'scene-label anatomy-label'; host.append(label); this.labels.push(label); }
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
  }
  private resize() {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false); this.moving = true; this.lastView = '';
  }
  draw(state: ChapterState, options: ViewOptions) {
    const geometry = state.part === 'horizon';
    const key = options.view + ':' + state.part + ':' + options.guides + ':' + options.annotations;
    if (key !== this.lastView) { this.lastView = key; this.moving = true; }
    if (!this.moving && state.progress === this.lastProgress) return;
    this.lastProgress = state.progress;
    this.hole.visible = !geometry; this.geometryView.visible = geometry;
    this.shadowRing.visible = options.guides;
    this.controls.enabled = options.view === 'free';
    const now = performance.now(), dt = Math.min(.1, (now - this.previousTime) / 1000); this.previousTime = now;
    if (options.view !== 'free') {
      const distance = (geometry ? 3.6 : options.view === 'close' ? 10.8 : 13.2) * Math.max(1, .95 / this.camera.aspect);
      this.desired.set(0, options.view === 'top' ? 0 : -distance * .94, options.view === 'top' ? distance : distance * .34);
      const blend = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1 - Math.exp(-dt * 9);
      this.camera.position.lerp(this.desired, blend);
      this.target.set(0, options.view === 'top' ? 1 : 0, options.view === 'top' ? 0 : 1);
      this.camera.up.lerp(this.target, blend).normalize(); this.camera.lookAt(0, 0, 0);
      this.moving = this.camera.position.distanceTo(this.desired) > .0005;
    } else this.moving = false;
    this.controls.update(); this.camera.updateMatrixWorld();
    this.shadowRing.quaternion.copy(this.camera.quaternion);
    this.hole.setAccretion(state.progress * 32, .85);
    this.renderer.render(this.scene, this.camera);
    this.labels[0].textContent = geometry ? t('事件视界 · 几何示意') : t('黑洞阴影');
    this.labels[1].textContent = geometry ? t('外圈：阴影参考尺度') : t('发光的吸积盘');
    this.labels.forEach((label, i) => { label.hidden = !options.annotations || (geometry && i === 1 && !options.guides); label.style.left = (i === 0 ? 27 : 73) + '%'; label.style.top = '83%'; });
  }
  status() { return 'ready' as const; }
  retry() {}
  dispose() {
    this.observer.disconnect(); this.controls.dispose();
    this.scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); } });
    this.renderer.dispose(); releaseCanvas(this.host);
  }
}

export const chapter: ChapterDefinition = {
  title: t('认识黑洞'), intro: t('先分清黑洞、周围发光的气体，以及被引力改变的光像。'),
  scale: t('本体特写；采用无自旋薄盘示意。事件视界使用单独的几何示意，不是内部照片。'),
  learningId: 'black-holes',
  choices: [{ key: 'part', label: t('选择结构'), options: parts.map(({ value, label }) => ({ value, label })) }],
  duration: () => 32,
  steps: () => [],
  describe(state, academic) {
    const part = parts.find(item => item.value === state.part) ?? parts[0];
    return { title: part.title, body: academic ? part.science : part.body, prompt: part.prompt, formula: part.formula, terms: part.terms,
      caution: t('颜色、亮度和时间是教学设置。黑洞阴影、事件视界与潮汐尺度是不同概念。'),
      note: state.part === 'horizon' ? t('几何示意：内侧是视界，外圈为阴影投影参考；不是两层外壳。') : t('可以拖动进度看盘面流动；自由转动时可拖拽和缩放。') };
  },
  create: host => new AnatomyScene(host),
};
