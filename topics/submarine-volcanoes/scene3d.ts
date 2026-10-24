import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { animateValue } from '../../src/visuals/transition.ts';
import { FrameRender } from '../../src/visuals/frameRender.ts';
import { pillowState, ramp, type Environment, type Supply } from './model.ts';
import { MagmaDetailMotion, type DetailMotionState } from '../volcano-eruption/magmaMotion.ts';
import { createScene, type SceneFrame } from './scene.ts';
import { deepVentFraming, depositBuffers, oceanGeometryFrame, islandVentOrigin, pillowPitch, pillowShape, plumeOrigin, RADIUS, sectionBuffers, seed, surfaceHeight, updateDeposit, WATER_Y, worldY, type OceanGeometryFrame, type SolidBuffers, type XYZ } from './geometry3d.ts';
import { compositeMaterial, oceanBackground, oceanUniforms, plumeMaterial, stoneMaterial, stoneNoise, waterMaterial } from './materials3d.ts';
import { OceanVent3D } from './vent3d.ts';
import { OceanCoastalFlow3D } from './coastalFlow3d.ts';
import { islandFlowClearance } from './coastalFlow.ts';
import { OceanCoastline3D } from './coastline3d.ts';
import { ISLAND_CLASTS, islandClast } from './surfaceClasts.ts';
import { extrusionState } from './ventMechanics.ts';
import { pillowFlowCorridor } from './pillowFlow.ts';
import { OceanEcology3D } from './oceanEcology3d.ts';
import type { OceanEcologyCase, OceanEcologyState } from './oceanEcology.ts';
import { oceanEcologyClearance } from './oceanEcology.ts';
import { IslandEpilogue3D } from './islandEpilogue3d.ts';

export type OceanView = 'landscape' | 'ocean' | 'section' | 'vent';
type Deposit = { mesh: THREE.Mesh; face: THREE.Mesh; unit: number; key: string };
type CameraFrame = { target: THREE.Vector3; offset: THREE.Vector3; minDistance?: number;
  maxPolarAngle?: number; focusKey?: 'island-ecology' };

/** Observe the retained cold-rock patch at its existing animal scale. The
 * camera changes magnification; it never expands an animal or moves a site.
 * This is local observation lighting/framing, not a physical ROV trajectory. */
export function oceanEcologyFraming(state: OceanEcologyState, aspect = 1): CameraFrame | undefined {
  if (!state.visible) return;
  const site = state.sites.find(s => s.index === state.focusSite && s.habitat === 'marine' && s.film > .01);
  if (!site) return;
  const scale = Math.max(1, .98 / Math.max(.3, Number.isFinite(aspect) ? aspect : 1));
  const target = new THREE.Vector3(...site.position).lerp(new THREE.Vector3(...site.animalPosition), .28)
    .addScaledVector(new THREE.Vector3(...site.normal), .018);
  return { target, offset: new THREE.Vector3(.42, .52, .82).multiplyScalar(scale), minDistance: .55 };
}

/** A selected terrestrial ledge is approached from above its open outer flank.
 * The bounded height probes retain clearance as the same island erodes; they
 * do not move soil, raise a plant or replace the actual rendered mountain. */
export function islandEcologyFraming(frame: OceanGeometryFrame, state: OceanEcologyState, aspect = 1): CameraFrame | undefined {
  if (frame.environment !== 'island' || !state.visible) return;
  const site = state.sites.find(s => s.index === state.focusSite && s.habitat === 'land' && s.soil > .01);
  if (!site) return;
  const scale = Math.max(1, .98 / Math.max(.3, Number.isFinite(aspect) ? aspect : 1));
  const target = new THREE.Vector3(...site.position).add(new THREE.Vector3(0, .055, 0));
  const offset = new THREE.Vector3(.52, .85, 1.05).multiplyScalar(scale);
  let lift = 0;
  for (let step = 1; step <= 12; step++) {
    const t = step / 12, x = target.x + offset.x * t, z = target.z + offset.z * t;
    lift = Math.max(lift, (surfaceHeight(frame, x, z) + .035 - target.y - offset.y * t) / t);
  }
  offset.y += lift;
  return { target, offset, minDistance: .85, maxPolarAngle: 1.12, focusKey: 'island-ecology' };
}

/** The production setView/draw camera path, independent of WebGL allocation.
 * A newer observation anchor cancels and invalidates an older interpolation;
 * an already queued callback cannot place the camera inside later deposits. */
export class OceanCameraMotion {
  private cancel = () => {};
  private moving = false;
  private revision = 0;

  constructor(private camera: THREE.PerspectiveCamera, private controls: OrbitControls,
    private render: () => void, private animate: typeof animateValue = animateValue) {}

  private limits(frame: CameraFrame) {
    this.controls.minDistance = frame.minDistance ?? 2.2;
    this.controls.maxPolarAngle = frame.maxPolarAngle ?? Math.PI * .52;
  }
  stop() { this.cancel(); this.moving = false; this.revision++; }

  setView(frame: CameraFrame, animate: boolean) {
    this.stop(); this.limits(frame);
    const from = this.controls.target.clone(), eye = this.camera.position.clone();
    const position = frame.target.clone().add(frame.offset), revision = this.revision;
    if (!animate) { this.controls.target.copy(frame.target); this.camera.position.copy(position); this.controls.update(); return; }
    this.moving = true;
    this.cancel = this.animate({ from: 0, to: 1, duration: 700, onUpdate: q => {
      if (revision !== this.revision) return;
      this.controls.target.lerpVectors(from, frame.target, q); this.camera.position.lerpVectors(eye, position, q);
      this.controls.update(); this.render();
    }, onComplete: () => { if (revision === this.revision) this.moving = false; } });
  }

  draw(previous: CameraFrame, next: CameraFrame) {
    const focusChanged = previous.minDistance !== next.minDistance || previous.focusKey !== next.focusKey;
    if (focusChanged) this.stop();
    if (this.moving) {
      if (previous.target.equals(next.target) && previous.offset.equals(next.offset)) return;
      // A seek or growth update supersedes the destination of an in-flight
      // view change. Dropping it would leave the camera at the old anchor;
      // the following draw would then add that missing height a second time.
      this.setView(next, false); return;
    }
    this.limits(next);
    if (focusChanged) {
      this.camera.position.copy(next.target).add(next.offset); this.controls.target.copy(next.target);
    } else {
      const delta = next.target.clone().sub(previous.target), ratio = next.offset.length() / previous.offset.length();
      this.camera.position.sub(this.controls.target).multiplyScalar(ratio).add(this.controls.target).add(delta);
      this.controls.target.add(delta);
    }
    this.controls.update();
  }
}

