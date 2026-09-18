export const DURATION = 16;
export const DISPLAY_SPEED = 145;
export function frequency(tension: number) { if (!Number.isFinite(tension) || tension <= 0) throw new RangeError('positive tension required'); return 196 * Math.sqrt(tension); }
const smooth = (x: number) => { const v = Math.max(0, Math.min(1, x)); return v * v * (3 - 2 * v); };
/** A finite, damped source. Teaching seconds and diagram distances are not physical units. */
export function sourceDisplacement(time: number, tension: number, amplitude: number) {
  if (time <= 0 || time >= 9) return 0;
  const envelope = smooth(time / .6) * (1 - smooth((time - 7) / 2)) * Math.exp(-time * .1);
  return amplitude / 50 * 16 * envelope * Math.sin(time * Math.PI * 2 * .46 * frequency(tension) / 196);
}
/** Retarded time makes the same disturbance arrive later at more distant air parcels. */
export function parcelDisplacement(distance: number, time: number, tension: number, amplitude: number) {
  return sourceDisplacement(time - distance / DISPLAY_SPEED, tension, amplitude);
}
export function relativeDensity(distance: number, time: number, tension: number, amplitude: number) {
  const gradient = (parcelDisplacement(distance + .5, time, tension, amplitude) - parcelDisplacement(distance - .5, time, tension, amplitude));
  return 1 / (1 + gradient);
}
