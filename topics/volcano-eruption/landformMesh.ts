import { landSurface, type Landform } from './projectModel.ts';
import { seed, type Point } from './magmaGeometry.ts';
const n = (v: number) => v.toFixed(2);
export function landformProjection(kind: Landform, growth: number, erosion: number) {
  const radius = (kind === 'shield' ? 430 : kind === 'scoria' ? 260 : 280) * (.22 + .78 * Math.sqrt(growth));
  const point = (r: number, a: number): Point => {
    let relief = 426 - landSurface(500 + r, kind, growth, erosion);
    const irregularity = kind === 'composite' ? .09 : kind === 'shield' ? .04 : .012;
    relief *= 1 + irregularity * Math.sin(a * 3 + .8) * Math.sin(Math.PI * r / radius);
    const drainage = kind === 'composite' ? 1 : kind === 'shield' ? .28 : .12 + erosion * .8;
    const ribs = Math.sin(a * 13 + r * .011) * Math.sin(a * 7 - r * .012) * Math.sin(Math.PI * r / radius) * 9 * growth * drainage;
    return [500 + r * (1 + irregularity * Math.sin(a * 5 + .9)) * Math.cos(a), 426 - relief + r * (kind === 'shield' ? .30 : kind === 'composite' ? .4 : .53) * Math.sin(a) + ribs];
  };
  return { radius, point };
}
/** Oblique surface made from persistent radial patches, not a flat cone icon. */
export function landformMesh(kind: Landform, growth: number, green: number, erosion: number, progress: number, cooling: number, material: 'rock' | 'ash' = 'rock') {
  const { radius, point } = landformProjection(kind, growth, erosion);
  const patches: { y: number; svg: string }[] = [];
  const rock = material === 'ash' ? [188, 178, 158] : kind === 'shield' ? [99, 102, 91] : kind === 'composite' ? [146, 124, 101] : [151, 119, 86];
  
  for (let ring = 0; ring < 28; ring++) for (let slice = 0; slice < 80; slice++) {
    const a = slice / 80 * Math.PI * 2, b = (slice + 1) / 80 * Math.PI * 2;
    const r0 = ring / 28 * radius, r1 = (ring + 1) / 28 * radius;
    const points = [point(r0, a), point(r1, a), point(r1, b), point(r0, b)];
    const vegetation = green * (kind === 'composite' ? Math.max(0, Math.min(1, (r1 / radius - .3) * 2)) : 1);
    const color = rock.map((c, i) => c + ([119, 147, 69][i] - c) * vegetation);
    const shade = .77 + Math.cos(a + 2.1) * .22 + Math.sin(a * 13 + Math.sin(ring * .32)) * (kind === 'composite' ? .045 : .015) + seed(ring * 67 + slice) * .035;
    const bowl = r1 < radius * (kind === 'scoria' ? .24 : .10) ? .76 : 1;
    const fill = `rgb(${color.map(c => Math.round(c * shade * bowl)).join(',')})`;
    const coords = points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
    patches.push({ y: (r0 + r1) * .5 * Math.sin((a + b) * .5), svg: `<polygon points="${coords}" fill="${fill}" stroke="${fill}" stroke-width=".6"/>` });
  }
  // Back-to-front order preserves the raised far rim and the hollow interior.
  patches.sort((a, b) => a.y - b.y);
  const grains = Array.from({ length: 480 }, (_, i) => {
    const r = Math.sqrt(seed(i + 930)) * radius, a = seed(i + 381) * Math.PI * 2;
    const [x, y] = point(r, a);
    return `<path d="M${n(x)} ${n(y)}l${n(1 + seed(i + 771) * 2)} -.6" stroke="${i % 3 ? '#ebe5ba35' : '#293c303b'}" stroke-width=".65"/>`;
  }).join('');
  const flows = Array.from({ length: kind === 'scoria' ? 1 : 7 }, (_, i) => {
    const extent = Math.max(0, Math.min(1, (progress - .11 - i * .05) / .17));
    if (!extent) return '';
    const a = .3 + i * .42;
    const coords = Array.from({ length: 51 }, (_, j) => {
      const r = radius * (.14 + j / 50 * .81 * extent), angle = a + Math.sin(j * .13 + i) * .035;
      const [x, y] = point(r, angle); return `${n(x)},${n(y - .8)}`;
    }).join(' ');
    return `<polyline points="${coords}" fill="none" stroke="#4d4a3c" stroke-width="${kind === 'shield' ? 11 : 4}" opacity="${n(1 - green * .9)}"/><polyline points="${coords}" fill="none" stroke="#ed9c46" stroke-width="${kind === 'shield' ? 3.4 : 1.6}" opacity="${n((1 - cooling) * .8)}"/>`;
  }).join('');
  return patches.map(p => p.svg).join('') + grains + flows;
}
