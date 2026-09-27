import { language, t } from './i18n.ts';
import './sceneReading.css';

type Words = { zh: string; en: string };
export type SceneStudy = {
  child: Words;
  title: Words;
  theory: Words;
  formula?: string;
  terms?: Words;
  evidence: Words;
  limits: Words;
  sources: readonly { title: string; url: string }[];
};

/** Shared reading layout. The selected scene and all scientific claims stay topic-owned. */
export function mountSceneReading(
  observation: HTMLElement,
  options: { id: string; childTarget?: HTMLElement; controls?: HTMLElement },
) {
  const pick = (words: Words) => language === 'en' ? words.en : words.zh;
  const toolbar = observation.querySelector<HTMLElement>('.observation-toolbar');
  const controls = options.controls ?? document.createElement('div');
  controls.classList.add('scene-reading-switch');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', t('讲解方式'));
  if (!options.controls) {
    for (const [mode, label] of [['kids', t('儿童版')], ['academic', t('学术版')]] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mode = mode;
      button.textContent = label;
      controls.append(button);
    }
  }
  toolbar?.insertBefore(controls, toolbar.querySelector('.observation-title')?.nextSibling ?? toolbar.firstChild);

  const section = document.createElement('section');
  section.id = options.id;
  section.className = 'scene-reading-study';
  section.hidden = true;
  section.setAttribute('aria-labelledby', `${options.id}-title`);
  const eyebrow = document.createElement('p');
  eyebrow.className = 'scene-reading-eyebrow';
  eyebrow.textContent = t('当前场景的科学');
  const title = document.createElement('h2');
  title.id = `${options.id}-title`;
  const theory = document.createElement('p');
  theory.className = 'scene-reading-theory';
  const formulaGroup = document.createElement('div');
  formulaGroup.className = 'scene-reading-formula';
  const formulaLabel = document.createElement('span');
  formulaLabel.textContent = t('关系式');
  const formula = document.createElement('code');
  const terms = document.createElement('p');
  formulaGroup.append(formulaLabel, formula, terms);
  const columns = document.createElement('div');
  columns.className = 'scene-reading-columns';
  const evidenceGroup = document.createElement('div');
  const evidenceHeading = document.createElement('h3');
  evidenceHeading.textContent = t('证据与继续研究');
  const evidence = document.createElement('p');
  const sources = document.createElement('ul');
  evidenceGroup.append(evidenceHeading, evidence, sources);
  const limitsGroup = document.createElement('div');
  const limitsHeading = document.createElement('h3');
  limitsHeading.textContent = t('这幅图算了什么');
  const limits = document.createElement('p');
  limitsGroup.append(limitsHeading, limits);
  columns.append(evidenceGroup, limitsGroup);
  section.append(eyebrow, title, theory, formulaGroup, columns);
  let childTarget = options.childTarget;
  function placeStudy(target?: HTMLElement) {
    if (target) {
      target.classList.add('scene-reading-child');
      target.after(section);
    } else observation.append(section);
  }
  placeStudy(childTarget);

  let mode: 'kids' | 'academic' = 'kids';
  let current: SceneStudy | undefined;
  function setMode(next: 'kids' | 'academic') {
    mode = next;
    observation.classList.toggle('scene-reading-academic', mode === 'academic');
    observation.classList.toggle('scene-reading-kids', mode === 'kids');
    for (const button of controls.querySelectorAll<HTMLButtonElement>('button[data-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
    section.hidden = mode !== 'academic';
    if (current && childTarget) childTarget.textContent = pick(current.child);
  }
  controls.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-mode]');
    if (button && controls.contains(button)) {
      const next = button.dataset.mode === 'academic' ? 'academic' : 'kids';
      setMode(next);
      const url = new URL(location.href);
      if (next === 'academic') url.searchParams.set('reading', next);
      else url.searchParams.delete('reading');
      history.replaceState(null, '', url);
    }
  });
  function set(study: SceneStudy) {
    current = study;
    if (childTarget) childTarget.textContent = pick(study.child);
    title.textContent = pick(study.title);
    theory.textContent = pick(study.theory);
    formulaGroup.hidden = !study.formula;
    formula.textContent = study.formula ?? '';
    terms.textContent = study.terms ? pick(study.terms) : '';
    evidence.textContent = pick(study.evidence);
    limits.textContent = pick(study.limits);
    sources.replaceChildren(...study.sources.map(source => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = source.title;
      item.append(link);
      return item;
    }));
  }
  function setChildTarget(target?: HTMLElement) {
    childTarget?.classList.remove('scene-reading-child');
    childTarget = target;
    placeStudy(target);
    if (current && target) target.textContent = pick(current.child);
  }
  setMode(new URLSearchParams(location.search).get('reading') === 'academic' ? 'academic' : 'kids');
  return { element: section, set, setMode, setChildTarget, get mode() { return mode; } };
}
