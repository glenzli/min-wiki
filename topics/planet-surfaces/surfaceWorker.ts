import { SurfacePainter } from './surfacePainter.ts';
import type { World } from './model.ts';
/** A job has one world; the scene terminates stale jobs and owns the transferred cache. */
self.addEventListener('message', (event: MessageEvent<World>) => {
  const world = event.data;
  try {
    const painter = new SurfacePainter();
    const canvas = painter.paintLandscape(world);
    // Transfer owned pixels, not a GPU-backed ImageBitmap. The latter can arrive
    // transparent in WebKit, despite a successful worker message and no error.
    const landscape = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    const texture = painter.paintTexture(world);
    self.postMessage({ id: world.id, landscape, texture }, { transfer: [landscape.data.buffer, texture.data.buffer] });
  } catch {
    self.postMessage({ id: world.id, error: true });
  }
});
