import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { animateValue } from '../../src/visuals/transition.ts';
import { FrameRender } from '../../src/visuals/frameRender.ts';
import { seedDispersal } from './ecologyDispersal.ts';
import { ecologyMarkup } from './ecologyScene.ts';
import type { Habitat } from './ecologyModel.ts';
import { ROCK_RADIUS, type XYZ } from './eruptionGeometry.ts';
import { lavaMaterial, rockMaterial, rockTexture, skyMaterial, storageMaterial, transportMaterial } from './eruptionMaterials.ts';
import { HISTORY_BEDS, HISTORY_FIELD_SIZE, HISTORY_UNITS, historyClasts, historyField, historyFlow, historyFrame, historyHeight, historyIntrusion, historySites, historyStorage, historyStorageBody, historyStratum, historySurface, historyTerrain, type HistoryChapter, type HistoryFrame } from './landscapeGeometry.ts';
import { MagmaDetailMotion, type DetailMotionState } from './magmaMotion.ts';
import { MeltTransport } from './meltTransport.ts';
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



const TRANSPORT_ATTRIBUTES = ['position', 'uv', 'meltWave', 'meltCrust'] as const;
/** Update the retained normal buffer without per-detail-frame vector objects. */
function retainedNormals(target: THREE.BufferGeometry) {
  const positions = target.getAttribute('position').array as Float32Array;
  const normal = target.getAttribute('normal') as THREE.BufferAttribute, out = normal.array as Float32Array;
  const indices = target.index!.array; out.fill(0);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    out[a] += x; out[a + 1] += y; out[a + 2] += z;
    out[b] += x; out[b + 1] += y; out[b + 2] += z;
    out[c] += x; out[c + 1] += y; out[c + 2] += z;
  }
  for (let i = 0; i < out.length; i += 3) {
    const length = Math.hypot(out[i], out[i + 1], out[i + 2]);
    if (length > 0) { out[i] /= length; out[i + 1] /= length; out[i + 2] /= length; }
    else out[i + 1] = 1;
  }
  normal.needsUpdate = true;
}


/** The occupied organic domains are sampled in immutable material space.
 * Their amount and shape belong to the construction history. Detail phase can
 * only shear the exposed melt and change a small, spatially varying highlight. */