/** Display admission follows existing molten exposure, never advances deposits.
 * A cutaway retains residual interstitial melt after the exterior has cooled. */
export function oceanMeltVisible(frame: OceanGeometryFrame, view: OceanView) {
  if (view === 'section') return true;
  if (frame.environment === 'deep') return Array.from({ length: 14 }, (_, i) => pillowState(frame.p, i))
    .some(p => p.growth > .0001 && extrusionState(p.growth, p.crust, p.coreHeat).hot > .004);
  if (frame.environment === 'shallow') return frame.state.activity > .004;
  return frame.p < .80 && frame.history.units.some(u => u.growth > 0 && u.growth < 1 && Math.sin(u.growth * Math.PI) > .004);
}

export const ISLAND_BASAL_PILLOWS = 120;
type BasalPillow = { x: number; z: number; heading: number; burial: number; dimensions: XYZ };

/** These old lobate chains are static dressing, not a measured flow network.
 * Reserve the full ecological footprints and both retained flow histories
 * once, before playback; neither a progress seek nor habitat selection clears
 * rocks. Unequal short patches, interrupted bends and differing burial avoid
 * equally planted rows; all share the four existing pillow prototypes. */
const basalPatchCounts = [7, 13, 4, 11, 6, 15, 9, 5, 14, 8, 12, 16];
const islandBasalSites: BasalPillow[] = basalPatchCounts.flatMap((count, chain) => {
  const first = basalPatchCounts.slice(0, chain).reduce((sum, n) => sum + n, 0);
  const bearing = [-2.48, -1.25, -.58, 2.55][Math.floor(chain / 3)]
    + (seed(chain, 1501) - .5) * .40;
  const phase = seed(chain, 1507) * Math.PI * 2;
  const start = 1.05 + seed(chain, 1511) * 1.45, side = (seed(chain, 1531) - .5) * .75;
  const segment = 3 + chain % 3, bendWidth = .14 + seed(chain, 1537) * .23;
  const at = (shift: number, turn = 0) => {
    const c = Math.cos(bearing + turn), s = Math.sin(bearing + turn);
    let distance = start + shift;
    const sites = Array.from({ length: count }, (_, along): BasalPillow => {
      const i = first + along, patch = Math.floor(along / segment);
      if (along) distance += (.24 + seed(i, 1513) * .17) * (count > 12 ? .76 : 1)
        + (along % segment === 0 ? .13 + seed(i, 1541) * .16 : 0);
      const bend = side + bendWidth * Math.sin(along * .83 + phase)
        + (patch % 2 ? 1 : -1) * (.12 + seed(chain + patch, 1543) * .15);
      return { x: c * distance - s * bend, z: s * distance + c * bend, heading: 0,
        burial: .12 + seed(i, 1549) * .36,
        dimensions: [.35 + seed(i, 1517) * .23, .24 + seed(i, 1519) * .13, .22 + seed(i, 1523) * .14] };
    });
    return sites.map((site, along) => {
      const before = sites[Math.max(0, along - 1)], after = sites[Math.min(count - 1, along + 1)];
      site.heading = -Math.atan2(after.z - before.z, after.x - before.x)
        + (seed(first + along, 1553) - .5) * .24;
      return site;
    });
  };
  let sites = at(0);
  for (let step = 1; step <= 36; step++) {
    const blocked = sites.some(site => {
      // A conservative sphere encloses the asymmetric prototype in plan.
      const margin = Math.hypot(site.dimensions[0] * 1.5, site.dimensions[2] * 1.25);
      return Math.hypot(site.x, site.z) < margin + .65 || islandFlowClearance(site.x, site.z, margin)
        || oceanEcologyClearance(site.x, site.z, margin, 'island');
    });
    if (!blocked) break;
    const choice = step % 9, turn = choice === 0 ? 0 : (choice % 2 ? 1 : -1) * Math.ceil(choice / 2) * .36;
    sites = at(Math.floor(step / 9) * .22, turn);
  }
  return sites;
});

/** Retain the existing seven-deposit support: later layers bury these lobes
 * rather than hoisting them onto the cap. Their lower portions enter the rock. */
export function islandBasalPillow(frame: OceanGeometryFrame, index: number) {
  const site = islandBasalSites[index], through = 7;
  return { position: [site.x, surfaceHeight(frame, site.x, site.z, through) - site.dimensions[1] * site.burial, site.z] as XYZ,
    rotation: [(seed(index, 1529) - .5) * .16, site.heading,
      pillowPitch(frame, site.x, site.z, site.heading, through)] as XYZ, dimensions: [...site.dimensions] as XYZ };
}

/** Melt emits locally; this point light is an uncalibrated observation aid.
 * Deep ROV and shallow-burst lighting retain their existing range. A deeply
 * submerged island outlet gets a short, weak reflection instead of a halo. */
export function oceanVentGlow(frame: OceanGeometryFrame, exposedHeat: number, pillowFocus?: XYZ) {
  const origin = frame.environment === 'island' ? islandVentOrigin(frame) : pillowFocus ?? plumeOrigin(frame);
  const approach = frame.environment === 'island' ? ramp(origin[1], WATER_Y - 1.1, WATER_Y - .08) : 1;
  return { position: [origin[0], origin[1] + .045 + approach * .075, origin[2]] as XYZ,
    intensity: Math.max(0, Math.min(1, exposedHeat)) * 6 * (.06 + approach * .94), distance: .85 + approach * 2.15 };
}

function fromBuffers(data: SolidBuffers) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
  geometry.setIndex(data.indices); geometry.computeVertexNormals(); return geometry;
}

/** One supplied process frame owns geology, heat and finite particle packets.
 * A bounded material phase animates only exposed melt, independently of geology. */
