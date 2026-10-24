/** Mechanism cases, not chronological stages of one object. */
export const NEBULAE = ['nursery', 'planetary', 'supernova'] as const;
export type NebulaKind = typeof NEBULAE[number];
/** Separate observed objects inspire these authored cloud morphologies. */
export const NEBULA_REFERENCES = ['orion', 'pillars', 'horsehead'] as const;
export type NebulaReference = typeof NEBULA_REFERENCES[number];
export const ILLUMINATIONS = ['emission', 'reflection', 'dark'] as const;
export type Illumination = typeof ILLUMINATIONS[number];
export const nebulaFrom = (value: string | null): NebulaKind => value === 'planetary' || value === 'supernova' ? value : 'nursery';
export const nebulaReferenceFrom = (value: string | null): NebulaReference => value === 'pillars' || value === 'horsehead' ? value : 'orion';
export const illuminationFrom = (value: string | null): Illumination => value === 'reflection' || value === 'dark' ? value : 'emission';

/** Path length through a uniform, optically thin spherical shell. Illustrates
 * limb brightening only; real remnants have clumps, extinction and spectral bands. */
export function shellPathLength(projectedRadius: number, innerRadius = .8, outerRadius = 1): number {
  if (!Number.isFinite(projectedRadius) || !Number.isFinite(innerRadius) || !Number.isFinite(outerRadius) || innerRadius < 0 || outerRadius <= innerRadius) return 0;
  const b = Math.abs(projectedRadius);
  if (b >= outerRadius) return 0;
  return 2 * (Math.sqrt(outerRadius ** 2 - b ** 2) - (b < innerRadius ? Math.sqrt(innerRadius ** 2 - b ** 2) : 0));
}
