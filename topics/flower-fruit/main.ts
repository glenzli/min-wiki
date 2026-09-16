import { animateValue } from '../../src/visuals/transition.ts';
import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t); mountTopicNavigation('flower-fruit');
const scene = document.querySelector<SVGSVGElement>('#scene')!;
const result = document.querySelector<HTMLElement>('#result')!;
const el = <T extends HTMLElement>(id: string) => document.getElementById(id)! as T;
const label = (x: number, y: number, text: string, cls = '') => {
  const lines: string[] = [''];
  if (cls === 'small' && text.includes(' ') && text.length > 18) {
    for (const word of text.split(' ')) {
      const last = lines.length - 1;
      if (lines[last] && lines[last]!.length + word.length + 1 > 18) lines.push(word);
      else lines[last] += (lines[last] ? ' ' : '') + word;
    }
  } else lines[0] = text;
  return `<text x="${x}" y="${y}" text-anchor="middle" class="${cls}">${lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : 22}">${line} </tspan>`).join('')}</text>`;
};
const defs = `<defs>
  <linearGradient id="orchard" x2="0" y2="1"><stop stop-color="#dfe6d2"/><stop offset=".52" stop-color="#f8f0db"/><stop offset="1" stop-color="#d0dac2"/></linearGradient>
  <radialGradient id="sunlight"><stop stop-color="#fffae3" stop-opacity=".94"/><stop offset="1" stop-color="#fffae3" stop-opacity="0"/></radialGradient>
  <linearGradient id="bark" x2="0" y2="1"><stop stop-color="#967359"/><stop offset=".42" stop-color="#6d5540"/><stop offset="1" stop-color="#463d30"/></linearGradient>
  <radialGradient id="petal" cx=".45" cy=".36" r=".85"><stop stop-color="#fffdf4"/><stop offset=".52" stop-color="#fff6ef"/><stop offset=".85" stop-color="#eed0d3"/><stop offset="1" stop-color="#d69eaf"/></radialGradient>
  <radialGradient id="flower-center"><stop stop-color="#d4c171"/><stop offset=".55" stop-color="#e3d7a0"/><stop offset="1" stop-color="#f8eee0" stop-opacity="0"/></radialGradient>
  <linearGradient id="leaf-green" x1="0" y1="1" x2=".8" y2="0"><stop stop-color="#3f6037"/><stop offset=".55" stop-color="#719252"/><stop offset="1" stop-color="#a8bb76"/></linearGradient>
  <linearGradient id="stalk" x1="0" x2="1"><stop stop-color="#55733d"/><stop offset=".5" stop-color="#a8b677"/><stop offset="1" stop-color="#496539"/></linearGradient>
  <radialGradient id="cherry-skin" cx=".3" cy=".23" r=".8"><stop stop-color="#f2a5a0"/><stop offset=".24" stop-color="#d95763"/><stop offset=".64" stop-color="#a6233b"/><stop offset="1" stop-color="#631d30"/></radialGradient>
  <radialGradient id="young-fruit" cx=".28" cy=".24"><stop stop-color="#dce7a3"/><stop offset=".55" stop-color="#9bac65"/><stop offset="1" stop-color="#638048"/></radialGradient>
  <radialGradient id="flesh" cx=".36" cy=".36"><stop stop-color="#fbd3b8"/><stop offset=".45" stop-color="#efa198"/><stop offset="1" stop-color="#c45166"/></radialGradient>
  <radialGradient id="stone" cx=".28" cy=".23"><stop stop-color="#d5b58a"/><stop offset=".6" stop-color="#a68158"/><stop offset="1" stop-color="#705237"/></radialGradient>
  <radialGradient id="ovary" cx=".25" cy=".27"><stop stop-color="#e3e8ac"/><stop offset=".5" stop-color="#b5c779"/><stop offset="1" stop-color="#749155"/></radialGradient>
  <radialGradient id="bee-gold" cx=".3" cy=".23"><stop stop-color="#f2db91"/><stop offset=".65" stop-color="#c7a356"/><stop offset="1" stop-color="#8c703f"/></radialGradient>
  <filter id="background-soft"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="botanical-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="1" dy="5" stdDeviation="4" flood-color="#4b4a31" flood-opacity=".17"/></filter>
  <filter id="inset-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#36503a" flood-opacity=".1"/></filter>
  <path id="cherry-outline" d="M0 -69 C-19 -82 -66 -75 -77 -40 C-96 17 -49 80 -7 88 C34 91 82 36 81 -14 C80 -57 43 -82 17 -71 Q7 -66 0 -69Z"/>
  <clipPath id="cherry-mask"><use href="#cherry-outline"/></clipPath>
  <path id="petal-outline" d="M0 9 C-27 -12 -57 -51 -48 -81 C-42 -106 -17 -119 -4 -112 Q0 -103 5 -112 C29 -117 51 -98 49 -76 C51 -44 22 -7 0 9Z"/>
