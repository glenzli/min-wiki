import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';

translateDocument(t);
mountTopicNavigation('cells');

type Cell = 'animal' | 'plant' | 'bacterium';
type Part = 'membrane' | 'dna' | 'nucleus' | 'chloroplast';
let cell: Cell = 'animal';
let part: Part = 'membrane';
const el = (id: string): HTMLElement => document.getElementById(id)!;
const cells = {
  animal: { name:t('动物细胞'), tag:t('身体里的一个小单位'), note:t('先找最外面的一圈膜，再找里面装着大部分 DNA 的细胞核。') },
  plant: { name:t('叶肉植物细胞'), tag:t('叶片里的一个小单位'), note:t('绿色的小椭圆是叶绿体。注意：这里看的是叶肉细胞，不是所有植物细胞。') },
  bacterium: { name:t('细菌细胞'), tag:t('一个细胞，也是一个生物'), note:t('它也有膜和 DNA，但 DNA 外面没有细胞核的膜。细菌也是细胞！') },
};
const partNames = { membrane:t('细胞膜'), dna:'DNA', nucleus:t('细胞核'), chloroplast:t('叶绿体') };
const membrane = t('细胞膜把里面与外面分开，也调节一些物质的进出。它不是一堵完全封死的墙。');
const explanations: Record<Cell, Record<Part, string>> = {
  animal: {
    membrane,
    dna:t('DNA 携带遗传信息，参与指导细胞制造所需的物质。这个动物细胞的大部分 DNA 在细胞核里，少量在线粒体里。'),
    nucleus:t('这个动物细胞有一个膜包围的细胞核，大部分 DNA 保存在里面。细胞核不是会思考的小脑袋。'),
    chloroplast:t('动物细胞没有叶绿体。动物不能像绿色叶片那样靠叶绿体进行光合作用。'),
  },
  plant: {
    membrane:t('植物细胞也有细胞膜！膜外还有一层细胞壁，帮助支撑形状。图上较粗的外圈表示细胞壁。'),
    dna:t('叶肉细胞的大部分 DNA 在细胞核里。叶绿体和线粒体也各有少量 DNA，图里没有逐一画出。'),
    nucleus:t('植物细胞也有膜包围的细胞核。图中的大液泡占了不少地方，把细胞核和其他结构挤到旁边。'),
    chloroplast:t('叶绿体捕捉光能，参与把水和二氧化碳变成糖的光合作用。很多根部细胞没有叶绿体，所以不能把所有植物细胞都画成这样。'),
  },
  bacterium: {
    membrane:t('细菌虽小，也有把内部和外部隔开的细胞膜。大多数细菌在膜外还有细胞壁，但它与植物的细胞壁不同。'),
    dna:t('细菌也有 DNA！它主要集中在细胞内的一个区域，叫拟核；这里没有一层核膜把 DNA 包起来。'),
    nucleus:t('细菌没有膜包围的细胞核，但这不等于没有 DNA。点一下 DNA，看遗传物质在什么地方。'),
    chloroplast:t('细菌没有叶绿体。不过，有些细菌能用自己的光合结构进行光合作用，例如蓝细菌。'),
  },
};
const questions = {
  membrane:t('换着看：三种细胞的边界形状一样吗？'),
  dna:t('试着找：哪个细胞的 DNA 没有被细胞核包住？'),
  nucleus:t('有没有细胞核，能帮助我们分辨这几类细胞。'),
  chloroplast:t('记住这个例外：植物的根部细胞通常没有叶绿体。'),
};

