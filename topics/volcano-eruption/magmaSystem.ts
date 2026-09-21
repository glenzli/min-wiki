import { bounded } from './projectModel.ts';
import { smooth, type Settings } from './model.ts';

/** A qualitative recharge-driven episode, not a pressure solver or forecast.
 * Buoyancy and regional stress are held fixed. Resistance combines the effect of
 * host-rock barriers/stress; gas/viscosity still control the erupted appearance.
 * Intrusion advances before connection. Surface products use a separate clock
 * that cannot start until this same intrusion reaches the surface. */
export function magmaState(progress: number, settings: Settings) {
  const p = bounded(progress), supply = bounded(settings.supply ?? .75);
  const resistance = bounded(settings.resistance ?? .35);
  const capacity = .2 + 1.1 * supply;
  const barrier = .37 + .50 * resistance;
  const advance = (time: number) => bounded((capacity * smooth(.02, .52, time) - barrier) * 2.8);
  let connectedAt: number | null = null;
  if (advance(.52) === 1) {
    let a = .02, b = .52;
    for (let i = 0; i < 32; i++) { const mid = (a + b) / 2; if (advance(mid) >= 1) b = mid; else a = mid; }
    connectedAt = b;
  }
  const front = advance(p), connected = connectedAt !== null && p >= connectedAt;
  const release = connected ? smooth(connectedAt!, connectedAt! + .18, p) : 0;
  const cooling = smooth(.78, 1, p);
  const pressure = bounded((capacity * smooth(.02, .52, p) - front * .18) * (1 - .64 * release) * (1 - .68 * cooling));
  const surfaceClock = connected ? .26 + .74 * bounded((p - connectedAt!) / (1 - connectedAt!)) : 0;
  return { p, supply, resistance, front, connected, connectedAt, pressure, release, cooling, surfaceClock,
    recharge: supply * smooth(0, .1, p) * (1 - smooth(.61, .89, p)),
    stored: bounded(.22 + capacity * smooth(.02, .52, p) * .48 - release * .25),
    gasExpansion: front * front * bounded(settings.gas) * (1 - cooling * .7),
    stage: p < .14 ? 0 : p >= .94 ? 5 : p >= .80 ? 4 : connected ? 3 : front > .005 ? 2 : 1,
  };
}
export type MagmaState = ReturnType<typeof magmaState>;
