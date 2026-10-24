import type { View } from './projectModel.ts';
import { t } from './i18n.ts';

/** Presentation-only controls. The controller owns selection, process state and
 * renderer capability; this owner moves the original inputs without cloning. */
export function mountVolcanoControls(options: {
  root: HTMLElement; toolbar: HTMLElement; notes: HTMLElement;
  section(enabled: boolean): void; restart(): void;
}) {
  const { root, toolbar, notes } = options;
  const get = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const lifetime = new AbortController();
  const listen = (target: EventTarget, type: string, fn: EventListener) => target.addEventListener(type, fn, { signal: lifetime.signal });
  root.classList.add('volcano-compact');
  toolbar.classList.add('volcano-toolbar');
  const questions = toolbar.querySelector<HTMLDetailsElement>('.observation-choices')!;
  questions.classList.add('volcano-questions');
  const explanation = toolbar.querySelector<HTMLButtonElement>('[data-reader-explanation]')!;
  explanation.textContent = t('讲解');
  // Reading depth belongs beside the explanation, not among learning questions.
  const reading = root.querySelector<HTMLElement>('.reading-mode');
  if (reading) {
    notes.prepend(reading);
    listen(reading, 'click', event => {
      const choice = (event.target as Element).closest<HTMLButtonElement>('button[data-mode]');
      choice?.focus({ preventScroll: true });
    });
  }

  const camera = document.createElement('details'); camera.className = 'volcano-menu volcano-camera'; camera.id = 'camera-menu';
  const cameraSummary = document.createElement('summary');
  const cameraName = document.createElement('span'); cameraName.id = 'camera-name'; cameraSummary.append(cameraName);
  const cameraPanel = document.createElement('div'); cameraPanel.className = 'volcano-menu-panel';
  const views = get('views'), reset = get<HTMLButtonElement>('reset-orbit'); reset.textContent = t('复位镜头');
  const hints = document.createElement('label'); hints.className = 'volcano-check';
  const hintInput = document.createElement('input'); hintInput.type = 'checkbox'; hintInput.checked = true;
  hints.append(hintInput, document.createTextNode(t('显示过程提示')));
  cameraPanel.append(views, reset, hints); camera.append(cameraSummary, cameraPanel);
  listen(views, 'click', () => { camera.open = false; cameraSummary.focus({ preventScroll: true }); });
  listen(reset, 'click', () => { camera.open = false; cameraSummary.focus({ preventScroll: true }); });
  listen(hintInput, 'change', () => { root.dataset.processHints = String(hintInput.checked); });

  const sectionLabel = document.createElement('label'); sectionLabel.className = 'volcano-section volcano-check';
  const section = document.createElement('input'); section.id = 'section-toggle'; section.type = 'checkbox';
  const sectionName = document.createElement('span'); sectionName.textContent = t('剖面');
  sectionLabel.append(section, sectionName);
  listen(section, 'change', () => options.section(section.checked));

  const conditionsButton = document.createElement('button'); conditionsButton.type = 'button'; conditionsButton.id = 'conditions-toggle';
  conditionsButton.textContent = t('改变条件'); conditionsButton.setAttribute('aria-expanded', 'false'); conditionsButton.setAttribute('aria-controls', 'conditions-panel');
  const conditions = document.createElement('section'); conditions.id = 'conditions-panel'; conditions.className = 'volcano-conditions-panel'; conditions.hidden = true;
  conditions.setAttribute('aria-label', t('改变条件'));
  const conditionsHead = document.createElement('div'); conditionsHead.className = 'volcano-panel-heading';
  const title = document.createElement('strong'); title.textContent = t('换个条件，比较看看');
  const close = document.createElement('button'); close.type = 'button'; close.textContent = t('收起条件');
  conditionsHead.append(title, close);
  const inputs = root.querySelector<HTMLElement>('.conditions')!;
  inputs.querySelector('h3')?.remove();
  conditions.append(conditionsHead, get('surface-choice'), get('ocean-life-guide'), inputs); root.append(conditions);
  toolbar.insertBefore(camera, explanation); toolbar.insertBefore(sectionLabel, explanation); toolbar.insertBefore(conditionsButton, explanation);

  const playback = get('play').closest<HTMLElement>('.playback')!;
  const more = document.createElement('details'); more.className = 'volcano-menu volcano-playback-menu';
  const moreSummary = document.createElement('summary'); moreSummary.textContent = t('阶段与速度');
  const morePanel = document.createElement('div'); morePanel.className = 'volcano-menu-panel';
  const rate = get('rate').closest<HTMLElement>('label')!;
  const restart = document.createElement('button'); restart.type = 'button'; restart.id = 'restart-process'; restart.textContent = t('从头观察');
  morePanel.append(get('steps'), rate, restart); more.append(moreSummary, morePanel); playback.append(more);
  listen(restart, 'click', () => { options.restart(); more.open = false; moreSummary.focus({ preventScroll: true }); });
  listen(get('steps'), 'click', () => { more.open = false; moreSummary.focus({ preventScroll: true }); });
  const menus = [questions, camera, more];
  const setConditions = (open: boolean, focus = false) => {
    if (open && explanation.getAttribute('aria-expanded') === 'true') explanation.click();
    conditions.hidden = !open; conditionsButton.setAttribute('aria-expanded', String(open));
    if (open) { menus.forEach(menu => { menu.open = false; }); }
    if (focus) conditionsButton.focus({ preventScroll: true });
  };
  listen(conditionsButton, 'click', () => setConditions(conditions.hidden));
  listen(close, 'click', () => setConditions(false, true));
  for (const menu of menus) listen(menu, 'toggle', () => {
    if (menu.open) { setConditions(false); menus.filter(other => other !== menu).forEach(other => { other.open = false; }); }
  });
  listen(explanation, 'click', () => { setConditions(false); menus.forEach(menu => { menu.open = false; }); });
  listen(document, 'click', event => {
    const target = event.target as Node;
    if (!conditions.hidden && !conditions.contains(target) && !conditionsButton.contains(target)) setConditions(false);
    for (const menu of [camera, more]) if (menu.open && !menu.contains(target)) menu.open = false;
  });
  listen(root, 'keydown', event => {
    const key = event as KeyboardEvent;
    if (key.key !== 'Escape') return;
    if (!conditions.hidden) { key.preventDefault(); key.stopPropagation(); setConditions(false, true); return; }
    for (const menu of [camera, more]) if (menu.open) { key.preventDefault(); key.stopPropagation(); menu.open = false; menu.querySelector('summary')?.focus(); return; }
  });
  const leave = (event: PageTransitionEvent) => { if (!event.persisted) { lifetime.abort(); window.removeEventListener('pagehide', leave); } };
  window.addEventListener('pagehide', leave);
  return {
    sync(state: { label: string; section: boolean; canSection: boolean; canOrbit: boolean; view: View }) {
      cameraName.textContent = state.label; cameraSummary.setAttribute('aria-label', t('镜头：{{view}}', { view: state.label }));
      section.checked = state.section; section.disabled = !state.canSection;
      sectionLabel.dataset.available = String(state.canSection);
      sectionLabel.title = state.canSection ? '' : t('当前二维示意只提供剖面；可重试三维画面。');
      reset.hidden = !state.canOrbit;
      root.dataset.observationView = state.view;
    },
    closeConditions() { setConditions(false); },
  };
}
