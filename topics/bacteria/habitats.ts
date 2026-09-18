import { t } from './i18n.ts';
export const scenes = {
  yogurt: {
    title: t('发酵的小帮手'),
    text: t('制作酸奶会使用特定的乳酸菌。它们把乳中的糖转化成乳酸，使酸奶有酸味，也帮助奶中的蛋白质形成凝胶。'),
    note: t('不是随便一种细菌都能用来做酸奶。'),
    art: `<ellipse cx="198" cy="234" rx="138" ry="13" fill="#d9d0e4"/><path d="M77 121H325C318 184 278 227 201 229S85 187 77 121" fill="#bfa2cf" stroke="#9271a9" stroke-width="3"/><ellipse cx="201" cy="121" rx="124" ry="31" fill="#fffdf9" stroke="#9271a9" stroke-width="3"/><path d="M117 119Q184 94 244 119T296 115" stroke="#e6dfe9" stroke-width="5" fill="none"/><path d="M265 104L330 38" stroke="#a5a4b6" stroke-width="12" stroke-linecap="round"/><ellipse cx="259" cy="111" rx="27" ry="12" transform="rotate(-24 259 111)" fill="#cfced9"/><circle cx="133" cy="56" r="29" fill="#fff" stroke="#dbcee4" stroke-width="2"/><g fill="#81ac8b" stroke="#477b55" stroke-width="2"><rect x="116" y="43" width="11" height="26" rx="5" transform="rotate(-25 122 56)"/><circle cx="144" cy="52" r="5"/><circle cx="148" cy="64" r="5"/></g><path d="M154 76L167 92" stroke="#ad97bc" stroke-dasharray="4 4" stroke-width="2"/>`,
  },
  soil: {
    title: t('土壤里的回收队'),
    text: t('一些土壤细菌参与分解生物残体，让其中的养分重新进入环境。另一些参与氮循环。它们和真菌等生物一起工作。'),
    note: t('不同细菌做不同工作，并不是每一种都能分解所有东西。'),
    art: `<rect x="45" y="125" width="320" height="119" rx="22" fill="#bda387"/><path d="M45 143Q113 105 192 140T365 130" stroke="#789b69" stroke-width="14" fill="none"/><path d="M205 132V73" stroke="#668653" stroke-width="7"/><path d="M204 100Q147 96 152 56Q202 53 204 100M207 81Q255 85 260 43Q214 36 207 81" fill="#92b578"/><path d="M205 132Q193 160 207 190M204 157L174 175M206 173L228 190" stroke="#eddfbd" stroke-width="4" fill="none"/><path d="M83 167Q90 127 137 158Q123 194 83 167" fill="#8f6c42"/><path d="M88 171L130 157" stroke="#d8bb82" stroke-width="3"/><g fill="#e9dca9"><circle cx="144" cy="186" r="5"/><circle cx="164" cy="211" r="4"/><circle cx="258" cy="166" r="4"/><circle cx="273" cy="213" r="5"/></g><g fill="#779a77" stroke="#486d4b" stroke-width="2"><rect x="95" y="204" width="29" height="12" rx="6" transform="rotate(-19 110 210)"/><rect x="281" y="178" width="28" height="12" rx="6" transform="rotate(25 295 184)"/></g>`,
  },
  gut: {
    title: t('身体里的许多邻居'),
    text: t('肠道里住着许多细菌。有些帮助处理我们难以消化的食物成分。有的通常不引起伤害；有的菌株或特定情境可能引起疾病。'),
    note: t('有益、无害和致病不是靠外形决定的，也不是永远不变的标签。'),
    art: `<path d="M21 67Q82 100 133 66T254 69T389 58V234Q323 211 266 239T135 230T21 240Z" fill="#f4d1bf"/><path d="M21 67Q82 100 133 66T254 69T389 58M21 240Q80 208 135 230T266 239T389 234" stroke="#d59e88" stroke-width="9" fill="none"/><g fill="#8eaf94" stroke="#507a5a" stroke-width="3"><rect x="82" y="115" width="61" height="24" rx="12" transform="rotate(18 112 127)"/><rect x="235" y="170" width="67" height="25" rx="12" transform="rotate(-20 267 182)"/><circle cx="189" cy="151" r="14"/><circle cx="210" cy="164" r="13"/></g><g fill="#c9b068"><circle cx="162" cy="197" r="5"/><circle cx="300" cy="118" r="6"/><circle cx="280" cy="103" r="4"/></g><path d="M65 188q17-37 34 0t34 0" stroke="#a497bb" stroke-width="10" stroke-linecap="round" fill="none"/>`,
  },
} as const;

