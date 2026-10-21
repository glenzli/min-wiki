import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { animateValue } from '../../src/visuals/transition.ts';
import { seedDispersal } from './ecologyDispersal.ts';
import { ecologyMarkup } from './ecologyScene.ts';
import type { Habitat } from './ecologyModel.ts';
import { ROCK_RADIUS, type XYZ } from './eruptionGeometry.ts';
import { lavaMaterial, rockMaterial, rockTexture, skyMaterial, storageMaterial } from './eruptionMaterials.ts';
import { HISTORY_BEDS, HISTORY_FIELD_SIZE, HISTORY_UNITS, historyField, historyFlow, historyFrame, historyHeight, historyIntrusion, historySites, historyStratum, historyTerrain, type HistoryChapter } from './landscapeGeometry.ts';
import { landscapeMarkup } from './landscapeScene.ts';
import { seed } from './magmaGeometry.ts';
import { landCamera, type Aftermath, type Landform } from './projectModel.ts';
import { feederCenterline, intrusionSolid, storageComplex, type SolidBuffers } from './sectionGeometry.ts';

export type HistoryView = 'landscape' | 'section' | 'vent';
type DrawSettings = { chapter: HistoryChapter; aftermath: Aftermath; habitat: Habitat };
const DEFAULTS: DrawSettings = { chapter: 'landscape', aftermath: 'green', habitat: 'wet' };

function geometry(data: SolidBuffers) {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
  result.setIndex(data.indices); result.computeVertexNormals(); return result;
}
function replacePositions(target: THREE.BufferGeometry, data: number[], frontStart?: number) {
  const positions = target.getAttribute('position') as THREE.BufferAttribute;
  (positions.array as Float32Array).set(data); positions.needsUpdate = true;
  target.computeVertexNormals();
  if (frontStart !== undefined) {
    const normals = target.getAttribute('normal') as THREE.BufferAttribute;
    // A pinched-out bed can have zero thickness. Keep the exposed face normal
    // finite as it enters, rather than normalizing a zero vector in the shader.
    for (let i = frontStart; i < normals.count; i++) normals.setXYZ(i, 0, 0, 1);
    normals.needsUpdate = true;
  }
  target.computeBoundingSphere();
}
function groundStyle(grain: THREE.Texture, field: THREE.Texture) {
  const material = rockMaterial(grain), compile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer); shader.uniforms.uHistoryField = { value: field };
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uHistoryField;')
      .replace('#include <roughnessmap_fragment>', `
        vec3 ecology=texture2D(uHistoryField,vRock.xz/${(ROCK_RADIUS * 2).toFixed(1)}+.5).rgb;
        float tuft=fbm(vRock*vec3(29.,3.,29.));
        vec3 grass=mix(vec3(.045,.066,.019),vec3(.18,.19,.056),tuft);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.061,.039,.021),ecology.g*.55);
        diffuseColor.rgb=mix(diffuseColor.rgb,grass,ecology.r*(.68+.32*grit));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.27,.245,.205)*(.64+.4*coarse),ecology.b*.88);
        #include <roughnessmap_fragment>
      `);
  };
  material.customProgramCacheKey = () => 'volcano-history-ground-v1'; return material;
}
function grassGeometry() {
  return geometry({ positions: [-.35, 0, 0, .35, 0, 0, -.14, .55, .06, .17, .55, .06, .21, 1, .17],
    uvs: [0, 0, 1, 0, 0, .55, 1, .55, .5, 1], indices: [0, 1, 2, 1, 3, 2, 2, 3, 4] });
}

