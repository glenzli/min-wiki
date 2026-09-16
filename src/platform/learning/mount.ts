import { language, t } from '../i18n.ts';
import { enhanceDisclosure, setDisclosureOpen } from '../disclosure.ts';
import { narrationStoryboard, narrationText, type TopicLearning } from './model.ts';
import './style.css';

// Lazy content chunks keep every other topic's prose out of the current page.
const resources = import.meta.glob<TopicLearning>('../../../topics/*/learning.json', { import: 'default' });

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function downloadLink(name: string, content: string, label: string): HTMLAnchorElement {
  const link = element('a', 'learning-download', label);
  // Small authored text files need no transient blob or programmatic click.
  // A real link also supports the browser's Save Link As and keyboard actions.
  link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
  link.download = name;
  return link;
}

export async function mountTopicLearning(id: string): Promise<void> {
  const load = resources[`../../../topics/${id}/learning.json`];
  if (!load || document.getElementById('learning-companion')) return;
  const data = await load();
  const content = language === 'en' ? data.en : data.zh;
  const main = document.querySelector('main');
  if (!main) return;
  const section = element('section', 'learning-companion');
  section.id = 'learning-companion';
  section.setAttribute('aria-labelledby', 'learning-title');

  const heading = element('div', 'learning-heading');
  const title = element('h2', 'learning-title', t('带着问题，再看一遍'));
  title.id = 'learning-title';
  heading.append(element('p', 'learning-kicker', t('观察 · 理解 · 讲述')), title);
  const task = element('div', 'learning-task');
  const predict = element('div', 'learning-predict');
  predict.append(element('span', 'learning-label', t('先猜一猜')), element('p', '', content.question));
  const observe = element('div', 'learning-observe');
  observe.append(element('span', 'learning-label', t('动手找答案')), element('p', '', content.observe));
  task.append(predict, observe);

  const academic = element('details', 'learning-details learning-academic');
  academic.id = 'academic-notes';
  const academicSummary = element('summary', 'learning-summary');
  academicSummary.append(element('span', '', t('学术笔记')), element('span', 'learning-summary-note', t('原理、证据与适用条件')));
  const academicBody = element('div', 'learning-detail-body');
  const chapters = element('div', 'learning-chapters');
  content.academic.forEach((note, index) => {
    const article = element('article', 'learning-chapter');
    const number = element('span', 'learning-number', String(index + 1).padStart(2, '0'));
    number.setAttribute('aria-hidden', 'true');
    const text = element('div', 'learning-chapter-text');
    text.append(element('h3', '', note.title), element('p', '', note.body));
    article.append(number, text); chapters.append(article);
  });
  const distinctions = element('div', 'learning-distinctions');
  for (const [label, text] of [[t('容易误解的地方'), content.misconception], [t('演示与现实的距离'), content.boundary]]) {
    const note = element('div', 'learning-distinction');
    note.append(element('h3', '', label), element('p', '', text));
    distinctions.append(note);
  }
  const references = element('div', 'learning-references');
  references.append(element('h3', '', t('依据与延伸阅读')));
  const sources = element('ul', 'learning-sources');
  data.references.forEach(source => {
    const item = element('li', '');
    const link = element('a', '', source.title);
    link.href = source.url;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    item.append(link); sources.append(item);
  });
  references.append(sources);
  academicBody.append(chapters, distinctions, references);
  academic.append(academicSummary, academicBody);

  const narration = element('details', 'learning-details learning-narration');
  narration.id = 'narration';
  const narrationSummary = element('summary', 'learning-summary');
  narrationSummary.append(element('span', '', t('讲给孩子听')), element('span', 'learning-summary-note', t('一段可以慢慢讲的解说')));
  const narrationBody = element('div', 'learning-detail-body');
  const toolbar = element('div', 'learning-toolbar');
  const actions = element('div', 'learning-downloads');
  const spoken = downloadLink(`${id}.${language === 'en' ? 'en' : 'zh'}.txt`, narrationText(content), t('下载纯口播稿'));
  const storyboard = downloadLink(`${id}.${language === 'en' ? 'en' : 'zh'}.storyboard.txt`, narrationStoryboard(content), t('下载分镜稿'));
  actions.append(spoken, storyboard);
  const cueLabel = element('label', 'learning-cue-toggle');
  const showCues = document.createElement('input'); showCues.type = 'checkbox';
  cueLabel.append(showCues, document.createTextNode(t('显示画面提示')));
  toolbar.append(actions, cueLabel);
  narrationBody.append(toolbar);
  const script = element('ol', 'learning-script');
  content.narration.forEach((segment, index) => {
    const item = element('li', 'learning-segment');
    item.append(element('span', 'learning-segment-number', String(index + 1).padStart(2, '0')));
    const words = element('div', 'learning-segment-words');
    words.append(element('h3', '', segment.label), element('p', '', segment.text));
    const cue = element('p', 'learning-cue', segment.cue); cue.hidden = true;
    words.append(cue); item.append(words); script.append(item);
  });
  showCues.addEventListener('change', () => script.querySelectorAll<HTMLElement>('.learning-cue').forEach(cue => { cue.hidden = !showCues.checked; }));
  narrationBody.append(script);
  narration.append(narrationSummary, narrationBody);
  section.append(heading, task, academic, narration);
  // Older space experiences have a viewport-height flex shell. Put long-form
  // notes outside that shell so expanding them never steals the theater's height.
  if (main.classList.contains('experience')) (main.closest('.app-shell') ?? main).after(section);
  else main.append(section);
  enhanceDisclosure(academic); enhanceDisclosure(narration);

  const activeMode = document.querySelector<HTMLButtonElement>('button[data-mode][aria-pressed="true"]');
  setDisclosureOpen(academic, activeMode?.dataset.mode === 'academic', false);
  document.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-mode]');
    if (button) setDisclosureOpen(academic, button.dataset.mode === 'academic');
  });
  const jump = element('a', 'learning-jump', t('解说稿'));
  jump.href = '#narration';
  jump.addEventListener('click', () => setDisclosureOpen(narration, true, false));
  document.querySelector('.encyclopedia-preferences')?.prepend(jump);
  if (location.hash === '#narration' || location.hash === '#academic-notes' || location.hash === '#learning-companion') {
    const target = location.hash === '#narration' ? narration : location.hash === '#academic-notes' ? academic : section;
    if (target instanceof HTMLDetailsElement) setDisclosureOpen(target, true, false);
    requestAnimationFrame(() => target.scrollIntoView());
  }
}
