import { clamp, islandAccretion, type AccretionUnit } from './model.ts';

type IslandHistory = ReturnType<typeof islandAccretion>;
type Site = [number, number];

/** Fixed episode sites and bearings describe this teaching reconstruction only.
 * They are neither measured vents nor a rule for the evolution of an island. */
const SITES: Site[] = islandAccretion(.8).units.map(unit => {
  const stage = unit.phase === 'deep-base' ? .30 : unit.phase === 'spreading-flows' ? .38 + (unit.index - 7) * .05
    : unit.phase === 'shallow-fragments' ? .68 : .73;
  return [(unit.center - 500) * .0032 + .045 * Math.sin(unit.index * .83),
    stage + .055 * Math.cos(unit.index * .71)];
});

/** World bearing: x=cos(bearing), z=sin(bearing). Each retained flow keeps its
 * original bearing after a later episode moves the active outlet. */
export function islandFlowBearing(unitIndex: number): number {
  const index = Number.isFinite(unitIndex) ? Math.max(0, Math.min(SITES.length - 1, Math.floor(unitIndex))) : 0;
  return 1.04 + .36 * Math.sin(index * .91 - .38) + .10 * Math.sin(index * 1.73);
}

/** Convex weights from successive growths move the common source continuously.
 * Selecting currentIndex would jump whenever the next overlapping episode starts.
 * Completed histories keep the final site, including the limited-supply branch. */
export function islandVentSite(history: IslandHistory): Site {
  const first = SITES[0], initial = 1 - (history.units[0]?.growth ?? 0);
  let x = first[0] * initial, z = first[1] * initial;
  for (let i = 0; i < history.units.length; i++) {
    const weight = Math.max(0, history.units[i].growth - (history.units[i + 1]?.growth ?? 0));
    x += SITES[i][0] * weight; z += SITES[i][1] * weight;
  }
  return [x, z];
}

/** Positive, static thickness weights belong to each deposit, not to the newest
 * stage. Fragment packages preferentially build unequal, broken rims; later
 * cap packages fill parts of that depression and spread through a low gap.
 * Applying them before contact accumulation keeps earlier buried material fixed.
 * Geometry blends this off-axis reconstruction into the exact authored x section. */
export function islandDepositWeight(unit: AccretionUnit, x: number, z: number): number {
  const [cx, cz] = SITES[unit.index], dx = x - cx, dz = z - cz;
  const bearing = islandFlowBearing(unit.index), c = Math.cos(bearing), s = Math.sin(bearing);
  const along = dx * c + dz * s, across = -dx * s + dz * c;
  const radius = Math.hypot(dx, dz), local = Math.exp(-((radius / 3.1) ** 4));
  if (unit.phase === 'deep-base') {
    const shoulder = .42 * Math.exp(-(((along - .25) / .86) ** 2) - (((across - .14 * Math.sin(unit.index)) / .62) ** 2));
    const cleft = .20 * Math.exp(-(((along + .34) / .63) ** 2) - ((across / .25) ** 2));
    return 1 + local * (shoulder - cleft);
  }
  if (unit.phase === 'spreading-flows') {
    const tongue = .58 * Math.exp(-(((along - 1) / 1.46) ** 4) - ((across / .48) ** 2));
    const shoulder = .20 * Math.exp(-(((along + .40) / .74) ** 2) - (((across - .63) / .51) ** 2));
    return 1 + local * (tongue + shoulder - .27 * Math.exp(-((radius / .65) ** 4)));
  }
  const step = unit.index - (unit.phase === 'shallow-fragments' ? 14 : 19);
  const rho = Math.hypot(dx / (.78 + step * .035), dz / (.72 + step * .025));
  const angle = Math.atan2(dz, dx), rim = Math.exp(-(((rho - 1) / .30) ** 2));
  const gap = Math.exp(-((across / .29) ** 2)) * clamp((along + .02) / .74);
  const floor = Math.exp(-((rho / .73) ** 4));
  const unequal = .72 + .20 * Math.sin(angle * 2 + unit.index * .57) + .08 * Math.cos(angle * 3 - unit.index * .31);
  if (unit.phase === 'shallow-fragments') {
    return Math.max(.16, 1 + local * (.64 * rim * unequal * (1 - gap * .94)
      - .52 * floor - .40 * gap * Math.exp(-((rho / 1.9) ** 4))));
  }
  const filling = .46 + .18 * Math.sin(step * .88 + .3);
  const overflow = .28 * Math.exp(-(((along - .90) / 1.25) ** 4) - ((across / .39) ** 2));
  const shoulder = .18 * Math.exp(-(((along + .22) / .87) ** 2) - (((across + .67) / .43) ** 2));
  return Math.max(.24, 1 + local * (filling * floor - .18 * rim * unequal + overflow + shoulder - .26 * gap));
}
