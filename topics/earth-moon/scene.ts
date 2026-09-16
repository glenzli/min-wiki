import { animateValue } from '../../src/visuals/transition.ts';
import { teachingDistanceScale, updateTeachingLens, retreatPosition } from '../../src/visuals/teachingCamera.ts';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import earthURL from './assets/2k_earth_daymap.jpg';
import moonURL from './assets/2k_moon.jpg';
import cloudURL from './assets/2k_earth_clouds.jpg';
import { moonPosition, DISTANCE_EARTH_RADII, MOON_EARTH_RADIUS_RATIO, SYNODIC_DAYS, phaseIndex } from './model.ts';
import type { Settings } from './model.ts';
import { t } from './i18n.ts';

export class TopicScene {
  private cancelViewMotion = () => {};
  private viewBlend = 1;
  private fromBodies: { position: THREE.Vector3; scale: THREE.Vector3; rotation: THREE.Quaternion }[] = [];
  private fromCamera = new THREE.Vector3();
  private toCamera = new THREE.Vector3();
  private fromTarget = new THREE.Vector3();
  private toTarget = new THREE.Vector3();
  private renderer: THREE.WebGLRenderer;
  private world = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, .1, 12000);
  private controls: OrbitControls;
  private earth = new THREE.Group();
  private moon = new THREE.Group();
  private marker = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd78a' }));
  private orbit: THREE.LineLoop;
  private sizes = new THREE.Group();
  private observer: ResizeObserver;
  private textures: THREE.Texture[] = [];
  private labels: HTMLDivElement[] = [];
  private phaseCanvas: HTMLCanvasElement;
  private phaseContext: CanvasRenderingContext2D;
  private phasePixels: ImageData;
  private phaseBase = new Float32Array(192 * 192);
  private progress = 0;
  private settings: Settings = { guides: true };
  private view = '';
  private disposed = false;
  private width = 1;
  private height = 1;
  private caption = document.createElement('div');
  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.world.background = new THREE.Color('#091423');
    this.world.add(new THREE.AmbientLight('#9dc0ea', .26));
    const sun = new THREE.DirectionalLight('#fff0cf', 3.1); sun.position.set(-100, 0, 0); this.world.add(sun);
    const sphere = new THREE.SphereGeometry(1, 64, 40);
    const load = (url: string, color = true) => {
      const texture = new THREE.TextureLoader().load(url, () => { if (this.disposed) texture.dispose(); else this.render(); });
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      this.textures.push(texture); return texture;
    };
    const earth = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: load(earthURL), roughness: .95 }));
    const clouds = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: '#ffffff', alphaMap: load(cloudURL, false), transparent: true, opacity: .42, depthWrite: false }));
    clouds.scale.setScalar(1.007); this.earth.add(earth, clouds);
    const atmosphere = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: '#72b7e8', transparent: true, opacity: .06, side: THREE.BackSide })); atmosphere.scale.setScalar(1.04); this.earth.add(atmosphere);
    this.moon.add(new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: load(moonURL), roughness: 1 })), this.marker);
    this.marker.position.set(0, 0, 1.035);
    const points = Array.from({ length: 200 }, (_, i) => new THREE.Vector3(...moonPosition(i / 200, 1)));
    this.orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#577994', transparent: true, opacity: .55 }));
    for (let i = 1; i < 30; i++) {
      const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, j) => new THREE.Vector3(Math.cos(j / 48 * Math.PI * 2), Math.sin(j / 48 * Math.PI * 2), 0))), new THREE.LineBasicMaterial({ color: '#4c677c', transparent: true, opacity: .45 }));
      outline.position.x = -DISTANCE_EARTH_RADII / 2 + i * 2; this.sizes.add(outline);
    }
    this.world.add(this.earth, this.moon, this.orbit, this.sizes);
    const sunlight = new THREE.Group();
    for (const z of [-4, 0, 4]) sunlight.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-18, 0, z), 5, '#cdb47c', .7, .35));
    sunlight.name = 'sunlight'; this.world.add(sunlight);
    const stars = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) { const a = i * 2.399963, z = 1 - 2 * (i + .5) / 600, r = Math.sqrt(1 - z * z); stars.set([Math.cos(a) * r * 700, z * 700, Math.sin(a) * r * 700], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(stars, 3)); this.world.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#b5cfeb', size: 1, sizeAttenuation: false, transparent: true, opacity: .6 })));
    this.controls = new OrbitControls(this.camera, canvas); this.controls.enablePan = false; this.controls.enableDamping = false; this.controls.minDistance = 8; this.controls.maxDistance = 200;
    this.controls.addEventListener('change', () => this.render());
    this.controls.addEventListener('start', () => { this.cancelViewMotion(); this.viewBlend = 1; });
    for (const text of [t('地球'), t('月球')]) { const label = document.createElement('div'); label.className = 'object-label'; label.textContent = text; canvas.parentElement!.append(label); this.labels.push(label); }
    this.caption.className = 'scene-caption'; canvas.parentElement!.append(this.caption);
    this.phaseCanvas = document.getElementById('phase') as HTMLCanvasElement;
    this.phaseContext = this.phaseCanvas.getContext('2d')!;
    this.phasePixels = this.phaseContext.createImageData(192, 192);
    for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) {
      let value = 178 + 6 * Math.sin(x * 12.9898 + y * 78.233);
      for (let i = 0; i < 22; i++) {
        const cx = 30 + (Math.sin(i * 7.17) * .5 + .5) * 132, cy = 25 + (Math.cos(i * 4.37) * .5 + .5) * 142;
        const radius = i < 6 ? 16 + i * 3 : 3 + i % 5, distance = Math.hypot(x - cx, y - cy) / radius;
        value -= (i < 6 ? 27 : 12) * Math.exp(-distance * distance * 2);
      }
      this.phaseBase[y * 192 + x] = value;
    }
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.resize();
  }
  private resize() { this.cancelViewMotion(); this.viewBlend = 1;
    this.width = this.canvas.clientWidth; this.height = this.canvas.clientHeight;
    this.renderer.setSize(this.width, this.height, false); this.camera.aspect = this.width / this.height; updateTeachingLens(this.camera, this.controls.target); const lensScale = teachingDistanceScale(this.camera.aspect, 42); this.controls.minDistance = 8 * lensScale; this.controls.maxDistance = 200 * lensScale;
    this.setCamera(); this.render();
  }
  private setCamera() {
    const narrow = Math.max(1, 1.12 / this.camera.aspect);
    if (this.view === 'scale') this.camera.position.set(0, 12 * narrow, 83 * narrow);
    else this.camera.position.set(1, 23 * narrow, 28 * narrow);
    this.controls.target.set(0, 0, 0); retreatPosition(this.camera.position, this.controls.target, this.camera.aspect, 42); this.controls.update();
  }
  draw(progress: number, settings: Settings, view: string) {
    this.progress = progress; this.settings = settings;
    const changed = view !== this.view, animate = changed && this.view !== '';
    if (changed) {
      this.cancelViewMotion();
      this.fromBodies = [this.earth, this.moon].map(body => ({ position: body.position.clone(), scale: body.scale.clone(), rotation: body.quaternion.clone() }));
      this.fromCamera.copy(this.camera.position); this.fromTarget.copy(this.controls.target);
      this.view = view; this.setCamera();
      this.toCamera.copy(this.camera.position); this.toTarget.copy(this.controls.target); this.viewBlend = animate ? 0 : 1;
    }
    const real = view === 'scale';
    this.earth.position.set(real ? -DISTANCE_EARTH_RADII / 2 : 0, 0, 0); this.earth.scale.setScalar(real ? 1 : 2.2);
    this.earth.rotation.y = progress * SYNODIC_DAYS * Math.PI * 2;
    this.moon.scale.setScalar(real ? MOON_EARTH_RADIUS_RATIO : .95);
    this.moon.position.set(...(real ? [DISTANCE_EARTH_RADII / 2, 0, 0] as [number, number, number] : moonPosition(progress)));
    this.moon.lookAt(this.earth.position); this.marker.visible = settings.guides;
    this.orbit.visible = !real && settings.guides; this.orbit.scale.setScalar(11); this.sizes.visible = real && settings.guides;
    this.world.getObjectByName('sunlight')!.visible = !real;
    this.caption.textContent = real ? t('平均中心距离约为 30 个地球直径') : t('金色箭头表示太阳光方向');
    this.phaseCanvas.parentElement!.hidden = real; this.drawPhase(progress);
    if (this.viewBlend < 1) {
      [this.earth, this.moon].forEach((body, i) => { const from = this.fromBodies[i]; body.position.lerpVectors(from.position, body.position.clone(), this.viewBlend); body.scale.lerpVectors(from.scale, body.scale.clone(), this.viewBlend); body.quaternion.slerpQuaternions(from.rotation, body.quaternion.clone(), this.viewBlend); });
      this.camera.position.lerpVectors(this.fromCamera, this.toCamera, this.viewBlend);
      this.controls.target.lerpVectors(this.fromTarget, this.toTarget, this.viewBlend); this.controls.update();
    }
    this.render();
    if (animate) this.cancelViewMotion = animateValue({ from: 0, to: 1, duration: 1000, onUpdate: blend => {
      this.viewBlend = blend; if (blend === 1) { this.camera.position.copy(this.toCamera); this.controls.target.copy(this.toTarget); this.controls.update(); }
      this.draw(this.progress, this.settings, this.view);
    } });
  }
  private drawPhase(p: number) {
    const pixels = this.phasePixels.data, a = p * Math.PI * 2, lx = Math.sin(a), lz = -Math.cos(a);
    for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) {
      const xx = (x - 95.5) / 85, yy = (y - 95.5) / 85, r2 = xx * xx + yy * yy, i = (y * 192 + x) * 4;
      if (r2 > 1) { pixels[i + 3] = 0; continue; }
      const z = Math.sqrt(1 - r2), illumination = Math.max(0, xx * lx + z * lz), v = this.phaseBase[y * 192 + x] * (.025 + .975 * Math.sqrt(illumination));
      pixels[i] = v; pixels[i + 1] = v; pixels[i + 2] = v * 1.025; pixels[i + 3] = 255;
    }
    this.phaseContext.putImageData(this.phasePixels, 0, 0);
    const names = [t('新月'), t('娥眉月'), t('上弦月'), t('盈凸月'), t('满月'), t('亏凸月'), t('下弦月'), t('残月')];
    document.getElementById('phase-title')!.textContent = names[phaseIndex(p)];
  }
  private render() {
    if (this.disposed) return;
    this.renderer.render(this.world, this.camera);
    if (!this.labels.length) return;
    [this.earth, this.moon].forEach((body, i) => { const v = body.position.clone().add(new THREE.Vector3(0, -body.scale.x - .6, 0)).project(this.camera); const label = this.labels[i]; label.style.left = `${Math.max(30, Math.min(this.width - 35, (v.x + 1) * .5 * this.width))}px`; label.style.top = `${(1 - v.y) * .5 * this.height}px`; label.hidden = v.z > 1 || v.z < -1; });
  }
  dispose() {
    this.cancelViewMotion(); this.disposed = true; this.observer.disconnect(); this.controls.dispose(); this.textures.forEach(t => t.dispose()); this.labels.forEach(l => l.remove()); this.caption.remove();
    this.world.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); } }); this.renderer.dispose();
  }
}
