import * as THREE from 'three';
import type { CloudFrame, CloudParticle } from './cloudModel.ts';
import { createCloudParticleGeometry, cloudParticleRotation } from './cloudParticleGeometry.ts';

/** One bounded 3D projection. The controller supplies every scientific time sample. */
export class CloudScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, .1, 80);
  private readonly observer: ResizeObserver;
  private readonly resources: Array<{ dispose(): void }> = [];
  private readonly particles = new Map<string, { group: THREE.Group; sign: THREE.Sprite }>();
  private readonly positive: THREE.Mesh;
  private readonly negative: THREE.Mesh;
  private readonly arrows: THREE.Mesh[] = [];
  private state?: CloudFrame;
  private yaw = .20;
  private pitch = .17;
  private pointer?: { id: number; x: number; y: number; yaw: number; pitch: number };
  private disposed = false;
  private width = 0;
  private height = 0;
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  constructor(private readonly canvas: HTMLCanvasElement, initial: CloudFrame, private readonly failed: () => void) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    this.renderer = renderer;
    try {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setClearColor('#142737');
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.scene.fog = new THREE.Fog('#142737', 18, 33);
      this.scene.add(new THREE.HemisphereLight('#e9f4f7', '#536a72', 2));
      const key = new THREE.DirectionalLight('#fff0d1', 3.2); key.position.set(-5, 8, 9); this.scene.add(key);
      const rim = new THREE.DirectionalLight('#84b7df', 2.1); rim.position.set(7, 3, -7); this.scene.add(rim);
      const keep = <T extends { dispose(): void }>(resource: T) => { this.resources.push(resource); return resource; };
      const standard = (color: string, roughness = .65) => keep(new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }));
      const iceMaterial = standard('#e1f3f6', .24), graupelMaterial = standard('#d9e4df', .95);
      const rimedMaterial = standard('#f1f3e8', .95);
      const dropletMaterial = keep(new THREE.MeshPhysicalMaterial({ color: '#a8d5e0', roughness: .08, metalness: 0,
        transparent: true, opacity: .68, clearcoat: 1, depthWrite: false }));
      const geometry = createCloudParticleGeometry(); Object.values(geometry).forEach(keep);
      const signMaterial = (sign: string, color: string) => {
        const buffer = document.createElement('canvas'); buffer.width = buffer.height = 64;
        const c = buffer.getContext('2d'); if (!c) throw new Error('Charge texture unavailable');
        c.font = '600 54px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineJoin = 'round'; c.lineWidth = 6; c.strokeStyle = '#102534'; c.strokeText(sign, 32, 31);
        c.fillStyle = color; c.fillText(sign, 32, 31);
        const texture = keep(new THREE.CanvasTexture(buffer)); texture.colorSpace = THREE.SRGBColorSpace;
        return keep(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
      };
      const plusMaterial = signMaterial('+', '#ffdd9f'), minusMaterial = signMaterial('−', '#bdedff');
      for (const particle of initial.particles) {
        const group = new THREE.Group();
        if (particle.kind === 'ice') {
          group.add(new THREE.Mesh(geometry.ice, iceMaterial));
        } else if (particle.kind === 'graupel') {
          group.add(new THREE.Mesh(geometry.graupel, graupelMaterial), new THREE.Mesh(geometry.rime, rimedMaterial));
        } else {
          const droplet = new THREE.Mesh(geometry.droplet, dropletMaterial); droplet.scale.setScalar(particle.size); group.add(droplet);
        }
        const sign = new THREE.Sprite(particle.kind === 'ice' ? plusMaterial : minusMaterial);
        sign.position.set(.36, .28, 0); sign.scale.set(.27, .27, 1); group.add(sign);
        this.scene.add(group); this.particles.set(particle.id, { group, sign });
      }
      // This is an open region in a cloud: no enclosing shell, vessel or floor.
      const sphereGeometry = keep(new THREE.SphereGeometry(1, 28, 14));
      const regionMaterial = (color: string) => keep(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
      this.positive = new THREE.Mesh(sphereGeometry, regionMaterial('#f0c67e')); this.positive.scale.set(2.55, .72, 1.65); this.positive.position.y = 2.15;
      this.negative = new THREE.Mesh(sphereGeometry, regionMaterial('#83bbd7')); this.negative.scale.set(2.2, .85, 1.6); this.negative.position.y = -1.5;
      this.scene.add(this.positive, this.negative);
      const airPath = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.1, -2.9, .55), new THREE.Vector3(-2.5, -1.2, .2), new THREE.Vector3(-2.1, .8, -.2), new THREE.Vector3(-1.3, 3.3, -.25)]);
      const flowMaterial = keep(new THREE.MeshBasicMaterial({ color: '#e2c291', transparent: true, opacity: .5 }));
      this.scene.add(new THREE.Mesh(keep(new THREE.TubeGeometry(airPath, 36, .018, 5, false)), flowMaterial));
      const cone = keep(new THREE.ConeGeometry(.10, .22, 7));
      for (let i = 0; i < 4; i++) { const arrow = new THREE.Mesh(cone, flowMaterial); arrow.userData.path = airPath; this.arrows.push(arrow); this.scene.add(arrow); }
      this.observer = new ResizeObserver(() => this.render()); this.observer.observe(canvas);
      canvas.addEventListener('pointerdown', this.down); canvas.addEventListener('pointermove', this.move);
      canvas.addEventListener('pointerup', this.up); canvas.addEventListener('pointercancel', this.up);
      canvas.addEventListener('keydown', this.key); canvas.addEventListener('webglcontextlost', this.lost);
      this.draw(initial);
    } catch (error) { this.resources.forEach(resource => resource.dispose()); renderer.dispose(); renderer.forceContextLoss(); throw error; }
  }
  private updateParticle(particle: CloudParticle, p: number) {
    const target = this.particles.get(particle.id)!;
    target.group.position.set(...particle.position);
    target.group.rotation.set(...cloudParticleRotation(particle, p));
    target.sign.visible = particle.charge !== 0;
  }
  draw(state: CloudFrame) {
    if (this.disposed) return;
    this.state = state;
    for (const particle of state.particles) this.updateParticle(particle, state.progress);
    (this.positive.material as THREE.MeshBasicMaterial).opacity = state.separation * .055;
    (this.negative.material as THREE.MeshBasicMaterial).opacity = state.separation * .07;
    for (let i = 0; i < this.arrows.length; i++) {
      const arrow = this.arrows[i], path = arrow.userData.path as THREE.CatmullRomCurve3;
      const u = .10 + i * .23 + state.progress * .025;
      arrow.position.copy(path.getPoint(u)); arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), path.getTangent(u).normalize());
    }
    this.render();
  }
  private render() {
    if (this.disposed || !this.state || this.canvas.clientWidth < 1 || this.canvas.clientHeight < 1) return;
    const width = this.canvas.clientWidth, height = this.canvas.clientHeight;
    if (width !== this.width || height !== this.height) { this.width = width; this.height = height; this.renderer.setSize(width, height, false); }
    this.camera.aspect = width / height;
    const u = Math.max(0, Math.min(1, (this.state.progress - .12) / .16)), blend = u * u * (3 - 2 * u);
    // Begin near the encounters, then reveal their vertical separation. The
    // cutaway may extend outside this explicitly local observation window.
    const distance = this.reducedMotion.matches ? 13.6 : 9.2 + 4.4 * blend;
    this.camera.position.set(Math.sin(this.yaw) * distance, .45 + Math.sin(this.pitch) * distance, Math.cos(this.yaw) * distance);
    this.camera.lookAt(0, .25, 0); this.camera.updateProjectionMatrix();
    try { this.renderer.render(this.scene, this.camera); } catch { this.failed(); }
  }
  resetOrbit() { this.yaw = .20; this.pitch = .17; this.render(); }
  private down = (event: PointerEvent) => {
    if (event.button !== 0 || this.pointer) return;
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: this.yaw, pitch: this.pitch };
    this.canvas.setPointerCapture(event.pointerId);
  };
  private move = (event: PointerEvent) => {
    const p = this.pointer; if (!p || p.id !== event.pointerId) return;
    this.yaw = Math.max(-.35, Math.min(.65, p.yaw + (event.clientX - p.x) * .005));
    this.pitch = Math.max(-.07, Math.min(.40, p.pitch + (event.clientY - p.y) * .004)); this.render();
  };
  private up = (event: PointerEvent) => { if (this.pointer?.id === event.pointerId) this.pointer = undefined; };
  private key = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') { this.resetOrbit(); return; }
    this.yaw = Math.max(-.35, Math.min(.65, this.yaw + (event.key === 'ArrowRight' ? .07 : event.key === 'ArrowLeft' ? -.07 : 0)));
    this.pitch = Math.max(-.07, Math.min(.40, this.pitch + (event.key === 'ArrowUp' ? .05 : event.key === 'ArrowDown' ? -.05 : 0))); this.render();
  };
  private lost = (event: Event) => { event.preventDefault(); this.failed(); };
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.observer.disconnect();
    if (this.pointer && this.canvas.hasPointerCapture(this.pointer.id)) this.canvas.releasePointerCapture(this.pointer.id);
    this.pointer = undefined;
    this.canvas.removeEventListener('pointerdown', this.down); this.canvas.removeEventListener('pointermove', this.move);
    this.canvas.removeEventListener('pointerup', this.up); this.canvas.removeEventListener('pointercancel', this.up);
    this.canvas.removeEventListener('keydown', this.key); this.canvas.removeEventListener('webglcontextlost', this.lost);
    this.resources.forEach(resource => resource.dispose()); this.resources.length = 0;
    this.particles.clear(); this.scene.clear(); this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}
