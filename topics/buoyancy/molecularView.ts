import type { Settings } from './model.ts';
import { buoyancy } from './model.ts';
import type { TankGeometry } from './tankScene.ts';
import { samplePressure, specimenSection, type PressureSample, type SectionPoint } from './pressure.ts';
import { t } from './i18n.ts';

type Result = ReturnType<typeof buoyancy>;
type Patch = { label: 'A' | 'B'; sample: PressureSample; wet: boolean };
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const number = (value: number) => Number(value.toFixed(3));
const text = (x: number, y: number, value: string, size = 12, color = '#52656a', anchor = 'middle') =>
  `<text x="${number(x)}" y="${number(y)}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${escape(value)}</text>`;
const pointPath = (points: readonly SectionPoint[]) => points.map((p, i) => `${i ? 'L' : 'M'}${number(p[0])} ${number(p[1])}`).join('') + 'Z';

// Prepare one stable, irregular, close-neighbor field for both windows. The
// minimum separation avoids accidental piles without introducing lattice rows.
const molecularSites: SectionPoint[] = (() => {
  const sites: SectionPoint[] = [];
  let seed = 724511;
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  for (let attempt = 0; attempt < 12000 && sites.length < 760; attempt++) {
    const point: SectionPoint = [-220 + random() * 440, -7.4 - random() * 220];
    if (sites.some(p => (p[0] - point[0]) ** 2 + (p[1] - point[1]) ** 2 < 7.4 ** 2)) continue;
    sites.push(point);
  }
  return sites;
})();

function contactPatches(state: Settings, g: TankGeometry, result: Result, points: SectionPoint[]): Patch[] {
  // The canonical pressure sampler owns face normals, equal-area sampling and
  // relative gauge pressure. A reference plane exposes dry faces for selection;
  // only the samples from the actual water plane can receive water action.
  const reference = Math.min(...points.map(p => p[1])) - 2;
  const all = samplePressure(points, reference, result.density);
  const wet = result.displaced > 0 ? samplePressure(points, g.water, result.density) : [];
  const boat = state.experiment === 'boat' && state.boat;
  const candidates = boat ? all.filter(s => s.point[0] < 365 && s.inward[0] > .65) : all;
  const source = candidates.length ? candidates : all;
  const sorted = [...source].sort((a, b) => a.point[1] - b.point[1] || Math.abs(a.point[0] - 365) - Math.abs(b.point[0] - 365));
  const top = sorted[0], bottomY = sorted.at(-1)!.point[1];
  const bottom = sorted.filter(s => Math.abs(s.point[1] - bottomY) < .001)
    .sort((a, b) => Math.abs(a.point[0] - 365) - Math.abs(b.point[0] - 365))[0];
  return [top, bottom].map((sample, i) => {
    const actual = wet.find(s => Math.abs(s.point[0] - sample.point[0]) < .001 && Math.abs(s.point[1] - sample.point[1]) < .001);
    // The macro arrow sampler omits depths below half a diagram unit for
    // legibility. That cutoff is not a dry boundary at molecular scale.
    const depth = result.displaced > 0 ? Math.max(0, sample.point[1] - g.water) : 0;
    return {
      label: i === 0 ? 'A' : 'B', wet: depth > 1e-7,
      sample: actual ?? { ...sample, depth, relativePressure: Math.max(0, result.density) * depth },
    };
  });
}

