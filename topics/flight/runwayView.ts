import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createCamberedWing, createFuselage } from './aircraftGeometry.ts';
import { AIRFRAME, aircraftPose, worldForces } from './journey.ts';
import { type FlightSnapshot } from './model.ts';

export type CameraView = 'orbit' | 'side' | 'above';
type DrawOptions = { labels: boolean; forces: boolean };
const up = new THREE.Vector3(0, 1, 0);
const forceScale = .000055;

/** A disposed/lost WebGL context still belongs to its element; recovery needs a new owner. */
export function freshRunwayCanvas(previous: HTMLCanvasElement): HTMLCanvasElement {
  const next = previous.cloneNode(false) as HTMLCanvasElement;
  previous.replaceWith(next);
  return next;
}

/** Retained spatial projection; owns GPU/gesture lifetime, and never advances scientific time. */
export class RunwayView {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, .1, 420);
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private resize: ResizeObserver;
  private airplane = new THREE.Group();
  private wings = new THREE.Group();
  private propeller = new THREE.Group();
  private tyres: THREE.Group[] = [];
  private flow = new THREE.Group();
  private arrows: Record<keyof ReturnType<typeof worldForces>, THREE.ArrowHelper>;
  private current?: FlightSnapshot;
  private options: DrawOptions = { labels: true, forces: true };
  private active = true;
  private disposed = false;
  private lost = false;
  private target = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private pointers = new Set<number>();
  private pointerStart?: { id: number; x: number; y: number };
  private fittedPitch = NaN;
  private wingMarker = new THREE.Mesh(new THREE.BoxGeometry(.06, .035, 2.02), new THREE.MeshBasicMaterial({ color: 0x1e7795 }));

  constructor(private canvas: HTMLCanvasElement, private unavailable: () => void, private inspectWing: () => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(0xc8dfe5);
    this.scene.fog = new THREE.Fog(0xc8dfe5, 65, 180);
    this.scene.add(new THREE.HemisphereLight(0xe5f2ff, 0x6b7668, 2.25));
    const light = new THREE.DirectionalLight(0xfff5da, 3.25);
    light.position.set(-18, 28, 16); light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    Object.assign(light.shadow.camera, { left: -15, right: 15, top: 13, bottom: -13, near: .5, far: 75 });
    light.shadow.normalBias = .025; light.shadow.bias = -.0002;
    this.scene.add(light, light.target);
    this.buildLandscape(); this.buildAirplane();
    this.scene.add(this.airplane, this.flow);
    this.arrows = Object.fromEntries(Object.entries({ lift: 0x388b6b, drag: 0xad6748, weight: 0x906b89, thrust: 0xb78b35, support: 0x526d83 }).map(([key, color]) => {
      const arrow = new THREE.ArrowHelper(up, new THREE.Vector3(), 1, color, .24, .12);
      this.scene.add(arrow); return [key, arrow];
    })) as typeof this.arrows;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false; this.controls.enablePan = false;
    this.controls.minDistance = 5.5; this.controls.maxDistance = 45;
    this.controls.minPolarAngle = .12; this.controls.maxPolarAngle = Math.PI / 2 - .035;
    this.controls.addEventListener('change', this.render);
    this.controls.addEventListener('start', this.interacting);
    this.resize = new ResizeObserver(this.fit); this.resize.observe(canvas);
    canvas.addEventListener('webglcontextlost', this.contextLost);
    canvas.addEventListener('pointerdown', this.pointStart); canvas.addEventListener('pointerup', this.pointEnd);
    canvas.addEventListener('pointercancel', this.pointCancel); canvas.addEventListener('keydown', this.keyInspect);
    this.setCamera('orbit'); this.fit();
  }

  private buildLandscape() {
    const grass = new THREE.MeshStandardMaterial({ color: 0x8b9c7b, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), grass);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.025; ground.receiveShadow = true; this.scene.add(ground);
    // Stable, small asphalt texture: no remote assets and no per-frame allocation.
    const pixels = new Uint8Array(128 * 128 * 4);
    for (let i = 0; i < pixels.length / 4; i++) {
      const grain = ((i * 179 + (i % 128) * 47) % 23) - 11;
      pixels.set([105 + grain, 114 + grain, 116 + grain, 255], i * 4);
    }
    const texture = new THREE.DataTexture(pixels, 128, 128); texture.needsUpdate = true;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(90, 5); texture.colorSpace = THREE.SRGBColorSpace;
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(420, 17), new THREE.MeshStandardMaterial({ color: 0xa2adaf, map: texture, roughness: .98 }));
    runway.rotation.x = -Math.PI / 2; runway.position.set(-75, 0, 0); runway.receiveShadow = true; this.scene.add(runway);
    const white = new THREE.MeshStandardMaterial({ color: 0xf0efe5, roughness: .85 });
    const mark = (length: number, width: number, x: number, z: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(length, width), white); m.rotation.x = -Math.PI / 2; m.position.set(x, .016, z); this.scene.add(m);
    };
    for (let x = -270; x <= 120; x += 12) mark(4.5, .16, x, 0);
    mark(420, .15, -75, -7.65); mark(420, .15, -75, 7.65);
    // Small runway-side reference boards reveal travel while the camera follows the airplane.
    const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d8bd, roughness: 1 });
    for (let x = -160; x <= 65; x += 25) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(.6, .42, .10), boardMaterial);
      board.position.set(x, .21, -9.3); this.scene.add(board);
    }
    for (let i = 0; i < 9; i++) {
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1.35, 0x357f95, .20, .1);
      Object.assign(arrow.line.material, { transparent: true, opacity: .5 }); this.flow.add(arrow);
    }
  }

  private buildAirplane() {
    const enamel = new THREE.MeshPhysicalMaterial({ color: 0xf4f0dc, roughness: .29, metalness: .24, clearcoat: .35 });
    const teal = new THREE.MeshStandardMaterial({ color: 0x286d7a, roughness: .34, metalness: .3 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x657a7e, roughness: .43, metalness: .6 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x234e63, roughness: .13, metalness: .28, clearcoat: 1 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x222b30, roughness: .86 });
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent = this.airplane) => {
      const object = new THREE.Mesh(geometry, material); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
    };
    mesh(createFuselage(), enamel);
    const canopy = mesh(new THREE.SphereGeometry(1, 32, 18), glass);
    canopy.scale.set(1.02, .46, .49); canopy.position.set(-1.95, .42, 0);
    const canopyFrame = mesh(new THREE.TorusGeometry(.485, .018, 7, 40), enamel);
    canopyFrame.rotation.y = Math.PI / 2; canopyFrame.scale.y = .91; canopyFrame.position.set(-1.65, .44, 0);
    for (const side of [-1, 1] as const) {
      const stripe = mesh(new THREE.BoxGeometry(3.65, .075, .025), teal); stripe.position.set(-.7, .03, side * .53);
      const window = mesh(new THREE.SphereGeometry(.20, 20, 12), glass);
      window.scale.set(1.2, .78, .1); window.position.set(-.72, .23, side * .535);
      mesh(createCamberedWing(side), enamel, this.wings);
      const tip = mesh(createCamberedWing(side, .36, 1.2, 1.12), teal, this.wings);
      tip.position.set(.43, .24, side * 5.22);
      const flap = mesh(new THREE.BoxGeometry(1.10, .018, 2.2), trim, this.wings);
      flap.position.set(.95, .038, side * 1.70); flap.rotation.y = side * -.035;
      const tail = mesh(createCamberedWing(side, 1.67, .95, .57), enamel);
      tail.position.set(2.9, .26, 0); tail.rotation.z = -.025;
    }
    this.wings.position.set(-.65, -.22, 0); this.airplane.add(this.wings);
    this.wingMarker.position.set(.05, .153, 0); this.wingMarker.rotation.y = Math.PI / 2; this.wings.add(this.wingMarker);
    // A solid tapered fin; its fixed identifying pose is not a calculated pitch equilibrium.
    const finShape = new THREE.Shape(); finShape.moveTo(2.3, .15); finShape.lineTo(2.85, 1.60); finShape.lineTo(3.25, 1.63); finShape.lineTo(3.75, .18); finShape.closePath();
    const fin = mesh(new THREE.ExtrudeGeometry(finShape, { depth: .11, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 2, steps: 1 }), teal);
    fin.position.z = -.055;
    const rod = (a: readonly number[], b: readonly number[], radius: number, material = trim) => {
      const start = new THREE.Vector3(...a as [number, number, number]), end = new THREE.Vector3(...b as [number, number, number]);
      const direction = end.clone().sub(start); const object = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
      object.position.copy(start.add(end).multiplyScalar(.5)); object.quaternion.setFromUnitVectors(up, direction.normalize());
    };
    for (const [x, z] of [[AIRFRAME.mainGearX, -1.40], [AIRFRAME.mainGearX, 1.40], [AIRFRAME.noseGearX, 0]]) {
      rod([x!, -.30, z! * .45], [x!, AIRFRAME.wheelCenter, z!], .04);
      const wheel = new THREE.Group(); wheel.position.set(x!, AIRFRAME.wheelCenter, z!); this.airplane.add(wheel); this.tyres.push(wheel);
      const tyre = mesh(new THREE.TorusGeometry(.16, .06, 10, 28), rubber, wheel);
      tyre.scale.z = 1.15;
      const hub = mesh(new THREE.CylinderGeometry(.10, .10, .15, 16), trim, wheel); hub.rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const spoke = mesh(new THREE.BoxGeometry(.135, .018, .17), enamel, wheel); spoke.rotation.z = i * Math.PI * 2 / 5;
      }
    }
    this.propeller.position.set(-4.18, -.015, 0); this.airplane.add(this.propeller);
    const hub = mesh(new THREE.ConeGeometry(.19, .45, 24), enamel, this.propeller); hub.rotation.z = Math.PI / 2;
    const blade = mesh(new THREE.BoxGeometry(.07, 1.65, .13), trim, this.propeller); blade.rotation.x = .13;
    mesh(new THREE.BoxGeometry(.08, .14, 1.65), trim, this.propeller);
  }

  draw(snapshot: FlightSnapshot, options = this.options) {
    if (this.disposed || this.lost) return;
    const pose = aircraftPose(snapshot), previous = this.target.clone(); this.current = snapshot; this.options = options;
    this.airplane.position.set(pose.x, pose.y, 0); this.airplane.rotation.z = pose.rotation;
    this.wingMarker.visible = true;
    this.tyres.forEach(wheel => { wheel.rotation.z = pose.wheelRotation; });
    this.propeller.rotation.x = snapshot.time * snapshot.airspeed * 2;
    this.target.set(pose.x - .2, pose.y + .12, 0);
    this.camera.position.add(this.target.clone().sub(previous)); this.controls.target.copy(this.target);
    const sunlight = this.scene.children.find(child => child instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    sunlight.position.x = pose.x - 18; sunlight.target.position.set(pose.x, 0, 0); sunlight.target.updateMatrixWorld();
    const values = worldForces(snapshot);
    const origins = { lift: [-.5, .30, 2.7], drag: [1.5, .5, -2.6], weight: [.3, 1.8, 2.7], thrust: [-4.1, .8, 0], support: [.18, -1.2, 1.4] };
    for (const key of Object.keys(values) as (keyof typeof values)[]) {
      const vector = new THREE.Vector3(...values[key]), length = vector.length() * forceScale;
      const arrow = this.arrows[key]; arrow.visible = options.forces && length > .008;
      if (length > .008) { arrow.setDirection(vector.normalize()); arrow.setLength(length, Math.min(.25, length * .35), Math.min(.13, length * .18)); }
      if (key === 'support') arrow.position.set(pose.x + pose.mainWheelX, snapshot.height + .035, 1.4);
      else arrow.position.set(pose.x + origins[key][0]!, pose.y + origins[key][1]!, origins[key][2]!);
    }
    this.flow.position.set(pose.x, pose.y, 0); this.flow.visible = snapshot.airspeed > .1;
    this.flow.children.forEach((child, index) => {
      const arrow = child as THREE.ArrowHelper;
      const phase = (snapshot.time * snapshot.airspeed * .15 + index * .31) % 1;
      arrow.position.set(-7.6 + phase * 2.6, .4 + Math.floor(index / 3) * .65, (index % 3 - 1) * 2.4);
      arrow.setDirection(new THREE.Vector3(Math.cos(snapshot.pathAngle), -Math.sin(snapshot.pathAngle), 0));
    });
    if (this.fittedPitch !== snapshot.pitch) { this.fittedPitch = snapshot.pitch; this.fitAirframe(); }
    this.controls.update(); this.render();
  }

  setCamera(view: CameraView) {
    if (this.disposed) return;
    const offsets = { orbit: [-8, 5.6, 9], side: [-.5, 3.4, 15], above: [-3, 18, 11] };
    this.camera.position.copy(this.target).add(new THREE.Vector3(...offsets[view] as [number, number, number]));
    this.controls.target.copy(this.target); this.fitAirframe(); this.controls.update(); this.render();
  }
  setActive(value: boolean) { if (this.active === value) return; this.active = value; this.controls.enabled = value; if (value) this.fit(); }
  /** Fit actual mesh-local bounds, so a short wide stage closes in without cropping phone wings. */
  private fitAirframe() {
    this.airplane.updateWorldMatrix(true, true);
    const outward = this.camera.position.clone().sub(this.target).normalize();
    const right = new THREE.Vector3().crossVectors(up, outward).normalize();
    const cameraUp = new THREE.Vector3().crossVectors(outward, right).normalize();
    const vertical = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * .80;
    const horizontal = vertical * this.camera.aspect;
    let distance = 5.5;
    this.airplane.traverse(object => {
      const mesh = object as THREE.Mesh; if (!mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox!;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const delta = new THREE.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld).sub(this.target), depth = delta.dot(outward);
        distance = Math.max(distance, depth + Math.abs(delta.dot(right)) / horizontal, depth + Math.abs(delta.dot(cameraUp)) / vertical);
      }
    });
    // Reserve the bounded lift-arrow envelope at a fixed drawing scale, avoiding replay zoom.
    if (this.options.forces) {
      for (const x of [-.5,.9]) {
        const delta = new THREE.Vector3(x,3.2,2.7).add(this.airplane.position).sub(this.target), depth = delta.dot(outward);
        distance = Math.max(distance,depth+Math.abs(delta.dot(right))/horizontal,depth+Math.abs(delta.dot(cameraUp))/vertical);
      }
    }
    this.camera.position.copy(this.target).addScaledVector(outward, distance);
    this.controls.target.copy(this.target);
  }
  private interacting = () => { this.canvas.dataset.camera = 'custom'; };
  private pointStart = (event: PointerEvent) => {
    this.pointers.add(event.pointerId);
    this.pointerStart = this.pointers.size === 1 ? { id: event.pointerId, x: event.clientX, y: event.clientY } : undefined;
  };
  private pointCancel = (event: PointerEvent) => { this.pointers.delete(event.pointerId); this.pointerStart = undefined; };
  private pointEnd = (event: PointerEvent) => {
    const start = this.pointerStart; this.pointers.delete(event.pointerId); this.pointerStart = undefined;
    if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6 || !this.active || this.lost) return;
    const r = this.canvas.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2),this.camera);
    if (this.raycaster.intersectObjects(this.wings.children, false).length) this.inspectWing();
  };
  private keyInspect = (event: KeyboardEvent) => { if (event.key === 'Enter') { event.preventDefault(); this.inspectWing(); } };
  private fit = () => {
    if (this.disposed || !this.active || this.lost) return;
    const { width, height } = this.canvas.getBoundingClientRect(); if (width < 2 || height < 2) return;
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height, false); this.fitAirframe(); this.controls.update();
    this.render();
  };
  private render = () => { if (!this.disposed && this.active && !this.lost) this.renderer.render(this.scene, this.camera); };
  private contextLost = (event: Event) => { event.preventDefault(); if (!this.disposed) { this.lost = true; this.controls.enabled = false; this.unavailable(); } };
  dispose() {
    if (this.disposed) return; this.disposed = true; this.resize.disconnect(); this.controls.dispose();
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    this.canvas.removeEventListener('pointerdown', this.pointStart); this.canvas.removeEventListener('pointerup', this.pointEnd);
    this.canvas.removeEventListener('pointercancel', this.pointCancel); this.canvas.removeEventListener('keydown', this.keyInspect); this.pointers.clear();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    this.scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      const owned = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      owned.forEach(material => { materials.add(material); Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }); });
    });
    geometries.forEach(geometry => geometry.dispose()); textures.forEach(texture => texture.dispose()); materials.forEach(material => material.dispose());
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.scene.clear();
  }
}
