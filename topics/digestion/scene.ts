import { t } from './i18n.ts';
import { digestionSequence, absorptionRoute, lumenRadius, segment, type Nutrient } from './model.ts';
const label=(x:number,y:number,s:string,a='start')=>`<text x="${x}" y="${y}" text-anchor="${a}">${s}</text>`;
const routes=[
 'M294 90Q316 88 333 108',
 'M333 108L333 227Q333 243 345 251',
 'M345 251Q390 265 400 297Q416 335 366 339Q327 327 278 330',
 'M278 330Q229 327 244 366Q252 389 279 373Q323 348 371 371Q420 393 372 408Q328 424 280 409Q239 393 263 433Q283 449 339 438Q399 427 393 454Q387 476 335 470Q276 456 268 481Q260 506 230 496',
 'M230 496L222 393Q221 357 255 357H406Q446 359 446 399V491Q444 532 394 538Q343 540 349 587',
];
const defs=(prefix:string)=>`<defs><linearGradient id="${prefix}-paper" x2=".8" y2="1"><stop stop-color="#fcf8ee"/><stop offset="1" stop-color="#e8e4d6"/></linearGradient><linearGradient id="${prefix}-tissue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2d3b9"/><stop offset=".45" stop-color="#dfa58e"/><stop offset="1" stop-color="#ad6b5c"/></linearGradient><linearGradient id="${prefix}-liver" x2="1" y2="1"><stop stop-color="#bc8e78"/><stop offset=".6" stop-color="#996553"/><stop offset="1" stop-color="#7f5549"/></linearGradient><linearGradient id="${prefix}-wall" x2="0" y2="1"><stop stop-color="#f5d2b8"/><stop offset=".4" stop-color="#ce967e"/><stop offset="1" stop-color="#b67664"/></linearGradient><linearGradient id="${prefix}-cell" x2="1"><stop stop-color="#cd9983"/><stop offset=".45" stop-color="#f6d9bf"/><stop offset="1" stop-color="#c38b76"/></linearGradient><linearGradient id="${prefix}-lumen" x2="0" y2="1"><stop stop-color="#f7ecd4"/><stop offset="1" stop-color="#e5d4a9"/></linearGradient><radialGradient id="${prefix}-food" cx=".3" cy=".25"><stop stop-color="#e9c17b"/><stop offset="1" stop-color="#a67545"/></radialGradient><filter id="${prefix}-shadow" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dy="4" stdDeviation="5" flood-color="#6f5746" flood-opacity=".18"/></filter><pattern id="${prefix}-grain" width="21" height="17" patternUnits="userSpaceOnUse"><circle cx="3" cy="7" r=".6" fill="#a07857" opacity=".12"/><circle cx="12" cy="13" r=".7" fill="#fff" opacity=".45"/></pattern></defs>`;
export function createDigestionScene(){
 const intestine=routes[3];
 const colonBeads=Array.from({length:12},(_,i)=>`<path d="M${242+i*15} 345q-6 12 0 23" stroke="#bd8972" stroke-width="1.8" fill="none" opacity=".55"/>`).join('');
 document.getElementById('body-art')!.innerHTML=defs('body')+`<rect width="700" height="640" fill="url(#body-paper)"/><rect width="700" height="640" fill="url(#body-grain)"/>
 <path d="M297 37C256 48 254 89 278 121L281 165Q232 179 192 214L153 603H526L493 211Q463 183 399 165L397 117Q423 57 376 38Q338 13 297 37Z" fill="#eadac4" fill-opacity=".4" stroke="#cdbba1" stroke-width="2"/>
 <path d="M302 80Q325 78 336 96L326 117Q301 109 291 95Z" fill="#c3917b"/><path d="M294 90Q316 88 333 108" fill="none" stroke="#edc7aa" stroke-width="14"/>
 <path d="M333 108L333 227Q333 243 345 251" fill="none" stroke="#b88570" stroke-width="25" stroke-linecap="round"/><path d="M333 108L333 227Q333 243 345 251" fill="none" stroke="url(#body-tissue)" stroke-width="18" stroke-linecap="round"/>
 <g id="stomach"><path d="M345 244C365 258 374 256 379 243C413 226 436 260 437 294C440 334 413 353 375 354Q328 341 286 346L270 327Q314 314 336 302Q351 281 332 259Z" fill="url(#body-tissue)" stroke="#ac7965" stroke-width="2" filter="url(#body-shadow)"/><path d="M356 263Q380 287 365 316M381 266Q406 285 391 327M407 276Q425 309 407 332" fill="none" stroke="#b97d6a" stroke-width="2.2" opacity=".7"/><path d="M371 251Q400 246 415 266" fill="none" stroke="#f7d6bb" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>
 <path d="${intestine}" fill="none" stroke="#b47d67" stroke-width="28" stroke-linejoin="round" stroke-linecap="round" filter="url(#body-shadow)"/><path d="${intestine}" fill="none" stroke="url(#body-tissue)" stroke-width="23" stroke-linejoin="round" stroke-linecap="round"/><path d="${intestine}" fill="none" stroke="#f4cbb0" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity=".75"/>
 <path d="${routes[4]}" fill="none" stroke="#a77b68" stroke-width="38" stroke-linejoin="round" stroke-linecap="round"/><path d="${routes[4]}" fill="none" stroke="url(#body-tissue)" stroke-width="31" stroke-linejoin="round" stroke-linecap="round"/>${colonBeads}
 <path d="M221 494q-22 28-8 43" fill="none" stroke="#ba8774" stroke-width="8" stroke-linecap="round"/>
 <g id="helper-organs"><path d="M222 236Q261 213 329 237L326 271Q281 311 213 289Q189 267 222 236Z" fill="url(#body-liver)" stroke="#92654f" stroke-width="2" filter="url(#body-shadow)"/><path d="M227 241Q268 223 315 243" fill="none" stroke="#d5ab8b" stroke-width="2.5" opacity=".7"/><path d="M272 274Q297 273 290 292Q284 308 274 295Z" fill="#929c66" stroke="#6f8255" stroke-width="1.5"/>
 <path d="M282 312Q305 298 331 314Q370 311 395 326Q370 342 335 331Q306 337 282 324Z" fill="#d6bb83" stroke="#b69a65" stroke-width="2"/><path d="M302 317l9 10m10-12 10 11m12-9 8 12m8-8 9 8m8-5 8 4" fill="none" stroke="#ecdbaf" stroke-width="3"/>
 <path d="M287 278L303 292L302 325L257 343M389 326L302 325" fill="none" stroke="#90965e" stroke-width="4" stroke-linejoin="round"/><path id="juice-route" d="M287 279L303 293L302 325L257 343M389 326L302 325" fill="none" stroke="#d6cb7e" stroke-width="2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
 </g>
 ${routes.map((d,i)=>`<path id="food-route-${i}" d="${d}" fill="none" stroke="none"/>`).join('')}<g id="food-cohort"></g><g id="organ-water" fill="#759caf"></g>
 <ellipse id="intestine-focus" cx="317" cy="443" rx="57" ry="47" fill="none" stroke="#ad8b52" stroke-width="2" stroke-dasharray="5 6" opacity=".55"/>
 ${label(182,85,t('口腔'))}<path d="M244 88H286" stroke="#a88c72"/>${label(419,164,t('食管'))}<path d="M410 169L347 174" stroke="#a88c72"/>
 ${label(478,275,t('胃'))}<path d="M470 279L437 285" stroke="#a88c72"/>${label(102,248,t('肝脏'))}<path d="M157 251L199 255" stroke="#a88c72"/>
 ${label(111,296,t('胆囊'))}<path d="M165 298L265 287" stroke="#a88c72"/>${label(484,326,t('胰腺'))}<path d="M476 330L397 329" stroke="#a88c72"/>
 ${label(180,441,t('大肠'),'end')}<path d="M175 439L199 436" stroke="#a88c72"/>${label(484,453,t('小肠'))}<path d="M475 456L398 458" stroke="#a88c72"/>
 ${label(415,568,t('直肠'))}<path d="M407 563L366 565" stroke="#a88c72"/>${label(347,623,t('肛门'),'middle')}${label(34,37,t('身体正面 · 路线示意'))}`;
 const villusCells=Array.from({length:28},(_,i)=>{
 const side=i<14?-1:1,step=i<14?i:i-14,y=925-step*23,u=(925-y)/309;
 const x=300+side*(61-61*Math.pow(u,5)),angle=side*Math.atan(305/309*Math.pow(u,4))*180/Math.PI;
 return `<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M-13-12Q0-17 13-11L12 11Q0 16-12 11Z" fill="url(#gut-cell)" stroke="#be8871" stroke-width="1"/><ellipse cx="0" cy="2" rx="3.5" ry="5.5" fill="#ae7e7a" opacity=".6"/><path d="M${side*14} -10v20" stroke="#e0b397" stroke-width="3"/></g>`;
 }).join('');
 const cap='M264 927L264 746Q263 685 293 643Q309 635 322 663Q343 703 336 749L337 927';
 document.getElementById('detail-art')!.innerHTML=defs('gut')+`<rect width="600" height="1000" fill="url(#gut-paper)"/><rect width="600" height="1000" fill="url(#gut-grain)"/>
 ${label(29,43,t('一小段小肠的纵切面'))}${label(29,70,t('管壁收缩，内容物被推进并混合'))}
 <path id="upper-wall" fill="url(#gut-wall)" stroke="#b7856c" stroke-width="2"/>
 <path id="lumen-space" fill="url(#gut-lumen)"/>
 <path id="lower-wall" fill="url(#gut-wall)" stroke="#b7856c" stroke-width="2"/>
 <g id="tube-villi"></g><g id="lumen-food"></g><g id="enzyme-marks" fill="#98a470" opacity="0"><circle cx="115" cy="195" r="3"/><circle cx="182" cy="223" r="3"/><circle cx="289" cy="173" r="3"/><circle cx="377" cy="212" r="3"/></g>
 <path d="M58 379H547" fill="none" stroke="#b98476" stroke-width="8"/><path d="M58 394H547" fill="none" stroke="#81989e" stroke-width="5"/>
 ${label(37,429,t('绒毛增加与内容物接触的面积'))}
 ${label(29,548,t('再靠近一根绒毛'))}${label(29,577,t('先经过上皮细胞，再进入运输通路'))}
 <path d="M57 918Q59 758 99 740Q145 757 151 918M446 918Q450 761 491 740Q529 760 538 918" fill="url(#gut-tissue)" stroke="#bb927b" stroke-width="2" opacity=".36"/>
 <path d="M220 925C240 856 223 737 250 666Q269 615 298 616Q334 613 350 667C379 741 361 858 379 925Z" fill="url(#gut-tissue)" stroke="#b87d66" stroke-width="3" filter="url(#gut-shadow)"/>
 <path d="M240 913C255 841 240 738 268 675Q293 630 322 665C354 726 347 845 358 913Z" fill="#ecd3b0" opacity=".7"/>
 <path d="${cap}" fill="none" stroke="#bb786c" stroke-width="8" stroke-linecap="round"/><path d="M264 927V746Q263 685 293 643" fill="none" stroke="#d9a494" stroke-width="3"/>
 <path d="M302 927L302 722Q302 689 312 706L312 927" fill="#a3b898" stroke="#729181" stroke-width="2"/>
 ${villusCells}
 <g id="absorption-particles"></g><g id="villus-water" fill="#6d9eb2" stroke="#d6edf0" stroke-width="1"></g><circle id="selected-cell" cx="246" cy="706" r="25" fill="none" stroke="#b38a4f" stroke-width="1.5" stroke-dasharray="4 4"/>
 ${label(39,666,t('肠腔'))}${label(162,747,t('上皮细胞'),'end')}<path d="M172 745L230 714" stroke="#a38e76"/>
 ${label(399,797,t('毛细血管'))}<path d="M395 804L337 797" stroke="#a38e76"/>
 ${label(397,853,t('淋巴管'))}<path d="M392 857L313 850" stroke="#a38e76"/>
 ${label(300,970,t('绒毛不是孔洞；细胞构成一道屏障'),'middle')}`;
}
export function drawDigestion(progress:number,nutrient:Nutrient,fatFocus=nutrient==='fat'?1:0){
 const s=digestionSequence(progress),a=absorptionRoute(progress,nutrient);
 const path=document.getElementById(`food-route-${s.phase}`) as unknown as SVGPathElement;
 const length=path.getTotalLength();
 const nutrientCount=14;
 document.getElementById('food-cohort')!.innerHTML=Array.from({length:24},(_,i)=>{
 const offset=(i%6-2.5)*.005,point=path.getPointAtLength(Math.max(0,Math.min(1,s.local+offset))*length);
 const angle=i*2.4+s.mixing*5,spread=6+7*Math.sin(s.mixing*Math.PI);
 const absorb=i<nutrientCount?s.absorption:0,opacity=1-absorb;
 const radius=(4.1-.5*s.chewing-1.1*s.breakdown)*(1-.4*s.water);
 return `<ellipse cx="${point.x+Math.cos(angle)*spread}" cy="${point.y+Math.sin(angle)*spread}" rx="${radius}" ry="${radius*.8}" fill="url(#body-food)" stroke="#8d683e" stroke-width=".5" opacity="${opacity}"/>`;
 }).join('');
 document.getElementById('stomach')!.setAttribute('transform',`translate(${(1-(1+.015*Math.sin(s.mixing*Math.PI*6)))*375} 0) scale(${1+.015*Math.sin(s.mixing*Math.PI*6)} 1)`);
 document.getElementById('juice-route')!.setAttribute('stroke-dashoffset',String(1-s.breakdown));
 document.getElementById('organ-water')!.innerHTML=Array.from({length:6},(_,i)=>{const q=segment(s.water,i*.09,i*.09+.5);return `<circle cx="${461+q*42}" cy="${397+i*16}" r="3" opacity="${Math.sin(Math.PI*q)}"/>`;}).join('');
 const front=segment(progress,.43,.8);
 const top=Array.from({length:61},(_,i)=>`${i?'L':'M'}${30+i*9} ${231-lumenRadius(i/60,front)}`).join(' ');
 const bottom=Array.from({length:61},(_,i)=>`${i?'L':'M'}${30+i*9} ${231+lumenRadius(i/60,front)}`).join(' ');
 document.getElementById('upper-wall')!.setAttribute('d',`${top}L570 107H30Z`);
 document.getElementById('lower-wall')!.setAttribute('d',`${bottom}L570 367H30Z`);
 document.getElementById('lumen-space')!.setAttribute('d',`${top}L570 ${231+lumenRadius(1,front)} ${Array.from({length:61},(_,i)=>`L${570-i*9} ${231+lumenRadius(1-i/60,front)}`).join(' ')}Z`);
 document.getElementById('tube-villi')!.innerHTML=Array.from({length:17},(_,i)=>{const x=49+i*31,y=231+lumenRadius((x-30)/540,front);return `<path d="M${x-12} ${y+6}Q${x-11} ${y-36} ${x} ${y-39}Q${x+12} ${y-35} ${x+12} ${y+6}" fill="url(#gut-cell)" stroke="#bf8972" stroke-width="1.3"/><path d="M${x} ${y}v-24" stroke="#b7806d" stroke-width="1" opacity=".6"/>`;}).join('');
 const active=s.p>=.43?1:0;
 document.getElementById('lumen-food')!.innerHTML=Array.from({length:18},(_,i)=>{const x=67+front*443+segment(s.p,.8,.9)*130+(i%6-2.5)*7,y=221+Math.sin(i*2.4+front*9)*22;return `<circle cx="${x}" cy="${y}" r="${5-2.8*s.breakdown}" fill="url(#gut-food)" opacity="${active*(i<12?1-s.absorption:1)}"/>`;}).join('');
 document.getElementById('enzyme-marks')!.setAttribute('opacity',String(.6*Math.sin(Math.PI*s.breakdown)));
 const bloodColor='#c59748',fatColor='#a29655';
 document.getElementById('absorption-particles')!.innerHTML=(['sugar','fat'] as const).map(kind=>{const emphasis=kind==='fat'?fatFocus:1-fatFocus;return `<g data-route="${kind}" opacity="${.14+.86*emphasis}">`+Array.from({length:8},(_,i)=>{
 const delay=i*.012,q=segment(progress-delay,.6,.8);let x:number,y:number;
 if(q<.35){const f=q/.35;x=184+62*f;y=661+44*f;}
 else if(q<.6){const f=(q-.35)/.25;x=246+12*f;y=705+9*f;}
 else {const f=(q-.6)/.4,target=kind==='fat'?307:264;x=258+(target-258)*Math.min(1,f*3);y=714+214*f;}
 const packaged=kind==='fat'?segment(q,.35,.6):0;
 return `<circle cx="${x+(i%2)*5}" cy="${y-(i%3)*5}" r="${3+2.2*packaged}" fill="${kind==='fat'?fatColor:bloodColor}" stroke="${packaged>0?'#ede3b7':'#fff4cd'}" stroke-width="${1+packaged}" opacity="${q===0?0:1}"/>`;
 }).join('')+'</g>';}).join('');
 document.getElementById('villus-water')!.innerHTML=Array.from({length:4},(_,i)=>{const q=segment(progress-i*.012,.6,.8);const x=q<.45?186+q/.45*74:264;const y=q<.45?755+q/.45*20:775+(q-.45)/.55*152;return `<circle cx="${x}" cy="${y-i*4}" r="3.2" opacity="${q===0?0:1}"/>`;}).join('');
 document.getElementById('selected-cell')!.setAttribute('opacity',String(.35+.65*Math.sin(Math.PI*a.uptake)));
 return s;
}
