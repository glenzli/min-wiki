/** Timings reveal relationships; they are not measured neural latencies. */
export type Food = 'strawberry' | 'tomato';
export const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const segment = (p: number, start: number, end: number) => clamp((p - start) / (end - start));
export function flavorSequence(progress: number, includeSmell: boolean) {
  const p = clamp(progress);
  return {
    progress: p,
    dissolved: segment(p, .02, .26),
    tasteCell: segment(p, .22, .46),
    tasteNerve: segment(p, .46, .88),
    aroma: includeSmell ? segment(p, .26, .72) : 0,
    smellNerve: includeSmell ? segment(p, .72, .93) : 0,
    integration: segment(p, .88, 1),
    phase: p < .26 ? 0 : p < .46 ? 1 : p < .88 ? 2 : 3,
  };
}
