/** Qualitative scenarios, not a pressure solver or a forecast of an actual volcano. */
export type Environment = 'deep' | 'shallow' | 'island';
export type Supply = 'sustained' | 'limited';
export type Viewpoint = 'ocean' | 'vent' | 'section';
export const SEA_LEVEL = 154;
export const SEA_FLOOR = 500;
export const clamp = (value: number): number => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
export const ramp = (p: number, start: number, end: number): number => {
  const q = clamp((p - start) / (end - start));
  return q * q * (3 - 2 * q);
};

export function submarineState(progress: number, environment: Environment, supply: Supply = 'sustained') {
  const p = clamp(progress);
  const building = ramp(p, .06, .78);
  const erosion = environment === 'island' ? ramp(p, .8, 1) : 0;
  const addition = environment === 'island' ? building * (supply === 'sustained' ? 294 : 190) : building * (environment === 'deep' ? 35 : 12);
  const initialSummit = environment === 'deep' ? 368 : environment === 'shallow' ? 193 : 401;
  const summit = initialSummit - addition + erosion * 23;
  const activity = ramp(p, .02, .11) * (1 - ramp(p, environment === 'island' ? .65 : .70, environment === 'island' ? .78 : .91));
  return {
    p, building, erosion, addition, summit, peakSummit: initialSummit - addition,
    activity, emerged: summit < SEA_LEVEL,
    aboveWater: Math.max(0, SEA_LEVEL - summit),
    belowWater: SEA_FLOOR - Math.max(SEA_LEVEL, summit),
    underwaterShare: Math.min(1, (SEA_FLOOR - SEA_LEVEL) / (SEA_FLOOR - summit)),
    cooling: ramp(p, .75, 1),
  };
}
export type SubmarineState = ReturnType<typeof submarineState>;

/** Each lobe expands once; its rind cools before its interior. */
export function pillowState(progress: number, index: number) {
  const p = clamp(progress);
  const born = .08 + index * .052;
  return {
    growth: ramp(p, born, born + .095),
    crust: ramp(p, born + .015, born + .12),
    coreHeat: ramp(p, born, born + .06) * (1 - ramp(p, born + .15, Math.min(.99, born + .40))),
  };
}

/** A finite particle packet. Settling ends at a persistent deposit, without modulo resets. */
export function fragmentState(progress: number, index: number) {
  const p = clamp(progress);
  const start = .10 + Math.floor(index / 7) * .075;
  const life = clamp((p - start) / .26);
  const side = index % 2 ? 1 : -1;
  const spread = 24 + (index % 7) * 12;
  return {
    visible: p >= start,
    x: side * spread * life,
    y: -Math.sin(Math.PI * life) * (55 + (index % 5) * 12) + (30 + spread * .6) * life * life,
    settled: life === 1,
    heat: 1 - ramp(life, .15, .75),
  };
}

export function cameraBox(view: Viewpoint, summit: number): [number, number, number, number] {
  if (view === 'vent') return [325, Math.max(0, summit - 122), 350, 233.333333];
  if (view === 'section') return [110, 84, 780, 520];
  return [0, 0, 1000, 666.666667];
}
