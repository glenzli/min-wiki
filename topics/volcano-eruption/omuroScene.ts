import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { animateValue } from '../../src/visuals/transition.ts';
import type { Habitat } from './ecologyModel.ts';
import { seed } from './magmaGeometry.ts';
import { smooth } from './model.ts';
import { omuroFrame, OMURO_SITES, type OmuroFrame, type OmuroMode } from './omuroJourney.ts';
import { OMURO_BLADES_PER_SITE, OMURO_CLAST_COUNT, OMURO_FIELD_SIZE, OMURO_GROUND_RADIUS, OmuroFieldProjection, omuroBlade, omuroClast, omuroCoverAt, omuroFootprint, omuroNormal, omuroPatches, omuroSection, omuroSeed, omuroSurface, omuroSurroundings, omuroTerrain } from './omuroGeometry.ts';
import { omuroClastMaterial, omuroGrassMaterial, omuroGroundMaterial, omuroSkyMaterial, omuroTextures } from './omuroMaterials.ts';

export type OmuroView = 'landscape' | 'vent' | 'section';
type Buffers = { positions: number[]; uvs: number[]; indices: number[] };
function geometry(data: Buffers) {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
  result.setIndex(data.indices); result.computeVertexNormals(); return result;
}
function replacePositions(target: THREE.BufferGeometry, data: number[]) {
  const position = target.getAttribute('position') as THREE.BufferAttribute;
  (position.array as Float32Array).set(data); position.needsUpdate = true;
  target.computeVertexNormals(); target.computeBoundingSphere();
}
function bladeGeometry() {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
  for (let i = 0; i <= 5; i++) {
    const p = i / 5, width = (1 - p) * (.88 + .16 * Math.sin(p * Math.PI));
    const bend = p * p * .48;
    positions.push(bend - width * .5, p, p * p * .13, bend + width * .5, p, p * p * .13);
    uvs.push(0, p, 1, p);
    if (i < 5) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  return geometry({ positions, indices, uvs });
}

function sectionFocus(growth = 1) {
  const x = 2.7 * omuroFootprint(growth);
  return new THREE.Vector3(x, omuroSurface(x, 0, growth) - .075, 0);
}
function lensScale(view: OmuroView, aspect: number) {
  return Math.max(1, (view === 'section' ? .8 : 1.25) / aspect);
}
function sectionFace(growth = 1) {
  const data = omuroSection(growth);
  // The old shallow lower edge made the cut float above a visible void. This
  // support face continues below the local lens, not a measured geological base.
  for (let i = 1; i < data.positions.length; i += 6) data.positions[i] = -2.4;
  return data;
}
function cameraPose(view: OmuroView, scale = 1, growth = 1) {
  if (view === 'section') {
    const target = sectionFocus(growth);
    return { target, position: target.clone().add(new THREE.Vector3(.05, .27, .95).multiplyScalar(scale)) };
  }
  const target = view === 'vent' ? new THREE.Vector3(0, 1.7, 0) : new THREE.Vector3(0, .78, 0);
  const position = view === 'vent' ? new THREE.Vector3(3.4, 7.1, 6.7)
    : growth < 1 ? new THREE.Vector3(9.7, 8.0, 11.0) : new THREE.Vector3(5.5, 8.0, 6.2);
  position.sub(target).multiplyScalar(scale).add(target);
  return { position, target };
}

/** Projection, gestures and resource lifetime only. Scientific time belongs to
 * the supplied journey/ecology state; the renderer never starts its own clock. */
export class Omuro3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1.5, .08, 180);
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private textures = omuroTextures();
  private surfaceStyle = omuroGroundMaterial(this.textures.grain, this.textures.field);
  private surroundingsStyle = omuroGroundMaterial(this.textures.grain, this.textures.field);
  private sectionStyle = omuroGroundMaterial(this.textures.grain, this.textures.field, true);
  private cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private terrain: THREE.Mesh;
  private surroundings: THREE.Mesh;
  private section: THREE.Mesh;
  private grass: THREE.InstancedMesh;
  private rocks: THREE.InstancedMesh;
  private seeds: THREE.InstancedMesh;
  private deposits: THREE.InstancedMesh;
  private depositHeat = new THREE.InstancedBufferAttribute(new Float32Array(OMURO_CLAST_COUNT), 1);
  private vent: THREE.Mesh;
  private ventRim: THREE.Mesh;
  private roots: THREE.InstancedMesh;
  private soilSkin: THREE.Mesh;
  private warmLight = new THREE.PointLight('#a23a24', 0, 1.2, 2);
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private frame = omuroFrame(1);
  private fieldProjection = new OmuroFieldProjection();
  private lastFrameKey = '';
  private view: OmuroView = 'landscape';
  private disposed = false;
  private lastGrowth = -1;
  private sectionGrowth = 1;
  private hasSize = false;
  private framingScale = 1;
  private cancelCamera = () => {};

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(max-width: 720px)').matches ? 1.3 : 1.7));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1;
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    canvas.dataset.renderer = 'webgl';
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false; this.controls.enablePan = false;
    this.controls.minDistance = 3.6; this.controls.maxDistance = 38;
    this.controls.minPolarAngle = .12; this.controls.maxPolarAngle = Math.PI * .485;
    this.controls.addEventListener('change', this.render);
    this.controls.addEventListener('start', this.stopMotion);
    canvas.addEventListener('keydown', this.keydown);

    this.scene.fog = new THREE.Fog('#cad4cb', 25, 85);
    this.scene.add(this.mesh(new THREE.SphereGeometry(100, 24, 14), omuroSkyMaterial()));
    this.scene.add(new THREE.HemisphereLight('#d2e6ec', '#67523a', .9));
    const sun = new THREE.DirectionalLight('#fff0d5', 2.3); sun.position.set(-7, 8, 10);
    sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 38;
    sun.shadow.normalBias = .018; sun.shadow.bias = -.00016;
    this.scene.add(sun, this.warmLight);
    const fill = new THREE.DirectionalLight('#c6dded', .24); fill.position.set(8, 5, -8); this.scene.add(fill);
    this.surroundings = this.mesh(geometry(omuroSurroundings()), this.surroundingsStyle.material);
    this.surroundings.receiveShadow = true; this.scene.add(this.surroundings);
    this.terrain = this.mesh(geometry(omuroTerrain()), this.surfaceStyle.material);
    this.terrain.castShadow = this.terrain.receiveShadow = true;
    this.section = this.mesh(geometry(sectionFace()), this.sectionStyle.material); this.section.receiveShadow = true;
    this.grass = this.instances(bladeGeometry(), omuroGrassMaterial(), OMURO_SITES.length * OMURO_BLADES_PER_SITE);
    this.grass.castShadow = false; this.grass.receiveShadow = true;
    const stone = new THREE.MeshStandardMaterial({ color: '#675341', roughness: .96, bumpMap: this.textures.grain, bumpScale: .017 });
    this.rocks = this.instances(new THREE.IcosahedronGeometry(1, 1), stone, 360);
    this.rocks.castShadow = this.rocks.receiveShadow = true;
    const seedMaterial = new THREE.MeshStandardMaterial({ color: '#aa946d', roughness: .94 });
    this.seeds = this.instances(new THREE.SphereGeometry(1, 6, 4), seedMaterial, 25);
    this.deposits = this.instances(new THREE.IcosahedronGeometry(1, 0), omuroClastMaterial(), OMURO_CLAST_COUNT);
    this.deposits.geometry.setAttribute('aOmuroHeat', this.depositHeat);
    this.deposits.castShadow = true;
    this.vent = this.mesh(new THREE.CircleGeometry(.16, 28), new THREE.MeshStandardMaterial({ color: '#3b211a',
      emissive: '#8b2814', emissiveIntensity: .35, roughness: 1, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.ventRim = this.mesh(new THREE.TorusGeometry(.20, .038, 6, 32), new THREE.MeshStandardMaterial({
      color: '#3e3028', roughness: 1, transparent: true, depthWrite: false }));
    this.vent.rotation.x = this.ventRim.rotation.x = -Math.PI / 2;
    this.roots = this.instances(new THREE.CylinderGeometry(1, 1, 1, 4, 1), new THREE.MeshStandardMaterial({ color: '#bfac79', roughness: 1 }), 128);
    this.soilSkin = this.mesh(geometry(omuroSection(1, 192)), new THREE.MeshStandardMaterial({ color: '#60472e', roughness: 1, side: THREE.DoubleSide }));
    for (let i = 0; i < this.grass.count; i++) {
      const amount = seed(i + 541);
      this.color.set('#4b6436').lerp(new THREE.Color('#8c925f'), amount * .42);
      this.grass.setColorAt(i, this.color);
    }
    if (this.grass.instanceColor) this.grass.instanceColor.needsUpdate = true;
    this.scene.add(this.terrain, this.section, this.grass, this.rocks, this.seeds, this.deposits, this.vent, this.ventRim, this.roots, this.soilSkin);
    this.observer = new ResizeObserver(this.resize); this.observer.observe(canvas);
    this.setView('landscape', false); this.resize(); this.draw(1, 'wet', 'journey');
  }
  private mesh(buffer: THREE.BufferGeometry, material: THREE.Material) {
    this.geometries.add(buffer); this.materials.add(material); return new THREE.Mesh(buffer, material);
  }
  private instances(buffer: THREE.BufferGeometry, material: THREE.Material, count: number) {
    this.geometries.add(buffer); this.materials.add(material);
    const mesh = new THREE.InstancedMesh(buffer, material, count);
    mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return mesh;
  }
  private instance(mesh: THREE.InstancedMesh, index: number, position: number[], scale: number[], angle = 0) {
    this.dummy.position.set(position[0], position[1], position[2]); this.dummy.rotation.set(0, angle, 0);
    this.dummy.scale.set(scale[0], scale[1], scale[2]); this.dummy.updateMatrix(); mesh.setMatrixAt(index, this.dummy.matrix);
  }
  private sectionDetail(frame: OmuroFrame, patches: ReturnType<typeof omuroPatches>) {
    const skin: number[] = [];
    for (let i = 0; i <= 192; i++) {
      const x = -OMURO_GROUND_RADIUS + i / 192 * OMURO_GROUND_RADIUS * 2;
      const soil = omuroCoverAt(x, 0, patches).soil, top = omuroSurface(x, 0, frame.landGrowth);
      skin.push(x, top - soil * .028, .004, x, top + soil * .005, .004);
    }
    replacePositions(this.soilSkin.geometry, skin);
    let roots = 0;
    for (let i = 0; i < 32; i++) {
      const x = -4.7 + i / 31 * 9.4, local = omuroCoverAt(x, 0, patches);
      const top = omuroSurface(x, 0, frame.landGrowth) - .006;
      for (let j = 0; j < 4; j++) {
        const depth = (.055 + seed(i * 4 + j + 14) * .12) * local.cover;
        this.dummy.position.set(x + (j - 1.5) * .018, top - depth / 2, .008);
        this.dummy.rotation.set(0, 0, (j - 1.5) * .2);
        this.dummy.scale.set(.0025 * local.cover, depth, .0025 * local.cover);
        this.dummy.updateMatrix(); this.roots.setMatrixAt(roots++, this.dummy.matrix);
      }
    }
    this.roots.instanceMatrix.needsUpdate = true;
  }
  draw(progress: number, habitat: Habitat, mode: OmuroMode) {
    if (this.disposed) return;
    const frame = omuroFrame(progress, habitat, mode);
    const frameKey = `${frame.p}:${habitat}:${mode}:${this.view}`;
    if (frameKey === this.lastFrameKey) return;
    const enteringFormation = mode === 'journey' && frame.stage === 0 && this.frame.stage !== 0;
    this.frame = frame;
    const patches = omuroPatches(frame), footprint = omuroFootprint(frame.landGrowth);
    if (Math.abs(frame.landGrowth - this.lastGrowth) > 1e-8) {
      replacePositions(this.terrain.geometry, omuroTerrain(frame.landGrowth).positions);
      replacePositions(this.section.geometry, sectionFace(frame.landGrowth).positions);
      this.lastGrowth = frame.landGrowth;
    }
    const field = this.textures.field.image.data as Uint8Array;
    if (this.fieldProjection.update(patches, field)) this.textures.field.needsUpdate = true;
    this.surfaceStyle.cooling.value = this.sectionStyle.cooling.value = 1 - frame.heat;
    this.surfaceStyle.footprint.value = this.surroundingsStyle.footprint.value = footprint;
    this.surfaceStyle.burial.value = frame.ecology.burial;
    this.sectionStyle.burial.value = 0;
    const section = this.view === 'section';
    // Ground cover is the site-owned turf field. Individual leaves belong only
    // to the accepted local cut lens; no enlarged tufts stand over the cone.
    this.grass.count = section && frame.ecology.vegetation > 0 ? OMURO_SITES.length * OMURO_BLADES_PER_SITE : 0;
    if (this.grass.count) {
      (this.grass.instanceMatrix.array as Float32Array).fill(0);
      for (const patch of patches) if (patch.cover > 0) for (let i = 0; i < OMURO_BLADES_PER_SITE; i++) {
        const blade = omuroBlade(patch.site, i, frame), visible = blade.position[2] <= 0;
        this.instance(this.grass, blade.id, blade.position, visible ? [blade.width, blade.height, blade.width] : [0, 0, 0], blade.angle);
      }
      this.grass.instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < this.rocks.count; i++) {
      const a = seed(i + 149) * Math.PI * 2, radius = .25 + Math.sqrt(seed(i + 918)) * 5;
      const x = radius * Math.cos(a), z = radius * Math.sin(a), cover = omuroCoverAt(x, z, patches).cover;
      const size = (.013 + Math.pow(seed(i + 714), 3) * .075) * smooth(.95, 1, frame.landGrowth) * (1 - cover * .7);
      this.instance(this.rocks, i, [x, omuroSurface(x, z, frame.landGrowth) + size * .2, z], section && z > 0 ? [0, 0, 0] : [size * 1.5, size * .6, size], a);
    }
    this.rocks.instanceMatrix.needsUpdate = true;
    OMURO_SITES.filter(site => site.index % 4 === 0).forEach((site, i) => {
      const sample = omuroSeed(site, frame), size = sample.visible && (!section || sample.position[2] <= 0) ? sample.size : 0;
      const normal = new THREE.Vector3(...omuroNormal(sample.position[0], sample.position[2], frame.landGrowth));
      this.dummy.position.set(...sample.position).addScaledVector(normal, size * .17);
      this.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      this.dummy.rotateY(sample.angle); this.dummy.scale.set(size * .24, size * .17, size);
      this.dummy.updateMatrix(); this.seeds.setMatrixAt(i, this.dummy.matrix);
    });
    this.seeds.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < this.deposits.count; i++) {
      const sample = omuroClast(i, frame.p);
      const cover = sample.settled ? omuroCoverAt(sample.position[0], sample.position[2], patches).cover : 0;
      const size = mode === 'journey' && sample.visible && (!section || sample.position[2] <= 0) ? sample.size * sample.displayScale * (1 - cover * .85) : 0;
      this.instance(this.deposits, i, sample.position, [size, size * 1.15, size], sample.angle);
      this.color.set('#45362d').lerp(new THREE.Color('#813b28'), sample.heat);
      this.deposits.setColorAt(i, this.color); this.depositHeat.setX(i, sample.heat);
    }
    this.deposits.instanceMatrix.needsUpdate = true;
    if (this.deposits.instanceColor) this.deposits.instanceColor.needsUpdate = true;
    this.depositHeat.needsUpdate = true;
    if (section) this.sectionDetail(frame, patches);
    const ventOpacity = mode === 'journey' ? 1 - smooth(.32, .46, frame.p) : 0;
    this.vent.position.set(0, omuroSurface(0, 0, frame.landGrowth) + .016, 0);
    this.ventRim.position.copy(this.vent.position); this.ventRim.position.y += .015;
    (this.vent.material as THREE.MeshStandardMaterial).opacity = ventOpacity;
    (this.vent.material as THREE.MeshStandardMaterial).emissiveIntensity = frame.heat * .35;
    (this.ventRim.material as THREE.MeshStandardMaterial).opacity = ventOpacity;
    this.vent.visible = this.ventRim.visible = ventOpacity > 0 && !section;
    this.warmLight.position.copy(this.vent.position).add(new THREE.Vector3(0, .12, 0));
    this.warmLight.intensity = ventOpacity * frame.heat * .24;
    this.controls.minDistance = section ? .45 : this.view === 'landscape' && frame.landGrowth < 1 ? 10 * this.framingScale : 3.6;
    this.canvas.dataset.progress = frame.p.toFixed(4); this.canvas.dataset.journeyStage = String(frame.stage);
    this.canvas.dataset.ecologyProgress = frame.ecology.p.toFixed(4);
    this.canvas.dataset.habitat = habitat; this.canvas.dataset.mode = mode;
    if (section && Math.abs(frame.landGrowth - this.sectionGrowth) > 1e-8) {
      const previous = sectionFocus(this.sectionGrowth), next = sectionFocus(frame.landGrowth);
      this.sectionGrowth = frame.landGrowth;
      this.stopMotion();
      if (this.controls.target.distanceTo(previous) < .35) {
        const delta = next.sub(previous);
        this.controls.target.add(delta); this.camera.position.add(delta); this.controls.update();
      } else this.moveCamera(false);
    }
    // Replay/legacy entry receives its formation pose after the new frame is
    // known. Progress changes inside the phase preserve the reader's orbit.
    if (enteringFormation && this.view === 'landscape') this.moveCamera(false);
    this.lastFrameKey = frameKey; this.renderer.shadowMap.needsUpdate = true; this.render();
  }
  setView(view: OmuroView, animate = true) {
    if (this.disposed) return;
    const changed = this.view !== view; this.view = view;
    const section = view === 'section';
    this.framingScale = lensScale(view, this.camera.aspect);
    this.surfaceStyle.material.clippingPlanes = section ? [this.cut] : [];
    this.surfaceStyle.material.clipShadows = section;
    this.surfaceStyle.material.needsUpdate = true;
    this.section.visible = this.roots.visible = this.soilSkin.visible = section;
    this.surroundings.visible = !section;
    this.controls.minAzimuthAngle = section ? -.24 : -Infinity;
    this.controls.maxAzimuthAngle = section ? .24 : Infinity;
    this.controls.minPolarAngle = section ? .8 : .12;
    this.controls.maxPolarAngle = section ? 1.48 : Math.PI * .485;
    this.controls.minDistance = section ? .45 : 3.6;
    this.controls.maxDistance = (section ? 2.4 : 38) * this.framingScale;
    if (section && changed) this.sectionGrowth = this.frame.landGrowth;
    this.canvas.dataset.projection = view;
    if (changed) this.draw(this.frame.p, this.frame.ecology.habitat, this.frame.mode);
    this.moveCamera(animate);
  }
  private moveCamera(animate: boolean) {
    this.stopMotion();
    const pose = cameraPose(this.view, this.framingScale, this.frame.landGrowth), from = this.camera.position.clone(), target = this.controls.target.clone();
    this.cancelCamera = animateValue({ from: 0, to: 1, duration: animate ? 440 : 0, onUpdate: t => {
      this.camera.position.lerpVectors(from, pose.position, t); this.controls.target.lerpVectors(target, pose.target, t);
      this.controls.update(); this.render();
    } });
  }
  resetCamera() { if (!this.disposed) this.moveCamera(true); }
  stopMotion = () => { this.cancelCamera(); this.cancelCamera = () => {}; };
  private resize = () => {
    if (this.disposed) return;
    const rect = this.canvas.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return;
    this.renderer.setSize(rect.width, rect.height, false); this.camera.aspect = rect.width / rect.height;
    const scale = lensScale(this.view, this.camera.aspect), previous = this.framingScale;
    this.framingScale = scale; this.camera.updateProjectionMatrix();
    if (!this.hasSize) { this.hasSize = true; this.moveCamera(false); }
    else if (Math.abs(previous - scale) > .001) {
      this.stopMotion(); this.camera.position.sub(this.controls.target).multiplyScalar(scale / previous).add(this.controls.target);
      this.controls.update();
    }
    this.controls.maxDistance = (this.view === 'section' ? 2.4 : 38) * scale; this.render();
  };
  private render = () => {
    if (this.disposed || !this.hasSize) return;
    // Seed bodies are legible only in a local ecological inspection. The
    // whole-mountain story does not magnify parcels to keep them on screen.
    this.seeds.visible = this.view === 'section' || this.camera.position.distanceTo(this.controls.target) < 4.1;
    this.grass.visible = this.view === 'section';
    this.renderer.render(this.scene, this.camera);
  };
  private keydown = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
    event.preventDefault(); this.stopMotion();
    if (event.key === 'Home') { this.resetCamera(); return; }
    const spherical = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    if (event.key === 'ArrowLeft') spherical.theta -= .12;
    if (event.key === 'ArrowRight') spherical.theta += .12;
    if (event.key === 'ArrowUp') spherical.phi -= .1;
    if (event.key === 'ArrowDown') spherical.phi += .1;
    if (event.key === '+' || event.key === '=') spherical.radius *= .9;
    if (event.key === '-') spherical.radius /= .9;
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    this.controls.update(); this.render();
  };
  dispose() {
    if (this.disposed) return;
    this.stopMotion(); this.disposed = true; this.observer.disconnect(); this.controls.dispose();
    this.canvas.removeEventListener('keydown', this.keydown);
    for (const object of [this.grass, this.rocks, this.seeds, this.deposits, this.roots]) object.dispose();
    for (const buffer of this.geometries) buffer.dispose();
    for (const material of this.materials) material.dispose();
    this.textures.field.dispose(); this.textures.grain.dispose();
    this.fieldProjection.dispose();
    this.scene.clear(); this.renderer.dispose(); this.renderer.forceContextLoss();
    this.geometries.clear(); this.materials.clear();
  }
}

