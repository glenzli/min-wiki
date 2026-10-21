/** An illustrative material phase, independent of the geological episode.
 * It neither advances an intrusion nor transports geological products. */
export const DETAIL_PERIOD = Math.PI * 2;
const DETAIL_RATE = .34;
const FRAME_INTERVAL = 1000 / 24;

export interface DetailMotionEnvironment {
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(id: number): void;
  hidden(): boolean;
  reducedMotion(): boolean;
  onVisibilityChange(callback: () => void): () => void;
  onReducedMotionChange(callback: () => void): () => void;
}

function browserEnvironment(): DetailMotionEnvironment {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  return {
    requestFrame: callback => requestAnimationFrame(callback),
    cancelFrame: id => cancelAnimationFrame(id),
    hidden: () => document.hidden,
    reducedMotion: () => reduced.matches,
    onVisibilityChange(callback) {
      document.addEventListener('visibilitychange', callback);
      return () => document.removeEventListener('visibilitychange', callback);
    },
    onReducedMotionChange(callback) {
      reduced.addEventListener('change', callback);
      return () => reduced.removeEventListener('change', callback);
    },
  };
}

export interface DetailMotionState {
  readonly enabled: boolean;
  readonly running: boolean;
  readonly hot: boolean;
  readonly hidden: boolean;
  readonly reducedMotion: boolean;
  /** A bounded, dimensionless presentation phase, not a physical time. */
  readonly phase: number;
  readonly disposed: boolean;
}

/** Owns admission, pacing, phase and cleanup of one material-detail RAF.
 * Hidden/reduced/cold intervals never accumulate a catch-up animation. */
export class MagmaDetailMotion {
  private enabled = true;
  private hot = false;
  private phase = 0;
  private frame = 0;
  private previous: number | undefined;
  private running = false;
  private disposed = false;
  private epoch = 0;
  private cleanup: (() => void)[];

  constructor(
    private readonly onFrame: (phase: number) => void,
    private readonly onState: (state: DetailMotionState) => void = () => {},
    private readonly environment: DetailMotionEnvironment = browserEnvironment(),
  ) {
    this.cleanup = [environment.onVisibilityChange(this.synchronize), environment.onReducedMotionChange(this.synchronize)];
    this.publish();
  }

  get state(): DetailMotionState {
    return { enabled: this.enabled, running: this.running, hot: this.hot,
      hidden: this.environment.hidden(), reducedMotion: this.environment.reducedMotion(),
      phase: this.phase, disposed: this.disposed };
  }

  setEnabled(enabled: boolean) {
    if (this.disposed || enabled === this.enabled) return;
    this.enabled = enabled; this.synchronize();
  }

  setHot(hot: boolean) {
    if (this.disposed || hot === this.hot) return;
    this.hot = hot; this.synchronize();
  }

  /** Call only for a deliberate seek/replay, not for each geological draw. */
  resetPhase() {
    if (this.disposed) return;
    this.phase = 0; this.previous = undefined;
    this.onFrame(this.phase); this.publish();
  }

  private admitted() {
    return !this.disposed && this.enabled && this.hot && !this.environment.hidden() && !this.environment.reducedMotion();
  }

  private publish() { this.onState(this.state); }

  private synchronize = () => {
    if (this.disposed) return;
    this.running = this.admitted();
    if (!this.running) {
      this.epoch++;
      if (this.frame) this.environment.cancelFrame(this.frame);
      this.frame = 0; this.previous = undefined;
    } else if (!this.frame) this.schedule();
    this.publish();
  };

  private schedule() {
    const epoch = this.epoch;
    this.frame = this.environment.requestFrame(timestamp => this.tick(timestamp, epoch));
  }

  private tick(timestamp: number, epoch: number) {
    // Reject callbacks from a stopped generation, including after disposal.
    if (epoch !== this.epoch || this.disposed) return;
    this.frame = 0;
    if (!this.admitted()) { this.synchronize(); return; }
    let changed = false;
    if (this.previous === undefined) this.previous = timestamp;
    else if (timestamp - this.previous >= FRAME_INTERVAL) {
      const elapsed = Math.min(.1, Math.max(0, (timestamp - this.previous) / 1000));
      this.previous = timestamp;
      this.phase = (this.phase + elapsed * DETAIL_RATE) % DETAIL_PERIOD;
      this.onFrame(this.phase); changed = true;
    }
    if (epoch !== this.epoch || this.disposed) return;
    this.schedule(); if (changed) this.publish();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.running = false; this.epoch++;
    if (this.frame) this.environment.cancelFrame(this.frame);
    this.frame = 0; this.previous = undefined;
    this.cleanup.forEach(remove => remove()); this.cleanup = [];
    this.publish();
  }
}
