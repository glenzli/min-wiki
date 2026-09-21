import type content from './content.json';
import { RIVER_HEAD, type Frame } from './model';
export type Copy = typeof content.en;
export const escape = (text: string): string => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const headY = (head: number): number => 410 - head * 260;
const land = 'M35 180 C110 153 180 141 250 165 S410 189 470 236 S592 277 646 309 Q674 334 705 329 Q730 316 752 314 L805 314 L805 410 L35 410 Z';
/** Static ground grains, landscape and sample sites are made once, never shuffled. */
export function sceneMarkup(copy: Copy, id: string): string {
  const e = escape;
  const grains = Array.from({ length: 132 }, (_, i) => {
    const x = 43 + (i % 22) * 36 + (Math.floor(i / 22) % 2) * 14;
    const y = 202 + Math.floor(i / 22) * 37 + Math.sin(i * 2.37) * 6;
    return `<ellipse data-grain="${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${10 + i % 5}" ry="${7 + i % 4}" transform="rotate(${i * 37 % 80 - 40} ${x} ${y})" fill="${['#c9b392', '#ac987e', '#dccbad', '#b9a88d'][i % 4]}" stroke="#847a65" stroke-width=".7"/>`;
  }).join('');
  return `<svg viewBox="0 0 840 450" role="img" aria-labelledby="${id}-title ${id}-desc">
    <title id="${id}-title">${e(copy.sceneTitle)}</title><desc id="${id}-desc">${e(copy.sceneDesc)}</desc>
    <defs>
      <linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#dcedec"/><stop offset="1" stop-color="#f4f2e2"/></linearGradient>
      <linearGradient id="${id}-soil" x2="0" y2="1"><stop stop-color="#a28b66"/><stop offset=".4" stop-color="#d1be9d"/><stop offset="1" stop-color="#bcb9a4"/></linearGradient>
      <linearGradient id="${id}-water" x2="0" y2="1"><stop stop-color="#74c7d7"/><stop offset="1" stop-color="#388eac"/></linearGradient>
      <clipPath id="${id}-land"><path d="${land}"/></clipPath>
      <marker id="${id}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#11627b" stroke-width="2"/></marker>
    </defs>
    <rect width="840" height="450" rx="22" fill="url(#${id}-sky)"/>
    <path d="M0 137 Q95 83 180 131 T345 112 T570 148 T840 130 V235 H0Z" fill="#98ada1" opacity=".2"/>
    <g fill="#698878" opacity=".35"><path d="M54 151 70 92 86 145 78 143 79 165H69V149Z"/><path d="M436 202 451 146 469 210 456 207 456 220H446V202Z"/></g>
    <path d="${land}" fill="url(#${id}-soil)"/>
    <g clip-path="url(#${id}-land)">
      <rect data-gw="saturation" x="35" y="275" width="770" height="135" fill="url(#${id}-water)" opacity=".86"/>
      <rect data-gw="tag-water" x="35" y="275" width="770" height="135" fill="#eebd54" opacity="0"/>
      <g opacity=".91">${grains}</g>
      <path d="M40 242Q225 215 412 259T810 362 M36 293Q220 271 400 315T810 389" fill="none" stroke="#8c806a" stroke-width="1.2" opacity=".4"/>
      <path data-gw="table" d="M35 275H805" fill="none" stroke="#146d85" stroke-width="3"/>
      <path data-gw="soil-tag" d="M205 175 Q245 168 287 188 L285 214 Q242 201 205 210Z" fill="#eabb52" opacity="0"/>
    </g>
    <path d="M35 180 C110 153 180 141 250 165 S410 189 470 236 S592 277 646 309" fill="none" stroke="#647b48" stroke-width="7" stroke-linecap="round"/>
    <g stroke="#799557" stroke-width="2" fill="none"><path d="m166 146-4-17m4 17 8-14m40 18-2-12m2 12 6-9m311 109-2-11m2 11 6-8"/></g>
    <path d="M35 410H805V440H35Z" fill="#7b817a"/><path d="m40 424 140 10 112-9 90 12 173-10 118 7 126-10" fill="none" stroke="#aeb2a8" opacity=".5"/>
    <path d="M648 311H805V326Q752 317 717 333Q674 351 648 311Z" fill="#7dc3d7" stroke="#4291ac" stroke-width="1"/>
    <path d="M661 316H699M722 317H749M763 316H790" stroke="#e4f6f7" stroke-width="2" stroke-linecap="round"/>
    <path d="M560 ${headY(RIVER_HEAD)}H811" fill="none" stroke="#678d9a" stroke-width="1.5" stroke-dasharray="4 5"/>
    <g data-gw="rain" stroke="#549cb1" stroke-width="2.5" stroke-linecap="round"><path d="m194 89-6 17m26-25-6 17m26-25-6 17m26-6-6 17m26-18-6 17m26-6-6 17"/></g>
    <g data-gw="infiltration" fill="none" stroke="#216d83" stroke-width="2" marker-end="url(#${id}-arrow)"><path d="M226 177v44"/><path d="M265 187v42"/></g>
    <path data-gw="recharge" d="M284 224v59" fill="none" stroke="#216d83" stroke-width="2.5" marker-end="url(#${id}-arrow)"/>
    <path data-gw="exchange" d="M475 349Q591 361 726 321" fill="none" stroke="#11627b" stroke-width="3" marker-end="url(#${id}-arrow)"/>
    <g><path d="M529 258V389H541V258" fill="#e4e3cf" stroke="#697876" stroke-width="2"/><path d="M532 352h6m-6 7h6m-6 7h6m-6 7h6m-6 7h6" stroke="#697876" stroke-width="2"/><path d="M527 260h24v-9h-15" fill="none" stroke="#546d66" stroke-width="5"/><path data-gw="pump" d="M535 347V274" fill="none" stroke="#216d83" stroke-width="2.5" marker-end="url(#${id}-arrow)"/></g>
    <g class="gw-map-label"><text x="192" y="61">${e(copy.rainLabel)}</text><text x="511" y="236">${e(copy.well)}</text><text x="709" y="282">${e(copy.river)}</text><text x="52" y="122">②</text><text x="55" y="429" class="gw-small-label">${e(copy.bedrock)}</text></g>
    <g class="gw-map-label gw-label-halo"><text x="67" y="206">${e(copy.soil)}</text><text x="60" y="390">${e(copy.aquifer)}</text><text data-gw="table-label" x="63" y="266">${e(copy.waterTable)}</text></g>
    <g class="gw-sample" data-marker="A" transform="translate(246 210)"><circle r="13"/><text y="5">A</text></g>
    <g class="gw-sample" data-marker="B" transform="translate(359 351)"><circle r="13"/><text y="5">B</text></g>
    <g class="gw-sample" data-marker="C" transform="translate(759 305)"><circle r="13"/><text y="5">C</text></g>
  </svg>`;
}
export function sceneValues(frame: Frame) {
  const y = headY(frame.head);
  const reverse = frame.flux.river < 0;
  const flowY = Math.min(401, Math.max(349, y + 14));
  return {
    y, height: 410 - y,
    exchangePath: reverse ? `M726 321Q591 ${flowY + 5} 475 ${flowY}` : `M475 ${flowY}Q591 ${flowY + 5} 726 321`,
    exchangeOpacity: Math.abs(frame.flux.river) < .0005 ? 0 : .35 + Math.min(.65, Math.abs(frame.flux.river)),
    soilTagOpacity: frame.soil > 0 ? .75 * frame.taggedSoil / frame.soil : 0,
    groundTagOpacity: frame.storage > 0 ? Math.min(.8, 4 * frame.taggedGround / frame.storage) : 0,
  };
}
export function mountSection(host: HTMLElement, copy: Copy, id: string): (frame: Frame) => void {
  host.innerHTML = sceneMarkup(copy, id);
  const find = (name: string) => host.querySelector<SVGElement>(`[data-gw="${name}"]`)!;
  const nodes = Object.fromEntries(['saturation', 'tag-water', 'table', 'table-label', 'rain', 'infiltration', 'recharge', 'exchange', 'soil-tag', 'pump'].map(key => [key, find(key)]));
  return (frame: Frame) => {
    const v = sceneValues(frame);
    for (const key of ['saturation', 'tag-water']) {
      nodes[key].setAttribute('y', String(v.y)); nodes[key].setAttribute('height', String(v.height));
    }
    nodes.table.setAttribute('d', `M35 ${v.y}H805`);
    nodes['table-label'].setAttribute('y', String(Math.min(377, v.y - 9)));
    nodes['tag-water'].setAttribute('opacity', String(v.groundTagOpacity));
    nodes['soil-tag'].setAttribute('opacity', String(v.soilTagOpacity));
    nodes.rain.setAttribute('opacity', frame.flux.infiltration + frame.flux.runoff > 0 ? '.8' : '0');
    nodes.infiltration.setAttribute('opacity', String(Math.min(1, frame.flux.infiltration * 1.7)));
    nodes.recharge.setAttribute('d', `M284 229V${Math.max(234, v.y + 10)}`);
    nodes.recharge.setAttribute('opacity', String(Math.min(1, frame.flux.recharge * 2)));
    nodes.exchange.setAttribute('d', v.exchangePath);
    nodes.exchange.setAttribute('opacity', String(v.exchangeOpacity));
    nodes.exchange.setAttribute('stroke-width', String(1.5 + Math.min(3, Math.abs(frame.flux.river) * 3)));
    nodes.pump.setAttribute('opacity', String(Math.min(1, frame.flux.pumped * 2)));
  };
}
