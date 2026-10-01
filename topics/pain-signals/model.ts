/** Explanatory sequence, not a conduction-speed or pain-intensity simulation. */
export const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const segment = (p: number, start: number, end: number) => clamp((p - start) / (end - start));

/** A shortening linkage inset, not a limb/joint or force simulation.
 * The near attachment and idealized tendon lengths stay fixed while the belly
 * shortens and pulls the same far attachment (and hand symbol) toward it.
 */
export function withdrawalLinkage(withdrawal: number) {
  const shortening = 20 * clamp(withdrawal);
  const origin = 540, bellyStart = 576, restingBellyLength = 112, distalTendonLength = 37;
  const bellyLength = restingBellyLength - shortening;
  const bellyEnd = bellyStart + bellyLength;
  const bellyCenter = bellyStart + bellyLength / 2;
  const fiberScale = bellyLength / restingBellyLength;
  return {
    origin, bellyStart, bellyEnd, bellyCenter, bellyRadius: bellyLength / 2,
    bellyHeight: 25 + 6 * clamp(withdrawal),
    attachment: bellyEnd + distalTendonLength,
    handOffset: -shortening,
    fiberScale, fiberOffset: bellyCenter - 632 * fiberScale,
  };
}

export function painSequence(progress: number) {
  const p = clamp(progress);
  const withdrawal = segment(p, 0.68, 0.84);
  return {
    progress: p,
    ending: segment(p, 0.02, 0.15),
    incoming: segment(p, 0.15, 0.44),
    reflex: segment(p, 0.44, 0.68),
    ascending: segment(p, 0.44, 0.91),
    withdrawal,
    linkage: withdrawalLinkage(withdrawal),
    processing: segment(p, 0.91, 1),
    phase: p < 0.15 ? 0 : p < 0.44 ? 1 : p < 0.68 ? 2 : p < 0.91 ? 3 : 4,
  };
}