</defs>`;
function orchardLeaf(x: number, y: number, scale: number, angle: number) {
  const points = Array.from({ length: 46 }, (_, i) => {
    const a = Math.PI * 2 * i / 46;
    const r = i % 2 ? 1 : .93;
    return `${63 + Math.cos(a) * 63 * r},${Math.sin(a) * 27 * r}`;
  }).join(' ');
  const veins = Array.from({ length: 8 }, (_, i) => {
    const vx = 16 + i * 12;
    return `<path d="M${vx} 0 Q${vx + 5} -11 ${vx + 17} -${Math.sin(vx / 126 * Math.PI) * 24} M${vx} 0 Q${vx + 5} 11 ${vx + 17} ${Math.sin(vx / 126 * Math.PI) * 24}"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})" filter="url(#botanical-shadow)"><polygon points="${points}" fill="url(#leaf-green)" stroke="#6e8e4e" stroke-width=".8"/><g fill="none" stroke="#c7d49a" stroke-width=".8" opacity=".65">${veins}<path d="M0 0 H125" stroke-width="1.7"/></g></g>`;
}
function blossom() {
  const petals = Array.from({ length: 5 }, (_, i) => {
    const veins = Array.from({ length: 5 }, (_, j) => `<path d="M0 3 Q${-22 + j * 11} -48 ${-34 + j * 17} -${85 + (j % 2) * 15}"/>`).join('');
    return `<g transform="rotate(${i * 72 + 11})"><use href="#petal-outline" fill="url(#petal)" stroke="#d9b8b9" stroke-width=".8"/><g fill="none" stroke="#dfaeb8" stroke-width=".65" opacity=".42">${veins}</g><path d="M-41 -83 Q-38 -104 -15 -109" fill="none" stroke="#fffdf5" stroke-width="2" opacity=".75"/></g>`;
  }).join('');
  const stamens = Array.from({ length: 28 }, (_, i) => {
    const a = i * Math.PI * 2 / 28, r = 34 + i % 4 * 5;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    return `<path d="M${Math.cos(a) * 9} ${Math.sin(a) * 9} Q${x * .67 - 3} ${y * .67} ${x} ${y}" fill="none" stroke="#cdb77f" stroke-width="1.1"/><ellipse cx="${x}" cy="${y}" rx="2.8" ry="1.8" fill="#caa052" transform="rotate(${i * 13} ${x} ${y})"/><circle cx="${x - .6}" cy="${y - .5}" r=".8" fill="#f3dba0"/>`;
  }).join('');
  return `<g transform="translate(274 265)" filter="url(#botanical-shadow)">${petals}<circle r="44" fill="url(#flower-center)"/>${stamens}<path d="M0 12 Q-5 0 1 -15" fill="none" stroke="#94a56d" stroke-width="5" stroke-linecap="round"/><ellipse cx="1" cy="-15" rx="7" ry="4" fill="#a3b477"/></g>`;
}
function bee() {
  const hairs = Array.from({ length: 24 }, (_, i) => {
    const a = i * Math.PI * 2 / 24;
    return `<path d="M${Math.cos(a) * 16} ${Math.sin(a) * 17} l${Math.cos(a) * 4} ${Math.sin(a) * 4}"/>`;
  }).join('');
  return `<g transform="translate(132 252) rotate(-6)"><g><g stroke="#695d45" stroke-width="1.5" fill="none"><path d="M-7 14 l-12 14 -11 -1 M5 16 l2 20 9 5 M14 12 l17 16 10 -3"/><path d="M-8 -13 l-14 -15 -11 3 M6 -14 l2 -19 8 -4 M17 -12 l16 -12 9 2"/></g><g fill="#f9fcf5" fill-opacity=".7" stroke="#b2c5bb" stroke-width="1"><path d="M-1 1 C-46 -6 -59 -38 -34 -42 Q-7 -43 8 -6Z"/><path d="M2 -3 C-9 -43 10 -58 26 -42 Q43 -27 11 8Z"/></g><path d="M-3 -2 Q-29 -18 -41 -36 M8 -5 Q9 -25 18 -40" fill="none" stroke="#adc2b7" stroke-width=".7"/><ellipse cx="-19" cy="3" rx="25" ry="17" fill="url(#bee-gold)"/><path d="M-33 -10 Q-26 2 -33 16 M-21 -13 Q-14 3 -20 20" stroke="#514736" stroke-width="6" fill="none"/><ellipse rx="17" ry="18" fill="#9f8552"/><g stroke="#d7c08a" stroke-width=".9" fill="none">${hairs}</g><ellipse cx="21" cy="-1" rx="13" ry="12" fill="#544e3d"/><ellipse cx="25" cy="-5" rx="4" ry="5" fill="#252c26"/><path d="M25 -9 Q31 -25 39 -20 M30 -3 Q42 -13 45 -7" stroke="#585341" stroke-width="1.5" fill="none"/><path d="M32 6 l10 7" stroke="#6c6249" stroke-width="1.6"/><circle cx="-3" cy="19" r="4" fill="#deb55e"/><circle cx="7" cy="19" r="3" fill="#e5c46d"/></g></g>`;
}
function fruitScale(development: number) {
  return .16+.5*Math.min(1,development)+.34*Math.max(0,Math.min(1,development-1));
}
function cherry(development: number) {
  const ripe=Math.max(0,Math.min(1,development-1)),mature=ripe>.5;
  const freckles = Array.from({ length: 66 }, (_, i) => `<ellipse cx="${-65 + (i * 19.73) % 137}" cy="${-65 + (i * 23.91) % 147}" rx=".85" ry=".65" fill="${mature ? '#f4c9a6' : '#dce5b0'}" opacity=".25"/>`).join('');
  const scale = fruitScale(development);
  return `<g transform="translate(284 290) scale(${scale})" filter="url(#botanical-shadow)"><use href="#cherry-outline" fill="url(#young-fruit)"/><use href="#cherry-outline" fill="url(#cherry-skin)" opacity="${ripe}"/><g clip-path="url(#cherry-mask)">${freckles}<path d="M-48 -49 C-61 -35 -65 -13 -59 7" stroke="#fff8e6" stroke-width="12" stroke-linecap="round" opacity=".43" fill="none"/><ellipse cx="-40" cy="-52" rx="13" ry="7" transform="rotate(-25 -40 -52)" fill="#fffbed" opacity=".66"/><path d="M10 -68 Q27 -14 10 76" stroke="${mature ? '#602233' : '#71894d'}" stroke-width="1.4" fill="none" opacity=".35"/></g><ellipse cx="6" cy="-67" rx="11" ry="4" fill="${mature ? '#4e3f31' : '#647649'}"/></g>`;
}
let stage=0,shown=0;
let cancelGrowth: () => void = () => {};
function seek(target:number) {
  cancelGrowth();stage=target;
  cancelGrowth=animateValue({from:shown,to:target,duration:1500,onUpdate:value=>{shown=value;draw();}});
}
el('pollinate').addEventListener('click',()=>seek(1));
el('next').addEventListener('click',()=>{if(stage>0)seek(Math.min(3,stage+1));});
el('reset').addEventListener('click',()=>seek(0));

