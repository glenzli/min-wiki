import { animateValue } from '../../src/visuals/transition.ts';
import { teachingDistanceScale, updateTeachingLens, retreatPosition } from '../../src/visuals/teachingCamera.ts';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import saturnURL from './assets/2k_saturn.jpg';
import ringsURL from './assets/2k_saturn_ring_alpha.png';
import { MOONS, orbitalAngle, comparisonRadius } from './model.ts';
import type { Settings } from './model.ts';
import { MOON_TEXT } from './moons.ts';
import { t } from './i18n.ts';

function moonTexture(id: string, index: number) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256; const c = canvas.getContext('2d')!;
  c.fillStyle = id === 'titan' ? '#c99646' : id === 'enceladus' ? '#d8e8eb' : '#bcbdb7'; c.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 160; i++) {
    const x = (Math.sin(i * 7.43 + index) * .5 + .5) * 512, y = (Math.cos(i * 5.13) * .5 + .5) * 256, r = 1 + (i % 8);
    if (id === 'titan') { c.fillStyle = `rgba(209,166,94,${.015 + i % 3 * .01})`; c.fillRect(0, y, 512, r); continue; }
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = id === 'enceladus' ? '#819daa16' : '#565f6655'; c.fill(); c.strokeStyle = '#f5f1e94a'; c.lineWidth = .8; c.stroke();
  }
  if (id === 'iapetus') { const g = c.createLinearGradient(180, 0, 300, 0); g.addColorStop(0, '#241f1de8'); g.addColorStop(1, '#34282200'); c.fillStyle = g; c.fillRect(0, 0, 300, 256); }
  if (id === 'mimas') { c.beginPath(); c.ellipse(135, 113, 42, 36, 0, 0, Math.PI * 2); c.fillStyle = '#686965'; c.fill(); c.strokeStyle = '#dedbd1'; c.lineWidth = 5; c.stroke(); }
  if (id === 'enceladus') for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(155 + i * 31, 209); c.bezierCurveTo(159 + i * 28, 236, 130 + i * 32, 231, 140 + i * 28, 256); c.strokeStyle = '#79a9bd'; c.lineWidth = 2; c.stroke(); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
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
  private camera = new THREE.PerspectiveCamera(43, 1, .1, 12000);
  private controls: OrbitControls;
  private saturn = new THREE.Group();
  private bodies: THREE.Group[] = [];
  private paths: THREE.LineLoop[] = [];
  private labels: HTMLDivElement[] = [];
  private textures: THREE.Texture[] = [];
  private observer: ResizeObserver;
  private plume: THREE.Points;
  private selection = new THREE.Mesh(new THREE.RingGeometry(1.18, 1.21, 64), new THREE.MeshBasicMaterial({ color: '#edc887', side: THREE.DoubleSide, transparent: true, opacity: .7, depthTest: false }));
  private view = '';
  private progress = 0;
  private selected = 'titan';
  private disposed = false;
  private width = 1;
  private height = 1;
  private caption = document.createElement('div');
  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); this.renderer.setPixelRatio(Math.min(2, devicePixelRatio)); this.world.background = new THREE.Color('#0b1320');
    this.world.add(new THREE.AmbientLight('#cadbff', .7)); const light = new THREE.DirectionalLight('#fff0d8', 2.7); light.position.set(-30, 20, 35); this.world.add(light);
    const load = (url: string) => { const tex = new THREE.TextureLoader().load(url, () => { if (this.disposed) tex.dispose(); else this.render(); }); tex.colorSpace = THREE.SRGBColorSpace; this.textures.push(tex); return tex; };
    const sphere = new THREE.SphereGeometry(1, 64, 40);
    const planet = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: load(saturnURL), roughness: 1 })); planet.scale.set(2.4, 2.17, 2.4); this.saturn.add(planet);
    const ringGeometry = new THREE.RingGeometry(3.05, 5.65, 160, 1), vertices = ringGeometry.getAttribute('position'), uv = ringGeometry.getAttribute('uv');
    for (let i = 0; i < vertices.count; i++) { const r = Math.hypot(vertices.getX(i), vertices.getY(i)); uv.setXY(i, (r - 3.05) / 2.6, .5); }
    const rings = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ map: load(ringsURL), transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: .86 })); rings.rotation.x = -Math.PI / 2; this.saturn.add(rings); this.world.add(this.saturn);
    MOONS.forEach((moon, index) => {
      const body = new THREE.Group(), texture = moonTexture(moon.id, index); this.textures.push(texture);
      body.add(new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ map: texture, roughness: 1 })));
      if (moon.id === 'titan') { const haze = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: '#dfb46b', transparent: true, opacity: .10, side: THREE.BackSide })); haze.scale.setScalar(1.07); body.add(haze); }
      this.bodies.push(body); this.world.add(body);
      const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 200 }, (_, i) => { const a = i / 200 * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * moon.displayOrbit, moon.id === 'iapetus' ? Math.sin(a) * moon.displayOrbit * .2 : 0, Math.sin(a) * moon.displayOrbit); })), new THREE.LineBasicMaterial({ color: '#62788e', transparent: true, opacity: .30 })); this.paths.push(orbit); this.world.add(orbit);
      const label = document.createElement('div'); label.className = 'object-label'; label.textContent = MOON_TEXT[moon.id].name; canvas.parentElement!.append(label); this.labels.push(label);
    });
    const plumeGeometry = new THREE.BufferGeometry(); plumeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(180 * 3), 3));
    this.plume = new THREE.Points(plumeGeometry, new THREE.PointsMaterial({ color: '#cceaff', size: .085, transparent: true, opacity: .8, depthWrite: false })); this.bodies[1].add(this.plume);
    this.world.add(this.selection);
    const starPositions = new Float32Array(500 * 3); for (let i = 0; i < 500; i++) { const a = i * 2.399963, z = 1 - 2 * (i + .5) / 500, r = Math.sqrt(1 - z * z); starPositions.set([Math.cos(a) * r * 650, z * 650, Math.sin(a) * r * 650], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(starPositions, 3)); this.world.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#bfd0e5', size: 1, sizeAttenuation: false, transparent: true, opacity: .5 })));
    this.controls = new OrbitControls(this.camera, canvas); this.controls.enablePan = false; this.controls.enableDamping = false; this.controls.minDistance = 4; this.controls.maxDistance = 220; this.controls.addEventListener('change', () => this.render());
    this.controls.addEventListener('start', () => { this.cancelViewMotion(); this.viewBlend = 1; });
    this.caption.className = 'scene-caption'; canvas.parentElement!.append(this.caption);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.resize();
  }
  private resize() { this.cancelViewMotion(); this.viewBlend = 1; this.width = this.canvas.clientWidth; this.height = this.canvas.clientHeight; this.renderer.setSize(this.width, this.height, false); this.camera.aspect = this.width / this.height; updateTeachingLens(this.camera, this.controls.target); const lensScale = teachingDistanceScale(this.camera.aspect, 43); this.controls.minDistance = 4 * lensScale; this.controls.maxDistance = 220 * lensScale; this.setCamera(); this.render(); }
  private setCamera() {
    const f = Math.max(1, 1.5 / this.camera.aspect);
    if (this.view === 'close') this.camera.position.set(0, 1.3, 12 * Math.max(1, .95 / this.camera.aspect));
    else if (this.view === 'sizes') this.camera.position.set(0, 1.7, Math.max(12, (MOONS.reduce((sum, _, i) => sum + 2 * comparisonRadius(i), 0) + 6 * 1.8) / (2 * Math.tan(THREE.MathUtils.degToRad(43 / 2)) * this.camera.aspect) * 1.15));
    else this.camera.position.set(0, 42 * f, 52 * f);
    this.controls.target.set(0, 0, 0); retreatPosition(this.camera.position, this.controls.target, this.camera.aspect, 43); this.controls.update();
  }
  draw(progress: number, settings: Settings, view: string) {
    const changed = view !== this.view, animate = changed && this.view !== '';
    this.progress = progress; this.selected = settings.moon;
    if (changed) {
      this.cancelViewMotion();
      this.fromBodies = this.bodies.map(body => ({ position: body.position.clone(), scale: body.scale.clone(), rotation: body.quaternion.clone() }));
      this.fromCamera.copy(this.camera.position); this.fromTarget.copy(this.controls.target);
      this.view = view; this.setCamera();
      this.toCamera.copy(this.camera.position); this.toTarget.copy(this.controls.target); this.viewBlend = animate ? 0 : 1;
    }
    this.saturn.visible = view === 'orbit'; this.caption.textContent = view === 'sizes' ? t('七颗卫星使用同一半径比例') : view === 'close' ? t('表面特征示意，不是实测全表面地图') : t('精选七颗卫星 · 轨道间距为示意');
    const radii = MOONS.map((_, i) => comparisonRadius(i)), total = radii.reduce((s, r) => s + 2 * r, 0) + 6 * 1.8; let x = -total / 2;
    this.bodies.forEach((body, i) => {
      const moon = MOONS[i], angle = orbitalAngle(progress, i);
      body.visible = view !== 'close' || moon.id === settings.moon; this.paths[i].visible = view === 'orbit';
      if (view === 'orbit') { body.position.set(Math.cos(angle) * moon.displayOrbit, moon.id === 'iapetus' ? Math.sin(angle) * moon.displayOrbit * .2 : 0, Math.sin(angle) * moon.displayOrbit); body.scale.setScalar(Math.max(.22, moon.radius / 2574.7 * .88)); body.lookAt(0, 0, 0); }
      else if (view === 'sizes') { x += radii[i]; body.position.set(x, 0, 0); body.scale.setScalar(radii[i]); x += radii[i] + 1.8; body.rotation.set(0, -.6, 0); }
      else { body.position.set(0, 0, 0); body.scale.setScalar(2.5); body.rotation.set(0, -.6, 0); }
      this.labels[i].classList.toggle('selected', moon.id === settings.moon);
      if (moon.id === settings.moon) { this.selection.position.copy(body.position); this.selection.scale.setScalar(body.scale.x); }
    });
    this.selection.visible = view !== 'close'; this.plume.visible = view === 'close' && settings.moon === 'enceladus';
    const positions = this.plume.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) { const a = i * 2.4, u = (i / positions.count + progress * 6) % 1; positions.setXYZ(i, Math.cos(a) * (.05 + u * .28), -1 - u * .8, Math.sin(a) * (.05 + u * .28)); } positions.needsUpdate = true;
    if (this.viewBlend < 1) {
      this.bodies.forEach((body, i) => { const from = this.fromBodies[i]; body.position.lerpVectors(from.position, body.position.clone(), this.viewBlend); body.scale.lerpVectors(from.scale, body.scale.clone(), this.viewBlend); body.quaternion.slerpQuaternions(from.rotation, body.quaternion.clone(), this.viewBlend); if (MOONS[i].id === this.selected) { this.selection.position.copy(body.position); this.selection.scale.setScalar(body.scale.x); } });
      this.camera.position.lerpVectors(this.fromCamera, this.toCamera, this.viewBlend);
      this.controls.target.lerpVectors(this.fromTarget, this.toTarget, this.viewBlend); this.controls.update();
    }
    this.render();
    if (animate) this.cancelViewMotion = animateValue({ from: 0, to: 1, duration: 1100, onUpdate: blend => {
      this.viewBlend = blend; if (blend === 1) { this.camera.position.copy(this.toCamera); this.controls.target.copy(this.toTarget); this.controls.update(); }
      this.draw(this.progress, { moon: this.selected }, this.view);
    } });
  }
  private render() {
    if (this.disposed) return;
    this.selection.quaternion.copy(this.camera.quaternion); this.renderer.render(this.world, this.camera);
    this.bodies.forEach((body, i) => { const p = body.position.clone().add(new THREE.Vector3(0, -body.scale.x - .6, 0)).project(this.camera), label = this.labels[i]; label.textContent = this.view === 'sizes' ? MOON_TEXT[MOONS[i].id].name.split(' · ')[0] : MOON_TEXT[MOONS[i].id].name; label.hidden = !body.visible || p.z > 1 || p.z < -1 || (this.width < 500 && this.view === 'orbit' && MOONS[i].id !== this.selected); if (this.view === 'sizes') p.y -= (i % 2) * 55 / this.height; label.style.left = `${Math.max(48, Math.min(this.width - 48, (p.x + 1) * .5 * this.width))}px`; label.style.top = `${Math.max(65, Math.min(this.height - 65, (1 - p.y) * .5 * this.height))}px`; });
  }
  dispose() { this.cancelViewMotion(); this.disposed = true; this.observer.disconnect(); this.controls.dispose(); this.labels.forEach(l => l.remove()); this.caption.remove(); this.textures.forEach(t => t.dispose()); this.world.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose()); } }); this.renderer.dispose(); }
}
