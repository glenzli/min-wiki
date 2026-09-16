import { clamp, response, type TouchSettings } from './model.ts';

export type Point = [number, number];
export interface TissueCell { id: number; center: Point; outline: Point[]; lower: boolean }
const noise = (n: number) => { const x = Math.sin(n * 127.13 + 31.17) * 43758.5453; return x - Math.floor(x); };

/** Only the primary pulvinus drives petiole droop. Leaflet folding is a separate organ. */
export function primaryPulvinus(progress: number, settings: TouchSettings) {
  const state = response(progress, settings), contraction = state.droop;
  const before = response(progress - .002, settings).droop;
  const after = response(progress + .002, settings).droop;
  return {
    contraction,
    lowerWater: 1 - .38 * contraction,
    upperWater: .85 + .12 * contraction,
    lowerTurgor: 1 - .8 * contraction,
    upperTurgor: .85 + .1 * contraction,
    // Arrow visibility follows change, not a perpetual decorative particle loop.
    flux: clamp(Math.abs(after - before) * 36),
    recovering: state.recovering,
  };
}

/** Shared material coordinates keep walls, cell contents and vascular tissue attached. */
export function tissuePoint(x: number, y: number, contraction: number): Point {
  const angle = .64 * contraction, u = clamp((x + 190) / 380), theta = angle * u;
  const cx = angle < .00001 ? -190 + 380 * u : -190 + 380 * Math.sin(theta) / angle;
  const cy = angle < .00001 ? 0 : 380 * (1 - Math.cos(theta)) / angle;
  const extension = x < -190 ? x + 190 : x > 190 ? x - 190 : 0;
  const depth = y * (y > 0 ? 1 - .18 * contraction : 1 + .045 * contraction);
  return [cx + extension * Math.cos(theta) - depth * Math.sin(theta), cy + extension * Math.sin(theta) + depth * Math.cos(theta)];
}

function clipHalfPlane(polygon: Point[], a: number, b: number, d: number): Point[] {
  const output: Point[] = [];
  polygon.forEach((current, i) => {
    const previous = polygon[(i + polygon.length - 1) % polygon.length]!;
    const pc = a * previous[0] + b * previous[1] - d, cc = a * current[0] + b * current[1] - d;
    if ((pc <= 0) !== (cc <= 0)) {
      const t = pc / (pc - cc);
      output.push([previous[0] + (current[0] - previous[0]) * t, previous[1] + (current[1] - previous[1]) * t]);
    }
    if (cc <= 0) output.push(current);
  });
  return output;
}

/** Fixed, irregularly packed cells; geometry is generated once, never randomized per frame. */
export function createMotorTissue(): TissueCell[] {
  const seeds: Point[] = [];
  for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) {
    const id = seeds.length;
    seeds.push([-199 + col * 48 + (row % 2) * 19 + (noise(id + 6) - .5) * 14, side * (24 + row * 31) + (noise(id + 90) - .5) * 11]);
  }
  return seeds.map((center, id) => {
    let polygon: Point[] = [[-224, -116], [224, -116], [224, 116], [-224, 116]];
    seeds.forEach((other, j) => {
      if (j === id) return;
      const a = other[0] - center[0], b = other[1] - center[1];
      polygon = clipHalfPlane(polygon, a, b, (other[0] ** 2 + other[1] ** 2 - center[0] ** 2 - center[1] ** 2) / 2);
    });
    return { id, center, lower: center[1] > 0, outline: polygon.map(([x, y]) => [center[0] + (x - center[0]) * .94, center[1] + (y - center[1]) * .94]) };
  });
}