/** A CPU projection of the same surface and patch field preserves navigation
 * and causal state if WebGL is unavailable. Camera gestures remain 3D-only. */
class OmuroFallback {
  private context: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private frame = omuroFrame(1);
  private view: OmuroView = 'landscape';
  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d'); if (!context) throw new Error('Omuro canvas unavailable');
    this.context = context; this.observer = new ResizeObserver(this.render); this.observer.observe(canvas);
  }
  draw(p: number, habitat: Habitat, mode: OmuroMode) { this.frame = omuroFrame(p, habitat, mode); this.render(); }
  setView(view: OmuroView) { this.view = view; this.render(); }
  stopMotion() {}
  private render = () => {
    const rect = this.canvas.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.5), width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const ctx = this.context, sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#a9c6d4'); sky.addColorStop(1, '#d6dbc0'); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    const camera = new THREE.PerspectiveCamera(36, width / height, .08, 180), pose = cameraPose(this.view, lensScale(this.view, width / height), this.frame.landGrowth);
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    const data = omuroTerrain(this.frame.landGrowth, 32, 80), patches = omuroPatches(this.frame);
    const vertices = Array.from({ length: data.positions.length / 3 }, (_, i) => {
      const point = new THREE.Vector3(...data.positions.slice(i * 3, i * 3 + 3) as [number, number, number]);
      const projected = point.clone().project(camera);
      return { point, x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2, depth: projected.z };
    });
    const faces = [];
    for (let i = 0; i < data.indices.length; i += 3) {
      const points = data.indices.slice(i, i + 3).map(index => vertices[index]);
      if (this.view === 'section' && points.some(v => v.point.z > .001)) continue;
      faces.push({ points, depth: points.reduce((s, v) => s + v.depth, 0) / 3 });
    }
    faces.sort((a, b) => b.depth - a.depth);
    for (const { points } of faces) {
      const center = points.reduce((sum, v) => sum.add(v.point), new THREE.Vector3()).multiplyScalar(1 / 3);
      const normal = omuroNormal(center.x, center.z, this.frame.landGrowth), field = omuroCoverAt(center.x, center.z, patches);
      const shade = .65 + .35 * Math.max(0, normal[0] * -.45 + normal[1] * .8 + normal[2] * .35);
      const rock = [112, 89, 64], green = [113, 139, 63];
      const rgb = rock.map((value, i) => Math.round((value + (green[i] - value) * field.cover) * shade));
      ctx.fillStyle = `rgb(${rgb})`; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[1].x, points[1].y); ctx.lineTo(points[2].x, points[2].y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    this.canvas.dataset.progress = this.frame.p.toFixed(4); this.canvas.dataset.journeyStage = String(this.frame.stage);
    this.canvas.dataset.projection = this.view;
  };
  dispose() { this.observer.disconnect(); }
}