export function historyStorageMaterial(grain: THREE.Texture) {
  const style = storageMaterial(grain), compile = style.material.onBeforeCompile;
  const centers = { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] };
  const radii = { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] };
  const domainHeat = { value: new THREE.Vector3() };
  const pockets = { value: Array.from({ length: 9 }, () => new THREE.Vector4()) };
  const pocketAngles = { value: new Float32Array(9) };
  style.material.onBeforeCompile = (shader, renderer) => {
    compile.call(style.material, shader, renderer);
    Object.assign(shader.uniforms, { uHistoryCenters: centers, uHistoryRadii: radii, uHistoryHeat: domainHeat,
      uHistoryPockets: pockets, uHistoryPocketAngles: pocketAngles });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 historyRest;')
      .replace('vStorage=position;', 'vStorage=historyRest;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec3 uHistoryCenters[3]; uniform vec3 uHistoryRadii[3]; uniform vec3 uHistoryHeat;
      uniform vec4 uHistoryPockets[9]; uniform float uHistoryPocketAngles[9];`)
      .replace('float grain=noise3(stonePoint*9.);', `
        float historyOccupancy=0.,historyDomainHeat=0.;
        for(int i=0;i<3;i++){
          vec2 q=(vStorage.xy-uHistoryCenters[i].xy)/uHistoryRadii[i].xy;
          float occupied=0.;
          // Same three unequal, connected ellipse pockets as the history's
          // material-space field and SVG contour. There is no liquid plane.
          for(int j=0;j<3;j++){
            int k=i*3+j;vec4 pocket=uHistoryPockets[k];
            vec2 point=q-pocket.xy;float c=cos(uHistoryPocketAngles[k]),s=sin(uHistoryPocketAngles[k]);
            vec2 rotated=vec2(point.x*c+point.y*s,-point.x*s+point.y*c);
            occupied=max(occupied,1.-smoothstep(.82,1.06,length(rotated/pocket.zw)));
          }
          historyOccupancy=max(historyOccupancy,occupied);
          historyDomainHeat=max(historyDomainHeat,occupied*uHistoryHeat[i]);
        }
        // Connected hot melt remains readable between the same dark crystal
        // cores and contact rind. Cold domains remain opaque solid material.
        float crystalCore=smoothstep(.095,.24,gap)*(1.-smoothstep(.40,.64,rich));
        float connectedMelt=smoothstep(.12,.53,melt);
        melt=max(melt,connectedMelt*.94)*(1.-crystalCore*.90);
        melt*=historyOccupancy;
        melt*=smoothstep(.015,.18,historyDomainHeat);
        float grain=noise3(stonePoint*9.);`)
      .replace('diffuseColor.rgb=mix(crystal,vec3(.19,.024,.003),.2+melt*.45);', 'diffuseColor.rgb=mix(crystal,vec3(.24,.032,.004),melt*.5);')
      .replace('vec3 hot=mix(vec3(.35,.007,.0003),vec3(2.5,.22,.004),smoothstep(.34,.96,melt));',
        `vec3 hot=mix(vec3(1.8,.055,.0008),vec3(4.4,.46,.006),smoothstep(.18,.76,melt));
        // Integer phase frequencies close exactly over DETAIL_PERIOD=2*pi.
        // Spatial phase offsets keep this weak light variation local to melt.
        float historyLocalLight=.035*sin(vStorage.x*3.1+vStorage.y*4.7-uStorageDetailPhase)
          +.022*cos(vStorage.x*2.7-vStorage.z*5.2+uStorageDetailPhase*2.);`)
      .replace('pow(melt,1.15)', 'pow(melt,.82)')
      .replace('1.-.80*liquidFold+1.1*liquidThread', '1.-.42*liquidFold+.60*liquidThread')
      .replace('*uStorageHeat;', '*uStorageHeat*historyDomainHeat*(1.+historyLocalLight*liquidMask);');
  };
  style.material.customProgramCacheKey = () => 'volcano-history-storage-v3';
  return { ...style, domainHeat, centers, radii, pockets, pocketAngles,
    setFrame(frame: HistoryFrame) {
      style.heat.value = frame.chapter === 'landscape' ? 1 : 0;
      for (let i = 0; i < 3; i++) {
        const state = historyStorage(i, frame);
        centers.value[i].fromArray(state.center); radii.value[i].fromArray(state.radii);
        domainHeat.value.setComponent(i, frame.chapter === 'landscape' ? state.heat : 0);
        for (let j = 0; j < 3; j++) {
          const pocket = state.organic.pockets[j], k = i * 3 + j;
          pockets.value[k].set(pocket.center[0], pocket.center[1], pocket.radii[0], pocket.radii[1]);
          pocketAngles.value[k] = pocket.angle;
        }
      }
    } };
}


/** Retains a geological solid, its material reference coordinates and topology.
 * Only an explicit geological frame updates positions/normals. Material-detail
 * frames have no access to the deformation operation. */
export class HistoryStorageProjection {
  readonly mesh: THREE.Mesh;
  readonly rest: Float32Array;
  private frameKey = '';
  private disposed = false;
  constructor(source: SolidBuffers, private readonly style: { material: THREE.Material; detailPhase: { value: number } }, referenceAttribute = false) {
    const solid = geometry(source);
    this.rest = new Float32Array(solid.getAttribute('position').array);
    if (referenceAttribute) solid.setAttribute('historyRest', new THREE.BufferAttribute(this.rest, 3));
    (solid.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    this.mesh = new THREE.Mesh(solid, style.material);
  }
  setFrame(frame: HistoryFrame) {
    if (this.disposed) return;
    const key = historyGeometryKeys(frame).storage;
    if (key === this.frameKey) return;
    const positions = this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    historyStorageBody(this.rest, frame, positions.array as Float32Array<ArrayBuffer>);
    positions.needsUpdate = true; retainedNormals(this.mesh.geometry); this.mesh.geometry.computeBoundingSphere();
    this.frameKey = key;
  }
  applyPhase(phase: number) { if (!this.disposed) this.style.detailPhase.value = phase; }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.mesh.removeFromParent(); this.mesh.geometry.dispose();
  }
}

/** All material-map inputs travel with the main intrusion's terrain/contact
 * inputs. Supply continues changing after the last deposit is complete. */
export function historyGeometryKeys(frame: HistoryFrame) {
  const state = frame.construction;
  const terrain = `${frame.land.growth}:${frame.land.erosion}:${state.uplift}`;
  const storage = `${frame.land.growth}:${state.intrusionFront}:${state.supply}:${state.fracture}:${frame.land.deposits.map(d => d.growth).join(':')}`;
  return { terrain, storage, section: `${terrain}:${storage}:${frame.contacts.join(':')}`,
    ecology: `${frame.vegetation}:${frame.soil}:${frame.burial}` };
}

/** Owns one retained deposit and its bounded, still-mobile surface. The source
 * positions belong to the history clock; display frames never rewrite them. */
export class HistoryFlowSurface {
  readonly mesh: THREE.Mesh;
  readonly movingMesh: THREE.Mesh;
  readonly body: ReturnType<typeof lavaMaterial>;
  readonly skin = transportMaterial();
  readonly transport: MeltTransport;
  private mobility = 0;
  private disposed = false;

  constructor(source: ReturnType<typeof historyFlow>, grain: THREE.Texture) {
    this.body = lavaMaterial(grain); this.body.time.value = .82;
    this.mesh = new THREE.Mesh(geometry(source), this.body.material);
    this.transport = MeltTransport.surface(source);
    const surface = new THREE.BufferGeometry();
    surface.setAttribute('position', new THREE.BufferAttribute(this.transport.positions, 3).setUsage(THREE.DynamicDrawUsage));
    surface.setAttribute('uv', new THREE.BufferAttribute(this.transport.uvs, 2).setUsage(THREE.DynamicDrawUsage));
    surface.setAttribute('meltWave', new THREE.BufferAttribute(this.transport.waves, 2).setUsage(THREE.DynamicDrawUsage));
    surface.setAttribute('meltCrust', new THREE.BufferAttribute(this.transport.crust!, 4).setUsage(THREE.DynamicDrawUsage));
    surface.setIndex(this.transport.indices); surface.computeVertexNormals();
    this.movingMesh = new THREE.Mesh(surface, this.skin.material); this.movingMesh.frustumCulled = false;
    this.mesh.add(this.movingMesh); this.setFrame(source, 0);
  }
  get active() { return !this.disposed && this.mesh.visible && this.mobility > .001; }
  setFrame(source: ReturnType<typeof historyFlow>, phase: number) {
    if (this.disposed) return;
    this.mesh.visible = source.visible;
    this.mobility = source.visible && source.flux > .001 && source.length > .03 ? source.mobility : 0;
    // Residual heat is not residual movement: completed flows read as rigid dark
    // crust, even while the authored cooling clock retains a little warmth.
    this.body.heat.value = source.heat * (this.active ? .72 : .008);
    this.body.detail.value = this.active ? 1 : 0;
    this.skin.heat.value = this.active ? source.heat * Math.min(1, source.flux * 1.8) : 0;
    replacePositions(this.mesh.geometry, source.positions);
    const uv = this.mesh.geometry.getAttribute('uv') as THREE.BufferAttribute;
    (uv.array as Float32Array).set(source.uvs); uv.needsUpdate = true;
    this.transport.setSource(source); this.movingMesh.visible = this.active;
    this.applyPhase(phase);
  }
  applyPhase(phase: number) {
    if (!this.active) return;
    this.body.detailPhase.value = phase; this.transport.update(phase, this.mobility);
    for (const attribute of TRANSPORT_ATTRIBUTES) this.movingMesh.geometry.getAttribute(attribute).needsUpdate = true;
    retainedNormals(this.movingMesh.geometry);
  }
  setClipping(planes: THREE.Plane[]) {
    for (const material of [this.body.material, this.skin.material]) { material.clippingPlanes = planes; material.needsUpdate = true; }
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.movingMesh.geometry.dispose();
    this.body.material.dispose(); this.skin.material.dispose();
  }
}


/** One finite cloud is sampled only by the geological draw. Flight and landing
 * are authored history states; the liquid-detail clock cannot move a clast. */
export class HistoryClastCloud {
  readonly mesh: THREE.InstancedMesh;
  readonly heat = new THREE.InstancedBufferAttribute(new Float32Array(108), 1).setUsage(THREE.DynamicDrawUsage);
  private dummy = new THREE.Object3D();
  private disposed = false;
  constructor(grain: THREE.Texture) {
    const shape = new THREE.DodecahedronGeometry(1, 0), positions = shape.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const rough = .86 + .17 * Math.sin(x * 8 + z * 5) * Math.cos(y * 7 - z * 3);
      positions.setXYZ(i, x * rough, y * rough, z * rough);
    }
    shape.computeVertexNormals(); shape.setAttribute('historyHeat', this.heat);
    const material = new THREE.MeshStandardMaterial({ color: '#686159', roughness: .95, bumpMap: grain, bumpScale: .012, emissive: '#ffffff' });
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float historyHeat; varying float vHistoryHeat;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHistoryHeat=historyHeat;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHistoryHeat;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.042,.012),vHistoryHeat*.6);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance=vec3(.75,.065,.003)*vHistoryHeat;');
    };
    material.customProgramCacheKey = () => 'volcano-history-clasts-v1';
    this.mesh = new THREE.InstancedMesh(shape, material, 108); this.mesh.frustumCulled = false; this.mesh.count = 0;
  }
  setFrame(samples: ReturnType<typeof historyClasts>) {
    if (this.disposed) return;
    this.mesh.count = Math.min(108, samples.length);
    for (let i = 0; i < this.mesh.count; i++) {
      const sample = samples[i], scale = sample.visible ? sample.radius : 0;
      this.dummy.position.set(...sample.position);
      this.dummy.rotation.set(seed(sample.index + 118) * 4, seed(sample.index + 613) * 6, seed(sample.index + 919) * 5);
      this.dummy.scale.set(scale * (1 + seed(sample.index + 41) * .3), scale * (sample.landed ? .64 : 1), scale * .83);
      this.dummy.updateMatrix(); this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.heat.setX(i, sample.visible ? sample.heat : 0);
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.heat.needsUpdate = true;
  }
  setClipping(planes: THREE.Plane[]) {
    const material = this.mesh.material as THREE.Material; material.clippingPlanes = planes; material.needsUpdate = true;
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.mesh.removeFromParent(); this.mesh.dispose(); this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** A continuous teaching lens. Mature history and ecology retain the same
 * reference, while the small early bulge need not occupy a whole-mountain frame. */
export function historyCameraReference(kind: Landform, frame: HistoryFrame, view: HistoryView, aspect: number) {
  const section = view === 'section', shield = kind === 'shield';
  const floor = shield ? section ? .46 : .53 : section ? .56 : .65;
  const whole = Math.max(floor, (section ? 1.33 : 1.45) / Math.max(.25, aspect));
  const fit = section ? THREE.MathUtils.lerp(.8, whole, THREE.MathUtils.smoothstep(aspect, .8, 1.2)) : whole;
  const grown = THREE.MathUtils.smoothstep(frame.land.growth, 0, .55);
  if (view === 'vent') {
    const x = frame.chapter === 'life' ? shield ? 3.1 : 2 : 0, z = frame.chapter === 'life' ? 1.6 : 0;
    return { scale: fit, target: [x, historySurface(x, z, kind, frame) + .15, z] as XYZ };
  }
  return { scale: fit * THREE.MathUtils.lerp(section ? .78 : .42, 1, grown),
    target: [0, section ? THREE.MathUtils.lerp(-.72, -.1, grown) : THREE.MathUtils.lerp(.04, shield ? .55 : 1.15, grown), 0] as XYZ };
}

/** Preserve the user's direction, target displacement and relative zoom while
 * following the changing history reference. This never runs on a detail frame. */
export function followHistoryReference(position: XYZ, target: XYZ, from: ReturnType<typeof historyCameraReference>, to: ReturnType<typeof historyCameraReference>) {
  const ratio = to.scale / from.scale;
  const nextTarget = target.map((value, i) => to.target[i] + (value - from.target[i]) * ratio) as XYZ;
  const nextPosition = position.map((value, i) => nextTarget[i] + (value - target[i]) * ratio) as XYZ;
  return { position: nextPosition, target: nextTarget };
}

export function historyDetailHot(frame: HistoryFrame, view: HistoryView, activeFlows: number) {
  return frame.chapter === 'landscape' && (activeFlows > 0 || (view === 'section' && frame.construction.heat > .01));
}


/** A warm residual melt can retain weak presentation detail after supply stops.
 * Neither coefficient represents a flux or changes the construction state. */
export function historyUndergroundDetail(frame: HistoryFrame) {
  if (frame.chapter !== 'landscape' || frame.construction.heat <= .01) return { storage: 0, intrusion: 0 };
  const { heat, supply, intrusionFront } = frame.construction;
  return { storage: heat * (.22 + .78 * supply), intrusion: heat * (.16 + .84 * supply) * intrusionFront };
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
  private storageStyle = historyStorageMaterial(this.grain);
  private storageBody: HistoryStorageProjection;
  private feeders: HistoryStorageProjection[] = [];
  private intrusionStyle = storageMaterial(this.grain, true);
  private flows: HistoryFlowSurface[] = [];
  private clasts = new HistoryClastCloud(this.grain);
  private detailMotion: MagmaDetailMotion;
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
  private reference: ReturnType<typeof historyCameraReference>;
  private cameraMoving = false;
  private lastTerrain = '';
  private lastSection = '';
  private lastField = '';
  private lastSnapshot = '';
  private disposed = false;
  private cancelCamera = () => {};
  private presentation = new FrameRender(() => this.renderNow());

  constructor(readonly canvas: HTMLCanvasElement, readonly kind: Landform) {
    this.reference = historyCameraReference(kind, this.frame, this.view, this.camera.aspect);
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
    this.keepMaterial(this.storageStyle.material);
    this.storageBody = new HistoryStorageProjection(storageComplex(), this.storageStyle, true);
    this.geology.add(this.storageBody.mesh);
    for (let i = 0; i < 3; i++) {
      this.keepMaterial(this.intrusionStyle.material);
      const feeder = new HistoryStorageProjection(intrusionSolid(feederCenterline(i), .045, .18), this.intrusionStyle);
      this.feeders.push(feeder); this.geology.add(feeder.mesh);
    }
    this.dike = this.mesh(geometry(historyIntrusion(kind, this.frame)), this.intrusionStyle.material); this.geology.add(this.dike);
    // This fixed lower feeder is exposed only in the geological cutaway. It
    // does not imply that one episode is feeding the whole mountain history.
    for (let i = 0; i < 6; i++) {
      const flow = new HistoryFlowSurface(historyFlow(i, kind, this.frame), this.grain); this.flows.push(flow); this.scene.add(flow.mesh);
    }
    this.scene.add(this.geology, this.clasts.mesh); this.geology.visible = false;
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
    this.detailMotion = new MagmaDetailMotion(this.updateLiquidPhase, this.publishDetailState);
    canvas.dataset.renderer = 'webgl'; this.setView('landscape', false); this.draw(.08, DEFAULTS); this.resize();
  }
  private keep<T extends THREE.BufferGeometry>(item: T): T { this.geometries.add(item); return item; }
  private keepMaterial<T extends THREE.Material>(item: T): T { this.materials.add(item); return item; }
  private mesh(data: THREE.BufferGeometry, material: THREE.Material) { return new THREE.Mesh(this.keep(data), this.keepMaterial(material)); }
  draw(progress: number, settings: DrawSettings) {
    if (this.disposed) return;
    // Camera/detail invalidations retain this exact geological/ecological
    // snapshot. A lens or authored condition change still prepares its state.
    const snapshot = `${progress}|${settings.chapter}|${settings.aftermath}|${settings.habitat}|${this.view}`;
    this.settings = settings;
    if (snapshot === this.lastSnapshot) { this.render(); return; }
    this.frame = historyFrame(progress, settings.chapter, settings.aftermath, settings.habitat);
    const frame = this.frame, keys = historyGeometryKeys(frame), key = keys.terrain;
    this.followReference();
    if (key !== this.lastTerrain) { replacePositions(this.surface.geometry, historyTerrain(this.kind, frame).positions); this.lastTerrain = key; }
    const sectionKey = keys.section;
    if (this.view === 'section' && sectionKey !== this.lastSection) {
      this.strata.forEach((mesh, i) => { const data = historyStratum(i, this.kind, frame); replacePositions(mesh.geometry, data.positions, data.frontStart); });
      const intrusion = historyIntrusion(this.kind, frame);
      replacePositions(this.dike.geometry, intrusion.positions); this.dike.visible = intrusion.visible;
      this.lastSection = sectionKey;
    }
    if (keys.ecology !== this.lastField) {
      (this.field.image.data as Uint8Array).set(historyField(this.kind, frame)); this.field.needsUpdate = true; this.lastField = keys.ecology;
    }
    const underground = frame.chapter === 'landscape' ? frame.construction : null;
    this.storageStyle.setFrame(frame);
    if (this.view === 'section') { this.storageBody.setFrame(frame); for (const feeder of this.feeders) feeder.setFrame(frame); }
    this.intrusionStyle.heat.value = (underground?.heat ?? 0) * .82;
    const detail = historyUndergroundDetail(frame);
    this.storageStyle.detail.value = detail.storage; this.intrusionStyle.detail.value = detail.intrusion;
    const phase = this.detailMotion.state.phase;
    this.flows.forEach((flow, i) => flow.setFrame(historyFlow(i, this.kind, frame), phase));
    this.clasts.setFrame(historyClasts(this.kind, frame));
    this.storageStyle.detailPhase.value = this.intrusionStyle.detailPhase.value = phase;
    this.detailMotion.setHot(historyDetailHot(frame, this.view, this.flows.filter(flow => flow.active).length));
    let blade = 0, seedIndex = 0;
    this.grass.count = frame.vegetation > 0 ? 2200 : 0;
    this.seeds.count = settings.chapter === 'life' && this.view === 'vent' ? 25 : 0;
    const surface = (x: number, z: number) => historySurface(x, z, this.kind, frame);
    if (this.grass.count || this.seeds.count) for (const site of historySites(this.kind, frame)) {
      if (this.grass.count) for (let j = 0; j < 22; j++) {
        const id = site.index * 22 + j, angle = seed(id + 2501) * Math.PI * 2, r = site.radius * Math.sqrt(seed(id + 411));
        const x = site.x + Math.cos(angle) * r, z = site.z + Math.sin(angle) * r;
        const scale = site.cover * (1 - frame.burial) * (this.view !== 'section' || z < 0 ? 1 : 0);
        this.dummy.position.set(x, surface(x, z) + .004, z); this.dummy.rotation.set(.1 * Math.sin(id), angle, .1 * Math.cos(id));
        const height = .035 + seed(id + 1102) * .06; this.dummy.scale.set(height * .23 * scale, height * scale, height * scale);
        this.dummy.updateMatrix(); this.grass.setMatrixAt(blade, this.dummy.matrix);
        this.color.setHSL(.17 + seed(id + 831) * .045, .25 + seed(id + 95) * .18, .25 + seed(id + 709) * .18); this.grass.setColorAt(blade++, this.color);
      }
      if (this.seeds.count && site.index % 4 === 0) {
        const sample = seedDispersal(site.index, frame.ecology.p, [site.x, site.y + .003, site.z], surface);
        const size = sample.visible && settings.chapter === 'life' && site.cover < .1 ? sample.size : 0;
        this.dummy.position.set(...sample.position); this.dummy.rotation.set(.2, sample.angle, .1);
        this.dummy.scale.set(size * .24, size * .17, size); this.dummy.updateMatrix(); this.seeds.setMatrixAt(seedIndex++, this.dummy.matrix);
      }
    }
    if (this.grass.count) { this.grass.instanceMatrix.needsUpdate = true; if (this.grass.instanceColor) this.grass.instanceColor.needsUpdate = true; }
    if (this.seeds.count) this.seeds.instanceMatrix.needsUpdate = true;
    this.prior.visible = this.view === 'section' && frame.land.erosion > 0;
    this.canvas.dataset.progress = frame.p.toFixed(4); this.canvas.dataset.chapter = settings.chapter;
    this.canvas.dataset.deposits = String(frame.land.deposits.filter(d => d.growth > 0).length);
    this.canvas.dataset.growth = frame.land.growth.toFixed(4); this.canvas.dataset.constructionPhase = frame.construction.phase;
    this.canvas.dataset.activeFlows = String(this.flows.filter(flow => flow.active).length); this.lastSnapshot = snapshot; this.render();
  }
  setView(view: HistoryView, animate = true) {
    if (this.disposed) return;
    this.stopMotion(); this.view = view; this.reference = historyCameraReference(this.kind, this.frame, view, this.camera.aspect); const section = view === 'section';
    this.groundMaterial.clippingPlanes = section ? [this.cut] : []; this.groundMaterial.needsUpdate = true;
    this.flows.forEach(flow => flow.setClipping(section ? [this.cut] : [])); this.clasts.setClipping(section ? [this.cut] : []);
    this.farGround.visible = !section; this.geology.visible = section;
    this.controls.minAzimuthAngle = section ? -.24 : -Infinity; this.controls.maxAzimuthAngle = section ? .24 : Infinity;
    this.controls.minPolarAngle = .15; this.controls.maxPolarAngle = Math.PI * .485;
    this.controls.minDistance = view === 'vent' ? .65 : 2.5; this.controls.maxDistance = 55 * this.reference.scale;
    this.canvas.dataset.projection = view; this.draw(this.frame.p, this.settings); this.moveCamera(animate);
  }
  setDetailMotion(enabled: boolean) { this.detailMotion.setEnabled(enabled); }
  resetDetailPhase() { this.detailMotion.resetPhase(); }
  private updateLiquidPhase = (phase: number) => {
    if (this.disposed) return;
    for (const flow of this.flows) flow.applyPhase(phase);
    this.storageBody.applyPhase(phase); this.intrusionStyle.detailPhase.value = phase;
    this.render();
  };
  private publishDetailState = (state: DetailMotionState) => {
    this.canvas.dataset.detailMotion = state.disposed ? 'disposed' : !state.enabled ? 'paused'
      : state.hidden ? 'hidden' : state.reducedMotion ? 'reduced' : state.running ? 'running' : 'idle';
    this.canvas.dataset.detailEnabled = String(state.enabled); this.canvas.dataset.detailPhase = state.phase.toFixed(6);
  };
  private followReference() {
    const next = historyCameraReference(this.kind, this.frame, this.view, this.camera.aspect), previous = this.reference;
    this.reference = next;
    if (!this.hasSize || this.cameraMoving) return;
    const followed = followHistoryReference(this.camera.position.toArray() as XYZ, this.controls.target.toArray() as XYZ, previous, next);
    this.camera.position.fromArray(followed.position); this.controls.target.fromArray(followed.target);
    this.controls.maxDistance = 55 * next.scale; this.controls.update();
  }
  private pose() {
    const reference = historyCameraReference(this.kind, this.frame, this.view, this.camera.aspect), target = new THREE.Vector3(...reference.target);
    const offset = this.view === 'vent' ? new THREE.Vector3(1.1, 1.7, 2.3) : this.view === 'section' ? new THREE.Vector3(.7, 3, 23)
      : this.kind === 'shield' ? new THREE.Vector3(9, 8, 17) : new THREE.Vector3(8.5, 7.5, 15);
    return { target, position: target.clone().add(offset.multiplyScalar(reference.scale)) };
  }
  private moveCamera(animate: boolean) {
    this.stopMotion(); this.cameraMoving = true; const from = this.camera.position.clone(), target = this.controls.target.clone();
    this.cancelCamera = animateValue({ from: 0, to: 1, duration: animate ? 420 : 0, onUpdate: p => {
      const pose = this.pose(); this.camera.position.lerpVectors(from, pose.position, p); this.controls.target.lerpVectors(target, pose.target, p); this.controls.update(); this.render();
    }, onComplete: () => { this.cameraMoving = false; } });
  }
  resetCamera() { this.moveCamera(true); }
  stopMotion = () => { this.cancelCamera(); this.cancelCamera = () => {}; this.cameraMoving = false; };
  private resize = () => {
    if (this.disposed) return;
    const rect = this.canvas.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return;
    this.renderer.setSize(rect.width, rect.height, false); this.camera.aspect = rect.width / rect.height; this.camera.updateProjectionMatrix();
    if (!this.hasSize) {
      this.reference = historyCameraReference(this.kind, this.frame, this.view, this.camera.aspect); this.hasSize = true; this.moveCamera(false);
    } else { this.stopMotion(); this.followReference(); }
    this.controls.maxDistance = 55 * this.reference.scale; this.render();
  };
  private render = () => this.presentation.request();
  private renderNow() {
    if (this.disposed || !this.hasSize || document.hidden) return;
    this.seeds.visible = this.view === 'vent'; this.renderer.render(this.scene, this.camera);
  }
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
    if (this.disposed) return; this.disposed = true; this.presentation.dispose(); this.stopMotion(); this.detailMotion.dispose(); this.observer.disconnect(); this.controls.dispose();
    this.flows.forEach(flow => flow.dispose()); this.clasts.dispose(); this.storageBody.dispose();
    for (const feeder of this.feeders) feeder.dispose();
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
  private detailEnabled = true;
  private p = .08;
  private settings: DrawSettings = DEFAULTS;
  private view: HistoryView = 'landscape';
  private disposed = false;
  constructor(canvas: HTMLCanvasElement, private kind: Landform) { this.element = canvas; this.mount3D(); }
  private mount3D() {
    const canvas = document.createElement('canvas');
    for (const attr of this.element.attributes) if (!attr.name.startsWith('data-') && attr.name !== 'style' && attr.name !== 'viewBox') canvas.setAttribute(attr.name, attr.value);
    try {
      this.gpu = new LandHistory3D(canvas, this.kind); this.gpu.setDetailMotion(this.detailEnabled); this.element.replaceWith(canvas); this.element = canvas;
      canvas.addEventListener('webglcontextlost', this.contextLost); this.gpu.draw(this.p, this.settings); this.gpu.setView(this.view, false);
      canvas.dispatchEvent(new CustomEvent('volcano-renderer', { bubbles: true }));
    } catch (error) { this.gpu?.dispose(); this.gpu = undefined; console.warn('Land history 3D unavailable; using the teaching illustration.', error); this.fallback(); }
  }
  private fallback() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const attr of this.element.attributes) if (!attr.name.startsWith('data-') && attr.name !== 'style') svg.setAttribute(attr.name, attr.value);
    svg.dataset.renderer = 'svg'; svg.dataset.detailMotion = 'unavailable'; svg.dataset.detailEnabled = String(this.detailEnabled); svg.dataset.detailPhase = '0.000000'; this.element.replaceWith(svg); this.element = svg; this.draw(this.p, this.settings);
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
  setDetailMotion(enabled: boolean) {
    if (this.disposed) return; this.detailEnabled = enabled;
    if (this.gpu) this.gpu.setDetailMotion(enabled); else this.element.dataset.detailEnabled = String(enabled);
  }
  resetDetailPhase() { if (this.gpu) this.gpu.resetDetailPhase(); else this.element.dataset.detailPhase = '0.000000'; }
  resetCamera() { this.gpu?.resetCamera(); }
  stopMotion() { this.gpu?.stopMotion(); }
  retry3D() { if (!this.disposed && !this.gpu) this.mount3D(); }
  dispose() { if (this.disposed) return; this.disposed = true; this.element.removeEventListener('webglcontextlost', this.contextLost); this.gpu?.dispose(); this.gpu = undefined; }
}
