/** Compressed recognition views: known body-size order survives selection and resize. */
export const energyResidents = new Set(['sun', 'red-dwarf', 'white-dwarf']);
// Each relation concerns the named examples, not a universal size assigned to a class.
// Generic clouds, events and unspecified black-hole masses have no invented diameter.
const orderedPairs = [
  ['sun', 'earth'], ['jupiter', 'earth'], ['jupiter', 'neptune'],
  ['earth', 'moon'], ['ceres', 'asteroid'], ['red-dwarf', 'white-dwarf'],
] as const;
export function largerPortrait(first: string, second: string): string | undefined {
  return orderedPairs.find(([large, small]) =>
    first === large && second === small || first === small && second === large)?.[0];
}
export function portraitLayout(width: number, height: number, first = '', second = '') {
  const narrow = width < 640;
  const larger = largerPortrait(first, second);
  const radius = narrow ? Math.min(width * .28, height * .17) : Math.min(width * .21, height * .285);
  const scaleFor = (id: string) => larger && id !== larger ? .62 : 1;
  return {
    mode: larger ? 'ordered' : 'windows',
    primary: { x: narrow ? 0 : -width * .21, y: height * (narrow ? .255 : .045), radius: radius * scaleFor(first) },
    partner: { x: narrow ? 0 : width * .26, y: height * (narrow ? -.215 : .045), radius: radius * scaleFor(second) },
  };
}
export function randomFor(seed: number) {
  let n = seed >>> 0;
  return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296; };
}
export interface PortraitPoint { x: number; y: number; z: number; size: number; warmth: number }
/** Stable illustrative populations. Every case fits a unit-radius owner. */
export function population(kind: string, count: number, seed = 17): PortraitPoint[] {
  const random = randomFor(seed);
  return Array.from({ length: count }, (_, i) => {
    const a = random() * Math.PI * 2, v = random() * 2 - 1, r = Math.cbrt(random());
    let x = Math.cos(a) * Math.sqrt(1 - v * v) * r, y = v * r, z = Math.sin(a) * Math.sqrt(1 - v * v) * r;
    let size = .012 + random() * .012, warmth = random();
    if (kind === 'galaxy') {
      const radius = Math.pow(random(), .62), angle = (i % 3) * Math.PI * 2 / 3 + radius * 5.6 + (random() - .5) * .7;
      const distributedAngle = i % 3 === 1 ? random() * Math.PI * 2 : angle;
      x = Math.cos(distributedAngle) * radius; z = Math.sin(distributedAngle) * radius; y = (random() - .5) * (.05 + .16 * (1 - radius));
      if (i % 4 === 0) { x *= .3; z *= .3; y *= 2; }
      warmth = 1 - radius; size = .012 + random() * .018;
    } else if (kind === 'cloud') {
      const t = random() * 5.6;
      x = Math.cos(t) * .5 + x * .39; y = Math.sin(t * .72) * .42 + y * .35 - .1; z = Math.sin(t * 1.5) * .18 + z * .43;
      size = .08 + random() * .15; warmth = .3 + .6 * Math.sin(t * .6) ** 2;
    } else if (kind === 'shell') {
      const radius = .78 + random() * .16;
      x = Math.cos(a) * Math.sqrt(1 - v * v) * radius; y = v * radius * .84; z = Math.sin(a) * Math.sqrt(1 - v * v) * radius;
      size = .028 + random() * .065; warmth = random() * .6;
    } else if (kind === 'dust') {
      const radius = .46 + random() * .5;
      x = Math.cos(a) * radius; z = Math.sin(a) * radius; y *= .07; size *= .75;
    }
    return { x, y, z, size, warmth };
  });
}
