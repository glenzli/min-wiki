/** A fitted, frictionless elastic lap-band around a rigid circular hip projection.
 * Length, mass, acceleration and stiffness are teaching units, not human or belt
 * measurements. The observed window ends at the FIRST maximum displacement
 * relative to a constantly decelerating car; it is not a completed vehicle stop.
 */
export const RESTRAINT_GEOMETRY = {
  hip: { x: 225, y: 240 }, radius: 18,
  upperAnchor: { x: 135, y: 210 }, lowerAnchor: { x: 135, y: 270 },
} as const;
export const RESTRAINT_PARAMETERS = { mass: 1, stiffness: .8, carDeceleration: 100 } as const;
type Point = { x: number; y: number };

export function beltGeometry(displacement: number) {
  const { hip, radius: r, upperAnchor, lowerAnchor } = RESTRAINT_GEOMETRY;
  const center = { x: hip.x + displacement, y: hip.y };
  const dx = center.x - upperAnchor.x, dy = center.y - upperAnchor.y;
  const d2 = dx * dx + dy * dy;
  if (d2 <= r * r || dx <= 0) throw new RangeError('The hip must remain ahead of both belt anchors');
  const segmentLength = Math.sqrt(d2 - r * r);
  // The front upper tangent, mirrored for the symmetric lower anchor. These
  // spans touch the circle without cutting through the represented body.
  const upper: Point = {
    x: center.x - r * r * dx / d2 + r * segmentLength * dy / d2,
    y: center.y - r * r * dy / d2 - r * segmentLength * dx / d2,
  };
  const lower: Point = { x: upper.x, y: 2 * center.y - upper.y };
  const upperAngle = Math.atan2(upper.y - center.y, upper.x - center.x);
  const arcLength = -2 * upperAngle * r;
  const length = 2 * segmentLength + arcLength;
  // Force on the passenger: two tangent tensions pull toward the car anchors.
  // This equals d(length)/d(displacement); the vertical components cancel.
  const horizontalFactor = (upper.x - upperAnchor.x) / segmentLength
    + (lower.x - lowerAnchor.x) / segmentLength;
  const path = `M${upperAnchor.x} ${upperAnchor.y}L${upper.x} ${upper.y}A${r} ${r} 0 0 1 ${lower.x} ${lower.y}L${lowerAnchor.x} ${lowerAnchor.y}`;
  return { center, upper, lower, segmentLength, arcLength, length, horizontalFactor, path };
}
const fittedLength = beltGeometry(0).length;
export function beltLoad(displacement: number) {
  const geometry = beltGeometry(displacement);
  const extension = Math.max(0, geometry.length - fittedLength);
  const tension = RESTRAINT_PARAMETERS.stiffness * extension;
  return { ...geometry, extension, tension, horizontalForce: tension * geometry.horizontalFactor };
}
type Motion = { time: number; displacement: number; speed: number };
function acceleration(displacement: number) {
  const { mass, carDeceleration } = RESTRAINT_PARAMETERS;
  return carDeceleration - beltLoad(displacement).horizontalForce / mass;
}
function step(from: Motion, dt: number): Motion {
  const x = from.displacement, v = from.speed;
  const a1 = acceleration(x), v2 = v + a1 * dt / 2;
  const a2 = acceleration(x + v * dt / 2), v3 = v + a2 * dt / 2;
  const a3 = acceleration(x + v2 * dt / 2), v4 = v + a3 * dt;
  const a4 = acceleration(x + v3 * dt);
  return { time: from.time + dt, displacement: x + dt * (v + 2 * v2 + 2 * v3 + v4) / 6,
    speed: v + dt * (a1 + 2 * a2 + 2 * a3 + a4) / 6 };
}
// A single deterministic trajectory. Scrubbing samples this history, rather
// than incrementally integrating a second clock in the renderer/controller.
const trajectory: Motion[] = [{ time: 0, displacement: 0, speed: 0 }];
const dt = .001;
for (let i = 0; i < 10_000; i++) {
  const previous = trajectory.at(-1)!;
  const next = step(previous, dt);
  if (previous.speed > 0 && next.speed <= 0) {
    let low = 0, high = dt;
    for (let j = 0; j < 35; j++) {
      const mid = (low + high) / 2;
      if (step(previous, mid).speed > 0) low = mid; else high = mid;
    }
    trajectory.push(step(previous, (low + high) / 2));
    break;
  }
  trajectory.push(next);
}
const end = trajectory.at(-1)!;
if (Math.abs(end.speed) > 1e-7 || end.displacement <= 0) throw new Error('No first turning point in the restraint teaching window');
export const RESTRAINT_WINDOW = { duration: end.time, maxDisplacement: end.displacement,
  maxForce: beltLoad(end.displacement).horizontalForce } as const;

export function restraintAt(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const time = p * end.time;
  const index = Math.min(trajectory.length - 2, Math.floor(time / dt));
  const motion = p === 1 ? end : step(trajectory[index]!, time - trajectory[index]!.time);
  const belt = beltLoad(motion.displacement);
  const freeDisplacement = .5 * RESTRAINT_PARAMETERS.carDeceleration * time * time;
  return { progress: p, time, displacement: motion.displacement, relativeSpeed: motion.speed,
    freeDisplacement, belt,
    phase: p === 0 ? 'fitted' as const : p === 1 ? 'turning' as const : 'loading' as const };
}
