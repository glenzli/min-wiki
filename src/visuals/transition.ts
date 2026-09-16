/** A finite presentation transition. The topic remains the owner of model state. */
export function animateValue(options: {
  from: number;
  to: number;
  duration: number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}): () => void {
  const { from, to, duration, onUpdate, onComplete } = options;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let cancelled = false;
  const start = performance.now();
  const cancel = () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    preference.removeEventListener('change', finishForPreference);
    document.removeEventListener('visibilitychange', finishWhenHidden);
    window.removeEventListener('pagehide', cancel);
  };
  const finish = () => {
    if (cancelled) return;
    cancel();
    onUpdate(to);
    onComplete?.();
  };
  function finishForPreference() { if (preference.matches) finish(); }
  function finishWhenHidden() { if (document.hidden) finish(); }
  if (preference.matches || duration <= 0 || from === to || document.hidden) {
    finish();
    return cancel;
  }
  const tick = (now: number) => {
    if (cancelled) return;
    const progress = Math.min(1, Math.max(0, (now - start) / duration));
    if (progress === 1) { finish(); return; }
    // Smoothstep gives both ends zero velocity and never overshoots.
    onUpdate(from + (to - from) * progress * progress * (3 - 2 * progress));
    if (!cancelled) frame = requestAnimationFrame(tick);
  };
  preference.addEventListener('change', finishForPreference);
  document.addEventListener('visibilitychange', finishWhenHidden);
  window.addEventListener('pagehide', cancel, { once: true });
  onUpdate(from);
  if (!cancelled) frame = requestAnimationFrame(tick);
  return cancel;
}
