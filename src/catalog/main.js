import catalogData from '../../content/catalog.json';
import { findTopics, readFilters, topicHref, validateCatalog, PAGE_SIZE } from './model.js';
import { mountThemeControl, setContentTheme } from '../platform/theme.js';
import '../platform/shell.css';
const catalog=validateCatalog(catalogData);
const $=id=>document.getElementById(id);
let filters=readFilters(location.search,catalog), limit=PAGE_SIZE;
const published=catalog.topics.filter(topic=>topic.status==='published');
const covers=import.meta.glob(['../../topics/*/cover.svg','../../topics/*/cover-v2.jpg'], { query: '?url', import: 'default', eager: true });
mountThemeControl($('catalog-appearance'));
$('search').value=filters.query;

function categoryButton(id,name,symbol,count) {
  const button=document.createElement('button'); button.type='button'; button.dataset.category=id;
  const icon=document.createElement('span'); icon.textContent=symbol; icon.setAttribute('aria-hidden','true');
  const title=document.createElement('span'); title.textContent=name;
  const total=document.createElement('small'); total.textContent=count;
  button.append(icon,title,total); button.setAttribute('aria-pressed',String(filters.category===id));
  button.addEventListener('click',()=>{ filters.category=id; limit=PAGE_SIZE; render(); });
  return button;
}
$('categories').append(categoryButton('all','全部','▦',published.length),...catalog.categories.map(category=>categoryButton(category.id,category.name,category.symbol,published.filter(topic=>topic.category===category.id).length)));

function topicCard(topic) {
  const link=document.createElement('a'); link.className='topic-card'; link.href=topicHref(topic);
  const art=document.createElement('div'); art.className=`topic-art art-${topic.id}`; art.setAttribute('aria-hidden','true');
  const cover=covers[`../../topics/${topic.id}/cover-v2.jpg`] ?? covers[`../../topics/${topic.id}/cover.svg`];
  if (cover) { const img=document.createElement('img'); img.src=cover; img.alt=''; img.loading='lazy'; art.append(img); }
  else { const mark=document.createElement('span'); mark.className='fallback-cover'; mark.textContent=catalog.categories.find(item=>item.id===topic.category).symbol; art.append(mark); }
  const body=document.createElement('div'); body.className='topic-card-body';
  const category=document.createElement('p'); category.className='card-category'; category.textContent=catalog.categories.find(item=>item.id===topic.category).name+' · 互动演示';
  const title=document.createElement('h3'); title.textContent=topic.title;
  const summary=document.createElement('p'); summary.className='card-summary'; summary.textContent=topic.summary;
  const modes=document.createElement('div'); modes.className='card-modes';
  for(const mode of topic.modes) {const tag=document.createElement('span');tag.textContent=mode;modes.append(tag);}
  const bottom=document.createElement('div'); bottom.className='card-bottom';
  const duration=document.createElement('span'); duration.textContent=topic.duration;
  const action=document.createElement('strong'); action.textContent='开始探索 ↗';
  bottom.append(duration,action); body.append(category,title,summary,modes,bottom);link.append(art,body);return link;
}
function render(syncUrl=true) {
  const category=catalog.categories.find(item=>item.id===filters.category);
  setContentTheme(category?.theme??'light');
  $('collection-title').textContent=category?.name??'全部演示';
  $('collection-description').textContent=category?.description??'每个演示，从一个可以亲眼观察的问题开始。';
  for(const button of $('categories').children) button.setAttribute('aria-pressed',String(button.dataset.category===filters.category));
  const matches=findTopics(catalog,filters);
  $('result-count').textContent=`${matches.length} 个演示`;
  $('topic-grid').classList.toggle('single-topic',matches.length===1);
  $('topic-grid').replaceChildren(...matches.slice(0,limit).map(topicCard));
  $('empty-state').hidden=matches.length>0;
  $('empty-title').textContent=filters.query.trim()?'还没有找到这个问题':'这片知识花园，等着慢慢生长。';
  $('empty-description').textContent=filters.query.trim()?'试试“恒星”“黑洞”或“引力”，也可以清除筛选。':'这个分类暂时还没有演示。先去看看恒星的旅程吧。';
  $('load-more').hidden=matches.length<=limit;
  if(syncUrl) {const url=new URL(location.href);url.search='';if(filters.category!=='all')url.searchParams.set('category',filters.category);if(filters.query)url.searchParams.set('q',filters.query);history.replaceState(null,'',url);}
}
$('search').addEventListener('input',()=>{filters.query=$('search').value;limit=PAGE_SIZE;render();});
$('clear-filters').addEventListener('click',()=>{filters={category:'all',query:''};$('search').value='';limit=PAGE_SIZE;render();$('search').focus();});
$('load-more').addEventListener('click',()=>{limit+=PAGE_SIZE;render();});
window.addEventListener('popstate',()=>{filters=readFilters(location.search,catalog);$('search').value=filters.query;limit=PAGE_SIZE;render(false);});
render(false);
