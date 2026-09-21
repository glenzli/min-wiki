import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { energyRatio, smooth } from './model.ts';
import type { Settings } from './model.ts';

const TERRAIN_WIDTH = 14;
const TERRAIN_DEPTH = 9;
const SEGMENTS_X = 112;
const SEGMENTS_Z = 72;
const EJECTA_COUNT = 420;

const seed = (i: number) => {
  const n = Math.sin(i * 127.1 + 81.2) * 43758.5453;
  return n - Math.floor(n);
};

const craterScale = (settings: Settings) => Math.min(3.25, 1.48 * energyRatio(settings) ** .19);

function baseRelief(x: number, z: number) {
  return .055 * Math.sin(x * 1.31 + z * .61)
    + .032 * Math.sin(x * 3.7 - z * 2.1)
    + .018 * Math.cos(x * 7.3 + z * 4.6);
}

function terrainHeight(x: number, z: number, progress: number, settings: Settings) {
  const radius = craterScale(settings);
  const formation = smooth(.35, .67, progress);
  const settled = smooth(.68, .95, progress);
  const distance = Math.hypot(x, z);
  const u = distance / radius;
  const bowl = u < 1 ? -(1 - u * u) * radius * (.56 - .11 * settled) : 0;
  const rim = Math.exp(-(((u - 1.04) / .17) ** 2)) * radius * .15;
  const blanket = u > 1.1 && u < 2.45
    ? Math.max(0, .075 * radius * (2.45 - u) / (1.35 + u * u))
    : 0;
  return baseRelief(x, z) + formation * (bowl + rim + blanket);
}

