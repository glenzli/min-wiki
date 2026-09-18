import type { WorldId } from './model.ts';
import interiorData from './interior-data.json';

export interface Bilingual { zh: string; en: string }
export interface InteriorLayer {
  id: string;
  name: Bilingual;
  kids: Bilingual;
  science: Bilingual;
  color: string;
  inner: number;
  outer: number;
  uncertain?: boolean;
}
export interface InteriorProfile {
  layers: InteriorLayer[];
  summary: Bilingual;
  evidence: Bilingual;
  sources: { title: string; url: string }[];
}

/**
 * Radial teaching regions, outside to center; thicknesses are schematic, not depths.
 * The outer radius is 1, the center is 0. Crusts are enlarged for visibility.
 * Atmospheres and local surface liquids are not added as fictitious thick global shells.
 * Giant-planet regions can mix gradually; an edge here is an annotation boundary.
 * In particular, 55 Cancri e has no measured magma-ocean floor: every region is a
 * candidate illustration, and the hot outer band does NOT imply a global melt layer.
 * `uncertain` flags an especially unresolved interpretation, not that every unflagged
 * internal layer has been photographed. Sources checked 2026-09-19.
 * The paired scientific content lives in interior-data.json; UI selects a language.
 */
export const INTERIORS: Record<WorldId, InteriorProfile> = interiorData;

function layersForId(worldId: WorldId): InteriorLayer[] {
  // A stale selector value must not break the scene; typed callers use known WorldIds.
  return (Object.hasOwn(INTERIORS, worldId) ? INTERIORS[worldId] : INTERIORS.earth).layers;
}

/** Progress 0 is the exterior, progress 1 is the center: radius = 1 - progress. */
export function interiorAt(worldId: WorldId, progress: number): InteriorLayer {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const layers = layersForId(worldId);
  // At an exact interface select the newly entered, deeper region. Comparing progress
  // boundaries directly avoids cancellation rounding in 1 - (1 - layer.inner).
  return layers.find(layer => p < 1 - layer.inner) ?? layers[layers.length - 1]!;
}

/** Stop at a region's middle, except the final stop which reaches the exact center. */
export function layerStop(worldId: WorldId, index: number): number {
  const layers = layersForId(worldId);
  const i = Number.isFinite(index) ? Math.min(layers.length - 1, Math.max(0, Math.trunc(index))) : 0;
  const layer = layers[i]!;
  return i === layers.length - 1 ? 1 : 1 - (layer.inner + layer.outer) / 2;
}
