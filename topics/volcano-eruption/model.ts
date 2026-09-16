export interface Settings { vents: number; gas: number; viscosity: number }
export const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export const terrain = (x: number) => 115 - 158 * Math.exp(-((x / 168) ** 2)) + 20 * Math.exp(-((x / 25) ** 2));
export const ventPositions = (count: number) => count === 3 ? [-126, 0, 126] : [0];
export const supplyPerVent = (count: number) => 1 / ventPositions(count).length;
export const explosivity = (settings: Settings) => settings.gas * (.25 + .75 * settings.viscosity);
export const activity = (p: number) => smooth(.28, .46, p) * (1 - smooth(.77, 1, p));
export function readout(progress: number, settings: Settings) { return { value: String(ventPositions(settings.vents).length), stage: progress < .22 ? 0 : progress < .45 ? 1 : progress < .84 ? 2 : 3, limited: false }; }

export interface ClastTrajectory {
  x: number; y: number; vx: number; vy: number; gravity: number;
  impactTime: number; impactX: number; impactY: number;
}

/** A dimensionless ballistic illustration. The first terrain intersection ends flight. */
export function clastTrajectory(x: number, vx: number, rise: number, surface = terrain): ClastTrajectory {
  const y = surface(x) - 2.5, gravity = 210, vy = -Math.sqrt(2 * gravity * Math.max(0, rise));
  const clearance = (time: number) => y + vy * time + .5 * gravity * time * time - surface(x + vx * time);
  let before = 0, after = 1 / 60;
  while (after < 8 && clearance(after) < 0) { before = after; after += 1 / 60; }
  for (let i = 0; i < 20; i++) {
    const middle = (before + after) / 2;
    if (clearance(middle) < 0) before = middle; else after = middle;
  }
  const impactTime = (before + after) / 2, impactX = x + vx * impactTime;
  return { x, y, vx, vy, gravity, impactTime, impactX, impactY: surface(impactX) };
}

export function clastPosition(trajectory: ClastTrajectory, elapsed: number) {
  const time = Math.max(0, Math.min(trajectory.impactTime, elapsed));
  const landed = elapsed >= trajectory.impactTime;
  return {
    x: landed ? trajectory.impactX : trajectory.x + trajectory.vx * time,
    y: landed ? trajectory.impactY : trajectory.y + trajectory.vy * time + .5 * trajectory.gravity * time * time,
    landed,
    afterImpact: Math.max(0, elapsed - trajectory.impactTime),
  };
}

/** The same source is divided among vents, then among their displayed flow branches. */
export function flowBranches(count: number) {
  return ventPositions(count).flatMap(x => {
    const directions = x === 0 ? [-1, 1] : [Math.sign(x)];
    return directions.map(direction => ({ x, direction, share: supplyPerVent(count) / directions.length }));
  });
}

export const CLAST_BUDGET = 384;
/** Assignment changes location, never the number of scheduled fragments. */
export function emissionSlot(index: number, count: number) {
  const vents = ventPositions(count);
  return { birth: .305 + index / (CLAST_BUDGET - 1) * .515, x: vents[index % vents.length] };
}
