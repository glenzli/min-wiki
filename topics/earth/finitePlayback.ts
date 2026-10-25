/** A finite presentation clock. Galleries define their own meaning of progress,
 * conservation rules and scientific time; this helper only requests observations. */
export interface FinitePlaybackOptions {
  element: HTMLElement;
  id: string;
  durationMs: number;
  readProgress: () => number;
  writeProgress: (fraction: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  frameIntervalMs?: number;
  reducedMotionSteps?: number;
  visibilityTarget?: Element;
}
export interface FinitePlayback {
  play(): void;
  pause(): void;
  toggle(): void;
  reset(): void;
  setProgress(fraction: number): void;
  sync(): void;
  isPlaying(): boolean;
  dispose(): void;
}
const bounded = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

export function createFinitePlayback(options: FinitePlaybackOptions): FinitePlayback {
  if (!Number.isFinite(options.durationMs) || options.durationMs <= 0) throw new RangeError('A finite positive playback duration is required.');
  const interval = Math.max(40, options.frameIntervalMs ?? 80);
  const reducedSteps = Math.max(1, Math.min(100, Math.round(options.reducedMotionSteps ?? 10)));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const target = options.visibilityTarget ?? options.element;
  const events = new AbortController();
  let playing = false, disposed = false, frame = 0, startTime = 0, startProgress = 0, lastWriteTime = 0, lastProgress = 0;
  options.element.dataset.finitePlayback = options.id;
  function sync() {
    const value = bounded(options.readProgress());
    options.element.dataset.playbackProgress = String(value);
    options.element.dataset.playbackState = playing ? 'playing' : value >= 1 ? 'complete' : 'paused';
    options.element.dataset.playbackMotion = reduced.matches ? 'stepped' : 'continuous';
  }
  function pause() {
    cancelAnimationFrame(frame); frame = 0;
    const changed = playing; playing = false; sync();
    if (changed) options.onPlayingChange?.(false);
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || !playing) return;
    if (document.hidden) { pause(); return; }
    const raw = bounded(startProgress + Math.max(0, now - startTime) / options.durationMs);
    const next = Math.max(lastProgress, reduced.matches && raw < 1 ? Math.floor(raw * reducedSteps) / reducedSteps : raw);
    if ((now - lastWriteTime >= interval || raw >= 1) && next > lastProgress) {
      lastWriteTime = now; lastProgress = next;
      options.writeProgress(next); sync();
    }
    if (disposed || !playing) return;
    if (raw >= 1) { pause(); return; }
    frame = requestAnimationFrame(tick);
  }
  function play() {
    if (disposed || playing || document.hidden) return;
    const box = target.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0 || box.bottom < -60 || box.top > innerHeight + 60
      || box.right < -60 || box.left > innerWidth + 60 || getComputedStyle(target).visibility === 'hidden') return;
    let progress = bounded(options.readProgress());
    if (progress >= 1) { options.writeProgress(0); progress = bounded(options.readProgress()); }
    startProgress = lastProgress = progress;
    startTime = lastWriteTime = performance.now();
    playing = true; sync(); options.onPlayingChange?.(true);
    frame = requestAnimationFrame(tick);
  }
  function setProgress(fraction: number) {
    if (disposed) return;
    pause(); options.writeProgress(bounded(fraction)); sync();
  }
  const observer = new IntersectionObserver(entries => {
    if (!entries[0]?.isIntersecting) pause();
  }, { rootMargin: '60px' });
  observer.observe(target);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, { signal: events.signal });
  sync();
  return {
    play, pause, toggle: () => { if (playing) pause(); else play(); },
    reset: () => setProgress(0), setProgress, sync, isPlaying: () => playing,
    dispose() {
      if (disposed) return;
      pause(); disposed = true; observer.disconnect(); events.abort();
    },
  };
}