class Ocean3D {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(37, 1.5, .08, 220);
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private noise = stoneNoise();
  private uniforms = oceanUniforms();
  private cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private rock = this.stone('basalt');
  private tuff = this.stone('tuff');
  private contact = Array.from({ length: 6 }, (_, i) => this.stone('section', .23 + i * .1));
  private magma = this.stone('magma');
  private branchMagma = this.stone('magma', .79);
  private feederRock = this.stone('feeder');
  private oldPillowRock = this.stone('pillow', .27);
  private deposits: Deposit[] = [];
  private oldPillows: THREE.InstancedMesh[] = [];
  private rubble: THREE.InstancedMesh;
  private deepPillowClearance: boolean[] = [];
  private deepRubbleClearance: boolean[] = [];
  private deepEcologyClearance: boolean[] = [];
  private vent: OceanVent3D;
  private sectionGroup = new THREE.Group();
  private host = new THREE.Group();
  private feeder: THREE.Mesh;
  private coastal: OceanCoastalFlow3D;
  private shoreline: OceanCoastline3D;
  private ecology: OceanEcology3D;
  private epilogue: IslandEpilogue3D;
  private ecologyCase: OceanEcologyCase = 'bare';
  private water: THREE.Mesh;
  private ambient = new THREE.HemisphereLight('#b3d9df', '#192324', 1);
  private sun = new THREE.DirectionalLight('#f5e5cd', 2.7);
  private rov = new THREE.SpotLight('#e6e9da', 280, 28, .76, .72, 1.4);
  private fill = new THREE.PointLight('#b8ced0', 20, 17, 1.7);
  private hotLight = new THREE.PointLight('#ff762c', 0, 3, 2);
  private sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  private plumeTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  private plume = plumeMaterial(this.noise, this.uniforms);
  private plumeScene = new THREE.Scene();
  private composite = new THREE.Scene();
  private screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private current = oceanGeometryFrame(.08, 'island', 'sustained');
  private view: OceanView = 'landscape';
  private environmentKey = '';
  private disposed = false;
  private hasSize = false;
  private hasPlume = false;
  private detailMotion?: MagmaDetailMotion;
  private lightLevel = 0;
  private geologyUpdates = 0;
  private litCamera = new THREE.Vector3(Infinity, Infinity, Infinity);
  private litTarget = new THREE.Vector3(Infinity, Infinity, Infinity);
  private cameraMotion?: OceanCameraMotion;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private size = new THREE.Vector2();
  private presentation = new FrameRender(() => this.renderNow());

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(max-width: 720px)').matches ? 1.2 : 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.1;
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    canvas.dataset.renderer = 'webgl';
    this.controls = new OrbitControls(this.camera, canvas);
    this.cameraMotion = new OceanCameraMotion(this.camera, this.controls, this.render);
    this.controls.enableDamping = false; this.controls.enablePan = false;
    this.controls.minDistance = 2.2; this.controls.maxDistance = 55;
    this.controls.minPolarAngle = .22; this.controls.maxPolarAngle = Math.PI * .52;
    this.controls.addEventListener('change', this.render);
    this.controls.addEventListener('start', this.stopMotion);
    canvas.addEventListener('keydown', this.keydown);
    try {
      this.sceneTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
      if (!this.renderer.extensions.has('EXT_color_buffer_float')) this.sceneTarget.texture.type = THREE.UnsignedByteType;
      this.sceneTarget.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
      this.plumeTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
      this.plume.uniforms.uDepth.value = this.sceneTarget.depthTexture;
      // These quads write clip-space pixels. Their world-space origin must not
      // be culled when a close camera looks at a growing, elevated summit.
      const plumeQuad = this.mesh(new THREE.PlaneGeometry(2, 2), this.plume.material);
      const compositeQuad = this.mesh(new THREE.PlaneGeometry(2, 2), compositeMaterial(this.sceneTarget.texture, this.plumeTarget.texture));
      plumeQuad.frustumCulled = compositeQuad.frustumCulled = false;
      this.plumeScene.add(plumeQuad); this.composite.add(compositeQuad);
      const background = this.mesh(new THREE.SphereGeometry(100, 32, 20), oceanBackground(this.uniforms));
      background.castShadow = background.receiveShadow = false; this.scene.add(background);
      this.scene.add(this.ambient, this.sun, this.rov, this.rov.target, this.fill, this.hotLight, this.host, this.sectionGroup);
      this.sun.position.set(-9, 18, 10); this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1536, 1536);
      Object.assign(this.sun.shadow.camera, { left: -13, right: 13, top: 15, bottom: -12, near: 1, far: 55 });
      this.sun.shadow.bias = -.0003; this.sun.shadow.normalBias = .025;
      this.rov.castShadow = true; this.rov.shadow.mapSize.set(1024, 1024); this.rov.shadow.bias = -.0002;

