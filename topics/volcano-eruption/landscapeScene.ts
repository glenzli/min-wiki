import { landformMesh } from './landformMesh.ts';
import { STORAGE, FEEDERS, lens, dike, ribbon, type Point } from './magmaGeometry.ts';
import { landState, landSurface, type Aftermath, type Landform } from './projectModel.ts';
import { historyClasts, historyDeformedY, historyFlow, historyFrame, historyIntrusion, historyStorage, historyStorageContour, historyStorageDeform, historySurface } from './landscapeGeometry.ts';
import { sectionPoint, WORLD_SCALE, type XYZ } from './eruptionGeometry.ts';

const n = (x: number) => x.toFixed(2);
const seed = (i: number) => (Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1 + 1) % 1;
const profile = (kind: Landform, growth: number, erosion = 0, warp: (x: number) => number = () => 0) => Array.from({ length: 181 }, (_, i) => {
  const x = 50 + i * 5; return `${n(x)},${n(landSurface(x, kind, growth, erosion) - warp(x))}`;
}).join(' ');

/** Fixed deposits keep their identity as the landform grows, cools and weathers. */
export function landscapeMarkup(kind: Landform, progress: number, aftermath: Aftermath, section: number, vegetation?: number) {
  const state = landState(progress, aftermath), frame = historyFrame(progress, 'landscape', aftermath);
  const construction = kind === 'scoria' ? undefined : frame.construction;
  const warp = (x: number) => construction ? historyDeformedY((x - 500) * WORLD_SCALE, 0, 0, frame) / (.75 * WORLD_SCALE) : 0;
  const surface = (x: number) => landSurface(x, kind, state.growth, state.erosion) - warp(x);
  if (vegetation !== undefined) state.vegetation = vegetation;
  const crest = surface(500), outline = profile(kind, state.growth, state.erosion, warp);
  const footprint = `${outline} 950,526 50,526`;
  const layers = state.deposits.filter(d => d.growth > 0).map(d => {
    const g = (d.index + d.growth) / 18;
    const color = kind === 'scoria' ? ['#79544a', '#9b6c53', '#604743'][d.index % 3]
      : kind === 'shield' ? ['#4a5554', '#626968', '#7b7770'][d.index % 3]
      : ['#827368', '#5f6260', '#b89772'][d.index % 3];
    return `<polygon data-deposit="${d.index}" points="${profile(kind, g, state.erosion, warp)} 950,500 50,500" fill="${color}" stroke="#e5ceb233" stroke-width="1.2"/>`;
  }).reverse().join('');
  const particles = kind !== 'scoria' ? historyClasts(kind, frame).filter(clast => clast.visible && !(section > .5 && clast.landed && clast.position[2] > .02)).map(clast => {
    const [x, y, z] = clast.position;
    if (clast.landed && y < historySurface(x, z, kind, frame) - clast.radius) return '';
    return `<circle data-history-clast="${clast.index}" cx="${n(500 + x / WORLD_SCALE)}" cy="${n(426 - y / (.75 * WORLD_SCALE))}" r="${n(clast.radius / WORLD_SCALE)}" fill="${clast.heat > .4 ? '#bf683b' : '#4c4035'}"/>`;
  }).join('') : Array.from({ length: 84 }, (_, i) => {
    const birth = .06 + i / 84 * .48, age = (state.p - birth) / .072;
    if (age < 0) return '';
    const u = Math.min(1, age), side = i % 2 ? -1 : 1;
    const end = 500 + side * (35 + seed(i) * (kind === 'scoria' ? 134 : 160)) * (.25 + .75 * state.growth);
    const launchY = landSurface(500, kind, landState(birth).growth);
    const x = 500 + (end - 500) * u;
    const y = u === 1 ? surface(end) + seed(i + 123) * 17 : launchY + (surface(end) - launchY) * u - Math.sin(Math.PI * u) * (54 + seed(i + 11) * 94);
    return `<circle cx="${n(x)}" cy="${n(y)}" r="${n((age < 1 ? 1.4 : .65) + seed(i + 3) * (age < 1 ? 2 : .85))}" fill="${age < .7 ? '#ffc276' : '#53443d'}"/>`;
  }).join('');
  const texture = Array.from({ length: 380 }, (_, i) => {
    const x = 110 + seed(i + 100) * 780, y = surface(x) + seed(i + 300) * 46;
    return `<path d="M${n(x)} ${n(y)}l${n(2 + seed(i + 6) * 5)} -1" stroke="${i % 3 ? '#decba344' : '#1c302947'}" stroke-width="${n(.6 + seed(i + 9))}"/>`;
  }).join('');
  const gullies = Array.from({ length: 13 }, (_, i) => {
    const x = 337 + i * 27, y = surface(x);
    return `<path d="M${x} ${n(y)}q-11 17 2 33t-9 29" stroke="#303d34" fill="none" stroke-width="${2 + i % 3}" opacity="${n(state.erosion * .5)}"/>`;
  }).join('');
  const lava = kind === 'scoria' ? '' : Array.from({ length: 6 }, (_, i) => {
    const flow = historyFlow(i, kind, frame);
    if (!flow.visible) return '';
    const side = i % 2 ? -1 : 1;
    let path = '', pen = false;
    for (let row = 0; row <= 64; row++) {
      const at = (row * 11 + 5) * 3, x = flow.positions[at], y = flow.positions[at + 1], z = flow.positions[at + 2];
      const exposed = y >= historySurface(x, z, kind, frame) - .005;
      if (!exposed) { pen = false; continue; }
      path += `${pen ? 'L' : 'M'}${n(500 + side * Math.hypot(x, z) / WORLD_SCALE)} ${n(426 - y / (.75 * WORLD_SCALE))}`;
      pen = true;
    }
    if (!path) return '';
    const hot = flow.mobility > .001 && flow.heat > .08;
    return `<path data-history-flow="${i}" data-mobile="${hot}" d="${path}" stroke="${hot ? '#c56635' : '#453c35'}" stroke-width="${5 + i % 3}" fill="none" stroke-linecap="round"/>`;
  }).join('');
  // The labeled section compresses depth but consumes the same evolving body,
  // connected pockets and feeder material coordinates as the 3D projection.
  const worldCoordinates = (points: XYZ[]) => points.map(([x, y]) => `${n(500 + x / WORLD_SCALE * .85)},${n(426 - y / WORLD_SCALE * (y > 0 ? 4 / 3 : .65))}`).join(' ');
  const coordinates = (points: Point[]) => construction
    ? worldCoordinates(points.map(point => historyStorageDeform(sectionPoint(point, .06), frame)))
    : points.map(([x, y]) => `${n(500 + x * .85)},${n(crest + (y - 20) / 220 * (540 - crest))}`).join(' ');
  const underground = STORAGE.map((zone, index) => {
    const storage = construction ? historyStorage(index, frame) : undefined;
    const outer = storage ? worldCoordinates(historyStorageContour(index, frame)) : coordinates(lens(zone.x, zone.y, zone.w, zone.h, zone.phase));
    const inner = storage ? worldCoordinates(historyStorageContour(index, frame, true)) : coordinates(lens(zone.x, zone.y, zone.w * .78, zone.h * .55, zone.phase));
    return `<polygon data-storage-framework="${index}" points="${outer}" fill="#695042" stroke="#9c7653"/><polygon data-storage-fill="${n(storage?.fill ?? 1)}" points="${inner}" fill="${storage ? '#eea75b' : '#e9a159'}" opacity="${n((storage?.heat ?? state.activity) * .8)}"/>`;
  }).join('') + FEEDERS.map(points => `<polygon points="${coordinates(ribbon(points, 2.8))}" fill="${(construction?.heat ?? state.activity) > .1 ? '#d49652' : '#59453e'}"/>`).join('');
  let intrusion = '';
  if (construction) {
    const sheet = historyIntrusion(kind, frame);
    if (sheet.visible) {
      const point = (row: number, side: number): XYZ => sheet.positions.slice((row * 8 + side) * 3, (row * 8 + side) * 3 + 3) as XYZ;
      const rows = (sheet.positions.length / 3 - 2) / 8;
      const face = [...Array.from({ length: rows }, (_, i) => point(i, 0)), ...Array.from({ length: rows }, (_, i) => point(rows - i - 1, 3))];
      intrusion = `<polygon data-history-intrusion="${n(sheet.front)}" points="${worldCoordinates(face)}" fill="${construction.heat > .1 ? '#d49652' : '#59453e'}"/>`;
    }
  } else intrusion = `<polygon points="${coordinates(ribbon(dike(0, 20), 2.8))}" fill="${state.activity > .1 ? '#d49652' : '#59453e'}"/>`;
  const mesh = `<g opacity="${n(1 - section)}">${landformMesh(kind, state.growth, state.vegetation, state.erosion, state.p, state.cooling)}</g>`;
  const prior = state.erosion ? `<polyline points="${profile(kind, state.growth)}" fill="none" stroke="#f1ddbb" stroke-dasharray="6 7" opacity=".65"/>` : '';
  return `<g data-construction-front="${n(construction?.intrusionFront ?? 1)}" data-construction-uplift="${n(construction?.uplift ?? 0)}"><defs>
    <linearGradient id="land-sky" x2="0" y2="1"><stop stop-color="#9ebfc5"/><stop offset="1" stop-color="#f0d7af"/></linearGradient>
    <linearGradient id="land-slope" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#c6a784"/><stop offset=".42" stop-color="#877568"/><stop offset="1" stop-color="#3c514e"/></linearGradient>
    <linearGradient id="land-grass" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#bac67f"/><stop offset=".38" stop-color="#7e9657"/><stop offset="1" stop-color="#324f42"/></linearGradient>
    <linearGradient id="land-section" x2="0" y2="1"><stop stop-color="#b89b79"/><stop offset="1" stop-color="#514d46"/></linearGradient>
    <clipPath id="land-clip"><polygon points="${footprint}"/></clipPath>
  </defs>
  <rect x="-500" y="-100" width="2000" height="900" fill="url(#land-sky)"/>
  <circle cx="800" cy="124" r="43" fill="#fff0c8" opacity=".58"/>
  <path d="M-500 352Q-250 310 0 352Q130 279 252 333T490 320T730 343T1000 294Q1250 330 1500 294V670H-500Z" fill="#6e9292" opacity=".32"/>
  <path d="M-500 407Q-250 370 0 407Q180 345 310 394T590 389T830 376T1000 390Q1250 355 1500 390V670H-500Z" fill="#68867c" opacity=".36"/>
  <ellipse cx="518" cy="445" rx="${n((kind === 'shield' ? 440 : kind === 'scoria' ? 280 : 300) * (.22 + .78 * Math.sqrt(state.growth)))}" ry="${n((kind === 'shield' ? 440 : kind === 'scoria' ? 280 : 300) * (kind === 'shield' ? .30 : kind === 'composite' ? .4 : .5) * (.22 + .78 * Math.sqrt(state.growth)))}" fill="#324e4622"/>
  <polygon points="${footprint}" fill="url(#land-section)" opacity="${n(section)}"/>
  <g clip-path="url(#land-clip)" opacity="${n(section)}">
    <polygon points="${outline} 950,465 50,465" fill="url(#land-slope)"/>
    <polygon points="${outline} 950,465 50,465" fill="url(#land-grass)" opacity="${n(state.vegetation * (1 - section))}"/>
    ${texture}${gullies}
    <g opacity="${n(section)}">${layers}
      ${underground}${intrusion}
    </g>
  </g>
  ${mesh}
  <g opacity="${n(section)}">${lava}</g>${particles}${prior}
  <path d="M50 526H950" stroke="#596350" stroke-width="2" opacity="${n(section)}"/>
</g>`;
}
