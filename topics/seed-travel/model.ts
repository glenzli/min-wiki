const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };

/** A qualitative, still-air settling trajectory with optional horizontal advection. */
export function windFlight(progress: number, wind: number) {
  const p = clamp(progress), breeze = Math.max(0, Math.min(2, wind));
  const falling = p * p * (2 - p);
  return { x: 185 + breeze * 205 * smooth(p), y: 178 + 197 * falling,
    angle: breeze * 7 * Math.sin(Math.PI * p), landed: p >= 1 };
}

/** The same burr approaches fur, rides at a fixed offset, then separates and falls. */
export function burrJourney(progress: number) {
  const p = clamp(progress);
  const approach = smooth(p / .22), ride = smooth((p - .22) / .53), release = smooth((p - .75) / .25);
  const animalX = 75 + 131 * approach + 354 * ride + 55 * release;
  const burrX = p < .22 ? 176 : p <= .75 ? animalX - 30 : 530 + 18 * release;
  return { animalX, burrX, burrY: p < .22 ? 338 : 338 + 86 * release,
    stage: p < .22 ? 0 : p < .75 ? 1 : 2, attached: p >= .22 && p <= .75,
    gait: Math.sin(Math.PI * 12 * p) * Math.sin(Math.PI * p) };
}
