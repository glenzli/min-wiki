import { createThreeStage } from '../earth/threeStage.ts';
import { createPlantGeometry, disposePlantGeometry, triangleCount } from './geometry.ts';
import type { LifeState } from './model.ts';

export function createPlantScene(host: HTMLElement, options: { label: string; plant: LifeState['plant']; detail: LifeState['detail']; onUnavailable: (error: unknown) => void }) {
  const stage = createThreeStage(host, { label: options.label, cameraPosition: [4.6, 1.1, 9.7], target: [0, .1, 0], minDistance: 3, maxDistance: 15, background: '#12231e', onUnavailable: options.onUnavailable });
  const events = new AbortController();
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  let plant = options.plant, detail = options.detail, exhibit = createPlantGeometry(plant, detail, mobile), disposed = false;
  function resetCamera() {
    if (disposed) return;
    const close = detail === 'surface';
    const target: [number, number, number] = close && plant === 'seedfern' ? [.63, -.15, 0] : [0, .1, 0];
    const offset: [number, number, number] = close ? plant === 'seedfern' ? [.75, .35, 4.05] : [2.9, .7, 6.4] : [4.6, 1, 9.7];
    stage.controls.target.set(...target); stage.camera.position.set(target[0] + offset[0], target[1] + offset[1], target[2] + offset[2]);
    stage.controls.update(); stage.requestRender();
  }
  stage.canvas.addEventListener('keydown', event => { if (event.key === 'Home') resetCamera(); }, { signal: events.signal });
  stage.group.add(exhibit); stage.canvas.dataset.lifeTriangles = String(triangleCount(exhibit)); resetCamera();
  return {
    update(next: LifeState['plant'], nextDetail: LifeState['detail']) {
      if (disposed || (next === plant && nextDetail === detail)) return;
      disposePlantGeometry(exhibit); plant = next; detail = nextDetail; exhibit = createPlantGeometry(plant, detail, mobile);
      stage.group.add(exhibit); stage.canvas.dataset.lifeTriangles = String(triangleCount(exhibit)); resetCamera();
    },
    resetCamera,
    pause() { if (!disposed) stage.setPaused(true); },
    resume() { if (!disposed) stage.setPaused(false); },
    dispose() { if (disposed) return; disposed = true; events.abort(); stage.dispose(); },
  };
}
