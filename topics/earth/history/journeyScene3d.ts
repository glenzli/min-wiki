import * as THREE from 'three';
import { createThreeStage } from '../threeStage';
import { createHistoryJourneyGeometry, historyLocalFocusTarget, type HistoryJourneyLens } from './journeyGeometry';
import type { JourneyFrame } from './journeyModel';

export type HistoryJourneyCamera = { azimuth: number; elevation: number; distance: number };
export const HISTORY_LOCAL_CAMERA: HistoryJourneyCamera = { azimuth: 330, elevation: 24, distance: 3.3 };
export interface HistoryJourneySceneOptions {
  language: 'zh' | 'en';
  labels?: { scene: string };
  initialLens?: HistoryJourneyLens;
  initialCamera?: HistoryJourneyCamera;
  onUnavailable?: (error: unknown) => void;
  onCamera?: (camera: HistoryJourneyCamera) => void;
}
export interface HistoryJourneyScene {
  update(frame: JourneyFrame, lens: HistoryJourneyLens): void;
  pause(): void;
  resume(): void;
  resetCamera(): void;
  dispose(): void;
}
type MicroScene = { group: THREE.Group; update(frame: JourneyFrame): void; dispose(): void };
const rad = Math.PI / 180;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const normalizeCamera = (value: HistoryJourneyCamera): HistoryJourneyCamera => ({ azimuth: (((Number.isFinite(value.azimuth) ? value.azimuth : 0) % 360) + 360) % 360, elevation: clamp(value.elevation, -80, 80), distance: clamp(value.distance, 2.6, 12) });
const defaults: Record<HistoryJourneyLens, HistoryJourneyCamera> = {
  globe: { azimuth: 327, elevation: 18, distance: 5.5 },
  local: HISTORY_LOCAL_CAMERA,
  evidence: { azimuth: 22, elevation: 22, distance: 5.8 },
};
export function historyCameraOffset(value: HistoryJourneyCamera): THREE.Vector3 {
  const camera = normalizeCamera(value), horizontal = Math.cos(camera.elevation * rad) * camera.distance;
  return new THREE.Vector3(Math.sin(camera.azimuth * rad) * horizontal, Math.sin(camera.elevation * rad) * camera.distance, Math.cos(camera.azimuth * rad) * horizontal);
}

/** One renderer and one retained Earth across globe, attached local examples and evidence groups.
 * No scientific or ambient clock exists here: every pose consumes the supplied pure frame.
 */