export type Habitat=keyof typeof scenes;
export const habitatKeys:Habitat[]=['yogurt','soil','gut'];
/** Everyday settings stay separate populations; only the observation card crossfades. */
export function habitatArt(key:Habitat){
 const defs=`<defs><radialGradient id="${key}-cell" cx=".3" cy=".2"><stop stop-color="#dce1b1"/><stop offset=".55" stop-color="#95b28a"/><stop offset="1" stop-color="#587967"/></radialGradient><linearGradient id="${key}-ceramic" x2=".35" y2="1"><stop stop-color="#e6e6d6"/><stop offset=".5" stop-color="#aac2be"/><stop offset="1" stop-color="#678d91"/></linearGradient><linearGradient id="${key}-soil" x2=".2" y2="1"><stop stop-color="#c9ae87"/><stop offset=".55" stop-color="#ab8967"/><stop offset="1" stop-color="#876b50"/></linearGradient><linearGradient id="${key}-gut" x2="0" y2="1"><stop stop-color="#f1e0cd"/><stop offset=".5" stop-color="#f8eddb"/><stop offset="1" stop-color="#ead2bb"/></linearGradient></defs>`;
 let art:string=scenes[key].art;
 art=art.replaceAll('fill="#8eaf94"',`fill="url(#${key}-cell)"`).replaceAll('fill="#81ac8b"',`fill="url(#${key}-cell)"`).replaceAll('fill="#779a77"',`fill="url(#${key}-cell)"`).replace('fill="#bfa2cf"',`fill="url(#${key}-ceramic)"`).replace('fill="#bda387"',`fill="url(#${key}-soil)"`).replace('fill="#f4d1bf"',`fill="url(#${key}-gut)"`).replaceAll('#9271a9','#748f94').replaceAll('#d9d0e4','#d9d5c7');
 if(key==='yogurt')art+=`<path d="M93 145Q126 199 194 213" fill="none" stroke="#f6f5e5" stroke-width="5" opacity=".45"/><path d="M287 83L329 40" stroke="#faf8ed" stroke-width="2.5" stroke-linecap="round"/><path d="M147 123Q185 114 215 125T269 123" fill="none" stroke="#eee5d5" stroke-width="3"/>`;
 if(key==='soil')art+=`${Array.from({length:42},(_,i)=>`<ellipse cx="${55+(i*53)%296}" cy="${155+(i*29)%81}" rx="${1.2+i%3}" ry="${1+i%2}" fill="${i%2?'#ead6b2':'#725c43'}" opacity=".25"/>`).join('')}<path d="M199 147q-14 4-16 18m18-8q15 3 19 15m-13 7q-8 7-7 16m-10-30q-16-1-17 8m37 8q11 0 15 10" stroke="#eadbbe" stroke-width="1.4" fill="none"/><path d="M67 228q22-25 48-18t34-17m-34 17q22 17 42 4" stroke="#dbc99e" stroke-width="1.2" fill="none" opacity=".55"/>`;
 if(key==='gut'){
  const mucus=`<path d="M21 90Q80 118 136 86T255 90T389 82M21 215Q79 187 136 211T265 218T389 210" fill="none" stroke="#b9c4ac" stroke-width="12" opacity=".27"/>`;
  art=art.replace('<g fill="url(#gut-cell)"',mucus+'<g fill="url(#gut-cell)"');
  art+=Array.from({length:18},(_,i)=>{const x=25+i*21,y=69+13*Math.sin(i*.72);return `<path d="M${x} ${y-17}v20" stroke="#bf9a86" stroke-width="1.5" opacity=".5"/>`;}).join('');
 }
 return defs+`<rect width="410" height="280" fill="${key==='soil'?'#ede9d7':key==='gut'?'#f5eade':'#f1eee4'}"/>`+art;
}
