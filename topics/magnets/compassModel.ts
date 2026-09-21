/** Direction around an ideal point dipole; not a calibrated near-field bar-magnet map.
 * x points right and y down, like the top-view SVG. The magnetic moment points to N.
 */
export function compassAt(angleDegrees: number, flipped: boolean) {
  const angle = (Number.isFinite(angleDegrees) ? angleDegrees : 0) * Math.PI / 180;
  const x = Math.cos(angle), y = Math.sin(angle), moment = flipped ? 1 : -1;
  const bx = moment * (3 * x * x - 1), by = moment * 3 * x * y;
  const length = Math.hypot(bx, by);
  return { x, y, nx: bx / length, ny: by / length, angle: Math.atan2(by, bx) * 180 / Math.PI };
}
