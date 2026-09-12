/** Qualitative teaching timeline; time is deliberately not calibrated to one specimen. */
export type TouchExtent = 'local' | 'whole';
export interface TouchSettings { pinna: number; extent: TouchExtent }
export const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const ease = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export function signalArrival(pinna: number, pair: number, settings: TouchSettings): number {
  if (settings.extent === 'local' && pinna !== settings.pinna) return Infinity;
  // The touched tip responds first; other bases are reached later along the rachilla.
  return .11 + (1 - clamp(pair / 11)) * .19 + (pinna === settings.pinna ? 0 : .09 + Math.abs(pinna - settings.pinna) * .014);
}
export function leafletFold(progress: number, pinna: number, pair: number, settings: TouchSettings): number {
  const arrival = signalArrival(pinna, pair, settings);
  if (!Number.isFinite(arrival)) return 0;
  return ease(arrival + .025, arrival + .15, clamp(progress)) * (1 - ease(.7, 1, clamp(progress)));
}
export function response(progress: number, settings: TouchSettings) {
  const p = clamp(progress);
  const fold = leafletFold(p, settings.pinna, 6, settings);
  const stage = p < .1 ? 0 : p < .31 ? 1 : p < .55 ? 2 : p < .7 ? 3 : 4;
  return { stage, fold, water: 1 - .68 * fold, droop: settings.extent === 'whole' ? ease(.35, .57, p) * (1 - ease(.7, 1, p)) : 0,
    signal: p >= .1 && p < .43, recovering: p >= .7 && p < 1 };
}
