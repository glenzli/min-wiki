import { language } from '../../../src/platform/i18n.ts';
import words from './content.json';
import { destination, readConditions, type ConditionsState } from './route.ts';
import './style.css';

/** Optional onward discovery follows the study; an active handoff keeps its return navigation. */
export function mountConditionsEntry(host: HTMLElement | null, refresh?: (state:ConditionsState)=>ConditionsState) {
  if (!host) return;
  const c = words[language === 'en' ? 'en' : 'zh'];
  const active = new URLSearchParams(location.search).get('if') === '1';
  const state = readConditions(location.search);
  const link = document.createElement('a');
  link.className = active ? 'conditions-entry' : 'conditions-related-link';
  link.dataset.conditionsEntry = active ? 'return' : 'related';
  link.textContent = active ? '← ' + c.back : c.entry + ' →';
  link.href = destination(location.href, 'earth', state).href;
  if(active&&refresh)link.addEventListener('click',()=>{link.href=destination(location.href,'earth',refresh(readConditions(location.search))).href;});
  if (active) {
    host.prepend(link);
    return;
  }
  const related = host.querySelector<HTMLElement>('nav.related');
  if (related) {
    related.append(link);
    return;
  }
  // Keep recommendations outside an immersive/viewport-fitted observation root.
  const onward = document.createElement('nav');
  onward.className = 'conditions-related';
  onward.dataset.readerProse = '';
  onward.setAttribute('aria-label', c.related);
  const heading = document.createElement('h2'); heading.textContent = c.related;
  onward.append(heading, link);
  host.after(onward);
}
