import {t} from './i18n.ts';
import {clamp,foodHeatFlow,refrigerantState,refrigerantPaths as paths,parcelPosition,smooth,type ThermalState,type Point} from './model.ts';
const d=(points:Point[])=>points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join('');
const text=(x:number,y:number,value:string,anchor='middle',size=19)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="#385258">${value}</text>`;
const number=(x:number,y:number,n:number,color:string)=>`<g transform="translate(${x} ${y})"><circle r="16" fill="${color}"/><text text-anchor="middle" y="6" font-size="18" fill="#fff">${n}</text></g>`;
export interface Illustration {thermal:ThermalState;view:number;parcel:number;inspect:boolean;}
export function drawScene({thermal:s,view,parcel,inspect}:Illustration){
 const reveal=smooth(0,1,view),circuit=smooth(1,2,view),shell=1-.77*circuit;
 const zoom=.9+.08*view,tx=45-36*view,ty=26-17*view;
 const position=parcelPosition(parcel),phase=refrigerantState(parcel);
 const activity=inspect?1:s.activity,roomHeat=.2+.8*activity;
 const foodHeat=foodHeatFlow(s),heatStrength=clamp(Math.abs(foodHeat)/30);
 const foodArrows=foodHeat>=0?['M356 326Q335 311 313 318','M408 243Q436 226 458 233']:['M313 318Q335 311 356 326','M458 233Q436 226 408 243'];
 const pipeOpacity=.14+.86*reveal;
 const foodTint=clamp((s.food-3)/20),doorWidth=300*(1-.78*s.door),doorX=205-60*s.door;
 const colors=['#66b2ba','#759da3','#bd754b','#a6926e'];
 return `<defs>
 <linearGradient id="fr-wall" x2="0" y2="1"><stop stop-color="#eee9dc"/><stop offset="1" stop-color="#faf7ed"/></linearGradient>
 <linearGradient id="fr-wood"><stop stop-color="#c5a482"/><stop offset=".45" stop-color="#e0c6a2"/><stop offset="1" stop-color="#b08d69"/></linearGradient>
 <linearGradient id="fr-metal"><stop stop-color="#b7c3bf"/><stop offset=".22" stop-color="#f3f5e9"/><stop offset=".6" stop-color="#dce2d9"/><stop offset="1" stop-color="#899f9d"/></linearGradient>
 <linearGradient id="fr-liner" x2=".6" y2="1"><stop stop-color="#b2cbca"/><stop offset=".4" stop-color="#edf4e8"/><stop offset="1" stop-color="#b8d0c9"/></linearGradient>
 <radialGradient id="fr-apple" cx=".25" cy=".2"><stop stop-color="#ffdca9"/><stop offset=".3" stop-color="#dfaa70"/><stop offset="1" stop-color="#a75839"/></radialGradient>
 <linearGradient id="fr-glass" x2="1" y2=".3"><stop stop-color="#e4f5ec" stop-opacity=".6"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#97b7ad" stop-opacity=".65"/></linearGradient>
 <radialGradient id="fr-food-temp"><stop stop-color="#dfa05d" stop-opacity="${.05+.16*foodTint}"/><stop offset="1" stop-color="#dfa05d" stop-opacity="0"/></radialGradient>
 <filter id="fr-shadow"><feGaussianBlur stdDeviation="7"/></filter>
 <marker id="fr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9" fill="none" stroke="#bc8355" stroke-width="1.6"/></marker>
 </defs><rect width="960" height="620" fill="url(#fr-wall)"/><path d="M0 530H960V620H0Z" fill="#d3c3a8"/>
 <g opacity="${1-.7*circuit}"><path d="M22 115H158V520H22Z" fill="url(#fr-wood)"/><path d="M12 110H165V128H12Z" fill="#ebe4d0"/>${[70,110].map(x=>`<path d="M${x} 145q-10 110 4 175t-4 175" fill="none" stroke="#8e6d4d" opacity=".15"/>`).join('')}<path d="M33 310H148" stroke="#a78863"/><rect x="124" y="178" width="5" height="62" rx="2" fill="#6f746a"/></g>
 <g transform="translate(${tx} ${ty}) scale(${zoom})"><ellipse cx="440" cy="558" rx="263" ry="20" fill="#5a6255" opacity=".2" filter="url(#fr-shadow)"/>
 <g opacity="${shell}"><path d="M198 96L231 68H516L548 91V524L510 552H202Z" fill="#9dacaa"/><rect x="193" y="90" width="332" height="454" rx="22" fill="url(#fr-metal)" stroke="#7c9391"/><rect x="213" y="109" width="292" height="409" rx="15" fill="url(#fr-liner)" stroke="#f8fcf2" stroke-width="8"/><rect x="233" y="127" width="252" height="371" rx="8" fill="#ccded6"/><path d="M213 110L234 132V497L214 517M504 110L485 132V497L504 517" fill="none" stroke="#819d98" opacity=".35"/>
 ${[295,391,476].map(y=>`<path d="M227 ${y}H492L508 ${y+12}H211Z" fill="url(#fr-glass)" stroke="#eff9ee"/><path d="M214 ${y+13}H507" stroke="#769f9c" stroke-width="3"/>`).join('')}
 <rect x="223" y="523" width="35" height="34" rx="5" fill="#5b6c66"/><rect x="471" y="523" width="35" height="34" rx="5" fill="#5b6c66"/></g>
 <g opacity="${pipeOpacity}">
 ${Array.from({length:16},(_,i)=>`<path d="M${666+i*8} 155V354" stroke="#8f9482" stroke-width="2" opacity=".45"/>`).join('')}
 ${paths.map((points,i)=>`<path d="${d(points)}" fill="none" stroke="#5c6c64" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="${d(points)}" fill="none" stroke="${colors[i]}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="${d(points)}" fill="none" stroke="#f6f8dc" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>`).join('')}
 <path d="M547 473C542 438 605 428 622 466V511Q584 531 547 513Z" fill="#596b65" stroke="#364e4b" stroke-width="3"/><ellipse cx="584" cy="470" rx="36" ry="23" fill="#71847b"/><path d="M551 481Q583 503 618 481" fill="none" stroke="#b2b5a0" opacity=".6"/><rect x="553" y="515" width="69" height="9" rx="3" fill="#364e4b"/>
 <path d="M584 525V552H651" fill="none" stroke="#5c6660" stroke-width="4"/><path d="M650 547v10m8-10v10" stroke="#5c6660" stroke-width="3"/>
 <circle cx="603" cy="482" r="4" fill="${inspect||s.on?'#dbbe69':'#aeb3a1'}"/>
 </g>
 <g opacity="${(1-.88*circuit)*Math.max(reveal,s.door)}">
 <ellipse cx="380" cy="347" rx="90" ry="47" fill="url(#fr-food-temp)"/>
 <g transform="translate(274 209)"><path d="M0 18L13 0H49L60 18V81H0Z" fill="#f5efdc" stroke="#b3bfb0"/><path d="M13 0L25 18H60M25 18V81" fill="none" stroke="#c9d0c0"/><path d="M3 32H23V53H3Z" fill="#91b5a1"/><path d="M33 33H52" stroke="#9bb2a3" stroke-width="3"/><rect x="14" y="1" width="33" height="5" rx="2" fill="#93b7ac"/></g>
 <g transform="translate(386 250)"><ellipse rx="28" ry="9" cy="29" fill="#54736c" opacity=".14"/><path d="M0-19C-24-35-43-4-24 19Q-10 36 0 27Q13 35 26 14C39-11 19-31 0-19Z" fill="url(#fr-apple)"/><path d="M0-18L4-33" stroke="#755d36" stroke-width="4"/><path d="M4-26Q16-45 31-32Q18-20 4-26Z" fill="#769365"/><path d="M-16-9Q-25-5-23 5" stroke="#ffe1b7" stroke-width="3" fill="none" opacity=".7"/></g>
 <g transform="translate(322 322)"><ellipse cx="48" cy="50" rx="73" ry="10" fill="#647c6d" opacity=".12"/><path d="M-10 10H106L95 57H1Z" fill="#e8e4ce" stroke="#c3c1a8"/><ellipse cx="48" cy="10" rx="58" ry="18" fill="#f7f0d9"/><path d="M-2 7Q20-17 38 1Q51-17 67-1Q93-9 98 12Q54 29-2 7Z" fill="#799b60"/><path d="M4 4Q31 15 35-2M51 0L71 18M78 3L95 10" fill="none" stroke="#b0bd77" stroke-width="2"/><ellipse cx="48" cy="12" rx="62" ry="20" fill="url(#fr-glass)" stroke="#d5e3d5"/></g>
 <rect x="246" y="407" width="229" height="64" rx="10" fill="url(#fr-glass)" stroke="#abc5b9"/><path d="M275 422q24-26 44 4t40 0t45 5" fill="none" stroke="#a5b985" stroke-width="15"/><path d="M263 409H463" stroke="#f5ffec" stroke-width="3"/>
 </g>
 <g opacity="${(1-reveal)*shell}" transform="translate(${doorX} 98)"><path d="M0 0H${doorWidth}V428H0Q-8 218 0 0Z" fill="url(#fr-metal)" stroke="#879c98" stroke-width="3"/><path d="M6 146H${doorWidth-4}" stroke="#829995" stroke-width="4"/><rect x="${Math.max(12,doorWidth-41)}" y="62" width="11" height="63" rx="5" fill="#657d78"/><rect x="${Math.max(12,doorWidth-41)}" y="174" width="11" height="92" rx="5" fill="#657d78"/><path d="M18 14V411" stroke="#f8fbee" opacity=".8"/></g>
 <g opacity="${reveal*(1-.7*circuit)}"><path d="M509 117L${530+95*s.door} ${113+25*s.door}V${512+20*s.door}L509 516Z" fill="url(#fr-metal)" stroke="#869d96" opacity=".7"/></g>
 <g opacity="${reveal*heatStrength*(1-.6*circuit)}">${foodArrows.map(path=>`<path d="${path}" fill="none" stroke="#b38b59" stroke-width="2.7" stroke-dasharray="4 5" marker-end="url(#fr-arrow)"/>`).join('')}</g>
 <g opacity="${s.door*(1-.55*circuit)}"><path d="M620 235C575 221 538 226 488 240" fill="none" stroke="#bc8355" stroke-width="4" marker-end="url(#fr-arrow)"/><path d="M491 363Q562 396 624 381" fill="none" stroke="#7daab0" stroke-width="3" stroke-dasharray="7 8"/>${text(603,211,t('开门：热进入'))}</g>
 <g opacity="${roomHeat}">${[0,1,2].map(i=>`<path d="M${806+i*19} 330q-12-35 0-70t0-70" fill="none" stroke="#bd865f" stroke-width="${2+i*.2}" opacity=".55"/>`).join('')}${text(824,430,t('热留在房间'))}</g>
 <g opacity="${reveal}">${number(239,129,1,'#4e919c')}${number(534,493,2,'#637f76')}${number(810,144,3,'#b37752')}${number(587,75,4,'#927d58')}</g>
 <g opacity="${circuit}">${text(351,285,t('1 吸热'))}${text(580,571,t('2 压缩'))}${text(727,392,t('3 放热'))}${text(524,52,t('4 降压'))}</g>
 ${inspect?`<g opacity="${circuit}" transform="translate(${position[0]} ${position[1]})"><circle r="19" fill="#fdf3cf" stroke="#b08738" stroke-width="2"/><circle r="${8-3*phase.vapor}" fill="${phase.highPressure>.5?'#cb815b':'#6da7b2'}"/>${[-1,1].map(sign=>`<circle cx="${sign*(6+5*phase.vapor)}" cy="${sign*6*phase.vapor}" r="${2+phase.vapor}" fill="#718f94" opacity="${phase.vapor}"/>`).join('')}</g>`:''}
 </g>`;
}
export function drawGraph(frames:ThermalState[],reference:ThermalState[],progress:number,compare:boolean){
 const end=Math.floor(progress*(frames.length-1)),x=(i:number)=>38+i/(frames.length-1)*744,y=(temp:number)=>124-temp/24*105;
 const line=(values:ThermalState[],key:'air'|'food')=>values.slice(0,end+1).filter((_,i)=>i%3===0||i===end).map((s,i)=>`${i?'L':'M'}${x(Math.min(i*3,end)).toFixed(1)} ${y(s[key]).toFixed(1)}`).join('');
 return `${[4,12,24].map(temp=>`<path d="M38 ${y(temp)}H782" stroke="#d8dfd4"/><text x="28" y="${y(temp)+5}" text-anchor="end" fill="#6a7771" font-size="14">${temp}°</text>`).join('')}<path d="M38 16V126H782" fill="none" stroke="#a3b3aa"/>${compare?`<path d="${line(reference,'food')}" fill="none" stroke="#8d958a" stroke-width="2" stroke-dasharray="5 5"/>`:''}<path d="${line(frames,'air')}" fill="none" stroke="#3b929e" stroke-width="2.3"/><path d="${line(frames,'food')}" fill="none" stroke="#b6834b" stroke-width="3"/><path d="M${x(end)} 15V125" stroke="#758875" stroke-dasharray="3 4"/>`;
}