function magnification(patch: Patch, x: number, y: number, width: number, height: number, phase: number, bodyColor: string) {
  const body = { x: x + 9, y: y + 26, width: width - 18, height: height - 49 };
  const [nx, ny] = patch.sample.inward, tx = -ny, ty = nx;
  const alongX = Math.abs(nx) > .001 ? body.width / Math.abs(nx) : Infinity;
  const alongY = Math.abs(ny) > .001 ? body.height / Math.abs(ny) : Infinity;
  const normalSpan = Math.min(alongX, alongY);
  // Give the surrounding liquid more space than the cropped solid.
  const cx = body.x + body.width / 2 + nx * normalSpan * .13;
  const cy = body.y + body.height / 2 + ny * normalSpan * .13;
  const reach = Math.hypot(body.width, body.height);
  const project = (s: number, u: number): SectionPoint => [cx + tx * s + nx * u, cy + ty * s + ny * u];
  const water = [project(-reach, 0), project(reach, 0), project(reach, -reach), project(-reach, -reach)];
  const solid = [project(-reach, 0), project(reach, 0), project(reach, reach), project(-reach, reach)];
  const faceA = project(-reach, 0), faceB = project(reach, 0);
  const clip = `molecular-pane-${patch.label}`;
  const particles: string[] = [], interactions: string[] = [];
  if (patch.wet) {
    // Identical typical spacing and motion laws at both depths. The bounded,
    // irregular paths have no preferred upward direction or pressure input.
    // This is a supplied-phase drawing, not molecular dynamics or a clock.
    for (let i = 0; i < molecularSites.length; i++) {
      const [s0, u0] = molecularSites[i], seed = i * 2.399963;
      const s = s0 + 3.2 * (Math.sin(phase * Math.PI * 2 + seed) - Math.sin(seed))
        + .7 * (Math.sin(phase * Math.PI * 4 + seed * .47) - Math.sin(seed * .47));
      const u = u0 + 1.9 * (Math.cos(phase * Math.PI * 2 + seed * .83) - Math.cos(seed * .83));
      const base = project(s0, u0);
      if (base[0] < body.x - 7 || base[0] > body.x + body.width + 7 || base[1] < body.y - 7 || base[1] > body.y + body.height + 7) continue;
      const p = project(s, u);
      particles.push(`<circle class="molecular-particle" data-s="${number(s)}" data-u="${number(u)}" cx="${number(p[0])}" cy="${number(p[1])}" r="2.1" fill="#3f8193" fill-opacity=".76"/>`);
    }
    // Short-lived contact cues, without directed arrows or permanent bonds.
    // Their timing and strength do not encode the hydrostatic pressure change.
    for (let i = -1; i <= 1; i++) {
      const a = project(i * 20 - 2.6, -3.1), b = project(i * 20 + 2.6, -3.1);
      const opacity = .10 + .24 * (.5 + .5 * Math.sin(phase * Math.PI * 4 + i * 2.4));
      interactions.push(`<path class="molecular-contact-cue" d="M${a.join(' ')}L${b.join(' ')}" fill="none" stroke="#4d8796" stroke-width="1.3" stroke-linecap="round" opacity="${number(opacity)}"/>`);
    }
  }
  // A common mapping for equal-size patches, using the canonical diagram
  // depth (not metres). Keep the typical molecular motion independent of it.
  const length = Math.min(normalSpan * .72, patch.sample.relativePressure * .23);
  const arrowStart = project(0, -length * .7), arrowEnd = project(0, length * .3);
  const arrow = patch.wet && length > .1 ? `<path class="molecular-mean-gauge" data-relative-pressure="${patch.sample.relativePressure}" data-length="${length}" d="M${arrowStart.join(' ')}L${arrowEnd.join(' ')}" fill="none" stroke="#ffffff" stroke-opacity=".9" stroke-width="7"/>
    <path d="M${arrowStart.join(' ')}L${arrowEnd.join(' ')}" fill="none" stroke="#286d89" stroke-width="3.2" marker-end="url(#molecular-mean-head)"/>` : '';
  const status = patch.wet ? t('水中') : t('空气侧');
  const title = patch.label === 'A' ? t('上方位置') : t('下方位置');
  const tangentSpan = Math.min(Math.abs(tx) > .001 ? body.width / Math.abs(tx) : Infinity, Math.abs(ty) > .001 ? body.height / Math.abs(ty) : Infinity);
  const solidLabel = project(tangentSpan * .29, normalSpan * .20);
  return `<g class="molecular-window" data-label="${patch.label}" data-wet="${patch.wet}" data-source-x="${patch.sample.point[0]}" data-source-y="${patch.sample.point[1]}" data-depth="${patch.sample.depth}" data-nx="${nx}" data-ny="${ny}" data-interface-x="${cx}" data-interface-y="${cy}">
    <defs><clipPath id="${clip}"><rect x="${body.x}" y="${body.y}" width="${body.width}" height="${body.height}" rx="3"/></clipPath></defs>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="9" fill="#fcfcf8" stroke="#bac9c9" stroke-width="1.2"/>
    <circle cx="${x + 16}" cy="${y + 14}" r="8.5" fill="#eee8de"/>${text(x + 16, y + 18, patch.label, 12, '#62564b')}
    ${text(x + 31, y + 18, title, 12, '#43585d', 'start')}${text(x + width - 10, y + 18, status, 11.5, patch.wet ? '#3d7484' : '#7d817e', 'end')}
    <g clip-path="url(#${clip})"><path d="${pointPath(water)}" fill="${patch.wet ? '#e7f2f3' : '#ffffff'}"/>
      <path d="${pointPath(solid)}" fill="${bodyColor}"/><path d="M${faceA.join(' ')}L${faceB.join(' ')}" stroke="#8a8273" stroke-width="2"/>
      ${particles.join('')}${interactions.join('')}${arrow}${text(solidLabel[0], solidLabel[1] + 4, t('物体'), 11.5, '#5f665d')}</g>
    ${text(x + width / 2, y + height - 8, patch.wet ? t('比水面多的挤压') : t('此处无水作用'), 11.5, patch.wet ? '#286d89' : '#6b797a')}
  </g>`;
}

