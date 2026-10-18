export const DURATION = 16;
export const DISPLAY_SPEED = 145;
export const RECEIVER_DISTANCE = 688;
export const receiverArrival = RECEIVER_DISTANCE / DISPLAY_SPEED;
/** Position of the finite emitted packet in diagram units, clipped to the shown air path. */
export function packetSpan(time: number) {
  const head = Math.min(RECEIVER_DISTANCE, Math.max(0, time * DISPLAY_SPEED));
  const tail = Math.min(RECEIVER_DISTANCE, Math.max(0, (time - 9) * DISPLAY_SPEED));
  return { head, tail, visible: head > tail };
}
export function frequency(tension: number) { if (!Number.isFinite(tension) || tension <= 0) throw new RangeError('positive tension required'); return 196 * Math.sqrt(tension); }
/** Fixed speaking length. Force vectors follow the end tangents of the same
 * exaggerated sine-shaped string; their common scale encodes relative T, not N.
 * Low T in this experiment remains taut. Slack-string dynamics are not modeled. */
export function stringProjection(displacement: number, tension: number) {
  if (!Number.isFinite(displacement) || !Number.isFinite(tension) || tension <= 0) throw new RangeError('finite displacement and positive tension required');
  const slope = Math.PI * displacement / 556;
  const length = 14 * tension, dx = length / Math.hypot(1, slope), dy = -slope * dx;
  return { left: [172, 230], right: [728, 230], middle: [450, 230 + displacement],
    pullLeft: [172 - dx, 230 + dy], pullRight: [728 + dx, 230 + dy], length };
}
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