/** Retains progress, habitat and lens through GPU loss or retry. Canvas cloning
 * is required when switching between WebGL and a Canvas2D context. */
export class OmuroScene {
  private scene!: Omuro3D | OmuroFallback;
  private canvas: HTMLCanvasElement;
  private p = 1;
  private habitat: Habitat = 'wet';
  private mode: OmuroMode = 'journey';
  private view: OmuroView = 'landscape';
  private disposed = false;
  constructor(canvas: HTMLCanvasElement) { this.canvas = canvas; this.mount3D(); }
  private replacement() {
    const canvas = this.canvas.cloneNode(false) as HTMLCanvasElement;
    canvas.removeAttribute('style'); canvas.removeAttribute('data-renderer'); return canvas;
  }
  private mount3D() {
    const candidate = this.replacement(); let gpu: Omuro3D | undefined;
    try {
      gpu = new Omuro3D(candidate); this.scene = gpu;
      this.canvas.replaceWith(candidate); this.canvas = candidate;
      candidate.addEventListener('webglcontextlost', this.contextLost);
      this.scene.setView(this.view); this.scene.draw(this.p, this.habitat, this.mode);
      candidate.dispatchEvent(new CustomEvent('volcano-renderer', { bubbles: true, detail: 'webgl' }));
    } catch (error) {
      gpu?.dispose(); console.warn('Omuro 3D unavailable; using the same mountain as a Canvas illustration.', error);
      this.mountFallback();
    }
  }
  private mountFallback() {
    const candidate = this.replacement(); candidate.dataset.renderer = 'canvas';
    this.canvas.replaceWith(candidate); this.canvas = candidate; this.scene = new OmuroFallback(candidate);
    this.scene.setView(this.view); this.scene.draw(this.p, this.habitat, this.mode);
    candidate.dispatchEvent(new CustomEvent('volcano-renderer', { bubbles: true, detail: 'canvas' }));
  }
  private contextLost = (event: Event) => {
    event.preventDefault(); if (this.disposed) return;
    this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.scene.dispose(); this.mountFallback();
  };
  get is3D() { return this.scene instanceof Omuro3D; }
  retry3D() { if (!this.disposed && !this.is3D) { this.scene.dispose(); this.mount3D(); } }
  draw(progress: number, habitat: Habitat = 'wet', mode: OmuroMode = 'journey') {
    if (this.disposed) return;
    this.p = progress; this.habitat = habitat; this.mode = mode; this.scene.draw(progress, habitat, mode);
  }
  setView(view: OmuroView) { if (!this.disposed) { this.view = view; this.scene.setView(view); } }
  resetCamera() { if (this.scene instanceof Omuro3D) this.scene.resetCamera(); }
  stopMotion() { this.scene.stopMotion(); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.scene.dispose();
  }
}
