import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { animateValue } from '../../src/visuals/transition.ts';
import { FrameRender } from '../../src/visuals/frameRender.ts';
import type { Settings } from './model.ts';
import { ANGLES, BOTTOM, EXTENT, LAYERS, SECTION_EXPOSED_START, PISTON_UNITS, COLLAPSE_BLOCKS, blockBuffers, updateBlocks, roofOffset, depositBuffers, updateDeposit, basementBuffers, pistonBase, pistonTrace, pistonTracks, boulderPose, cameraPose, faultBuffers, intrusionBuffers, lakeFrame, landscapeBuffers, planform, sectionBuffers, seed, shoreline, skirtBuffers, storageLayerBuffers, surfaceBuffers, surfaceHeight, updateFault, updateFaultCut, updateSection, updateStorage, updateSurface, updateWater, updateWaterSection, waterBuffers, waterSectionBuffers, withdrawalPath, type Buffers, type LakeFrame, type LakeView, type XYZ } from './geometry3d.ts';
import { LAYER_FACIES, lakeReflectorShader, lakeUniforms, reservoirMaterial, rockMaterial, supportMaterial, skyMaterial, stoneNoise, waterSectionMaterial } from './materials3d.ts';

function geometry(data: Buffers) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  g.setAttribute('materialPosition', new THREE.BufferAttribute(data.positions.slice(), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
  if (data.depths) g.setAttribute('depth', new THREE.BufferAttribute(data.depths, 1));
  g.setIndex(data.indices);
  if (data.normals) g.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  else g.computeVertexNormals();
  return g;
}
const vec = (p: XYZ) => new THREE.Vector3(...p);
const RAIN_SEGMENTS = 480;

/** One finite camera and one GPU owner. All geology, rain and water sample the
 * caller's progress; there is no independent process or perpetual render loop. */
export class Lake3DScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(37, 1.5, .1, 160);
  private controls!: OrbitControls;
  private observer?: ResizeObserver;
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private texture?: THREE.DataTexture;
  private uniforms = lakeUniforms();
  private cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private rock!: THREE.MeshStandardMaterial;
  private layerMaterials: THREE.MeshStandardMaterial[] = [];
  private surface!: THREE.Mesh;
  private skirt!: THREE.Mesh;
  private bottom!: THREE.Mesh;
  private exterior!: THREE.Mesh;
  private section = new THREE.Group();
  private piston = new THREE.Group();
  private basement!: THREE.Mesh;
  private supportBodies: { mesh: THREE.Mesh; data: Buffers; unit: number }[] = [];
  private blockBodies: { mesh: THREE.Mesh; full: Buffers; cut: Buffers; fullG: THREE.BufferGeometry; cutG: THREE.BufferGeometry }[] = [];
  private deposit!: { mesh: THREE.Mesh; full: Buffers; cut: Buffers; fullG: THREE.BufferGeometry; cutG: THREE.BufferGeometry };
  private reference = new THREE.Group();
  private originalTraces: THREE.Line[] = [];
  private movingTraces: THREE.Line[] = [];
  private tracks!: THREE.LineSegments;
  private geologyKind: Settings['basin'] = 'caldera';
  private underground = new THREE.Group();
  private faults = new THREE.Group();
  private layers: { mesh: THREE.Mesh; data: Buffers; unit: number }[] = [];
  private faultBodies: { mesh: THREE.Mesh; data: Buffers; side: -1 | 1 }[] = [];
  private water!: Reflector;
  private waterSection!: THREE.Mesh;
  private waterEdge!: THREE.Line;
  private cutTrace!: THREE.Line;
  private boulders!: THREE.InstancedMesh;
  private ringFault!: THREE.Line;
  private rain!: THREE.LineSegments;
  private seepage: THREE.ArrowHelper[] = [];
  private evaporation: THREE.ArrowHelper[] = [];
  private support: THREE.ArrowHelper[] = [];
  private weight: THREE.ArrowHelper[] = [];
  private sinking: THREE.ArrowHelper[] = [];
  private magmaParcels!: THREE.InstancedMesh;
  private pathMaterial!: THREE.MeshStandardMaterial;
  private frame = lakeFrame(0, { basin: 'caldera', supply: .75, leak: 'low' });
  private view: LakeView = 'section';
  private disposed = false;
  private hasSize = false;
  private framing = 1;
  private cancelCamera = () => {};
  private manualCamera = false;
  private movingCamera = false;
  private prepared = false;
  private updatingFrame = false;
  private geologyUpdates = 0;
  private supportUpdates = 0;
  private waterUpdates = 0;
  private lastGeologyMs = 0;
  private dummy = new THREE.Object3D();
  private presentation = new FrameRender(() => this.renderNow());

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    try {
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(max-width: 720px)').matches ? 1.25 : 1.6));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.04;
      this.renderer.localClippingEnabled = true;
      this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.shadowMap.autoUpdate = false;
      this.texture = stoneNoise(); this.texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      this.rock = rockMaterial(this.texture, this.uniforms); this.materials.add(this.rock);
      this.layerMaterials = Array.from({ length: 4 }, (_, i) => rockMaterial(this.texture!, this.uniforms, i));
      this.layerMaterials.forEach(m => this.materials.add(m));

      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = false; this.controls.enablePan = false;
      this.controls.minDistance = 2.5; this.controls.maxDistance = 100;
      this.controls.minPolarAngle = .16; this.controls.maxPolarAngle = Math.PI * .48;
      this.controls.addEventListener('change', this.render); this.controls.addEventListener('start', this.orbitStart);
      canvas.addEventListener('keydown', this.keydown); canvas.dataset.renderer = 'webgl';

      this.scene.add(new THREE.HemisphereLight('#b8d3df', '#4b3d2c', 1.3));
      this.scene.fog = new THREE.Fog('#c2cfcb', 32, 92);
      const sun = new THREE.DirectionalLight('#ffe1c2', 2.55); sun.position.set(-9, 16, 9); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -13; sun.shadow.camera.right = 13;
      sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -13; sun.shadow.camera.near = 1; sun.shadow.camera.far = 45;
      sun.shadow.normalBias = .024; sun.shadow.bias = -.0001; sun.shadow.radius = 3;
      this.scene.add(sun);
      const fill = new THREE.DirectionalLight('#99bacb', .6); fill.position.set(8, 9, -14); this.scene.add(fill);
      // A subdued inspection light reveals the exposed roof underside and
      // broken sidewalls. It is presentation light, not underground sunlight.
      const cutFill = new THREE.DirectionalLight('#d7e0db', .63); cutFill.position.set(-6, -.8, 12); this.section.add(cutFill);
      this.scene.add(this.mesh(new THREE.SphereGeometry(100, 24, 16), skyMaterial()));
      this.surface = this.mesh(geometry(surfaceBuffers(this.frame)), this.rock); this.surface.castShadow = this.surface.receiveShadow = true;
      this.skirt = this.mesh(geometry(skirtBuffers(this.frame)), this.rock); this.skirt.castShadow = this.skirt.receiveShadow = true;
      this.bottom = this.mesh(new THREE.CircleGeometry(EXTENT, ANGLES), this.rock); this.bottom.rotation.x = Math.PI / 2; this.bottom.position.y = BOTTOM;
      this.exterior = this.mesh(geometry(landscapeBuffers(this.frame)), this.rock); this.exterior.receiveShadow = true;
      this.scene.add(this.surface, this.skirt, this.bottom, this.exterior, this.section, this.underground, this.faults, this.reference);
      this.scene.add(this.piston);
      for (let unit = 0; unit < LAYERS; unit++) {
        const data = sectionBuffers(unit, this.frame), layer = this.mesh(geometry(data), this.layerMaterials[LAYER_FACIES[unit]]);
        layer.geometry.setDrawRange(data.exposedStart ?? SECTION_EXPOSED_START, data.indices.length - (data.exposedStart ?? SECTION_EXPOSED_START));
        layer.castShadow = layer.receiveShadow = true; this.layers.push({ mesh: layer, data, unit }); this.section.add(layer);
      }
      this.createPiston(); this.createUnderground(); this.createSurfaceDetails(); this.createWater(); this.createArrows();
      this.setClipping(); this.moveCamera(false);
      this.observer = new ResizeObserver(this.resize); this.observer.observe(canvas);
      this.draw(this.frame.p, this.frame.settings); this.resize();
    } catch (error) { this.dispose(); throw error; }
  }
  private mesh(g: THREE.BufferGeometry, m: THREE.Material) {
    if (!g.hasAttribute('materialPosition')) g.setAttribute('materialPosition', g.getAttribute('position').clone());
    this.geometries.add(g); this.materials.add(m); return new THREE.Mesh(g, m);
  }
  private trackLine<T extends THREE.Line>(line: T) {
    this.geometries.add(line.geometry);
    for (const m of Array.isArray(line.material) ? line.material : [line.material]) this.materials.add(m);
    return line;
  }
  private line(points: XYZ[], material: THREE.LineBasicMaterial) {
    return this.trackLine(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(vec)), material));
  }
  private createPiston() {
    for (let id = 0; id < COLLAPSE_BLOCKS.length; id++) for (let unit = 0; unit < PISTON_UNITS; unit++) {
      const full = blockBuffers(unit, id, false), cut = blockBuffers(unit, id), fullG = geometry(full), cutG = geometry(cut);
      this.geometries.add(fullG); const mesh = this.mesh(cutG, this.layerMaterials[LAYER_FACIES[unit]]);
      mesh.visible = cut.positions.length > 0; mesh.castShadow = mesh.receiveShadow = true; this.piston.add(mesh);
      this.blockBodies.push({ mesh, full, cut, fullG, cutG });
    }
    const full = depositBuffers(this.frame, false), cut = depositBuffers(this.frame), fullG = geometry(full), cutG = geometry(cut);
    this.geometries.add(fullG); const mesh = this.mesh(cutG, rockMaterial(this.texture!, this.uniforms, 2, true));
    mesh.visible = false; mesh.castShadow = mesh.receiveShadow = true; this.piston.add(mesh); this.deposit = { mesh, full, cut, fullG, cutG };
    this.basement = this.mesh(geometry(basementBuffers()), this.layerMaterials[1]);
    this.basement.castShadow = this.basement.receiveShadow = true; this.section.add(this.basement);
    for (const unit of [0, 1, 2]) {
      const points = pistonTrace(unit, this.frame, true);
      const ghost = this.line(points, new THREE.LineDashedMaterial({ color: unit ? '#927b53' : '#7e715a', dashSize: .13, gapSize: .11, transparent: true, opacity: .88, depthTest: false, fog: false }));
      ghost.computeLineDistances(); ghost.renderOrder = 8; this.originalTraces.push(ghost); this.reference.add(ghost);
      if (unit) {
        const trace = this.line(points, new THREE.LineBasicMaterial({ color: unit === 1 ? '#a48f68' : '#a59d83', transparent: true, opacity: .78, depthTest: false }));
        trace.renderOrder = 9; this.movingTraces.push(trace); this.reference.add(trace);
      }
    }
    this.tracks = this.trackLine(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pistonTracks(this.frame).map(vec)), new THREE.LineDashedMaterial({ color: '#bcae92', dashSize: .08, gapSize: .10, transparent: true, opacity: .5, depthTest: false })));
    this.tracks.renderOrder = 8; this.reference.add(this.tracks);
  }
  private createUnderground() {
    const supportMaterials = Array.from({ length: 4 }, (_, facies) => supportMaterial(this.texture!, this.uniforms, facies));
    supportMaterials.forEach(material => this.materials.add(material));
    for (let unit = 0; unit < LAYERS; unit++) {
      const data = storageLayerBuffers(unit, this.frame); if (!data.indices.length) continue;
      const mesh = this.mesh(geometry(data), supportMaterials[LAYER_FACIES[unit]]);
      mesh.castShadow = mesh.receiveShadow = true; this.supportBodies.push({ mesh, data, unit }); this.underground.add(mesh);
    }
    this.pathMaterial = reservoirMaterial(this.texture!, this.uniforms, true);
    const melt = this.mesh(geometry(intrusionBuffers(this.frame)), this.pathMaterial); melt.castShadow = melt.receiveShadow = true;
    this.underground.add(melt);
    this.magmaParcels = new THREE.InstancedMesh(new THREE.SphereGeometry(.046, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffc57a' }), 12);
    this.geometries.add(this.magmaParcels.geometry); this.materials.add(this.magmaParcels.material as THREE.Material); this.underground.add(this.magmaParcels);
    for (const side of [-1, 1] as const) {
      const data = faultBuffers(side, this.frame), mesh = this.mesh(geometry(data), rockMaterial(this.texture!, this.uniforms, 4));
      mesh.castShadow = mesh.receiveShadow = true; this.faultBodies.push({ mesh, data, side }); this.faults.add(mesh);
    }
  }
  private createSurfaceDetails() {
    this.boulders = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), this.rock, 400);
    this.boulders.geometry.setAttribute('materialPosition', this.boulders.geometry.getAttribute('position').clone());
    this.geometries.add(this.boulders.geometry); this.boulders.castShadow = this.boulders.receiveShadow = true;
    this.boulders.frustumCulled = false; this.boulders.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.boulders);
    this.ringFault = this.line(Array.from({ length: ANGLES + 1 }, () => [0, 0, 0] as XYZ), new THREE.LineBasicMaterial({ color: '#3c3930', transparent: true }));
    this.scene.add(this.ringFault);
    this.cutTrace = this.trackLine(new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 193 }, () => new THREE.Vector3())), new THREE.LineDashedMaterial({ color: '#dbbb85', dashSize: .14, gapSize: .11, transparent: true, opacity: .63 })));
    this.scene.add(this.cutTrace);
    this.rain = this.trackLine(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN_SEGMENTS * 6), 3)), new THREE.LineBasicMaterial({ color: '#628b9c', transparent: true, opacity: .72, depthWrite: false })));
    this.scene.add(this.rain);
  }
  private createWater() {
    this.water = new Reflector(geometry(waterBuffers(this.frame)), { textureWidth: 512, textureHeight: 512, multisample: 0, clipBias: .002, shader: lakeReflectorShader });
    if (!this.renderer.extensions.has('EXT_color_buffer_float')) this.water.getRenderTarget().texture.type = THREE.UnsignedByteType;
    this.water.rotation.x = -Math.PI / 2;
    const material = this.water.material as THREE.ShaderMaterial; material.clipping = true; material.side = THREE.DoubleSide; material.transparent = true; material.depthWrite = false;
    this.geometries.add(this.water.geometry); this.materials.add(material); this.scene.add(this.water);
    this.waterSection = this.mesh(geometry(waterSectionBuffers(this.frame)), waterSectionMaterial()); this.section.add(this.waterSection);
    this.waterEdge = this.line(shoreline(this.frame), new THREE.LineBasicMaterial({ color: '#597b75', transparent: true, opacity: .16 }));
    this.scene.add(this.waterEdge);
  }
  private arrow(color: string) {
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), .7, color, .16, .1);
    // ArrowHelper's defaults are module-shared; each scene owns these clones.
    arrow.line.geometry = arrow.line.geometry.clone(); arrow.cone.geometry = arrow.cone.geometry.clone();
    this.geometries.add(arrow.line.geometry); this.geometries.add(arrow.cone.geometry);
    for (const object of [arrow.line, arrow.cone]) for (const m of Array.isArray(object.material) ? object.material : [object.material]) this.materials.add(m);
    this.section.add(arrow); return arrow;
  }
  private createArrows() {
    this.seepage = Array.from({ length: 6 }, () => this.arrow('#559bb0'));
    this.evaporation = Array.from({ length: 2 }, () => this.arrow('#8bbdc2'));
    this.support = Array.from({ length: 3 }, () => this.arrow('#e1a762'));
    this.weight = Array.from({ length: 3 }, () => this.arrow('#3f3b32'));
    this.sinking = Array.from({ length: 2 }, () => this.arrow('#b08a5d'));
  }
  private updateLine(line: THREE.Line, points: XYZ[]) {
    const position = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    points.forEach((point, i) => position.setXYZ(i, ...point)); position.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  }
  private updateGeology(frame: LakeFrame) {
    const branchChanged = this.geologyKind !== frame.kind;
    if (branchChanged) {
      this.geometries.delete(this.surface.geometry); this.surface.geometry.dispose();
      this.surface.geometry = geometry(surfaceBuffers(frame)); this.geometries.add(this.surface.geometry);
    }
    const top = this.surface.geometry.getAttribute('position') as THREE.BufferAttribute;
    updateSurface(top.array as Float32Array, frame); top.needsUpdate = true; this.surface.geometry.computeVertexNormals(); this.surface.geometry.computeBoundingSphere();
    // Caldera's distant flank is stationary, outside every source region.
    if (frame.kind !== 'caldera' || branchChanged) {
      const distant = this.exterior.geometry.getAttribute('position') as THREE.BufferAttribute;
      updateSurface(distant.array as Float32Array, frame); distant.needsUpdate = true; this.exterior.geometry.computeVertexNormals(); this.exterior.geometry.computeBoundingSphere();
      const skirt = this.skirt.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < skirt.count; i += 2) skirt.setY(i, surfaceHeight(skirt.getX(i), skirt.getZ(i), frame));
      skirt.needsUpdate = true; this.skirt.geometry.computeVertexNormals();
    }
    this.geologyKind = frame.kind;
    this.layers.forEach(layer => {
      const { mesh, unit } = layer;
      if (branchChanged) {
        this.geometries.delete(mesh.geometry); mesh.geometry.dispose();
        layer.data = sectionBuffers(unit, frame); mesh.geometry = geometry(layer.data); this.geometries.add(mesh.geometry);
        const start = layer.data.exposedStart ?? SECTION_EXPOSED_START; mesh.geometry.setDrawRange(start, layer.data.indices.length - start);
      }
      const data = layer.data; updateSection(data, unit, frame);
      for (const name of ['position', 'normal', 'uv']) mesh.geometry.getAttribute(name).needsUpdate = true;
      mesh.geometry.computeBoundingSphere();
    });
    this.piston.visible = this.basement.visible = frame.kind === 'caldera';
    this.piston.position.y = 0;
    this.blockBodies.forEach(body => {
      for (const [data, meshGeometry] of [[body.full, body.fullG], [body.cut, body.cutG]] as const) {
        updateBlocks(data, frame); for (const name of ['position', 'normal']) meshGeometry.getAttribute(name).needsUpdate = true; meshGeometry.computeBoundingSphere();
      }
    });
    if (frame.kind === 'caldera') {
      for (const [data, meshGeometry] of [[this.deposit.full, this.deposit.fullG], [this.deposit.cut, this.deposit.cutG]] as const) {
        updateDeposit(data, frame); for (const name of ['position', 'normal', 'depth']) meshGeometry.getAttribute(name).needsUpdate = true; meshGeometry.computeBoundingSphere();
      }
      this.deposit.mesh.visible = frame.subsidence > .19;
      this.movingTraces.forEach((line, i) => this.updateLine(line, pistonTrace(i + 1, frame)));
      this.updateLine(this.tracks, pistonTracks(frame)); this.tracks.computeLineDistances();
    }
    this.reference.visible = this.view === 'section' && frame.kind === 'caldera' && frame.subsidence > 0;
    for (let i = 0; i < 400; i++) {
      const pose = boulderPose(i, frame); this.dummy.position.copy(vec(pose.position)); this.dummy.scale.set(pose.size * 1.4, pose.size * .7, pose.size);
      this.dummy.rotation.set(seed(i + 20) * 4, pose.angle, seed(i + 22) * 4); this.dummy.updateMatrix(); this.boulders.setMatrixAt(i, this.dummy.matrix);
    }
    this.boulders.instanceMatrix.needsUpdate = true;
    this.underground.visible = frame.kind === 'caldera' && this.view === 'section';
    this.faults.visible = frame.kind === 'caldera' && this.view === 'section';
  }
  private updateSupport(frame: LakeFrame) {
    for (const { mesh, data } of this.supportBodies) {
      updateStorage(data, frame);
      for (const name of ['position', 'normal']) mesh.geometry.getAttribute(name).needsUpdate = true;
      mesh.geometry.computeBoundingSphere();
    }
  }
  private updateFracture(frame: LakeFrame, shapeUpdated = false) {
    if (!shapeUpdated && frame.kind === 'caldera') {
      for (const { mesh, data } of this.layers) {
        updateFaultCut(data, frame); mesh.geometry.getAttribute('position').needsUpdate = mesh.geometry.getAttribute('normal').needsUpdate = true;
        mesh.geometry.computeBoundingSphere();
      }
      for (const body of this.blockBodies) {
        updateFaultCut(body.cut, frame); body.cutG.getAttribute('position').needsUpdate = body.cutG.getAttribute('normal').needsUpdate = true;
        body.cutG.computeBoundingSphere();
      }
    }
    this.faultBodies.forEach(({ mesh, data, side }) => {
      updateFault(data, side, frame); mesh.visible = frame.fracture > 0;
      for (const name of ['position', 'normal', 'uv']) mesh.geometry.getAttribute(name).needsUpdate = true;
      mesh.geometry.computeBoundingSphere();
    });
    this.ringFault.visible = frame.kind === 'caldera' && frame.fracture > 0;
    (this.ringFault.material as THREE.LineBasicMaterial).opacity = frame.fracture * .62;
    this.updateLine(this.ringFault, Array.from({ length: ANGLES + 1 }, (_, i) => {
      const a = i / ANGLES * Math.PI * 2, r = frame.radius * planform(a) * .82, x = Math.cos(a) * r, z = Math.sin(a) * r;
      return [x, surfaceHeight(x, z, frame) + .026, z];
    }));
    this.updateLine(this.cutTrace, Array.from({ length: 193 }, (_, i) => {
      const x = -EXTENT + i / 192 * EXTENT * 2; return [x, surfaceHeight(x, 0, frame) + .035, .006];
    })); this.cutTrace.computeLineDistances();
  }
  private updateWithdrawal(frame: LakeFrame) {
    this.magmaParcels.visible = frame.p > .04 && frame.p < .27;
    if (!this.magmaParcels.visible || frame.kind !== 'caldera') return;
    const curve = new THREE.CatmullRomCurve3(withdrawalPath(frame).map(vec));
    for (let i = 0; i < 12; i++) {
      this.dummy.position.copy(curve.getPoint((i / 12 + frame.p * 4) % 1)); this.dummy.position.z = .085;
      this.dummy.scale.setScalar(1); this.dummy.rotation.set(0, 0, 0); this.dummy.updateMatrix(); this.magmaParcels.setMatrixAt(i, this.dummy.matrix);
    }
    this.magmaParcels.instanceMatrix.needsUpdate = true;
  }
  private updateWater(frame: LakeFrame) {
    const wet = frame.fraction > 0;
    this.water.visible = this.waterEdge.visible = wet; this.waterSection.visible = wet;
    this.uniforms.uWaterLevel.value = frame.waterLevel; this.uniforms.uWaterValid.value = wet ? 1 : 0;
    this.uniforms.uBasinRadius.value = frame.radius; this.uniforms.uWithdrawal.value = frame.withdrawal;
    this.uniforms.uSubsidence.value = frame.subsidence; this.uniforms.uCaldera.value = frame.kind === 'caldera' ? 1 : 0;
    if (wet) {
      const edge = shoreline(frame);
      const position = this.water.geometry.getAttribute('position') as THREE.BufferAttribute, depth = this.water.geometry.getAttribute('depth') as THREE.BufferAttribute;
      updateWater(position.array as Float32Array, depth.array as Float32Array, frame, edge); position.needsUpdate = depth.needsUpdate = true;
      this.water.geometry.computeBoundingSphere(); this.water.position.y = frame.waterLevel;
      (this.water.material as THREE.ShaderMaterial).uniforms.uPhase.value = frame.p;
      const section = this.waterSection.geometry.getAttribute('position') as THREE.BufferAttribute, sectionDepth = this.waterSection.geometry.getAttribute('depth') as THREE.BufferAttribute;
      updateWaterSection(section.array as Float32Array, sectionDepth.array as Float32Array, frame, edge); section.needsUpdate = sectionDepth.needsUpdate = true; this.waterSection.geometry.computeBoundingSphere();
      this.updateLine(this.waterEdge, edge);
    }
    const raining = frame.p > .48 && frame.settings.supply > 0;
    this.rain.visible = raining;
    if (raining) {
      const positions = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < RAIN_SEGMENTS; i++) {
        const a = seed(i + 811) * Math.PI * 2, r = Math.sqrt(seed(i + 45)) * frame.radius * 1.16;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const bed = surfaceHeight(x, z, frame), bottom = Math.max(bed, wet ? frame.waterLevel : bed) + .1;
        const y = bottom + (1 - (seed(i + 76) + frame.p * 4.2) % 1) * (7.2 - bottom);
        const length = .19 + seed(i + 1097) * .08;
        positions.setXYZ(i * 2, x, y, z); positions.setXYZ(i * 2 + 1, x + .025, y - Math.min(length, y - bottom), z);
      }
      positions.needsUpdate = true; this.rain.geometry.setDrawRange(0, Math.round(RAIN_SEGMENTS * frame.settings.supply) * 2);
      this.rain.geometry.computeBoundingSphere();
    }
    this.seepage.forEach((arrow, i) => {
      arrow.visible = frame.p > .5 && frame.settings.supply > 0 && (frame.settings.leak === 'high' || i < 2);
      const x = (i - (frame.settings.leak === 'high' ? 2.5 : .5)) * .42;
      arrow.position.set(x, surfaceHeight(x, 0, frame) - .16, .07); arrow.setLength(frame.settings.leak === 'high' ? .91 : .52, .15, .09);
    });
    this.evaporation.forEach((arrow, i) => {
      arrow.visible = frame.fraction > .15; arrow.position.set(frame.radius * (.34 + i * .25), frame.waterLevel + .08, .05);
      arrow.setDirection(new THREE.Vector3(.12, 1, 0).normalize()); arrow.setLength(.62, .15, .09);
    });
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 1.35, visible = frame.kind === 'caldera' && frame.p < .48;
      this.support[i].visible = this.weight[i].visible = visible;
      this.support[i].position.set(x, pistonBase(x) + roofOffset(x, 0, frame) - .32, .085); this.support[i].setDirection(new THREE.Vector3(0, 1, 0)); this.support[i].setLength(.62 * (1 - frame.withdrawal * .78), .12, .08);
      this.weight[i].position.set(x, surfaceHeight(x, 0, frame) - .55, .085); this.weight[i].setLength(.62, .14, .09);
    }
    this.sinking.forEach((arrow, i) => {
      arrow.visible = frame.kind === 'caldera' && frame.subsidence > 0 && frame.subsidence < 1;
      const x = (i ? 1 : -1) * frame.radius * .38;
      arrow.position.set(x, surfaceHeight(x, 0, frame) + .96, .08); arrow.setLength(.65, .16, .1);
    });
  }
  draw(progress: number, settings: Settings) {
    if (this.disposed) return;
    this.lastGeologyMs = 0;
    const started = performance.now(), previous = this.frame, next = lakeFrame(progress, settings), branchChanged = next.kind !== previous.kind;
    const geologyChanged = !this.prepared || branchChanged || next.formation !== previous.formation || next.subsidence !== previous.subsidence;
    const fractureChanged = geologyChanged || next.fracture !== previous.fracture;
    const supportChanged = next.kind === 'caldera' && (!this.prepared || branchChanged || next.withdrawal !== previous.withdrawal || next.subsidence !== previous.subsidence);
    const stateChanged = !this.prepared || next.p !== previous.p || branchChanged || next.settings.supply !== previous.settings.supply || next.settings.leak !== previous.settings.leak;
    this.frame = next;
    if (!stateChanged) { this.publishWork(0); return; }
    this.updatingFrame = true;
    try {
      if (geologyChanged) {
        const start = performance.now(); this.updateGeology(next); this.lastGeologyMs = performance.now() - start; this.geologyUpdates++;
      }
      if (fractureChanged) this.updateFracture(next, geologyChanged);
      if (supportChanged) { this.updateSupport(next); this.supportUpdates++; }
      if (geologyChanged || fractureChanged || supportChanged) this.renderer.shadowMap.needsUpdate = true;
      if (geologyChanged && this.hasSize && !this.manualCamera && !this.movingCamera && (branchChanged || this.view === 'landscape')) this.fitCamera();
      this.updateWithdrawal(next); this.updateWater(next); this.waterUpdates++; this.prepared = true;
    } finally { this.updatingFrame = false; }
    this.render(); this.publishWork(performance.now() - started);
  }
  /** Inspection mirrors never feed progress, geometry or playback. */
  private publishWork(lastDrawMs: number) {
    if (!this.canvas) return;
    Object.assign(this.canvas.dataset, { progress: this.frame.p.toFixed(5), geologyUpdates: String(this.geologyUpdates), supportUpdates: String(this.supportUpdates), waterUpdates: String(this.waterUpdates), lastGeologyMs: this.lastGeologyMs.toFixed(3), lastDrawMs: lastDrawMs.toFixed(3) });
  }
  private setClipping() {
    const planes = this.view === 'section' ? [this.cut] : [];
    for (const m of [this.rock, this.water?.material, this.ringFault?.material, this.rain?.material, this.waterEdge?.material]) if (m && !Array.isArray(m)) { m.clippingPlanes = planes; m.clipShadows = true; m.needsUpdate = true; }
    this.section.visible = this.view === 'section';
    for (const body of this.blockBodies) { body.mesh.geometry = this.view === 'section' ? body.cutG : body.fullG; body.mesh.visible = this.view === 'landscape' || body.cut.positions.length > 0; }
    if (this.deposit) this.deposit.mesh.geometry = this.view === 'section' ? this.deposit.cutG : this.deposit.fullG;
    this.cutTrace.visible = this.view === 'landscape';
    this.skirt.visible = this.bottom.visible = this.view === 'section'; this.exterior.visible = this.view === 'landscape';
    this.underground.visible = this.faults.visible = this.view === 'section' && this.frame.kind === 'caldera';
    this.reference.visible = this.view === 'section' && this.frame.kind === 'caldera' && this.frame.subsidence > 0;
    this.controls.minAzimuthAngle = this.view === 'section' ? -.95 : -Infinity;
    this.controls.maxAzimuthAngle = this.view === 'section' ? .95 : Infinity;
  }
  setView(view: LakeView) {
    if (this.disposed || this.view === view) return;
    this.view = view; this.setClipping(); this.moveCamera(true);
  }
  private moveCamera(animate: boolean) {
    this.stopMotion(); this.manualCamera = false; this.movingCamera = true;
    const fromPosition = this.camera.position.clone(), fromTarget = this.controls.target.clone();
    const pose = cameraPose(this.frame, this.view, this.camera.aspect), target = vec(pose.target), toPosition = vec(pose.position);
    this.cancelCamera = animateValue({ from: 0, to: 1, duration: animate ? 480 : 0, onUpdate: u => {
      if (this.disposed) return;
      this.camera.position.lerpVectors(fromPosition, toPosition, u); this.controls.target.lerpVectors(fromTarget, target, u);
      this.controls.update(); this.render();
    }, onComplete: () => { this.movingCamera = false; if (!this.manualCamera && !this.disposed) this.fitCamera(); } });
  }
  private fitCamera() {
    const pose = cameraPose(this.frame, this.view, this.camera.aspect);
    this.camera.position.copy(vec(pose.position)); this.controls.target.copy(vec(pose.target)); this.controls.update();
  }
  resetCamera() { if (!this.disposed) this.moveCamera(true); }
  stopMotion = () => { this.cancelCamera(); this.cancelCamera = () => {}; this.movingCamera = false; };
  private orbitStart = () => { this.manualCamera = true; this.stopMotion(); };
  private resize = () => {
    if (this.disposed) return;
    const width = this.canvas.clientWidth, height = this.canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    const next = Math.max(1, 1.27 / this.camera.aspect);
    if (this.manualCamera) this.camera.position.sub(this.controls.target).multiplyScalar(next / this.framing).add(this.controls.target);
    this.framing = next; this.controls.minDistance = 2.5; this.controls.maxDistance = 100 * next;
    this.hasSize = true; if (!this.manualCamera && !this.movingCamera) this.fitCamera(); this.controls.update(); this.render();
  };
  private keydown = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '=', 'Home'].includes(event.key)) return;
    event.preventDefault(); this.stopMotion();
    if (event.key === 'Home') { this.resetCamera(); return; }
    this.manualCamera = true;
    const spherical = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    if (event.key === 'ArrowLeft') spherical.theta -= .12;
    if (event.key === 'ArrowRight') spherical.theta += .12;
    if (event.key === 'ArrowUp') spherical.phi -= .1;
    if (event.key === 'ArrowDown') spherical.phi += .1;
    if (event.key === '+' || event.key === '=') spherical.radius *= .9;
    if (event.key === '-') spherical.radius *= 1.1;
    spherical.theta = THREE.MathUtils.clamp(spherical.theta, this.controls.minAzimuthAngle, this.controls.maxAzimuthAngle);
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, this.controls.minPolarAngle, this.controls.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.setFromSpherical(spherical).add(this.controls.target); this.controls.update(); this.render();
  };
  private render = () => this.presentation.request();
  private renderNow() { if (!this.disposed && !this.updatingFrame) this.renderer.render(this.scene, this.camera); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.presentation.dispose(); this.stopMotion(); this.observer?.disconnect();
    this.canvas.removeEventListener('keydown', this.keydown);
    this.controls?.removeEventListener('change', this.render); this.controls?.removeEventListener('start', this.orbitStart); this.controls?.dispose();
    if (this.water) { this.materials.delete(this.water.material as THREE.Material); this.water.dispose(); }
    this.scene.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.dispose(); });
    this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose()); this.texture?.dispose();
    this.geometries.clear(); this.materials.clear(); this.scene.clear();
    this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}
