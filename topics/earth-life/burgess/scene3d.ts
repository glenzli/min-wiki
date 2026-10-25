import * as THREE from 'three';
import { createThreeStage } from '../../earth/threeStage.ts';
import { createWaptiaAsset } from '../burgessGeometry.ts';
import type { BurgessState } from './model.ts';

/** Context/light/ruler are authored observation settings, not a sampled Cambrian site. */
export function createBurgessScene(host: HTMLElement, options: { label: string; initial: BurgessState; onUnavailable(error: unknown): void; onResetView(): void }) {
  const stage = createThreeStage(host, { label: options.label, cameraPosition: [0, 3.5, 10.7], target: [-.45, -.05, 0],
    minDistance: 4.5, maxDistance: 16, background: '#0b2025', onUnavailable: options.onUnavailable });
  try {
    const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
    const asset = createWaptiaAsset(mobile);
    const events = new AbortController();
    stage.canvas.addEventListener('keydown', event => { if (event.key === 'Home') { resetCamera(); options.onResetView(); } }, { signal: events.signal });
    stage.group.add(asset.group);
    stage.scene.fog = new THREE.Fog('#0b2025', 11, 24);
    stage.renderer.toneMappingExposure = .98;
    // An unobtrusive original silt surface supplies spatial reference, not a fossil site map.
    const floorGeometry = new THREE.PlaneGeometry(24, 24, mobile ? 30 : 56, mobile ? 20 : 36);
    floorGeometry.rotateX(-Math.PI / 2);
    const position = floorGeometry.getAttribute('position');
    const color: number[] = [];
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      const grain = Math.sin(x * 43.7 + z * 17.3) * Math.cos(z * 29.1 - x * 11.8);
      position.setY(i, -1.5 + .016 * grain + .035 * Math.sin(x * .9 + z * 1.4));
      const shade = .105 + .012 * grain;
      color.push(shade * .89, shade, shade * .94);
    }
    floorGeometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3)); floorGeometry.computeVertexNormals();
    const floor = new THREE.Mesh(floorGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98, metalness: 0 }));
    floor.userData.authoredSetting = true; stage.group.add(floor);
    // Exactly one world unit is 10 mm. Projection can foreshorten this reference.
    const ruler = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(1.15, -1.35, .95), new THREE.Vector3(2.15, -1.35, .95),
      new THREE.Vector3(1.15, -1.43, .95), new THREE.Vector3(1.15, -1.27, .95),
      new THREE.Vector3(2.15, -1.43, .95), new THREE.Vector3(2.15, -1.27, .95),
    ]), new THREE.LineBasicMaterial({ color: '#c5d9cc', transparent: true, opacity: .8 }));
    ruler.userData.lengthMm = 10; stage.group.add(ruler);
    const label = host.ownerDocument.createElement('span'); label.className = 'burgess-ruler-label'; label.textContent = '10 mm'; label.setAttribute('aria-hidden', 'true'); host.append(label);
    const labelPosition = new THREE.Vector3(1.65, -1.46, .95);
    let rulerSuppressed = false;
    const projectRuler = () => {
      stage.camera.updateMatrixWorld();
      const v = labelPosition.clone().project(stage.camera);
      label.style.left = `${(v.x + 1) * host.clientWidth / 2}px`; label.style.top = `${(1 - v.y) * host.clientHeight / 2}px`;
      label.hidden = rulerSuppressed || v.z < -1 || v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1;
      stage.canvas.dataset.burgessCameraPosition = stage.camera.position.toArray().map(n => n.toFixed(4)).join(',');
    };
    stage.controls.addEventListener('change', projectRuler);
    const resize = new ResizeObserver(projectRuler); resize.observe(host);
    let state: BurgessState | undefined, disposed = false;
    function applyCamera(next: BurgessState) {
      const scale = asset.group.scale.x;
      const targets: Record<BurgessState['part'], [number, number, number]> = {
        whole: [-.45, -.05, 0], shield: [-1.65 * scale, .08 * scale, 0], head: [-2.18 * scale, .03 * scale, 0],
        limbs: [-1.08 * scale, -.35 * scale, 0], tail: [1.25 * scale, .13 * scale, 0],
      };
      const offsets: Record<BurgessState['camera'], [number, number, number]> = {
        oblique: [.45, 3.55, 10.7], side: [0, .2, 11.2], dorsal: [0, 11.35, .12], ventral: [0, -10.25, 1.6],
      };
      const factor = { whole: 1, shield: .59, head: .57, limbs: .62, tail: .64 }[next.part];
      const target = new THREE.Vector3(...targets[next.part]);
      stage.controls.target.copy(target); stage.controls.minDistance = next.part === 'whole' ? 4.5 : 2.9;
      stage.camera.position.copy(target).add(new THREE.Vector3(...offsets[next.camera]).multiplyScalar(factor)); stage.controls.update();
      // The ventral inspection deliberately removes the illustrative floor from view.
      rulerSuppressed = next.camera === 'ventral'; floor.visible = !rulerSuppressed; ruler.visible = !rulerSuppressed; label.hidden = rulerSuppressed;
      projectRuler();
    }
    function resetCamera() { if (!disposed) applyCamera({ ...(state ?? options.initial), camera: 'oblique' }); }
    function update(next: BurgessState) {
      if (disposed) return;
      asset.setPose(next.progress / 100, next.activity === 'paddle');
      if (!state || state.part !== next.part || state.evidence !== next.evidence) {
        if (state) asset.setEvidence(state.part, false);
        asset.setEvidence(next.part, next.evidence);
      }
      if (!state || state.camera !== next.camera || state.part !== next.part) applyCamera(next);
      state = { ...next };
      stage.canvas.dataset.burgessPart = next.part; stage.canvas.dataset.burgessProgress = String(next.progress);
      stage.canvas.dataset.burgessCamera = next.camera; stage.canvas.dataset.burgessRuler = String(ruler.visible);
      stage.canvas.dataset.burgessActivity = next.activity; stage.canvas.dataset.burgessEvidence = String(next.evidence);
      stage.canvas.dataset.millimetresPerUnit = '10'; projectRuler();
      if (next.camera === 'ventral') label.hidden = true;
      stage.requestRender();
    }
    update(options.initial);
    return {
      update, resetCamera,
      pause() { stage.setPaused(true); }, resume() { stage.setPaused(false); },
      dispose() {
        if (disposed) return; disposed = true;
        events.abort(); resize.disconnect(); stage.controls.removeEventListener('change', projectRuler); label.remove();
        // The asset also owns skeleton bone textures, which a generic scene traversal cannot find.
        asset.dispose();
        // The stage releases the remaining ruler/substrate, controls and context once.
        stage.dispose();
      },
    };
  } catch (error) { stage.dispose(); throw error; }
}
