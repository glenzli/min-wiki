import { t } from '../i18n.ts';
import * as THREE from 'three';
import { StellarGas } from '../rendering/stellarGas.ts';
import { DisruptionLibrary } from './disruptionLibrary.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBlackHole, createStar } from '../shaders/blackHoleShader.ts';
import { orbitAt, clamp, smooth, randomSource, TIDAL_RADIUS, TAU, SCENARIOS } from './encounter.ts';

// Owns scene resources and their projection. All motion depends on progress;
// it neither advances time nor changes playback state.
export class TdeSimulation {
  container!: HTMLElement;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;
  view!: string;
  guidesVisible!: boolean;
  blackHole!: THREE.Group<THREE.Object3DEventMap>;
  star!: { group: THREE.Group<THREE.Object3DEventMap>; surface: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial, THREE.Object3DEventMap>; corona: THREE.Sprite<THREE.Object3DEventMap>; };
  focus!: THREE.Vector3;
  projected!: THREE.Vector3;
  library!: DisruptionLibrary;
  gasStatus!: string;
  absorbed!: number;
  scenario!: string;
  resizeObserver!: ResizeObserver;
  guides!: THREE.Group<THREE.Object3DEventMap>;
  tidalRing!: THREE.Line<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.LineDashedMaterial, THREE.Object3DEventMap>;
  future!: THREE.Line<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.LineDashedMaterial, THREE.Object3DEventMap>;
  trail!: THREE.Line<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.LineBasicMaterial, THREE.Object3DEventMap>;
  arrows!: THREE.Group<THREE.Object3DEventMap>;
  stellarGas!: StellarGas;
  lastProgress!: number | null;
  starVisible!: boolean;
  disposed!: boolean;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1500);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.domElement.setAttribute('aria-label', t("恒星经过黑洞的三维动画，故事和播放控制位于画面外"));
    this.renderer.domElement.setAttribute('role', 'img');
    container.prepend(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;
    this.controls.enablePan = false;
    this.controls.minDistance = 38;
    this.controls.maxDistance = 300;
    this.controls.maxPolarAngle = Math.PI * 0.9;
    this.view = 'top';
    this.guidesVisible = true;
    this.blackHole = createBlackHole();
    this.scene.add(this.blackHole);
    this.star = createStar();
    this.scene.add(this.star.group);
    this.focus = new THREE.Vector3();
    this.projected = new THREE.Vector3();
    this.initBackground();
    this.initGuides();
    this.initDebris();
    this.library = new DisruptionLibrary();
    this.gasStatus = 'ready';
    this.absorbed = 0;
    this.scenario = '';
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  initBackground() {
    const random = randomSource(83);
    const positions = [], colors = [];
    for (let i = 0; i < 1800; i++) {
      const a = random() * TAU, z = random() * 2 - 1;
      const r = 400 + random() * 300;
      positions.push(Math.cos(a) * Math.sqrt(1-z*z)*r, Math.sin(a)*Math.sqrt(1-z*z)*r, z*r);
      const b = 0.25 + random() * 0.45;
      colors.push(b * 0.84, b * 0.91, b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.8, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.65 })));
  }

  initGuides() {
    this.guides = new THREE.Group();
    const points = Array.from({length: 161}, (_, i) => new THREE.Vector3(Math.cos(i/160*TAU)*TIDAL_RADIUS, Math.sin(i/160*TAU)*TIDAL_RADIUS, -0.1));
    this.tidalRing = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineDashedMaterial({ color: 0xc58b69, dashSize: 0.8, gapSize: 0.8, transparent: true, opacity: 0.56, depthWrite: false }));
    this.tidalRing.computeLineDistances();
    this.guides.add(this.tidalRing);
    this.future = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xcabf9b, dashSize: 0.65, gapSize: 1.2, transparent: true, opacity: 0.46 }));
    this.trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xeab866, transparent: true, opacity: 0.8 }));
    this.guides.add(this.future, this.trail);
    this.arrows = new THREE.Group();
    this.guides.add(this.arrows);
    this.scene.add(this.guides);
  }

  initDebris() {
    this.stellarGas = new StellarGas(this.renderer.getPixelRatio());
    this.scene.add(this.stellarGas.points);
  }

  selectScenario(scenario: string) {
    this.scenario = scenario;
    const tidal = !!SCENARIOS[scenario].disrupted;
    this.blackHole.visible=!SCENARIOS[scenario].noBlackHole;
    this.renderer.domElement.setAttribute('aria-label', SCENARIOS[scenario].noBlackHole ? t("无黑洞对照：完整恒星沿直线匀速运动") : t("恒星经过黑洞的三维动画，故事和播放控制位于画面外"));
    this.tidalRing.visible=!SCENARIOS[scenario].noBlackHole;
    this.gasStatus = tidal ? 'loading' : 'ready';
    this.absorbed = 0;
    if (tidal) this.library.get(scenario).then(model => {
      if (this.disposed || this.scenario !== scenario) return;
      this.stellarGas.setModel(model);
      this.gasStatus = 'ready';
      this.lastProgress = null;
    }).catch(error => {
      if (this.disposed || this.scenario !== scenario) return;
      console.error('Gas preparation failed', error);
      this.gasStatus = 'error';
    });
    const max = tidal ? 0.4 : 1;
    const points = Array.from({length: 241}, (_, i) => {
      const p = orbitAt(i/240*max, scenario);
      return new THREE.Vector3(p.x, p.y, p.z);
    });
    this.future.geometry.dispose(); this.trail.geometry.dispose();
    this.future.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.trail.geometry = this.future.geometry.clone();
    this.future.computeLineDistances();
    for (const child of [...this.arrows.children]) {
      if (child instanceof THREE.Mesh) { child.geometry.dispose(); if (!Array.isArray(child.material)) child.material.dispose(); } this.arrows.remove(child);
    }
    const stops = !tidal ? [0.14, 0.5, 0.86] : [0.12, 0.25];
    stops.forEach(t => {
      const p = orbitAt(t, scenario);
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.43, 1.4, 3), new THREE.MeshBasicMaterial({ color: 0xcdb789, transparent: true, opacity: 0.55 }));
      arrow.position.set(p.x, p.y, 0);
      arrow.rotation.z = Math.atan2(p.vy, p.vx) - Math.PI/2;
      this.arrows.add(arrow);
    });
    this.lastProgress = null;
  }

  update(progress: number, scenario: string) {
    if (scenario !== this.scenario) this.selectScenario(scenario);
    if (progress !== this.lastProgress) {
      this.lastProgress = progress;
      const p = orbitAt(progress, scenario);
      const tidal = !!SCENARIOS[scenario].disrupted;
      // The flyby retains its photosphere. In the tidal encounter the entire
      // star is the same parcel volume from the first frame onward.
      this.star.group.visible = !tidal;
      this.star.group.position.set(p.x, p.y, 0);
      this.star.surface.material.uniforms.uTime.value = progress * 48;
      this.stellarGas.points.visible = tidal && this.gasStatus === 'ready';
      this.starVisible = !tidal;
      this.focus.copy(this.star.group.position);
      if (tidal && this.gasStatus === 'ready') {
        const body = this.stellarGas.update(progress);
        this.focus.set(body.x, body.y, body.z);
        this.starVisible = body.starVisible;
        this.absorbed = body.absorbed;
      }
      const max = tidal ? 0.4 : 1;
      this.trail.geometry.setDrawRange(0, Math.max(0, Math.floor(clamp(progress/max)*240)+1));
      this.future.geometry.setDrawRange(Math.floor(clamp(progress/max)*240), 241);
      if (this.view !== 'free') this.frameCamera();
    }
    this.guides.visible = this.guidesVisible;
    if (this.view === 'free') this.controls.update();
    this.camera.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);
  }

  setView(view: string) {
    this.view=view;
    this.controls.enabled=view==='free';
    if(view!=='free') this.frameCamera();
  }
  frameCamera() {
    const aspect=this.container.clientWidth/Math.max(1,this.container.clientHeight);
    // Reserve the top/bottom of the scene for labels and scene controls.
    // Ease closer while the star approaches, then hold the view on the gas.
    // Free orbit is never changed by this automatic framing.
    const close=SCENARIOS[this.scenario]?.disrupted?smooth(0.18,0.43,this.lastProgress??0):0;
    const comparison=this.scenario==='free'||this.scenario==='flyby';
    const height=comparison?112:68-28*close, width=142-72*close, targetY=comparison?28:-7*(1-close);
    const distance=Math.max(height/2/Math.tan(21*Math.PI/180), width/2/Math.tan(21*Math.PI/180)/aspect);
    this.controls.target.set(0,targetY,0);
    if(this.view==='top') this.camera.position.set(0,targetY,distance);
    else this.camera.position.set(0,targetY-distance*0.44,distance*0.90);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }
  resize() {
    const width=this.container.clientWidth, height=this.container.clientHeight;
    if(!width||!height) return;
    this.camera.aspect=width/height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width,height);
    this.stellarGas.points.material.uniforms.uHeight.value = height;
    if(this.view!=='free') this.frameCamera();
  }
  labelPosition(point: THREE.Vector3) {
    this.projected.copy(point).project(this.camera);
    return { x:(this.projected.x+1)/2*this.container.clientWidth, y:(1-this.projected.y)/2*this.container.clientHeight, visible:Math.abs(this.projected.x)<0.96&&Math.abs(this.projected.y)<0.91&&this.projected.z>-1&&this.projected.z<1 };
  }
  dispose() {
    this.disposed = true;
    this.library.dispose();
    this.resizeObserver.disconnect(); this.controls.dispose();
    this.scene.traverse(object=>{
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
        object.geometry?.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
          material.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}
