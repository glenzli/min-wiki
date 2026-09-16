import { t } from './i18n.ts';
import { flavorSequence, type Food } from './model.ts';
const label=(x:number,y:number,text:string,anchor='start')=>`<text data-diagram-label x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
const defs=`<defs><linearGradient id="face-tissue" x2="1" y2="1"><stop stop-color="#f2d7c1"/><stop offset="1" stop-color="#d7aa91"/></linearGradient><radialGradient id="mouth-tissue" cx="40%" cy="30%"><stop stop-color="#b7756b"/><stop offset="1" stop-color="#8d5656"/></radialGradient><linearGradient id="tongue-tissue" x2="0" y2="1"><stop stop-color="#e3a59d"/><stop offset="1" stop-color="#bf7f78"/></linearGradient><radialGradient id="brain-tissue"><stop stop-color="#e3ced0"/><stop offset="1" stop-color="#bca2af"/></radialGradient><linearGradient id="papilla-tissue" x2="0" y2="1"><stop stop-color="#efbcb1"/><stop offset="1" stop-color="#d79689"/></linearGradient><linearGradient id="cell-tissue" x2="1" y2="0"><stop stop-color="#c4c591"/><stop offset=".5" stop-color="#e4e1b1"/><stop offset="1" stop-color="#b4b87e"/></linearGradient><radialGradient id="fruit-red" cx="30%" cy="25%"><stop stop-color="#ec8e72"/><stop offset="1" stop-color="#a74c41"/></radialGradient><pattern id="paper" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#7d715e" opacity=".14"/></pattern><filter id="soft-shadow"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#6d584b" flood-opacity=".16"/></filter></defs>`;
function traceMarkup(id:string,d:string,color:string,dashed=false){return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity=".18" stroke-width="9" stroke-linecap="round"/><path id="${id}" d="${d}" pathLength="1" fill="none" stroke="${color}" stroke-width="${dashed?3:4}" stroke-dasharray="${dashed?'.025 .025':'1'}" stroke-linecap="round"/><circle id="dot-${id}" r="5" fill="#fff6d9" stroke="${color}" stroke-width="2" opacity="0"/>`;}
export function createTasteScene(){
  document.getElementById('head-art')!.innerHTML=defs+`<rect width="480" height="480" fill="url(#paper)"/>
  <path d="M309 43C234 20 179 48 157 107Q145 144 146 174L127 210Q104 226 122 241L143 247L140 274Q111 281 127 291Q113 303 139 309L145 334Q155 371 206 368L225 421H348L331 337C386 284 406 242 398 173C395 106 366 55 309 43Z" fill="url(#face-tissue)" stroke="#b78f79" stroke-width="2" filter="url(#soft-shadow)"/>
  <path d="M147 274Q190 252 249 277Q271 293 277 315L289 383L267 406Q251 349 239 339Q182 328 140 307Q152 296 145 286Z" fill="url(#mouth-tissue)"/>
  <path d="M143 230Q171 190 217 178Q248 169 263 205L252 247Q213 235 145 245Z" fill="#f7ead6" stroke="#bd9585" stroke-width="2"/>
  <path d="M168 225q40-38 72-23m-60 36q31-25 55-15" fill="none" stroke="#d7aa99" stroke-width="7" stroke-linecap="round"/>
  <path d="M146 264Q204 249 252 267" stroke="#f3decc" stroke-width="12" fill="none"/>
  <path d="M145 271L149 283L161 283L162 268" fill="#fff6df" stroke="#c6b09a" stroke-width="1.3"/>
  <path d="M142 303C163 290 202 297 225 304Q251 312 248 333Q215 345 188 329Z" fill="url(#tongue-tissue)" stroke="#a97068" stroke-width="1.7"/>
  <path d="M157 304Q190 299 224 310" stroke="#f6c8b9" stroke-width="2" fill="none"/>
  ${Array.from({length:13},(_,i)=>`<ellipse cx="${157+i*5.3}" cy="${304+Math.pow(i/12,2)*6}" rx="2.2" ry="1.8" fill="#be8078"/>`).join('')}
  <g id="food-art"></g><circle cx="213" cy="309" r="11" fill="none" stroke="#e7c58f" stroke-width="2"/><path d="M214 321L205 349L165 362" fill="none" stroke="#9b8971" stroke-width="1.4" stroke-dasharray="3 3"/>${label(163,382,t('舌面的小凸起'),'middle')}
  <g filter="url(#soft-shadow)"><path d="M280 70Q240 72 229 105Q219 132 239 147Q251 171 280 164Q294 188 324 177Q353 177 356 153Q379 124 360 102Q351 74 325 78Q307 56 280 70Z" fill="url(#brain-tissue)" stroke="#a98b9a" stroke-width="2"/><path d="M261 88q-19 9-12 23q18-10 25 7m6-45q-4 28 20 25m-26 20q22-2 22 20q-23-1-25 20m42-79q-7 20 10 27q17-6 24 13m-51 19q20-19 31 1q-4 18 13 22m-40-20q-12 21 5 25" fill="none" stroke="#b397a5" stroke-width="3" stroke-linecap="round"/></g>
  <path d="M198 182Q218 169 242 181" stroke="#b39567" stroke-width="9" stroke-linecap="round" fill="none"/><g stroke="#a17f52" stroke-width="1.5">${Array.from({length:9},(_,i)=>`<path d="M${199+i*5} ${179-Math.sin(i/8*Math.PI)*5}v8"/>`).join('')}</g>
  <g id="smell-layer">${traceMarkup('aroma','M177 282 C208 278 252 285 264 268 C282 244 279 219 264 203 Q247 184 227 177','#98769e',true)}${traceMarkup('smell-signal','M227 177Q218 152 249 140Q270 126 302 123','#98769e')}</g>
  ${traceMarkup('taste-signal','M217 329Q246 372 282 370Q315 367 321 316L326 207Q328 168 316 145','#467e72')}
  <g id="integration" opacity="0"><path d="M268 117L315 109L325 151L279 147Z" stroke="#7c6683" stroke-width="1.5" fill="none"/><g fill="#7c6683" stroke="#f5e2e0" stroke-width="2"><circle cx="268" cy="117" r="5"/><circle cx="315" cy="109" r="5"/><circle cx="325" cy="151" r="5"/><circle cx="279" cy="147" r="5"/></g></g>
  ${label(42,170,t('嗅觉细胞'))}<path d="M130 173L193 179" stroke="#8d806c" stroke-width="1"/>${label(45,330,t('舌头'))}${label(356,225,t('传向脑'),'middle')}${label(345,449,t('侧面概念切面'),'middle')}`;
  const epithelial=Array.from({length:35},(_,i)=>{
    const x=57+i%7*53,y=240+Math.floor(i/7)*37;
    return `<path d="M${x} ${y}q12-15 29-5l10 19q-15 10-33 2Z" fill="none" stroke="#c28e81" stroke-width="1" opacity=".38"/><ellipse cx="${x+16}" cy="${y+5}" rx="4.5" ry="3" fill="#af7f78" opacity=".3"/>`;
  }).join('');
  const cells=Array.from({length:9},(_,i)=>{
    const dx=(i-4)*12,top=235+dx*.13,bottom=235+dx*.7,mid=235+dx*1.15;
    return `<g><path id="taste-cell-${i}" d="M${top} 158C${mid-17} 192 ${mid-14} 265 ${bottom} 325C${mid+13} 289 ${mid+12} 217 ${top+4} 158Z" fill="url(#cell-tissue)" stroke="#969b66" stroke-width="1.1"/><ellipse cx="${mid}" cy="${257+(i%3)*10}" rx="6" ry="12" fill="#909b65" opacity=".65"/><path d="M${top+1} 159v-19" stroke="#8c9460" stroke-width="1.5"/></g>`;
  }).join('');
  document.getElementById('bud-art')!.innerHTML=defs.replaceAll('id="','id="bud-').replaceAll('url(#','url(#bud-')+`<rect width="480" height="480" fill="url(#bud-paper)"/>
  <path d="M36 414L41 309Q54 222 127 209Q147 169 189 151Q237 135 283 156Q320 174 342 219Q417 234 436 414Z" fill="url(#bud-papilla-tissue)" stroke="#bd8c7c" stroke-width="2" filter="url(#bud-soft-shadow)"/>${epithelial}
  <path d="M42 309Q54 222 127 209Q147 169 189 151Q237 135 283 156Q320 174 342 219Q414 234 431 306" fill="none" stroke="#f8d7c2" stroke-width="7" opacity=".8"/>
  <path d="M71 130C122 111 163 144 200 127S291 115 339 132S402 125 422 132L420 160C367 154 323 163 287 145Q239 127 196 147C145 164 111 148 69 158Z" fill="#b9d4cb" opacity=".58"/><path d="M76 129Q109 122 137 132M300 127q40-6 63 9" fill="none" stroke="#e9f7eb" stroke-width="3" stroke-linecap="round"/>
  <path d="M225 156C180 172 170 269 199 314Q235 364 274 313C303 268 285 174 246 156Z" fill="#e8dfb8" stroke="#a7a473" stroke-width="2"/>${cells.replaceAll('url(#cell-tissue)','url(#bud-cell-tissue)')}
  <path d="M224 151Q236 144 247 151" stroke="#92886b" stroke-width="4" fill="none"/><path d="M207 326Q227 337 236 351m28-24q-21 17-24 26m-40-31q-7 26 31 39m43-39q8 25-30 37" fill="none" stroke="#6d9a7b" stroke-width="3" stroke-linecap="round"/>
  ${traceMarkup('bud-signal','M237 351Q221 389 277 409Q321 426 405 425','#467e72')}
  <g id="taste-activation" fill="none" stroke="#477f71" stroke-width="2" opacity="0"><path d="M235 161C214 221 219 282 233 321M241 161C255 218 259 278 241 323"/></g>
  <g id="solute"></g><g id="overview-labels">${label(38,82,t('唾液'))}<path d="M79 88L104 120" stroke="#8e9681" stroke-width="1"/>${label(312,93,t('味孔'))}<path d="M320 101L245 146" stroke="#95836b" stroke-width="1"/>${label(322,267,t('味觉细胞'))}<path d="M317 275L273 281" stroke="#95836b" stroke-width="1"/>${label(140,394,t('味蕾'),'middle')}${label(348,458,t('神经纤维'),'middle')}</g><g id="zoom-labels" class="zoom-labels" opacity="0"><text x="348" y="125" text-anchor="end">${t('味孔')}</text><path d="M293 127L245 147" fill="none" stroke="#95836b"/><text x="370" y="258" text-anchor="end">${t('味觉细胞')}</text><text x="252" y="395" text-anchor="middle">${t('神经纤维')}</text></g>`;
}
function trace(id:string,p:number,dashed=false){
  const path=document.getElementById(id) as unknown as SVGPathElement;
  if(!dashed)path.setAttribute('stroke-dashoffset',String(1-p));
  else path.setAttribute('opacity',String(.25+.65*p));
  const point=path.getPointAtLength(path.getTotalLength()*p);
  const dot=document.getElementById(`dot-${id}`)!;
  dot.setAttribute('cx',String(point.x));dot.setAttribute('cy',String(point.y));dot.setAttribute('opacity',p>0&&p<1?'1':'0');
}
export function drawTaste(progress:number,includeSmell:boolean,food:Food,smellOpacity=includeSmell?1:0){
  const s=flavorSequence(progress,includeSmell||smellOpacity>0);
  trace('taste-signal',s.tasteNerve);trace('bud-signal',s.tasteNerve);trace('aroma',s.aroma,true);trace('smell-signal',s.smellNerve);
  document.getElementById('smell-layer')!.setAttribute('opacity',String(.12+.88*smellOpacity));
  document.getElementById('integration')!.setAttribute('opacity',String(s.integration));
  document.getElementById('taste-activation')!.setAttribute('opacity',String(s.tasteCell));
  const size=1-.25*s.dissolved;
  document.getElementById('food-art')!.innerHTML=food==='strawberry'
    ?`<g transform="translate(177 281) scale(${size})"><path d="M-19-12Q-29-4-16 9L-1 26Q13 20 21-1Q24-21 6-20Q-8-23-19-12Z" fill="url(#fruit-red)" stroke="#a65845" stroke-width="1.3"/><path d="M-7-17L-19-25L-3-23L4-34L8-21L22-22L12-12Z" fill="#749065"/><g fill="#f5c981"><ellipse cx="-9" cy="-4" rx="1.7" ry="3"/><ellipse cx="8" cy="0" rx="1.7" ry="3"/><ellipse cx="-1" cy="12" rx="1.7" ry="3"/></g></g>`
    :`<g transform="translate(177 285) scale(${size})"><path d="M-26 1A27 27 0 0 1 25 1L17 15Q-8 25-26 1Z" fill="url(#fruit-red)" stroke="#a65845" stroke-width="2"/><path d="M-20 0Q0-15 20 1Q0 9-20 0Z" fill="#e9a479"/><g fill="#f4d49f"><ellipse cx="-9" cy="-1" rx="4" ry="2"/><ellipse cx="6" cy="-1" rx="4" ry="2"/></g></g>`;
  document.getElementById('solute')!.innerHTML=Array.from({length:7},(_,i)=>{
    const travel=Math.max(0,Math.min(1,s.dissolved*1.5-i*.09));
    const x=150+i*19+(236-(150+i*19))*travel,y=93+(138-93)*travel;
    return `<circle cx="${x}" cy="${y}" r="${3.2-i%2*.6}" fill="${food==='strawberry'?'#b77853':'#af765f'}" opacity="${.9-.5*s.tasteCell}"/>`;
  }).join('');
}
