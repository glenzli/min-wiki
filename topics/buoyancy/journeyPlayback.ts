/** One finite, reversible clock. It never owns scientific state or a second animation loop. */
export interface JourneyClock {
  now(): number;
  request(callback: (time: number) => void): number;
  cancel(handle: number): void;
}
const browserClock: JourneyClock = {
  now: () => performance.now(), request: callback => requestAnimationFrame(callback), cancel: handle => cancelAnimationFrame(handle),
};
export class JourneyPlayback {
  private frame = 0;
  private current = 0;
  private duration = 10000;
  private active = false;
  private disposed = false;
  constructor(private readonly paint: (progress: number, playing: boolean) => void, private readonly clock: JourneyClock = browserClock) {}
  get progress() { return this.current; }
  get playing() { return this.active; }
  select(progress: number, seconds: number) {
    this.stop(); this.duration = Math.max(.1, seconds) * 1000;
    this.current = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
    this.paint(this.current, false);
  }
  seek(progress: number) { this.select(progress, this.duration / 1000); }
  play() {
    if (this.disposed || this.active) return;
    if (this.current >= 1) this.current = 0;
    this.active = true;
    const from = this.current, start = this.clock.now();
    this.paint(this.current, true);
    const tick = (now: number) => {
      this.frame = 0;
      if (!this.active || this.disposed) return;
      this.current = Math.min(1, from + Math.max(0, now - start) / this.duration);
      if (this.current >= 1) this.active = false;
      this.paint(this.current, this.active);
      if (this.active) this.frame = this.clock.request(tick);
    };
    this.frame = this.clock.request(tick);
  }
  pause() { this.stop(); if (!this.disposed) this.paint(this.current, false); }
  private stop() { if (this.frame) this.clock.cancel(this.frame); this.frame = 0; this.active = false; }
  dispose() { this.stop(); this.disposed = true; }
}
