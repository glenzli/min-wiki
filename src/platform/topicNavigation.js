import catalog from '../../content/catalog.json';
import { mountThemeControl, setContentTheme } from './theme.js';
import './shell.css';

export function mountTopicNavigation(id) {
  const topic = catalog.topics.find(item => item.id === id && item.status === 'published');
  if (!topic) throw new Error(`Unregistered topic: ${id}`);
  const category = catalog.categories.find(item => item.id === topic.category);
  const host = document.getElementById('encyclopedia-nav');
  const nav = document.createElement('nav'); nav.className = 'encyclopedia-nav'; nav.setAttribute('aria-label','百科导航');
  const home = document.createElement('a'); home.href='/'; home.className='encyclopedia-home'; home.textContent='← 小小百科';
  const trail=document.createElement('div'); trail.className='encyclopedia-trail';
  const categoryLink=document.createElement('a'); categoryLink.href=`/?category=${category.id}`; categoryLink.textContent=category.name;
  const current=document.createElement('span'); current.textContent=topic.title; current.setAttribute('aria-current','page');
  trail.append(categoryLink,document.createTextNode(' / '),current);
  nav.append(home,trail); mountThemeControl(nav); host.replaceChildren(nav);
  setContentTheme(topic.theme);
}
