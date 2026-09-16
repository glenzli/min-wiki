import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';

translateDocument(t);
mountTopicNavigation('bacteria');

const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const parts = {
  membrane: [t('细胞膜：有选择的边界'), t('细胞膜把内部和外界分开，也参与控制物质进出。多数细菌在膜外还有细胞壁，帮助维持形状。')],
  dna: [t('DNA：保存遗传信息'), t('DNA携带细菌生长和活动所需的遗传信息。细菌没有像我们细胞那样用膜包围的细胞核；DNA主要集中在叫作“拟核”的区域。')],
  ribosomes: [t('核糖体：制造蛋白质'), t('这些小结构按照遗传信息制造蛋白质。细菌有自己的核糖体；病毒没有，复制时要借用宿主细胞的工具。')],
} as const;
function selectPart(part: keyof typeof parts) {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-part]')) {
    button.setAttribute('aria-pressed', String(button.dataset.part === part));
  }
  for (const key of Object.keys(parts)) {
    el(key).classList.toggle('highlighted', key === part);
    el(key).classList.toggle('dimmed', key !== part);
  }
  el('part-title').textContent = parts[part][0];
  el('part-text').textContent = parts[part][1];
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-part]')) {
  button.addEventListener('click', () => selectPart(button.dataset.part as keyof typeof parts));
}

const scenes = {
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
function selectHabitat(habitat: keyof typeof scenes) {
  const scene = scenes[habitat];
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-habitat]')) {
    button.setAttribute('aria-pressed', String(button.dataset.habitat === habitat));
  }
  el('habitat-title').textContent = scene.title;
  el('habitat-text').textContent = scene.text;
  el('habitat-note').textContent = scene.note;
  el('habitat-art').innerHTML = `<defs><radialGradient id="habitat-cell" cx="30%" cy="25%"><stop stop-color="#d1dcad"/><stop offset=".6" stop-color="#8eaf94"/><stop offset="1" stop-color="#507a5a"/></radialGradient><linearGradient id="ceramic" x2=".3" y2="1"><stop stop-color="#e2d1df"/><stop offset=".55" stop-color="#bfa2cf"/><stop offset="1" stop-color="#9271a9"/></linearGradient></defs>` + scene.art.replaceAll('fill="#8eaf94"','fill="url(#habitat-cell)"').replaceAll('fill="#81ac8b"','fill="url(#habitat-cell)"').replaceAll('fill="#779a77"','fill="url(#habitat-cell)"').replace('fill="#bfa2cf"','fill="url(#ceramic)"');
  el('habitat-art').setAttribute('aria-label', `${scene.title}. ${t('场景示意，不代表真实数量或比例。')}`);
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-habitat]')) {
  button.addEventListener('click', () => selectHabitat(button.dataset.habitat as keyof typeof scenes));
}
selectPart('membrane');
selectHabitat('yogurt');

mountReadingMode('details:not(.references)');
