import { t } from './i18n.ts';
import './readingMode.css';
import { enhanceDisclosure, setDisclosureOpen } from './disclosure.ts';

/** Presentation only: each topic selects its own deeper explanations. */
export function mountReadingMode(advanced: string): void {
  const header = document.querySelector('main header');
  if (!header || document.querySelector('[data-mode]')) return;
  const explanations = [...document.querySelectorAll<HTMLDetailsElement>(advanced)];
  explanations.forEach(enhanceDisclosure);
  const control = document.createElement('div');
  control.className = 'reading-mode';
  control.setAttribute('role', 'group');
  control.setAttribute('aria-label', t('讲解方式'));
  const hint = document.createElement('p');
  hint.className = 'reading-mode-hint';
  hint.setAttribute('aria-live', 'polite');
  const choices = [['kids', t('儿童版')], ['academic', t('学术版')]] as const;
  const buttons = choices.map(([mode, label]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.mode = mode; button.textContent = label;
    button.addEventListener('click', () => {
      select(mode);
      const url = new URL(location.href);
      if (mode === 'academic') url.searchParams.set('reading', mode);
      else url.searchParams.delete('reading');
      history.replaceState(null, '', url);
    });
    control.append(button); return button;
  });
  function select(mode: 'kids' | 'academic', animate = true) {
    document.documentElement.dataset.readingMode = mode;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    explanations.forEach(details => setDisclosureOpen(details, mode === 'academic', animate));
    hint.textContent = mode === 'kids'
      ? t('先动手观察，再说说你发现了什么。')
      : t('深入说明已展开：查看原理、模型边界与来源。');
  }
  header.append(control, hint);
  select(new URLSearchParams(location.search).get('reading') === 'academic' ? 'academic' : 'kids', false);
}
