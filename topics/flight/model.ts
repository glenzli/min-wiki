/** A deliberately illustrative wing, not measured aircraft performance. See README. */
export const FLIGHT = { density: 1.225, area: 14, mass: 1000, gravity: 9.81, stallAngle: 15, duration: 1.2 } as const;
export type Conditions = { speed: number; pitch: number };
export type FlightSnapshot = {
  time: number; distance: number; height: number; verticalSpeed: number;
  airspeed: number; pitch: number; pathAngle: number; angleOfAttack: number;
  cl: number; cd: number; lift: number; drag: number; weight: number;
  liftX: number; liftY: number; dragX: number; dragY: number; thrust: number;
  support: number; netVertical: number; stalled: boolean; onGround: boolean;
};
const bounded = (n: number, low: number, high: number) => Number.isFinite(n) ? Math.max(low, Math.min(high, n)) : low;
export function normalizeConditions(input: Conditions): Conditions {
  return { speed: bounded(input.speed, 0, 60), pitch: bounded(input.pitch, 0, 26) };
}
export function coefficients(angle: number) {
  const a = bounded(angle, -10, 26);
  const cl = a <= FLIGHT.stallAngle ? .24 + .08 * a : 1.44 - .07 * (a - FLIGHT.stallAngle);
  const cd = .035 + .045 * cl * cl + .025 * Math.max(0, a - FLIGHT.stallAngle);
  return { cl, cd, stalled: a > FLIGHT.stallAngle };
}
/** +y is up. x-force values point backward; horizontal thrust balances them. */
export function forces(input: Conditions, height = 0, verticalSpeed = 0): FlightSnapshot {
  const { speed, pitch } = normalizeConditions(input);
  const pathAngle = speed === 0 && verticalSpeed === 0 ? 0 : Math.atan2(verticalSpeed, speed);
  const angleOfAttack = pitch - pathAngle * 180 / Math.PI;
  const airspeed = Math.hypot(speed, verticalSpeed);
  const { cl, cd, stalled } = coefficients(angleOfAttack);
  const qArea = .5 * FLIGHT.density * airspeed * airspeed * FLIGHT.area;
  const lift = qArea * cl, drag = qArea * cd, weight = FLIGHT.mass * FLIGHT.gravity;
  const liftX = lift * Math.sin(pathAngle), liftY = lift * Math.cos(pathAngle);
  const dragX = drag * Math.cos(pathAngle), dragY = -drag * Math.sin(pathAngle);
  const unsupported = liftY + dragY - weight;
  const onGround = height <= 0 && verticalSpeed <= 0;
  const support = onGround ? Math.max(0, -unsupported) : 0;
  return { time: 0, distance: 0, height, verticalSpeed, airspeed, pitch, pathAngle, angleOfAttack,
    cl, cd, lift, drag, weight, liftX, liftY, dragX, dragY, thrust: liftX + dragX,
    support, netVertical: unsupported + support, stalled, onGround };
}
/** Deterministic replay: fixed horizontal speed, fixed wing pitch, no pitch dynamics. */
export function flightSnapshot(input: Conditions, progress: number): FlightSnapshot {
  const conditions = normalizeConditions(input);
  const end = bounded(progress, 0, 1) * FLIGHT.duration;
  let time = 0, height = 0, verticalSpeed = 0;
  while (time < end - 1e-10) {
    const dt = Math.min(1 / 240, end - time);
    const state = forces(conditions, height, verticalSpeed);
    verticalSpeed += state.netVertical / FLIGHT.mass * dt;
    height += verticalSpeed * dt;
    if (height <= 0) { height = 0; verticalSpeed = Math.max(0, verticalSpeed); }
    time += dt;
  }
  return { ...forces(conditions, height, verticalSpeed), time: end, distance: conditions.speed * end };
}
