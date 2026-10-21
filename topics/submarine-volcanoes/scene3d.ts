import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { animateValue } from '../../src/visuals/transition.ts';
import { type Environment, type Supply } from './model.ts';
import { createScene, type SceneFrame } from './scene.ts';
import { deepVentFraming, depositBuffers, oceanGeometryFrame, oceanParcels, pillowPitch, pillowPose, pillowShape, RADIUS, SCALE, sectionBuffers, seed, settledFragment, surfaceHeight, updateDeposit, WATER_Y, worldY, type OceanGeometryFrame, type SolidBuffers } from './geometry3d.ts';
import { compositeMaterial, oceanBackground, oceanUniforms, plumeMaterial, stoneMaterial, stoneNoise, waterMaterial } from './materials3d.ts';

export type OceanView = 'landscape' | 'ocean' | 'section' | 'vent';
type Deposit = { mesh: THREE.Mesh; face: THREE.Mesh; unit: number; key: string };

function fromBuffers(data: SolidBuffers) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
  geometry.setIndex(data.indices); geometry.computeVertexNormals(); return geometry;
}

/** No process timer: all geometry, heat, plumes and water detail consume one frame.
 * Only finite camera transitions request frames independently of playback. */
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
  private flowRock = this.stone('pillow', .71);
  private oldPillowRock = this.stone('pillow', .27);
  private pillowRocks = Array.from({ length: 14 }, (_, i) => this.stone('pillow', seed(i, 321)));
  private deposits: Deposit[] = [];
  private oldPillows: THREE.InstancedMesh[] = [];
  private rubble: THREE.InstancedMesh;
  private lobes: THREE.Mesh[] = [];
  private fragments: THREE.InstancedMesh;
  private sectionGroup = new THREE.Group();
  private host = new THREE.Group();
  private feeder: THREE.Mesh;
  private flow: THREE.Mesh;
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
  private cancelCamera = () => {};
  private moving = false;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private size = new THREE.Vector2();

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
      this.plumeScene.add(this.mesh(new THREE.PlaneGeometry(2, 2), this.plume.material));
      this.composite.add(this.mesh(new THREE.PlaneGeometry(2, 2), compositeMaterial(this.sceneTarget.texture, this.plumeTarget.texture)));
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
      for (const [i, material] of this.pillowRocks.entries()) {
        const lobe = this.mesh(pillows[i % pillows.length], material.material); this.host.add(lobe); this.lobes.push(lobe);
      }
      this.fragments = this.instances(angular, this.tuff.material, 49); this.host.add(this.fragments);

      const storage = new THREE.IcosahedronGeometry(1, 4), v = storage.getAttribute('position');
      for (let i = 0; i < v.count; i++) {
        const x = v.getX(i), y = v.getY(i), z = v.getZ(i);
        const w = 1 + .10 * Math.sin(x * 7 + z * 4) * Math.sin(y * 9 + x * 3) + .045 * Math.cos(z * 17);
        v.setXYZ(i, x * w, y * w, z * w);
      }
      storage.computeVertexNormals();
      const body = this.mesh(storage, this.magma.material); body.scale.set(1.9, .53, .95); body.position.set(-.22, -1.22, -.06); this.sectionGroup.add(body);
      const branch = this.mesh(storage, this.magma.material); branch.scale.set(.93, .29, .59); branch.position.set(1.30, -.70, -.08); this.sectionGroup.add(branch);
      const feederData = new THREE.CylinderGeometry(1, 1, 1, 12, 32, false);
      this.feeder = this.mesh(feederData, this.magma.material); this.sectionGroup.add(this.feeder);
      this.flow = this.mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 48, false), this.flowRock.material); this.host.add(this.flow);
      this.observer = new ResizeObserver(this.resize); this.observer.observe(canvas);
      this.resize();
    } catch (error) { this.dispose(); throw error; }
  }

  private stone(kind: Parameters<typeof stoneMaterial>[2], variation?: number) {
    const rock = stoneMaterial(this.noise, this.uniforms, kind, variation); this.materials.add(rock.material); return rock;
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
    const oldCount = frame.environment === 'deep' ? 220 : frame.environment === 'island' ? 120 : 18;
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
      this.rubble.setColorAt(i, this.color.setScalar(.55 + seed(i, 10) * .6));
      if (i < oldCount) {
        const chain = Math.floor(i / 20), along = i % 20;
        const r = frame.environment === 'deep' ? .70 + along / 19 * 3.65 + seed(i, 11) * .23
          : frame.environment === 'shallow' ? 2 + Math.sqrt(seed(i, 11)) * 5.2 : Math.sqrt(seed(i, 11)) * 7.2;
        const bearing = frame.environment === 'deep' ? seed(chain, 41) * Math.PI * 2 + .18 * Math.sin(along * .49 + chain) : angle;
        const px = Math.cos(bearing) * r, pz = Math.sin(bearing) * r;
        const extent = .16 + seed(i, 12) * .22;
        const through = frame.environment === 'island' ? 7 : frame.contacts.length - 1, heading = -bearing + (seed(i, 42) - .5) * .6;
        this.dummy.position.set(px, surfaceHeight(frame, px, pz, through) - extent * .08, pz);
        this.dummy.rotation.set((seed(i, 13) - .5) * .20, heading, pillowPitch(frame, px, pz, heading, through), 'YXZ');
        this.dummy.scale.set(extent * (1.1 + seed(i, 15) * .65), extent, extent * (.85 + seed(i, 43) * .25)); this.dummy.updateMatrix();
        const group = this.oldPillows[i % this.oldPillows.length], index = Math.floor(i / this.oldPillows.length);
        group.setMatrixAt(index, this.dummy.matrix);
        group.setColorAt(index, this.color.setRGB(.66 + seed(i, 16) * .28, .68 + seed(i, 16) * .27, .65 + seed(i, 16) * .28));
      }
    }
    this.rubble.instanceMatrix.needsUpdate = true; if (this.rubble.instanceColor) this.rubble.instanceColor.needsUpdate = true;
    this.oldPillows.forEach((mesh, i) => {
      mesh.count = Math.max(0, Math.ceil((oldCount - i) / this.oldPillows.length)); mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    this.renderer.shadowMap.needsUpdate = true;
  }
  private products(frame: OceanGeometryFrame) {
    this.lobes.forEach((mesh, index) => {
      const pose = pillowPose(frame, index);
      mesh.visible = frame.environment === 'deep' && pose.growth > .0001;
      mesh.position.set(...pose.center); mesh.rotation.set(0, pose.heading, pose.pitch, 'YXZ');
      const r = pose.radius * Math.cbrt(pose.growth);
      mesh.scale.set(r * 1.35, r * .82, r * .9); this.pillowRocks[index].heat.value = pose.skinHeat * 1.9;
    });
    this.fragments.visible = frame.environment === 'shallow';
    if (this.fragments.visible) {
      for (let i = 0; i < 49; i++) {
        const packet = settledFragment(frame, i);
        this.dummy.position.set(...packet.position); this.dummy.rotation.set(i, i * .7, i * .4, 'XYZ');
        this.dummy.scale.setScalar(packet.visible ? .025 + seed(i, 30) * .037 : 0); this.dummy.updateMatrix();
        this.fragments.setMatrixAt(i, this.dummy.matrix);
      }
      this.fragments.instanceMatrix.needsUpdate = true;
    }
    const top = surfaceHeight(frame, 0, 0), pos = this.feeder.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      // Cylinder's stable UV owns the advancing feeder's vertical coordinate.
      const source = this.feeder.geometry.getAttribute('oceanSource'), q = source.getY(i) + .5;
      pos.setXYZ(i, -.13 + .10 * Math.sin(q * 8) + source.getX(i) * .055, -1.28 + (top + 1.28) * q, source.getZ(i) * .43 - .04);
    }
    pos.needsUpdate = true; this.feeder.geometry.computeVertexNormals(); this.feeder.geometry.computeBoundingSphere();
    this.magma.heat.value = .32 + frame.state.activity * .30;
    this.flow.visible = false;
    if (frame.environment === 'island') {
      const unit = [...frame.history.units].reverse().find(u => u.growth > 0 && u.growth < 1);
      if (unit && unit.phase !== 'shallow-fragments' && frame.p < .80) {
        const vertices = this.flow.geometry.getAttribute('position') as THREE.BufferAttribute, source = this.flow.geometry.getAttribute('oceanSource');
        const side = unit.index % 2 ? 1 : -1;
        for (let i = 0; i < vertices.count; i++) {
          const q = source.getY(i) + .5;
          const x = (unit.center - 500) * SCALE + side * unit.width * SCALE * (.12 + unit.growth * .65) * q;
          const z = .15 + q * (.55 + unit.growth * 1.2) + Math.sin(q * 5 + unit.index) * .08;
          const radius = .055 * Math.pow(Math.max(.01, Math.sin(q * Math.PI)), .3);
          const across = source.getX(i) * radius;
          vertices.setXYZ(i, x + across, surfaceHeight(frame, x + across, z) + .012 + (1 + source.getZ(i)) * radius * .35, z);
        }
        vertices.needsUpdate = true; this.flow.geometry.computeVertexNormals(); this.flow.geometry.computeBoundingSphere();
        this.flow.visible = true; this.flowRock.heat.value = Math.sin(unit.growth * Math.PI) * 1.7;
      }
    }
    this.hotLight.position.set(0, top + .2, .1); this.hotLight.intensity = frame.state.activity * 5;
  }
  private packets(frame: OceanGeometryFrame) {
    const uniforms = this.plume.uniforms, density = uniforms.uDensity.value;
    density.fill(0); const min = uniforms.uMin.value.set(Infinity, Infinity, Infinity), max = uniforms.uMax.value.set(-Infinity, -Infinity, -Infinity);
    oceanParcels(frame).forEach((p, i) => {
      const [x, y, z] = p.center, radius = Math.max(.01, p.radius);
      uniforms.uParcels.value[i].set(x, y, z, radius); uniforms.uAxes.value[i].set(...p.axes); density[i] = p.density;
      if (p.density < .001) return;
      // Domain warp stays inside this conservative bound, including fine wisps.
      const ex = radius * p.axes[0] + .12, ey = radius * p.axes[1] + .12, ez = radius * p.axes[2] + .12;
      min.min(new THREE.Vector3(x - ex, y - ey, z - ez)); max.max(new THREE.Vector3(x + ex, y + ey, z + ez));
    });
    this.hasPlume = density.some(value => value > .001);
    if (!this.hasPlume) { min.set(0, 0, 0); max.set(0, 0, 0); }
  }

  setView(view: OceanView) {
    if (this.view === view && this.hasSize) return;
    this.view = view;
    const section = view === 'section'; this.sectionGroup.visible = section; this.uniforms.cutaway.value = section ? 1 : 0;
    for (const material of [this.rock.material, this.tuff.material, this.oldPillowRock.material, ...this.pillowRocks.map(r => r.material), this.flowRock.material]) {
      material.clippingPlanes = section ? [this.cut] : []; material.clipShadows = section;
      material.needsUpdate = true;
    }
    this.controls.minAzimuthAngle = section ? -.6 : -Infinity;
    this.controls.maxAzimuthAngle = section ? .6 : Infinity;
    this.renderer.shadowMap.needsUpdate = true;
    this.moveCamera(true);
  }
  private cameraFrame() {
    const top = worldY(this.current.state.summit), deep = this.current.environment === 'deep';
    const scale = Math.max(1, .98 / this.camera.aspect);
    if (this.view === 'vent') {
      if (deep) {
        const framing = deepVentFraming(this.current, this.camera.aspect);
        return { target: new THREE.Vector3(...framing.target), offset: new THREE.Vector3(...framing.offset) };
      }
      return { target: new THREE.Vector3(0, top + .12, .35), offset: new THREE.Vector3(1.8, 1.45, 4.5).multiplyScalar(scale) };
    }
    if (this.view === 'section') return { target: new THREE.Vector3(0, Math.max(.3, top * .43), 0), offset: new THREE.Vector3(2, 3.3, 20).multiplyScalar(scale) };
    if (this.view === 'ocean') return { target: new THREE.Vector3(0, 3.2, 0), offset: new THREE.Vector3(13, 7.8, 22).multiplyScalar(scale) };
    const extent = this.current.environment === 'island' ? Math.max(3.5, this.current.state.building * 8.7) : deep ? 6.9 : 9.5;
    return { target: new THREE.Vector3(0, top * .48 + .15, 0), offset: new THREE.Vector3(extent * .55, extent * .55 + .5, extent * 1.9).multiplyScalar(scale) };
  }
  private moveCamera(animate: boolean) {
    this.stopMotion(); const target = this.cameraFrame(), from = this.controls.target.clone(), eye = this.camera.position.clone();
    const position = target.target.clone().add(target.offset);
    if (!animate) { this.controls.target.copy(target.target); this.camera.position.copy(position); this.controls.update(); return; }
    this.moving = true;
    this.cancelCamera = animateValue({ from: 0, to: 1, duration: 700, onUpdate: q => {
      this.controls.target.lerpVectors(from, target.target, q); this.camera.position.lerpVectors(eye, position, q); this.controls.update(); this.render();
    }, onComplete: () => { this.moving = false; } });
  }
  resetCamera() { this.moveCamera(true); }
  stopMotion = () => { this.cancelCamera(); this.moving = false; };
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
  private render = () => {
    if (this.disposed || !this.hasSize || document.hidden) return;
    const closeDeep = this.current.environment === 'deep' && this.view === 'vent';
    this.rov.position.copy(this.camera.position).add(new THREE.Vector3(-1.8, closeDeep ? 1.1 : 1.7, -.6)); this.rov.target.position.copy(this.controls.target);
    if (closeDeep) this.rov.target.position.set(0, worldY(this.current.state.summit) + .12, .35);
    this.rov.intensity = this.current.environment === 'deep' ? closeDeep ? 56 : 48 : 20;
    this.plume.uniforms.uLamp.value.copy(this.rov.position); this.plume.uniforms.uLampTarget.value.copy(this.rov.target.position);
    if (this.current.environment === 'deep') this.renderer.shadowMap.needsUpdate = true;
    this.fill.position.copy(this.camera.position).add(new THREE.Vector3(3, .5, 1));
    if (!this.hasPlume) { this.renderer.setRenderTarget(null); this.renderer.render(this.scene, this.camera); return; }
    this.renderer.setRenderTarget(this.sceneTarget); this.renderer.render(this.scene, this.camera);
    this.plume.uniforms.uInverse.value.multiplyMatrices(this.camera.matrixWorld, this.camera.projectionMatrixInverse);
    this.renderer.setRenderTarget(this.plumeTarget); this.renderer.setClearColor(0, 0); this.renderer.clear(); this.renderer.render(this.plumeScene, this.camera);
    this.renderer.setRenderTarget(null); this.renderer.setClearColor(0, 1); this.renderer.render(this.composite, this.screenCamera);
  };
  draw(progress: number, environment: Environment, supply: Supply) {
    if (this.disposed) return;
    const changed = `${progress}|${environment}|${supply}` !== `${this.current.p}|${this.current.environment}|${this.current.supply}`;
    const oldTarget = this.cameraFrame(); this.current = oceanGeometryFrame(progress, environment, supply);
    const key = `${environment}|${supply}`;
    if (key !== this.environmentKey) { this.environmentKey = key; this.rebuild(); }
    this.uniforms.deep.value = environment === 'deep' ? 1 : 0; this.uniforms.clock.value = progress;
    this.sun.intensity = environment === 'deep' ? 0 : 2.7; this.sun.castShadow = environment !== 'deep';
    this.ambient.intensity = environment === 'deep' ? .08 : .95;
    this.rov.intensity = environment === 'deep' ? 48 : 20; this.rov.castShadow = environment === 'deep';
    this.fill.intensity = environment === 'deep' ? 3.8 : 10;
    this.water.visible = this.view === 'ocean' || this.view === 'section' || environment !== 'deep';
    this.sectionGroup.visible = this.view === 'section';
    if (changed || this.deposits.some(d => !d.key)) { this.geometry(this.current); this.products(this.current); this.packets(this.current); }
    if (this.hasSize && !this.moving && this.view !== 'ocean') {
      const next = this.cameraFrame(), delta = next.target.clone().sub(oldTarget.target), ratio = next.offset.length() / oldTarget.offset.length();
      this.camera.position.sub(this.controls.target).multiplyScalar(ratio).add(this.controls.target).add(delta); this.controls.target.add(delta); this.controls.update();
    }
    this.render();
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.stopMotion(); this.observer?.disconnect();
    this.controls?.removeEventListener('change', this.render); this.controls?.removeEventListener('start', this.stopMotion); this.controls?.dispose();
    this.canvas.removeEventListener('keydown', this.keydown);
    for (const geometry of this.geometries) geometry.dispose(); for (const material of this.materials) material.dispose();
    for (const mesh of [...this.oldPillows, this.rubble, this.fragments]) mesh?.dispose();
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
    this.gpu?.draw(frame.progress, environment, frame.supplyMix ? 'limited' : 'sustained'); this.fallback?.(frame);
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
