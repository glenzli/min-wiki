import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { t } from './i18n.ts';

type Preset = 'oblique' | 'front' | 'top';
type NavigationAction = Preset | 'reset';

const target = new THREE.Vector3(0, .95, 0);
const positions: Record<Preset, readonly [number, number, number]> = {
  oblique: [4.4, 8.4, 12.8],
  front: [0, 3.8, 16],
  top: [.1, 18, .5],
};

/** Owns observation gestures and presets, without changing the experiment or
 * introducing a rendering clock. The scene retains fitting and projection. */
export class LabNavigation {
  private readonly controls: OrbitControls;
  private readonly element: HTMLDivElement;
  private readonly buttons = new Map<NavigationAction, HTMLButtonElement>();
  private readonly previousTouchAction: string;
  private manualView = false;
  private selected: Preset | null = null;
  private syncing = false;
  private notifying = false;
  private visible = true;
  private disposed = false;

  get manual(): boolean { return this.manualView; }

  constructor(
    private readonly camera: THREE.OrthographicCamera,
    private readonly canvas: HTMLCanvasElement,
    holder: HTMLElement,
    private readonly onChange: () => void,
  ) {
    this.previousTouchAction = canvas.style.touchAction;
    this.controls = new OrbitControls(camera, canvas);
    this.controls.enableDamping = false;
    this.controls.autoRotate = false;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = .18;
    this.controls.maxPolarAngle = 1.35;
    this.controls.minZoom = .7;
    this.controls.maxZoom = 1.8;
    this.controls.rotateSpeed = .65;
    this.controls.zoomSpeed = .75;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    // Pan is disabled, so two fingers change scale without shifting the target.
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom, .7, 1.8);
    this.camera.updateProjectionMatrix();

    this.element = document.createElement('div');
    this.element.className = 'lab-navigation';
    this.element.setAttribute('role', 'group');
    this.element.setAttribute('aria-label', t('观察视角'));
    const presets = document.createElement('div');
    presets.className = 'lab-navigation-presets';
    const labels: readonly [NavigationAction, string][] = [
      ['oblique', t('斜看')], ['front', t('正面')],
      ['top', t('俯看')], ['reset', t('重置')],
    ];
    for (const [action, label] of labels) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lab-navigation-button';
      button.dataset.view = action;
      button.textContent = label;
      button.style.minWidth = button.style.minHeight = '44px';
      button.addEventListener('click', this.handlePreset);
      presets.append(button);
      this.buttons.set(action, button);
    }
    const hint = document.createElement('p');
    hint.className = 'lab-navigation-hint';
    hint.textContent = t('拖动旋转 · 双指缩放');
    this.element.append(presets, hint);
    holder.append(this.element);
    this.sync();
    this.canvas.addEventListener('wheel', this.handleWheelCapture, { capture: true, passive: true });
    this.controls.addEventListener('start', this.handleStart);
    this.controls.addEventListener('change', this.handleChange);
  }

  /** Reconcile an external automatic orientation without notifying the scene
   * again. Calling this from onChange is safe, including a nested scene draw. */
  sync(): void {
    if (this.disposed) return;
    const wasSyncing = this.syncing;
    this.syncing = true;
    try {
      this.controls.target.copy(target);
      this.controls.update();
      this.camera.updateMatrixWorld();
      if (!this.manualView) {
        const [x, y, z] = positions.oblique;
        this.selected = Math.hypot(this.camera.position.x - x, this.camera.position.y - y, this.camera.position.z - z) < 1e-6
          ? 'oblique' : null;
        this.updateButtons();
      }
    } finally { this.syncing = wasSyncing; }
  }

  private readonly handleWheelCapture = (event: WheelEvent): void => {
    // Keep ordinary page scrolling native. Trackpad pinch and an intentional
    // modifier-wheel gesture can still reach OrbitControls' zoom handler.
    if (!event.ctrlKey && !event.metaKey) event.stopImmediatePropagation();
  };

  setVisible(visible: boolean): void {
    if (this.disposed) return;
    this.visible = visible;
    this.element.hidden = !visible;
    this.controls.enabled = visible;
    this.canvas.style.touchAction = visible ? 'none' : this.previousTouchAction;
  }

  private readonly handleStart = (): void => {
    if (this.disposed || !this.visible || this.syncing) return;
    this.manualView = true;
    this.selected = null;
    this.updateButtons();
  };

  private readonly handleChange = (): void => {
    if (this.disposed || !this.visible || this.syncing) return;
    this.notifyChange();
  };

  private readonly handlePreset = (event: Event): void => {
    if (this.disposed || !this.visible) return;
    const action = (event.currentTarget as HTMLButtonElement).dataset.view as NavigationAction;
    const preset = action === 'reset' ? 'oblique' : action;
    this.manualView = action !== 'reset';
    this.selected = preset;
    this.camera.position.set(...positions[preset]);
    if (action === 'reset') this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.sync();
    this.updateButtons();
    // Reset first supplies the base angle. The scene can then restore its
    // current clay-opening angle because manual is already false here.
    this.notifyChange();
  };

  private updateButtons(): void {
    this.element.dataset.manual = String(this.manualView);
    for (const [action, button] of this.buttons) {
      if (action !== 'reset') button.setAttribute('aria-pressed', String(action === this.selected));
    }
  }

  private notifyChange(): void {
    if (this.notifying) return;
    this.notifying = true;
    try { this.onChange(); } finally { this.notifying = false; }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.controls.enabled = false;
    this.controls.removeEventListener('start', this.handleStart);
    this.controls.removeEventListener('change', this.handleChange);
    this.controls.dispose();
    this.canvas.removeEventListener('wheel', this.handleWheelCapture, true);
    this.canvas.style.touchAction = this.previousTouchAction;
    for (const button of this.buttons.values()) button.removeEventListener('click', this.handlePreset);
    this.buttons.clear();
    this.element.remove();
  }
}