/** Long-term deposit/ecology projection. It owns no eruption clock or model. */
class LandHistory3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1.5, .06, 180);
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private grain = rockTexture();
  private field = new THREE.DataTexture(new Uint8Array(HISTORY_FIELD_SIZE ** 2 * 4), HISTORY_FIELD_SIZE, HISTORY_FIELD_SIZE, THREE.RGBAFormat);
  private groundMaterial = groundStyle(this.grain, this.field);
  private surface: THREE.Mesh;
  private farGround: THREE.Mesh;
  private strata: THREE.Mesh[] = [];
  private dike: THREE.Mesh;
  private geology = new THREE.Group();
  private storageStyle = storageMaterial(this.grain);
  private intrusionStyle = storageMaterial(this.grain, true);
  private flowStyles = Array.from({ length: 6 }, () => lavaMaterial(this.grain));
  private flows: THREE.Mesh[] = [];
  private grass: THREE.InstancedMesh;
  private seeds: THREE.InstancedMesh;
  private prior: THREE.LineSegments;
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private frame = historyFrame(.08, 'landscape');
  private view: HistoryView = 'landscape';
  private settings: DrawSettings = DEFAULTS;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private hasSize = false;
  private framing = 1;
  private lastTerrain = '';
  private lastSection = '';
  private disposed = false;
  private cancelCamera = () => {};

  constructor(readonly canvas: HTMLCanvasElement, readonly kind: Landform) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(max-width: 720px)').matches ? 1.3 : 1.7));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.localClippingEnabled = true; this.renderer.toneMappingExposure = 1.2;
    this.field.magFilter = this.field.minFilter = THREE.LinearFilter;
    this.scene.fog = new THREE.Fog('#63747a', 32, 90);
    this.scene.add(this.mesh(new THREE.SphereGeometry(100, 24, 14), skyMaterial()));
    this.scene.add(new THREE.HemisphereLight('#d7e8eb', '#6c5742', 1.6));
    const sun = new THREE.DirectionalLight('#ffdfb2', 3.1); sun.position.set(-9, 16, 11); this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#a7c4d0', 1.3); fill.position.set(9, 7, -4); this.scene.add(fill);
    this.surface = this.mesh(geometry(historyTerrain(kind, this.frame)), this.groundMaterial); this.scene.add(this.surface);
    const plain = new THREE.PlaneGeometry(180, 180), plainUV = plain.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < plainUV.count; i++) plainUV.setXY(i, plainUV.getX(i) * 36, plainUV.getY(i) * 36);
    const plainMaterial = rockMaterial(this.grain); plainMaterial.bumpScale = .028;
    this.farGround = this.mesh(plain, plainMaterial);
    this.farGround.rotation.x = -Math.PI / 2; this.farGround.position.y = -.075; this.scene.add(this.farGround);
    for (let i = 0; i < HISTORY_UNITS; i++) {
      const facies = i < HISTORY_BEDS ? .32 + i % 2 * .14 : kind === 'shield' ? .12 + i % 3 * .09 : [.58, .24, .76][i % 3];
      const data = historyStratum(i, kind, this.frame), mesh = this.mesh(geometry(data), rockMaterial(this.grain, true, facies));
      replacePositions(mesh.geometry, data.positions, data.frontStart); this.strata.push(mesh); this.geology.add(mesh);
    }
    this.geology.add(this.mesh(geometry(storageComplex()), this.storageStyle.material));
    for (let i = 0; i < 3; i++) this.geology.add(this.mesh(geometry(intrusionSolid(feederCenterline(i), .045, .18)), this.intrusionStyle.material));
    this.dike = this.mesh(geometry(historyIntrusion(kind, this.frame)), this.intrusionStyle.material); this.geology.add(this.dike);
    // This fixed lower feeder is exposed only in the geological cutaway. It
    // does not imply that one episode is feeding the whole mountain history.
    for (let i = 0; i < 6; i++) { const mesh = this.mesh(geometry(historyFlow(i, kind, this.frame)), this.flowStyles[i].material); this.flows.push(mesh); this.scene.add(mesh); }
    this.scene.add(this.geology); this.geology.visible = false;
    const grassMaterial = new THREE.MeshStandardMaterial({ color: '#839253', roughness: .96, side: THREE.DoubleSide });
    this.grass = new THREE.InstancedMesh(this.keep(grassGeometry()), this.keepMaterial(grassMaterial), 2200);
    this.seeds = new THREE.InstancedMesh(this.keep(new THREE.SphereGeometry(1, 6, 4)), this.keepMaterial(new THREE.MeshStandardMaterial({ color: '#a28c66', roughness: 1 })), 25);
    this.grass.frustumCulled = this.seeds.frustumCulled = false; this.scene.add(this.grass, this.seeds);
    const lines: number[] = [];
    for (let i = 0; i < 120; i++) if (i % 2 === 0) for (const at of [i, i + 1]) {
      const x = -ROCK_RADIUS + at / 120 * ROCK_RADIUS * 2; lines.push(x, historyHeight(x, 0, kind) + .04, .055);
    }
    const outline = new THREE.BufferGeometry(); outline.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    this.prior = new THREE.LineSegments(this.keep(outline), this.keepMaterial(new THREE.LineBasicMaterial({ color: '#d4c19b', transparent: true, opacity: .6 })));
    this.scene.add(this.prior); this.prior.visible = false;
    this.controls = new OrbitControls(this.camera, canvas); this.controls.enableDamping = false; this.controls.enablePan = false;
    this.controls.addEventListener('change', this.render); this.controls.addEventListener('start', this.stopMotion);
    canvas.addEventListener('keydown', this.keydown);
    this.observer = new ResizeObserver(this.resize); this.observer.observe(canvas);
    canvas.dataset.renderer = 'webgl'; this.setView('landscape', false); this.draw(.08, DEFAULTS); this.resize();
  }
  private keep<T extends THREE.BufferGeometry>(item: T): T { this.geometries.add(item); return item; }
  private keepMaterial<T extends THREE.Material>(item: T): T { this.materials.add(item); return item; }
  private mesh(data: THREE.BufferGeometry, material: THREE.Material) { return new THREE.Mesh(this.keep(data), this.keepMaterial(material)); }
  draw(progress: number, settings: DrawSettings) {
    if (this.disposed) return;
    this.settings = settings; this.frame = historyFrame(progress, settings.chapter, settings.aftermath, settings.habitat);
    const frame = this.frame, key = `${frame.land.growth}:${frame.land.erosion}`;
    if (key !== this.lastTerrain) { replacePositions(this.surface.geometry, historyTerrain(this.kind, frame).positions); this.lastTerrain = key; }
    const sectionKey = `${key}:${frame.contacts.join(':')}`;
    if (this.view === 'section' && sectionKey !== this.lastSection) {
      this.strata.forEach((mesh, i) => { const data = historyStratum(i, this.kind, frame); replacePositions(mesh.geometry, data.positions, data.frontStart); });
      replacePositions(this.dike.geometry, historyIntrusion(this.kind, frame).positions);
      this.lastSection = sectionKey;
    }
    (this.field.image.data as Uint8Array).set(historyField(this.kind, frame)); this.field.needsUpdate = true;
    this.storageStyle.heat.value = this.intrusionStyle.heat.value = frame.land.activity * (1 - frame.land.cooling) * .7;
    this.flows.forEach((mesh, i) => {
      const flow = historyFlow(i, this.kind, frame); mesh.visible = flow.visible;
      if (flow.visible) replacePositions(mesh.geometry, flow.positions);
      const age = Math.max(0, frame.p - .08 - i * .065);
      this.flowStyles[i].heat.value = Math.max(0, 1 - age / .25) * frame.land.activity;
      this.flowStyles[i].time.value = .42 + Math.min(.4, age * 4);
    });
    let blade = 0, seedIndex = 0;
    const surface = (x: number, z: number) => historyHeight(x, z, this.kind, frame.land.growth, frame.land.erosion);
    for (const site of historySites(this.kind, frame)) {
      for (let j = 0; j < 22; j++) {
        const id = site.index * 22 + j, angle = seed(id + 2501) * Math.PI * 2, r = site.radius * Math.sqrt(seed(id + 411));
        const x = site.x + Math.cos(angle) * r, z = site.z + Math.sin(angle) * r;
        const scale = site.cover * (1 - frame.burial) * (this.view !== 'section' || z < 0 ? 1 : 0);
        this.dummy.position.set(x, surface(x, z) + .004, z); this.dummy.rotation.set(.1 * Math.sin(id), angle, .1 * Math.cos(id));
        const height = .035 + seed(id + 1102) * .06; this.dummy.scale.set(height * .23 * scale, height * scale, height * scale);
        this.dummy.updateMatrix(); this.grass.setMatrixAt(blade, this.dummy.matrix);
        this.color.setHSL(.17 + seed(id + 831) * .045, .25 + seed(id + 95) * .18, .25 + seed(id + 709) * .18); this.grass.setColorAt(blade++, this.color);
      }
      if (site.index % 4 === 0) {
        const sample = seedDispersal(site.index, frame.ecology.p, [site.x, site.y + .003, site.z], surface);
        const size = sample.visible && settings.chapter === 'life' && site.cover < .1 ? sample.size : 0;
        this.dummy.position.set(...sample.position); this.dummy.rotation.set(.2, sample.angle, .1);
        this.dummy.scale.set(size * .24, size * .17, size); this.dummy.updateMatrix(); this.seeds.setMatrixAt(seedIndex++, this.dummy.matrix);
      }
    }
    this.grass.instanceMatrix.needsUpdate = this.seeds.instanceMatrix.needsUpdate = true;
    if (this.grass.instanceColor) this.grass.instanceColor.needsUpdate = true;
    this.prior.visible = this.view === 'section' && frame.land.erosion > 0;
    this.canvas.dataset.progress = frame.p.toFixed(4); this.canvas.dataset.chapter = settings.chapter;
    this.canvas.dataset.deposits = String(frame.land.deposits.filter(d => d.growth > 0).length);
    this.canvas.dataset.growth = frame.land.growth.toFixed(4); this.render();
  }
  setView(view: HistoryView, animate = true) {
    if (this.disposed) return;
    this.view = view; this.framing = this.fit(); const section = view === 'section';
    for (const material of [this.groundMaterial, ...this.flowStyles.map(style => style.material)]) {
      material.clippingPlanes = section ? [this.cut] : []; material.needsUpdate = true;
    }
    this.farGround.visible = !section; this.geology.visible = section;
    this.controls.minAzimuthAngle = section ? -.24 : -Infinity; this.controls.maxAzimuthAngle = section ? .24 : Infinity;
    this.controls.minPolarAngle = .15; this.controls.maxPolarAngle = Math.PI * .485;
    this.controls.minDistance = view === 'vent' ? .65 : 5; this.controls.maxDistance = 55 * this.framing;
    this.canvas.dataset.projection = view; this.draw(this.frame.p, this.settings); this.moveCamera(animate);
  }
  private fit() {
    const section = this.view === 'section';
    const floor = this.kind === 'shield' ? section ? .46 : .53 : section ? .56 : .65;
    const whole = Math.max(floor, (section ? 1.33 : 1.45) / this.camera.aspect);
    // A portrait cutaway inspects the central intrusive system. Fitting the
    // entire broad basement into that width would make every feature tiny.
    return section ? THREE.MathUtils.lerp(.8, whole, THREE.MathUtils.smoothstep(this.camera.aspect, .8, 1.2)) : whole;
  }
  private pose() {
    const shield = this.kind === 'shield', f = this.framing;
    if (this.view === 'vent') {
      const x = this.settings.chapter === 'life' ? (shield ? 3.1 : 2.0) : 0, z = this.settings.chapter === 'life' ? 1.6 : 0;
      const y = historyHeight(x, z, this.kind, this.frame.land.growth, this.frame.land.erosion);
      const target = new THREE.Vector3(x, y + .15, z);
      return { target, position: target.clone().add(new THREE.Vector3(1.1, 1.7, 2.3).multiplyScalar(f)) };
    }
    const target = new THREE.Vector3(0, this.view === 'section' ? -.1 : shield ? .55 : 1.15, 0);
    const offset = this.view === 'section' ? new THREE.Vector3(.7, 3.0, 23) : shield ? new THREE.Vector3(9, 8, 17) : new THREE.Vector3(8.5, 7.5, 15);
    return { target, position: target.clone().add(offset.multiplyScalar(f)) };
  }
  private moveCamera(animate: boolean) {
    this.stopMotion(); const pose = this.pose(), from = this.camera.position.clone(), target = this.controls.target.clone();
    this.cancelCamera = animateValue({ from: 0, to: 1, duration: animate ? 420 : 0, onUpdate: p => {
      this.camera.position.lerpVectors(from, pose.position, p); this.controls.target.lerpVectors(target, pose.target, p); this.controls.update(); this.render();
    } });
  }
  resetCamera() { this.moveCamera(true); }
  stopMotion = () => { this.cancelCamera(); this.cancelCamera = () => {}; };
  private resize = () => {
    if (this.disposed) return;
    const rect = this.canvas.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return;
    this.renderer.setSize(rect.width, rect.height, false); this.camera.aspect = rect.width / rect.height; this.camera.updateProjectionMatrix();
    const previous = this.framing; this.framing = this.fit();
    if (!this.hasSize) { this.hasSize = true; this.moveCamera(false); }
    else if (Math.abs(previous - this.framing) > .001) {
      this.stopMotion(); this.camera.position.sub(this.controls.target).multiplyScalar(this.framing / previous).add(this.controls.target); this.controls.update();
    }
    this.controls.maxDistance = 55 * this.framing; this.render();
  };
  private render = () => {
    if (this.disposed || !this.hasSize) return;
    this.seeds.visible = this.view === 'vent'; this.renderer.render(this.scene, this.camera);
  };
  private keydown = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
    event.preventDefault(); this.stopMotion(); if (event.key === 'Home') { this.resetCamera(); return; }
    const p = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    if (event.key === 'ArrowLeft') p.theta -= .12; if (event.key === 'ArrowRight') p.theta += .12;
    if (event.key === 'ArrowUp') p.phi -= .1; if (event.key === 'ArrowDown') p.phi += .1;
    if (event.key === '+' || event.key === '=') p.radius *= .9; if (event.key === '-') p.radius /= .9;
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(p)); this.controls.update(); this.render();
  };
  dispose() {
    if (this.disposed) return; this.disposed = true; this.stopMotion(); this.observer.disconnect(); this.controls.dispose();
    this.canvas.removeEventListener('keydown', this.keydown); this.grass.dispose(); this.seeds.dispose();
    for (const buffer of this.geometries) buffer.dispose(); for (const material of this.materials) material.dispose();
    this.field.dispose(); this.grain.dispose(); this.scene.clear(); this.renderer.dispose(); this.renderer.forceContextLoss();
    this.geometries.clear(); this.materials.clear();
  }
}

