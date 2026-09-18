const clamp = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => { const v = clamp(x); return v * v * (3 - 2 * v); };
/** One grain retains its identity through transport and contact. Later phases compress plant development. */
export function pollinationFrame(progress: number) {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(3, progress)) : 0;
  const approach = smooth(p / .42), departure = smooth((p - .65) / .7);
  const beeX = 132 + 102 * approach - 150 * departure;
  const beeY = 252 - 80 * departure;
  const deposited = p >= .42;
  return { beeX, beeY, deposited,
    pollenX: deposited ? 275 : beeX + 41,
    pollenY: deposited ? 250 : beeY - 2,
    tube: smooth((p - .49) / .51),
  };
}
