import {t} from './i18n.ts';
import {circuit,cycleState,tracer,condensation} from './model.ts';
const byId=(id:string)=>document.getElementById(id)!;
const points=(p:readonly (readonly number[])[])=>p.map(v=>v.join(',')).join(' ');
export function createScene(){
 byId('scene').innerHTML=`<defs>
 <linearGradient id="room" x2="0" y2="1"><stop stop-color="#f2ecd9"/><stop offset="1" stop-color="#dcd5bd"/></linearGradient>
 <linearGradient id="outside" x2="0" y2="1"><stop stop-color="#bdcfcc"/><stop offset="1" stop-color="#e3e1c6"/></linearGradient>
 <linearGradient id="metal" x2=".8" y2="1"><stop stop-color="#fffef5"/><stop offset=".45" stop-color="#dfdfd3"/><stop offset="1" stop-color="#afb8ad"/></linearGradient>
 <linearGradient id="copper" x2="0" y2="1"><stop stop-color="#754d35"/><stop offset=".4" stop-color="#dfa66b"/><stop offset=".6" stop-color="#f7cf95"/><stop offset="1" stop-color="#936447"/></linearGradient>
 <linearGradient id="cold" x2="0" y2="1"><stop stop-color="#a9d4d1" stop-opacity=".08"/><stop offset=".4" stop-color="#90c3cb" stop-opacity=".7"/><stop offset="1" stop-color="#91b7b8" stop-opacity="0"/></linearGradient>
 <linearGradient id="warm" x2="1" y2="0"><stop stop-color="#b97548" stop-opacity=".5"/><stop offset="1" stop-color="#dcad68" stop-opacity="0"/></linearGradient>
 <radialGradient id="drop"><stop stop-color="#f4ffff"/><stop offset=".45" stop-color="#c5e4e5"/><stop offset="1" stop-color="#5a929d"/></radialGradient>
 <filter id="shadow" x="-30%" y="-30%" width="180%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#353b38" flood-opacity=".17"/></filter>
 <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9Z" fill="#a26538"/></marker>
 </defs>
 <rect width="790" height="550" fill="url(#room)"/><rect x="413" width="377" height="550" fill="url(#outside)"/>
 <path d="M415 400Q485 320 560 366T790 320V550H415Z" fill="#a5b6a0" opacity=".4"/>
 <circle cx="717" cy="63" r="32" fill="#f4dba1" opacity=".8"/>
 <g id="surroundings"><path d="M0 468H410V550H0" fill="#c5ad8d"/><path d="M0 495H410M0 525H410M80 468L58 550M230 468L260 550" stroke="#b0977b" stroke-width="2"/>
 <rect x="34" y="370" width="275" height="93" rx="21" fill="#93a497"/><rect x="45" y="413" width="255" height="40" rx="12" fill="#b5bdac"/><path d="M59 462V481M282 462V481" stroke="#755c46" stroke-width="10"/>
 <path d="M350 467Q351 391 336 358M350 429Q317 408 323 390M351 414Q381 381 375 368" stroke="#687f5b" stroke-width="4" fill="none"/><path d="M336 394Q305 370 318 358Q344 364 336 394M352 432Q386 409 385 393Q353 395 352 432M339 378Q326 341 339 334Q359 359 339 378" fill="#789166"/>
 <path d="M329 453H375L365 493H338Z" fill="#ba9270"/></g>
 <rect x="402" width="22" height="550" fill="#b8b5a7"/><path d="M407 0V550" stroke="#f3efdf" stroke-width="5"/>
 <g id="external-pipes" fill="none" stroke="url(#copper)" stroke-width="7" stroke-linejoin="round"><path d="M190 283V355H479M715 188V130H350V90H190V132"/></g>
 <g id="casings" filter="url(#shadow)"><rect x="64" y="132" width="221" height="151" rx="24" fill="url(#metal)" stroke="#959f96"/><path d="M69 213H280V254Q178 277 69 254Z" fill="#bcc6bd"/><path d="M83 245Q177 257 267 245" fill="none" stroke="#5e716a" stroke-width="8"/>
 <circle cx="259" cy="168" r="3" fill="#68a591"/>
 <rect x="479" y="188" width="255" height="276" rx="17" fill="url(#metal)" stroke="#98a498"/><path d="M490 201H722M490 452H722" stroke="#f4f1df" stroke-width="3"/>
 <rect x="494" y="460" width="24" height="12" fill="#87958b"/><rect x="690" y="460" width="25" height="12" fill="#87958b"/>
 </g>
 <g id="inside" opacity="0"><rect x="83" y="149" width="181" height="121" rx="8" fill="#657f79" opacity=".24"/>
 ${Array.from({length:21},(_,i)=>`<path d="M${88+i*8} 155V270" stroke="#86a7a1" stroke-width="2" opacity=".7"/>`).join('')}
 <rect x="499" y="200" width="205" height="126" rx="9" fill="#ab957d" opacity=".27"/>
 ${Array.from({length:23},(_,i)=>`<path d="M${503+i*9} 203V325" stroke="#a78c6c" stroke-width="2" opacity=".65"/>`).join('')}
 <rect x="473" y="389" width="139" height="83" rx="24" fill="#758681" stroke="#4e615b" stroke-width="3"/>
 ${circuit.map((pts,i)=>`<polyline points="${points(pts)}" fill="none" stroke="#6c725e" stroke-opacity=".2" stroke-width="13" stroke-linejoin="round"/><polyline id="pipe-${i}" points="${points(pts)}" fill="none" stroke="url(#copper)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
 <path d="M337 93L362 127H337L362 93Z" fill="#d7b27b" stroke="#785e3f" stroke-width="2"/>
 <path d="M485 401H601" stroke="#ffffff55" stroke-width="2"/>
 <g fill="#f4efd8" stroke="#747d62" stroke-width="1.5"><circle cx="83" cy="152" r="14"/><text x="83" y="158" text-anchor="middle" font-size="19" fill="#435344" stroke="none">1</text><circle cx="473" cy="413" r="14"/><text x="473" y="419" text-anchor="middle" font-size="19" fill="#435344" stroke="none">2</text><circle cx="715" cy="185" r="14"/><text x="715" y="191" text-anchor="middle" font-size="19" fill="#435344" stroke="none">3</text><circle cx="350" cy="69" r="14"/><text x="350" y="75" text-anchor="middle" font-size="19" fill="#435344" stroke="none">4</text></g>
 <g id="parcels">${Array.from({length:13},(_,i)=>`<circle id="parcel-${i}" r="${i===0?8:3.5}" fill="${i===0?'#fff3bc':'#f6e5b4'}" stroke="#826239" stroke-width="${i===0?2:.5}"/>`).join('')}</g>
 </g>
 <g id="front-fan"><circle cx="607" cy="280" r="69" fill="#627971" stroke="#b8c4b4" stroke-width="5"/><g id="fan" fill="#aebdb0">${[0,120,240].map(a=>`<path d="M607 280C624 258 602 221 579 228C559 238 588 266 607 280Z" transform="rotate(${a} 607 280)"/>`).join('')}</g><circle cx="607" cy="280" r="11" fill="#d1d5c4"/><g stroke="#d5ded033" fill="none">${[28,45,61].map(r=>`<circle cx="607" cy="280" r="${r}"/>`).join('')}</g></g>
 <g id="air"><path d="M87 270Q63 335 90 367L264 367Q243 321 262 270Z" fill="url(#cold)"/><g id="indoor-air" fill="none" stroke="#639aab" stroke-width="3" opacity=".55"><path d="M125 278Q106 320 126 346M176 282Q157 330 178 356M225 278Q206 320 227 343"/></g>
 <path d="M735 250Q768 263 791 240V348Q768 317 735 322Z" fill="url(#warm)" id="outdoor-air"/>
 </g>
 <g id="heat" fill="none" stroke="#a26538" stroke-width="4" marker-end="url(#arrow)"><path d="M46 187H77"/><path d="M295 188H266"/><path d="M723 370H766"/><path d="M723 390H766"/></g>
 <g id="condensate"><path d="M96 277H275L289 291V342L315 364V448" fill="none" stroke="#719399" stroke-width="4"/><path id="water" d="M299 462Q315 434 331 462Q332 484 315 485Q298 484 299 462Z" fill="url(#drop)" opacity="0"/>
 <circle id="falling-drop" cx="315" cy="448" r="4" fill="#abd5db"/>
 </g>
 <g id="parcel-halo"><circle id="halo" r="16" fill="none" stroke="#fff5c4" stroke-width="2"/></g>
 `;
}
export function renderScene(progress:number,cooling:number,humid:number,view:number){
 const state=cycleState(progress),cutaway=Math.min(1,view),zoom=Math.max(0,view-1);
 byId('scene').setAttribute('viewBox',`${30*zoom} ${95*zoom} ${790-470*zoom} ${550-160*zoom}`);
 byId('casings').setAttribute('opacity',String(1-.85*cutaway));byId('inside').setAttribute('opacity',String(cutaway));
 byId('front-fan').setAttribute('opacity',String(1-.82*cutaway));byId('surroundings').setAttribute('opacity',String(1-.7*cutaway));
 if(cooling>.5)byId('fan').setAttribute('transform',`rotate(${progress*2160} 607 280)`);
 byId('indoor-air').setAttribute('transform',`translate(0 ${Math.sin(progress*Math.PI*12)*6})`);
 byId('outdoor-air').setAttribute('opacity',String(cooling));byId('heat').setAttribute('opacity',String(cooling));
 byId('parcels').setAttribute('opacity',String(cooling));byId('parcel-halo').setAttribute('opacity',String(cooling*cutaway));
 for(let i=0;i<13;i++){const [x,y]=i===0?state.point:tracer(progress,i/13);byId(`parcel-${i}`).setAttribute('cx',String(x));byId(`parcel-${i}`).setAttribute('cy',String(y));}
 byId('halo').setAttribute('cx',String(state.point[0]));byId('halo').setAttribute('cy',String(state.point[1]));
 const wet=condensation(progress,cooling,humid);
 byId('water').setAttribute('opacity',String(Math.min(1,wet*2)));
 byId('water').setAttribute('transform',`translate(315 480) scale(${.35+wet*.65}) translate(-315 -480)`);
 byId('falling-drop').setAttribute('cy',String(344+progress*99));byId('falling-drop').setAttribute('opacity',String(wet));
 byId('condensate').setAttribute('opacity',String(.4+.6*cooling));
 byId('phase-dot').setAttribute('style',`--liquid:${state.liquid};--pressure:${state.pressure};visibility:${cooling>.5?'visible':'hidden'}`);
 return state;
}
export const stageNames=[t('室内吸热'),t('压缩机做功'),t('室外放热'),t('节流后返回')];
export const stageDescriptions=[t('较冷的冷媒在室内盘管里吸收热量，液体逐渐蒸发；室内空气经过盘管后变凉。'),t('压缩机用电驱动，把低压蒸气压成高压、较热的蒸气。压缩机不是直接把冷媒压成冰。'),t('比室外空气更热的冷媒向外放热，逐渐凝结成液体。排出的热量还包含压缩机输入的功。'),t('液体经过节流装置，压力降低，部分迅速汽化，形成较冷的液体与蒸气混合物，再回到室内盘管。')];
