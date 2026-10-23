/** Stable teaching coordinates. They describe spatial structure, never a star catalogue. */
export const galacticCases = ['milky-way', 'spiral', 'elliptical', 'irregular', 'star-cluster', 'local-group'] as const;
export type GalacticCase = typeof galacticCases[number];
export type GalacticPart = 'disk' | 'bulge' | 'halo' | 'dust' | 'population';
export type GalacticState = { selected: GalacticCase; yaw: number; pitch: number; disk: boolean; bulge: boolean; halo: boolean; guides: boolean };
export type StellarCloud = { part: GalacticPart; positions: Float32Array; colors: Float32Array; size: number; opacity: number; mist?: boolean };
export type GalacticObject = { id: string; center: readonly [number, number, number]; scale: number; inclination: number; clouds: StellarCloud[] };
export const MILKY_DISK_RADIUS_LY = 50_000;
export const SOLAR_RADIUS_LY = 26_000;
export const SOLAR_POSITION = [SOLAR_RADIUS_LY / MILKY_DISK_RADIUS_LY, 0, 0] as const;
export const MAX_POINTS_PER_CASE = 19_000;
export const GALACTIC_CACHE_LIMIT = 2;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const finite = (value: string | null, fallback: number) => value !== null && Number.isFinite(Number(value)) ? Number(value) : fallback;
const random = (n: number) => { let h = Math.imul(n + 17, 374761393); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function readGalacticState(query: string): GalacticState {
  const p = new URLSearchParams(query), selected = p.get('galaxy');
  return { selected: galacticCases.includes(selected as GalacticCase) ? selected as GalacticCase : 'milky-way',
    yaw: clamp(finite(p.get('galaxyYaw'), -.22), -Math.PI, Math.PI), pitch: clamp(finite(p.get('galaxyPitch'), .92), 0, Math.PI / 2),
    disk: p.get('galaxyDisk') !== '0', bulge: p.get('galaxyBulge') !== '0', halo: p.get('galaxyHalo') !== '0', guides: p.get('galaxyGuides') === '1' };
}
export function saveGalacticState(p: URLSearchParams, s: GalacticState) {
  p.set('galaxy', s.selected); p.set('galaxyYaw', s.yaw.toFixed(4)); p.set('galaxyPitch', s.pitch.toFixed(4));
  for (const part of ['disk', 'bulge', 'halo', 'guides'] as const) p.set(`galaxy${part[0]!.toUpperCase()}${part.slice(1)}`, s[part] ? '1' : '0');
}
/** No clock or automatic rotation: view controls only move the observer. */
export function turnGalacticView(s: GalacticState, dx: number, dy: number): GalacticState {
  return { ...s, yaw: Math.atan2(Math.sin(s.yaw + dx), Math.cos(s.yaw + dx)), pitch: clamp(s.pitch + dy, 0, Math.PI / 2) };
}
function cloud(part: GalacticPart, count: number, seed: number, shape: 'spiral' | 'elliptical' | 'irregular' | 'cluster' = 'spiral'): StellarCloud {
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const n = i * 19 + seed * 3109, u = random(n), v = random(n + 1), w = random(n + 2), a = v * Math.PI * 2, h = w * 2 - 1, q = Math.sqrt(1 - h * h);
    let x = 0, y = 0, z = 0;
    if (shape === 'irregular') {
      // Unequal overlapping volumes, including an off-centre concentration; no rotational symmetry.
      const knots = [[-.36, -.08, .02, .52], [.32, .18, .06, .41], [.06, -.32, -.08, .29], [.62, -.09, .10, .17]] as const;
      const k = knots[i % knots.length]!, r = k[3] * Math.pow(u, .65);
      x = k[0] + r * q * Math.cos(a); y = k[1] + r * q * Math.sin(a) * .75; z = k[2] + r * h * .5;
    } else if (shape === 'elliptical' || shape === 'cluster' || part === 'halo' || part === 'bulge') {
      const r = (part === 'bulge' ? .27 : part === 'halo' ? 1.45 : 1) * Math.pow(u, shape === 'cluster' ? 1.25 : .85);
      const axes = part === 'bulge' ? [1.6, .72, .6] : part === 'halo' ? [1, 1, .84] : shape === 'elliptical' ? [1, .72, .60] : [1, 1, .96];
      x = r * q * Math.cos(a) * axes[0]!; y = r * q * Math.sin(a) * axes[1]!; z = r * h * axes[2]!;
    } else {
      // Centre-weighted disk with broad inter-arm population, narrow arm overdensities and clumps.
      const r = .035 + .965 * Math.pow(u, .82), arms = i % 4;
      const armAngle = arms * Math.PI / 2 + Math.log(r) * 2.1 + (random(n + 3) + random(n + 4) - 1) * (part === 'dust' ? .12 : .38);
      const theta = part !== 'dust' && i % 3 === 0 ? a : armAngle;
      const clump = i % 23 === 0 ? 1 + (random(n + 5) - .5) * .12 : 1;
      x = r * Math.cos(theta) * clump; y = r * Math.sin(theta) * clump;
      z = h * (.009 + .022 * r) * (part === 'dust' ? .34 : 1);
    }
    positions.set([x, y, z], i * 3);
    const warm = shape === 'elliptical' || shape === 'cluster' || part === 'bulge' || part === 'halo' || i % 7 === 0;
    const brightness = .55 + random(n + 7) * .45;
    colors.set((warm ? [1, .79, .55] : [.50, .72, 1]).map(c => c * brightness), i * 3);
  }
  return { part, positions, colors, size: part === 'dust' ? 12 : part === 'bulge' ? 3.5 : part === 'halo' ? 1.4 : 2.0, opacity: part === 'dust' ? .11 : part === 'halo' ? .28 : .68 };
}
const spiralClouds = (seed: number, factor = 1) => {
  const glow = cloud('disk', Math.round(1_300 * factor), seed); glow.size = 32; glow.opacity = .045; glow.mist = true;
  return [glow, cloud('disk', Math.round(11_000 * factor), seed), cloud('dust', Math.round(2_000 * factor), seed + 1), cloud('bulge', Math.round(3_000 * factor), seed + 2), cloud('halo', Math.round(1_200 * factor), seed + 3)];
};
export function galacticObjects(selected: GalacticCase): GalacticObject[] {
  if (selected === 'local-group') return [
    { id: 'milky-way', center: [-.72, -.28, -.12], scale: .14, inclination: .30, clouds: spiralClouds(3, .30) },
    { id: 'andromeda', center: [.70, .23, .16], scale: .22, inclination: 1.1, clouds: spiralClouds(7, .32) },
    { id: 'triangulum', center: [.28, -.64, .34], scale: .10, inclination: .7, clouds: spiralClouds(11, .19) },
    { id: 'dwarfs', center: [0, 0, 0], scale: 1, inclination: 0, clouds: [cloud('population', 24, 13, 'irregular')] },
  ];
  if (selected === 'star-cluster') return [
    { id: 'cluster-context', center: [-.72, 0, 0], scale: .52, inclination: .35, clouds: spiralClouds(3, .30) },
    { id: 'cluster-detail', center: [.68, 0, .04], scale: .56, inclination: 0, clouds: [cloud('population', 9_500, 27, 'cluster')] },
  ];
  return [{ id: selected, center: [0, 0, 0], scale: 1, inclination: 0,
    clouds: selected === 'elliptical' ? [cloud('population', 14_500, 17, 'elliptical')] : selected === 'irregular' ? [cloud('population', 13_000, 23, 'irregular')] : spiralClouds(selected === 'milky-way' ? 3 : 41) }];
}
export function galacticPointCount(objects: readonly GalacticObject[]) { return objects.reduce((sum, o) => sum + o.clouds.reduce((n, c) => n + c.positions.length / 3, 0), 0); }