export class TopicScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, .05, 80);
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private terrainGeometry = new THREE.PlaneGeometry(TERRAIN_WIDTH, TERRAIN_DEPTH, SEGMENTS_X, SEGMENTS_Z);
  private terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: .94,
    metalness: .02,
    side: THREE.DoubleSide,
  });
  private terrainMesh: THREE.Mesh;
  private meteor: THREE.Mesh;
  private trail: THREE.Line;
  private flash: THREE.Mesh;
  private flashLight: THREE.PointLight;
  private shockwave: THREE.Mesh;
  private ejecta: THREE.Points;
  private progress = 0;
  private settings: Settings = { diameter: 100, speed: 20 };
  private baseXZ: Float32Array;
  private colorAttribute: THREE.BufferAttribute;
  private ejectaParameters: Float32Array;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.scene.background = new THREE.Color(0x07111d);
    this.scene.fog = new THREE.FogExp2(0x07111d, .028);

    this.camera.position.set(7.4, 5.25, 7.7);
    this.camera.lookAt(0, -.25, 0);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .08;
    this.controls.minDistance = 6.5;
    this.controls.maxDistance = 16;
    this.controls.minPolarAngle = .3;
    this.controls.maxPolarAngle = Math.PI * .47;
    this.controls.target.set(0, -.25, 0);
    this.controls.addEventListener('change', () => this.render());

    this.scene.add(new THREE.HemisphereLight(0xa9c9e2, 0x1a2028, 1.25));
    const sun = new THREE.DirectionalLight(0xfff2d2, 3.7);
    sun.position.set(-6, 8, 4);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8db5dc, .52);
    fill.position.set(6, 2, -5);
    this.scene.add(fill);

    this.addStars();

    this.terrainGeometry.rotateX(-Math.PI / 2);
    const terrainPosition = this.terrainGeometry.getAttribute('position') as THREE.BufferAttribute;
    this.baseXZ = new Float32Array(terrainPosition.count * 2);
    const colors = new Float32Array(terrainPosition.count * 3);
    for (let i = 0; i < terrainPosition.count; i++) {
      this.baseXZ[i * 2] = terrainPosition.getX(i);
      this.baseXZ[i * 2 + 1] = terrainPosition.getZ(i);
      colors.set([.47, .48, .47], i * 3);
    }
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    this.terrainGeometry.setAttribute('color', this.colorAttribute);
    this.terrainMesh = new THREE.Mesh(this.terrainGeometry, this.terrainMaterial);
    this.scene.add(this.terrainMesh);

    const meteorGeometry = new THREE.DodecahedronGeometry(.23, 1);
    const meteorPositions = meteorGeometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < meteorPositions.count; i++) {
      const scale = .82 + seed(i + 70) * .32;
      meteorPositions.setXYZ(i, meteorPositions.getX(i) * scale, meteorPositions.getY(i) * scale, meteorPositions.getZ(i) * scale);
    }
    meteorGeometry.computeVertexNormals();
    this.meteor = new THREE.Mesh(meteorGeometry, new THREE.MeshStandardMaterial({ color: 0x999893, roughness: .91 }));
    this.scene.add(this.meteor);

    const trailGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: 0xb8d2e5, transparent: true, opacity: .24 }));
    this.scene.add(this.trail);

    this.flash = new THREE.Mesh(
      new THREE.SphereGeometry(1, 30, 18),
      new THREE.MeshBasicMaterial({ color: 0xffd582, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.flash.position.set(0, .08, 0);
    this.scene.add(this.flash);
    this.flashLight = new THREE.PointLight(0xffb85d, 0, 8, 2);
    this.flashLight.position.set(0, .45, 0);
    this.scene.add(this.flashLight);

    this.shockwave = new THREE.Mesh(
      new THREE.RingGeometry(.86, 1, 96),
      new THREE.MeshBasicMaterial({ color: 0xf2d19a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.shockwave.rotation.x = -Math.PI / 2;
    this.shockwave.position.y = .08;
    this.scene.add(this.shockwave);

    const ejectaGeometry = new THREE.BufferGeometry();
    ejectaGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(EJECTA_COUNT * 3), 3));
    const ejectaColors = new Float32Array(EJECTA_COUNT * 3);
    this.ejectaParameters = new Float32Array(EJECTA_COUNT * 5);
    const cool = new THREE.Color();
    for (let i = 0; i < EJECTA_COUNT; i++) {
      const angle = seed(i + 10) * Math.PI * 2;
      const launch = .65 + seed(i + 400) * 1.75;
      const elevation = .42 + seed(i + 810) * .55;
      const delay = seed(i + 1220) * .75;
      const side = .86 + seed(i + 1600) * .32;
      this.ejectaParameters.set([angle, launch, elevation, delay, side], i * 5);
      cool.set(i % 9 === 0 ? 0xd5b77f : i % 3 ? 0xb6b6ae : 0x777b7b);
      ejectaColors.set([cool.r, cool.g, cool.b], i * 3);
    }
    ejectaGeometry.setAttribute('color', new THREE.BufferAttribute(ejectaColors, 3));
    this.ejecta = new THREE.Points(ejectaGeometry, new THREE.PointsMaterial({
      size: .075,
      sizeAttenuation: true,
      transparent: true,
      opacity: .9,
      vertexColors: true,
      depthWrite: false,
    }));
    this.scene.add(this.ejecta);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  private addStars() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(540 * 3);
    for (let i = 0; i < 540; i++) {
      const angle = seed(i + 5) * Math.PI * 2;
      const radius = 18 + seed(i + 600) * 24;
      positions.set([
        Math.cos(angle) * radius,
        4 + seed(i + 1100) * 18,
        Math.sin(angle) * radius,
      ], i * 3);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xc9dded, size: .055, transparent: true, opacity: .65, depthWrite: false })));
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private updateTerrain(progress: number, settings: Settings) {
    const position = this.terrainGeometry.getAttribute('position') as THREE.BufferAttribute;
    const radius = craterScale(settings);
    const formation = smooth(.35, .67, progress);
    const color = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
      const x = this.baseXZ[i * 2];
      const z = this.baseXZ[i * 2 + 1];
      const u = Math.hypot(x, z) / radius;
      position.setY(i, terrainHeight(x, z, progress, settings));
      const grain = baseRelief(x * 2.6, z * 2.6) * .55;
      const bowlShade = formation * Math.max(0, 1 - u) * .16;
      const ejectaLight = formation * Math.exp(-(((u - 1.35) / .62) ** 2)) * .1;
      color.setRGB(.47 + grain - bowlShade + ejectaLight, .475 + grain - bowlShade + ejectaLight * .94, .46 + grain - bowlShade + ejectaLight * .78);
      this.colorAttribute.setXYZ(i, color.r, color.g, color.b);
    }
    position.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.terrainGeometry.computeVertexNormals();
  }

  private updateMeteor(progress: number, settings: Settings) {
    const beforeImpact = progress < .35;
    const u = Math.min(1, progress / .35);
    const travel = .08 * u + .92 * u * u * u;
    const start = new THREE.Vector3(2.1, 3.65, 2.25);
    const end = new THREE.Vector3(0, .11, 0);
    this.meteor.position.lerpVectors(start, end, travel);
    const size = .66 + Math.min(1.1, settings.diameter / 250);
    this.meteor.scale.setScalar(size);
    this.meteor.rotation.set(progress * 8.2, progress * 5.7, progress * 3.8);
    this.meteor.visible = beforeImpact;
    this.trail.visible = beforeImpact && progress > .025;
    if (this.trail.visible) {
      const line = this.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
      const back = this.meteor.position.clone().lerp(start, .18);
      line.setXYZ(0, back.x, back.y, back.z);
      line.setXYZ(1, this.meteor.position.x, this.meteor.position.y, this.meteor.position.z);
      line.needsUpdate = true;
    }
  }

  private updateImpact(progress: number, settings: Settings) {
    const impact = Math.max(0, Math.min(1, (progress - .35) / .075));
    const fade = 1 - impact;
    const flashMaterial = this.flash.material as THREE.MeshBasicMaterial;
    this.flash.visible = impact > 0 && impact < 1;
    this.flash.scale.setScalar(.12 + impact * 1.45);
    flashMaterial.opacity = fade * .8;
    this.flashLight.intensity = fade * 24;
    const shock = Math.max(0, Math.min(1, (progress - .355) / .18));
    const shockMaterial = this.shockwave.material as THREE.MeshBasicMaterial;
    this.shockwave.visible = shock > 0 && shock < 1;
    this.shockwave.scale.setScalar(.12 + shock * craterScale(settings) * 1.15);
    this.shockwave.position.y = terrainHeight(0, 0, progress, settings) + .055;
    shockMaterial.opacity = (1 - shock) * .58;
  }

  private updateEjecta(progress: number, settings: Settings) {
    const position = this.ejecta.geometry.getAttribute('position') as THREE.BufferAttribute;
    const radiusScale = craterScale(settings) / 1.48;
    const time = Math.max(0, (progress - .36) * 9.5);
    let visible = 0;
    for (let i = 0; i < EJECTA_COUNT; i++) {
      const offset = i * 5;
      const angle = this.ejectaParameters[offset];
      const launch = this.ejectaParameters[offset + 1] * (.84 + radiusScale * .16);
      const elevation = this.ejectaParameters[offset + 2];
      const delay = this.ejectaParameters[offset + 3];
      const side = this.ejectaParameters[offset + 4];
      const age = time - delay;
      if (age <= 0) {
        position.setXYZ(i, 0, -20, 0);
        continue;
      }
      const radial = launch * Math.cos(elevation) * age * side;
      const x = Math.cos(angle) * radial;
      const z = Math.sin(angle) * radial;
      const y = .1 + launch * Math.sin(elevation) * age - .62 * age * age;
      const ground = Math.abs(x) < TERRAIN_WIDTH / 2 && Math.abs(z) < TERRAIN_DEPTH / 2
        ? terrainHeight(x, z, progress, settings)
        : -1;
      if (y <= ground || radial > 8.5) position.setXYZ(i, x, ground - .12, z);
      else { position.setXYZ(i, x, y, z); visible++; }
    }
    position.needsUpdate = true;
    this.ejecta.visible = progress > .355 && visible > 0;
  }

  draw(progress: number, settings: Settings, _view = 'overview') {
    this.progress = progress;
    this.settings = settings;
    this.updateTerrain(progress, settings);
    this.updateMeteor(progress, settings);
    this.updateImpact(progress, settings);
    this.updateEjecta(progress, settings);
    this.controls.update();
    this.render();
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.observer.disconnect();
    this.controls.dispose();
    this.terrainGeometry.dispose();
    this.terrainMaterial.dispose();
    this.meteor.geometry.dispose();
    (this.meteor.material as THREE.Material).dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
    this.flash.geometry.dispose();
    (this.flash.material as THREE.Material).dispose();
    this.shockwave.geometry.dispose();
    (this.shockwave.material as THREE.Material).dispose();
    this.ejecta.geometry.dispose();
    (this.ejecta.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