/** Draw the current specimen's simplified section and two traceable surface
 * patches. The caller owns state, animation, pause and disposal. Progress is
 * sampled deterministically, with no timers, listeners or model mutation. */
export function drawMolecularPressure(svg: SVGSVGElement, state: Settings, g: TankGeometry, result: Result, progress = 0): void {
  const rect = svg.parentElement?.getBoundingClientRect();
  const width = Math.max(280, rect?.width ?? 368), height = Math.max(250, rect?.height ?? 312);
  const topInset = width >= 1000 ? 60 : 0;
  const phase = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const contentWidth = Math.min(width - 24, 760), left = (width - contentWidth) / 2;
  const anchorWidth = Math.min(220, Math.max(100, contentWidth * .31));
  const rightWidth = contentWidth - anchorWidth - 22;
  const panelWidth = Math.min(380, rightWidth), panelX = left + anchorWidth + 22 + (rightWidth - panelWidth) / 2;
  const panelTop = 32 + topInset, panelGap = 12, panelHeight = (height - 80 - panelGap - panelTop) / 2;
  const points = specimenSection(state, g, result.flooded), patches = contactPatches(state, g, result, points);
  const minY = Math.min(g.water - 20, g.bottom - g.height - 20), maxY = Math.max(g.water + 20, g.bottom + 24);
  const scale = Math.min((anchorWidth - 20) / g.width, (height - 125 - topInset) / (maxY - minY));
  const anchorCenter = left + anchorWidth / 2, offsetY = 70 + topInset + (height - 125 - topInset - (maxY - minY) * scale) / 2 - minY * scale;
  const project = (p: SectionPoint): SectionPoint => [anchorCenter + (p[0] - 365) * scale, offsetY + p[1] * scale];
  const outline = pointPath(points.map(project)), water = project([365, g.water])[1];
  const waterLabelY = Math.min(water - 6, project([365, g.bottom - g.height])[1] - 16);
  const anchorBottom = Math.min(height - 67, project([365, maxY])[1]);
  const kind = state.experiment === 'boat' ? 'clay' : state.experiment === 'depth' ? 'stone' : state.object;
  const colors = { wood: ['#cfad7b', '#8c6e48'], stone: ['#aeb8aa', '#6b7e70'], steel: ['#bac8ca', '#667f87'], clay: ['#d49d82', '#956952'] }[kind];
  const boat = state.experiment === 'boat' && state.boat, thickness = 20 * 260 / g.width;
  const inner: SectionPoint[] = boat ? [[365 - g.width / 2 + thickness * .75, g.bottom - g.height], [365 - g.width * .392 + thickness * .7, g.bottom - thickness], [365 + g.width * .392 - thickness * .7, g.bottom - thickness], [365 + g.width / 2 - thickness * .75, g.bottom - g.height]] : [];
  const cargo = boat ? Array.from({ length: Math.max(0, Math.min(12, Math.round(state.cargo))) }, (_, i) => {
    const p = project([365 + (i % 4 - 1.5) * 22, g.bottom - thickness - 19 - Math.floor(i / 4) * 21]);
    return `<rect data-molecular-cargo="${i}" x="${p[0] - 9 * scale}" y="${p[1]}" width="${18 * scale}" height="${18 * scale}" rx="${2 * scale}" fill="#b59a72" stroke="#8c785a" stroke-width=".6"/>`;
  }).join('') : '';
  const leads = patches.map((patch, i) => {
    const p = project(patch.sample.point), endY = panelTop + i * (panelHeight + panelGap) + panelHeight / 2;
    return `<path class="molecular-leader" d="M${p.join(' ')}L${left + anchorWidth + 8} ${p[1]}L${panelX - 5} ${endY}" fill="none" stroke="#a3aaa2" stroke-width="1.1" stroke-dasharray="3 3"/>`;
  }).join('');
  const patchMarks = patches.map(patch => {
    const p = project(patch.sample.point), shift = patch.label === 'A' ? -12 : 17;
    return `<circle data-molecular-anchor="${patch.label}" cx="${p[0]}" cy="${p[1]}" r="3.8" fill="#fffdf8" stroke="#786b59" stroke-width="1.6"/>${text(p[0] + 10, p[1] + shift, patch.label, 12.5, '#625b50')}`;
  }).join('');
  const forceLength = Math.min(48, result.force * 5), forceX = left + 8;
  const net = result.force > 0 ? `<path data-molecular-net-force="${result.force}" d="M${forceX} ${anchorBottom}v-${forceLength}" fill="none" stroke="#25866b" stroke-width="3" marker-end="url(#molecular-net-head)"/>` : '';
  const cord = state.experiment === 'depth' ? `<path d="M${anchorCenter} ${65 + topInset}V${project([365, g.bottom - g.height])[1]}" fill="none" stroke="#7e8988" stroke-width="1.3"/>` : '';
  svg.innerHTML = `<title>${escape(t('同一物体的简化剖面'))}</title><defs>
    <linearGradient id="molecular-body" x2=".8" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient>
    <marker id="molecular-mean-head" markerWidth="4" markerHeight="4" refX="8" refY="5" viewBox="0 0 10 10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#286d89"/></marker>
    <marker id="molecular-net-head" markerWidth="3.5" markerHeight="3.5" refX="8" refY="5" viewBox="0 0 10 10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#25866b"/></marker>
    <clipPath id="molecular-specimen"><path d="${outline}"/></clipPath>
  </defs><rect width="${width}" height="${height}" fill="#f7f8f6"/>
  ${text(width / 2, 18 + topInset, t('省略各面共有的大气压'), 12, '#6b7978')}
  ${text(anchorCenter, 41 + topInset, t('同一物体'), 12.5, '#465b5e')}${text(anchorCenter, 57 + topInset, t('简化剖面'), 11.5, '#788581')}
  <rect x="${left}" y="${water}" width="${anchorWidth}" height="${Math.max(0, anchorBottom - water)}" fill="#dfedf0"/>
  <path d="M${left} ${water}H${left + anchorWidth}" fill="none" stroke="#79a4af" stroke-width="1.3"/>
  <path d="M${left + 3} ${water}V${waterLabelY + 4}" fill="none" stroke="#91afb6" stroke-width=".8"/>
  ${text(left + 5, waterLabelY, t('水面'), 11.5, '#5c818c', 'start')}${leads}${cord}
  <path data-molecular-specimen="${kind}" d="${outline}" fill="url(#molecular-body)" stroke="${colors[1]}" stroke-width="1.7" stroke-linejoin="round"/>
  ${kind === 'wood' ? `<g clip-path="url(#molecular-specimen)">${Array.from({ length: 8 }, (_, i) => `<path d="M${left} ${project([365, g.bottom - g.height + (i + .5) * g.height / 8])[1]}q${anchorWidth / 2} -3 ${anchorWidth} 0" fill="none" stroke="#7c603d" stroke-opacity=".25" stroke-width=".7"/>`).join('')}</g>` : ''}
  ${boat ? `<path data-molecular-cabin="${result.flooded ? 'flooded' : 'dry'}" d="${pointPath(inner.map(project))}" fill="${result.flooded ? '#dfedf0' : '#f7f8f6'}" stroke="${colors[1]}" stroke-width="1"/>` : ''}${cargo}${patchMarks}${net}
  ${text(forceX + 5, anchorBottom + 30, t('水的合力') + (result.force > 0 ? '' : ' 0 N'), 11.5, '#26775f', 'start')}
  ${magnification(patches[0], panelX, panelTop, panelWidth, panelHeight, phase, colors[0])}
  ${magnification(patches[1], panelX, panelTop + panelHeight + panelGap, panelWidth, panelHeight, phase, colors[0])}
  ${text(width / 2, height - 12, t('分子示意 · 非实际大小或轨迹'), 11.5, '#7b8682')}`;
}
