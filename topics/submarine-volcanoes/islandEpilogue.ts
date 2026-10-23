import { clamp, ramp, type Environment, type Supply } from './model.ts';
import { WATER_Y, type OceanGeometryFrame, type XYZ } from './geometry3d.ts';

/** Six extra presentation seconds, not an added geological interval. Only the
 * emerged-island ending is stretched; direct seeking keeps its old meaning. */
export const ISLAND_ENDING_SECONDS = 6;
const endingTime = (p: number) => p * 36 + ISLAND_ENDING_SECONDS * ramp(p, .80, 1);

export function advanceOceanPlayback(progress: number, seconds: number, environment: Environment, supply: Supply) {
  const p = clamp(progress), step = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  if (step === 0 || p === 1) return p;
  if (environment !== 'island' || supply !== 'sustained') return clamp(p + step / 36);
  const target = endingTime(p) + step;
  if (target >= endingTime(1)) return 1;
  let low = p, high = 1;
  for (let i = 0; i < 28; i++) {
    const middle = (low + high) / 2;
    if (endingTime(middle) < target) low = middle; else high = middle;
  }
  return (low + high) / 2;
}

export type VisitorPose = { position: XYZ; heading: number; bank: number; flex: number };
export type IslandEpilogue = { visible: boolean; opacity: number; bird: VisitorPose; fish: VisitorPose[] };
export const ISLAND_FISH_COUNT = 3;
export const SEABIRD_ENTRY_SPAN = 1.05;
export type BirdArrival = { entry: XYZ; phase: number; age: number };

/** A single entry curve meets the orbit with the same position and tangent.
 * Age is accumulated from the existing bounded phase by the retained owner;
 * completing a phase cycle never repeats this entrance. */
export function seabirdPose(phase: number, arrival?: BirdArrival): VisitorPose {
  const a = phase + .4, dx = -3.25 * Math.sin(a), dz = 2.55 * Math.cos(a);
  const pose: VisitorPose = {
    position: [3.25 * Math.cos(a), WATER_Y + 2.65 + .16 * Math.sin(phase * 2), 2.55 * Math.sin(a)],
    heading: Math.atan2(-dz, dx), bank: -.10 - .035 * Math.sin(phase * 2),
    flex: .04 + Math.sin(phase * 9) * (.07 + .13 * (.5 + .5 * Math.sin(phase * 2))),
  };
  if (!arrival || arrival.age >= SEABIRD_ENTRY_SPAN) return pose;
  const endPhase = arrival.phase + SEABIRD_ENTRY_SPAN, end = seabirdPose(endPhase);
  const t = clamp(arrival.age / SEABIRD_ENTRY_SPAN), t2 = t * t, t3 = t2 * t;
  const endVelocity: XYZ = [-3.25 * Math.sin(endPhase + .4), .32 * Math.cos(endPhase * 2), 2.55 * Math.cos(endPhase + .4)];
  const velocity: XYZ = [0,0,0];
  pose.position = arrival.entry.map((start,i) => {
    const startTangent = (end.position[i] - start) * .8;
    const endTangent = endVelocity[i] * SEABIRD_ENTRY_SPAN;
    velocity[i] = (6*t2-6*t)*start + (3*t2-4*t+1)*startTangent
      + (-6*t2+6*t)*end.position[i] + (3*t2-2*t)*endTangent;
    return (2*t3-3*t2+1)*start + (t3-2*t2+t)*startTangent
      + (-2*t3+3*t2)*end.position[i] + (t3-t2)*endTangent;
  }) as XYZ;
  pose.heading = Math.atan2(-velocity[2],velocity[0]);
  pose.bank = end.bank * ramp(t,0,1);
  return pose;
}

/** Passing background animals, not resident colonies or a succession clock.
 * Fixed offshore paths stay away from the hot entry, rock and crater. Phase
 * only moves these same four animals; it never changes geological progress. */
export function islandEpilogue(frame: OceanGeometryFrame, phase = 0, arrival?: BirdArrival): IslandEpilogue {
  const angle = Number.isFinite(phase) ? phase % (Math.PI * 2) : 0;
  const eligible = frame.environment === 'island' && frame.supply === 'sustained'
    && frame.state.emerged && !frame.history.adding && frame.state.activity === 0;
  const opacity = eligible ? ramp(frame.p, .83, .91) : 0;
  const bird = seabirdPose(angle,arrival);
  const fish = Array.from({ length: ISLAND_FISH_COUNT }, (_, index): VisitorPose => {
    const a = angle + index * .085 + .7;
    return { position: [3.45 * Math.cos(a) + (index - 1) * .12,
      WATER_Y - .22 - index * .065 + .025 * Math.sin(a * 3), 3.35 + .62 * Math.sin(a) + (index - 1) * .16],
    heading: Math.atan2(-.62 * Math.cos(a), -3.45 * Math.sin(a)),
    bank: .025 * Math.sin(a * 2), flex: .23 * Math.sin(angle * 13 + index * 1.6) };
  });
  return { visible: opacity > .001, opacity, bird, fish };
}
