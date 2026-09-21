export type LeafKind = 'yellow' | 'red';
export type LeafLevel = 0 | 1 | 2 | 3 | 4;
export type PigmentLocation = 'chloroplast' | 'vacuole';
/** Each color has its own final compartment, even before its autumn pigment becomes visible. */
export function pigmentDestination(kind: LeafKind): PigmentLocation { return kind === 'red' ? 'vacuole' : 'chloroplast'; }
export function colorRoute(kind: LeafKind): readonly LeafLevel[] { return [0, 1, 2, kind === 'red' ? 4 : 3]; }
export function routeLevel(level: number, kind: LeafKind): LeafLevel { return level >= 3 ? colorRoute(kind)[3] : level as LeafLevel; }
export function compartmentPigments(p: Pigments, location: PigmentLocation): Pigments {
  return location === 'vacuole' ? { chlorophyll: 0, carotenoids: 0, anthocyanins: p.anthocyanins } : { chlorophyll: p.chlorophyll, carotenoids: p.carotenoids, anthocyanins: 0 };
}
export interface Pigments { chlorophyll: number; carotenoids: number; anthocyanins: number }
export const clamp = (x: number) => Math.min(1, Math.max(0, x));
export function smooth(a: number, b: number, x: number) { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); }

/** Qualitative teaching curves, not measured concentrations or a calendar model. */
export function pigmentsAt(season: number, kind: LeafKind): Pigments {
  const s = clamp(season);
  return {
    chlorophyll: 1 - .98 * smooth(.12, .92, s),
    carotenoids: .66 - .18 * smooth(.45, 1, s),
    anthocyanins: kind === 'red' ? .92 * smooth(.38, .94, s) : 0,
  };
}
export function mix(a: number[], b: number[], t: number) { return a.map((v, i) => v + (b[i] - v) * clamp(t)); }
/** Illustrative surface color; intentionally not a spectral reflectance solver. */
export function leafRGB(p: Pigments) {
  return mix(mix([232, 181, 40], [51, 125, 55], smooth(.06, .8, p.chlorophyll)), [183, 43, 49], p.anthocyanins);
}
export const rgb = (c: number[], alpha = 1) => `rgba(${c.map(Math.round).join(',')},${alpha})`;

/** Orthographic turn from the upper surface to an illustrative cross-section.
 * Surface and section share the same upper edge. Thickness is exaggerated for
 * teaching, not a measurement or an animation of tissue growth. */
export function leafSectionAt(position: number) {
  // Approach and inspect the epidermis before changing viewing direction.
  const turn = smooth(.60, 1, position), angle = turn * Math.PI / 2;
  const surfaceScale = Math.cos(angle), sectionScale = Math.sin(angle);
  const entry = SCALE_ENTRIES[0];
  const yaw = .5 * Math.sin(2*angle), ca=Math.cos(yaw), sa=Math.sin(yaw);
  const surfaceTransform = [ca,-sa*surfaceScale,sa,ca*surfaceScale,
    entry.x*(1-ca)-entry.y*sa,
    entry.y*(1-ca*surfaceScale)+entry.x*sa*surfaceScale+LEAF_SECTION.top*entry.size*sectionScale] as const;
  const sectionTransform = [ca,-sa*surfaceScale,0,sectionScale,0,0] as const;
  return {
    angle, surfaceScale, sectionScale,
    surfaceTransform, sectionTransform,
    contextOpacity: 1 - smooth(.24,.44,position),
    bladeOpacity: 1 - smooth(1,1.3,position),
    textureOpacity: smooth(.18,.44,position),
  };
}

export const LEAF_SECTION = { left: -217, right: 217, top: -153, bottom: 135 } as const;
export const SCALE_STOPS = [0, .5, 1, 2, 3] as const;
export const epidermisVisible = (position: number) => position >= .32 && position < .65;
/** Stable teaching contours; the vacuole fill, membrane and pigment clip share these points. */
export function cellEdge(a: number, rx: number, ry: number, seed: number, power = 1): [number, number] {
  const r = 1 + .065 * Math.sin(3*a+seed) + .04 * Math.cos(5*a-seed*.7);
  const ca=Math.cos(a), sa=Math.sin(a);
  return [rx*Math.sign(ca)*Math.abs(ca)**power*r+ry*.035*Math.sin(a*2+seed), ry*Math.sign(sa)*Math.abs(sa)**power*r];
}
export const VACUOLE = { x: 4, y: -2, rx: 115, ry: 87, seed: 2.6 } as const;
export function vacuolePoint(angle: number, radius = 1): [number, number] {
  const [x,y]=cellEdge(angle,VACUOLE.rx,VACUOLE.ry,VACUOLE.seed);
  return [VACUOLE.x+x*clamp(radius),VACUOLE.y+y*clamp(radius)];
}
export const epidermisBoundary: readonly (readonly [number, number])[] = [
  [-217,0],[217,0],[217,-174],[193,-191],[198,-222],[137,-246],
  [61,-238],[-24,-254],[-110,-243],[-148,-220],[-193,-226],[-217,-185],
];

/** Guided playback traverses the same continuous slider; this helper names the current scale. */
export const JOURNEY_DURATION = 26;
export function journeyAt(seconds: number, kind: LeafKind = 'yellow'): LeafLevel { return colorRoute(kind)[Math.min(3, Math.floor(journeyScale(seconds)))]; }

export interface ScaleEntry { x: number; y: number; size: number; angle?: number }
export interface ScaleCamera { x: number; y: number; magnification: number; angle: number }
/** Child coordinates live permanently inside their parent cutaway. */
export const SCALE_ENTRIES: readonly ScaleEntry[] = [
  { x: 78, y: -12, size: .18 },
  { x: -181 + 210 + Math.sin(8.1) * 5, y: 40 + Math.cos(5.4) * 4, size: .118 },
];
export function scaleCamera(position: number, destination: ScaleEntry): ScaleCamera {
  const entries = [...SCALE_ENTRIES, destination];
  const frames: Array<{ x: number; y: number; size: number; angle: number }> = [{ x: 0, y: 0, size: 1, angle: 0 }];
  for (const child of entries) {
    const parent = frames[frames.length - 1];
    frames.push({ x: parent.x + (child.x * Math.cos(parent.angle) - child.y * Math.sin(parent.angle)) * parent.size, y: parent.y + (child.x * Math.sin(parent.angle) + child.y * Math.cos(parent.angle)) * parent.size, size: parent.size * child.size, angle: parent.angle + (child.angle ?? 0) });
  }
  const scale = Math.max(0, Math.min(3, position)), lower = Math.min(2, Math.floor(scale));
  if (scale < 1) {
    const approach = smooth(0,.44,scale), section=leafSectionAt(scale);
    const yaw=.5*Math.sin(2*section.angle), sample=frames[1];
    return { x:(sample.x-110*Math.sin(yaw)*sample.size)*approach,
      y:(sample.y-110*section.surfaceScale*sample.size)*approach,
      angle:0, magnification:Math.exp(-Math.log(sample.size)*approach) };
  }
  const u = smooth(0, 1, scale - lower), a = frames[lower], b = frames[lower + 1];
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, angle: a.angle + (b.angle - a.angle) * u, magnification: Math.exp(-Math.log(a.size) * (1-u) - Math.log(b.size) * u) };
}
export const journeyScale = (seconds: number) => clamp(seconds / JOURNEY_DURATION) * 3;