function marker(x:number,y:number,n:number) {
  return `<g pointer-events="none"><circle cx="${x}" cy="${y}" r="18" fill="#fffdf4" stroke="#536859" stroke-width="1.5"/><text x="${x}" y="${y+7}" text-anchor="middle" fill="#344d40">${n}</text></g>`;
}
function mitochondrion(x:number,y:number,angle:number) {
  return `<g transform="translate(${x} ${y}) rotate(${angle})"><ellipse rx="39" ry="19" fill="url(#mito)" stroke="#a3634e" stroke-width="3"/><path d="M-26 0q8-17 16 0t16 0t16 0" fill="none" stroke="#a3634e" stroke-width="3"/></g>`;
}
function chloroplast(x:number,y:number,angle:number) {
  return `<g data-structure="chloroplast" transform="translate(${x} ${y}) rotate(${angle})"><ellipse rx="41" ry="24" fill="#87b45d" stroke="#456c38" stroke-width="3"/><path d="M-23-10v20m9-20v20m9-20v20m9-20v20m9-20v20m9-20v20" stroke="#d8eeb0" stroke-width="4"/></g>`;
}
function nucleus(x:number,y:number,r:number) {
  const ry=r*.84;
  const chromatin=Array.from({length:5},(_,i)=>`<path d="M${x-r*.65} ${y+ry*(-.55+i*.26)}c${r*.28} ${-ry*.35} ${r*.32} ${ry*.35} ${r*.55} 0s${r*.42} ${-ry*.21} ${r*.66} ${ry*.12}"/>`).join('');
  return `<defs><radialGradient id="nucleoplasm" cx="35%" cy="25%"><stop stop-color="#e5dce6"/><stop offset="1" stop-color="#baacbf"/></radialGradient><clipPath id="inside-nucleus"><ellipse cx="${x}" cy="${y}" rx="${r-7}" ry="${ry-7}"/></clipPath></defs>
  <g data-structure="nucleus"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${ry}" fill="url(#nucleoplasm)" stroke="#89778f" stroke-width="3"/><ellipse cx="${x}" cy="${y}" rx="${r-5}" ry="${ry-5}" fill="none" stroke="#a090a6" stroke-width="1.4"/>
  <ellipse cx="${x+r*.27}" cy="${y-ry*.25}" rx="${r*.17}" ry="${ry*.18}" fill="#95839f"/><path d="M${x-r*.55} ${y-ry*.66}Q${x-r*.1} ${y-ry*.95} ${x+r*.28} ${y-ry*.73}" fill="none" stroke="#fbf3f7" stroke-width="2" opacity=".7"/></g>
  <g data-structure="dna" clip-path="url(#inside-nucleus)" fill="none" stroke="#887192" stroke-width="2.5" stroke-linecap="round">${chromatin}</g>${marker(x-r*.65,y+ry*.7,2)}${marker(x+r*.85,y-ry*.7,3)}`;
}

