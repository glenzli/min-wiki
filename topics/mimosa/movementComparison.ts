import { language } from '../../src/platform/i18n.ts';
import { type PlantCase } from './movementModel.ts';
import content from './movementContent.json';

/** Compares the three mechanisms without merging their experiment clocks. */
export function mountMovementComparison(after: HTMLElement, onSelect: (plant: PlantCase) => void) {
  const copy = (language === 'en' ? content.en : content.zh).comparison;
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, value: string, className = '') => {
    const element = document.createElement(tag);
    element.textContent = value;
    element.className = className;
    return element;
  };
  const section = node('section', '', 'mechanism-compare');
  const title = node('h2', copy.title);
  title.id = 'mechanism-compare-title';
  section.setAttribute('aria-labelledby', title.id);
  const lead = node('p', copy.lead, 'mechanism-compare-lead');
  const grid = node('div', '', 'mechanism-compare-grid');
  const buttons = new Map<PlantCase, HTMLButtonElement>();
  for (const plant of ['mimosa', 'flytrap', 'seedling'] as const) {
    const item = copy.cases[plant];
    const card = node('article', '', 'mechanism-card');
    card.dataset.plant = plant;
    card.append(node('h3', item.name));
    const facts = node('dl', '', 'mechanism-facts');
    for (const [label, value] of [
      [copy.trigger, item.trigger],
      [copy.mover, item.mover],
      [copy.result, item.result],
      [copy.pace, item.pace],
    ]) {
      facts.append(node('dt', label), node('dd', value));
    }
    card.append(facts);
    const science = node('div', '', 'mechanism-science');
    science.append(node('p', item.science));
    const source = node('a', `${copy.source} · ${item.sourceTitle}`);
    source.href = item.sourceUrl;
    source.target = '_blank';
    source.rel = 'noreferrer';
    science.append(source);
    card.append(science);
    const button = node('button', copy.open, 'mechanism-return');
    button.type = 'button';
    button.setAttribute('aria-label', `${copy.open} · ${item.name}`);
    button.addEventListener('click', () => {
      onSelect(plant);
      after.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
    card.append(button);
    buttons.set(plant, button);
    grid.append(card);
  }
  section.append(title, lead, grid, node('p', copy.paceNote, 'mechanism-pace-note'));
  after.insertAdjacentElement('afterend', section);
  return {
    select(plant: PlantCase) {
      for (const [key, button] of buttons) {
        const current = key === plant;
        button.setAttribute('aria-current', current ? 'true' : 'false');
        button.closest<HTMLElement>('.mechanism-card')!.dataset.current = String(current);
      }
    },
    setAcademic(academic: boolean) { section.dataset.depth = academic ? 'academic' : 'children'; },
  };
}
