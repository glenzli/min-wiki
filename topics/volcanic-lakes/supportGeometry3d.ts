/** Bounded teaching relief at the roof/support contact. This is an enlarged
 * local separation, not an evacuated magma chamber, gas-pressure calculation
 * or a measurement of subsurface void dimensions. Buttresses and the rear of
 * each pocket retain the crystalline/melt-bearing support material. */
export const SUPPORT_POCKETS = [
  { x: -2.44, z: -.06, width: .87, depth: 1.05, height: .76 },
  { x: -.57, z: -.10, width: .81, depth: 1.16, height: 1.04 },
  { x: 1.70, z: -.04, width: 1.01, depth: .96, height: .86 },
] as const;

const ease = (a: number, b: number, x: number) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

/** Compact spatial support: exact zero between mouths and behind them keeps
 * separated pockets instead of joining them into one large hollow. */
export function supportRelief(x: number, z: number) {
  let relief = 0;
  for (const pocket of SUPPORT_POCKETS) {
    const along = Math.abs((x - pocket.x) / pocket.width), back = Math.abs((z - pocket.z) / pocket.depth);
    const mouth = (1 - ease(.36, 1, along)) * (1 - ease(.24, 1, back));
    const lithic = .84 + .11 * Math.sin(x * 10.7 + z * 6.4) + .05 * Math.sin(x * 23.1 - z * 12.3);
    relief = Math.max(relief, pocket.height * mouth * lithic);
  }
  return relief;
}

/** The existing withdrawal opens the explanatory pockets; each retained block
 * closes its own contact late in its existing descent. No second clock or
 * forward-only history is required. Final settled rock has no residual gap. */
export function supportSeparation(relief: number, withdrawal: number, blockPhase: number) {
  return relief * ease(.15, .95, withdrawal) * (1 - ease(.67, 1, blockPhase));
}

/** A narrow, finite observation recess reveals the broken sides of a fault.
 * Its width/depth are exaggerated near the teaching cut. It ends at the roof
 * base, rather than continuing as a black conduit through the basement. */
export function fractureRecess(distance: number, y: number, upper: number, lower: number, fracture: number) {
  if (fracture <= 0 || y < lower - .14 || y > upper + .08) return 0;
  const mouth = 1 - ease(.015, .035 + .205 * fracture, Math.abs(distance));
  const ends = ease(lower - .14, lower + .10, y) * (1 - ease(upper - .03, upper + .08, y));
  return (.47 + .10 * Math.sin(y * 8.7 + distance * 4.1) ** 2) * fracture * mouth * ends;
}

/** Near the teaching section, refine every exposed edge before capping it.
 * This gives an uneven contact a real sidewall and rear closure rather than
 * stretching one triangle across an entire block's straight cut. */
export function refineSectionPerimeter(poly: [number, number][], step = .16): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const section = Math.abs(a[1]) < 1e-7 && Math.abs(b[1]) < 1e-7;
    const count = section ? Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)) : 1;
    for (let j = 0; j < count; j++) result.push([a[0] + (b[0] - a[0]) * j / count, a[1] + (b[1] - a[1]) * j / count]);
  }
  return result;
}
