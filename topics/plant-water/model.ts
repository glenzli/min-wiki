export const WATER_STOPS = [0, .34, .64, 1] as const;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const nodes = [[259,440],[375,364],[375,180],[463,138],[482,108],[525,55]] as const;
const times = [0,.24,.61,.8,.9,1];
/** A marked cohort, not a count or a delay estimate for real molecules. */
export function waterAt(progress: number) {
  const p = clamp(progress);
  const segment = Math.min(4, times.findIndex((end, i) => i > 0 && p <= end) - 1);
  const i = Math.max(0, segment), u = clamp((p-times[i]!) / (times[i+1]!-times[i]!));
  return { x: mix(nodes[i]![0],nodes[i+1]![0],u), y: mix(nodes[i]![1],nodes[i+1]![1],u),
    vapour: clamp((p-.8)/.12), stage: p < .24 ? 0 : p < .61 ? 1 : p < .8 ? 2 : 3,
    leafProgress: clamp((p-.61)/.39) };
}
