/** Prescribed teaching paths, not a calibrated entry/ablation or fall prediction. */
export type JourneyKind = 'dust' | 'stone';
export interface Point { x: number; y: number }
export const ENTRY = .17;
export const LIGHT_END = .65;
export const GROUND_Y = 452;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, p: number) => {
  const u = clamp((p - a) / (b - a));
  return u * u * (3 - 2 * u);
};

export function entryPosition(progress: number): Point {
  const u = clamp(progress / LIGHT_END);
  const distance = 1.55 * u - .55 * u * u;
  return { x: 126 + 570 * distance, y: 54 + 238 * distance };
}

export function positionAt(progress: number, kind: JourneyKind): Point {
  const p = clamp(progress);
  if (p <= LIGHT_END || kind === 'dust') return entryPosition(p);
  const u = (p - LIGHT_END) / (1 - LIGHT_END), v = 1 - u;
  // Match entry tangent and speed at the join; the surviving path then bends
  // toward a mainly downward fall. Ground contact is at the rock's lower edge.
  const joinDx = 570 * .45 / LIGHT_END * (1 - LIGHT_END) / 3;
  const joinDy = 238 * .45 / LIGHT_END * (1 - LIGHT_END) / 3;
  return {
    x: v ** 3 * 696 + 3 * v * v * u * (696 + joinDx) + 3 * v * u * u * 748 + u ** 3 * 748,
    y: v ** 3 * 292 + 3 * v * v * u * (292 + joinDy) + 3 * v * u * u * 405 + u ** 3 * 445,
  };
}

export function meteorState(progress: number, kind: JourneyKind) {
  const p = clamp(progress), ablated = smooth(ENTRY, LIGHT_END, p);
  const mass = kind === 'stone' ? 1 - .905 * ablated : 1 - ablated;
  const glow = smooth(ENTRY, ENTRY + .065, p) * (1 - smooth(.49, LIGHT_END, p));
  const position = positionAt(p, kind);
  const before = positionAt(Math.max(0, p - .0001), kind);
  const after = positionAt(Math.min(1, p + .0001), kind);
  return {
    ...position, mass, glow, radius: 15.34 * Math.cbrt(mass),
    direction: Math.atan2(after.y - before.y, after.x - before.x),
    visible: mass > 0,
    stage: p < ENTRY ? 'space' : p < LIGHT_END ? 'luminous' : kind === 'dust' ? 'lost' : p < 1 ? 'dark' : 'landed',
  } as const;
}

/** A wake parcel belongs to the air at its birth position, not to the moving rock. */
export function wakeParcel(birth: number, progress: number) {
  const anchor = entryPosition(birth), age = progress - birth;
  const strength = meteorState(birth, 'dust').glow;
  const opacity = age <= 0 ? 0 : strength * smooth(0, .012, age) * (1 - smooth(.04, .28, age));
  return {
    birth, age, anchor,
    x: anchor.x + Math.max(0, age) * 22,
    y: anchor.y + Math.sin(birth * 32) * Math.max(0, age) * 12,
    radius: 2.3 + Math.max(0, age) * 37, opacity,
  };
}
export const WAKE_BIRTHS = Array.from({ length: 88 }, (_, i) => ENTRY + (LIGHT_END - ENTRY) * i / 87);
