import { language, languageHref, translateDocument } from '../../src/platform/i18n.ts';
import { families, readGuide, residentsIn, selectFamily, partnerOf, type Resident, type Word } from './model.ts';
import data from './content.json';
import { t } from './i18n.ts';
import { energyResidents, largerPortrait } from './portraitModel.ts';
import { GuidePortraitViewport } from './portraitViewport.ts';
import './style.css';

translateDocument(t);
const residents = data.residents as Resident[];
const state = readGuide(location.search, residents);
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const word = (value: Word) => language === 'en' ? value.en : value.zh;
const appearanceClue = (item: Resident) => {
  const clues: Record<string, string> = {
    sun: t('发光的米粒纹 · 局部暗斑'),
    'red-dwarf': t('橙红辉光 · 细碎的表面亮纹'),
    'white-dwarf': t('蓝白辉光 · 较平滑的热表面'),
    nebula: t('透光云丝 · 暗尘遮挡'),
    'planetary-nebula': t('中心遗迹 · 发光气壳'),
    remnant: t('破碎薄壳 · 交错亮丝'),
    'black-hole': t('展示有周围发光物质的情形'),
  };
  return clues[item.id] ?? '';
};
const familySelect = el<HTMLSelectElement>('guide-family-select');
const objectSelect = el<HTMLSelectElement>('guide-object-select');
const narrowControls = window.matchMedia('(max-width:639px)');
const energyButton = el<HTMLButtonElement>('guide-energy');
let energy = new URLSearchParams(location.search).get('detail') === 'energy';
const createViewport = () => new GuidePortraitViewport(el('guide-stage'), el('guide-fallback'), el('guide-render-status'), el<HTMLButtonElement>('guide-retry'), {
  loading: t('正在准备空间画面…'), failed: t('三维画面暂不可用，仍可阅读和切换对象。'), canvas: t('可转动的天体与空间结构示意；方向键转动，Home 复位。'),
});
let viewport = createViewport();
el('guide-reset').onclick = () => viewport.reset();
energyButton.onclick = () => { energy = !energy; render(true); };

for (const family of families) {
  const option = document.createElement('option'); option.value = family; option.textContent = word(data.families[family]); familySelect.append(option);
}
familySelect.onchange = () => {
  const family = families.find(candidate => candidate === familySelect.value)!;
  state.family = family; state.selected = selectFamily(residents, state.selected, family).id; render(true);
};
objectSelect.onchange = () => choose(objectSelect.value);
function choose(id: string) {
  const item = residents.find(candidate => candidate.id === id)!;
  state.selected = item.id; state.family = item.family;
  render(true);
}
function render(save: boolean) {
  const item = residents.find(candidate => candidate.id === state.selected)!;
  const partner = partnerOf(residents, item);
  familySelect.value = state.family;
  const optionFor = (candidate: Resident) => {
    const option = document.createElement('option'); option.value = candidate.id; option.textContent = word(candidate.name); return option;
  };
  // One grouped native chooser on small screens keeps complete names readable.
  const choices = narrowControls.matches ? families.map(family => {
    const group = document.createElement('optgroup'); group.label = word(data.families[family]);
    group.append(...residentsIn(residents, family).map(optionFor)); return group;
  }) : residentsIn(residents, state.family).map(optionFor);
  objectSelect.replaceChildren(...choices); objectSelect.value = item.id;
  el('guide-kind').textContent = word(data.kinds[item.kind]);
  el('guide-name').textContent = word(item.name);
  el('guide-label').textContent = word(item.label);
  el('guide-identity').textContent = word(item.name);
  el('guide-icon').className = 'resident-art art-' + item.icon;
  el('guide-partner-icon').className = 'resident-art art-' + partner.icon;
  el('guide-partner-name').textContent = word(partner.name);
  const larger = largerPortrait(item.id, partner.id);
  el('guide-stage').dataset.sizing = larger ? 'ordered' : 'windows';
  // Loading/error symbols also preserve known ordering instead of reverting to selection priority.
  el('guide-icon').style.setProperty('--portrait-factor', larger && larger !== item.id ? '.62' : '1');
  el('guide-partner-icon').style.setProperty('--portrait-factor', larger && larger !== partner.id ? '.62' : '1');
  const canShowEnergy = energyResidents.has(item.id);
  energyButton.hidden = !canShowEnergy; energyButton.setAttribute('aria-pressed', String(energy && canShowEnergy));
  energyButton.textContent = energy && canShowEnergy ? t('返回外观') : t('能量示意');
  el('guide-visual-note').textContent = energy && canShowEnergy
    ? item.id === 'white-dwarf' ? t('释放储存的热量') : t('核心核聚变供能')
    : appearanceClue(item);
  el('guide-partner-note').textContent = energy && canShowEnergy && energyResidents.has(partner.id)
    ? partner.id === 'white-dwarf' ? t('释放储存的热量') : t('核心核聚变供能') : appearanceClue(partner);
  const sizeNote = larger
    ? t('大小差异经过压缩：{{larger}}更大，画面不按真实比例。', { larger: word((larger === item.id ? item : partner).name) })
    : t('两个独立近看窗口，用来辨认结构；不作大小或距离比较。');
  el('guide-scale').textContent = sizeNote + ' ' + (energy && canShowEnergy
    ? t('能量箭头表示向外传递，剖面层厚是示意。')
    : t('色彩与细节是教学重建。'));
  el('guide-appearance-note').hidden = energy && canShowEnergy || ![item, partner].some(object => ['star', 'white', 'neutron', 'cloud', 'remnant'].includes(object.icon));
  el('guide-texture-credit').hidden = ![item.id, partner.id].some(id => ['earth', 'moon', 'jupiter', 'neptune'].includes(id));
  viewport.set(item, partner, energy && canShowEnergy);
  el('guide-contrast').textContent = word(item.contrast);
  el('guide-light').textContent = word(item.light);
  el('guide-home').textContent = word(item.home);
  el('guide-clue').textContent = word(item.clue);
  el<HTMLAnchorElement>('guide-open').href = languageHref(item.route);
  el<HTMLAnchorElement>('guide-source').href = item.source;
  el('guide-swap').onclick = () => choose(partner.id);
  if (save) {
    const url = new URL(location.href); url.searchParams.set('object', item.id);
    if (energy && canShowEnergy) url.searchParams.set('detail', 'energy'); else url.searchParams.delete('detail');
    history.replaceState(null, '', url);
  }
}
for (const [index, path] of data.paths.entries()) {
  const article = document.createElement('article');
  const number = document.createElement('span'); number.className = 'guide-route-number'; number.textContent = String(index + 1).padStart(2, '0');
  const heading = document.createElement('h3'); heading.textContent = word(path.title);
  const question = document.createElement('p'); question.textContent = word(path.question);
  const links = document.createElement('ol');
  for (const step of path.steps) {
    const li = document.createElement('li'), link = document.createElement('a');
    link.href = languageHref(step.route); link.textContent = word(step.label); li.append(link); links.append(li);
  }
  article.append(number, heading, question, links); el('guide-paths').append(article);
}
window.addEventListener('popstate', () => { Object.assign(state, readGuide(location.search, residents)); energy = new URLSearchParams(location.search).get('detail') === 'energy'; render(false); });
narrowControls.addEventListener('change', () => render(false));
window.addEventListener('pagehide', () => viewport.dispose());
window.addEventListener('pageshow', event => { if (event.persisted) { viewport = createViewport(); render(false); } });
render(false);
