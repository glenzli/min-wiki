import { mix, PHAGE_SCALE, type Camera, type Cycle, type Point } from './model.ts';

export const pointsPath = (points: Point[]) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('');
const cap = 'M0-61 35-40 35 25 0 49-35 25-35-40Z';
const capsule = '<rect x="170" y="270" width="640" height="250" rx="125"/>';
const tail = '<path d="M-8 52V130H8V52" fill="url(#v-tail)" stroke="#c0b4ca" stroke-width="1.4"/><path d="M0 52V142" stroke="#d7cde1" stroke-width="4"/><g stroke="#a99bb8" stroke-width="3">' + Array.from({ length: 12 }, (_, i) => `<path d="M-10 ${57 + i * 6}l20 2"/>`).join('') + '</g><path d="M-18 132 0 126 18 132 13 139-13 139Z" fill="#b8a9c6" stroke="#ddd3e6" stroke-width="1.2"/><path d="M-10 134-42 110-67 145M10 134 42 110 67 145M-7 135-23 147-36 148M7 135 23 147 36 148M0 134-28 119-47 135M0 134 28 119 47 135" fill="none" stroke="#c1b2d1" stroke-width="2.4" stroke-linecap="round"/>';

/** Shared by the live SVG and the static source-render checks. */
export function sceneMarkup(): string {
  const crowd = Array.from({ length: 90 }, (_, i) => {
    const x = 208 + ((i * 89) % 564), y = 294 + ((i * 61) % 203);
    return `<g transform="translate(${x} ${y}) rotate(${i * 37})" opacity="${.12 + (i % 4) * .04}"><ellipse rx="${3 + i % 4}" ry="2.5" fill="#bdc9a3"/><path d="M-6 5q5-3 9 1" fill="none" stroke="#839a80" stroke-width="1.5"/></g>`;
  }).join('');
  const subunits = Array.from({ length: 45 }, (_, i) => {
    const row = Math.floor(i / 5), x = -25 + (i % 5) * 12 + (row % 2) * 4, y = -47 + row * 10;
    return `<circle cx="${x}" cy="${y}" r="2.1" fill="#d2bfdc" opacity=".45"/>`;
  }).join('');
  const children = Array.from({ length: 6 }, (_, i) => `<g id="v-child-${i}"><g id="v-child-tail-${i}">${tail}</g><use id="v-child-head-${i}" href="#v-head"/></g><g id="v-subunits-${i}">${Array.from({ length: 9 }, (_, j) => `<circle id="v-unit-${i}-${j}" r="1.8" fill="#c6add8" stroke="#ead9ef" stroke-width=".5"/>`).join('')}</g>${i ? `<path id="v-copy-${i}" fill="none" stroke="#edc773" stroke-width="2" stroke-linecap="round" pathLength="1" stroke-dasharray="1"/>` : ''}`).join('');
  return `<defs>
  <radialGradient id="v-field" cx="48%" cy="44%" r="72%"><stop stop-color="#2f4a4b"/><stop offset=".7" stop-color="#192b34"/><stop offset="1" stop-color="#14232d"/></radialGradient>
  <linearGradient id="v-cell" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#77978a"/><stop offset=".38" stop-color="#466d66"/><stop offset="1" stop-color="#233f42"/></linearGradient>
  <linearGradient id="v-head-light" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#d2bdd6"/><stop offset=".4" stop-color="#8b709f"/><stop offset="1" stop-color="#473e60"/></linearGradient>
  <linearGradient id="v-tail"><stop stop-color="#594d70"/><stop offset=".43" stop-color="#c2b4ce"/><stop offset="1" stop-color="#58496c"/></linearGradient>
  <clipPath id="v-cap-clip"><path d="${cap}"/></clipPath>
  <clipPath id="v-cell-clip"><rect x="188" y="289" width="604" height="212" rx="106"/></clipPath>
  <mask id="v-breach" maskUnits="userSpaceOnUse" x="0" y="0" width="900" height="650"><rect width="900" height="650" fill="white"/><path id="v-breach-hole" fill="black"/></mask>
  <g id="v-head"><path d="${cap}" fill="url(#v-head-light)" stroke="#d6c5e0" stroke-width="1.6"/><path d="M0-61 0-10 35-40M0-10 35 25 0 49-35 25Z" fill="#59496f" opacity=".48"/><path d="M0-61-35-40 0-10-35 25" fill="#c9b5d1" opacity=".23"/><g clip-path="url(#v-cap-clip)">${subunits}<path d="M-35-40 35 25M35-40-35 25M0-61V49M-35 25 35 25M-35-40 35-40" stroke="#d8c7e2" stroke-width=".8" fill="none" opacity=".4"/></g><path d="M-7 49V56H7V49" fill="#c1aecf"/></g>
  </defs>
  <rect x="-400" y="-300" width="1800" height="1400" fill="url(#v-field)"/>
  <g opacity=".13" fill="#c2d5cc">${Array.from({ length: 35 }, (_, i) => `<circle cx="${30 + i * 173 % 850}" cy="${35 + i * 97 % 525}" r="${1 + i % 3}"/>`).join('')}</g>
  <g mask="url(#v-breach)">
    <g fill="url(#v-cell)" stroke="#87ad98" stroke-width="2">${capsule}</g>
    <g clip-path="url(#v-cell-clip)">${crowd}<path d="M328 402c-38-57 6-80 48-44s62 92 90 26 56-48 66-12-49 97-80 47 43-91 86-47 75 26 68-27 65-17 64 22-58 67-88 37" fill="none" stroke="#9dbda3" stroke-width="5" stroke-linecap="round" opacity=".4"/>
    <g fill="#c0c9a2" stroke="#78947e" stroke-width="1.5">${[[270,375],[362,468],[494,459],[652,479],[737,385],[561,309]].map(([x,y]) => `<g transform="translate(${x} ${y})"><ellipse rx="9" ry="5"/><path d="M-8-2q0-11 8-9t8 9"/><circle cy="-5" r="2" fill="#e2d9ae"/></g>`).join('')}</g></g>
    <rect x="173" y="273" width="634" height="244" rx="122" fill="none" stroke="#a2be9e" stroke-width="6"/>
    <rect x="180" y="280" width="620" height="230" rx="115" fill="none" stroke="#c4ba82" stroke-width="3" stroke-dasharray="2.6 3"/>
    <rect x="188" y="288" width="604" height="214" rx="107" fill="none" stroke="#87b3a8" stroke-width="6"/>
    <rect x="193" y="293" width="594" height="204" rx="102" fill="none" stroke="#c5d4b4" stroke-width="1" opacity=".45"/>
  </g>
  <path id="v-receptors" fill="none" stroke="#cfc4df" stroke-width="4" stroke-linecap="round"/>
  <g id="v-original"><use href="#v-head"/><g id="v-original-tail"></g></g>
  ${children}
  <path id="v-template" fill="none" stroke="#f1cf80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <g id="v-defense" fill="none" stroke="#bfe1d0" stroke-width="3"><circle cx="502" cy="342" r="19" stroke-dasharray="8 5"/><circle cx="459" cy="362" r="14" stroke-dasharray="6 4"/><path d="m487 336 9 8 17-18m-63 34 7 7 13-14"/></g>
  <g id="v-fragments" fill="none" stroke-linecap="round"><path id="v-fragment-a" d="M418 274q30-6 49 0" stroke="#adbea1" stroke-width="6"/><path id="v-fragment-b" d="M537 282q31 5 56-3" stroke="#c5bc85" stroke-width="3"/></g>`;
}

