import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  DEFAULT_HYDROTHERMAL_SETTINGS, HOT_ROCK, HYDROTHERMAL_SAMPLES, POOL,
  hydroSeed, hydrothermalFrame, hydrothermalRoute, hydrothermalSample,
  hydrothermalTerrain, poolOutline, poolShore,
  type HydrothermalFrame, type HydrothermalPoint, type HydrothermalSettings, type HydrothermalView,
} from './hydrothermalModel.ts';

type RendererMode = 'webgl' | 'canvas';
type RendererCallback = (mode: RendererMode, canvas?: HTMLCanvasElement) => void;
const WIDTH = 7.2, DEPTH = 6.4, FLOOR = -4.15;
const point = (p: HydrothermalPoint) => new THREE.Vector3(...p);
const grainGLSL = `
float hh(vec3 p){p=fract(p*.3183099+vec3(.11,.27,.43));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float hn(vec3 p){vec3 b=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hh(b),hh(b+vec3(1,0,0)),f.x),mix(hh(b+vec3(0,1,0)),hh(b+vec3(1,1,0)),f.x),f.y),mix(mix(hh(b+vec3(0,0,1)),hh(b+vec3(1,0,1)),f.x),mix(hh(b+vec3(0,1,1)),hh(b+vec3(1,1,1)),f.x),f.y),f.z);}
float hf(vec3 p){return .57*hn(p)+.28*hn(p*2.07)+.15*hn(p*4.13);}
`;
function rockMaterial(facies: number) {
  const material = new THREE.MeshStandardMaterial({ roughness: .96, color: '#777268', side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.vertexShader = `varying vec3 vRock;\n${shader.vertexShader}`.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRock=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader = `varying vec3 vRock;\n${grainGLSL}\n${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
      float macro=hf(vRock*1.5),fine=hn(vRock*71.);
      vec3 stone=mix(vec3(.095,.10,.092),vec3(.20,.165,.12),${(.24 + facies * .08).toFixed(3)});
      stone*=.68+.45*macro+.25*fine;
      float thermal=1.-smoothstep(.78,1.10,length((vRock-vec3(${HOT_ROCK.x},${HOT_ROCK.y},${HOT_ROCK.z}))/vec3(${HOT_ROCK.rx},${HOT_ROCK.ry},${HOT_ROCK.rz})));
      float crystal=hf(vRock*9.6);vec3 hotStone=mix(vec3(.13,.087,.055),vec3(.28,.125,.045),crystal);
      diffuseColor.rgb=mix(stone,hotStone,thermal*.88);
      float relief=.006*hf(vRock*17.)+.002*hn(vRock*80.);
    `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition),r1=cross(dy,normal),r2=cross(normal,dx);float det=dot(dx,r1);
      vec3 bent=abs(det)*normal-sign(det)*(dFdx(relief)*r1+dFdy(relief)*r2);if(dot(bent,bent)>1.e-15)normal=normalize(bent);
    `).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.12,.025,.003)*thermal*(.25+.75*crystal);');
  };
  material.customProgramCacheKey = () => `hydrothermal-rock-${facies}-2`;
  return material;
}
function waterMaterial() {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, clipping: true,
    uniforms: { uPhase: { value: 0 } },
    vertexShader: `attribute float depth;varying float vDepth;varying vec3 vWorld;
      #include <common>
      #include <clipping_planes_pars_vertex>
      void main(){vDepth=depth;vWorld=(modelMatrix*vec4(position,1.)).xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
      #include <clipping_planes_vertex>
      }`,
    fragmentShader: `uniform float uPhase;varying float vDepth;varying vec3 vWorld;
      #include <common>
      #include <clipping_planes_pars_fragment>
      void main(){
      #include <clipping_planes_fragment>
      float depth=1.-exp(-vDepth*5.);vec3 tint=mix(vec3(.12,.36,.32),vec3(.012,.105,.13),depth);
      float wave=sin(vWorld.x*17.+vWorld.z*11.+uPhase*13.)*.5+sin(vWorld.z*27.-vWorld.x*8.+uPhase*9.)*.3;
      vec3 eye=normalize(cameraPosition-vWorld);float fresnel=pow(1.-abs(eye.y),3.);
      tint=mix(tint,vec3(.46,.62,.66),.09+fresnel*.30);tint+=vec3(.15,.17,.16)*pow(max(0.,wave),14.)*.25;
      gl_FragColor=vec4(tint,mix(.25,.94,smoothstep(.008,.3,vDepth)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
}
function horizon(k: number, x: number, z: number) {
  if (k === 0) return hydrothermalTerrain(x, z);
  const levels = [-.1, -1.12, -2.15, -3.22, FLOOR];
  return Math.min(hydrothermalTerrain(x, z), levels[k - 1] + (k < 5 ? .10 * Math.sin(x * 1.3 + z * .55 + k) + .055 * Math.sin(x * 3.1 - z * 1.8) : 0));
}
/** Closed finite strata. Internal roof grids stay out of the drawing range;
 * the fine terrain alone owns the visible outside surface. */
function layerGeometry(unit: number) {
  const nx = 112, nz = 16, rows = 6, p: number[] = [], uv: number[] = [], indices: number[] = [];
  const put = (x: number, y: number, z: number) => { p.push(x, y, z); uv.push(x, y); return p.length / 3 - 1; };
  const plane = (nx + 1) * (nz + 1);
  for (let side = 0; side < 2; side++) for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = -WIDTH + i / nx * WIDTH * 2, z = -DEPTH * j / nz; put(x, horizon(unit + side, x, z), z);
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = i * (nz + 1) + j, b = a + nz + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1, a + plane, a + 1 + plane, b + plane, b + plane, a + 1 + plane, b + 1 + plane);
  }
  const exposedStart = indices.length;
  for (let edge = 0; edge < 4; edge++) {
    const n = edge < 2 ? nx : nz, base = p.length / 3;
    for (let i = 0; i <= n; i++) {
      const x = edge < 2 ? -WIDTH + i / n * WIDTH * 2 : edge === 2 ? -WIDTH : WIDTH;
      const z = edge < 2 ? edge === 0 ? 0 : -DEPTH : -DEPTH * i / n;
      const top = horizon(unit, x, z), bottom = horizon(unit + 1, x, z);
      for (let j = 0; j <= rows; j++) {
        const y = top + (bottom - top) * j / rows, cut = edge === 0 ? .017 * Math.sin(x * 7.2 + y * 8.3) * Math.sin(y * 17. - x * 3.) : 0;
        put(x, y, z + cut);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
      const a = base + i * (rows + 1) + j, b = a + rows + 1; indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals();
  g.setDrawRange(exposedStart, indices.length - exposedStart); return g;
}
function groundGeometry(size: number, nx: number, nz: number, zSize = size) {
  const g = new THREE.PlaneGeometry(size, zSize, nx, nz); g.rotateX(-Math.PI / 2);
  const a = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < a.count; i++) a.setY(i, hydrothermalTerrain(a.getX(i), a.getZ(i)));
  g.computeVertexNormals(); return g;
}
/** One connected landscape surface owns the pool, shore and distant ground.
 * Dense local samples continue into coarse outer bands without a second
 * overlapping plane or a shader-clipped rectangular join. */
export function hydrothermalLandscapeGeometry() {
  const axis = (half: number, segments: number) => {
    const offsets = [.22, .5, .9, 1.5, 2.3, 3.4, 5, 7.2, 10.5, 15, 22, 32, 60 - half];
    return [...offsets.map(d => -half - d), ...Array.from({ length: segments + 1 }, (_, i) => -half + i / segments * half * 2), ...offsets.map(d => half + d)].sort((a, b) => a - b);
  };
  const xs = axis(WIDTH, 160), zs = axis(DEPTH, 128), p = new Float32Array(xs.length * zs.length * 3), indices: number[] = [];
  for (let i = 0; i < xs.length; i++) for (let j = 0; j < zs.length; j++) {
    const at = (i * zs.length + j) * 3; p[at] = xs[i]; p[at + 1] = hydrothermalTerrain(xs[i], zs[j]); p[at + 2] = zs[j];
    if (i < xs.length - 1 && j < zs.length - 1) { const a = i * zs.length + j, b = a + zs.length; indices.push(a, a + 1, b, b, a + 1, b + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
}
/** Solid fracture/wet-film ribbons expose rock contacts, not a hollow tunnel.
 * Thickness and route are explanatory, not mapped apertures or cave geometry. */
function ribbonGeometry(from: number, to: number, width: number, front: number, back: number) {
  const steps = 160, p: number[] = [], indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + (to - from) * i / steps, at = hydrothermalRoute(t), a = hydrothermalRoute(t - .001), b = hydrothermalRoute(t + .001);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length;
    const rough = width * (.8 + .20 * Math.sin(i * 2.1) * Math.sin(i * .83));
    for (const [side, z] of [[-1, front], [1, front], [1, back], [-1, back]]) p.push(at[0] + nx * side * rough, at[1] + ny * side * rough, z);
    if (i < steps) for (let side = 0; side < 4; side++) { const a = i * 4 + side, b = i * 4 + (side + 1) % 4; indices.push(a, b, a + 4, b, b + 4, a + 4); }
  }
  indices.push(0, 2, 1, 0, 3, 2); const end = steps * 4; indices.push(end, end + 1, end + 2, end, end + 2, end + 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

/** Owns one scientific frame and a separately pausable, bounded tracer clock.
 * Views retain the same source, terrain, pool and sample identities. */
export class HydrothermalScene {
  private activeCanvas: HTMLCanvasElement;
  private renderer?: THREE.WebGLRenderer;
  private context?: CanvasRenderingContext2D | null;
  private scene?: THREE.Scene;
  private sun?: THREE.DirectionalLight;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), .025);
  private ground?: THREE.Mesh;
  private outside?: THREE.Mesh;
  private section?: THREE.Group;
  private underground?: THREE.Group;
  private pool?: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private poolCut?: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private wetFilm?: THREE.Mesh;
  private rim?: THREE.InstancedMesh;
  private plug?: THREE.Mesh;
  private samples?: THREE.InstancedMesh;
  private halos?: THREE.InstancedMesh;
  private heatArrows: THREE.ArrowHelper[] = [];
  private frame = hydrothermalFrame(0);
  private view: HydrothermalView = 'section';
  private phase = 0;
  private detailEnabled = false;
  private raf = 0;
  private previousTime = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private observer?: ResizeObserver;
  private intersection?: IntersectionObserver;
  private intersecting = true;
  private disposed = false;
  private rendererError = '';
  private dummy = new THREE.Object3D();
  private manualCamera = false;
  constructor(canvas: HTMLCanvasElement, private onRendererChange?: RendererCallback) {
    this.activeCanvas = canvas; this.initialize();
    document.addEventListener('visibilitychange', this.visibility);
    this.reduced.addEventListener('change', this.visibility);
    this.observe(); this.draw(0, DEFAULT_HYDROTHERMAL_SETTINGS);
  }
  get canvas() { return this.activeCanvas; }
  get is3D() { return !!this.renderer; }
  private notify(mode: RendererMode) {
    this.canvas.dataset.renderer = mode;
    if (this.rendererError) this.canvas.dataset.rendererError = this.rendererError; else delete this.canvas.dataset.rendererError;
    this.publishState(); this.onRendererChange?.(mode, this.canvas);
    this.canvas.dispatchEvent(new CustomEvent('volcano-renderer', { detail: mode, bubbles: true }));
  }
  private initialize() {
    // A disposed/lost WebGL context belongs to its canvas. Re-entering this
    // question must not reuse that context or a previous Canvas2D context.
    this.replaceCanvas(); this.context = undefined; this.rendererError = '';
    let mode: RendererMode = 'webgl';
    try { this.create3D(); }
    catch (error) {
      this.rendererError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      this.releaseGPU(); this.replaceCanvas(); this.context = this.canvas.getContext('2d'); mode = 'canvas';
    }
    this.canvas.addEventListener('keydown', this.keydown); this.canvas.addEventListener('webglcontextlost', this.contextLost);
    // Callback errors are integration failures, not WebGL failures.
    this.notify(mode);
  }
  private replaceCanvas() {
    const old = this.canvas, next = old.cloneNode(false) as HTMLCanvasElement;
    // Retain identity, accessibility and layout attributes; observations are
    // rebuilt by this owner instead of inherited from a disposed renderer.
    for (const key of Object.keys(next.dataset)) delete next.dataset[key];
    old.removeEventListener('keydown', this.keydown); old.removeEventListener('webglcontextlost', this.contextLost);
    old.replaceWith(next); this.activeCanvas = next;
  }
  private ownGeometry(g: THREE.BufferGeometry) { this.geometries.add(g); return g; }
  private ownMaterial<T extends THREE.Material>(m: T) { this.materials.add(m); return m; }
  private mesh(g: THREE.BufferGeometry, m: THREE.Material) { return new THREE.Mesh(this.ownGeometry(g), this.ownMaterial(m)); }
  private create3D() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.06; this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.shadowMap.autoUpdate = false;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#c9d5d5'); this.scene.fog = new THREE.Fog('#c9d5d5', 28, 75);
    this.scene.add(new THREE.HemisphereLight('#c4d9e2', '#584a37', 1.65));
    const sun = this.sun = new THREE.DirectionalLight('#ffe4c7', 2.7); sun.position.set(-7, 15, 11); sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
    sun.shadow.normalBias = .02; sun.shadow.bias = -.00012; this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#9bbdc9', .7); fill.position.set(8, 8, -9); this.scene.add(fill);
    this.camera = new THREE.PerspectiveCamera(37, 1.6, .1, 170);
    this.controls = new OrbitControls(this.camera, this.canvas); this.controls.enableDamping = false; this.controls.enablePan = false;
    this.controls.minDistance = 5; this.controls.maxDistance = 60; this.controls.maxPolarAngle = Math.PI * .49;
    this.controls.addEventListener('start', this.orbitStart); this.controls.addEventListener('change', this.render);
    this.section = new THREE.Group(); this.underground = new THREE.Group(); this.scene.add(this.section, this.underground);
    this.ground = this.mesh(groundGeometry(WIDTH * 2, 160, 128, DEPTH * 2), rockMaterial(0)); this.ground.castShadow = this.ground.receiveShadow = true; this.scene.add(this.ground);
    this.outside = this.mesh(hydrothermalLandscapeGeometry(), rockMaterial(0)); this.outside.castShadow = this.outside.receiveShadow = true; this.scene.add(this.outside);
    for (let k = 0; k < 5; k++) { const layer = this.mesh(layerGeometry(k), rockMaterial(k + 1)); layer.receiveShadow = true; this.section.add(layer); }
    const fault = this.mesh(ribbonGeometry(.105, 1, .105, .026, -.25), new THREE.MeshStandardMaterial({ color: '#5e625a', roughness: 1, side: THREE.DoubleSide })); this.underground.add(fault);
    this.wetFilm = this.mesh(ribbonGeometry(.105, 1, .034, .043, .025), new THREE.MeshPhysicalMaterial({ color: '#358b9f', roughness: .21, metalness: .05, transparent: true, opacity: .8, side: THREE.DoubleSide })); this.underground.add(this.wetFilm);
    const barrier = hydrothermalRoute(.675); this.plug = this.mesh(new THREE.IcosahedronGeometry(.22, 1), rockMaterial(3)); this.plug.position.copy(point(barrier)); this.plug.scale.set(1.25, .8, .7); this.underground.add(this.plug);
    const sampleGeometry = this.ownGeometry(new THREE.IcosahedronGeometry(1, 1));
    this.samples = new THREE.InstancedMesh(sampleGeometry, this.ownMaterial(new THREE.MeshPhysicalMaterial({ color: '#5bbed4', roughness: .18, metalness: .03, clearcoat: 1 })), HYDROTHERMAL_SAMPLES);
    this.halos = new THREE.InstancedMesh(sampleGeometry, this.ownMaterial(new THREE.MeshBasicMaterial({ color: '#d9ac60', transparent: true, opacity: .24, depthWrite: false })), HYDROTHERMAL_SAMPLES);
    this.samples.frustumCulled = this.halos.frustumCulled = false; this.samples.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.halos.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.samples, this.halos);
    for (let i = 0; i < 4; i++) {
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1.35 + i * .6, -1.92, .09), .46, '#be8d4a', .10, .055);
      arrow.line.geometry = this.ownGeometry(arrow.line.geometry.clone()); arrow.cone.geometry = this.ownGeometry(arrow.cone.geometry.clone());
      for (const child of [arrow.line, arrow.cone]) for (const m of Array.isArray(child.material) ? child.material : [child.material]) this.materials.add(m);
      this.heatArrows.push(arrow); this.underground.add(arrow);
    }
    this.createPool(); this.createRim(); this.applyView(); this.renderer.shadowMap.needsUpdate = true;
  }
  private createPool() {
    const rings = 20, angles = 96, p = new Float32Array((rings + 1) * (angles + 1) * 3), depth = new Float32Array(p.length / 3), indices: number[] = [];
    for (let i = 0; i < rings; i++) for (let j = 0; j < angles; j++) { const a = i * (angles + 1) + j, b = a + angles + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('depth', new THREE.BufferAttribute(depth, 1)); g.setIndex(indices);
    this.pool = this.mesh(g, waterMaterial()) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>; this.scene!.add(this.pool);
    const cp = new Float32Array(97 * 6), cd = new Float32Array(97 * 2), ci: number[] = [];
    for (let i = 0; i < 96; i++) { const a = i * 2; ci.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const cap = new THREE.BufferGeometry(); cap.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cap.setAttribute('depth', new THREE.BufferAttribute(cd, 1)); cap.setIndex(ci);
    this.poolCut = this.mesh(cap, waterMaterial()) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>; this.section!.add(this.poolCut);
  }
  private createRim() {
    const rim = this.rim = new THREE.InstancedMesh(this.ownGeometry(new THREE.IcosahedronGeometry(1, 1)), this.ownMaterial(rockMaterial(1)), 72);
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * Math.PI * 2, r = 1.02 + hydroSeed(i + 32) * .15, x = POOL.x + Math.cos(a) * POOL.rx * r, z = POOL.z + Math.sin(a) * POOL.rz * r;
      const size = .045 + hydroSeed(i + 81) * .08; this.dummy.position.set(x, hydrothermalTerrain(x, z) + size * .2, z); this.dummy.scale.set(size * 1.5, size * .6, size); this.dummy.rotation.set(i, i * .9, 0); this.dummy.updateMatrix(); rim.setMatrixAt(i, this.dummy.matrix);
    }
    rim.castShadow = rim.receiveShadow = true; this.scene!.add(rim);
  }
  private updatePool() {
    if (!this.pool || !this.poolCut) return;
    const f = this.frame, wet = f.pool > 0; this.pool.visible = this.poolCut.visible = wet;
    if (!wet) return;
    const p = this.pool.geometry.getAttribute('position') as THREE.BufferAttribute, d = this.pool.geometry.getAttribute('depth') as THREE.BufferAttribute;
    for (let ring = 0; ring <= 20; ring++) for (let j = 0; j <= 96; j++) {
      const edge = poolShore(j / 96 * Math.PI * 2, f), u = ring / 20, x = POOL.x + (edge[0] - POOL.x) * u, z = POOL.z + (edge[2] - POOL.z) * u, at = ring * 97 + j;
      p.setXYZ(at, x, f.waterLevel, z); d.setX(at, Math.max(0, f.waterLevel - hydrothermalTerrain(x, z)));
    }
    p.needsUpdate = d.needsUpdate = true; this.pool.geometry.computeBoundingSphere();
    const cp = this.poolCut.geometry.getAttribute('position') as THREE.BufferAttribute, cd = this.poolCut.geometry.getAttribute('depth') as THREE.BufferAttribute;
    for (let i = 0; i <= 96; i++) {
      const x = POOL.x - POOL.rx * 1.12 + i / 96 * POOL.rx * 2.24, bed = Math.min(f.waterLevel, hydrothermalTerrain(x, 0));
      cp.setXYZ(i * 2, x, f.waterLevel, .03); cp.setXYZ(i * 2 + 1, x, bed, .03); cd.setX(i * 2, 0); cd.setX(i * 2 + 1, f.waterLevel - bed);
    }
    cp.needsUpdate = cd.needsUpdate = true; this.poolCut.geometry.computeBoundingSphere();
  }
  private updateSamples() {
    if (!this.samples || !this.halos) return;
    for (let id = 0; id < HYDROTHERMAL_SAMPLES; id++) {
      const s = hydrothermalSample(id, this.frame, this.phase), visible = s.visible && (this.view === 'section' || s.t < .105 || s.t > .94);
      this.dummy.position.copy(point(s.position)); this.dummy.rotation.set(0, 0, s.t < .1 ? 0 : Math.atan2(s.direction[1], s.direction[0]) - Math.PI / 2);
      this.dummy.scale.set(visible ? s.width : 0, visible ? s.width * (s.t < .1 ? 3 : 1.65) : 0, visible ? s.width : 0); this.dummy.updateMatrix(); this.samples.setMatrixAt(id, this.dummy.matrix);
      this.dummy.scale.multiplyScalar(1.9 * s.heat); this.dummy.updateMatrix(); this.halos.setMatrixAt(id, this.dummy.matrix);
    }
    this.samples.instanceMatrix.needsUpdate = this.halos.instanceMatrix.needsUpdate = true;
    this.pool!.material.uniforms.uPhase.value = this.phase; this.poolCut!.material.uniforms.uPhase.value = this.phase;
  }
  draw(progress: number, settings: HydrothermalSettings = DEFAULT_HYDROTHERMAL_SETTINGS) {
    if (this.disposed) return; this.frame = hydrothermalFrame(progress, settings);
    if (this.renderer) {
      const length = Math.max(0, Math.min(1, (this.frame.wetFront - .105) / .895)); this.wetFilm!.visible = this.frame.recharge > 0;
      this.wetFilm!.geometry.setDrawRange(0, Math.floor(length * 160) * 24); this.plug!.visible = !this.frame.settings.connected;
      this.heatArrows.forEach(a => { a.visible = this.frame.heating > 0; }); this.updatePool(); this.updateSamples(); this.render();
    } else this.drawCanvas();
    this.syncMotion();
  }
  private applyView() {
    if (!this.renderer) return;
    const planes = this.view === 'section' ? [this.cut] : [];
    this.ground!.material instanceof THREE.Material && (this.ground!.material.clippingPlanes = planes);
    const rimMaterial = this.rim!.material as THREE.Material; rimMaterial.clippingPlanes = planes; rimMaterial.needsUpdate = true;
    this.pool!.material.clippingPlanes = planes; this.pool!.material.needsUpdate = true;
    this.ground!.material instanceof THREE.Material && (this.ground!.material.needsUpdate = true);
    this.section!.visible = this.underground!.visible = this.ground!.visible = this.view === 'section'; this.outside!.visible = this.view === 'landscape';
    this.controls!.minDistance = this.view === 'section' ? 5 : 2.5;
    this.controls!.minAzimuthAngle = this.view === 'section' ? -.8 : -Infinity; this.controls!.maxAzimuthAngle = this.view === 'section' ? .8 : Infinity;
    this.manualCamera = false; this.fitCamera(); this.renderer.shadowMap.needsUpdate = true;
  }
  setView(view: HydrothermalView) {
    if (this.disposed || this.view === view) return; this.view = view; this.applyView(); this.updateSamples(); this.render(); if (!this.renderer) this.drawCanvas();
    this.publishState();
  }
  resetCamera() { if (this.disposed) return; this.manualCamera = false; this.fitCamera(); this.render(); }
  private fitCamera() {
    if (!this.camera || this.manualCamera) return;
    const aspect = this.camera.aspect, section = this.view === 'section', target = new THREE.Vector3(section ? 0 : POOL.x, section ? -.1 : .42, section ? -1 : POOL.z);
    const direction = new THREE.Vector3(section ? .07 : .42, section ? .21 : 1.18, 1).normalize(), right = new THREE.Vector3(direction.z, 0, -direction.x).normalize(), up = new THREE.Vector3().crossVectors(direction, right);
    const points: THREE.Vector3[] = section ? [new THREE.Vector3(-WIDTH, FLOOR, 0), new THREE.Vector3(WIDTH, FLOOR, 0), new THREE.Vector3(-WIDTH, 2, -DEPTH), new THREE.Vector3(WIDTH, 2, -DEPTH), new THREE.Vector3(-4.7, 3.8, .1)] : Array.from({ length: 32 }, (_, i) => {
      const angle = i / 32 * Math.PI * 2, radius = 1.32 * poolOutline(angle), x = POOL.x + Math.cos(angle) * POOL.rx * radius, z = POOL.z + Math.sin(angle) * POOL.rz * radius;
      return new THREE.Vector3(x, hydrothermalTerrain(x, z), z);
    });
    if (!section) points.push(new THREE.Vector3(POOL.x, POOL.bottom, POOL.z));
    let distance = section ? 6 : 3.5; const tan = Math.tan(37 * Math.PI / 360);
    for (const p of points) { const q = p.sub(target), z = q.dot(direction); distance = Math.max(distance, z + Math.abs(q.dot(right)) / (tan * aspect * .86), z + Math.abs(q.dot(up)) / (tan * .86)); }
    this.camera.position.copy(target).addScaledVector(direction, distance); this.controls!.target.copy(target); this.controls!.update();
  }
  private orbitStart = () => { this.manualCamera = true; };
  private keydown = (event: KeyboardEvent) => {
    if (!this.renderer) return;
    if (event.key === 'Home') { event.preventDefault(); this.resetCamera(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '−'].includes(event.key)) return;
    event.preventDefault(); this.manualCamera = true;
    const offset = this.camera!.position.clone().sub(this.controls!.target), spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += event.key === 'ArrowLeft' ? -.08 : event.key === 'ArrowRight' ? .08 : 0;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + (event.key === 'ArrowUp' ? -.06 : event.key === 'ArrowDown' ? .06 : 0), .18, Math.PI * .48);
    const scale = event.key === '+' || event.key === '=' ? .9 : event.key === '-' || event.key === '−' ? 1 / .9 : 1;
    spherical.radius = THREE.MathUtils.clamp(spherical.radius * scale, this.controls!.minDistance, this.controls!.maxDistance);
    if (this.view === 'section') spherical.theta = THREE.MathUtils.clamp(spherical.theta, -.8, .8);
    this.camera!.position.copy(this.controls!.target).add(new THREE.Vector3().setFromSpherical(spherical)); this.controls!.update(); this.render();
  };
  private render = () => { if (!this.disposed && this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera); };
  private observe() {
    this.observer?.disconnect(); this.intersection?.disconnect();
    this.observer = new ResizeObserver(this.resize); this.observer.observe(this.canvas);
    this.intersection = new IntersectionObserver(entries => { this.intersecting = entries[0]?.isIntersecting ?? false; this.syncMotion(); }); this.intersection.observe(this.canvas); this.resize();
  }
  private resize = () => {
    if (this.disposed) return; const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) { this.cancelFrame(); this.publishState(); return; }
    if (this.renderer) { this.renderer.setSize(rect.width, rect.height, false); this.camera!.aspect = rect.width / rect.height; this.camera!.updateProjectionMatrix(); this.fitCamera(); this.render(); }
    else { const ratio = Math.min(devicePixelRatio || 1, 1.5); this.canvas.width = Math.round(rect.width * ratio); this.canvas.height = Math.round(rect.height * ratio); this.drawCanvas(); }
    this.syncMotion();
  };
  setDetailMotion(enabled: boolean) { if (this.disposed) return; this.detailEnabled = enabled; this.syncMotion(); }
  /** Suspend current work while retaining the user's detail-motion choice. */
  stopMotion() { this.cancelFrame(); this.publishState(); }
  private visible() { const rect = this.canvas.getBoundingClientRect(); return this.intersecting && !document.hidden && rect.width > 1 && rect.height > 1 && getComputedStyle(this.canvas).visibility !== 'hidden'; }
  /** Read-only mirrors for inspection; data attributes never drive the model. */
  private publishState() {
    Object.assign(this.canvas.dataset, {
      progress: this.frame.p.toFixed(4), projection: this.view, journeyStage: String(this.frame.stage),
      supply: this.frame.settings.supply.toFixed(4), connected: String(this.frame.settings.connected),
      poolFill: this.frame.pool.toFixed(6), waterLevel: this.frame.waterLevel.toFixed(6),
      detailEnabled: String(this.detailEnabled), detailPhase: this.phase.toFixed(6),
      detailMotion: this.disposed ? 'disposed' : !this.detailEnabled ? 'paused' : !this.visible() ? 'hidden'
        : this.reduced.matches ? 'reduced' : this.raf ? 'running' : 'idle',
    });
  }
  private syncMotion() {
    if (this.admitDetail()) { if (!this.raf) this.raf = requestAnimationFrame(this.tick); } else this.cancelFrame();
    this.publishState();
  }
  private admitDetail() {
    return this.detailEnabled && !this.reduced.matches && !this.disposed
      && this.frame.settings.supply > 0 && this.frame.wetFront > 0 && this.visible();
  }
  private cancelFrame() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.previousTime = 0; }
  private tick = (now: number) => {
    this.raf = 0; if (!this.admitDetail()) { this.previousTime = 0; this.publishState(); return; }
    const dt = this.previousTime ? Math.min(.05, (now - this.previousTime) / 1000) : 0; this.previousTime = now; this.phase = (this.phase + dt * .045) % 1;
    if (this.renderer) { this.updateSamples(); this.render(); } else this.drawCanvas(); this.raf = requestAnimationFrame(this.tick); this.publishState();
  };
  private visibility = () => { this.syncMotion(); };
  private contextLost = (event: Event) => {
    event.preventDefault(); if (this.disposed) return; this.rendererError = 'webglcontextlost'; this.cancelFrame(); this.releaseGPU(); this.replaceCanvas(); this.context = this.canvas.getContext('2d');
    this.canvas.addEventListener('keydown', this.keydown); this.notify('canvas'); this.observe(); this.drawCanvas(); this.syncMotion();
  };
  retry3D() {
    if (this.disposed || this.renderer) return; this.cancelFrame(); this.observer?.disconnect(); this.intersection?.disconnect(); this.initialize(); this.observe(); this.draw(this.frame.p, this.frame.settings);
  }
  private releaseGPU() {
    this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.controls?.removeEventListener('change', this.render); this.controls?.removeEventListener('start', this.orbitStart); this.controls?.dispose(); this.controls = undefined;
    this.sun?.shadow.dispose(); this.sun = undefined;
    this.scene?.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
    for (const g of this.geometries) g.dispose(); for (const m of this.materials) m.dispose(); this.geometries.clear(); this.materials.clear();
    this.renderer?.dispose(); this.renderer?.forceContextLoss(); this.renderer = undefined; this.scene = undefined; this.camera = undefined; this.heatArrows = [];
  }
  /** The Canvas fallback consumes the exact same frame and liquid tracers.
   * Its section is intentionally a two-dimensional explanatory projection. */
  private drawCanvas() {
    const ctx = this.context; if (!ctx || this.disposed) return;
    const w = this.canvas.width, h = this.canvas.height, scale = Math.min(w / 15.8, h / 8.7), ox = w / 2, oy = h * .47;
    const project = (x: number, y: number) => [ox + x * scale, oy - y * scale] as const;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#ccd8d9'; ctx.fillRect(0, 0, w, h);
    for (let k = 4; k >= 0; k--) {
      ctx.beginPath(); for (let i = 0; i <= 144; i++) { const x = -WIDTH + i / 144 * WIDTH * 2, [px, py] = project(x, horizon(k, x, 0)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      for (let i = 144; i >= 0; i--) { const x = -WIDTH + i / 144 * WIDTH * 2; ctx.lineTo(...project(x, horizon(k + 1, x, 0))); }
      ctx.closePath(); ctx.fillStyle = ['#766f5d', '#655f51', '#73624e', '#5a5950', '#55564e'][k]; ctx.fill();
    }
    const [hx, hy] = project(HOT_ROCK.x, HOT_ROCK.y), glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, HOT_ROCK.rx * scale);
    glow.addColorStop(0, 'rgba(167,78,26,.7)'); glow.addColorStop(.65, 'rgba(130,66,27,.48)'); glow.addColorStop(1, 'rgba(130,66,27,0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(hx, hy, HOT_ROCK.rx * scale, HOT_ROCK.ry * scale, -.12, 0, Math.PI * 2); ctx.fill();
    const path = (end: number) => { ctx.beginPath(); for (let i = 0; i <= 160; i++) { const t = .105 + (end - .105) * i / 160, p = hydrothermalRoute(t); i ? ctx.lineTo(...project(p[0], p[1])) : ctx.moveTo(...project(p[0], p[1])); } };
    path(1); ctx.strokeStyle = '#424a43'; ctx.lineWidth = scale * .15; ctx.stroke();
    if (this.frame.recharge > 0) { path(this.frame.wetFront); ctx.strokeStyle = '#438da0'; ctx.lineWidth = scale * .045; ctx.stroke(); }
    if (!this.frame.settings.connected) { const p = hydrothermalRoute(.675), [x, y] = project(p[0], p[1]); ctx.fillStyle = '#807866'; ctx.fillRect(x - scale * .12, y - scale * .16, scale * .24, scale * .32); }
    if (this.frame.pool > 0) {
      ctx.beginPath(); for (let i = 0; i <= 96; i++) { const x = POOL.x - POOL.rx * 1.1 + i / 96 * POOL.rx * 2.2, bed = hydrothermalTerrain(x, 0); if (bed < this.frame.waterLevel) ctx.lineTo(...project(x, bed)); }
      for (let i = 96; i >= 0; i--) { const x = POOL.x - POOL.rx * 1.1 + i / 96 * POOL.rx * 2.2; if (hydrothermalTerrain(x, 0) < this.frame.waterLevel) ctx.lineTo(...project(x, this.frame.waterLevel)); }
      ctx.closePath(); ctx.fillStyle = '#387f88'; ctx.fill();
    }
    for (let id = 0; id < HYDROTHERMAL_SAMPLES; id++) {
      const s = hydrothermalSample(id, this.frame, this.phase); if (!s.visible) continue;
      const [x, y] = project(s.position[0], s.position[1]); if (s.heat > .1) { ctx.fillStyle = `rgba(223,170,80,${s.heat * .3})`; ctx.beginPath(); ctx.arc(x, y, scale * .065, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#80c8dc'; ctx.beginPath(); ctx.ellipse(x, y, scale * s.width, scale * s.width * 1.8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.cancelFrame(); this.observer?.disconnect(); this.intersection?.disconnect();
    this.publishState();
    document.removeEventListener('visibilitychange', this.visibility); this.reduced.removeEventListener('change', this.visibility);
    this.canvas.removeEventListener('keydown', this.keydown); this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.releaseGPU(); this.context = undefined;
  }
}
