import type { Settings } from './model.ts';
import { buoyancy } from './model.ts';
import { t } from './i18n.ts';

type Result = ReturnType<typeof buoyancy>;
type Geometry = { water: number; bottom: number; width: number; height: number; cup: number };
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x: number, y: number, value: string, size = 18, color = '#365f60', caption = false) => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="middle"${caption ? ' data-caption="true"' : ''}>${escape(value)}</text>`;
const definitions = `<defs>
 <linearGradient id="buoy-room" x2="0" y2="1"><stop stop-color="#edf3e9"/><stop offset="1" stop-color="#f7efde"/></linearGradient>
 <linearGradient id="buoy-glass" x2="1" y2=".12"><stop stop-color="#edfafa" stop-opacity=".85"/><stop offset=".18" stop-color="#fff" stop-opacity=".2"/><stop offset=".82" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#87b4b6" stop-opacity=".22"/></linearGradient>
 <linearGradient id="buoy-water-fill" x2="0" y2="1"><stop stop-color="#7ecad2" stop-opacity=".48"/><stop offset=".58" stop-color="#51b2c5" stop-opacity=".52"/><stop offset="1" stop-color="#358caa" stop-opacity=".67"/></linearGradient>
 <linearGradient id="buoy-water-edge" x2="1" y2="0"><stop stop-color="#579caa"/><stop offset=".5" stop-color="#c8f3ed"/><stop offset="1" stop-color="#5496a6"/></linearGradient>
 <linearGradient id="buoy-wood" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#efcf95"/><stop offset=".48" stop-color="#d5a668"/><stop offset="1" stop-color="#ae7942"/></linearGradient>
 <linearGradient id="buoy-clay" x2=".4" y2="1"><stop stop-color="#e4b59c"/><stop offset=".45" stop-color="#d89373"/><stop offset="1" stop-color="#a76049"/></linearGradient>
 <radialGradient id="buoy-clay-ball" cx="30%" cy="22%" r="85%"><stop stop-color="#f0c6a7"/><stop offset=".6" stop-color="#cf8c6d"/><stop offset="1" stop-color="#945039"/></radialGradient>
 <linearGradient id="buoy-stone" x2=".7" y2="1"><stop stop-color="#c7d0bf"/><stop offset=".46" stop-color="#9fae9a"/><stop offset="1" stop-color="#667b72"/></linearGradient>
 <linearGradient id="buoy-steel" x2="1" y2=".25"><stop stop-color="#607d88"/><stop offset=".13" stop-color="#d1e1e4"/><stop offset=".3" stop-color="#9fb9c0"/><stop offset=".54" stop-color="#edf7f5"/><stop offset=".73" stop-color="#afc7cd"/><stop offset="1" stop-color="#607e8a"/></linearGradient>
 <linearGradient id="buoy-cargo" x2=".5" y2="1"><stop stop-color="#f7d587"/><stop offset=".6" stop-color="#d5a249"/><stop offset="1" stop-color="#ad7935"/></linearGradient>
 <linearGradient id="buoy-table" x2="0" y2="1"><stop stop-color="#e9d3aa"/><stop offset="1" stop-color="#d8b986"/></linearGradient>
 <radialGradient id="buoy-shadow"><stop stop-color="#315151" stop-opacity=".22"/><stop offset="1" stop-color="#315151" stop-opacity="0"/></radialGradient>
 <clipPath id="buoy-tank-clip"><rect x="81" y="89" width="530" height="353" rx="20"/></clipPath>
 <marker id="buoy-up" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.3" markerHeight="2.3" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#178b70"/></marker>
 <marker id="buoy-down" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.3" markerHeight="2.3" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#b77c3e"/></marker>
 </defs>`;

function geometry(state: Settings, result: Result): Geometry {
 const boat = state.experiment === 'boat' && state.boat, held = state.experiment === 'depth';
 const size = 150 * Math.cbrt(result.solidVolume / 600);
 const wood = state.experiment === 'objects' && state.object === 'wood';
 const width = boat ? 260 : held ? 120 : wood ? 150 : size;
 const height = boat ? 100 : held ? 120 : wood ? 94 : size;
 const water = 245 - result.displaced / 70;
 // Keep the existing trapezoidal hull's draft-volume relation.
 const draft = boat ? -160 + Math.sqrt(25600 + 42000 * result.fraction) : height * result.fraction;
 return { water, width, height, bottom: held ? water + height * state.depth / 100 : result.floating ? water + draft : 440, cup: 438 - Math.min(185, result.displaced / 8) };
}

function objectMarkup(state: Settings, g: Geometry, flooded: boolean) {
 const x = 365 - g.width / 2, y = g.bottom - g.height, w = g.width, h = g.height, b = g.bottom;
 if (state.experiment === 'boat' && state.boat) {
  const hull = `M${x} ${y}L${x+28} ${b-12}Q${x+32} ${b} ${x+50} ${b}H${x+w-50}Q${x+w-32} ${b} ${x+w-28} ${b-12}L${x+w} ${y}H${x+w-15}L${x+w-42} ${b-20}H${x+42}L${x+15} ${y}Z`;
  const inside = `M${x+15} ${y}L${x+42} ${b-20}H${x+w-42}L${x+w-15} ${y}Z`;
  const shell = `<path d="${hull}" fill="url(#buoy-clay)" stroke="#965d48" stroke-width="2.5"/><path d="M${x+6} ${y+2}L${x+33} ${b-17}Q${x+37} ${b-6} ${x+53} ${b-6}H${x+w-53}" fill="none" stroke="#f2cbb1" stroke-width="3" opacity=".72"/><path d="M${x+45} ${b-15}H${x+w-44}" stroke="#945b43" stroke-width="2" opacity=".4"/>`;
  const interior = `<path d="${inside}" fill="${flooded ? '#69b6c6' : '#f5f4e8'}"${flooded ? ' opacity=".5"' : ''}/><path d="M${x+42} ${b-20}H${x+w-42}" stroke="${flooded?'#4897ae':'#b88662'}" stroke-width="3" opacity=".55"/>`;
  const cargo = Array.from({ length: state.cargo }, (_, i) => {
   const cx=x+47+(i%6)*27, cy=b-45-Math.floor(i/6)*26;
   return `<g><rect x="${cx+1}" y="${cy+2}" width="24" height="24" rx="4" fill="#6d5d42" opacity=".15"/><rect x="${cx}" y="${cy}" width="24" height="24" rx="4" fill="url(#buoy-cargo)" stroke="#b18545" stroke-width="1.2"/><path d="M${cx+4} ${cy+3}H${cx+20}M${cx+4} ${cy+5}V${cy+20}" stroke="#ffe8ad" opacity=".7" fill="none" stroke-width="1.3"/><path d="M${cx+10} ${cy+4}V${cy+19}" stroke="#bc8d45" opacity=".4"/></g>`;
  }).join('');
  return { body: shell, air: flooded ? '' : interior, cargo, floodedInterior: flooded ? interior : '' };
 }
 let body = '';
 if (state.experiment === 'depth') {
  body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="url(#buoy-stone)" stroke="#6b8075" stroke-width="2.5"/><path d="M${x+8} ${b-12}V${y+14}Q${x+8} ${y+7} ${x+17} ${y+7}H${x+w-12}" stroke="#edf0dd" stroke-width="3" opacity=".68" fill="none"/><circle cx="365" cy="${y+5}" r="5" fill="#738277"/><circle cx="365" cy="${y+4}" r="2" fill="#dbe4d6"/>`;
 } else if (state.experiment === 'objects' && state.object === 'wood') {
  body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="13" fill="url(#buoy-wood)" stroke="#aa7d46" stroke-width="2.5"/><path d="M${x+8} ${b-12}V${y+16}Q${x+8} ${y+7} ${x+18} ${y+7}H${x+w-14}" stroke="#fff0c6" stroke-width="3.5" opacity=".76" fill="none"/>`;
  for (let i=0;i<11;i++) body+=`<path d="M${x+13} ${y+16+i*6.6}Q${x+55} ${y+8+i*7.3} ${x+w-12} ${y+18+i*6.3}" stroke="${i%3?'#ac7a3f':'#f5d99f'}" opacity="${i%3?'.35':'.6'}" stroke-width="${i%3?1.2:.9}" fill="none"/>`;
  body += `<ellipse cx="${x+102}" cy="${y+49}" rx="22" ry="9" fill="none" stroke="#9e703d" opacity=".55"/><ellipse cx="${x+102}" cy="${y+49}" rx="11" ry="4" fill="#ae7c40" opacity=".33"/>`;
 } else if (state.object === 'steel' && state.experiment === 'objects') {
  body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="url(#buoy-steel)" stroke="#6e8791" stroke-width="2.5"/><rect x="${x+5}" y="${y+5}" width="${w-10}" height="${h-10}" rx="4" fill="none" stroke="#fff" opacity=".45"/><path d="M${x+11} ${b-9}V${y+11}H${x+w-11}" fill="none" stroke="#f6ffff" opacity=".7" stroke-width="2"/>`;
  for(let i=0;i<13;i++)body+=`<path d="M${x+8} ${y+10+i*(h-20)/13}H${x+w-8}" stroke="#e7f1ef" opacity=".24" stroke-width=".7"/>`;
 } else if (state.experiment === 'boat' || state.object === 'clay') {
  body = `<ellipse cx="365" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="url(#buoy-clay-ball)" stroke="#ae7055" stroke-width="2"/><path d="M${x+w*.18} ${y+h*.27}Q${x+w*.34} ${y+h*.07} ${x+w*.63} ${y+h*.15}" stroke="#ffe0c4" stroke-width="3" opacity=".4" fill="none"/><path d="M${x+w*.24} ${y+h*.73}Q365 ${y+h*.89} ${x+w*.75} ${y+h*.7}" stroke="#aa654c" stroke-width="1.2" opacity=".28" fill="none"/>`;
 } else {
  body = `<g transform="translate(${x} ${y}) scale(${w/100})"><path d="M0 76L8 30L44 0L86 16L100 75L72 100L21 100Z" fill="url(#buoy-stone)" stroke="#6c8073" stroke-width="2"/><path d="M8 30L44 0L60 58Z" fill="#e0e4d0" opacity=".25"/><path d="M60 58L86 16L100 75L72 100Z" fill="#435f53" opacity=".18"/><path d="M10 30L43 3L84 18M44 4L61 58L9 32" stroke="#ecedda" opacity=".5" fill="none" stroke-width="1.5"/>${Array.from({length:12},(_,i)=>`<ellipse cx="${17+(i*19)%68}" cy="${27+(i*13)%58}" rx="${1+i%3}" ry=".9" fill="${i%2?'#e4e6d4':'#6e8176'}" opacity=".4"/>`).join('')}</g>`;
 }
 return { body, air: '', cargo: '', floodedInterior: '' };
}

