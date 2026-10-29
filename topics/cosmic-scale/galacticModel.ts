import {viewZoom} from './viewNavigation.ts';
import {readSkyState, saveSkyState, isSkyCase, SKY_SUN, type SkyState} from './skyModel.ts';
import {isStellarFamily,type StellarFamilyCase} from './stellarFamilies.ts';
/** Stable teaching coordinates. They describe spatial structure, never a star catalogue. */
export const galacticCases = ['milky-way', 'galaxy-comparison', 'trappist-1', 'kepler-16','cygnus-x1','sky', 'orion', 'spiral', 'elliptical', 'irregular', 'star-cluster', 'local-group'] as const;
export type GalacticCase = typeof galacticCases[number];
export type GalacticPart = 'disk' | 'bulge' | 'halo' | 'dust' | 'population';
export type GalacticState = { selected: GalacticCase; yaw: number; pitch: number; zoom:number; disk: boolean; bulge: boolean; halo: boolean; guides: boolean; sky: SkyState; familyDays:Record<StellarFamilyCase,number>; compareTo:'spiral'|'elliptical'|'irregular' };
export type StellarCloud = { part: GalacticPart; positions: Float32Array; colors: Float32Array; size: number; opacity: number; mist?: boolean };
export type GalacticObject = { id: string; center: readonly [number, number, number]; scale: number; inclination: number; clouds: StellarCloud[] };
export {MILKY_DISK_RADIUS_LY,SOLAR_RADIUS_LY} from './skyModel.ts';
export const SOLAR_POSITION = SKY_SUN;
export const MAX_POINTS_PER_CASE = 19_000;
export const GALACTIC_CACHE_LIMIT = 2;
/** A teaching location in the stellar halo, not a measured named cluster. */
export const CLUSTER_LOCATION = [-.75, .60, .75] as const;
/** Deliberately enlarged locator; neither panel shares a physical size ruler. */
export const CLUSTER_LOCATOR_SCALE = .085;
/** Rounded reference extents, not a common isophote, halo boundary or ranking by total size. */
export const GALAXY_DIAMETER_LY={'milky-way':100_000,spiral:200_000,elliptical:120_000,irregular:7_600} as const;
export const GALAXY_PAIR_UNIT=.325;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const finite = (value: string | null, fallback: number) => value !== null && Number.isFinite(Number(value)) ? Number(value) : fallback;
const random = (n: number) => { let h = Math.imul(n + 17, 374761393); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function readGalacticState(query: string): GalacticState {
  const p = new URLSearchParams(query), selected = p.get('galaxy');
  return { selected: galacticCases.includes(selected as GalacticCase) ? selected as GalacticCase : 'milky-way',
    yaw: clamp(finite(p.get('galaxyYaw'), -.22), -Math.PI, Math.PI), pitch: clamp(finite(p.get('galaxyPitch'), .92), 0, Math.PI / 2),
    zoom:viewZoom(finite(p.get('galaxyZoom'),1)),disk: p.get('galaxyDisk') !== '0', bulge: p.get('galaxyBulge') !== '0', halo: p.get('galaxyHalo') !== '0', guides: p.get('galaxyGuides') === '1', sky: readSkyState(p),familyDays:{'kepler-16':clamp(finite(p.get('keplerDays'),0),0,228.776),'cygnus-x1':clamp(finite(p.get('cygnusDays'),0),0,11.199658)},compareTo:['spiral','irregular'].includes(p.get('compareGalaxy')??'')?p.get('compareGalaxy') as 'spiral'|'irregular':'elliptical' };
}
export function saveGalacticState(p: URLSearchParams, s: GalacticState) {
  p.set('galaxy', s.selected); p.set('galaxyYaw', s.yaw.toFixed(4)); p.set('galaxyPitch', s.pitch.toFixed(4));
  p.set('galaxyZoom',viewZoom(s.zoom).toFixed(4));
  saveSkyState(p,s.sky);
  p.set('keplerDays',s.familyDays['kepler-16'].toFixed(4));p.set('cygnusDays',s.familyDays['cygnus-x1'].toFixed(4));p.set('compareGalaxy',s.compareTo);
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
      const axes = part === 'bulge' ? [1.6, .72, .6] : part === 'halo' ? [1, 1, .84] : shape === 'elliptical' ? [1, .93, .88] : [1, 1, .96];
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

/** M31 has an independent old stellar disk, larger central population and broken dust/star-forming rings. */
function andromedaClouds():StellarCloud[]{
 const disk=cloud('disk',9_500,41),dust=cloud('dust',2_000,43),bulge=cloud('bulge',4_200,47),halo=cloud('halo',1_100,49),glow=cloud('disk',1_300,41);
 for(const population of [disk,dust,glow])for(let i=0;i<population.positions.length/3;i++){
  const n=i*31+4117,a=random(n)*Math.PI*2,u=random(n+1),ring=population.part==='dust'||i%3===0;
  const outer=i%7===0,r=ring?(outer?.78:.53)+Math.sin(a*2+.3)*.023+(u-.5)*.045:.035+.965*Math.pow(u,.75);
  const shifted=a+(ring?Math.sin(a*3)*.04:0);population.positions.set([r*Math.cos(shifted)+(ring?.055:0),r*Math.sin(shifted),(.012+.023*r)*(random(n+2)*2-1)],i*3);
  const gap=ring&&(a>.68&&a<.96||a>3.7&&a<4.02),b=(.47+random(n+3)*.5)*(gap?.22:1);
  population.colors.set((ring&&population.part!=='dust'?[.54,.73,1]:[1,.84,.67]).map(v=>v*b),i*3);
 }
 for(let i=0;i<bulge.positions.length;i++)bulge.positions[i]!*=1.3;
 glow.size=30;glow.opacity=.035;glow.mist=true;halo.opacity=.18;
 return [glow,disk,dust,bulge,halo];
}

/** NGC 6822: a diffuse older population and uneven young stellar/H II regions.
 * The observed morphology guides the layout; the depth and individual stars are illustrative.
 */
function barnardClouds(): StellarCloud[] {
  const older = cloud('population', 9_000, 53, 'elliptical');
  for (let i = 0; i < older.positions.length / 3; i++) {
    const n = i * 23 + 2903, u = random(n), a = random(n + 1) * Math.PI * 2, r = Math.pow(u, .68);
    const bar = i % 5 < 2;
    const x = r * Math.cos(a) * (bar ? .20 : .66), y = r * Math.sin(a) * (bar ? .72 : .94);
    older.positions.set([x + y * .17, y, (random(n + 2) * 2 - 1) * (bar ? .07 : .16) * Math.sqrt(1 - u)], i * 3);
    const brightness = .48 + random(n + 3) * .42;
    older.colors.set([.96 * brightness, .87 * brightness, .74 * brightness], i * 3);
  }
  older.size = 1.65; older.opacity = .48;
  const young = cloud('population', 2_700, 61, 'irregular');
  // Unequal associations follow the elongated stellar body, with stronger off-centre regions.
  const regions = [[-.19, .49, .13], [.13, .66, .09], [.23, .29, .12], [-.15, .03, .15], [.11, -.33, .11], [-.22, -.59, .07]] as const;
  for (let i = 0; i < young.positions.length / 3; i++) {
    const n = i * 29 + 5903, region = regions[i % regions.length]!, a = random(n) * Math.PI * 2;
    const r = region[2] * Math.pow(random(n + 1), .65), y = region[1] + r * Math.sin(a);
    young.positions.set([region[0] + r * Math.cos(a) + y * .17, y, (random(n + 2) * 2 - 1) * .09], i * 3);
    const brightness = .58 + random(n + 3) * .42;
    young.colors.set([.56 * brightness, .76 * brightness, brightness], i * 3);
  }
  young.size = 2.2; young.opacity = .62;
  const emission: StellarCloud = { part: 'population', positions: new Float32Array(270 * 3), colors: new Float32Array(270 * 3), size: 24, opacity: .018, mist: true };
  for (let i = 0; i < 270; i++) {
    emission.positions.set(young.positions.subarray(i * 30, i * 30 + 3), i * 3);
    emission.colors.set([.78, .29, .36], i * 3);
  }
  return [older, emission, young];
}

function clusterObjects(): GalacticObject[] {
  const detail = cloud('population', 9_500, 27, 'cluster');
  detail.size = 1.8; detail.opacity = .46;
  const locator: StellarCloud = { ...detail, positions: new Float32Array(160 * 3), colors: new Float32Array(160 * 3), size: 1.8, opacity: .48 };
  for (let i = 0; i < 160; i++) {
    const index = Math.floor(i * 9_500 / 160) * 3;
    for (let axis = 0; axis < 3; axis++) locator.positions[i * 3 + axis] = CLUSTER_LOCATION[axis]! + detail.positions[index + axis]! * CLUSTER_LOCATOR_SCALE;
    locator.colors.set(detail.colors.subarray(index, index + 3), i * 3);
  }
  return [
    { id: 'cluster-context', center: [-1.08, 0, 0], scale: .52, inclination: .35, clouds: [...spiralClouds(3, .30), locator] },
    { id: 'cluster-detail', center: [1.08, 0, 0], scale: .56, inclination: .35, clouds: [detail] },
  ];
}
export function galacticObjects(selected: GalacticCase,compareTo:'spiral'|'elliptical'|'irregular'='elliptical'): GalacticObject[] {
  if (isSkyCase(selected)||isStellarFamily(selected)) return [];
  if(selected==='galaxy-comparison')return (['milky-way',compareTo] as const).map((kind,index)=>{
    const original=galacticObjects(kind)[0]!;
    const clouds=original.clouds.map(c=>{
      const count=Math.ceil(c.positions.length/6),positions=new Float32Array(count*3),colors=new Float32Array(count*3);
      for(let i=0;i<count;i++){positions.set(c.positions.subarray(i*6,i*6+3),i*3);colors.set(c.colors.subarray(i*6,i*6+3),i*3);}
      return {...c,positions,colors,opacity:Math.min(1,c.opacity*1.35)};
    });
    return {...original,id:kind,center:[index?1.08:-1.08,0,0] as const,scale:GALAXY_PAIR_UNIT*GALAXY_DIAMETER_LY[kind]/GALAXY_DIAMETER_LY['milky-way'],clouds};
  });
  if (selected === 'local-group') return [
    { id: 'milky-way', center: [-.72, -.28, -.12], scale: .14, inclination: .30, clouds: spiralClouds(3, .30) },
    { id: 'andromeda', center: [.70, .23, .16], scale: .22, inclination: 1.1, clouds: andromedaClouds().map(c=>({...c,positions:c.positions.filter((_,i)=>Math.floor(i/3)%3===0),colors:c.colors.filter((_,i)=>Math.floor(i/3)%3===0)})) },
    { id: 'triangulum', center: [.28, -.64, .34], scale: .10, inclination: .7, clouds: spiralClouds(11, .19) },
    { id: 'dwarfs', center: [0, 0, 0], scale: 1, inclination: 0, clouds: [cloud('population', 24, 13, 'irregular')] },
  ];
  if (selected === 'star-cluster') return clusterObjects();
  if (selected === 'irregular') return [{ id: 'ngc-6822', center: [0, 0, 0], scale: 1, inclination: 0, clouds: barnardClouds() }];
  if (selected === 'spiral') return [{id:'spiral',center:[0,0,0],scale:1,inclination:0,clouds:andromedaClouds()}];
  if(selected==='elliptical'){
    const glow=cloud('population',4200,19,'elliptical');glow.size=120;glow.opacity=.0038;glow.mist=true;
    const stars=cloud('population',14500,17,'elliptical');stars.size=1.5;stars.opacity=.28;
    return [{id:selected,center:[0,0,0],scale:1,inclination:0,clouds:[stars,glow]}];
  }
  return [{ id: selected, center: [0, 0, 0], scale: 1, inclination: 0,
    clouds: spiralClouds(selected === 'milky-way' ? 3 : 41) }];
}
export function galacticPointCount(objects: readonly GalacticObject[]) { return objects.reduce((sum, o) => sum + o.clouds.reduce((n, c) => n + c.positions.length / 3, 0), 0); }
