import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { animateValue } from '../../src/visuals/transition.ts';
import { dike, seed, STORAGE } from './magmaGeometry.ts';
import { eruptionAppearance, lavaThermalState, supplyPerVent, ventPositions, type ObservationView, type Settings } from './model.ts';
import { ashComposite, ashMaterial, lavaMaterial, rockMaterial, rockTexture, skyMaterial, storageMaterial, transportMaterial } from './eruptionMaterials.ts';
import { craterBasin, craterLevel, eruptionFrame, fragmentSchedule, lavaBranches, lavaRibbon, RetainedLavaRibbon, ROCK_BOTTOM, sectionPoint, surfaceHeight, terrainBuffers, WORLD_SCALE, type XYZ, type Fragment } from './eruptionGeometry.ts';
import { feederCenterline, intrusionSolid, SECTION_UNITS, storageComplex, stratumSolid } from './sectionGeometry.ts';
import { MagmaDetailMotion, type DetailMotionState } from './magmaMotion.ts';
import { MeltTransport } from './meltTransport.ts';
import { Ejecta3D, fountainMaterial } from './ejecta3d.ts';
import { EruptionEnvironment3D } from './eruptionEnvironment3d.ts';
import {FrameRender} from '../../src/visuals/frameRender.ts';

interface MeltLayer { mesh: THREE.Mesh; transport: MeltTransport; mobility: number; domain: 'surface' | 'intrusion' }

const vector = (point: XYZ) => new THREE.Vector3(...point);
const JET_SIDES = 12;

/** Default inspection lens for a fixed lower-slope flow segment. The largest
 * same-style ribbon supplies the reference for both strength selections; no
 * geological clock or current liquid phase participates in this framing. */
export function flowCameraPose(settings: Settings, aspect: number, fov = 38) {
  const reference = { ...settings, strength: 1 }, branches = lavaBranches(reference);
  let branch = 0, score = -Infinity;
  branches.forEach((candidate, index) => {
    const value = candidate.share * 10 + Math.sin(candidate.angle) * .1;
    if (value > score) { score = value; branch = index; }
  });
  const flow = lavaRibbon(.84, reference, branches[branch]);
  const point = (row: number, across = 5) => vector(flow.positions.slice((row * 11 + across) * 3, (row * 11 + across) * 3 + 3) as XYZ);
  const anchor = point(63); anchor.y += .035;
  const along = point(66).sub(point(60)); along.y = 0; along.normalize();
  const bank = new THREE.Vector3(-along.z, 0, along.x);
  const direction = along.multiplyScalar(-.3).addScaledVector(bank, 1).add(new THREE.Vector3(0, 1.25, 0)).normalize();
  const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize(), up = direction.clone().cross(right).normalize();
  const tangent = Math.tan(THREE.MathUtils.degToRad(fov / 2)), ratio = Math.max(.35, Math.min(4, Number.isFinite(aspect) ? aspect : 1));
  let radius = 2.5;
  // This local run contains large-flow folds and the smaller flow's head.
  // Both cold banks and existing relief fit; summit/basement are excluded.
  for (let row = 52; row <= 74; row++) for (let j = 0; j <= 10; j++) for (const rise of [0, .115]) {
    const sample = point(row, j); sample.y += rise;
    const relative = sample.sub(anchor), x = relative.dot(right), y = relative.dot(up), depth = relative.dot(direction);
    radius = Math.max(radius, depth + Math.abs(x) / (tangent * ratio * .77),
      (y + .82 * tangent * depth) / (tangent * .6), (-y + .38 * tangent * depth) / (tangent * .6));
  }
  radius += .06;
  // Move the inspection above the existing lower caption/buttons without
  // changing the world-up direction or the physical flow surface.
  const target = anchor.addScaledVector(up, -radius * tangent * .22);
  return { target: target.toArray() as XYZ, position: target.clone().addScaledVector(direction, radius).toArray() as XYZ, radius, branch };
}

