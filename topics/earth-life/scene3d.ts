import { createThreeStage } from '../earth/threeStage.ts';
import { createPlantGeometry, disposePlantGeometry, triangleCount } from './geometry.ts';
import type { LifeState } from './model.ts';

export function createPlantScene(host: HTMLElement, options: { label: string; plant: LifeState['plant']; detail: LifeState['detail']; onUnavailable: (error: unknown) => void }) {
  const stage = createThreeStage(host, { label: options.label, cameraPosition: [4.6, 1.1, 9.7], target: [0, .1, 0], minDistance: 3, maxDistance: 15, background: '#12231e', onUnavailable: options.onUnavailable });
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  let plant = options.plant, detail = options.detail, exhibit = createPlantGeometry(plant, detail, mobile), disposed = false;
  stage.group.add(exhibit); stage.canvas.dataset.lifeTriangles = String(triangleCount(exhibit)); stage.requestRender();
  return {
    update(next: LifeState['plant'], nextDetail: LifeState['detail']) {
      if (disposed || (next === plant && nextDetail === detail)) return;
      disposePlantGeometry(exhibit); plant = next; detail = nextDetail; exhibit = createPlantGeometry(plant, detail, mobile);
      stage.group.add(exhibit); stage.canvas.dataset.lifeTriangles = String(triangleCount(exhibit)); stage.requestRender();
    },
    resetCamera() { if (!disposed) stage.resetCamera(); },
    pause() { if (!disposed) stage.setPaused(true); },
    resume() { if (!disposed) stage.setPaused(false); },
    dispose() { if (disposed) return; disposed = true; stage.dispose(); },
  };
}
