/** Explanatory sequence, not a conduction-speed or pain-intensity simulation. */
export const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const segment = (p: number, start: number, end: number) => clamp((p - start) / (end - start));
export function painSequence(progress: number) {
  const p = clamp(progress);
  return {
    progress: p,
    ending: segment(p, 0.02, 0.15),
    incoming: segment(p, 0.15, 0.44),
    reflex: segment(p, 0.44, 0.68),
    ascending: segment(p, 0.44, 0.91),
    withdrawal: segment(p, 0.68, 0.84),
    processing: segment(p, 0.91, 1),
    phase: p < 0.15 ? 0 : p < 0.44 ? 1 : p < 0.68 ? 2 : p < 0.91 ? 3 : 4,
  };
}
