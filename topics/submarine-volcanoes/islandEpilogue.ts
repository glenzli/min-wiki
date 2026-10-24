import { clamp, ramp, type Environment, type Supply } from './model.ts';
import { seed, WATER_Y, type OceanGeometryFrame, type XYZ } from './geometry3d.ts';

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

export type VisitorPose = { position: XYZ; heading: number; bank: number; pitch: number; flex: number; tip: number; visible: boolean };
export type IslandEpilogue = { visible: boolean; opacity: number; bird: VisitorPose; fish: VisitorPose[] };
export const ISLAND_FISH_COUNT = 3;
export const SEABIRD_ENTRY_SPAN = 1.05;
export const SEABIRD_EXIT_SPAN = 1.25;
export const VISITOR_SEQUENCE_LENGTH = 4096;
export type VisitCycle = { index: number; age: number; duration: number; gap: number };
export type BirdVisit = VisitCycle & { entry: XYZ; exit: XYZ; direction: number; start: number; radius: [number, number]; altitude: number; orbitSpan: number };
export type FishVisit = VisitCycle & { center: XYZ; across: XYZ; halfWidth: number; direction: number; count: number };
export type IslandVisits = { bird: BirdVisit; fish: FishVisit };

/** Bounded repeatable variation: no per-frame random jitter or stored history. */
export function createBirdVisit(index = 0): BirdVisit {
  const orbitSpan = 5.4 + seed(index, 912) * 1.3;
  return { index, age: 0, duration: SEABIRD_ENTRY_SPAN + orbitSpan + SEABIRD_EXIT_SPAN,
    gap: 2.6 + seed(index, 913) * 2.7, orbitSpan,
    entry: [-12, WATER_Y + 2.65, 1], exit: [12, WATER_Y + 2.8, 1],
    direction: seed(index, 914) > .5 ? 1 : -1, start: .7 + seed(index, 915) * 4.2,
    radius: [3.1 + seed(index, 916) * .45, 2.5 + seed(index, 917) * .3],
    altitude: WATER_Y + 2.6 + seed(index, 918) * .28 };
}

export function createFishVisit(index = 0): FishVisit {
  return { index, age: 0, duration: 4.1 + seed(index, 924) * 1.4, gap: 1.9 + seed(index, 925) * 2.7,
    count: index === 0 ? 3 : 1 + Math.floor(seed(index, 926) * ISLAND_FISH_COUNT),
    center: [0, WATER_Y - .22, 3.6], across: [1, 0, 0], halfWidth: 6,
    direction: seed(index, 927) > .5 ? 1 : -1 };
}

/** Each admission remains bounded even across many presentation phase wraps. */
export function advanceVisit<T extends VisitCycle>(visit: T, delta: number, next: (index: number) => T): T {
  let age = visit.age + Math.max(0, Number.isFinite(delta) ? delta : 0);
  while (age >= visit.duration + visit.gap) {
    age -= visit.duration + visit.gap;
    visit = next((visit.index + 1) % VISITOR_SEQUENCE_LENGTH);
  }
  visit.age = age; return visit;
}

function directedPose(position: XYZ, velocity: XYZ): VisitorPose {
  return { position, heading: Math.atan2(-velocity[2], velocity[0]),
    pitch: Math.atan2(velocity[1], Math.hypot(velocity[0], velocity[2])),
    bank: -.10, flex: 0, tip: 0, visible: true };
}

function orbit(phase: number, visit: BirdVisit) {
  const a = visit.start + phase * visit.direction, [rx, rz] = visit.radius;
  const position: XYZ = [rx * Math.cos(a), visit.altitude + .13 * Math.sin(a * 2), rz * Math.sin(a)];
  const velocity: XYZ = [-rx * Math.sin(a) * visit.direction, .26 * Math.cos(a * 2) * visit.direction, rz * Math.cos(a) * visit.direction];
  return { position, velocity };
}

function approach(start: XYZ, end: XYZ, startTangent: XYZ, endTangent: XYZ, t: number, span: number) {
  const t2 = t * t, t3 = t2 * t, position: XYZ = [0, 0, 0], velocity: XYZ = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    position[i] = (2*t3-3*t2+1)*start[i] + (t3-2*t2+t)*startTangent[i]
      + (-2*t3+3*t2)*end[i] + (t3-t2)*endTangent[i];
    velocity[i] = ((6*t2-6*t)*start[i] + (3*t2-4*t+1)*startTangent[i]
      + (-6*t2+6*t)*end[i] + (3*t2-2*t)*endTangent[i]) / span;
  }
  return { position, velocity };
}

