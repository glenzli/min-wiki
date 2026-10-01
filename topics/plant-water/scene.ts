import { waterAt, WATER_ROUTE, LEAF_WATER_ROUTE } from './model.ts';
const background = `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#e4f0e8"/><stop offset="1" stop-color="#f7f5df"/></linearGradient><linearGradient id="soil" x2="0" y2="1"><stop stop-color="#d5b78e"/><stop offset="1" stop-color="#b58b62"/></linearGradient><linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#8dbc64"/><stop offset="1" stop-color="#3c8750"/></linearGradient><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="none" stroke="#2f9eb8" stroke-width="2"/></marker></defs><rect width="760" height="530" fill="url(#sky)"/><circle cx="656" cy="87" r="37" fill="#f7d477"/>`;
const soilDetail = Array.from({length:210},(_,i)=>`<ellipse cx="${(i*137.3)%760}" cy="${376+(i*43.71)%152}" rx="${1+i%4}" ry="${.7+i%3}" fill="${i%2?'#806746':'#eed6af'}" opacity=".3"/>`).join('');
const rootHairs = Array.from({length:26},(_,i)=>{const u=i/25,x=375-u*109,y=366+u*73;return `<path d="M${x} ${y}q-8 0 -17 ${i%2?10:-9}M${750-x} ${y+5}q10 0 16 12"/>`;}).join('');
const veins = Array.from({length:7},(_,i)=>{const u=(i+1)/9;return `<path d="M${375-88*u} ${245-55*u}l${-12-10*u} ${8-21*u}m${12+10*u} ${-8+21*u}l${3-11*u} ${-20-7*u}M${375+88*u} ${178-40*u}l${8+10*u} ${9+4*u}m${-8-10*u} ${-9-4*u}l${-5+8*u} ${-17-5*u}"/>`;}).join('');


/** Persistent root, xylem and leaf geometry, observed by the leaf lifecycle owner. */
export function mountWaterScene(scene: SVGSVGElement) {
 const el = (id: string) => scene.querySelector<SVGElement>('#' + id)!;
 const routePath = (route: typeof WATER_ROUTE | typeof LEAF_WATER_ROUTE) => route.map(([,x,y],i)=>`${i?'L':'M'}${x} ${y}`).join('');
 const sceneArt=`<rect x="0" y="362" width="760" height="168" fill="url(#soil)"/>${soilDetail}<g stroke="#ead6ac" stroke-width="1.4" fill="none">${rootHairs}</g><path d="M0 361 Q200 354 380 363 T760 361" stroke="#91b575" stroke-width="12" fill="none"/><path d="M375 364 C330 398 309 418 260 440 M375 364 Q404 402 457 451 M375 364 L369 478 M350 387 L289 386 M411 415 L462 407 M365 438 L328 455" stroke="#f4e6c5" stroke-width="9" fill="none" class="line"/><path d="M375 364 L375 148" stroke="#659451" stroke-width="25" class="line"/><path d="M366 360V160M384 352V179" stroke="#c7d99c" stroke-width="2" opacity=".7"/><path d="M375 245 Q272 259 258 169 Q350 154 375 245 M375 178 Q399 94 492 118 Q480 204 375 178" fill="url(#leaf)"/><path d="M375 245 L287 190 M375 178 L463 138" stroke="#b6d38b" stroke-width="3"/><g stroke="#d7e5b0" stroke-width="1.2" opacity=".65" fill="none">${veins}</g>`;
const detail=`<g id="leaf-section"><rect x="495" y="235" width="220" height="209" rx="23" fill="#fffbee" stroke="#98b88a" stroke-width="2"/><path d="M515 275H695" stroke="#5b9a8b" stroke-width="17"/><path d="M515 275H695" stroke="#a9d8cf" stroke-width="9"/><g fill="#9fbd77" stroke="#64824b" stroke-width="1.5">${Array.from({length:9},(_,i)=>`<ellipse cx="${533+i%3*64}" cy="${307+Math.floor(i/3)*23}" rx="${16+i%2*4}" ry="9"/>`).join('')}</g><path d="M508 370H587M641 370H700" stroke="#88a66d" stroke-width="17"/><path d="M587 370Q598 350 603 370Q598 391 587 370M641 370Q630 350 625 370Q630 391 641 370" fill="#82ac6f" stroke="#466d47" stroke-width="2"/><path d="${routePath(LEAF_WATER_ROUTE)}" fill="none" stroke="#4ba9c1" stroke-width="2" stroke-dasharray="4 6" opacity=".5"/><circle id="detail-water" r="6" fill="#35a8cd" stroke="#f9ffff" stroke-width="2"/></g>`;
scene.innerHTML=background+sceneArt+`<ellipse cx="471" cy="165" rx="6" ry="2.5" transform="rotate(-20 471 165)" fill="#345e46" stroke="#afcf8c" stroke-width="1"/><path d="M479 171Q489 200 516 235" fill="none" stroke="#98b88a" stroke-width="1.5" stroke-dasharray="4 5"/><path d="${routePath(WATER_ROUTE)}" fill="none" stroke="#3c9faa" stroke-width="3" opacity=".26"/><g id="cohorts">${Array.from({length:7},()=>'<circle r="5" fill="#47acc8" stroke="#fff" stroke-width="1.5"/>').join('')}</g><circle id="water-marker" r="9" fill="#33a9ce" stroke="white" stroke-width="3"/>`+detail;
 return {
  draw(progress: number, active = 1) {
 const s=waterAt(progress),dot=el('water-marker');dot.setAttribute('cx',String(s.x));dot.setAttribute('cy',String(s.y));dot.setAttribute('fill-opacity',String(1-s.vapour));dot.setAttribute('stroke',s.vapour>.5?'#3ca1bd':'white');
 [...el('cohorts').children].forEach((circle,i)=>{const p=progress*1.22-(i+1)*.105,q=waterAt(p);circle.setAttribute('cx',String(q.x));circle.setAttribute('cy',String(q.y));circle.setAttribute('opacity',String(p<0||p>1?0:.55));circle.setAttribute('fill-opacity',String(1-q.vapour));circle.setAttribute('stroke',q.vapour>.5?'#3ca1bd':'#fff');});
 const close=el('detail-water');close.setAttribute('cx',String(s.detailX));close.setAttribute('cy',String(s.detailY));close.setAttribute('fill-opacity',String(1-s.vapour));close.setAttribute('stroke',s.vapour>.5?'#319dbd':'#f9ffff');

   scene.querySelectorAll('#cohorts, #water-marker').forEach(node => node.setAttribute('opacity', String(active)));
   close.setAttribute('opacity', String(s.leafVisible ? active : 0));
   scene.dataset.progress = progress.toFixed(4);
   scene.dataset.active = String(active);
  },
  zoom(value: number) { const w = 760 / (1 + 1.4 * value), h = 530 / (1 + 1.4 * value); scene.setAttribute('viewBox', `${(610 - w / 2) * value} ${(337 - h / 2) * value} ${w} ${h}`); },
 };
}