export function mountHistoryJourney(host: HTMLElement, options: HistoryJourneySceneOptions): HistoryJourneyScene {
  const compact = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  let disposed = false, paused = false, failed = false, currentFrame: JourneyFrame | undefined;
  let lens = options.initialLens ?? 'globe', initialized = false, programmatic = 0, pointerGesture = false, discreteGesture = false;
  let cameraCommitQueued = false;
  let cameraKey: string = lens;
  let micro: MicroScene | undefined, microLoading = false, microEpoch = 0;
  let modernTexture: THREE.Texture | undefined, modernRequested = false;
  const disposedTextures = new Set<THREE.Texture>(), cameras = new Map<string, HistoryJourneyCamera>();
  let pendingInitial = options.initialCamera ? { lens, camera: normalizeCamera(options.initialCamera) } : undefined;
  const initial = pendingInitial?.camera ?? defaults[lens];
  const localTarget = historyLocalFocusTarget();
  const initialTarget = lens === 'local' ? localTarget.clone() : new THREE.Vector3();
  const initialPosition = initialTarget.clone().add(historyCameraOffset(initial));
  const unavailable = (error: unknown) => { if (disposed || failed) return; failed = true; options.onUnavailable?.(error); };
  const stage = createThreeStage(host, { label: options.labels?.scene ?? host.getAttribute('aria-label') ?? 'Earth history 3D illustration', cameraPosition: initialPosition.toArray() as [number, number, number], target: initialTarget.toArray() as [number, number, number], minDistance: 2.6, maxDistance: 12, background: '#070d15', onUnavailable: unavailable });
  stage.controls.minPolarAngle = 10 * rad; stage.controls.maxPolarAngle = 170 * rad;
  stage.controls.update();
  const events = new AbortController();
  let macro: ReturnType<typeof createHistoryJourneyGeometry>;
  try { macro = createHistoryJourneyGeometry(compact); stage.group.add(macro.group); }
  catch (error) { stage.dispose(); throw error; }
  stage.renderer.toneMappingExposure = .94;
  for (const light of stage.scene.children) {
    if (light instanceof THREE.HemisphereLight) light.intensity = .95;
    else if (light instanceof THREE.DirectionalLight) light.intensity = light.position.x > 0 ? .85 : 3.1;
  }
  // A restrained observation fill keeps dark rock and the cut face readable; it is not ancient sunlight data.
  const fill = new THREE.DirectionalLight('#d5e3dc', .52); fill.position.set(2, -1, 6); stage.scene.add(fill);
  stage.canvas.dataset.historyScene = 'retained-journey'; stage.canvas.dataset.historyClock = 'supplied-frame-only';
  stage.canvas.dataset.historyGeometry = compact ? 'compact' : 'detailed';
  stage.canvas.dataset.historyModernMap = 'not-requested';
  stage.canvas.dataset.historyFinish = 'loading';

  // Original high-resolution fields are generated offline. The small synchronous field is a
  // bounded fallback, so opening a scene never requires baking half a million texels on the UI thread.
  // Geometry/DPR remain compact on phones; the same small field pair keeps a close view legible.
  const finishUrls = [new URL('./assets/surface-field-1024.webp', import.meta.url).href, new URL('./assets/surface-detail-1024.webp', import.meta.url).href];
  void Promise.allSettled(finishUrls.map(url => new THREE.TextureLoader().loadAsync(url))).then(results => {
    const textures = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    if (disposed || textures.length !== 2) {
      textures.forEach(releaseTexture);
      if (!disposed) stage.canvas.dataset.historyFinish = 'fallback';
      return;
    }
    for (const [i, texture] of textures.entries()) {
      texture.colorSpace = THREE.NoColorSpace; texture.flipY = false;
      texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(4, stage.renderer.capabilities.getMaxAnisotropy());
      texture.name = i ? 'history-authored-spherical-finish-loaded' : 'history-authored-spherical-fields-loaded'; texture.needsUpdate = true;
    }
    if (!macro.setFieldTextures(textures[0], textures[1])) { textures.forEach(releaseTexture); return; }
    stage.canvas.dataset.historyFinish = 'ready-1024';
    stage.requestRender();
  });

  function targetFor(nextLens: HistoryJourneyLens): THREE.Vector3 {
    if (nextLens !== 'local') return new THREE.Vector3();
    const wholeBody = currentFrame && ['accretion', 'differentiation', 'impact'].includes(currentFrame.mode);
    return wholeBody ? new THREE.Vector3() : localTarget.clone();
  }
  function cameraContext(nextLens: HistoryJourneyLens): string { return nextLens === 'local' ? targetFor(nextLens).lengthSq() < .01 ? 'local-body' : 'local-site' : nextLens; }
  function defaultCamera(): HistoryJourneyCamera { return cameraKey === 'local-body' ? { azimuth: 327, elevation: 18, distance: 4.7 } : defaults[lens]; }
  function readCamera(): HistoryJourneyCamera {
    const offset = stage.camera.position.clone().sub(stage.controls.target), distance = offset.length();
    return normalizeCamera({ azimuth: Math.atan2(offset.x, offset.z) / rad, elevation: Math.asin(clamp(offset.y / Math.max(distance, .001), -1, 1)) / rad, distance });
  }
  function cameraChanged() {
    if (disposed || programmatic || !(pointerGesture || discreteGesture)) return;
    cameras.set(cameraKey, readCamera());
  }
  function queueCameraCommit() {
    if (cameraCommitQueued) return; cameraCommitQueued = true;
    queueMicrotask(() => {
      cameraCommitQueued = false; discreteGesture = false;
      if (disposed || paused || programmatic) return;
      const camera = readCamera(); cameras.set(cameraKey, camera); options.onCamera?.(camera);
    });
  }
  function setCamera(value: HistoryJourneyCamera, target = targetFor(lens)) {
    programmatic++;
    try { stage.controls.target.copy(target); stage.camera.position.copy(target).add(historyCameraOffset(value)); stage.controls.update(); stage.requestRender(); }
    finally { programmatic--; }
  }
  function resetCamera() { if (!disposed) setCamera(defaultCamera()); }
  stage.controls.addEventListener('change', cameraChanged);
  stage.canvas.addEventListener('pointerdown', () => { pointerGesture = true; }, { signal: events.signal, capture: true });
  for (const name of ['pointerup', 'pointercancel'] as const) stage.canvas.addEventListener(name, () => {
    if (pointerGesture && !disposed) { const camera = readCamera(); cameras.set(cameraKey, camera); options.onCamera?.(camera); } pointerGesture = false;
  }, { signal: events.signal });
  stage.canvas.addEventListener('wheel', () => { discreteGesture = true; }, { signal: events.signal, capture: true, passive: true });
  stage.canvas.addEventListener('wheel', queueCameraCommit, { signal: events.signal, passive: true });
  stage.canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
    discreteGesture = true;
    if (event.key === 'Home') { event.preventDefault(); event.stopImmediatePropagation(); resetCamera(); queueCameraCommit(); }
  }, { signal: events.signal, capture: true });
  stage.canvas.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) queueCameraCommit();
  }, { signal: events.signal });

  function releaseTexture(texture: THREE.Texture) { if (!disposedTextures.has(texture)) { disposedTextures.add(texture); texture.dispose(); } }
  function ensureModernTexture() {
    if (disposed || failed || modernRequested || currentFrame?.mode !== 'present') return;
    modernRequested = true; stage.canvas.dataset.historyModernMap = 'loading';
    // Reused, licensed modern composite only. Never applied to an ancient station.
    const texture = new THREE.TextureLoader().load(new URL('../../earth-moon/assets/2k_earth_daymap.webp', import.meta.url).href, ready => {
      if (disposed) { releaseTexture(ready); return; }
      ready.colorSpace = THREE.SRGBColorSpace; ready.anisotropy = Math.min(4, stage.renderer.capabilities.getMaxAnisotropy());
      stage.canvas.dataset.historyModernMap = 'ready'; macro.setModernTexture(ready);
      if (currentFrame) macro.update(currentFrame, lens); stage.requestRender();
    }, undefined, () => {
      if (disposed) return; stage.canvas.dataset.historyModernMap = 'unavailable';
      // Original qualitative sphere remains valid when the optional modern composite is unavailable.
      macro.setModernTexture(null); if (currentFrame) macro.update(currentFrame, lens); stage.requestRender();
    });
    modernTexture = texture; texture.colorSpace = THREE.SRGBColorSpace;
  }
  function ensureMicro() {
    if (disposed || failed || lens !== 'evidence' || micro || microLoading) return;
    microLoading = true; const ticket = ++microEpoch; stage.canvas.dataset.historyMicro = 'loading';
    void import('./microScene').then(module => {
      if (disposed || ticket !== microEpoch || lens !== 'evidence') return;
      const next = module.createHistoryMicroScene({ compact });
      if (disposed || ticket !== microEpoch || lens !== 'evidence') { next.dispose(); return; }
      micro = next; stage.group.add(next.group); if (currentFrame) next.update(currentFrame);
      stage.canvas.dataset.historyMicro = 'ready'; stage.requestRender();
    }).catch(error => { if (!disposed && ticket === microEpoch) { stage.canvas.dataset.historyMicro = 'unavailable'; unavailable(error); } }).finally(() => { if (ticket === microEpoch) microLoading = false; });
  }
  function update(frame: JourneyFrame, nextLens: HistoryJourneyLens) {
    if (disposed || failed) return;
    currentFrame = frame;
    const nextKey = cameraContext(nextLens);
    if (nextLens !== lens || !initialized || nextKey !== cameraKey) {
      if (initialized) cameras.set(cameraKey, readCamera());
      if (lens === 'evidence' && nextLens !== 'evidence') { ++microEpoch; microLoading = false; }
      lens = nextLens; cameraKey = nextKey;
      if (pendingInitial?.lens === lens) { cameras.set(cameraKey, pendingInitial.camera); pendingInitial = undefined; }
      setCamera(cameras.get(cameraKey) ?? defaultCamera()); initialized = true;
    } else {
      const target = targetFor(lens);
      if (stage.controls.target.distanceToSquared(target) > 1e-10) setCamera(readCamera(), target);
    }
    macro.update(frame, lens); if (micro) { micro.group.visible = lens === 'evidence'; if (lens === 'evidence') micro.update(frame); }
    ensureModernTexture(); ensureMicro();
    stage.canvas.dataset.historyLens = lens; stage.canvas.dataset.historyStation = frame.stationId;
    stage.canvas.dataset.historyPhase = String(frame.progress); stage.canvas.dataset.historyEarthIdentity = macro.earth.uuid;
    stage.setPaused(paused); stage.requestRender();
  }
  return {
    update,
    pause() { if (disposed) return; paused = true; pointerGesture = false; stage.setPaused(true); },
    resume() { if (disposed) return; paused = false; stage.setPaused(false); },
    resetCamera,
    dispose() {
      if (disposed) return; disposed = true; ++microEpoch; events.abort(); stage.controls.removeEventListener('change', cameraChanged);
      micro?.dispose(); micro = undefined; macro.dispose(); if (modernTexture) releaseTexture(modernTexture);
      stage.dispose();
    },
  };
}
