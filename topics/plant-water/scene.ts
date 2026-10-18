import { create2DMotion } from '@glenzli/wiki-reader/animation2d';
import { waterAt, WATER_ROUTE, LEAF_WATER_ROUTE } from './model.ts';

type Route = readonly (readonly [number, number, number])[];
const routePath = (route: Route) => route.map(([, x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
const background = `<defs>
  <linearGradient id="water-sky" x2="0" y2="1"><stop stop-color="#e8eee2"/><stop offset="1" stop-color="#f7f5e5"/></linearGradient>
  <linearGradient id="water-soil" x2="0" y2="1"><stop stop-color="#d0b28d"/><stop offset="1" stop-color="#a8825d"/></linearGradient>
  <linearGradient id="water-blade" x2="1" y2="1"><stop stop-color="#a0bf72"/><stop offset=".5" stop-color="#6c9a54"/><stop offset="1" stop-color="#3f7447"/></linearGradient>
  <linearGradient id="water-stem"><stop stop-color="#517e49"/><stop offset=".38" stop-color="#87a969"/><stop offset=".7" stop-color="#6a9255"/><stop offset="1" stop-color="#456f41"/></linearGradient>
  <linearGradient id="water-root"><stop stop-color="#e8d3ac"/><stop offset=".5" stop-color="#f5e9ca"/><stop offset="1" stop-color="#c5ae86"/></linearGradient>
  <linearGradient id="water-cell" x2="1" y2="1"><stop stop-color="#edf1d8"/><stop offset="1" stop-color="#cfdfb5"/></linearGradient>
  <linearGradient id="water-detail" x2="0" y2="1"><stop stop-color="#f7f8e9"/><stop offset="1" stop-color="#eaf0df"/></linearGradient>
  <clipPath id="water-section-clip"><path d="M505 249Q610 241 704 250L704 370H505Z"/></clipPath>
</defs><rect width="760" height="530" fill="url(#water-sky)"/><circle cx="656" cy="87" r="30" fill="#e8ce8f" opacity=".7"/>`;

const soilDetail = Array.from({ length: 170 }, (_, i) => `<ellipse cx="${(i * 137.3) % 760}" cy="${376 + (i * 43.71) % 152}" rx="${.7 + i % 4}" ry="${.5 + i % 3 * .5}" fill="${i % 2 ? '#715d43' : '#ead4ad'}" opacity=".25"/>`).join('');
const rootHairs = Array.from({ length: 25 }, (_, i) => {
  const u = i / 24, x = 375 - u * 111, y = 366 + u * 73;
  return `<path d="M${x} ${y}q-8 1 -17 ${i % 2 ? 10 : -9}M${750 - x} ${y + 5}q10 1 16 12"/>`;
}).join('');
const veins = Array.from({ length: 7 }, (_, i) => {
  const u = (i + 1) / 9, x = 375 + 88 * u, y = 178 - 40 * u;
  const lx = 375 - 88 * u, ly = 245 - 55 * u;
  return `<path d="M${x} ${y}Q${x + 3} ${y - 13} ${x + 3 - 5 * u} ${y - 25 + u * 8}M${x} ${y}Q${x + 10} ${y + 2} ${x + 17 - 4 * u} ${y + 10}M${lx} ${ly}Q${lx - 4} ${ly - 12} ${lx - 4 - 6 * u} ${ly - 21}M${lx} ${ly}Q${lx - 11} ${ly + 1} ${lx - 18} ${ly + 6 - u * 9}"/>`;
}).join('');

function plantArt() {
  return `<rect y="362" width="760" height="168" fill="url(#water-soil)"/>${soilDetail}
  <path d="M0 361Q200 354 380 363T760 361" stroke="#93a978" stroke-width="9" fill="none"/>
  <g stroke="#e3cfaa" stroke-width="1.2" stroke-linecap="round" fill="none">${rootHairs}</g>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M375 364C330 398 309 418 260 440M375 364Q404 402 457 451M375 364Q370 426 369 478" stroke="#b79d74" stroke-width="11"/>
    <path d="M375 364C330 398 309 418 260 440M375 364Q404 402 457 451M375 364Q370 426 369 478" stroke="url(#water-root)" stroke-width="7"/>
    <path d="M350 387Q319 386 289 386M411 415Q440 413 462 407M365 438Q343 446 328 455M317 413Q297 426 288 451M433 433Q440 456 448 465" stroke="#ead9b5" stroke-width="3.5"/>
  </g>
  <path d="M363 364Q363 264 365 174Q366 150 375 140Q386 153 386 177L387 364Z" fill="url(#water-stem)" stroke="#557e48" stroke-width="1"/>
  <path d="M370 357Q369 260 371 168M381 353Q382 258 380 166" stroke="#b4c68a" stroke-width="1.2" fill="none" opacity=".65"/>
  <path d="M375 245C326 257 269 236 258 169C304 160 355 188 375 245ZM375 178C390 126 445 102 492 118C483 166 431 195 375 178Z" fill="url(#water-blade)" stroke="#507b45" stroke-width="1"/>
  <path d="M375 245Q333 215 287 190M375 178Q422 157 463 138" stroke="#bdce8a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <g stroke="#d0dca6" stroke-width=".8" opacity=".6" fill="none">${veins}</g>
  <path d="M374 244Q326 218 261 171M376 178Q434 150 490 119" stroke="#f2edbf" stroke-width=".65" fill="none" opacity=".3"/>`;
}

function sectionCell(x: number, y: number, rx: number, ry: number, seed: number) {
  const shape = `M${x - rx} ${y}C${x - rx - 2} ${y - ry * .72} ${x - rx * .3} ${y - ry - 3} ${x + rx * .25} ${y - ry}C${x + rx} ${y - ry} ${x + rx + 2} ${y - ry * .25} ${x + rx} ${y + ry * .2}C${x + rx * .8} ${y + ry + 2} ${x - rx * .35} ${y + ry} ${x - rx * .7} ${y + ry * .55}Q${x - rx} ${y + ry * .35} ${x - rx} ${y}Z`;
  const plastids = Array.from({ length: 5 }, (_, i) => {
    const a = i * Math.PI * 2 / 5 + seed;
    const px = x + Math.cos(a) * rx * .71, py = y + Math.sin(a) * ry * .69;
    return `<ellipse cx="${px}" cy="${py}" rx="2.8" ry="1.6" transform="rotate(${a * 180 / Math.PI + 90} ${px} ${py})" fill="#6e9858" stroke="#557c46" stroke-width=".35"/>`;
  }).join('');
  return `<path d="${shape}" fill="url(#water-cell)" stroke="#92a97b" stroke-width=".85"/><ellipse cx="${x + 1}" cy="${y}" rx="${rx * .5}" ry="${ry * .51}" fill="#f3f7e9" stroke="#c2d0ad" stroke-width=".4"/>${plastids}`;
}

function detailArt() {
  const epidermis = Array.from({ length: 8 }, (_, i) => `<path d="M${508 + i * 24} 250q10 -3 23 0v10q-12 3 -23 0Z" fill="#edf1dc" stroke="#a2b58e" stroke-width=".65"/>`).join('');
  const palisade = [[580,280,10,17],[604,278,10,18],[628,280,11,19],[654,280,11,18],[680,280,10,17]].map(([x,y,rx,ry],i) => sectionCell(x,y,rx,ry,i)).join('');
  const spongy = [[542,319,21,13],[590,306,16,10],[644,315,20,13],[687,324,17,12],[535,349,19,11],[578,352,17,10],[662,349,20,12],[701,352,15,10]].map(([x,y,rx,ry],i) => sectionCell(x,y,rx,ry,i*.7)).join('');
  return `<g id="leaf-section">
    <path d="M493 238Q610 227 716 238L716 437Q606 445 493 437Z" fill="#fbfaed" stroke="#b5c3a3" stroke-width="1.1"/>
    <path d="M505 249Q610 241 704 250L704 370H505Z" fill="url(#water-detail)"/>
    <g clip-path="url(#water-section-clip)">
      <path d="M505 247Q610 240 704 248" stroke="#b6c89b" stroke-width="5" fill="none"/>
      ${epidermis}${palisade}${spongy}
      <path d="M512 275H545" stroke="#7aa69a" stroke-width="19" stroke-linecap="round"/>
      <path d="M512 275H545" stroke="#c5e1d6" stroke-width="11" stroke-linecap="round"/>
      <path d="M512 271H545M512 279H545" stroke="#6f9b90" stroke-width=".7"/>
      ${Array.from({length:5},(_,i)=>`<path d="M${516+i*6} 267v16" stroke="#8db5a7" stroke-width="1.3"/>`).join('')}
      <path id="wet-wall" d="M558 309Q568 317 561 327" fill="none" stroke="#4d9fae" stroke-width="2" stroke-linecap="round" opacity=".3"/>
    </g>
    <path d="M505 370H587M641 370H704" stroke="#acbf96" stroke-width="14"/>
    <path d="M505 366H585M643 366H704" stroke="#f0f3dd" stroke-width="1.5"/>
    <path d="M587 370C587 358 597 353 603 361Q598 370 603 381C594 388 585 381 587 370ZM641 370C641 358 631 353 625 361Q630 370 625 381C634 388 643 381 641 370Z" fill="#95b47d" stroke="#6c8c58" stroke-width="1.1"/>
    <path d="M602 361Q599 370 603 380M626 361Q630 370 625 380" stroke="#dbe8c2" stroke-width="1.4" fill="none"/>
    <path d="${routePath(LEAF_WATER_ROUTE)}" fill="none" stroke="#4b9daa" stroke-width="1.4" stroke-dasharray="3 5" opacity=".37" stroke-linejoin="round"/>
    <circle id="detail-water" r="5.5" fill="#3d9eb7" stroke="#f9ffff" stroke-width="1.8"/>
  </g>`;
}

/** Persistent plant/section drawing. Progress, phase and cohort identity remain
 * model-owned; the finite Anime.js track only frames this same section. */
export function mountWaterScene(scene: SVGSVGElement) {
  const el = (id: string) => scene.querySelector<SVGElement>('#' + id)!;
  const camera = { x: 0, y: 0, width: 760, height: 530 };
  const zoomMotion = create2DMotion({ duration: 1000 })
    .add(camera, { x: [0, 451.6666667], y: [0, 226.5833333], width: [760, 316.6666667], height: [530, 220.8333333], ease: 'inOutSine' });
  scene.innerHTML = background + plantArt()
    + `<ellipse cx="471" cy="165" rx="6" ry="2.5" transform="rotate(-20 471 165)" fill="#426348" stroke="#bdce8f" stroke-width=".8"/>
    <path d="M479 171Q489 200 516 235" fill="none" stroke="#a0b28e" stroke-width="1.2" stroke-dasharray="4 5"/>
    <path d="${routePath(WATER_ROUTE)}" fill="none" stroke="#4b9aa5" stroke-width="2" opacity=".24" stroke-linejoin="round"/>
    <g id="cohorts">${Array.from({ length: 7 }, () => '<circle r="4" fill="#4b9eb5" stroke="#fff" stroke-width="1.3"/>').join('')}</g>
    <circle id="water-marker" r="7" fill="#3d9eb7" stroke="white" stroke-width="2.4"/>`
    + detailArt();
  return {
    draw(progress: number, active = 1) {
      const s = waterAt(progress), dot = el('water-marker');
      dot.setAttribute('cx', String(s.x)); dot.setAttribute('cy', String(s.y));
      dot.setAttribute('fill-opacity', String(1 - s.vapour)); dot.setAttribute('stroke', s.vapour > .5 ? '#3c91a8' : 'white');
      [...el('cohorts').children].forEach((circle, i) => {
        const p = progress * 1.22 - (i + 1) * .105, q = waterAt(p);
        circle.setAttribute('cx', String(q.x)); circle.setAttribute('cy', String(q.y));
        circle.setAttribute('opacity', String(p < 0 || p > 1 ? 0 : .55));
        circle.setAttribute('fill-opacity', String(1 - q.vapour)); circle.setAttribute('stroke', q.vapour > .5 ? '#3c91a8' : '#fff');
      });
      const close = el('detail-water');
      close.setAttribute('cx', String(s.detailX)); close.setAttribute('cy', String(s.detailY));
      close.setAttribute('fill-opacity', String(1 - s.vapour)); close.setAttribute('stroke', s.vapour > .5 ? '#3c91a8' : '#f9ffff');
      scene.querySelectorAll('#cohorts, #water-marker').forEach(node => node.setAttribute('opacity', String(active)));
      close.setAttribute('opacity', String(s.leafVisible ? active : 0));
      scene.querySelector('#wet-wall')?.setAttribute('opacity', String(.25 + .5 * active * (s.leafVisible && !s.leftLeaf ? 1 : 0)));
      scene.dataset.progress = progress.toFixed(4); scene.dataset.active = String(active);
      scene.dataset.waterIdentity = 'branch-leaf-01/cohort-01';
    },
    zoom(value: number) {
      zoomMotion.seek(value * 1000);
      scene.setAttribute('viewBox', `${camera.x} ${camera.y} ${camera.width} ${camera.height}`);
      scene.dataset.zoom = String(value);
    },
    dispose() { zoomMotion.dispose(); },
  };
}