/** SVG remains an explicit fallback, retaining the same authored clocks. */
export class LandHistoryScene {
  private element: HTMLCanvasElement | SVGSVGElement;
  private gpu?: LandHistory3D;
  private p = .08;
  private settings: DrawSettings = DEFAULTS;
  private view: HistoryView = 'landscape';
  private disposed = false;
  constructor(canvas: HTMLCanvasElement, private kind: Landform) { this.element = canvas; this.mount3D(); }
  private mount3D() {
    const canvas = document.createElement('canvas');
    for (const attr of this.element.attributes) if (!attr.name.startsWith('data-') && attr.name !== 'style' && attr.name !== 'viewBox') canvas.setAttribute(attr.name, attr.value);
    try {
      this.gpu = new LandHistory3D(canvas, this.kind); this.element.replaceWith(canvas); this.element = canvas;
      canvas.addEventListener('webglcontextlost', this.contextLost); this.gpu.draw(this.p, this.settings); this.gpu.setView(this.view, false);
      canvas.dispatchEvent(new CustomEvent('volcano-renderer', { bubbles: true }));
    } catch (error) { this.gpu?.dispose(); this.gpu = undefined; console.warn('Land history 3D unavailable; using the teaching illustration.', error); this.fallback(); }
  }
  private fallback() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const attr of this.element.attributes) if (!attr.name.startsWith('data-') && attr.name !== 'style') svg.setAttribute(attr.name, attr.value);
    svg.dataset.renderer = 'svg'; this.element.replaceWith(svg); this.element = svg; this.draw(this.p, this.settings);
    svg.dispatchEvent(new CustomEvent('volcano-renderer', { bubbles: true }));
  }
  private contextLost = (event: Event) => {
    event.preventDefault(); if (this.disposed) return;
    this.element.removeEventListener('webglcontextlost', this.contextLost); this.gpu?.dispose(); this.gpu = undefined; this.fallback();
  };
  get is3D() { return !!this.gpu; }
  draw(progress: number, settings: DrawSettings) {
    if (this.disposed) return; this.p = progress; this.settings = settings;
    if (this.gpu) { this.gpu.draw(progress, settings); return; }
    this.element.setAttribute('viewBox', landCamera(this.view, this.kind, settings.chapter === 'life' ? 1 : progress).join(' '));
    this.element.innerHTML = settings.chapter === 'life' ? ecologyMarkup(this.kind, historyFrame(progress, 'life', settings.aftermath, settings.habitat).ecology)
      : landscapeMarkup(this.kind, progress, settings.aftermath, this.view === 'section' ? 1 : 0);
    this.element.dataset.progress = progress.toFixed(4); this.element.dataset.projection = this.view; this.element.dataset.chapter = settings.chapter;
  }
  setView(view: HistoryView) { if (!this.disposed) { this.view = view; this.gpu?.setView(view); if (!this.gpu) this.draw(this.p, this.settings); } }
  resetCamera() { this.gpu?.resetCamera(); }
  stopMotion() { this.gpu?.stopMotion(); }
  retry3D() { if (!this.disposed && !this.gpu) this.mount3D(); }
  dispose() { if (this.disposed) return; this.disposed = true; this.element.removeEventListener('webglcontextlost', this.contextLost); this.gpu?.dispose(); this.gpu = undefined; }
}
