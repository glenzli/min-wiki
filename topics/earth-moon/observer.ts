import * as THREE from 'three';
import { moonObserverFrame } from './model.ts';

/** An enlarged north-up geocentric view of the same lunar surface, not a second drawing. */
export class MoonObserver {
  private renderer: THREE.WebGLRenderer;
  private world = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1.16, 1.16, 1.16, -1.16, .1, 20);
  private sun = new THREE.DirectionalLight('#fff0cf', 3.1);
  private marker: THREE.Mesh;
  private observer: ResizeObserver;
  private disposed = false;
  constructor(private canvas: HTMLCanvasElement, surface: THREE.Mesh, marker: THREE.Mesh) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x091423, 0);
    this.world.add(surface.clone());
    this.marker = marker.clone();
    // This is an orientation annotation; keep it small in the enlarged view.
    this.marker.scale.setScalar(.55); this.world.add(this.marker);
    this.world.add(new THREE.AmbientLight('#9dc0ea', .26), this.sun);
    this.camera.position.set(0, 0, 6); this.camera.lookAt(0, 0, 0);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
    this.resize();
  }
  private resize() {
    const side = this.canvas.clientWidth;
    if (!side || this.disposed) return;
    this.renderer.setSize(side, side, false); this.render();
  }
  draw(phase: number, guides: boolean) {
    this.sun.position.set(...moonObserverFrame(phase).sunLocal).multiplyScalar(100);
    this.marker.visible = guides;
    this.canvas.dataset.phase = String(phase);
    this.render();
  }
  render() { if (!this.disposed) this.renderer.render(this.world, this.camera); }
  dispose() {
    this.disposed = true; this.observer.disconnect(); this.renderer.dispose();
    // Geometry, map and materials are shared with TopicScene, which owns disposal.
  }
}