type Attributes = (id: string, attrs: Record<string, string | number>) => void;
export function drawCycle(state: Cycle, camera: Camera, set: Attributes): void {
  const { phage, contraction: c, offspring, opening } = state;
  set('virus-diagram', { viewBox: `${camera.x} ${camera.y} ${camera.width} ${camera.height}` });
  set('v-original', { transform: `translate(${phage.x} ${phage.y}) scale(${PHAGE_SCALE})` });
  const base = 135 - 35 * c, end = 130 - 35 * c;
  const ribs = Array.from({ length: 12 }, (_, i) => `<path d="M${-10 - c * 3} ${mix(57, end, i / 11)}h${20 + c * 6}"/>`).join('');
  set('v-original-tail', { 'data-markup': `<path d="M0 51V126" fill="none" stroke="#e0d5e7" stroke-width="4"/><path d="M${-8-c*3} 55V${end}H${8+c*3}V55" fill="url(#v-tail)" stroke="#bdb0cc" stroke-width="1.2"/><g stroke="#a99bb8" stroke-width="2.8">${ribs}</g><path d="M-19 ${base} 0 ${base-7} 19 ${base} 13 ${base+5}-13 ${base+5}Z" fill="#b8a9c6" stroke="#ded3e6" stroke-width="1.1"/><path d="M-10 ${base}-42 ${base-23}-67 ${base}M10 ${base} 42 ${base-23} 67 ${base}M-7 ${base}-23 ${base+12}-36 ${base+13}M7 ${base} 23 ${base+12} 36 ${base+13}M0 ${base}-28 ${base-16}-47 ${base}M0 ${base} 28 ${base-16} 47 ${base}" fill="none" stroke="#c1b2d1" stroke-width="2.3" stroke-linecap="round"/>` });
  set('v-template', { d: pointsPath(state.genome) });
  set('v-receptors', { d: state.host === 'mismatch' ? 'M440 273v-12m-10 0h20M520 273v-12m-10 0h20' : 'M440 273v-2h7M520 273v-2h-7', opacity: 1 - opening });
  set('v-defense', { opacity: state.defense, transform: `translate(480 350) scale(${.75 + state.defense * .25}) translate(-480 -350)` });
  // A widening irregular opening cuts the same three envelope layers. Nothing
  // is replaced by a separately drawn broken-cell state.
  const w = 120 * opening;
  set('v-breach-hole', { d: `M${510-w} 245L${510-w+6*opening} 271l${-8*opening} ${22*opening} ${12*opening} ${26*opening}L${510-w*.75} ${282+65*opening}Q510 ${298+74*opening} ${510+w*.8} ${281+64*opening}l${10*opening} ${-25*opening} ${-4*opening} ${-28*opening}L${510+w} 245Z`, opacity: opening ? 1 : 0 });
  set('v-fragments', { opacity: opening });
  set('v-fragment-a', { transform: `translate(${-28*opening} ${-23*opening}) rotate(${-12*opening} 445 274)` });
  set('v-fragment-b', { transform: `translate(${32*opening} ${-18*opening}) rotate(${17*opening} 561 282)` });
  for (const child of offspring) {
    set(`v-child-${child.id}`, { transform: `translate(${child.x} ${child.y}) rotate(${child.angle}) scale(${PHAGE_SCALE})` });
    set(`v-child-head-${child.id}`, { opacity: child.birth * child.birth });
    set(`v-child-tail-${child.id}`, { opacity: child.birth, transform: `translate(${(child.id % 2 ? 1 : -1) * 58 * (1-child.join)} ${-12*(1-child.join)})` });
    if (child.id) set(`v-copy-${child.id}`, { d: pointsPath(child.genome), 'stroke-dashoffset': 1 - child.birth, opacity: child.birth ? 1 : 0 });
    for (let j = 0; j < 9; j++) {
      const a = j * Math.PI * 2 / 9, assembly = Math.max(0, Math.min(1, child.birth * 1.5 - j * .06));
      const start = { x: child.x + (child.id % 2 ? 30 : -32), y: child.y + 39 };
      set(`v-unit-${child.id}-${j}`, { cx: mix(start.x, child.x + 12 * Math.cos(a), assembly), cy: mix(start.y, child.y - 3 + 17 * Math.sin(a), assembly), r: 1.7 * Math.min(1, child.birth * 5), opacity: (1 - child.release) * .85 });
    }
  }
}

export function mountScene(svg: SVGSVGElement) {
  svg.insertAdjacentHTML('beforeend', sceneMarkup());
  const nodes = new Map<string, Element>();
  nodes.set('virus-diagram', svg);
  for (const node of svg.querySelectorAll('[id]')) nodes.set(node.id, node);
  return (state: Cycle, camera: Camera) => drawCycle(state, camera, (id, attributes) => {
    const node = nodes.get(id)!;
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'data-markup') node.innerHTML = String(value);
      else node.setAttribute(key, String(value));
    }
  });
}