function buffers(data: { positions: number[]; uvs: number[]; indices: number[] }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
  geometry.setIndex(data.indices); geometry.computeVertexNormals(); return geometry;
}
/** A narrow tube used only for the surface fountain's molten jets. */
function sheet(points: XYZ[], radius: number, depth = radius * 2.2) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], sides = JET_SIDES;
  points.forEach(([x, y, z], i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length;
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2;
      positions.push(x + nx * Math.cos(angle) * radius, y + ny * Math.cos(angle) * radius, z + Math.sin(angle) * depth);
      uvs.push(i / Math.max(1, points.length - 1), j / sides);
      if (i < points.length - 1 && j < sides) {
        const k = i * (sides + 1) + j, next = k + sides + 1;
        indices.push(k, next, k + 1, k + 1, next, next + 1);
      }
    }
  });
  return buffers({ positions, uvs, indices });
}

/** One renderer owns GPU resources, camera gestures and finite camera moves.
 * Geological time comes only from the controller; liquid detail has its own
 * gated presentation phase; its bounded relief never changes geological products. */
export class Eruption3DScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1.5, .1, 200);
  private controls: OrbitControls;
  private resizeObserver: ResizeObserver;
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private texture = rockTexture();
  private cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private terrain = new THREE.Group();
  private section = new THREE.Group();
  private jets = new THREE.Group();
  private surfaceProducts = new THREE.Group();
  private rocks = new THREE.Group();
  private environment?: EruptionEnvironment3D;
  private ground: THREE.Mesh;
  private light = new THREE.PointLight('#ff7022', 0, 7, 2);
  private ash = ashMaterial();
  private ashScene = new THREE.Scene();
  private sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  private ashTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  private compositeScene = new THREE.Scene();
  private compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private bufferSize = new THREE.Vector2();
  private cloud: THREE.Mesh;
  private lava = lavaMaterial(this.texture);
  private pool = lavaMaterial(this.texture, true);
  private magma = storageMaterial(this.texture);
  private magmaPath = storageMaterial(this.texture, true);
  private surfaceTransport = transportMaterial();
  private intrusiveTransport = transportMaterial(false);
  private surfaceRock = rockMaterial(this.texture);
  private geology = [.25, .48, .72].map(facies => rockMaterial(this.texture, true, facies));
  private contactRock = rockMaterial(this.texture, true, .22);
  private storageLights = STORAGE.map(() => new THREE.PointLight('#ff641c', 0, 3.2, 2));
  private fountain = fountainMaterial();
  private fragments: Fragment[] = [];
  private ejecta = new Ejecta3D();
  private pond?: THREE.Mesh;
  private flows: THREE.Mesh[] = [];
  private flowSources:{retained:RetainedLavaRibbon;installed:ReturnType<RetainedLavaRibbon['sample']>['geometry']}[]=[];
  private dikes: { mesh: THREE.Mesh; points: XYZ[]; lastFront: number; layers: MeltLayer[] }[] = [];
  private moltenLayers: MeltLayer[] = [];
  private flowLayers: MeltLayer[] = [];
  private intrusiveMobility = 1;
  private p = .08;
  private settings: Settings = { vents: 1, gas: .8, viscosity: .2, supply: .75, resistance: .35, landform: 'scoria' };
  private key = '';
  private view: ObservationView = 'overview';
  private cutaway = true;
  private disposed = false;
  private hasSize = false;
  private framingScale = 1;
  private cancelCamera = () => {};
  private detailMotion: MagmaDetailMotion;
  private undergroundMobile = false;
  private surfaceMobile = false;
  private dummy = new THREE.Object3D();
  private presentation=new FrameRender(()=>this.renderNow());

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(max-width: 720px)').matches ? 1.25 : 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    canvas.dataset.renderer = 'webgl';
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false; this.controls.enablePan = false;
    this.controls.minDistance = 2.5; this.controls.maxDistance = 70;
    this.controls.minPolarAngle = .18; this.controls.maxPolarAngle = Math.PI * .49;
    this.controls.addEventListener('change', this.render);
    this.controls.addEventListener('start', this.stopMotion);
    canvas.addEventListener('keydown', this.keydown);

    for (const material of [this.lava.material, this.pool.material, this.magma.material, this.magmaPath.material, this.surfaceTransport.material, this.intrusiveTransport.material, this.surfaceRock, ...this.geology, this.contactRock, this.fountain.material, this.ash.material]) this.materials.add(material);
    this.contactRock.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), .22)];
    this.contactRock.clipShadows = true;
    this.sceneTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
    if(!this.renderer.extensions.has('EXT_color_buffer_float')) this.sceneTarget.texture.type=THREE.UnsignedByteType;
    this.sceneTarget.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.ashTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.ash.uniforms.uSceneDepth.value = this.sceneTarget.depthTexture;
    this.compositeScene.add(this.mesh(new THREE.PlaneGeometry(2, 2), ashComposite(this.sceneTarget.texture, this.ashTarget.texture)));
    const sky = this.mesh(new THREE.SphereGeometry(90, 24, 16), skyMaterial()); this.scene.add(sky);
    this.scene.fog = new THREE.FogExp2('#656b70', .012);
    this.scene.add(new THREE.HemisphereLight('#b4c9de', '#463a30', 1.2));
    const sun = new THREE.DirectionalLight('#ffdfb7', 2.8); sun.position.set(-8, 14, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -11; sun.shadow.camera.right = 11;
    sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -10; sun.shadow.camera.near = 1; sun.shadow.camera.far = 45;
    sun.shadow.normalBias = .035; sun.shadow.bias = -.00012; sun.shadow.radius = 3;
    this.scene.add(sun, this.light);
    const fill = new THREE.DirectionalLight('#a0b9d2', .65); fill.position.set(8, 6, -12); this.scene.add(fill);
    this.ground = this.mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshStandardMaterial({ color: '#343a3d', roughness: 1 }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true; this.scene.add(this.ground);
    this.cloud = this.mesh(new THREE.BoxGeometry(1, 1, 1), this.ash.material); this.cloud.renderOrder = 4;
    this.scene.add(this.terrain, this.section, this.jets, this.surfaceProducts, this.rocks);
    this.ashScene.add(this.cloud);
    this.scene.add(this.ejecta.group);
    for (const style of [this.magma, this.magmaPath, this.lava, this.pool]) style.detail.value = 1;
    this.resizeObserver = new ResizeObserver(this.resize); this.resizeObserver.observe(canvas);
    this.rebuild(); this.moveCamera(false); this.resize();
    this.detailMotion = new MagmaDetailMotion(this.updateLiquidPhase, this.publishDetailState);
  }
  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
    const mesh = new THREE.Mesh(geometry, material); this.track(mesh); return mesh;
  }
  private track(mesh: THREE.Mesh) {
    this.geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) this.materials.add(material);
  }
  private addMeltLayer(parent: THREE.Mesh, transport: MeltTransport, domain: MeltLayer['domain']) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(transport.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(transport.uvs, 2).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('meltWave', new THREE.BufferAttribute(transport.waves, 2).setUsage(THREE.DynamicDrawUsage));
    if (transport.crust) geometry.setAttribute('meltCrust', new THREE.BufferAttribute(transport.crust, 4).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(transport.indices); geometry.computeVertexNormals();
    const mesh = this.mesh(geometry, domain === 'surface' ? this.surfaceTransport.material : this.intrusiveTransport.material);
    mesh.frustumCulled = false; mesh.receiveShadow = true; parent.add(mesh);
    const layer = { mesh, transport, mobility: 0, domain };
    this.moltenLayers.push(layer); return layer;
  }
  private sheetMelt(parent: THREE.Mesh, source: Parameters<typeof MeltTransport.sheet>[0]) {
    return [this.addMeltLayer(parent, MeltTransport.sheet(source, 1), 'intrusion'), this.addMeltLayer(parent, MeltTransport.sheet(source, -1), 'intrusion')];
  }
  private clear(group: THREE.Group) {
    group.traverse(object => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.Mesh) { object.geometry.dispose(); this.geometries.delete(object.geometry); }
    });
    group.clear();
  }
  private rebuild() {
    const kind = this.settings.landform ?? 'scoria';
    // Product conditions rebuild their own geometry; older surrounding land
    // retains its sites and GPU resources until the actual landform changes.
    if (!this.environment || this.environment.kind !== kind) {
      this.environment?.dispose(); this.environment = new EruptionEnvironment3D(kind, this.texture, this.cut);
      this.scene.add(this.environment.group);
    }
    for (const group of [this.terrain, this.section, this.jets, this.surfaceProducts, this.rocks]) this.clear(group);
    this.dikes = []; this.flows = []; this.flowSources=[]; this.moltenLayers = []; this.flowLayers = [];
    const top = this.mesh(buffers(terrainBuffers(kind)), this.surfaceRock); top.castShadow = top.receiveShadow = true; this.terrain.add(top);
    for (let unit = 0; unit < SECTION_UNITS; unit++) {
      const facies = [0, 1, 0, 1, 2, 0, 1, 0, 2, 1, 0][unit];
      const raw = buffers(stratumSolid(unit, kind)), geometry = toCreasedNormals(raw, Math.PI / 5); raw.dispose();
      const layer = this.mesh(geometry, this.geology[facies]);
      layer.castShadow = layer.receiveShadow = true; this.section.add(layer);
    }
    const rind = this.mesh(buffers(storageComplex(.05)), this.contactRock);
    const body = this.mesh(buffers(storageComplex()), this.magma.material);
    rind.castShadow = rind.receiveShadow = body.castShadow = body.receiveShadow = true;
    this.section.add(rind, body);
    STORAGE.forEach((storage, i) => {
      this.storageLights[i].position.copy(vector(sectionPoint([storage.x, storage.y], .25)));
      this.section.add(this.storageLights[i]);
      const curve = new THREE.CatmullRomCurve3(feederCenterline(i).map(vector));
      const feederData = intrusionSolid(curve.getPoints(64).map(p => p.toArray() as XYZ), .075, .5);
      const feeder = this.mesh(buffers(feederData), this.magmaPath.material);
      feeder.castShadow = feeder.receiveShadow = true; this.section.add(feeder);
      this.sheetMelt(feeder, feederData);
    });
    const ceiling = (x: number, z: number) => surfaceHeight(x, z, kind);
    for (const vent of ventPositions(this.settings.vents)) {
      const x = vent * WORLD_SCALE, end = 115 - surfaceHeight(x, 0, kind) / WORLD_SCALE;
      const points = dike(vent, end).map(p => sectionPoint(p, .06));
      const source = intrusionSolid(points, .070, .57, .00001, ceiling);
      const intrusion = this.mesh(buffers(source), this.magmaPath.material);
      intrusion.castShadow = intrusion.receiveShadow = true; this.section.add(intrusion);
      this.dikes.push({ mesh: intrusion, points, lastFront: -1, layers: this.sheetMelt(intrusion, source) });
      const fountain = new THREE.Group(); fountain.position.set(x, surfaceHeight(x, 0, kind) + .045, 0);
      for (let j = 0; j < 6; j++) {
        const angle = j / 6 * Math.PI * 2;
        const points: XYZ[] = Array.from({ length: 45 }, (_, i) => {
          const u = i / 44 * (.19 + seed(j + 601) * .12), spread = u * u * .75;
          return [Math.cos(angle) * spread + Math.sin(i * .8 + j) * u * .04, 4 * u * (1 - u), Math.sin(angle) * spread];
        });
        const geometry = sheet(points, .032 * Math.sqrt(supplyPerVent(this.settings.vents)), .035);
        const positions = geometry.getAttribute('position');
        for (let ring = 0; ring < points.length; ring++) for (let side = 0; side <= JET_SIDES; side++) {
          const index = ring * (JET_SIDES + 1) + side, point = points[ring];
          const taper = (.86 + .1 * Math.sin(ring * .43 + j) + .04 * Math.sin(ring * .91 + j * 2)) * (1 - ring / points.length * .83);
          positions.setXYZ(index, point[0] + (positions.getX(index) - point[0]) * taper,
            point[1] + (positions.getY(index) - point[1]) * taper, point[2] + (positions.getZ(index) - point[2]) * taper);
        }
        geometry.computeVertexNormals();
        const jet = this.mesh(geometry, this.fountain.material); fountain.add(jet);
      }
      this.jets.add(fountain);
    }
    const boulders = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), this.surfaceRock, 480); this.track(boulders);
    for (let i = 0; i < 480; i++) {
      const angle = seed(i + 815) * Math.PI * 2, radius = 1.1 + Math.sqrt(seed(i + 522)) * 6.8;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      this.dummy.position.set(x, surfaceHeight(x, z, kind) + .01, z);
      const size = .017 + seed(i + 32) ** 4 * .14;
      this.dummy.scale.set(size * (1 + seed(i + 67)), size * .7, size);
      this.dummy.rotation.set(seed(i + 5) * 4, seed(i + 7) * 4, seed(i + 9) * 4); this.dummy.updateMatrix(); boulders.setMatrixAt(i, this.dummy.matrix);
    }
    boulders.castShadow = boulders.receiveShadow = true; this.rocks.add(boulders);
    this.pond = this.mesh(new THREE.CircleGeometry(craterBasin(kind).radius * .98, 96), this.pool.material);
    this.pond.rotation.x = -Math.PI / 2; this.surfaceProducts.add(this.pond);
    this.flows = lavaBranches(this.settings).map(branch => {
      const retained=new RetainedLavaRibbon(this.settings,branch),source=retained.sample(0).geometry,flow=this.mesh(buffers(source),this.lava.material);
      this.flowSources.push({retained,installed:source});
      this.surfaceProducts.add(flow);
      this.flowLayers.push(this.addMeltLayer(flow, MeltTransport.surface(source), 'surface'));
      return flow;
    });
    this.fragments = fragmentSchedule(this.settings);
    this.applySection(); this.renderer.shadowMap.needsUpdate = true;
  }

  private applySection() {
    this.canvas.dataset.projection = this.cutaway ? 'section' : 'exterior';
    this.section.visible = this.cutaway;
    for (const material of [this.surfaceRock, this.lava.material, this.pool.material, this.surfaceTransport.material]) {
      material.clippingPlanes = this.cutaway ? [this.cut] : []; material.clipShadows = true; material.needsUpdate = true;
    }
    this.ground.position.y = this.cutaway ? ROCK_BOTTOM - .025 : -.09;
    this.environment?.setSection(this.cutaway);
    this.controls.minAzimuthAngle = this.cutaway ? -.95 : -Infinity;
    this.controls.maxAzimuthAngle = this.cutaway ? .95 : Infinity;
    this.renderer.shadowMap.needsUpdate = true;
  }
  setView(view: ObservationView, cutaway = view === 'overview' || view === 'storage') {
    if (view === this.view && cutaway === this.cutaway) return;
    this.view = view; this.cutaway = cutaway;
    this.applySection(); this.syncDetailHeat(); this.moveCamera(true);
  }
  /** This switch affects liquid detail only, never geological playback. */
  setDetailMotion(enabled: boolean) { this.detailMotion.setEnabled(enabled); }
  resetDetailPhase() { this.detailMotion.resetPhase(); }
  private updateLiquidPhase = (phase: number) => {
    for (const style of [this.magma, this.magmaPath, this.lava, this.pool]) style.detailPhase.value = phase;
    this.fountain.phase.value = phase;
    this.updateMeltGeometry(phase);
    this.render();
  };
  private updateMeltGeometry(phase: number) {
    for (const layer of this.moltenLayers) {
      const mobility = layer.domain === 'intrusion' ? this.intrusiveMobility : layer.mobility;
      layer.mesh.visible = mobility > .001;
      if (!layer.mesh.visible) continue;
      layer.transport.update(phase, mobility);
      for (const attribute of ['position', 'uv', 'meltWave']) layer.mesh.geometry.getAttribute(attribute).needsUpdate = true;
      if (layer.transport.crust) layer.mesh.geometry.getAttribute('meltCrust').needsUpdate = true;
      layer.mesh.geometry.computeVertexNormals();
    }
  }
  private publishDetailState = (state: DetailMotionState) => {
    this.canvas.dataset.detailMotion = state.disposed ? 'disposed' : !state.enabled ? 'paused'
      : state.hidden ? 'hidden' : state.reducedMotion ? 'reduced' : state.running ? 'running' : 'idle';
    this.canvas.dataset.detailEnabled = String(state.enabled);
    this.canvas.dataset.detailPhase = state.phase.toFixed(6);
  };
  private syncDetailHeat() { this.detailMotion.setHot(this.surfaceMobile || (this.cutaway && this.undergroundMobile)); }
  resetCamera() { this.moveCamera(true); }
  private frameScale() {
    const aspect = this.camera.aspect;
    if (this.view === 'flow') return flowCameraPose(this.settings, aspect, this.camera.fov).radius;
    return this.view === 'overview' || this.view === 'exterior'
      ? Math.max(1, 1.35 / aspect) : Math.max(1, (this.view === 'plume' ? .95 : .85) / aspect);
  }
  private maximumAshTop(summit: number) {
    const settings = { ...this.settings, strength: 1 };
    let top = summit + 5;
    for (let i = 0; i <= 24; i++) for (const parcel of eruptionFrame(i / 24, settings).ash) {
      if (parcel.density > .02) top = Math.max(top, parcel.position[1] + parcel.radius);
    }
    return top;
  }
  private moveCamera(animate: boolean) {
    this.cancelCamera();
    const summit = surfaceHeight(0, 0, this.settings.landform ?? 'scoria');
    const distance = this.frameScale(); this.framingScale = distance;
    const ash = eruptionAppearance(this.settings).ash > .5;
    const target = new THREE.Vector3(0, this.cutaway ? -.05 : summit * .4 + (ash ? 1.4 : .4), 0);
    let offset = new THREE.Vector3(7.1, 5.8, 12).multiplyScalar(distance);
    if (this.view === 'overview') { target.z = -.65; offset.set(9.1, 5.8, 15.4).multiplyScalar(distance * 1.1); }
    if (!this.cutaway && ash) offset.multiplyScalar(1.25);
    if (ash && (this.view === 'overview' || this.view === 'exterior')) {
      const bottom = this.cutaway ? ROCK_BOTTOM : -.1, top = this.maximumAshTop(summit);
      target.y = (bottom + top) / 2;
      const required = (top - bottom) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * .8);
      offset.multiplyScalar(Math.max(1, required / offset.length()));
    }
    if (this.view === 'storage') { target.set(0, -.85, .16); offset.set(4.6, 2.5, 7.6).multiplyScalar(distance); }
    if (this.view === 'vent') { target.set(0, summit + .3, 0); offset.set(3.2, 2.6, 4.4).multiplyScalar(distance); }
    if (this.view === 'flow') {
      const pose = flowCameraPose(this.settings, this.camera.aspect, this.camera.fov);
      target.fromArray(pose.target); offset.fromArray(pose.position).sub(target);
    }
    if (this.view === 'plume') {
      // Same-style small/large comparisons and later plume growth share one
      // fixed maximum-strength reference, rather than chasing current output.
      const top=this.maximumAshTop(summit);
      target.set(1.1,(summit+top)/2,0);
      offset.set(6.8,3.5,10).multiplyScalar(distance*Math.max(.8,(top-summit)/7.5));
    }
    const position = target.clone().add(offset), from = this.camera.position.clone(), fromTarget = this.controls.target.clone();
    if (!animate) { this.camera.position.copy(position); this.controls.target.copy(target); this.controls.update(); this.render(); return; }
    this.cancelCamera = animateValue({ from: 0, to: 1, duration: 650, onUpdate: u => {
      if (this.disposed) return;
      this.camera.position.lerpVectors(from, position, u); this.controls.target.lerpVectors(fromTarget, target, u); this.controls.update(); this.render();
    } });
  }
  private resize = () => {
    if (this.disposed) return;
    const width = this.canvas.clientWidth, height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.renderer.getDrawingBufferSize(this.bufferSize);
    this.sceneTarget.setSize(this.bufferSize.x, this.bufferSize.y);
    const ratio=Math.min(.6,640/Math.max(this.bufferSize.x,this.bufferSize.y));
    const ashWidth=Math.max(1,Math.round(this.bufferSize.x*ratio)),ashHeight=Math.max(1,Math.round(this.bufferSize.y*ratio));
    this.ashTarget.setSize(ashWidth,ashHeight); this.ash.uniforms.uResolution.value.set(ashWidth,ashHeight);
    this.ash.uniforms.uSteps.value=width<600?36:48;
    if (!this.hasSize) { this.hasSize = true; this.moveCamera(false); }
    else {
      const scale = this.frameScale();
      if (Math.abs(scale - this.framingScale) > .001) {
        this.stopMotion();
        this.camera.position.sub(this.controls.target).multiplyScalar(scale / this.framingScale).add(this.controls.target);
        this.framingScale = scale; this.controls.update();
      }
    }
    this.render();
  };
  private render=()=>this.presentation.request();
  private renderNow = () => {
    if (this.disposed || document.hidden) return;
    if (!this.cloud?.visible) { this.renderer.setRenderTarget(null); this.renderer.render(this.scene,this.camera); return; }
    this.renderer.setRenderTarget(this.sceneTarget); this.renderer.render(this.scene,this.camera);
    this.ash.uniforms.uInverseViewProjection.value.multiplyMatrices(this.camera.matrixWorld,this.camera.projectionMatrixInverse);
    this.renderer.setRenderTarget(this.ashTarget); this.renderer.setClearColor(0x000000,0); this.renderer.clear();
    this.renderer.render(this.ashScene,this.camera);
    this.renderer.setRenderTarget(null); this.renderer.setClearColor(0x000000,1); this.renderer.render(this.compositeScene,this.compositeCamera);
  };
  stopMotion = () => { this.cancelCamera(); };
  private keydown = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); this.stopMotion();
    if (event.key === 'Home') { this.resetCamera(); return; }
    const spherical = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    if (event.key === 'ArrowLeft') spherical.theta -= .12;
    if (event.key === 'ArrowRight') spherical.theta += .12;
    if (event.key === 'ArrowUp') spherical.phi -= .1;
    if (event.key === 'ArrowDown') spherical.phi += .1;
    if (event.key === '+' || event.key === '=') spherical.radius *= .9;
    if (event.key === '-') spherical.radius /= .9;
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); this.controls.update(); this.render();
  };

  draw(progress: number, settings: Settings) {
    if (this.disposed) return;
    const previousStyle = eruptionAppearance(this.settings).style;
    this.p = progress; this.settings = settings;
    const key = `${settings.landform}|${settings.vents}|${settings.gas}|${settings.viscosity}|${settings.supply}|${settings.strength ?? 1}`;
    if (key !== this.key) { this.key = key; this.rebuild(); }
    const state = eruptionFrame(progress, settings), appearance = eruptionAppearance(settings), kind = settings.landform ?? 'scoria';
    this.magma.heat.value = .48 + state.mechanism.pressure * .8;
    this.magmaPath.heat.value = this.magma.heat.value * 1.15;
    this.storageLights.forEach(light => { light.intensity = .65 + state.mechanism.pressure * 1.8; });
    for (const intrusion of this.dikes) {
      const visible = state.mechanism.front > .001;
      if (visible !== intrusion.mesh.visible) this.renderer.shadowMap.needsUpdate = true;
      intrusion.mesh.visible = visible;
      if (visible && Math.abs(intrusion.lastFront - state.mechanism.front) > 1e-7) {
        const data = intrusionSolid(intrusion.points, .070, .57, state.mechanism.front, (x, z) => surfaceHeight(x, z, kind));
        const geometry = intrusion.mesh.geometry, positions = geometry.getAttribute('position') as THREE.BufferAttribute;
        (positions.array as Float32Array).set(data.positions); positions.needsUpdate = true;
        const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
        (uv.array as Float32Array).set(data.uvs); uv.needsUpdate = true;
        geometry.computeVertexNormals(); geometry.computeBoundingSphere();
        intrusion.layers.forEach(layer => layer.transport.setSource(data));
        intrusion.lastFront = state.mechanism.front; this.renderer.shadowMap.needsUpdate = true;
      }
    }
    this.lava.heat.value = lavaThermalState(state.clock).surfaceGlow * (.22 + .78 * appearance.lava);
    this.lava.time.value = state.clock;
    this.pool.heat.value=this.lava.heat.value; this.pool.time.value=state.clock;
    this.surfaceTransport.heat.value = this.lava.heat.value;
    this.intrusiveTransport.heat.value = this.magmaPath.heat.value;
    this.fountain.heat.value = state.intensity * (1 - state.mechanism.cooling);
    if (this.pond) { this.pond.visible = state.mechanism.connected && appearance.strength > 0; this.pond.position.y = craterLevel(state.clock, settings); this.pond.scale.setScalar(.35 + .65 * appearance.lava); }
    this.flows.forEach((mesh, i) => {
      const source=this.flowSources[i],sample=source.retained.sample(state.clock),data=sample.geometry;
      mesh.visible = state.lavaVisible && sample.visible;
      this.flowLayers[i].mobility = Math.min(1, Math.sqrt(sample.flux) * 2) * (1 - state.mechanism.cooling);
      if (mesh.visible&&source.installed!==data) {
        const positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        (positions.array as Float32Array).set(data.positions); positions.needsUpdate = true;
        const uv=mesh.geometry.getAttribute('uv') as THREE.BufferAttribute; (uv.array as Float32Array).set(data.uvs); uv.needsUpdate=true;
        mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
        this.flowLayers[i].transport.setSource(data);
        source.installed=data;
      }
    });
    this.jets.visible = state.intensity * appearance.fountain > .012;
    this.jets.children.forEach((jet, i) => {
      const x = ventPositions(settings.vents)[i] * WORLD_SCALE;
      jet.position.y = Math.max(surfaceHeight(x, 0, kind) + .03, x === 0 ? craterLevel(state.clock, settings) : 0);
      jet.scale.y = Math.max(.01, state.intensity * appearance.fountain * (2.9 - settings.viscosity) * (.45 + .55 * appearance.supply) * appearance.jetScale);
    });
    this.ejecta.update({ fragments: this.fragments, clock: state.clock, settings,
      connected: state.mechanism.connected, cutaway: this.cutaway });
    this.light.position.set(0, surfaceHeight(0, 0, kind) + .6, .3); this.light.intensity = state.relativeIntensity * 13 * appearance.lava;

    const min = this.ash.uniforms.uMin.value.set(Infinity, Infinity, Infinity), max = this.ash.uniforms.uMax.value.set(-Infinity, -Infinity, -Infinity);
    let visible = false;
    this.ash.uniforms.uClock.value = state.clock;
    this.ash.uniforms.uSourceActive.value = state.ash[11]?.source ? 1 : 0;
    for (let i = 0; i < 12; i++) {
      const parcel = state.ash[i];
      this.ash.uniforms.uDensities.value[i] = parcel?.density ?? 0;
      this.ash.uniforms.uAxes.value[i].set(...(parcel?.axes ?? [1, 1, 1] as XYZ));
      this.ash.uniforms.uParcels.value[i].set(...(parcel?.position ?? [0, 0, 0] as XYZ), parcel?.radius ?? 0);
      if (parcel && parcel.density > .02) {
        visible = true;
        const extent = new THREE.Vector3(...parcel.axes).multiplyScalar(parcel.radius);
        min.min(vector(parcel.position).sub(extent)); max.max(vector(parcel.position).add(extent));
      }
    }
    this.cloud.visible = visible;
    if (visible) { min.y = Math.max(min.y, surfaceHeight(0, 0, kind) + .02); this.cloud.position.addVectors(min, max).multiplyScalar(.5); this.cloud.scale.subVectors(max, min); }
    this.canvas.dataset.connected = String(state.mechanism.connected);
    this.canvas.dataset.projection = this.cutaway ? 'section' : 'exterior';
    this.canvas.dataset.progress = progress.toFixed(4);
    // Cooling is already part of this qualitative episode. It gates detail
    // admission, rather than introducing an endlessly running hot interior.
    this.undergroundMobile = state.mechanism.p > .0001 && state.mechanism.cooling < .999;
    this.intrusiveMobility = this.undergroundMobile ? 1 - state.mechanism.cooling : 0;
    this.surfaceMobile = state.mechanism.connected && state.mechanism.cooling < .999 && this.lava.heat.value > .08 && appearance.lavaFlux > .001;
    this.updateMeltGeometry(this.detailMotion.state.phase);
    this.syncDetailHeat();
    if (previousStyle !== appearance.style && (this.view === 'exterior' || this.view === 'overview')) this.moveCamera(true);
    this.render();
  }
  dispose() {
    if (this.disposed) return;
    this.stopMotion(); this.detailMotion.dispose(); this.disposed = true; this.presentation.dispose(); this.resizeObserver.disconnect();
    this.canvas.removeEventListener('keydown', this.keydown); this.controls.dispose();
    this.environment?.dispose(); this.environment = undefined;
    this.ejecta.dispose(); this.clear(this.rocks);
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.texture.dispose(); this.ash.noise.dispose(); this.sceneTarget.dispose(); this.ashTarget.dispose();
    this.scene.clear(); this.ashScene.clear(); this.compositeScene.clear(); this.renderer.dispose(); this.renderer.forceContextLoss();
    this.geometries.clear(); this.materials.clear();
  }
}