      const ground = new THREE.PlaneGeometry(320, 320, 160, 160); ground.rotateX(-Math.PI / 2);
      const p = ground.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        p.setY(i, -.065 + (Math.sin(x * 2.3 + z * .8) + Math.cos(z * 3.7 - x * .4)) * .015);
      }
      ground.computeVertexNormals(); this.host.add(this.mesh(ground, this.rock.material));
      this.water = this.mesh(new THREE.PlaneGeometry(2000, 2000), waterMaterial(this.noise, this.uniforms));
      this.water.castShadow = this.water.receiveShadow = false;
      this.water.rotation.x = -Math.PI / 2; this.water.position.y = WATER_Y; this.water.renderOrder = 5; this.scene.add(this.water);
      this.shoreline = new OceanCoastline3D(this.noise, this.uniforms); this.host.add(this.shoreline.group);
      this.ecology = new OceanEcology3D(this.noise, this.uniforms); this.host.add(this.ecology.group);
      this.epilogue = new IslandEpilogue3D(); this.host.add(this.epilogue.group);

      // Four fixed, asymmetric extrusions replace a repeated flattened sphere.
      // Shared active/old shapes keep this geometry allocation independent of time.
      const pillows = Array.from({ length: 4 }, (_, variant) => {
        const pillow = new THREE.SphereGeometry(1, 48, 28), vertices = pillow.getAttribute('position');
        for (let i = 0; i < vertices.count; i++) vertices.setXYZ(i, ...pillowShape([vertices.getX(i), vertices.getY(i), vertices.getZ(i)], variant));
        pillow.computeVertexNormals(); this.geometries.add(pillow); return pillow;
      });
      this.oldPillows = pillows.map(geometry => this.instances(geometry, this.oldPillowRock.material, 55));
      this.host.add(...this.oldPillows);
      const angular = new THREE.IcosahedronGeometry(1, 1); this.geometries.add(angular);
      this.rubble = this.instances(angular, this.rock.material, 420); this.host.add(this.rubble);
      this.vent = new OceanVent3D(this.noise, this.uniforms); this.host.add(this.vent.group);

      const storage = new THREE.IcosahedronGeometry(1, 4), v = storage.getAttribute('position');
      for (let i = 0; i < v.count; i++) {
        const x = v.getX(i), y = v.getY(i), z = v.getZ(i);
        const w = 1 + .10 * Math.sin(x * 7 + z * 4) * Math.sin(y * 9 + x * 3) + .045 * Math.cos(z * 17);
        v.setXYZ(i, x * w, y * w, z * w);
      }
      storage.computeVertexNormals();
      const body = this.mesh(storage, this.magma.material); body.scale.set(1.82, .72, 1.02); body.position.set(-.22, -1.0, -.06); body.rotation.z = -.06; this.sectionGroup.add(body);
      const branch = this.mesh(storage, this.branchMagma.material); branch.scale.set(.93, .38, .62); branch.position.set(1.26, -.63, -.08); branch.rotation.z = .12; this.sectionGroup.add(branch);
      const feederData = new THREE.CylinderGeometry(1, 1, 1, 12, 32, false);
      this.feeder = this.mesh(feederData, this.feederRock.material); this.sectionGroup.add(this.feeder);
      this.coastal = new OceanCoastalFlow3D(this.noise, this.uniforms, this.rock.material); this.host.add(this.coastal.group);
      this.detailMotion = new MagmaDetailMotion(phase => this.updateLiquidPhase(phase), state => this.publishDetailState(state));
      this.observer = new ResizeObserver(this.resize); this.observer.observe(canvas);
      this.resize();
    } catch (error) { this.dispose(); throw error; }
  }

  private stone(kind: Parameters<typeof stoneMaterial>[2], variation?: number, pillowVariant?: number) {
    const rock = stoneMaterial(this.noise, this.uniforms, kind, variation, pillowVariant); this.materials.add(rock.material); return rock;
  }
  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
    this.geometries.add(geometry); this.materials.add(material);
    if (geometry instanceof THREE.CylinderGeometry) {
      const source = geometry.getAttribute('position');
      geometry.setAttribute('oceanSource', new THREE.BufferAttribute(new Float32Array(source.array), 3));
    }
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
  }
  private instances(geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; return mesh;
  }
  private rebuild() {
    for (const deposit of this.deposits) for (const mesh of [deposit.mesh, deposit.face]) {
      mesh.removeFromParent(); this.geometries.delete(mesh.geometry); mesh.geometry.dispose();
    }
    this.deposits = [];
    const units = this.current.environment === 'island' ? [-1, ...this.current.history.units.map(u => u.index)] : [-1];
    for (const unit of units) {
      const phase = this.current.history.units[unit]?.phase;
      const material = phase === 'shallow-fragments' ? this.tuff.material : this.rock.material;
      const mesh = this.mesh(fromBuffers(depositBuffers()), material);
      const face = this.mesh(fromBuffers(sectionBuffers(this.current, unit)), this.contact[(unit + 7) % this.contact.length].material);
      face.castShadow = false;
      this.host.add(mesh); this.sectionGroup.add(face); this.deposits.push({ mesh, face, unit, key: '' });
    }
  }
  private geometry(frame: OceanGeometryFrame) {
    for (const deposit of this.deposits) {
      const { unit, mesh, face } = deposit;
      const key = frame.environment === 'island' ? `${frame.history.erosion}|${frame.history.units.slice(0, unit + 1).map(u => u.growth).join(',')}` : String(frame.p);
      mesh.visible = face.visible = unit < 0 || frame.history.units[unit].growth > .00001;
      if (key === deposit.key) continue;
      deposit.key = key;
      const positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      updateDeposit(positions.array as Float32Array, frame, unit); positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
      const cap = face.geometry.getAttribute('position') as THREE.BufferAttribute;
      (cap.array as Float32Array).set(sectionBuffers(frame, unit).positions); cap.needsUpdate = true;
      face.geometry.computeVertexNormals(); face.geometry.computeBoundingSphere();
    }
    // The retained old rocks have stable sites, sizes and orientations.
    const oldCount = frame.environment === 'deep' ? 220 : frame.environment === 'island' ? ISLAND_BASAL_PILLOWS : 18;
    this.rubble.material = frame.environment === 'shallow' ? this.tuff.material : this.rock.material;
    for (let i = 0; i < 420; i++) {
      const angle = seed(i, 2) * Math.PI * 2, radius = Math.sqrt(seed(i, 3)) * (RADIUS - .2);
      let x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      if (i < 100 && frame.environment === 'shallow') {
        const lipAngle = 1.95 + seed(i, 51) * 5.3, r = .46 + seed(i, 52) * .45;
        x = Math.cos(lipAngle) * r - .06; z = Math.sin(lipAngle) * r * .79 + .08;
      } else if (i < 90 && frame.environment === 'deep') {
        const u = (seed(i, 51) - .5) * 1.75, v = .075 * Math.sin(u * 4.3) + (i % 2 ? 1 : -1) * (.15 + seed(i, 52) * .13);
        x = u * .91 + v * .42; z = -u * .42 + v * .91;
      }
      const h = surfaceHeight(frame, x, z);
      const size = .035 + seed(i, 4) ** 3 * .17;
      this.dummy.position.set(x, h + size * .31, z); this.dummy.rotation.set(seed(i, 7) * 5, seed(i, 8) * 6, seed(i, 9) * 3, 'XYZ');
      this.dummy.scale.set(size * 1.3, size * .7, size); this.dummy.updateMatrix(); this.rubble.setMatrixAt(i, this.dummy.matrix);
      if (frame.environment === 'deep') {
        this.deepRubbleClearance[i] ??= pillowFlowCorridor(x, z, .29);
        this.deepEcologyClearance[i] ??= oceanEcologyClearance(x, z, size * 1.4, 'deep');
        if (this.deepRubbleClearance[i] || this.deepEcologyClearance[i]) {
          const scale = this.deepEcologyClearance[i] ? 0 : .28;
          this.dummy.position.y = h + size * scale * .31;
          this.dummy.scale.multiplyScalar(scale); this.dummy.updateMatrix(); this.rubble.setMatrixAt(i, this.dummy.matrix);
        }
      }
      if (frame.environment === 'island' && i < ISLAND_CLASTS) {
        const clast = islandClast(frame, i);
        this.dummy.position.set(...clast.position); this.dummy.rotation.set(...clast.rotation, 'XYZ');
        this.dummy.scale.set(...clast.dimensions).multiplyScalar(clast.visible ? 1 : 0); this.dummy.updateMatrix();
        this.rubble.setMatrixAt(i, this.dummy.matrix);
      }
      this.rubble.setColorAt(i, this.color.setScalar(.55 + seed(i, 10) * .6));
      if (i < oldCount) {
        if (frame.environment === 'island') {
          const pillow = islandBasalPillow(frame, i);
          this.dummy.position.set(...pillow.position); this.dummy.rotation.set(...pillow.rotation, 'YXZ');
          this.dummy.scale.set(...pillow.dimensions); this.dummy.updateMatrix();
        } else {
          const chain = Math.floor(i / 20), along = i % 20;
          const r = frame.environment === 'deep' ? .70 + along / 19 * 3.65 + seed(i, 11) * .23
            : 2 + Math.sqrt(seed(i, 11)) * 5.2;
          const bearing = frame.environment === 'deep' ? seed(chain, 41) * Math.PI * 2 + .18 * Math.sin(along * .49 + chain) : angle;
          const px = Math.cos(bearing) * r, pz = Math.sin(bearing) * r;
          const extent = .16 + seed(i, 12) * .22;
          const through = frame.contacts.length - 1, heading = -bearing + (seed(i, 42) - .5) * .6;
          this.dummy.position.set(px, surfaceHeight(frame, px, pz, through) - extent * .08, pz);
          this.dummy.rotation.set((seed(i, 13) - .5) * .20, heading, pillowPitch(frame, px, pz, heading, through), 'YXZ');
          this.dummy.scale.set(extent * (1.1 + seed(i, 15) * .65), extent, extent * (.85 + seed(i, 43) * .25)); this.dummy.updateMatrix();
          if (frame.environment === 'deep') {
            this.deepPillowClearance[i] ??= pillowFlowCorridor(px, pz, .24 + extent * 1.3)
              || oceanEcologyClearance(px, pz, extent * 1.8, 'deep');
            if (this.deepPillowClearance[i]) { this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); }
          }
        }
        const group = this.oldPillows[i % this.oldPillows.length], index = Math.floor(i / this.oldPillows.length);
        group.setMatrixAt(index, this.dummy.matrix);
        group.setColorAt(index, this.color.setRGB(.66 + seed(i, 16) * .28, .68 + seed(i, 16) * .27, .65 + seed(i, 16) * .28));
      }
    }
    this.rubble.count = frame.environment === 'island' ? ISLAND_CLASTS : 420;
    this.rubble.instanceMatrix.needsUpdate = true; if (this.rubble.instanceColor) this.rubble.instanceColor.needsUpdate = true;
    this.oldPillows.forEach((mesh, i) => {
      mesh.count = Math.max(0, Math.ceil((oldCount - i) / this.oldPillows.length)); mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    this.renderer.shadowMap.needsUpdate = true;
  }
  private products(frame: OceanGeometryFrame) {
    this.vent.draw(frame);
    this.canvas.dataset.ventMechanism = this.vent.state.mechanism;
    this.canvas.dataset.ventOpening = this.vent.state.opening.toFixed(6);
    this.canvas.dataset.ventDetached = String(this.vent.state.detached);
    this.canvas.dataset.ventSettled = String(this.vent.state.settled);
    this.canvas.dataset.ventRemodelling = this.vent.state.remodelling.toFixed(6);
    this.canvas.dataset.pillowAdvancing = String(this.vent.state.pillowAdvancing);
    this.canvas.dataset.pillowRetained = String(this.vent.state.pillowRetained);
    this.canvas.dataset.pillowFront = this.vent.state.pillowFront.map(n => n.toFixed(5)).join(',');
    this.canvas.dataset.pillowDistance = this.vent.state.pillowDistance.toFixed(5);
    const outlet = frame.environment === 'island' ? islandVentOrigin(frame) : plumeOrigin(frame);
    const top = outlet[1], pos = this.feeder.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      // Cylinder's stable UV owns the advancing feeder's vertical coordinate.
      const source = this.feeder.geometry.getAttribute('oceanSource'), q = source.getY(i) + .5;
      const width = .065 + .045 * Math.sin(q * Math.PI) ** 2;
      pos.setXYZ(i, (-.13 + .10 * Math.sin(q * 8)) * (1 - q) + outlet[0] * q + source.getX(i) * width, -1.28 + (top + 1.28) * q, source.getZ(i) * .43 - .04 * (1 - q) + outlet[2] * q);
    }
    pos.needsUpdate = true; this.feeder.geometry.computeVertexNormals(); this.feeder.geometry.computeBoundingSphere();
    this.magma.heat.value = .32 + frame.state.activity * .30;
    this.branchMagma.heat.value = this.magma.heat.value * .94;
    this.feederRock.heat.value = this.magma.heat.value;
    this.shoreline.draw(frame); this.uniforms.emergence.value = this.shoreline.state.exposure;
    this.canvas.dataset.shorelineExposure = this.shoreline.state.exposure.toFixed(6);
    this.coastal.draw(frame);
    this.canvas.dataset.coastalContacts = String(this.coastal.state.contacts);
    this.canvas.dataset.coastalContact = this.coastal.state.contact.map(n => n.toFixed(5)).join(',');
    this.canvas.dataset.coastalFlows = String(this.coastal.state.retained);
    this.canvas.dataset.coastalFragments = String(this.coastal.state.fragments);
    this.canvas.dataset.ventOrigin = outlet.map(n => n.toFixed(5)).join(',');
    const exposedHeat = Math.max(this.vent.state.exposedHeat, this.coastal.state.exposedHeat);
    const glow = oceanVentGlow(frame, exposedHeat, frame.environment === 'deep' && this.vent.state.pillowFocusWeight > .01
      ? this.vent.state.pillowFocus as XYZ : undefined);
    this.hotLight.position.set(...glow.position); this.hotLight.distance = glow.distance;
    this.lightLevel = glow.intensity;
    this.hotLight.intensity = this.lightLevel;
  }
  private packets(frame: OceanGeometryFrame) {
    const uniforms = this.plume.uniforms, density = uniforms.uDensity.value;
    density.fill(0); const min = uniforms.uMin.value.set(Infinity, Infinity, Infinity), max = uniforms.uMax.value.set(-Infinity, -Infinity, -Infinity);
    this.coastal.state.parcels.forEach((p, i) => {
      const [x, y, z] = p.center, radius = Math.max(.01, p.radius);
      uniforms.uParcels.value[i].set(x, y, z, radius); uniforms.uAxes.value[i].set(...p.axes); density[i] = p.density;
      if (p.density < .001) return;
      // Domain warp stays inside this conservative bound, including fine wisps.
      const ex = radius * p.axes[0] + .12, ey = radius * p.axes[1] + .12, ez = radius * p.axes[2] + .12;
      min.min(new THREE.Vector3(x - ex, y - ey, z - ez)); max.max(new THREE.Vector3(x + ex, y + ey, z + ez));
    });
    this.hasPlume = density.some(value => value > .001);
    this.canvas.dataset.plumeParcels = String(density.filter(value => value > .001).length);
    if (!this.hasPlume) { min.set(0, 0, 0); max.set(0, 0, 0); }
  }

  setView(view: OceanView) {
    if (this.view === view && this.hasSize) {
      if (view === 'vent' && this.current.environment === 'island' && this.ecology.state.visible) this.moveCamera(true);
      return;
    }
    this.view = view;
    const section = view === 'section'; this.sectionGroup.visible = section; this.uniforms.cutaway.value = section ? 1 : 0;
    for (const material of [this.rock.material, this.tuff.material, this.oldPillowRock.material]) {
      material.clippingPlanes = section ? [this.cut] : []; material.clipShadows = section;
      material.needsUpdate = true;
    }
    this.vent.setCutaway(section ? this.cut : undefined); this.coastal.setCutaway(section ? this.cut : undefined);
    this.shoreline.setCutaway(section ? this.cut : undefined);
    this.ecology.setCutaway(section ? this.cut : undefined);
    this.epilogue.setCutaway(section);
    this.controls.minAzimuthAngle = section ? -.6 : -Infinity;
    this.controls.maxAzimuthAngle = section ? .6 : Infinity;
    this.renderer.shadowMap.needsUpdate = true;
    this.detailMotion?.setHot(oceanMeltVisible(this.current, this.view) || this.epilogue.active || this.seaActive());
    this.moveCamera(true);
  }
  private cameraFrame(): CameraFrame {
    const top = worldY(this.current.state.summit), deep = this.current.environment === 'deep';
    const scale = Math.max(1, .98 / this.camera.aspect);
    if (this.view === 'vent') {
      if (this.ecology.state.visible && this.current.p > .84) {
        const marine = oceanEcologyFraming(this.ecology.state, this.camera.aspect);
        if (marine) return marine;
        const island = islandEcologyFraming(this.current, this.ecology.state, this.camera.aspect);
        if (island) return island;
        return { target: new THREE.Vector3(...this.ecology.state.focus).add(new THREE.Vector3(0, .08, 0)),
          offset: new THREE.Vector3(deep ? .8 : 1.1, deep ? 1.1 : 2.3, deep ? 2.6 : 2.8).multiplyScalar(scale) };
      }
      if (deep) {
        const framing = deepVentFraming(this.current, this.camera.aspect);
        const target = new THREE.Vector3(...framing.target), offset = new THREE.Vector3(...framing.offset);
        // Follow the source-to-front body rather than lifting the observation
        // toward the plume head. Overlapping finite feeds blend continuously.
        const focus = ramp(this.vent.state.pillowFocusWeight, .002, .18);
        if (focus > 0) {
          const [dx, dz] = this.vent.state.pillowDirection;
          target.lerp(new THREE.Vector3(...this.vent.state.pillowFocus).add(new THREE.Vector3(0, .08, 0)), focus);
          offset.lerp(new THREE.Vector3(dx * .9 + dz * 2.2, 1.55, dz * .9 - dx * 2.2).multiplyScalar(scale), focus);
        }
        return { target, offset };
      }
      const source = this.current.environment === 'island' ? islandVentOrigin(this.current) : plumeOrigin(this.current);
      const entryFraming = this.current.environment === 'island' ? Math.min(1.8, Math.max(0, source[1] - WATER_Y) * .58) : 0;
      return { target: new THREE.Vector3(...source).add(new THREE.Vector3(0, .12 - entryFraming, .20 + entryFraming * .2)), offset: new THREE.Vector3(1.8, 1.65, 4.5 + entryFraming).multiplyScalar(scale) };
    }
    if (this.view === 'section') return { target: new THREE.Vector3(0, Math.max(.3, top * .43), 0), offset: new THREE.Vector3(2, 3.3, 20).multiplyScalar(scale) };
    if (this.view === 'ocean') return { target: new THREE.Vector3(0, 3.2, 0), offset: new THREE.Vector3(13, 7.8, 22).multiplyScalar(scale) };
    const extent = this.current.environment === 'island' ? Math.max(3.5, this.current.state.building * 8.7) : deep ? 6.9 : 9.5;
    const target = new THREE.Vector3(0, top * .48 + .15, 0), offset = new THREE.Vector3(extent * .55, extent * .55 + .5, extent * 1.9);
    if (this.current.environment === 'island') {
      const source = islandVentOrigin(this.current), emerged = ramp(source[1], WATER_Y + .02, WATER_Y + .80);
      target.lerp(new THREE.Vector3(source[0] * .3, WATER_Y + (source[1] - WATER_Y) * .36, source[2] * .5), emerged);
      offset.lerp(new THREE.Vector3(3.2, 2.7, 6.8 + Math.max(0, source[1] - WATER_Y) * .7), emerged);
    }
    return { target, offset: offset.multiplyScalar(scale) };
  }
  private moveCamera(animate: boolean) {
    this.cameraMotion?.setView(this.cameraFrame(), animate);
  }
  resetCamera() { this.moveCamera(true); }
  stopMotion = () => { this.cameraMotion?.stop(); };
  private keydown = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); this.stopMotion();
    if (event.key === 'Home') { this.resetCamera(); return; }
    const p = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    if (event.key === 'ArrowLeft') p.theta -= .12; if (event.key === 'ArrowRight') p.theta += .12;
    if (event.key === 'ArrowUp') p.phi -= .10; if (event.key === 'ArrowDown') p.phi += .10;
    if (event.key === '+' || event.key === '=') p.radius *= .9; if (event.key === '-') p.radius /= .9;
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(p)); this.controls.update(); this.render();
  };
  private resize = () => {
    if (this.disposed) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (!w || !h) return;
    const old = this.camera.aspect; this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false); this.renderer.getDrawingBufferSize(this.size); this.sceneTarget.setSize(this.size.x, this.size.y);
    const ratio = Math.min(.6, 640 / Math.max(this.size.x, this.size.y));
    const pw = Math.max(1, Math.round(this.size.x * ratio)), ph = Math.max(1, Math.round(this.size.y * ratio));
    this.plumeTarget.setSize(pw, ph); this.plume.uniforms.uResolution.value.set(pw, ph); this.plume.uniforms.uSteps.value = w < 600 ? 28 : 40;
    if (!this.hasSize || Math.abs(old - this.camera.aspect) > .2) this.moveCamera(false);
    this.hasSize = true; this.render();
  };
  private render = () => this.presentation.request();
  private renderNow() {
    if (this.disposed || !this.hasSize || document.hidden) return;
    this.canvas.dataset.cameraPosition = this.camera.position.toArray().map(v => v.toFixed(5)).join(',');
    this.canvas.dataset.cameraTarget = this.controls.target.toArray().map(v => v.toFixed(5)).join(',');
    const closeDeep = this.current.environment === 'deep' && this.view === 'vent';
    const closeLife = closeDeep && this.ecology.state.visible;
    if (closeLife) {
      // A fixed upper-side lamp gives the low shell a lit flank and a soft
      // contact shadow. Frontal camera light would flatten it into a disc.
      this.rov.position.copy(this.controls.target).add(new THREE.Vector3(-.95, .78, .20));
    } else this.rov.position.copy(this.camera.position).add(new THREE.Vector3(-1.8, closeDeep ? 1.1 : 1.7, -.6));
    this.rov.target.position.copy(this.controls.target);
    this.rov.angle = closeLife ? .62 : .76;
    this.rov.distance = closeLife ? 7 : 28;
    // A short observation frustum avoids quantized self-shadow triangles on
    // the same coarse terrain. Its tiny normal offset retains shell shadows.
    this.rov.shadow.camera.near = closeLife ? .08 : .5;
    this.rov.shadow.normalBias = closeLife ? .0006 : 0;
    this.rov.shadow.bias = closeLife ? -.00006 : -.0002;
    this.rov.intensity = this.current.environment === 'deep' ? closeLife ? 7.5 : closeDeep ? 84 : 64 : 20;
    this.ambient.intensity = this.current.environment === 'deep' ? this.view === 'section' ? .36 : .20 : .95;
    this.plume.uniforms.uLamp.value.copy(this.rov.position); this.plume.uniforms.uLampTarget.value.copy(this.rov.target.position);
    // Ambient melt changes neither the ROV pose nor opaque rock contacts.
    // Reuse their shadow until geometry or the observation camera changes.
    if (this.current.environment === 'deep' && (!this.litCamera.equals(this.camera.position) || !this.litTarget.equals(this.rov.target.position))) {
      this.renderer.shadowMap.needsUpdate = true;
      this.litCamera.copy(this.camera.position); this.litTarget.copy(this.rov.target.position);
    }
    this.fill.position.copy(this.camera.position);
    if (this.view === 'section') this.fill.position.lerp(this.controls.target, .55);
    this.fill.position.add(closeLife ? new THREE.Vector3(.42, .16, .3) : new THREE.Vector3(3, .5, 1));
    this.fill.intensity = this.view === 'section' ? 32 : this.current.environment === 'deep' ? closeLife ? 1.1 : closeDeep ? 12 : 8 : 10;
    if (!this.hasPlume) { this.renderer.setRenderTarget(null); this.renderer.render(this.scene, this.camera); return; }
    this.renderer.setRenderTarget(this.sceneTarget); this.renderer.render(this.scene, this.camera);
    this.plume.uniforms.uInverse.value.multiplyMatrices(this.camera.matrixWorld, this.camera.projectionMatrixInverse);
    this.renderer.setRenderTarget(this.plumeTarget); this.renderer.setClearColor(0, 0); this.renderer.clear(); this.renderer.render(this.plumeScene, this.camera);
    this.renderer.setRenderTarget(null); this.renderer.setClearColor(0, 1); this.renderer.render(this.composite, this.screenCamera);
  }
  private updateLiquidPhase(phase: number) {
    if (this.disposed) return;
    this.uniforms.seaPhase.value = phase;
    this.canvas.dataset.seaPhase = phase.toFixed(6);
    if (oceanMeltVisible(this.current, this.view)) {
      this.uniforms.detailPhase.value = phase;
      this.vent?.updateDetail(phase);
      this.hotLight.intensity = this.lightLevel * (.94 + .04 * Math.sin(phase * 2) + .02 * Math.sin(phase * 3 + .7));
    }
    this.epilogue?.updatePhase(phase);
    this.publishVisitors();
    this.render();
  }
  private seaActive() {
    return this.view !== 'section' && this.water.visible && this.current.environment === 'island' && this.current.state.emerged;
  }
  private publishVisitors() {
    const state=this.epilogue?.active ? this.epilogue.state : undefined;
    this.canvas.dataset.visitors=state ? `${Number(state.bird.visible)} seabird, ${state.fish.filter(f=>f.visible).length} fish` : '';
    this.canvas.dataset.visitorBird=state?.bird.visible ? state.bird.position.map(v=>v.toFixed(5)).join(',') : '';
    this.canvas.dataset.visitorFish=state ? state.fish.filter(f=>f.visible).map(f=>f.position.map(v=>v.toFixed(5)).join(',')).join(';') : '';
  }
  private publishDetailState(state: DetailMotionState) {
    if(this.epilogue?.setReducedMotion(state.reducedMotion))this.render();
    this.canvas.dataset.detailMotion = state.disposed ? 'disposed' : state.hidden ? 'hidden'
      : state.reducedMotion ? 'reduced' : state.running ? 'running' : 'idle';
    this.canvas.dataset.detailPhase = state.phase.toFixed(6);
  }
  draw(progress: number, environment: Environment, supply: Supply, ecology: OceanEcologyCase = 'bare') {
    if (this.disposed) return;
    const changed = `${progress}|${environment}|${supply}` !== `${this.current.p}|${this.current.environment}|${this.current.supply}`;
    const followCamera = changed || ecology !== this.ecologyCase || !this.environmentKey;
    const oldTarget = followCamera ? this.cameraFrame() : undefined;
    // Keep the current frame's terrain/contact caches on camera-only redraws;
    // an exact new progress or condition replaces it rather than adding history.
    if (changed) this.current = oceanGeometryFrame(progress, environment, supply);
    this.ecologyCase = ecology;
    const key = `${environment}|${supply}`;
    if (key !== this.environmentKey) { this.environmentKey = key; this.rebuild(); }
    this.uniforms.deep.value = environment === 'deep' ? 1 : 0; this.uniforms.clock.value = progress;
    this.sun.intensity = environment === 'deep' ? 0 : 2.7; this.sun.castShadow = environment !== 'deep';
    this.rov.castShadow = environment === 'deep';
    this.water.visible = this.view === 'ocean' || this.view === 'section' || environment !== 'deep';
    this.sectionGroup.visible = this.view === 'section';
    if (changed || this.deposits.some(d => !d.key)) {
      this.geometry(this.current); this.products(this.current); this.packets(this.current);
      this.canvas.dataset.geologyUpdates = String(++this.geologyUpdates);
    }
    this.canvas.dataset.progress = this.current.p.toFixed(6);
    this.canvas.dataset.environment = environment;
    this.ecology.draw(this.current, this.ecologyCase);
    this.canvas.dataset.ecology = this.ecologyCase;
    this.canvas.dataset.ecologyVisible = String(this.ecology.state.visible);
    this.canvas.dataset.ecologyFocusSite = String(this.ecology.state.focusSite);
    if (oldTarget && this.hasSize && this.view !== 'ocean') {
      this.cameraMotion?.draw(oldTarget, this.cameraFrame());
    }
    // Ambient phases own poses between geological updates, including quiet
    // gaps before the next visit. A repeated draw must not remesh that pose.
    if (changed || !this.epilogue.state) this.epilogue.draw(this.current,this.camera);
    this.publishVisitors();
    this.detailMotion?.setHot(oceanMeltVisible(this.current, this.view) || this.epilogue.active || this.seaActive());
    this.render();
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.presentation.dispose(); this.detailMotion?.dispose(); this.stopMotion(); this.observer?.disconnect();
    this.controls?.removeEventListener('change', this.render); this.controls?.removeEventListener('start', this.stopMotion); this.controls?.dispose();
    this.canvas.removeEventListener('keydown', this.keydown);
    for (const geometry of this.geometries) geometry.dispose(); for (const material of this.materials) material.dispose();
    for (const mesh of [...this.oldPillows, this.rubble]) mesh?.dispose();
    this.vent?.dispose(); this.coastal?.dispose(); this.shoreline?.dispose(); this.ecology?.dispose(); this.epilogue?.dispose();
    this.sun.shadow.map?.dispose(); this.rov.shadow.map?.dispose(); this.noise.dispose();
    this.sceneTarget.depthTexture?.dispose(); this.sceneTarget.dispose(); this.plumeTarget.dispose();
    this.renderer?.dispose(); this.renderer?.forceContextLoss(); this.scene.clear();
  }
}

