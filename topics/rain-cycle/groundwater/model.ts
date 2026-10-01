/** Two well-mixed stores; all water quantities are illustrative, not calibrated. */
export const STEPS = 240;
export const SOIL_CAPACITY = 12;
export const AQUIFER_CAPACITY = 100;
export const RIVER_HEAD = 0.38;
export const INITIAL_STORAGE = 52;
/** Fixed well elevations in the same normalized head coordinate as storage/river. */
export const WELL = { wellheadHead: 1, screenTopHead: .22, intakeHead: .12, bottomHead: .10 } as const;
/** Submerged screen fraction is a teaching supply response, not a well-yield equation. */
export function wellState(storage: number) {
  const head = Math.max(0, storage) / AQUIFER_CAPACITY;
  return {
    head,
    available: Math.max(0, storage - WELL.intakeHead * AQUIFER_CAPACITY),
    wetFraction: Math.max(0, Math.min(1, (head - WELL.intakeHead) / (WELL.screenTopHead - WELL.intakeHead))),
  };
}
export interface Conditions { rain: number; permeability: number; pumping: number; rainStopsAt?: number }
export const DEFAULT_CONDITIONS: Conditions = { rain: 0.65, permeability: 0.65, pumping: 0.12 };
const bound = (value: number, low: number, high: number, fallback = low) =>
  Math.max(low, Math.min(high, Number.isFinite(value) ? value : fallback));
export function conditions(input: Partial<Conditions> = {}): Conditions {
  return {
    rain: bound(input.rain ?? DEFAULT_CONDITIONS.rain, 0, 1.2, DEFAULT_CONDITIONS.rain),
    permeability: bound(input.permeability ?? DEFAULT_CONDITIONS.permeability, 0, 1, DEFAULT_CONDITIONS.permeability),
    pumping: bound(input.pumping ?? DEFAULT_CONDITIONS.pumping, 0, 1.4, DEFAULT_CONDITIONS.pumping),
    rainStopsAt: Math.floor(bound(input.rainStopsAt ?? STEPS + 1, 0, STEPS + 1, STEPS + 1)),
  };
}
export interface Totals {
  rain: number; infiltration: number; recharge: number; riverIn: number;
  riverOut: number; pumped: number; runoff: number;
  taggedInput: number; taggedRunoff: number; taggedRiver: number; taggedPumped: number;
}
export interface Frame {
  step: number; soil: number; storage: number; head: number;
  taggedSoil: number; taggedGround: number;
  flux: { infiltration: number; recharge: number; river: number; pumped: number; unmet: number; runoff: number; exchangeHead: number; taggedRiver: number };
  totals: Totals;
}
export function initialFrame(): Frame {
  return {
    step: 0, soil: 0, storage: INITIAL_STORAGE, head: INITIAL_STORAGE / AQUIFER_CAPACITY,
    taggedSoil: 0, taggedGround: 0,
    flux: { infiltration: 0, recharge: 0, river: 0, pumped: 0, unmet: 0, runoff: 0, exchangeHead: INITIAL_STORAGE / AQUIFER_CAPACITY, taggedRiver: 0 },
    totals: { rain: 0, infiltration: 0, recharge: 0, riverIn: 0, riverOut: 0, pumped: 0, runoff: 0, taggedInput: 0, taggedRunoff: 0, taggedRiver: 0, taggedPumped: 0 },
  };
}
export function advance(previous: Frame, input: Conditions): Frame {
  const c = conditions(input);
  const rain = previous.step < c.rainStopsAt! ? c.rain : 0;
  // Surface rain cannot jump directly into the saturated store. Backed-up soil
  // rejects new rain as runoff; zero permeability blocks both entry and exchange.
  const infiltration = Math.min(rain, 1.4 * c.permeability, SOIL_CAPACITY - previous.soil);
  const runoff = rain - infiltration;
  let soil = previous.soil + infiltration;
  const taggedRain = previous.step < 8 ? rain : 0;
  let taggedSoil = previous.taggedSoil + (previous.step < 8 ? infiltration : 0);
  const recharge = Math.min(soil * 0.075 * c.permeability, AQUIFER_CAPACITY - previous.storage);
  const taggedRecharge = soil > 0 ? taggedSoil * recharge / soil : 0;
  soil -= recharge;
  taggedSoil -= taggedRecharge;
  let storage = previous.storage + recharge;
  let taggedGround = previous.taggedGround + taggedRecharge;
  // Withdraw before exchange so the displayed post-step head and river arrow
  // remain on the same side of the river boundary even during drawdown.
  const well = wellState(storage);
  // Water below this fixed intake remains underground. A partly exposed screen
  // supplies less of the requested rate; drawing geometry never sets the limit.
  const pumped = Math.min(c.pumping * well.wetFraction, well.available);
  const taggedPumped = storage > 0 ? taggedGround * pumped / storage : 0;
  storage -= pumped;
  taggedGround -= taggedPumped;
  const exchangeHead = storage / AQUIFER_CAPACITY;
  // Signed linear conductance (a lumped Darcy-like teaching relation). The river
  // is an external constant-head boundary, NOT part of the 100-portion cohort.
  const requestedRiver = 2 * c.permeability * (exchangeHead - RIVER_HEAD);
  const river = requestedRiver >= 0
    ? Math.min(requestedRiver, storage)
    : -Math.min(-requestedRiver, AQUIFER_CAPACITY - storage);
  const taggedRiver = river > 0 && storage > 0 ? taggedGround * river / storage : 0;
  storage -= river;
  taggedGround -= taggedRiver;
  const t = previous.totals;
  return {
    step: previous.step + 1, soil, storage, head: storage / AQUIFER_CAPACITY,
    taggedSoil, taggedGround,
    flux: { infiltration, recharge, river, pumped, unmet: c.pumping - pumped, runoff, exchangeHead, taggedRiver },
    totals: {
      rain: t.rain + rain, infiltration: t.infiltration + infiltration,
      recharge: t.recharge + recharge, riverIn: t.riverIn + Math.max(0, -river),
      riverOut: t.riverOut + Math.max(0, river), pumped: t.pumped + pumped,
      runoff: t.runoff + runoff, taggedInput: t.taggedInput + taggedRain,
      taggedRunoff: t.taggedRunoff + (previous.step < 8 ? runoff : 0),
      taggedRiver: t.taggedRiver + taggedRiver, taggedPumped: t.taggedPumped + taggedPumped,
    },
  };
}
export function experiment(input: Partial<Conditions> = {}, steps = STEPS): Frame[] {
  const result = [initialFrame()];
  const count = Math.floor(bound(steps, 0, STEPS));
  const c = conditions(input);
  for (let i = 0; i < count; i++) result.push(advance(result[i], c));
  return result;
}
export function waterBalance(frame: Frame): number {
  const t = frame.totals;
  return INITIAL_STORAGE + t.rain + t.riverIn - t.runoff - t.riverOut - t.pumped - frame.soil - frame.storage;
}
export function tracerBalance(frame: Frame): number {
  const t = frame.totals;
  return t.taggedInput - t.taggedRunoff - t.taggedRiver - t.taggedPumped - frame.taggedSoil - frame.taggedGround;
}
export function riverDirection(frame: Frame): 'toRiver' | 'fromRiver' | 'still' {
  return Math.abs(frame.flux.river) < 0.0005 ? 'still' : frame.flux.river > 0 ? 'toRiver' : 'fromRiver';
}
