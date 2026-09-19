/** Qualitative scenarios, not a pressure solver or a forecast of an actual volcano. */
export type Environment = 'deep' | 'shallow' | 'island';
export type Supply = 'sustained' | 'limited';
export type Viewpoint = 'ocean' | 'vent' | 'section';
export type AccretionPhase = 'deep-base' | 'spreading-flows' | 'shallow-fragments' | 'lava-cap';

export const SEA_LEVEL = 154;
export const SEA_FLOOR = 500;
export const ISLAND_UNIT_COUNT = 24;
export const clamp = (value: number): number => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
export const ramp = (p: number, start: number, end: number): number => {
  const q = clamp((p - start) / (end - start));
  return q * q * (3 - 2 * q);
};

export type AccretionUnit = {
  index: number;
  phase: AccretionPhase;
  start: number;
  end: number;
  growth: number;
  center: number;
  width: number;
  height: number;
  texture: number;
};

const unitSpec = (index: number): Omit<AccretionUnit, 'start' | 'end' | 'growth'> => {
  if (index < 7) {
    const offsets = [-28, 34, -52, 47, -18, 24, 0];
    return { index, phase: 'deep-base', center: 500 + offsets[index], width: 108 + index * 12, height: 15 + index % 3, texture: index % 4 };
  }
  if (index < 14) {
    const step = index - 7;
    const offsets = [-64, 72, -118, 112, -38, 46, 0];
    return { index, phase: 'spreading-flows', center: 500 + offsets[step], width: 214 + step * 28, height: 20 + step % 3 * 2, texture: index % 4 };
  }
  if (index < 19) {
    const step = index - 14;
    return { index, phase: 'shallow-fragments', center: 500 + [-58, 63, -31, 39, 0][step], width: 174 + step * 21, height: 19 + step % 3 * 2, texture: index % 4 };
  }
  const step = index - 19;
  return { index, phase: 'lava-cap', center: 500 + [-42, 53, -78, 69, 0][step], width: 332 + step * 18, height: 15 + step % 3, texture: index % 4 };
};

const allIslandSpecs = Array.from({ length: ISLAND_UNIT_COUNT }, (_, index) => unitSpec(index));

/**
 * A sequence of bounded deposits rather than one cone that uniformly inflates.
 * Each unit is one teaching episode: early mound-building lobes, broader flows,
 * fragment-rich shallow deposits, then an emergent lava cap.
 */
export function islandAccretion(progress: number, supply: Supply = 'sustained') {
  const p = clamp(progress);
  const available = supply === 'sustained' ? ISLAND_UNIT_COUNT : 13;
  const units = allIslandSpecs.slice(0, available).map(spec => {
    const start = .04 + spec.index * .029;
    const end = start + .055;
    return { ...spec, start, end, growth: ramp(p, start, end) };
  });
  const deposited = units.filter(unit => unit.growth > 0).length;
  const completed = units.filter(unit => unit.growth >= 1).length;
  const adding = units.some(unit => unit.growth > 0 && unit.growth < 1);
  const current = [...units].reverse().find(unit => unit.growth > 0 && unit.growth < 1)
    ?? [...units].reverse().find(unit => unit.growth > 0);
  return {
    p,
    units,
    available,
    deposited,
    completed,
    adding,
    currentIndex: current?.index ?? -1,
    phase: current?.phase ?? 'deep-base' as AccretionPhase,
    erosion: ramp(p, .82, 1),
  };
}

const unitContribution = (x: number, unit: AccretionUnit): number => {
  const distance = Math.abs(x - unit.center) / unit.width;
  if (distance >= 1 || unit.growth <= 0) return 0;
  const shoulder = unit.phase === 'deep-base'
    ? Math.pow(1 - Math.pow(distance, 1.7), 1.15)
    : unit.phase === 'shallow-fragments'
      ? Math.pow(1 - Math.pow(distance, 1.34), 1.42)
      : Math.pow(1 - Math.pow(distance, 3.1), .72);
  const irregularity = 1 + Math.sin(x * .031 + unit.index * 1.71) * .055 + Math.sin(x * .083 - unit.index) * .027;
  return unit.height * unit.growth * shoulder * irregularity;
};

/** Surface after a chosen deposit. The optional bound lets the section renderer expose each package. */
export function islandSurfaceY(x: number, progress: number, supply: Supply = 'sustained', throughIndex = Number.POSITIVE_INFINITY, eroded = true): number {
  const accretion = islandAccretion(progress, supply);
  let y = SEA_FLOOR;
  for (const unit of accretion.units) {
    if (unit.index > throughIndex) break;
    y -= unitContribution(x, unit);
  }
  if (eroded && accretion.erosion > 0) {
    const distance = Math.abs(x - 500) / 205;
    if (distance < 1) y += 23 * accretion.erosion * Math.pow(1 - distance, 1.8);
  }
  return y;
}

function islandSummit(progress: number, supply: Supply, eroded: boolean): number {
  let summit = SEA_FLOOR;
  for (let x = 330; x <= 670; x += 2) summit = Math.min(summit, islandSurfaceY(x, progress, supply, Number.POSITIVE_INFINITY, eroded));
  return summit;
}

export function submarineState(progress: number, environment: Environment, supply: Supply = 'sustained') {
  const p = clamp(progress);
  if (environment === 'island') {
    const accretion = islandAccretion(p, supply);
    const peakSummit = islandSummit(p, supply, false);
    const summit = islandSummit(p, supply, true);
    const addition = SEA_FLOOR - peakSummit;
    const activeUnit = accretion.units.find(unit => unit.index === accretion.currentIndex);
    const activity = p >= .80 ? 0 : activeUnit ? Math.sin(activeUnit.growth * Math.PI) : 0;
    return {
      p,
      building: clamp(addition / 405),
      erosion: accretion.erosion,
      addition,
      summit,
      peakSummit,
      activity,
      emerged: summit < SEA_LEVEL,
      aboveWater: Math.max(0, SEA_LEVEL - summit),
      belowWater: SEA_FLOOR - Math.max(SEA_LEVEL, summit),
      underwaterShare: Math.min(1, (SEA_FLOOR - SEA_LEVEL) / Math.max(1, SEA_FLOOR - summit)),
      cooling: ramp(p, .76, 1),
    };
  }

  const building = ramp(p, .06, .78);
  const addition = building * (environment === 'deep' ? 35 : 12);
  const initialSummit = environment === 'deep' ? 368 : 193;
  const summit = initialSummit - addition;
  const activity = ramp(p, .02, .11) * (1 - ramp(p, .70, .91));
  return {
    p, building, erosion: 0, addition, summit, peakSummit: summit,
    activity, emerged: false,
    aboveWater: 0,
    belowWater: SEA_FLOOR - summit,
    underwaterShare: 1,
    cooling: ramp(p, .75, 1),
  };
}
export type SubmarineState = ReturnType<typeof submarineState>;

/** Each lobe expands once; its rind cools before its interior. */
export function pillowState(progress: number, index: number) {
  const p = clamp(progress);
  const born = .06 + index * .043;
  return {
    growth: ramp(p, born, born + .09),
    crust: ramp(p, born + .012, born + .12),
    coreHeat: ramp(p, born, born + .055) * (1 - ramp(p, born + .14, Math.min(.99, born + .39))),
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
  if (view === 'section') return [85, 82, 830, 553.333333];
  return [0, 0, 1000, 666.666667];
}
