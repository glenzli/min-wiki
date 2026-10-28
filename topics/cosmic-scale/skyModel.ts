/** Observer geometry for the sky-to-space bridge. No integration clock or renderer. */
export type Vec3 = readonly [number, number, number];
export type SkyCase = 'sky' | 'orion' | 'trappist-1';
export type SkyDirection = 'disk' | 'pole' | 'andromeda';
export type SkyView = 'ground' | 'space';
export type SkyState = {
  view: SkyView; systemWhole: boolean; systemOwner: 'solar' | 'trappist'; solarPlanet: number;
  milkyProgress: number; orionProgress: number; direction: SkyDirection;
  star: number; lines: boolean; systemClose: boolean; planet: number; systemDays: number; locateOrion: boolean;
};
export const SKY_CASES: readonly string[] = ['sky', 'orion', 'trappist-1'];
export const isSkyCase = (value: string): value is SkyCase => SKY_CASES.includes(value);
export const unit = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
export const smooth = (n: number) => { const u = unit(n); return u * u * (3 - 2 * u); };
const finite = (p: URLSearchParams, key: string, fallback: number) => {
  const s = p.get(key); return s !== null && s.trim() && Number.isFinite(Number(s)) ? Number(s) : fallback;
};
export function readSkyState(p: URLSearchParams): SkyState {
  return {
    view:p.get('skyView')==='ground'?'ground':'space',
    systemWhole:p.has('systemWhole')?p.get('systemWhole')!=='0':!p.has('systemClose'),
    systemOwner:p.get('systemOwner')==='solar'?'solar':'trappist',solarPlanet:Math.max(0,Math.min(7,Math.round(finite(p,'solarPlanet',2)))),
    milkyProgress: unit(finite(p, 'skyObserver', 0)), orionProgress: unit(finite(p, 'orionObserver', 0)),
    direction: ['disk', 'pole', 'andromeda'].includes(p.get('skyDirection') ?? '') ? p.get('skyDirection') as SkyDirection : 'disk',
    star: Math.max(0, Math.min(6, Math.round(finite(p, 'skyStar', 0)))), lines: p.get('skyLines') !== '0',
    systemClose: p.get('systemClose') === '1', planet: Math.max(0, Math.min(6, Math.round(finite(p, 'systemPlanet', 0)))),
    systemDays: Math.max(0, Math.min(20, finite(p, 'systemDays', 0))),
    locateOrion:p.get('orionContext')==='1',
  };
}
export function saveSkyState(p: URLSearchParams, s: SkyState) {
  p.set('skyView',s.view);p.set('systemWhole',s.systemWhole?'1':'0');p.set('systemOwner',s.systemOwner);p.set('solarPlanet',String(s.solarPlanet));
  p.set('skyObserver', unit(s.milkyProgress).toFixed(4)); p.set('orionObserver', unit(s.orionProgress).toFixed(4));
  p.set('skyDirection', s.direction); p.set('skyStar', String(s.star)); p.set('skyLines', s.lines ? '1' : '0');
  p.set('systemClose', s.systemClose ? '1' : '0'); p.set('systemPlanet', String(s.planet));
  p.set('systemDays', s.systemDays.toFixed(3));
  p.set('orionContext',s.locateOrion?'1':'0');
}
export const radians = (deg: number) => deg * Math.PI / 180;
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n];
export const lerp = (a: Vec3, b: Vec3, n: number): Vec3 => add(mul(a, 1 - n), mul(b, n));
export function equatorial(raDeg: number, decDeg: number): Vec3 {
  const a = radians(raDeg), d = radians(decDeg); return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}
