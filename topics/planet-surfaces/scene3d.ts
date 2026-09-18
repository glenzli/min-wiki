import * as THREE from 'three';
import { animateValue } from '../../src/visuals/transition.ts';
import { clamp, noise, type World, type View } from './model.ts';
import { INTERIORS, interiorAt } from './interior.ts';
import { palette, seed } from './surfacePainter.ts';
import { TerrainPatch, terrainHeight } from './terrain3d.ts';
import { cameraPreset, boundPose, cameraPosition, tourPose, type CameraPose, type Angle } from './camera.ts';

/** Owns GPU resources and camera gestures. Scientific layers and exploration state stay outside. */
export class PlanetView3D {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, .025, 180);
  private renderer: THREE.WebGLRenderer;
  private observer: ResizeObserver;
  private body = new THREE.Group();
  private cutaway = new THREE.Group();
  private globe?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  private exterior?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  private faces: THREE.Mesh<THREE.RingGeometry, THREE.MeshStandardMaterial>[] = [];
  private textures = new Map<string, THREE.DataTexture>();
  private terrain?: TerrainPatch;
  private marker = new THREE.Mesh(new THREE.OctahedronGeometry(.027), new THREE.MeshBasicMaterial({ color: '#fff7bc', depthTest: false }));
  private markerHalo = new THREE.Mesh(new THREE.RingGeometry(.038, .043, 40), new THREE.MeshBasicMaterial({ color: '#fff1ae', depthTest: false, transparent: true, opacity: .85 }));
  private trace = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#f8f5d3', dashSize: .028, gapSize: .023, transparent: true, opacity: .85, depthTest: false }));
  private stars: THREE.Points;
  private world?: World;
  private view: View = 'landscape';
  private progress = 0;
  private phase = 0;
  private pose: CameraPose = cameraPreset('landscape');
  private tourOrigin = { ...this.pose };
  private tourTime = 0;
  private cancelCamera = () => {};
  private disposed = false;
  private pointer?: { id: number; x: number; y: number };
  onInteraction?: () => void;
  onCameraChange?: (yaw: number, elevation: number) => void;
  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.12;
    this.scene.add(new THREE.HemisphereLight('#f4f1de', '#544936', 1.7));
    const key = new THREE.DirectionalLight('#fff2d5', 2.4); key.position.set(-5, 7, 9); this.scene.add(key);
    const fill = new THREE.DirectionalLight('#acccdc', .55); fill.position.set(5, 0, -4); this.scene.add(fill);
    this.scene.add(this.body, this.cutaway);
    const traceAngle = Math.PI * .72;
    this.trace.geometry.setFromPoints([new THREE.Vector3(Math.cos(traceAngle) * 1.08, Math.sin(traceAngle) * 1.08, .031), new THREE.Vector3(0, 0, .031)]); this.trace.computeLineDistances();
    this.marker.renderOrder = 10; this.markerHalo.renderOrder = 10; this.trace.renderOrder = 9;
    const points = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) { const a = seed(i) * Math.PI * 2, z = seed(i + 82) * 2 - 1, r = Math.sqrt(1 - z * z); points.set([Math.cos(a) * r * 45, z * 45, Math.sin(a) * r * 45], i * 3); }
    this.stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(points, 3)), new THREE.PointsMaterial({ color: '#d4dfdf', size: .065, transparent: true, opacity: .65, depthWrite: false }));
    this.scene.add(this.stars);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerUp);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
    canvas.addEventListener('keydown', this.keyDown);
    canvas.addEventListener('webglcontextlost', this.contextLost);
    this.resize();
  }
  onFailure?: () => void;
  private contextLost = (event: Event) => { event.preventDefault(); this.stopTransition(); this.onFailure?.(); };
  private resize() {
    if (this.disposed) return;
    const w = Math.max(1, this.canvas.clientWidth), h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.render();
  }
  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.stopTransition(); this.onInteraction?.(); this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId); this.canvas.classList.add('dragging'); this.canvas.focus({ preventScroll: true });
  };
  private pointerMove = (event: PointerEvent) => {
    if (!this.pointer || event.pointerId !== this.pointer.id) return;
    const dx = event.clientX - this.pointer.x, dy = event.clientY - this.pointer.y;
    this.pose = boundPose(this.view, { ...this.pose, yaw: this.pose.yaw - dx * .006, pitch: this.pose.pitch + dy * .005 });
    this.pointer.x = event.clientX; this.pointer.y = event.clientY; this.render();
  };
  private pointerUp = (event: PointerEvent) => {
    if (this.pointer?.id !== event.pointerId) return;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.pointer = undefined; this.canvas.classList.remove('dragging');
  };
  private wheel = (event: WheelEvent) => {
    event.preventDefault(); this.stopTransition(); this.onInteraction?.();
    this.pose = boundPose(this.view, { ...this.pose, distance: this.pose.distance * Math.exp(clamp(event.deltaY, -150, 150) * .0015) }); this.render();
  };
  private keyDown = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '='].includes(event.key)) return;
    event.preventDefault(); this.stopTransition(); this.onInteraction?.();
    this.pose = boundPose(this.view, { yaw: this.pose.yaw + (event.key === 'ArrowLeft' ? -.12 : event.key === 'ArrowRight' ? .12 : 0),
      pitch: this.pose.pitch + (event.key === 'ArrowUp' ? .09 : event.key === 'ArrowDown' ? -.09 : 0),
      distance: this.pose.distance * (event.key === '-' ? 1.12 : ['+', '='].includes(event.key) ? .89 : 1) }); this.render();
  };
  setAngle(angle: Angle) {
    this.stopTransition(); const from = { ...this.pose }, to = cameraPreset(this.view, angle);
    // Keep a short route when an orbit has accumulated complete turns.
    if (this.view !== 'section') from.yaw = Math.atan2(Math.sin(from.yaw), Math.cos(from.yaw));
    this.cancelCamera = animateValue({ from: 0, to: 1, duration: 850, onUpdate: p => {
      this.pose = { yaw: from.yaw + (to.yaw - from.yaw) * p, pitch: from.pitch + (to.pitch - from.pitch) * p, distance: from.distance + (to.distance - from.distance) * p }; this.render();
    } });
  }
  stopTransition() { this.cancelCamera(); }
  startTour() { this.stopTransition(); this.tourOrigin = { ...this.pose }; this.tourTime = 0; }
  setTexture(world: World, pixels: ImageData) {
    if (this.textures.has(world.id)) return;
    const texture = new THREE.DataTexture(pixels.data.slice(), pixels.width, pixels.height, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping; texture.flipY = true; texture.needsUpdate = true; this.textures.set(world.id, texture);
    if (this.world?.id === world.id) { this.updateTexture(); this.render(); }
  }
  private updateTexture() {
    const texture = this.world ? this.textures.get(this.world.id) : undefined;
    for (const mesh of [this.globe, this.exterior]) if (mesh) { mesh.material.map = texture ?? null; mesh.material.color.set(texture ? '#ffffff' : this.world!.color); mesh.material.needsUpdate = true; }
  }
  private disposeBody() {
    this.body.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } }); this.body.clear();
    this.cutaway.remove(this.marker, this.markerHalo, this.trace);
    this.cutaway.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } }); this.cutaway.clear(); this.faces = [];
  }
  private build(world: World) {
    this.disposeBody(); this.terrain?.dispose(); if (this.terrain) this.scene.remove(this.terrain.group);
    this.terrain = new TerrainPatch(world); this.scene.add(this.terrain.group);
    const material = new THREE.MeshStandardMaterial({ color: world.color, roughness: .91 });
    this.globe = new THREE.Mesh(new THREE.SphereGeometry(1, 80, 48), material); this.body.add(this.globe);
    // Remove the near hemisphere: the planar face and curved exterior are one spatial object.
    this.exterior = new THREE.Mesh(new THREE.SphereGeometry(1, 80, 48, Math.PI, Math.PI), material.clone());
    const uv = this.exterior.geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setX(i, .5 + uv.getX(i) * .5);
    this.exterior.material.side = THREE.DoubleSide; this.cutaway.add(this.exterior);
    for (const layer of INTERIORS[world.id].layers) {
      const geometry = new THREE.RingGeometry(layer.inner, layer.outer, 100, 10);
      const pos = geometry.getAttribute('position'), colors = new Float32Array(pos.count * 3), base = new THREE.Color(layer.color);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), radius = Math.hypot(x, y);
        const variation = .85 + noise(x * 700, y * 700) * .075 + Math.sin(radius * 320 + noise(x * 80, y * 80) * 5) * .03;
        base.clone().multiplyScalar(variation).toArray(colors, i * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const face = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide }));
      face.userData.layer = layer.id; face.position.z = .002; this.faces.push(face); this.cutaway.add(face);
      if (layer.inner > 0) {
        const points = Array.from({ length: 181 }, (_, i) => new THREE.Vector3(Math.cos(i / 180 * Math.PI * 2) * layer.inner, Math.sin(i / 180 * Math.PI * 2) * layer.inner, .008));
        const material = layer.uncertain ? new THREE.LineDashedMaterial({ color: '#faf1d0', transparent: true, opacity: .35, dashSize: .024, gapSize: .024 }) : new THREE.LineBasicMaterial({ color: '#faf1d0', transparent: true, opacity: .28 });
        const rim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material); rim.computeLineDistances(); this.cutaway.add(rim);
      }
    }
    this.cutaway.add(this.marker, this.markerHalo, this.trace); this.updateTexture();
  }
  draw(world: World, view: View, progress: number, phase: number) {
    if (this.disposed) return;
    const changedView = this.view !== view, changedWorld = this.world?.id !== world.id;
    const delta = !changedView && !changedWorld ? Math.max(0, Math.min(.2, phase - this.phase)) : 0;
    this.world = world; this.view = view; this.progress = progress; this.phase = phase;
    if (changedWorld) this.build(world);
    if (changedView) {
      this.stopTransition();
      // Landscape and whole-world views use different scales; enter at a nearby orbit.
      if (view === 'landscape' || this.pose.distance > 10) { this.pose = cameraPreset(view); this.pose.distance *= 1.18; }
      this.setAngle('oblique'); this.tourOrigin = { ...this.pose }; this.tourTime = 0;
    }
    if (delta > 0) { this.tourTime += delta; this.pose = tourPose(view, this.tourOrigin, this.tourTime); }
    this.body.visible = view === 'globe'; this.cutaway.visible = view === 'section'; this.terrain!.group.visible = view === 'landscape';
    this.stars.visible = view !== 'landscape' || world.id === 'mercury';
    const sky = view === 'landscape' ? palette[world.id].sky[1] : '#0b1621';
    this.scene.background = new THREE.Color(sky);
    this.scene.fog = view === 'landscape' && world.id !== 'mercury' ? new THREE.Fog(sky, 23, 58) : null;
    if (view === 'section') {
      const active = interiorAt(world.id, progress), radius = 1 - clamp(progress), angle = Math.PI * .72;
      this.marker.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, .035);
      this.markerHalo.position.copy(this.marker.position); this.markerHalo.position.z += .006;
      for (const face of this.faces) { face.material.emissive.set(face.userData.layer === active.id ? '#625137' : '#000000'); face.material.emissiveIntensity = .24; }
    }
    if (view === 'landscape' && delta > 0) this.terrain!.animate(phase);
    this.render();
  }
  private render() {
    if (this.disposed) return;
    const p = cameraPosition(this.pose), targetY = this.view === 'landscape' ? .3 : 0;
    const altitude = this.view === 'landscape' && this.world ? Math.max(p[1] + targetY, terrainHeight(this.world, p[0], p[2]) + 1.2) : p[1] + targetY;
    this.camera.position.set(p[0], altitude, p[2]); this.camera.lookAt(0, targetY, 0);
    this.renderer.render(this.scene, this.camera);
    // Public camera readout is also the keyboard user's orientation cue.
    this.canvas.dataset.azimuth = String(Math.round(Math.atan2(Math.sin(this.pose.yaw), Math.cos(this.pose.yaw)) * 180 / Math.PI));
    this.canvas.dataset.elevation = String(Math.round(this.pose.pitch * 180 / Math.PI));
    this.onCameraChange?.(Number(this.canvas.dataset.azimuth), Number(this.canvas.dataset.elevation));
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.stopTransition(); this.observer.disconnect();
    this.canvas.removeEventListener('pointerdown', this.pointerDown); this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerup', this.pointerUp); this.canvas.removeEventListener('pointercancel', this.pointerUp);
    this.canvas.removeEventListener('wheel', this.wheel); this.canvas.removeEventListener('keydown', this.keyDown); this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    this.disposeBody(); this.terrain?.dispose(); this.textures.forEach(t => t.dispose()); this.textures.clear();
    this.marker.geometry.dispose(); this.marker.material.dispose(); this.markerHalo.geometry.dispose(); this.markerHalo.material.dispose(); this.trace.geometry.dispose(); this.trace.material.dispose();
    this.stars.geometry.dispose(); (this.stars.material as THREE.Material).dispose(); this.renderer.dispose(); this.canvas.remove();
  }
}
