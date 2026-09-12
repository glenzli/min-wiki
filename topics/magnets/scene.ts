import { magnetX, magnetEdge, type Motion, type Settings } from './model.ts';

export interface Scene {
  svg: SVGSVGElement; mover: SVGGElement; item: SVGGElement; itemShape: SVGGElement;
  impact: SVGGElement; trails: SVGPathElement; gap: SVGPathElement; itemShadow: SVGEllipseElement;
}
const magnet = (width: number, flipped = false) => {
  const half = width / 2, first = flipped ? 'blue' : 'red', second = flipped ? 'red' : 'blue';
  return `<ellipse cx="${half + 5}" cy="80" rx="${half + 14}" ry="12" fill="#293c37" opacity=".17" filter="url(#soft-shadow)"/>
  <path d="M0 12L11 0H${width + 10}L${width} 12Z" fill="url(#${first}-top)"/>
  <path d="M${half} 12L${half + 11} 0H${width + 10}L${width} 12Z" fill="url(#${second}-top)"/>
  <path d="M${width} 12L${width + 10} 0V62L${width} 76Z" fill="url(#${second}-side)"/>
  <rect y="12" width="${width}" height="64" rx="8" fill="url(#${second})"/>
  <path d="M8 12H${half}V76H8Q0 76 0 68V20Q0 12 8 12Z" fill="url(#${first})"/>
  <path d="M8 16H${width - 6}" stroke="#fff" opacity=".55" stroke-width="2"/>
  <path d="M7 72H${width - 4}" stroke="#203642" opacity=".18" stroke-width="2"/>
  <path d="M${half} 14V74" stroke="#fff" opacity=".36"/>
  <g fill="#fffdf4" font-size="28" font-weight="800" text-anchor="middle" font-family="system-ui,sans-serif">
  <text x="${half / 2}" y="56">${flipped ? 'S' : 'N'}</text><text x="${half * 1.5}" y="56">${flipped ? 'N' : 'S'}</text></g>
  <path d="M11 20V31M${width - 9} 63V68" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>`;
};
export function createScene(svg: SVGSVGElement): Scene {
  svg.innerHTML = `<defs>
  <linearGradient id="room" x2="0" y2="1"><stop stop-color="#e9f0e7"/><stop offset="1" stop-color="#faf1df"/></linearGradient>
  <linearGradient id="table" x2=".15" y2="1"><stop stop-color="#f3dec0"/><stop offset="1" stop-color="#d8b688"/></linearGradient>
  <linearGradient id="tray-edge" x2="0" y2="1"><stop stop-color="#cda67b"/><stop offset="1" stop-color="#a78462"/></linearGradient>
  <linearGradient id="felt" x2="0" y2="1"><stop stop-color="#f6f4e9"/><stop offset="1" stop-color="#e6e6d9"/></linearGradient>
  <linearGradient id="red" x2=".15" y2="1"><stop stop-color="#ec7770"/><stop offset=".45" stop-color="#d95353"/><stop offset="1" stop-color="#b43c42"/></linearGradient>
  <linearGradient id="blue" x2=".15" y2="1"><stop stop-color="#6caabd"/><stop offset=".5" stop-color="#46869e"/><stop offset="1" stop-color="#2f627e"/></linearGradient>
  <linearGradient id="red-top"><stop stop-color="#ffc0a1"/><stop offset="1" stop-color="#ef8077"/></linearGradient>
  <linearGradient id="blue-top"><stop stop-color="#aed8df"/><stop offset="1" stop-color="#75b0c1"/></linearGradient>
  <linearGradient id="red-side" x2="0" y2="1"><stop stop-color="#c55954"/><stop offset="1" stop-color="#893540"/></linearGradient>
  <linearGradient id="blue-side" x2="0" y2="1"><stop stop-color="#467f92"/><stop offset="1" stop-color="#254f65"/></linearGradient>
  <linearGradient id="steel" x2=".2" y2="1"><stop stop-color="#788c93"/><stop offset=".25" stop-color="#fcffff"/><stop offset=".47" stop-color="#9eafb3"/><stop offset=".7" stop-color="#e8f3f1"/><stop offset="1" stop-color="#657a84"/></linearGradient>
  <linearGradient id="copper" x2="1" y2=".7"><stop stop-color="#925242"/><stop offset=".23" stop-color="#eab993"/><stop offset=".5" stop-color="#c47d58"/><stop offset=".75" stop-color="#f3cda5"/><stop offset="1" stop-color="#a55d46"/></linearGradient>
  <linearGradient id="can"><stop stop-color="#869ba1"/><stop offset=".27" stop-color="#e9f1ef"/><stop offset=".55" stop-color="#fafcf6"/><stop offset=".8" stop-color="#b6c5c7"/><stop offset="1" stop-color="#788e96"/></linearGradient>
  <linearGradient id="wood" x2=".1" y2="1"><stop stop-color="#edc992"/><stop offset="1" stop-color="#bd8755"/></linearGradient>
  <radialGradient id="sunlight"><stop stop-color="#fff9d8" stop-opacity=".9"/><stop offset="1" stop-color="#fff9d8" stop-opacity="0"/></radialGradient>
  <filter id="soft-shadow" x="-40%" y="-150%" width="180%" height="400%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="background-blur"><feGaussianBlur stdDeviation="9"/></filter>
  <pattern id="linen" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 0H7M0 0V7" stroke="#81968a" stroke-opacity=".045" stroke-width=".7"/></pattern>
  </defs>
  <rect width="960" height="430" fill="url(#room)"/>
  <ellipse cx="206" cy="66" rx="420" ry="185" fill="url(#sunlight)"/>
  <g opacity=".35" filter="url(#background-blur)" fill="#739b74"><path d="M906 -40Q796 22 857 125Q874 63 906 -40"/><path d="M916 41Q826 30 790 89Q862 109 916 41"/><path d="M865 -20Q777 -35 759 26Q823 55 865 -20"/></g>
  <path d="M0 130L960 104V430H0Z" fill="url(#table)"/>
  <g fill="none" stroke="#bc9062" stroke-opacity=".12"><path d="M0 152Q331 126 960 155M0 364Q317 335 960 372M0 406Q492 376 960 399"/><path d="M23 386Q410 361 895 382M0 141Q331 117 960 144"/></g>
  <ellipse cx="480" cy="345" rx="428" ry="20" fill="#725b42" opacity=".15" filter="url(#soft-shadow)"/>
  <rect x="52" y="179" width="858" height="155" rx="26" fill="url(#tray-edge)"/>
  <rect x="52" y="156" width="858" height="162" rx="26" fill="#e9cba0"/>
  <rect x="67" y="166" width="828" height="137" rx="21" fill="url(#felt)" stroke="#c7b594" stroke-width="2"/>
  <rect x="67" y="166" width="828" height="137" rx="21" fill="url(#linen)"/>
  <path d="M79 305H883" stroke="#fff1cb" stroke-width="3" opacity=".65"/>
  <path d="M78 322H882" stroke="#9a7857" stroke-width="1" opacity=".5"/>
  <path d="M92 286H879" stroke="#b7beb0" stroke-width="2" opacity=".46"/>
  <g stroke="#ccad80" stroke-width="1" opacity=".5">${Array.from({length: 29}, (_,i)=>`<path d="M${105+i*26} 313v${i%5===0?10:5}"/>`).join('')}</g>
  <rect x="892" y="215" width="9" height="73" rx="4" fill="#bb9061"/><path d="M894 218v62" stroke="#f4d6a7" stroke-width="2"/>
  <path id="gap-line" stroke="#408c83" stroke-width="2" stroke-dasharray="4 8" opacity="0"/>
  <ellipse id="item-shadow" cy="286" rx="47" ry="8" fill="#3e4f43" opacity=".18" filter="url(#soft-shadow)"/>
  <path id="motion-trails" fill="none" stroke="#377e80" stroke-linecap="round" stroke-width="3" opacity="0"/>
  <g id="mover" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-orientation="horizontal">
  <rect class="focus-ring" x="-11" y="-10" width="191" height="102" rx="18" fill="none" stroke="#b77522" stroke-width="3"/>
  ${magnet(160)}<rect x="-15" y="-15" width="200" height="120" fill="transparent"/>
  </g>
  <g id="item"><g id="item-shape"></g></g>
  <g id="contact-glint" fill="none" stroke="#fffdf0" stroke-width="4" stroke-linecap="round" opacity="0"><path d="M0 -8V-23M-10 -4L-19 -14M10 -4L19 -14"/><circle cy="17" r="11" stroke-width="2"/></g>
  <g fill="none" stroke="#917c60" stroke-width="2" stroke-linecap="round" opacity=".55"><path d="M196 360H302M196 360L204 354M196 360L204 366M302 360L294 354M302 360L294 366"/><circle cx="249" cy="360" r="8" fill="#f6e9d3"/></g>`;
  const get = <T extends SVGElement>(id: string) => svg.querySelector<T>(`#${id}`)!;
  return { svg, mover: get('mover'), item: get('item'), itemShape: get('item-shape'), impact: get('contact-glint'), trails: get('motion-trails'), gap: get('gap-line'), itemShadow: get('item-shadow') };
}
export function drawObject(scene: Scene, settings: Settings) {
  scene.itemShape.innerHTML = settings.kind === 'magnet' ? magnet(140, settings.flipped)
    : settings.kind === 'iron' ? `<g transform="translate(0 20)"><path d="M24 8H73C102 8 102 48 73 48H19C-4 48 -4 17 19 17H70C86 17 86 38 70 38H25" fill="none" stroke="#687c83" stroke-width="8" stroke-linecap="round"/><path d="M24 7H73C102 7 102 47 73 47H19C-4 47 -4 16 19 16H70C86 16 86 37 70 37H25" fill="none" stroke="url(#steel)" stroke-width="6" stroke-linecap="round"/><path d="M26 5H70M20 45H68" stroke="#fff" stroke-width="1.5" opacity=".8"/></g>`
    : settings.kind === 'copper' ? `<path d="M0 18L95 8L116 66L20 79Z" fill="#92503b"/><path d="M0 14L95 4L116 62L20 75Z" fill="url(#copper)" stroke="#bc7956"/><path d="M4 15L93 7M21 72L111 60" stroke="#ffdcbb" stroke-width="2" opacity=".7"/><g stroke="#985c42" opacity=".17">${Array.from({length:13},(_,i)=>`<path d="M${7+i*6} 19l17 43"/>`).join('')}</g>`
    : settings.kind === 'aluminum' ? `<rect x="8" y="-30" width="76" height="102" rx="15" fill="url(#can)" stroke="#8c9ea0"/><ellipse cx="46" cy="-27" rx="36" ry="10" fill="#d6e0dd" stroke="#91a4a6"/><ellipse cx="46" cy="-27" rx="29" ry="6" fill="#b9c8c9"/><path d="M42 -30q18 -3 11 6h-14Z" fill="#edf4f0" stroke="#95a7a9" stroke-width="2"/><path d="M13 62Q45 71 79 62" fill="none" stroke="#f4faf6" stroke-width="2"/><path d="M10 -4Q46 5 82 -4V45Q46 54 10 45Z" fill="#5a958a" opacity=".88"/><path d="M40 29Q30 6 59 8Q57 28 40 29ZM40 29L51 15" fill="#d5e6bd" stroke="#e6f1d2"/><path d="M20 -16V56" stroke="#fff" stroke-width="5" opacity=".45"/>`
    : `<path d="M0 8L18 -7H107L88 8Z" fill="#f1d6a8"/><path d="M88 8L107 -7V59L88 76Z" fill="#ae7b4f"/><rect y="8" width="89" height="68" rx="5" fill="url(#wood)"/><g fill="none" stroke="#ae7d4c" stroke-width="1.4" opacity=".6"><path d="M5 22Q31 14 83 23M4 34Q45 25 83 33M5 61Q32 72 83 62M7 49Q23 45 27 49T80 49"/><ellipse cx="55" cy="46" rx="19" ry="9"/><ellipse cx="55" cy="46" rx="11" ry="4"/><path d="M20 -3Q60 4 97 -3"/></g><path d="M5 12H84" stroke="#ffe3b9" stroke-width="2"/>`;
  scene.itemShadow.setAttribute('rx', settings.kind === 'magnet' ? '0' : settings.kind === 'copper' ? '63' : '48');
}
export function renderScene(scene: Scene, settings: Settings, motion: Motion, reduced: boolean) {
  const x = magnetX(settings.near), contact = magnetEdge(settings.near);
  scene.mover.setAttribute('transform', `translate(${x.toFixed(2)} 207)`);
  scene.item.setAttribute('transform', `translate(${motion.x.toFixed(2)} 207)`);
  scene.item.dataset.phase = motion.phase;
  scene.item.dataset.position = motion.x.toFixed(2);
  scene.itemShadow.setAttribute('cx', String(motion.x + 50));
  scene.impact.setAttribute('transform', `translate(${contact + 2} 226)`);
  scene.impact.setAttribute('opacity', String(reduced ? 0 : motion.impact));
  const speed = reduced ? 0 : Math.min(1, Math.abs(motion.velocity) / 220);
  const trailX = motion.velocity > 0 ? motion.x - 10 : motion.x + (settings.kind === 'magnet' ? 160 : 110);
  const d = motion.velocity > 0 ? -1 : 1;
  scene.trails.setAttribute('d', `M${trailX} 242h${d * 25}M${trailX + d * 8} 255h${d * 36}M${trailX} 269h${d * 20}`);
  scene.trails.setAttribute('opacity', String(speed * .5));
  scene.gap.setAttribute('d', `M${contact + 20} 193H${motion.x - 7}`);
  scene.gap.setAttribute('opacity', motion.phase === 'repelled' && motion.x > contact + 35 ? '.5' : '0');
}