/** ICRS/J2000 equatorial -> Galactic rotation, then x reversed to the existing centre-to-Sun axis. */
export function galacticDirection(raDeg: number, decDeg: number): Vec3 {
  const e = equatorial(raDeg, decDeg);
  return [-dot(e, [-.0548755604, -.8734370902, -.4838350155]), dot(e, [.4941094279, -.4448296300, .7469822445]), dot(e, [-.8676661490, -.1980763734, .4559837762])];
}
export const MILKY_DISK_RADIUS_LY=50_000;
export const SOLAR_RADIUS_LY=26_000;
export const SKY_SUN: Vec3 = [SOLAR_RADIUS_LY/MILKY_DISK_RADIUS_LY, 0, 0];
export function galacticStarPosition(ra:number,dec:number,distanceLy:number):Vec3 {return add(SKY_SUN,mul(galacticDirection(ra,dec),distanceLy/MILKY_DISK_RADIUS_LY));}
export const M31 = { ra: 10.6847, dec: 41.2690, distanceLy: 2_500_000 } as const;
export const M31_DIRECTION = galacticDirection(M31.ra, M31.dec);
export const skyDirection = (direction: SkyDirection): Vec3 => direction === 'pole' ? [0, 0, 1] : direction === 'andromeda' ? M31_DIRECTION : [-1, 0, .07];
export type Observer = { eye: Vec3; target: Vec3; up: Vec3; fov: number };
/** Ground sky is an explicit view; changing observer progress never introduces terrain. */
export const earthSkyOpacity = (view: SkyView) => view === 'ground' ? 1 : 0;
export const milkyTravelProgress = (progress: number) => smooth(progress);
export const groundObserver = (aspect=1.8):Observer => ({...milkyObserver(0,'disk',aspect),up:[0,.42,1]});
export function milkyObserver(progress: number, direction: SkyDirection, aspect = 1.8): Observer {
  const p = milkyTravelProgress(progress), aim = skyDirection(direction);
  // Back away from the sightline before curving outside. Crossing above the disk
  // while still looking up used to leave the Sun and the entire disk behind us.
  const retreat = add(SKY_SUN, mul(aim, -1.25));
  const eye = lerp(lerp(SKY_SUN, retreat, p), lerp(retreat, [1.35, -1.8, 1.28], p), p);
  const fov = 2*Math.atan(Math.tan(radians(76-p*28)/2)*Math.max(1,1/Math.max(.1,aspect)))*180/Math.PI;
  return { eye, target: lerp(add(SKY_SUN, mul(aim, .75)), [0, 0, 0], p),
    up: direction === 'pole' ? lerp([0, 1, 0], [0, 0, 1], p) : [0, 0, 1], fov };
}
const ORION_FORWARD = equatorial(83.5, -1);
const ORION_RIGHT: Vec3 = [Math.sin(radians(83.5)), -Math.cos(radians(83.5)), 0];
const ORION_UP: Vec3 = [Math.sin(radians(1)) * Math.cos(radians(83.5)), Math.sin(radians(1)) * Math.sin(radians(83.5)), Math.cos(radians(1))];
/** Real angular directions and one selected distance estimate; every axis stays in light-years. */
export function orionPosition(ra: number, dec: number, distanceLy: number): Vec3 {
  const d = equatorial(ra, dec); return [dot(d, ORION_RIGHT) * distanceLy, dot(d, ORION_UP) * distanceLy, dot(d, ORION_FORWARD) * distanceLy];
}
export function orionObserver(progress: number, aspect = 1.5): Observer {
  const p = smooth(progress);
  // Widen during the nearby passage; retain horizontal coverage in a narrow stage.
  // Only the observer changes: every star keeps its original light-year coordinates.
  const referenceFov = 32-p*10+Math.sin(p*Math.PI)*20;
  const fov = 2*Math.atan(Math.tan(radians(referenceFov)/2)*Math.max(1,1.8/Math.max(.1,aspect)))*180/Math.PI;
  return { eye: lerp([0, 0, 0], [2100, 850, -650], p), target: [0, 0, 950], up: [0, 1, 0], fov };
}
/** Reciprocal-parallax illustration, not a posterior distance or symmetric distance error. */
export function parallaxDistance(plxMas: number, errorMas: number) {
  if(!Number.isFinite(plxMas)||!Number.isFinite(errorMas)||errorMas<0||plxMas<=errorMas)throw new RangeError('A finite positive parallax above its formal error is required.');
  const lyPerPc = 3.26156;
  return { ly: 1000 / plxMas * lyPerPc, nearLy: 1000 / (plxMas + errorMas) * lyPerPc,
    farLy: 1000 / (plxMas - errorMas) * lyPerPc };
}