/** Keeps the last frame available through context loss, with the existing SVG as
 * an explicit fallback and fresh canvases for a GPU retry. */
export class SubmarineScene {
  private gpu?: Ocean3D;
  private svg?: SVGSVGElement;
  private fallback?: ReturnType<typeof createScene>;
  private frame: SceneFrame = { progress: .08, weights: [0, 0, 1], supplyMix: 0, section: .1, camera: [0, 0, 1000, 666.667] };
  private view: OceanView = 'landscape';
  private disposed = false;
  constructor(private canvas: HTMLCanvasElement, private fallbackLabel: string) { this.mount(); }
  get is3D() { return !!this.gpu; }
  private mount() {
    const candidate = this.canvas.cloneNode(false) as HTMLCanvasElement; candidate.removeAttribute('style'); candidate.hidden = false;
    try {
      this.gpu = new Ocean3D(candidate); this.canvas.replaceWith(candidate); this.canvas = candidate;
      this.canvas.addEventListener('webglcontextlost', this.contextLost);
      this.gpu.setView(this.view); this.draw(this.frame);
    } catch (error) {
      this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.gpu?.dispose(); this.gpu = undefined;
      console.warn('Submarine 3D unavailable; using the existing illustration.', error); this.useFallback();
    }
  }
  private useFallback() {
    this.canvas.hidden = true; this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('role', 'img'); this.svg.setAttribute('aria-label', this.fallbackLabel);
    this.svg.setAttribute('aria-describedby', 'story'); this.svg.dataset.renderer = 'svg';
    this.canvas.after(this.svg); this.fallback = createScene(this.svg); this.fallback(this.frame);
  }
  private contextLost = (event: Event) => {
    event.preventDefault(); if (this.disposed) return;
    this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.gpu?.dispose(); this.gpu = undefined; this.useFallback();
    this.canvas.dispatchEvent(new CustomEvent('volcano-renderer', { bubbles: true }));
  };
  draw(frame: SceneFrame) {
    this.frame = frame;
    const environment: Environment = frame.weights[0] ? 'deep' : frame.weights[1] ? 'shallow' : 'island';
    this.gpu?.draw(frame.progress, environment, frame.supplyMix ? 'limited' : 'sustained', frame.ecology ?? 'bare'); this.fallback?.(frame);
  }
  setView(view: OceanView) { this.view = view; this.gpu?.setView(view); }
  resetCamera() { this.gpu?.resetCamera(); }
  stopMotion() { this.gpu?.stopMotion(); }
  retry3D() { if (this.disposed || this.gpu) return; this.svg?.remove(); this.svg = undefined; this.fallback = undefined; this.mount(); }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.gpu?.dispose(); this.gpu = undefined; this.svg?.remove(); this.fallback = undefined;
  }
}
