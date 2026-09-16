import { ICE_BUBBLES, ICE_GRAINS, ICE_HEIGHT, grainAxis, grainBoundary, grainPolygon, iceSection, type IcePoint } from './iceGeometry.ts';
import type { phaseState } from './model.ts';

const NS = 'http://www.w3.org/2000/svg';
function node<K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attributes: Record<string, string | number> = {}) {
  const element = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  parent.append(element);
  return element;
}
const coords = (points: readonly IcePoint[]) => points.map(p => `${p.x.toFixed(3)} ${p.z.toFixed(3)}`).join('L');
function gradient(defs: Element, id: string, stops: [number, string, number][], attributes: Record<string, string> = {}) {
  const element = node(defs, 'linearGradient', { id, x1: '0', y1: '0', x2: '1', y2: '1', ...attributes });
  for (const [offset, color, opacity] of stops) node(element, 'stop', { offset, 'stop-color': color, 'stop-opacity': opacity });
}

/** All paths are created once. Scrubbing changes only a shared material-space
 * phase boundary, preserving each grain, trapped bubble and optical marking.
 * The layered highlights are illustrative optics, not ray-traced refraction. */
export function createIceRenderer(root: SVGGElement, water: SVGPathElement) {
  root.replaceChildren();
  root.setAttribute('aria-hidden', 'true');
  const defs = node(root, 'defs');
  const clip = node(defs, 'clipPath', { id: 'ice-growth-clip', clipPathUnits: 'userSpaceOnUse' });
  const clipShape = node(clip, 'path');
  gradient(defs, 'ice-volume', [[0, '#f4ffff', .86], [.22, '#c7e8e6', .40], [.53, '#9bbfc5', .36], [.82, '#d5eded', .57], [1, '#ecffff', .85]]);
  gradient(defs, 'ice-edge-light', [[0, '#ffffff', .75], [.055, '#ccf0f0', .04], [.92, '#d5e9e7', .01], [1, '#ffffff', .64]], { x2: '1', y2: '0' });
  gradient(defs, 'ice-window-light', [[0, '#ffffff', 0], [.39, '#ffffff', .04], [.5, '#ffffff', .30], [.63, '#ffffff', .04], [1, '#ffffff', 0]], { x2: '1', y2: '.12' });
  const material = node(root, 'g', { 'clip-path': 'url(#ice-growth-clip)' });
  node(material, 'rect', { width: 300, height: ICE_HEIGHT, fill: 'url(#ice-volume)' });
  const grains = node(material, 'g', { id: 'ice-grains' });
  ICE_GRAINS.forEach(grain => {
    const outline = `M${coords(grainPolygon(grain.id))}Z`;
    const grainClip = node(defs, 'clipPath', { id: `ice-grain-${grain.id}`, clipPathUnits: 'userSpaceOnUse' });
    node(grainClip, 'path', { d: outline });
    const lighter = grain.id % 3 !== 1;
    gradient(defs, `ice-facet-${grain.id}`, [[0, lighter ? '#f4ffff' : '#6c9caa', .01], [.47, lighter ? '#f9ffff' : '#527e8e', lighter ? .24 : .13], [1, '#d1ebec', .03]],
      { x1: grain.id % 2 ? '1' : '0', x2: grain.id % 2 ? '0' : '1', y2: '.65' });
    const region = node(grains, 'g', { 'data-grain': grain.id, 'clip-path': `url(#ice-grain-${grain.id})` });
    node(region, 'path', { d: outline, fill: `url(#ice-facet-${grain.id})` });
    // Broad, broken reflection of the same window through adjacent optical
    // domains. A weak offset gives transparency without bright mosaic tiles.
    const shift = (grain.id % 3 - 1) * 4;
    node(region, 'path', { d: `M${grain.seed - 24 + shift} -8Q${grain.seed + 25} 80 ${grain.seed + 6} 190L${grain.seed + 24} 190Q${grain.seed + 43} 80 ${grain.seed - 10 + shift} -8Z`, fill: 'url(#ice-window-light)' });
    // Sparse elongated internal growth markings, never a hexagonal snowflake.
    for (let j = 0; j < 4; j++) {
      const z = 12 + ((grain.id * 19 + j * 37) % 100);
      const x = grainAxis(grain, z) + (j - 1.5) * 5.2;
      const end = Math.min(ICE_HEIGHT, z + 31 + j * 11);
      node(region, 'path', { d: `M${x} ${z}Q${x + grain.tilt * 30 + 1} ${(z+end)/2} ${x + grain.tilt*(end-z)} ${end}`, fill: 'none', stroke: j % 2 ? '#628f9c' : '#f7ffff', 'stroke-width': j % 2 ? .38 : .65, opacity: j % 2 ? .14 : .27, 'stroke-linecap': 'round' });
    }
  });
  const boundaryGroup = node(material, 'g', { id: 'ice-grain-boundaries' });
  for (let i = 1; i < ICE_GRAINS.length; i++) {
    const points = Array.from({ length: 61 }, (_, k) => ({ x: grainBoundary(i, k / 60 * ICE_HEIGHT), z: k / 60 * ICE_HEIGHT }));
    const d = `M${coords(points)}`;
    node(boundaryGroup, 'path', { d, fill: 'none', stroke: '#5c91a0', 'stroke-width': 1.6, opacity: .18, 'stroke-linejoin': 'round' });
    node(boundaryGroup, 'path', { d, fill: 'none', stroke: '#f7ffff', 'stroke-width': .65, opacity: .78, transform: 'translate(.6 0)' });
  }
  const emphasized = node(material, 'g', { id: 'ice-boundary-guide', opacity: 0 });
  for (let i = 1; i < ICE_GRAINS.length; i++) {
    const points = Array.from({ length: 61 }, (_, k) => ({ x: grainBoundary(i, k / 60 * ICE_HEIGHT), z: k / 60 * ICE_HEIGHT }));
    node(emphasized, 'path', { d: `M${coords(points)}`, stroke: '#247477', 'stroke-width': 1.3, 'stroke-dasharray': '3 4', fill: 'none' });
  }
  const bubbles = node(material, 'g', { id: 'ice-air-inclusions' });
  for (const bubble of ICE_BUBBLES) {
    const group = node(bubbles, 'g', { 'data-bubble': bubble.id, transform: `translate(${bubble.x} ${bubble.z}) rotate(${(bubble.id % 5 - 2) * 4})` });
    node(group, 'ellipse', { rx: bubble.radius, ry: bubble.radius * bubble.stretch, fill: '#8ba8af', 'fill-opacity': .15, stroke: '#7396a2', 'stroke-opacity': .38, 'stroke-width': .5 });
    node(group, 'path', { d: `M${-.4*bubble.radius} ${-.76*bubble.radius*bubble.stretch}Q${-bubble.radius} ${-.2*bubble.radius*bubble.stretch} ${-.55*bubble.radius} ${.65*bubble.radius*bubble.stretch}`, fill: 'none', stroke: '#fff', 'stroke-opacity': .9, 'stroke-width': .7, 'stroke-linecap': 'round' });
  }
  node(material, 'rect', { width: 300, height: ICE_HEIGHT, fill: 'url(#ice-edge-light)' });
  node(material, 'path', { d: 'M0 1Q150 12 300 1M1 3Q150 16 299 3', fill: 'none', stroke: '#f9ffff', 'stroke-width': 1.25, opacity: .78 });
  const frontShade = node(root, 'path', { fill: 'none', stroke: '#416e7b', 'stroke-width': 3.5, opacity: .20, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  const frontGlint = node(root, 'path', { fill: 'none', stroke: '#efffff', 'stroke-width': 1.6, opacity: .90, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  return {
    update(state: ReturnType<typeof phaseState>, showBoundaries: boolean) {
      const section = iceSection(state.ice);
      root.setAttribute('transform', `translate(150 ${state.top})`);
      root.setAttribute('opacity', state.ice > 0 ? '1' : '0');
      root.dataset.iceFraction = state.ice.toFixed(4);
      const reverse = [...section.front].reverse();
      clipShape.setAttribute('d', `M0 0H300L${coords(reverse)}Z`);
      const line = `M${coords(section.front)}`;
      frontShade.setAttribute('d', line); frontGlint.setAttribute('d', line);
      // At the very start only short connected crystal fronts are visible.
      // Suppress the zero-depth portions of the contour with the solid clip.
      frontShade.setAttribute('clip-path', 'url(#ice-growth-clip)');
      frontGlint.setAttribute('clip-path', 'url(#ice-growth-clip)');
      emphasized.setAttribute('opacity', showBoundaries ? '.85' : '0');
      const waterLine = section.front.map(p => ({ x: p.x + 150, z: p.z + state.top }));
      water.setAttribute('d', `M${coords(waterLine)}L450 404H150Z`);
    },
  };
}
