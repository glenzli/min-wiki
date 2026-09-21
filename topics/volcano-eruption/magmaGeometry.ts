/** Stable, irregular sill lenses and branched sheet intrusions in section.
 * Local coordinates match the eruption canvas; landscape adapts these points.
 * The feeder continues below the frame: storage is not the origin of magma. */
export type Point = [number, number];
export const seed = (i: number) => (Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1 + 1) % 1;
export function lens(cx: number, cy: number, width: number, depth: number, phase: number): Point[] {
  return Array.from({ length: 81 }, (_, i) => {
    const a = i / 80 * Math.PI * 2;
    const edge = 1 + .14 * Math.sin(a * 3 + phase) + .08 * Math.sin(a * 7 + phase);
    return [cx + Math.cos(a) * width * edge, cy + Math.sin(a) * depth * edge + Math.sin(Math.cos(a) * 3 + phase) * depth * .35];
  });
}
export const STORAGE = [
  { x: -25, y: 184, w: 105, h: 17, phase: .7 },
  { x: 36, y: 151, w: 65, h: 13, phase: 2.2 },
  { x: -64, y: 130, w: 37, h: 7, phase: 4 },
];
export const FEEDERS: Point[][] = [
  [[-60, 240], [-47, 218], [-52, 207], [-30, 186]],
  [[-30, 183], [-17, 173], [8, 166], [16, 150]],
  [[-45, 181], [-72, 163], [-60, 146], [-65, 129]],
];
export function dike(vent: number, surface: number, front = 1): Point[] {
  const knots: Point[] = Array.from({ length: 65 }, (_, i) => {
    if (i === 64) return [vent, surface];
    const u = i / 64, envelope = Math.sin(Math.PI * u);
    return [16 * (1 - u) + vent * u ** 1.25 + (14 * Math.sin(u * 7.7) + 4 * Math.sin(u * 24.3)) * envelope, 151 + (surface - 151) * u];
  });
  const end = Math.max(0, Math.min(1, front)) * (knots.length - 1);
  const points = knots.slice(0, Math.floor(end) + 1);
  if (end < knots.length - 1) {
    const a = knots[Math.floor(end)], b = knots[Math.floor(end) + 1], u = end % 1;
    points.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return points;
}
export function ribbon(points: Point[], width: number): Point[] {
  return [-1, 1].flatMap(side => {
    const edge = points.map(([x, y], i): Point => {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const taper = i === points.length - 1 ? .12 : .75 + .22 * Math.sin(i * 2.7 + .5);
      return [x - side * (b[1] - a[1]) / length * width * taper, y + side * (b[0] - a[0]) / length * width * taper];
    });
    return side === 1 ? edge.reverse() : edge;
  });
}
