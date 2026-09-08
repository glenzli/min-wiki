import { t, languageHref, mountLanguageControl } from './i18n.ts';
import catalog from '../../content/catalog.json';
import { mountThemeControl, setContentTheme } from './theme.ts';
import './shell.css';

export function mountTopicNavigation(id: string) {
  const topic = catalog.topics.find(item => item.id === id && item.status === 'published');
  if (!topic) throw new Error(`Unregistered topic: ${id}`);
  const category = catalog.categories.find(item => item.id === topic.category);
  const host = document.getElementById('encyclopedia-nav');
  if (!host || !category) throw new Error('Missing topic navigation host or category');
  const nav = document.createElement('nav'); nav.className = 'encyclopedia-nav'; nav.setAttribute('aria-label',t("百科导航"));
  const home = document.createElement('a'); home.href=languageHref('/'); home.className='encyclopedia-home'; home.textContent=t("← 小小百科");
  const trail=document.createElement('div'); trail.className='encyclopedia-trail';
  const categoryLink=document.createElement('a'); categoryLink.href=languageHref(`/?category=${category.id}`); categoryLink.textContent=t(category.name);
  const current=document.createElement('span'); current.textContent=t(topic.title); current.setAttribute('aria-current','page');
  trail.append(categoryLink,document.createTextNode(' / '),current);
  const preferences = document.createElement('div'); preferences.className = 'encyclopedia-preferences';
  mountThemeControl(preferences); mountLanguageControl(preferences);
  nav.append(home,trail,preferences); host.replaceChildren(nav);
  setContentTheme(topic.theme);
}
