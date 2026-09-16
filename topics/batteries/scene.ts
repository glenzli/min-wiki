import { t } from './i18n.ts';
import { batteryState,carrierPosition } from './model.ts';
const label=(x:number,y:number,s:string,a='start')=>`<text x="${x}" y="${y}" text-anchor="${a}">${s}</text>`;
const wire='M149 323H93V161Q93 140 116 140H283L357 140H552Q574 140 574 163V279L545 299L548 329L576 340V402Q576 420 551 420H320Q289 420 289 389V323';
const defs=(p:string)=>`<defs>
<linearGradient id="${p}-paper" x2=".8" y2="1"><stop stop-color="#faf7ec"/><stop offset="1" stop-color="#e6e4d6"/></linearGradient>
<linearGradient id="${p}-wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#efdab4"/><stop offset=".45" stop-color="#d8b27e"/><stop offset="1" stop-color="#b58a57"/></linearGradient>
<linearGradient id="${p}-metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8c9692"/><stop offset=".22" stop-color="#eef1dc"/><stop offset=".48" stop-color="#b1bdb0"/><stop offset=".74" stop-color="#e2e6cf"/><stop offset="1" stop-color="#7b8b81"/></linearGradient>
<linearGradient id="${p}-case" x2="1" y2="1"><stop stop-color="#92aaa0"/><stop offset=".5" stop-color="#627f75"/><stop offset="1" stop-color="#3c5c54"/></linearGradient>
<linearGradient id="${p}-copper" x2="1"><stop stop-color="#9a6542"/><stop offset=".3" stop-color="#edc395"/><stop offset=".7" stop-color="#c38c5e"/><stop offset="1" stop-color="#a46642"/></linearGradient>
<linearGradient id="${p}-fluid" x2="1" y2="1"><stop stop-color="#edf1d9"/><stop offset="1" stop-color="#b3c9bd"/></linearGradient>
<radialGradient id="${p}-rubber" cx=".3" cy=".25"><stop stop-color="#777d73"/><stop offset=".6" stop-color="#4b574f"/><stop offset="1" stop-color="#303d37"/></radialGradient>
<filter id="${p}-shadow" x="-25%" y="-25%" width="160%" height="170%"><feDropShadow dy="6" stdDeviation="6" flood-color="#4b4e3b" flood-opacity=".19"/></filter>
<pattern id="${p}-grain" width="41" height="31" patternUnits="userSpaceOnUse"><path d="M2 7q14-5 33 0M7 19q10-3 24 1" fill="none" stroke="#977749" opacity=".13" stroke-width=".7"/></pattern>
</defs>`;
function wheel(x:number){return `<g transform="translate(${x} 370)"><circle r="36" fill="url(#main-rubber)" stroke="#33483f" stroke-width="2"/><circle r="25" fill="url(#main-wood)" stroke="#b49369" stroke-width="2"/><g class="toy-wheel"><path d="M-22 0H22M0-22V22M-16-16L16 16M16-16L-16 16" stroke="#98794e" stroke-width="3"/><circle r="9" fill="url(#main-metal)" stroke="#78877e"/></g></g>`;}
export function createBatteryScene(){
 document.getElementById('circuit-art')!.innerHTML=defs('main')+`<rect width="720" height="500" fill="url(#main-paper)"/>
 <ellipse cx="520" cy="412" rx="156" ry="17" fill="#7c7158" opacity=".12"/>
 <path d="${wire}" fill="none" stroke="#263f39" stroke-width="11" stroke-linejoin="round" stroke-linecap="round" filter="url(#main-shadow)"/>
 <path d="${wire}" fill="none" stroke="#82998c" stroke-width="3" stroke-linecap="round"/>
 <path id="electron-route" d="${wire}" fill="none" stroke="none"/>
 <rect x="129" y="259" width="181" height="101" rx="15" fill="#455b51" stroke="#364b42" stroke-width="2" filter="url(#main-shadow)"/>
 <rect x="145" y="276" width="146" height="63" rx="12" fill="url(#main-case)" stroke="#36534a" stroke-width="2"/><path d="M156 282H275" stroke="#b1c2ad" stroke-width="3" opacity=".7"/>
 <path d="M149 310v24M289 310v24" stroke="url(#main-metal)" stroke-width="12" stroke-linecap="round"/>
 <g fill="#eee9ce" font-family="sans-serif" font-size="20"><text x="164" y="316">−</text><text x="262" y="316">+</text></g>
 ${label(218,247,t('电池组'),'middle')}
 <rect x="177" y="288" width="78" height="39" rx="5" fill="#e0e5cc" opacity=".92"/><path d="M188 300v15m17-15v15m17-15v15m17-15v15" fill="none" stroke="#617d66" stroke-width="2"/>
 <circle cx="139" cy="269" r="3" fill="#b9bdb0"/><path d="M137 269h4" stroke="#617068"/>
 <circle cx="300" cy="348" r="3" fill="#b9bdb0"/><path d="M298 348h4" stroke="#617068"/>
 <rect x="261" y="113" width="117" height="54" rx="11" fill="#d4c5a4" stroke="#b4a281" stroke-width="2"/>
 <path d="M288 140H352" stroke="#d4c5a4" stroke-width="15"/>
 <circle cx="283" cy="140" r="9" fill="url(#main-metal)" stroke="#697a70" stroke-width="2"/><circle cx="357" cy="140" r="9" fill="url(#main-metal)" stroke="#697a70" stroke-width="2"/>
 <g id="switch-arm"><path d="M283 140L357 140" stroke="#9d704c" stroke-width="9" stroke-linecap="round"/><path d="M290 137L350 137" stroke="#e6c399" stroke-width="2"/></g>
 ${label(320,192,t('开关'),'middle')}
 <path d="M423 298L451 255Q459 242 478 246L534 253L563 286L633 297Q652 302 657 324L650 363H423Q407 347 414 328Z" fill="url(#main-wood)" stroke="#a78254" stroke-width="2" filter="url(#main-shadow)"/>
 <path d="M423 298L451 255Q459 242 478 246L534 253L563 286L633 297Q652 302 657 324L650 363H423Z" fill="url(#main-grain)"/>
 <path d="M461 256L478 256L478 284H445Z M490 258L527 263L546 286H490Z" fill="#adc0ad" stroke="#8fa38c" stroke-width="2"/>
 <path d="M436 310H640" stroke="#f5dfb5" stroke-width="3" opacity=".7"/>
 <rect x="518" y="290" width="94" height="51" rx="16" fill="url(#main-metal)" stroke="#72897d" stroke-width="2"/><path d="M600 292v47M530 299v32" stroke="#6b8176" stroke-width="2"/>
 <g id="motor-spindle" transform="translate(566 316)"><ellipse rx="18" ry="18" fill="url(#main-copper)" stroke="#966c47" stroke-width="2"/><path d="M0-16V16M-16 0H16" stroke="#f3d5a6" stroke-width="3"/><circle r="5" fill="#667f73"/></g>
 <path d="M568 338L595 355" stroke="#7e8c7e" stroke-width="6" stroke-linecap="round"/>
 ${wheel(460)}${wheel(607)}<path d="M422 350H645" stroke="#a38053" stroke-width="3" opacity=".6"/>
 <circle cx="638" cy="315" r="7" fill="#e7cea4" stroke="#ad8e62"/><circle cx="427" cy="318" r="4" fill="#a97557"/>
 <g id="external-electrons"></g>
 ${label(116,88,t('导线里的电子'),'start')}<path d="M202 94L206 128" stroke="#8d947b"/>
 ${label(652,234,t('马达'),'end')}<path d="M636 239L602 284" stroke="#8d947b"/>
 ${label(586,470,t('玩具结构观察窗 · 示意'),'middle')}
 ${label(29,469,t('完整回路：两端都要接通'))}`;
 const layers=Array.from({length:9},(_,i)=>`<path d="M98 ${173+i*16}l107-8 16 7-108 8Z" fill="${i%2?'#778879':'#a2afa0'}" stroke="#647d70" stroke-width="1"/>`).join('');
 const grains=Array.from({length:28},(_,i)=>{const x=389+i%4*27,y=168+Math.floor(i/4)*23;return `<path d="M${x} ${y}l14-6 11 9-3 16-18 2-8-12Z" fill="${i%3?'#b79b76':'#c4ac89'}" stroke="#947d61" stroke-width="1"/>`;}).join('');
 const pores=Array.from({length:48},(_,i)=>`<circle cx="${277+i%4*14}" cy="${159+Math.floor(i/4)*14}" r="2.3" fill="#a3b8a9" opacity=".5"/>`).join('');
 document.getElementById('detail-art')!.innerHTML=defs('cell')+`<rect width="600" height="1000" fill="url(#cell-paper)"/>
 ${label(28,36,t('一个锂离子电芯的放电例子'))}
 <path d="M151 108V77Q151 67 163 67H435Q450 67 450 80V108" fill="none" stroke="#667f74" stroke-width="7"/>
 <path id="cell-external" d="M151 108V77Q151 67 163 67H435Q450 67 450 80V108" fill="none" stroke="none"/>
 <path d="M230 67H271" stroke="#f8f5e9" stroke-width="10"/><path id="detail-switch" d="M230 67H270" stroke="#ad8059" stroke-width="6" stroke-linecap="round"/><circle cx="300" cy="67" r="17" fill="url(#cell-metal)" stroke="#87998d" stroke-width="2"/><path d="M292 74V59l8 9 8-9v15" fill="none" stroke="#687e71" stroke-width="2"/>
 <rect x="66" y="107" width="471" height="260" rx="21" fill="#cad4bd" stroke="#92a28f" stroke-width="3" filter="url(#cell-shadow)"/>
 <rect x="83" y="133" width="438" height="219" rx="12" fill="url(#cell-fluid)"/>
 <rect x="91" y="144" width="143" height="195" rx="8" fill="#ccd4b9"/>
 <rect x="369" y="144" width="138" height="195" rx="8" fill="#d6cbb1"/>
 <rect x="263" y="144" width="69" height="195" rx="3" fill="#e5e7d0" stroke="#b4c4aa" stroke-width="2"/>${pores}
 <path d="M151 106V144M449 106V143" stroke="url(#cell-metal)" stroke-width="13" stroke-linecap="round"/>
 ${layers}${grains}<g id="negative-sites"></g><g id="positive-sites"></g><g id="internal-ions"></g><g id="detail-electrons"></g>
 ${label(158,394,t('负极'),'middle')}${label(302,394,t('隔膜'),'middle')}${label(445,394,t('正极'),'middle')}
 ${label(292,425,t('电解质：离子在这里传递电荷'),'middle')}
 <path d="M151 120h-9m14-10v20M445 120h10m-5-5v10" stroke="#5c7567" stroke-width="2"/>
 ${label(28,462,t('剖面仅在图上；不要打开真实电池'))}
 ${label(28,541,t('马达把电能转成转动'))}
 <circle cx="300" cy="757" r="161" fill="url(#cell-metal)" stroke="#7d9283" stroke-width="3" filter="url(#cell-shadow)"/>
 <circle cx="300" cy="757" r="145" fill="#ece7d3" stroke="#acb7a4" stroke-width="2"/>
 <path d="M186 657Q135 756 186 854L227 829Q189 757 227 685Z" fill="#b88970" stroke="#9a6b55" stroke-width="2"/><path d="M414 657Q465 756 414 854L373 829Q411 757 373 685Z" fill="#859c9a" stroke="#5e807e" stroke-width="2"/>
 <text x="192" y="763" text-anchor="middle">N</text><text x="408" y="763" text-anchor="middle">S</text>
 <g id="motor-field" stroke="#b7ad83" fill="none" stroke-width="1.3" opacity=".4"><path d="M222 685Q300 658 378 685M207 722Q300 705 393 722M207 794Q300 810 393 794M222 829Q300 856 378 829"/></g>
 <g id="detail-rotor"><ellipse cx="300" cy="757" rx="86" ry="44" fill="#809080" stroke="#657c6c" stroke-width="2"/>
 ${Array.from({length:9},(_,i)=>`<rect x="${251+i*8}" y="699" width="24" height="116" rx="10" fill="none" stroke="url(#cell-copper)" stroke-width="5"/>`).join('')}
 <circle cx="300" cy="757" r="22" fill="url(#cell-metal)" stroke="#748778" stroke-width="3"/>
 <path d="M292 731A28 28 0 0 0 291 783M309 731A28 28 0 0 1 309 783" fill="none" stroke="#ac7850" stroke-width="7"/></g>
 <path d="M72 887H255V784L275 775M528 887H347V784L325 775" fill="none" stroke="#758f7f" stroke-width="7" stroke-linejoin="round"/><path d="M271 774h13M317 774h13" stroke="#4f6558" stroke-width="11"/>
 ${label(49,631,t('固定磁体'))}<path d="M128 636L181 662" stroke="#8b967e"/>
 ${label(469,691,t('线圈'))}<path d="M463 697L382 726" stroke="#8b967e"/>
 ${label(306,950,t('线圈受磁力作用；换向结构帮助持续转动'),'middle')}`;
}
export function drawBattery(used:number,closed:boolean,switchPosition:number,coastAngle=0){
 const s=batteryState(used,closed),angle=s.rotorAngle+coastAngle;
 document.getElementById('switch-arm')!.setAttribute('transform',`rotate(${-34*(1-switchPosition)} 283 140)`);
 document.getElementById('detail-switch')!.setAttribute('transform',`rotate(${-34*(1-switchPosition)} 230 67)`);
 document.querySelectorAll('.toy-wheel').forEach(e=>e.setAttribute('transform',`rotate(${angle*.6})`));
 document.getElementById('motor-spindle')!.setAttribute('transform',`translate(566 316) rotate(${angle})`);
 document.getElementById('detail-rotor')!.setAttribute('transform',`rotate(${angle} 300 757)`);
 const path=document.getElementById('electron-route') as unknown as SVGPathElement,total=path.getTotalLength();
 document.getElementById('external-electrons')!.innerHTML=Array.from({length:22},(_,i)=>{const fraction=carrierPosition(i,s.electronTravel,22),pt=path.getPointAtLength(fraction*total);const atGap=pt.y<150&&pt.x>287&&pt.x<353;return `<circle cx="${pt.x}" cy="${pt.y}" r="3.7" fill="#588eac" stroke="#e7f1e9" stroke-width="1.1" opacity="${atGap&&!closed?0:s.conducting?1:.36}"/>`;}).join('');
 const short=document.getElementById('cell-external') as unknown as SVGPathElement;
 document.getElementById('detail-electrons')!.innerHTML=Array.from({length:9},(_,i)=>{const pt=short.getPointAtLength(short.getTotalLength()*carrierPosition(i,s.electronTravel,9));return `<circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#588eac" stroke="#eef4e4" stroke-width="1" opacity="${!closed&&pt.x>231&&pt.x<269&&pt.y<78?0:s.conducting?1:.3}"/>`;}).join('');
 document.getElementById('internal-ions')!.innerHTML=Array.from({length:8},(_,i)=>{const f=carrierPosition(i,s.ionTravel,8),x=211+179*f,y=175+(i%4)*42;return `<g transform="translate(${x} ${y})" opacity="${s.conducting?1:.35}"><circle r="6" fill="#cfab67" stroke="#f4e5b4" stroke-width="1.4"/><path d="M-2.5 0h5M0-2.5v5" stroke="#806a3d" stroke-width="1"/></g>`;}).join('');
 const sites=(side:'left'|'right')=>Array.from({length:18},(_,i)=>{const x=(side==='left'?118:401)+(i%3)*28,y=172+Math.floor(i/3)*27,amount=side==='left'?1-used:used;return `<circle cx="${x}" cy="${y}" r="${3.5+1.1*amount}" fill="#cfa562" stroke="#f0da9e" stroke-width="1" opacity="${.14+.86*amount}"/>`;}).join('');
 document.getElementById('negative-sites')!.innerHTML=sites('left');document.getElementById('positive-sites')!.innerHTML=sites('right');
 return s;
}
