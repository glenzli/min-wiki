/** Merge scene changes into one draw of the latest state, and cancel on disposal. */
export class RenderQueue {
  private frame: number | null = null;
  private disposed = false;
  private lastDraw = -Infinity;
  constructor(
    private draw: () => void,
    private schedule: (callback: FrameRequestCallback) => number = callback => requestAnimationFrame(callback),
    private cancel: (frame: number) => void = frame => cancelAnimationFrame(frame),
    private minimumInterval = 0,
  ) {}
  request() {
    if (this.disposed || this.frame !== null) return;
    this.frame = this.schedule(now => {
      this.frame = null;
      if (this.disposed) return;
      if (now - this.lastDraw < this.minimumInterval) { this.request(); return; }
      this.lastDraw = now;
      this.draw();
    });
  }
  dispose() {
    this.disposed = true;
    if (this.frame !== null) this.cancel(this.frame);
    this.frame = null;
  }
}