let drawnCell: Cell | undefined;
function draw() {
  if (drawnCell === cell) { highlightPart(); return; }
  drawnCell = cell;
  const material = `<defs><radialGradient id="cytoplasm" cx="32%" cy="25%"><stop stop-color="#faecdf"/><stop offset=".65" stop-color="#edd1bd"/><stop offset="1" stop-color="#d4aa95"/></radialGradient><radialGradient id="mito"><stop stop-color="#f2c5a0"/><stop offset="1" stop-color="#c38d70"/></radialGradient></defs>`;
  let shapes = '';
  if (cell === 'animal') {
    shapes = `<g data-structure="membrane"><path d="M163 155C208 47 392 50 503 107S648 269 566 365S339 450 214 388S106 258 163 155Z" fill="url(#cytoplasm)" stroke="#b97766" stroke-width="11"/></g>
      <g fill="#c09374" opacity=".55"><circle cx="222" cy="228" r="5"/><circle cx="422" cy="161" r="5"/><circle cx="470" cy="351" r="5"/><circle cx="338" cy="375" r="5"/><circle cx="472" cy="249" r="5"/><circle cx="260" cy="148" r="5"/><circle cx="304" cy="190" r="5"/></g>
      <g fill="#a77e68" opacity=".4">${Array.from({length:78},(_,i)=>{const a=i*2.3998,r=105+(i*19)%65;return `<circle cx="${357+Math.cos(a)*r*1.2}" cy="${247+Math.sin(a)*r*.83}" r="${1.1+i%2}"/>`;}).join('')}</g>
      <g fill="none" stroke="#c9a193" stroke-width="4" opacity=".6"><path d="M253 224Q240 160 304 146T399 142M245 211Q236 150 303 137T409 134M256 197Q261 157 306 158T401 154M406 294q-17 45 30 53m-18-57q-9 31 28 42m-17-45q-3 20 25 29"/></g>
      ${mitochondrion(259,332,-20)}${mitochondrion(471,174,22)}${mitochondrion(502,313,-30)}${nucleus(341,253,80)}${marker(163,174,1)}`;
  } else if (cell === 'plant') {
    shapes = `<rect x="138" y="63" width="449" height="360" rx="48" fill="#b7cb80" stroke="#71924f" stroke-width="13"/>
      <g data-structure="membrane"><rect x="151" y="76" width="423" height="334" rx="37" fill="#e4edc3" stroke="#889d53" stroke-width="5"/></g>
      <rect x="277" y="146" width="244" height="201" rx="71" fill="#edf4e8" stroke="#bdd2b4" stroke-width="3"/>
      ${chloroplast(214,110,0)}${chloroplast(349,106,0)}${chloroplast(502,111,8)}${chloroplast(537,259,90)}${chloroplast(449,381,-4)}${chloroplast(296,380,0)}${mitochondrion(204,355,20)}${nucleus(216,239,52)}${marker(153,156,1)}${marker(412,369,4)}`;
  } else {
    shapes = `<rect x="134" y="127" width="470" height="228" rx="114" fill="#dbc289" stroke="#ad8b45" stroke-width="11"/>
      <g data-structure="membrane"><rect x="147" y="140" width="444" height="202" rx="101" fill="#f4e5b5" stroke="#b3a263" stroke-width="5"/></g>
      <g fill="#b09560" opacity=".7"><circle cx="208" cy="218" r="5"/><circle cx="244" cy="181" r="5"/><circle cx="290" cy="306" r="5"/><circle cx="500" cy="302" r="5"/><circle cx="553" cy="242" r="5"/><circle cx="504" cy="187" r="5"/><circle cx="242" cy="281" r="5"/><circle cx="332" cy="175" r="5"/><circle cx="437" cy="320" r="5"/></g>
      <g data-structure="dna"><path d="M283 235c-18-31 16-53 40-26s28 73 57 47s16-77 47-49s42 66 10 69s-59-46-77-25s-51 39-51 14s-9-29-26-30Z" fill="none" stroke="#8d6540" stroke-width="8" stroke-linecap="round"/></g>${marker(148,232,1)}${marker(376,286,2)}`;
  }
  el('drawing').innerHTML = material + shapes;
  highlightPart();
}
function highlightPart() {
  for (const node of document.querySelectorAll<SVGElement>('#drawing [data-structure]')) {
    node.classList.toggle('selected',node.dataset.structure === part);
  }
  // Native buttons expose the same structure actions to keyboard and screen-reader users.
  el('cell-scene').setAttribute('aria-label',t('{{cell}}结构示意图；当前观察：{{part}}。使用结构按钮探索。',{cell:cells[cell].name,part:partNames[part]}));
}
function render() {
  const present = !(part === 'nucleus' && cell === 'bacterium') && !(part === 'chloroplast' && cell !== 'plant');
  el('specimen-name').textContent = cells[cell].name;
  el('specimen-tag').textContent = cells[cell].tag;
  el('observation').textContent = cells[cell].note;
  el('part-title').textContent = partNames[part];
  el('part-description').textContent = explanations[cell][part];
  el('part-question').textContent = questions[part];
  el('presence').textContent = !present ? t('这里没有这种结构') : part === 'membrane' || part === 'dna' ? t('这三种都有') : t('在这张图里找一找');
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-cell]')) button.setAttribute('aria-pressed',String(button.dataset.cell === cell));
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-part]')) button.setAttribute('aria-pressed',String(button.dataset.part === part));
  draw();
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-cell]')) {
  button.addEventListener('click',() => { cell = button.dataset.cell as Cell; render(); });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-part]')) {
  button.addEventListener('click',() => { part = button.dataset.part as Part; render(); });
}
el('cell-scene').addEventListener('click',(event) => {
  const structure = (event.target as Element).closest<SVGElement>('[data-structure]')?.dataset.structure;
  if (structure) { part = structure as Part; render(); }
});
render();

mountReadingMode('details:not(.references)');
