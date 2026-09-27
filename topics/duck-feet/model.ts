const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, p: number) => { const x = clamp((p - a) / (b - a)); return x * x * (3 - 2 * x); };

/** One illustrative stroke; no calibrated force or swimming-speed prediction. */
export function strokeAt(progress: number) {
  const p = clamp(progress);
  const push = smooth(.12, .58, p), recover = smooth(.62, .93, p);
  const fold = smooth(.55, .68, p) * (1 - smooth(.91, 1, p));
  return {
    stage: p < .12 ? 0 : p < .58 ? 1 : 2,
    footX: 22 - 80 * push + 80 * recover,
    footY: 99 - 22 * Math.sin(Math.PI * recover),
    angle: -18 + 57 * push - 57 * recover,
    spread: 1 - .72 * fold,
    bodyX: 315 + 62 * push + 9 * recover,
    thrust: p <= .12 || p >= .58 ? 0 : Math.sin(Math.PI * (p - .12) / .46) ** 2,
    wake: push,
  };
}

/** Locations of the explanatory force arrows, tied to the same foot stroke. */
export function forceArrowsAt(progress: number, withoutWeb: boolean) {
  const stroke = strokeAt(progress);
  const footX = stroke.bodyX + stroke.footX - 20;
  return {
    water: { from: footX - 22, to: footX - (withoutWeb ? 86 : 170), y: 377 },
    foot: { from: footX + 24, to: footX + (withoutWeb ? 101 : 185), y: 330 },
    emphasis: stroke.thrust * (withoutWeb ? .36 : 1),
  };
}
