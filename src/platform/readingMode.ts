import { t } from './i18n.ts';
import './readingMode.css';

/** Presentation only: each topic selects its own deeper explanations. */
export function mountReadingMode(advanced: string): void {
  const header = document.querySelector('main header');
  if (!header || document.querySelector('[data-mode]')) return;
  const explanations = [...document.querySelectorAll<HTMLDetailsElement>(advanced)];
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
    button.addEventListener('click', () => select(mode));
    control.append(button); return button;
  });
  function select(mode: 'kids' | 'academic') {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    explanations.forEach(details => { details.open = mode === 'academic'; });
    hint.textContent = mode === 'kids'
      ? t('先动手观察，再说说你发现了什么。')
      : t('深入说明已展开：继续往下看原理、模型边界与来源。');
  }
  header.append(control, hint);
  select('kids');
}