/** Topic-local presentation only. The model always supplies the settled readings. */
export class BuoyancyScene {
 private frame=0;
 private current?:Geometry;
 private target?:Geometry;
 private state?:Settings;
 private result?:Result;
 private forces=true;
 private identity='';
 private disposed=false;
 private readonly reduced=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private readonly svg:SVGSVGElement,private readonly status:HTMLElement) {
  document.addEventListener('visibilitychange',this.onVisibility);
  window.addEventListener('pagehide',this.onPageHide);
  this.reduced.addEventListener('change',this.onMotionPreference);
 }
 set(state:Settings,result:Result,forces:boolean,instant=false) {
  const next=geometry(state,result), identity=state.experiment==='boat'?(state.boat?'boat':'clay'):state.experiment==='depth'?'held':state.object;
  const changed=this.identity!==identity;
  const from=this.current?{...this.current}:next;
  if(changed&&this.current&&identity!=='held')Object.assign(from,{...next,bottom:next.water-8,water:245,cup:438});
  this.state={...state};this.result=result;this.target=next;this.forces=forces;this.identity=identity;
  cancelAnimationFrame(this.frame);this.frame=0;
  const moved=!this.current||Object.keys(next).some(key=>Math.abs(next[key as keyof Geometry]-this.current![key as keyof Geometry])>.001);
  if(!this.current||!moved||instant||this.reduced.matches||document.hidden){this.settle();return;}
  const start=performance.now(),duration=changed?760:520;
  this.svg.setAttribute('aria-busy','true');this.status.textContent=t('轻轻放入，看看它停在哪里。');
  const tick=(now:number)=>{
   if(this.disposed||document.hidden){this.settle();return;}
   const progress=Math.min(1,(now-start)/duration),ease=1-(1-progress)**3;
   const g=Object.fromEntries(Object.keys(next).map(key=>[key,from[key as keyof Geometry]+(next[key as keyof Geometry]-from[key as keyof Geometry])*ease])) as Geometry;
   this.current=g;this.draw(g,progress<1?Math.sin(progress*Math.PI)*(1-progress):0,progress>=1);
   if(progress<1)this.frame=requestAnimationFrame(tick);else this.settle();
  };
  this.frame=requestAnimationFrame(tick);
 }
 private settle(){cancelAnimationFrame(this.frame);this.frame=0;if(this.target){this.current={...this.target};this.draw(this.current,0,true);}this.svg.setAttribute('aria-busy','false');this.status.textContent=t('换个物品，或慢慢加一点货物。');}
 private draw(g:Geometry,ripple:number,settled:boolean){
  if(!this.state||!this.result)return;
  const s=this.state,r=this.result,{body,air,cargo,floodedInterior}=objectMarkup(s,g,r.flooded);
  const x=365-g.width/2,y=g.bottom-g.height,amplitude=2+ripple*12;
  const surface=`M82 ${g.water}Q170 ${g.water-amplitude} 260 ${g.water}T440 ${g.water}T610 ${g.water}`;
  const support=s.experiment==='depth'?`<g><path d="M320 56H410" stroke="#7c8f86" stroke-width="10" stroke-linecap="round"/><path d="M324 53H406" stroke="#e0e8d8" stroke-width="3" stroke-linecap="round"/><path d="M365 56V${y+3}" stroke="#82958d" stroke-width="3"/><path d="M364 59V${y}" stroke="#f6f7e9" stroke-width=".8"/></g>`:'';
  const upStart=Math.min(g.bottom+9,427),downStart=Math.min(y-8,427-r.weight*10);
  const supportForce = this.forces && settled && !r.floating && s.experiment !== 'depth' ? `<path d="M365 481V${481-Math.max(0,r.weight-r.force)*10}" stroke="#71807a" stroke-width="5" marker-end="url(#buoy-up)"/>${text(455,477,t('箱底也在托住'),14,'#586c62')}` : '';
  const arrows=this.forces&&settled?`${r.force>0?`<path d="M${x-48} ${upStart}V${upStart-r.force*10}" stroke="#178b70" stroke-width="6" stroke-linecap="round" marker-end="url(#buoy-up)"/>`:''}${text(x-48,upStart>405?477:upStart+35,t('浮力'),18,'#147b64')}<path d="M${x+g.width+46} ${downStart}V${downStart+r.weight*10}" stroke="#b77c3e" stroke-width="6" stroke-linecap="round" marker-end="url(#buoy-down)"/>${text(x+g.width+46,downStart-17,t('重力'),18,'#946230')}`:'';
  this.svg.innerHTML=`${definitions}<rect width="850" height="540" fill="url(#buoy-room)"/>
  <path d="M26 8L186 8L77 451H0Z" fill="#fffdf1" opacity=".44"/><path d="M226 0H245L135 451H116Z" fill="#fffdf3" opacity=".25"/>
  <path d="M0 464Q425 451 850 465V540H0Z" fill="url(#buoy-table)"/>
  ${[0,1,2,3].map(i=>`<path d="M0 ${480+i*17}Q280 ${472+i*17} 850 ${479+i*17}" stroke="#b99b68" opacity=".22" fill="none"/>`).join('')}
  <ellipse cx="349" cy="464" rx="299" ry="21" fill="url(#buoy-shadow)"/><ellipse cx="723" cy="453" rx="79" ry="13" fill="url(#buoy-shadow)"/>
  <rect x="78" y="83" width="537" height="365" rx="23" fill="url(#buoy-glass)"/>
  <path d="M82 245H610" stroke="#83a59b" stroke-dasharray="3 7" opacity=".32"/>
  ${support}<g clip-path="url(#buoy-tank-clip)">
  <ellipse cx="365" cy="440" rx="${g.width*.65}" ry="12" fill="url(#buoy-shadow)" opacity="${Math.max(.08,1-(440-g.bottom)/220)}"/>
  ${body}${floodedInterior}<path d="${surface}V444H82Z" fill="url(#buoy-water-fill)"/>
  <path d="${surface}" fill="none" stroke="url(#buoy-water-edge)" stroke-width="3"/>
  <path d="M96 418Q173 405 247 422T416 418T595 427M105 434Q205 416 309 431T579 433" stroke="#d1f4e2" stroke-width="3" opacity=".15" fill="none"/>
  <path d="M97 ${g.water+15}V417Q97 432 111 433" stroke="#f4fffa" stroke-width="7" opacity=".4" fill="none"/>
  ${ripple>0?`<ellipse cx="365" cy="${g.water}" rx="${g.width*.55+35*(1-ripple)}" ry="${5+ripple*8}" fill="none" stroke="#e8ffec" stroke-width="2" opacity="${ripple*.65}"/>`:''}
  </g>${air}${cargo}${arrows}${supportForce}
  <path d="M79 89V428Q79 450 102 450H588Q614 450 614 428V89" fill="none" stroke="#87a9a9" stroke-width="6"/>
  <path d="M86 94V426Q86 442 104 442H584" fill="none" stroke="#f8fff6" stroke-width="3" opacity=".8"/>
  <path d="M608 102V427Q608 440 591 442" fill="none" stroke="#568a98" stroke-width="2" opacity=".4"/>
  <path d="M81 87Q346 73 613 87" stroke="#bed1c8" stroke-width="4" fill="none" opacity=".8"/>
  <path d="M82 88Q346 95 612 88" stroke="#fffdf0" stroke-width="2.5" fill="none"/>
  <path d="M101 99V${Math.max(114,g.water-24)}" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".47"/>
  <path d="M114 110V${Math.max(123,g.water-45)}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".56"/>
  <path d="M666 205V426Q666 445 684 445H761Q780 445 780 426V205" fill="url(#buoy-glass)" stroke="#8eaeab" stroke-width="3"/>
  <path d="M670 ${g.cup}Q723 ${g.cup-4} 776 ${g.cup}V427Q776 440 761 440H684Q670 440 670 427Z" fill="url(#buoy-water-fill)"/>
  <path d="M670 ${g.cup}Q723 ${g.cup-4} 776 ${g.cup}" fill="none" stroke="#77bdc6" stroke-width="2"/>
  <ellipse cx="723" cy="204" rx="57" ry="7" fill="none" stroke="#a6c1b8" stroke-width="3"/>
  <path d="M674 217V417Q674 434 685 435" fill="none" stroke="#fff" stroke-width="4" opacity=".62"/>
  ${Array.from({length:10},(_,i)=>`<path d="M${i%2?763:753} ${428-i*21}H776" stroke="#628d8c" stroke-width="1.5" opacity=".65"/>`).join('')}
  ${text(723,184,t('排开的水'))}${text(723,477,`${r.displaced.toFixed(0)} mL`,21)}${text(345,511,t('水位变化已放大'),14,'#7b765d',true)}`;
 }
 private onVisibility=()=>{if(document.hidden)this.settle();};
 private onPageHide=(event:PageTransitionEvent)=>{if(event.persisted)this.settle();else this.dispose();};
 private onMotionPreference=()=>{if(this.reduced.matches)this.settle();};
 dispose(){this.disposed=true;cancelAnimationFrame(this.frame);document.removeEventListener('visibilitychange',this.onVisibility);window.removeEventListener('pagehide',this.onPageHide);this.reduced.removeEventListener('change',this.onMotionPreference);}
}