/** Curved entry -> banked island pass -> curved exit. Both joins share position
 * and velocity. Hiding/repositioning occurs only beyond the captured view. */
export function seabirdPose(phase: number, visit = createBirdVisit()): VisitorPose {
  const age = Math.min(visit.duration, visit.age), orbitAge = age - SEABIRD_ENTRY_SPAN;
  let path = orbit(clamp(orbitAge / visit.orbitSpan) * visit.orbitSpan, visit);
  if (age < SEABIRD_ENTRY_SPAN) {
    const end = orbit(0, visit);
    path = approach(visit.entry, end.position, end.position.map((v,i)=>(v-visit.entry[i])*.8) as XYZ,
      end.velocity.map(v=>v*SEABIRD_ENTRY_SPAN) as XYZ, age / SEABIRD_ENTRY_SPAN, SEABIRD_ENTRY_SPAN);
  } else if (orbitAge > visit.orbitSpan) {
    const start = orbit(visit.orbitSpan, visit);
    path = approach(start.position, visit.exit, start.velocity.map(v=>v*SEABIRD_EXIT_SPAN) as XYZ,
      visit.exit.map((v,i)=>(v-start.position[i])*.8) as XYZ,
      (orbitAge-visit.orbitSpan)/SEABIRD_EXIT_SPAN, SEABIRD_EXIT_SPAN);
  }
  const pose = directedPose(path.position, path.velocity);
  const bankWeight = ramp(age, 0, SEABIRD_ENTRY_SPAN) * (1-ramp(orbitAge, visit.orbitSpan, visit.orbitSpan+SEABIRD_EXIT_SPAN));
  const burst = ramp(Math.sin(phase * 2 + .6), .05, .78), beat = phase * 27 + .4 * Math.sin(phase * 4);
  pose.bank = -visit.direction * (.10 + .025 * Math.sin(phase * 2)) * bankWeight;
  pose.flex = -.035 + burst * .45 * (Math.sin(beat) + .16*Math.sin(beat*2));
  pose.tip = -.05 + burst * (.27*Math.sin(beat-.65)-.12);
  pose.visible = visit.age < visit.duration;
  return pose;
}

export function passingFishPose(phase: number, visit: FishVisit, index: number): VisitorPose {
  const age = visit.age - index * .15, travel = visit.duration - .3;
  const t = clamp(age / travel), distance = (t * 2 - 1) * visit.halfWidth * visit.direction;
  const across = visit.across, offshore: XYZ = [-across[2], 0, across[0]];
  const bend = .12 * Math.sin(t * Math.PI * 2 + index * .4) + (index-1)*.12;
  const position: XYZ = [visit.center[0] + distance*across[0] + bend*offshore[0],
    visit.center[1] - index*.055 + .018*Math.sin(t*Math.PI*2+index),
    visit.center[2] + distance*across[2] + bend*offshore[2]];
  const speed = 2*visit.halfWidth*visit.direction;
  const turn = .24*Math.PI*Math.cos(t*Math.PI*2+index*.4);
  const pose = directedPose(position, [speed*across[0]+turn*offshore[0], .036*Math.PI*Math.cos(t*Math.PI*2+index), speed*across[2]+turn*offshore[2]]);
  pose.bank = .025 * Math.sin(phase * 3 + index);
  pose.tip = phase * 17 + index * 1.9 + visit.index * .7;
  // Match the travelling body wave at the tail stem rather than hinging a
  // rigid fish independently of its rear-body motion.
  pose.flex = .077*Math.sin(pose.tip-4)-.154*Math.cos(pose.tip-4);
  pose.visible = index < visit.count && age >= 0 && age < travel;
  return pose;
}

/** Visiting animals, not resident colonies or a succession clock. Their
 * bounded presentation itinerary cannot advance the geological progress. */
export function islandEpilogue(frame: OceanGeometryFrame, phase = 0, visits?: IslandVisits): IslandEpilogue {
  const angle = Number.isFinite(phase) ? phase % (Math.PI * 2) : 0;
  const eligible = frame.environment === 'island' && frame.supply === 'sustained'
    && frame.state.emerged && !frame.history.adding && frame.state.activity === 0;
  const opacity = eligible ? ramp(frame.p, .83, .91) : 0;
  const birdVisit = visits?.bird ?? { ...createBirdVisit(), age: SEABIRD_ENTRY_SPAN + 1.5 };
  const fishVisit = visits?.fish ?? { ...createFishVisit(), age: 2.3 };
  const bird = seabirdPose(angle, birdVisit);
  const fish = Array.from({ length: ISLAND_FISH_COUNT }, (_, index) => passingFishPose(angle, fishVisit, index));
  return { visible: opacity > .001, opacity, bird, fish };
}
