import { landformMesh } from './landformMesh.ts';
import { STORAGE, FEEDERS, lens, dike, ribbon, type Point } from './magmaGeometry.ts';
import { landState, landSurface, type Aftermath, type Landform } from './projectModel.ts';

const n = (x: number) => x.toFixed(2);
const seed = (i: number) => (Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1 + 1) % 1;
const profile = (kind: Landform, growth: number, erosion = 0) => Array.from({ length: 181 }, (_, i) => {
  const x = 50 + i * 5; return `${n(x)},${n(landSurface(x, kind, growth, erosion))}`;
}).join(' ');

/** Fixed deposits keep their identity as the landform grows, cools and weathers. */
export function landscapeMarkup(kind: Landform, progress: number, aftermath: Aftermath, section: number, vegetation?: number) {
  const state = landState(progress, aftermath), surface = (x: number) => landSurface(x, kind, state.growth, state.erosion);
  if (vegetation !== undefined) state.vegetation = vegetation;
  const crest = surface(500), outline = profile(kind, state.growth, state.erosion);
  const footprint = `${outline} 950,526 50,526`;
  const layers = state.deposits.filter(d => d.growth > 0).map(d => {
    const g = (d.index + d.growth) / 18;
    const color = kind === 'scoria' ? ['#79544a', '#9b6c53', '#604743'][d.index % 3]
      : kind === 'shield' ? ['#4a5554', '#626968', '#7b7770'][d.index % 3]
      : ['#827368', '#5f6260', '#b89772'][d.index % 3];
    return `<polygon data-deposit="${d.index}" points="${profile(kind, g, state.erosion)} 950,500 50,500" fill="${color}" stroke="#e5ceb233" stroke-width="1.2"/>`;
  }).reverse().join('');
  const particles = Array.from({ length: 84 }, (_, i) => {
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
    const extent = Math.max(0, Math.min(1, (state.p - .08 - i * .065) / .10));
    if (!extent) return '';
    const side = i % 2 ? -1 : 1;
    const points = Array.from({ length: 35 }, (_, j) => { const x = 500 + side * extent * j / 34 * (kind === 'shield' ? 305 : 215); return `${n(x)},${n(surface(x) - 2 - i % 3)}`; }).join(' ');
    return `<polyline points="${points}" stroke="${state.cooling > .5 ? '#394b45' : i < 4 ? '#a8492e' : '#f3a149'}" stroke-width="${5 + i % 3}" fill="none"/>`;
  }).join('');
  const coordinates = (points: Point[]) => points.map(([x, y]) => `${n(500 + x * .85)},${n(crest + (y - 20) / 220 * (540 - crest))}`).join(' ');
  const underground = STORAGE.map(zone => `<polygon points="${coordinates(lens(zone.x, zone.y, zone.w, zone.h, zone.phase))}" fill="#695042" stroke="#9c7653"/><polygon points="${coordinates(lens(zone.x, zone.y, zone.w * .78, zone.h * .55, zone.phase))}" fill="#e9a159" opacity="${n(state.activity * .8)}"/>`).join('') + [...FEEDERS, dike(0, 20)].map(points => `<polygon points="${coordinates(ribbon(points, 2.8))}" fill="${state.activity > .1 ? '#d49652' : '#59453e'}"/>`).join('');
  const mesh = `<g opacity="${n(1 - section)}">${landformMesh(kind, state.growth, state.vegetation, state.erosion, state.p, state.cooling)}</g>`;
  const prior = state.erosion ? `<polyline points="${profile(kind, state.growth)}" fill="none" stroke="#f1ddbb" stroke-dasharray="6 7" opacity=".65"/>` : '';
  return `<defs>
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
      ${underground}
    </g>
  </g>
  ${mesh}
  <g opacity="${n(section)}">${lava}</g>${kind !== 'shield' ? particles : ''}${prior}
  <path d="M50 526H950" stroke="#596350" stroke-width="2" opacity="${n(section)}"/>
`;
}