function draw() {
  const fruit=Math.max(0,shown-1),petals=1-Math.min(1,fruit),ripeness=Math.max(0,fruit-1);
  const backdrop = `<rect width="760" height="530" fill="url(#orchard)"/><circle cx="527" cy="113" r="270" fill="url(#sunlight)"/><g filter="url(#background-soft)" opacity=".36"><path d="M-32 526 Q116 246 75 -21" stroke="#8a9b71" stroke-width="27" fill="none"/><ellipse cx="60" cy="91" rx="110" ry="46" fill="#8ca377" transform="rotate(-25 60 91)"/><ellipse cx="731" cy="295" rx="105" ry="54" fill="#a5b68b" transform="rotate(-45 731 295)"/><circle cx="81" cy="369" r="47" fill="#fff7ec"/><circle cx="388" cy="443" r="58" fill="#a3b988"/></g><g fill="#fffbea" opacity=".5"><circle cx="413" cy="52" r="18"/><circle cx="66" cy="288" r="12"/><circle cx="704" cy="68" r="23"/></g>`;
  const barkMarks = Array.from({ length: 18 }, (_, i) => `<path d="M${49 + i * 23} ${143 - 34 * Math.pow((49 + i * 23 - 200) / 270, 2)} l${4 + i % 5} ${-2 + i % 3}" stroke="${i % 2 ? '#bfab83' : '#3f3c2e'}" stroke-width="1.4" opacity=".65"/>`).join('');
  let specimen = `<path d="M-22 122 Q125 143 223 140 T469 109" stroke="url(#bark)" stroke-width="17" fill="none" stroke-linecap="round"/><path d="M-18 118 Q121 137 221 136 T465 105" stroke="#d2b58e" stroke-width="2.1" fill="none" opacity=".4"/>${barkMarks}<path class="fruit-stalk" d="M295 137 Q305 195 ${284+5*fruitScale(fruit)} ${290-66*fruitScale(fruit)}" fill="none" stroke="url(#stalk)" stroke-width="5" stroke-linecap="round"/>` + orchardLeaf(351,131,.8,-27) + orchardLeaf(171,143,.8,143);
  if(petals>0)specimen+=`<g opacity="${petals}" transform="translate(0 ${18*(1-petals)})">${blossom()}</g>`;
  if(fruit>0)specimen+=cherry(fruit);
  if (fruit>0 && fruit<2) specimen += `<g fill="#d0aaa0" stroke="#ac887b" stroke-width=".8" opacity=".75"><path d="M238 299 Q211 331 225 355 Q246 342 238 299Z"/><path d="M319 322 Q344 337 345 363 Q324 355 319 322Z"/></g>`;
  if (shown>0 && shown<2) specimen += `<g opacity="${Math.min(1,shown)*(1-Math.max(0,shown-1))}">${bee()}</g>` + `<g fill="#d6a143"><circle cx="275" cy="246" r="2.8"/><circle cx="280" cy="251" r="2"/><circle cx="270" cy="250" r="1.8"/></g>`;
  const sectionBlend=Math.min(1,fruit);
  let inset = `<rect x="485" y="143" width="232" height="306" rx="29" fill="#fffdf4" fill-opacity=".92" stroke="#d9dfca" filter="url(#inset-shadow)"/>` + label(601,176,shown<1.5?t('花心剖面'):t('果实剖面'),'inset-heading');
  if (sectionBlend < 1) {
    inset += `<g opacity="${1-sectionBlend}">`;
    inset += `<path d="M573 305 C556 329 562 376 600 381 C641 382 650 339 628 308 L612 288 L609 221 L593 221 L591 289Z" fill="url(#ovary)" stroke="#718d4e" stroke-width="2"/><path d="M601 232 V305" stroke="#ecedbd" stroke-width="5" opacity=".65"/><path d="M601 305 C574 323 574 360 601 370 C628 360 628 323 601 305Z" fill="#f4edd0" stroke="#cad299" stroke-width="1"/><path d="M601 321 Q577 331 589 353 Q601 367 614 350 Q625 331 601 321Z" fill="#d9bd88" stroke="#b29f6a" stroke-width="1.2"/><path d="M601 324 Q589 331 592 345" fill="none" stroke="#fff4d8" stroke-width="2"/><path d="M588 224 Q582 215 589 211 Q600 207 612 211 Q619 215 613 224Z" fill="#819c55"/><g fill="#bfd085">${[587,593,600,607,613].map((x,i)=>`<circle cx="${x}" cy="${215 - i % 2 * 3}" r="3.3"/>`).join('')}</g>`;
    if (shown > 0) inset += `<g fill="#ddad55" stroke="#b8843c" stroke-width=".8"><circle cx="599" cy="204" r="6"/><circle cx="610" cy="202" r="4"/></g><path pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1-Math.min(1,shown)}" d="M599 210 Q607 248 600 285 C593 310 607 320 603 336" stroke="#cc8651" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    inset += label(601,414,t('子房包着胚珠'),'small')+'</g>';
  }
  if(sectionBlend>0) {
    const flesh = `hsl(${75-65*ripeness} ${40+24*ripeness}% ${77-5*ripeness}%)`;
    inset += `<g opacity="${sectionBlend}"><g transform="translate(601 295) scale(${.55+.15*sectionBlend+.15*ripeness})"><use href="#cherry-outline" fill="${flesh}" stroke="hsl(${94-78*ripeness} 28% 44%)" stroke-width="6"/><path d="M-58 -45 Q-82 6 -45 52" fill="none" stroke="#fff3d1" stroke-width="4" opacity=".45"/><path d="M-11 -37 C-38 -21 -36 37 -9 53 C13 61 38 26 29 -7 C22 -30 3 -45 -11 -37Z" fill="url(#stone)" stroke="#947248" stroke-width="2"/><path d="M-11 -29 Q-28 0 -14 42 M0 -34 Q-13 4 1 45 M16 -21 Q9 12 14 30" fill="none" stroke="#765334" stroke-width="1.1" opacity=".45"/><path d="M-1 -18 C-14 -7 -11 24 1 29 C14 21 17 -4 -1 -18Z" fill="#f2dfb3" stroke="#aa8959" stroke-width="1.1"/><path d="M0 -12 Q-4 2 1 23" fill="none" stroke="#cfb783" stroke-width="1"/></g>` + label(601,414,t('果核里面有种子'),'small')+'</g>';
  }
  const titles=[t('花开了'),t('花粉到达花心'),t('小果实开始长大'),t('樱桃成熟了')];
  scene.innerHTML = defs + backdrop + `<g class="specimen">${specimen}</g>` + `<g class="cutaway">${inset}</g><rect x="125" y="468" width="510" height="37" rx="18" fill="#fdfcef" fill-opacity=".79" stroke="#d7ddc7"/>` + label(380,493,titles[stage]!, 'stage-caption');
result.textContent=[t('花里藏着子房，子房里面有胚珠。先让蜜蜂带来合适的花粉。'),t('花粉到了柱头上，这叫授粉。接下来，花粉管生长，帮助完成受精。'),t('受精后，胚珠发育成种子，子房逐渐发育成果实。花瓣会慢慢凋落。'),t('成熟樱桃的果肉和硬果核来自子房壁；种子藏在硬果核里面。不是花瓣变成了樱桃。')][stage]!;
  el<HTMLButtonElement>('next').disabled=stage===0||stage===3;
  el<HTMLButtonElement>('pollinate').disabled=stage!==0;
}
draw();

mountReadingMode('details:not(.references)');
