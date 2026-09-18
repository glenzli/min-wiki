export type Point = { x: number; y: number; z: number };
export function shadowTip(lightX: number, lightHeight: number, objectX = 450, objectHeight = 120) {
  if (!Number.isFinite(lightHeight) || lightHeight <= objectHeight) throw new RangeError('light must be above object');
  return objectX + (objectX - lightX) * objectHeight / (lightHeight - objectHeight);
}
/** Straight ray from a source through an opaque surface point, continued to z = 0. */
export function groundProjection(point: Point, light: Point): Point {
  if (light.z <= point.z || point.z < 0) throw new RangeError('source must be above every object point');
  const factor = light.z / (light.z - point.z);
  return { x: light.x + (point.x - light.x) * factor, y: light.y + (point.y - light.y) * factor, z: 0 };
}
export function project(point: Point, overhead: number): [number, number] {
  const v = Math.max(0, Math.min(1, overhead));
  return [450 + (point.x - 450) * .8 + point.y * .4 * (1 - v),
    350 - v * 130 + point.y * (.38 + v * .42) - point.z * .96 * (1 - v)];
}
export function hull(points: [number, number][]): [number, number][] {
  const ordered = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a: number[], b: number[], c: number[]) => (b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!);
  const half = (list: [number, number][]) => { const result: [number, number][] = []; for (const point of list) { while (result.length > 1 && cross(result.at(-2)!, result.at(-1)!, point) <= 0) result.pop(); result.push(point); } return result; };
  return [...half(ordered).slice(0, -1), ...half(ordered.reverse()).slice(0, -1)];
}
// Ellipsoids form a small wooden figure. Surface sampling is deterministic.
export const parts = [
  { x: 439, y: 0, z: 26, rx: 8, ry: 10, rz: 26 }, { x: 461, y: 0, z: 26, rx: 8, ry: 10, rz: 26 },
  { x: 450, y: 0, z: 66, rx: 23, ry: 13, rz: 27 },
  { x: 420, y: 0, z: 68, rx: 12, ry: 8, rz: 20 }, { x: 480, y: 0, z: 68, rx: 12, ry: 8, rz: 20 },
  { x: 450, y: 0, z: 106, rx: 14, ry: 14, rz: 14 },
].map(part => ({ ...part, points: Array.from({ length: 117 }, (_, i): Point => {
  const latitude = Math.floor(i / 13) / 8 * Math.PI, longitude = (i % 13) / 12 * Math.PI * 2;
  return { x: part.x + Math.sin(latitude) * Math.cos(longitude) * part.rx, y: part.y + Math.sin(latitude) * Math.sin(longitude) * part.ry, z: part.z + Math.cos(latitude) * part.rz };
}) }));
