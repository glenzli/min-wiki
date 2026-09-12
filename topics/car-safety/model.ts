export type Road = 'dry' | 'wet';
export const REACTION_SECONDS = 1;
// Chosen constant decelerations illustrate a comparison, not road measurements.
export const DECELERATION: Record<Road, number> = { dry: 6, wet: 3 };
export function stopping(speedKmh: number, road: Road, reaction = REACTION_SECONDS) {
  const speed = Math.max(0, speedKmh) / 3.6;
  const acceleration = DECELERATION[road];
  const reactionTime = Math.max(0, reaction);
  const reactionDistance = speed * reactionTime;
  const brakingDistance = speed * speed / (2 * acceleration);
  const brakingTime = speed / acceleration;
  return { speed, acceleration, reactionTime, reactionDistance, brakingDistance,
    brakingTime, totalDistance: reactionDistance + brakingDistance, totalTime: reactionTime + brakingTime };
}
export function stateAt(speedKmh: number, road: Road, elapsed: number) {
  const plan = stopping(speedKmh, road);
  const time = Math.max(0, elapsed);
  if (time < plan.reactionTime) return { distance: plan.speed * time, speed: plan.speed, phase: 'reaction' as const };
  const brakingTime = Math.min(time - plan.reactionTime, plan.brakingTime);
  return { distance: plan.reactionDistance + plan.speed * brakingTime - .5 * plan.acceleration * brakingTime ** 2,
    speed: Math.max(0, plan.speed - plan.acceleration * brakingTime),
    phase: time >= plan.totalTime ? 'stopped' as const : 'braking' as const };
}
