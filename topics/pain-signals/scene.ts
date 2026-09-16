import { t } from './i18n.ts';
import { painSequence } from './model.ts';
export type Focus = 'both' | 'reflex' | 'brain';
const label = (x:number,y:number,text:string,anchor='start',local=false) => `<text ${local?'':'data-wide-label'} x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
const routes = {
  incoming: 'M110 153 C99 177 126 182 134 201 C142 217 129 248 148 265 C187 300 219 327 285 327 C316 327 346 300 381 302 Q410 304 433 327',
  reflex: 'M433 327 Q453 337 443 362 Q435 384 413 408 C374 451 329 482 244 489',
  ascending: 'M433 327 Q486 348 502 310 C525 258 503 213 484 184 Q473 163 453 148',
};
export function createPainScene() {
  const cells = Array.from({length:27},(_,i)=>{
    const x=35+(i%9)*28,y=118+Math.floor(i/9)*21;
    return `<path d="M${x-13} ${y}q7-11 20-5l6 15q-9 10-22 1Z" fill="${i%3===0?'#ecc2a9':'#f1cfb7'}" stroke="#c89179" stroke-width=".8"/><ellipse cx="${x+1}" cy="${y+4}" rx="3.5" ry="2.5" fill="#b88170" opacity=".65"/>`;
  }).join('');
  const collagen=Array.from({length:10},(_,i)=>`<path d="M${28+i*24} 216q16-20 28 3t23 5m-35 14q14-18 28 1" fill="none" stroke="#cf9a80" stroke-width="1.3" opacity=".5"/>`).join('');
  const paths=Object.entries(routes).map(([id,d])=>{
    const color=id==='incoming'?'#b87946':id==='reflex'?'#447f72':'#936c9b';
    return `<g id="route-${id}"><path d="${d}" fill="none" stroke="#fcf8eb" stroke-width="13" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-opacity=".28" stroke-width="7" stroke-linecap="round"/><path id="${id}" d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/><circle id="dot-${id}" r="6" fill="#fff7d9" stroke="${color}" stroke-width="3" opacity="0"/></g>`;
  }).join('');
  document.getElementById('art')!.innerHTML=`
  <g filter="url(#tissue-shadow)"><rect x="24" y="104" width="257" height="168" rx="15" fill="url(#dermis)"/><g clip-path="url(#skin-clip)"><path d="M23 110Q72 96 120 108T220 107T285 111V167Q255 194 220 167T156 170T84 164T23 170Z" fill="url(#skin)"/>${cells}${collagen}<path d="M26 245c40-19 59-3 74-20s41-20 51-5s32 16 46 4s48-13 85 1" fill="none" stroke="#b87970" stroke-width="6" opacity=".5"/><path d="M28 246c35-18 59-3 72-20s41-20 51-5s32 16 46 4s48-13 85 1" fill="none" stroke="#f0d0bd" stroke-width="2"/></g><path d="M27 109Q72 98 120 108T220 107T280 110" fill="none" stroke="#bd8f71" stroke-width="5" stroke-linecap="round"/></g>
  <g id="ending-emphasis"><path d="M134 201Q164 186 171 151m-36 43q-29-8-45-24m40 16q12-31 3-40m32 29 20-11m-75-11-11-12m-9 29-15 6" fill="none" stroke="#b58a50" stroke-width="4" stroke-linecap="round"/><circle id="ending-halo" cx="125" cy="162" r="33" fill="#e7b569" opacity="0"/></g>
  ${label(25,85,t('皮肤切面'),'start',true)}${label(175,205,t('感受末梢'),'start',true)}
  <g filter="url(#tissue-shadow)"><path d="M447 62C407 42 382 67 382 93C355 107 365 143 388 150C398 181 425 186 450 172C479 186 509 163 509 139C531 114 515 86 495 82C489 58 465 51 447 62Z" fill="url(#brain-tissue)" stroke="#9c7e8d" stroke-width="2"/><path d="M447 67q-16 17-5 35q-21-9-30 7m4-39q-16 9-8 23m-17 4q28-5 24 23q-26 5-21 24m23-24q25-8 29 13q-21 10-10 29m24-79q26-6 26 15m-33 15q12-23 35-6q-8 18 8 28m-42-13q-5 27 17 31q15 6 21-8" fill="none" stroke="#ac8b96" stroke-width="3" stroke-linecap="round"/><path d="M389 79q25-31 48-9" fill="none" stroke="#f6e4df" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>
  <g id="brain-network" opacity="0"><path d="M415 105L457 92L478 136L426 147Z M415 105L478 136M457 92L426 147" fill="none" stroke="#76517d" stroke-width="2" opacity=".6"/><g fill="#795982" stroke="#f2e4ea" stroke-width="2"><circle cx="415" cy="105" r="6"/><circle cx="457" cy="92" r="6"/><circle cx="478" cy="136" r="6"/><circle cx="426" cy="147" r="6"/></g></g>
  ${label(444,32,t('脑内多处共同加工'),'middle')}
  <g filter="url(#tissue-shadow)"><path d="M394 279C348 300 354 380 401 407C438 429 485 399 492 354C501 310 469 282 442 277Q419 291 394 279Z" fill="url(#cord-tissue)" stroke="#bdb49f" stroke-width="2"/><path d="M402 308q-23 7-9 34q12 7 8 22q-23 37 0 28q23-4 23-30q9-15 17-1q5 33 28 25q15-8-5-26q-8-13 4-29q16-28-5-29q-21 5-27 29q-11 12-18-1q-4-18-16-22Z" fill="#bd9ca1" stroke="#a2848a" stroke-width="1.5"/><circle cx="432" cy="347" r="4" fill="#f7eee2"/></g>
  <g opacity=".8"><ellipse cx="324" cy="312" rx="17" ry="13" fill="#c39c6b" stroke="#8b7859" stroke-width="1.5"/><circle cx="325" cy="311" r="5" fill="#ead4a9"/><path d="M325 325v-7" stroke="#a8804d" stroke-width="3"/></g>
  ${paths}
  <circle cx="433" cy="327" r="8" fill="#fcf5e6" stroke="#a17a55" stroke-width="2"/><circle id="synapse" cx="433" cy="327" r="3.5" fill="#b7824c"/>
  ${label(190,355,t('传入神经'))}${label(410,451,t('脊髓切面'),'middle')}${label(545,265,t('向脑'),'end')}${label(299,426,t('反射支路'),'middle')}
  <g id="muscle-drawing"><path id="muscle-tendons" d="M63 489H111M244 489H281" stroke="#d9c3a0" stroke-width="10" stroke-linecap="round"/><ellipse id="muscle-body" cx="177" cy="489" rx="67" ry="24" fill="url(#muscle)" stroke="#945f51" stroke-width="2"/><g id="muscle-fibers" fill="none" stroke="#e6b8a2" stroke-width="1.3" opacity=".7"><path d="M122 479Q177 461 231 479M116 489Q177 477 237 489M122 499Q177 484 230 499"/></g></g>
  ${label(177,538,t('运动神经联系肌肉'),'middle')}
  <g id="hand" transform="translate(0 0)"><path d="M43 577L178 578Q203 562 224 567L270 579Q282 584 276 592Q274 597 262 594L236 590L267 604Q278 611 271 618Q267 623 255 619L226 608L248 623Q255 630 248 635Q242 639 230 632L203 615Q189 626 173 621L43 615Z" fill="url(#skin)" stroke="#b48771" stroke-width="2"/><path d="M60 585L171 587Q190 573 210 579" fill="none" stroke="#fff1de" stroke-width="3" opacity=".7"/></g><path id="move-arrow" d="M301 587H342m-29-10-12 10 12 10" fill="none" stroke="#477f73" stroke-width="3" stroke-linecap="round" opacity="0"/>${label(369,588,t('缩回'),'middle')}
  <path d="M90 47q-8 10 0 18m24-22q-8 10 0 18m24-14q-8 10 0 18" fill="none" stroke="#be855f" stroke-width="2" stroke-linecap="round"/>${label(162,58,t('屏幕情景'),'start',true)}`;
}
function trace(id:string,p:number) {
  const path=document.getElementById(id) as unknown as SVGPathElement;
  path.setAttribute('stroke-dashoffset',String(1-p));
  const point=path.getPointAtLength(path.getTotalLength()*p);
  const dot=document.getElementById(`dot-${id}`)!;
  dot.setAttribute('cx',String(point.x));dot.setAttribute('cy',String(point.y));
  dot.setAttribute('opacity',p>0&&p<1?'1':'0');
}
export function drawPain(progress:number,focus:Focus) {
  const s=painSequence(progress);
  trace('incoming',s.incoming);trace('reflex',s.reflex);trace('ascending',s.ascending);
  document.getElementById('route-reflex')!.setAttribute('opacity',focus==='brain'?'.2':'1');
  document.getElementById('route-ascending')!.setAttribute('opacity',focus==='reflex'?'.2':'1');
  document.getElementById('ending-halo')!.setAttribute('opacity',String(.2*s.ending));
  document.getElementById('brain-network')!.setAttribute('opacity',String(s.processing));
  document.getElementById('muscle-tendons')!.setAttribute('d',`M63 489H${110+14*s.withdrawal}M${244-14*s.withdrawal} 489H281`);
  document.getElementById('muscle-body')!.setAttribute('rx',String(67-14*s.withdrawal));
  document.getElementById('muscle-body')!.setAttribute('ry',String(24+6*s.withdrawal));
  document.getElementById('muscle-fibers')!.setAttribute('transform',`translate(${177*(1-(1-.2*s.withdrawal))} 0) scale(${1-.2*s.withdrawal} 1)`);
  document.getElementById('hand')!.setAttribute('transform',`translate(${-34*s.withdrawal} 0)`);
  document.getElementById('move-arrow')!.setAttribute('opacity',String(s.withdrawal));
}
