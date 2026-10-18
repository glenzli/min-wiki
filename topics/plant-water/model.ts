export const WATER_STOPS = [0, .34, .64, 1] as const;
const clamp = (x: number) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
/** Progress knots join a selected leaf's vein, wet mesophyll, lower pore and air.
 * Both views are structural diagrams with different magnifications, not measured paths. */
export const WATER_ROUTE = [[0,259,440],[.24,375,364],[.61,375,180],[.74,463,138],[.8,464,151],[.88,471,165],[1,488,211]] as const;
export const LEAF_WATER_ROUTE = [[.61,530,275],[.74,563,319],[.8,605,341],[.88,614,370],[1,614,413]] as const;
type Route = readonly (readonly [number, number, number])[];
function routeAt(route: Route, p: number) {
  const i = Math.max(0, route.findIndex(([end]) => p <= end) - 1);
  const [start, x, y] = route[i]!, [end, nextX, nextY] = route[i + 1]!;
  const u = clamp((p - start) / (end - start));
  return { x: mix(x, nextX, u), y: mix(y, nextY, u) };
}
/** A marked cohort, not a count or a delay estimate for real molecules. */
export function waterAt(progress: number) {
  const p = clamp(progress), detail = routeAt(LEAF_WATER_ROUTE, p);
  return { ...routeAt(WATER_ROUTE, p), detailX: detail.x, detailY: detail.y,
    vapour: clamp((p-.74)/.06), stage: p < .24 ? 0 : p < .61 ? 1 : p < .74 ? 2 : 3,
    leafProgress: clamp((p-.61)/.39), leafVisible: p >= .61, leftLeaf: p >= .88 };
}
