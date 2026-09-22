import { t } from './i18n.ts';
import { mountObservationMode } from './observationMode.ts';
import './presentation.css';

type FrameOptions = {
  root: string | HTMLElement;
  visual: string;
  transport?: string;
  choices?: string;
  paired?: boolean;
};

/** Topic-selected DOM only: keeps existing controls, renderer and experiment state alive. */
export function mountPresentationFrame(options: FrameOptions) {
  const root = typeof options.root === 'string' ? document.querySelector<HTMLElement>(options.root) : options.root;
  if (!root || root.classList.contains('presentation-frame')) return;
  const selected = root.querySelector<HTMLElement>(options.visual);
  if (!selected) return;
  let visual = selected;
  if (selected.matches('svg,canvas')) {
    visual = document.createElement('div'); selected.before(visual); visual.append(selected);
  }
  const transport = options.transport ? [...root.querySelectorAll<HTMLElement>(options.transport)] : [];
  const choices = options.choices ? [...document.querySelectorAll<HTMLElement>(options.choices)] : [];
  const stage = document.createElement('div'); stage.className = 'presentation-stage';
  const notes = document.createElement('aside'); notes.className = 'presentation-notes';
  const body = document.createElement('div'); body.className = 'presentation-body';
  const actions = document.createElement('div'); actions.className = 'presentation-transport';
  choices.forEach(node => node.remove());
  stage.append(visual); visual.classList.add('presentation-visual');
  if (options.paired) visual.classList.add('presentation-pair');
  transport.forEach(node => actions.append(node));
  if (actions.childElementCount) stage.append(actions);
  notes.append(...root.childNodes);
  // Former grid wrappers may now contain notes only; preserve their nodes and listeners.
  notes.querySelectorAll<HTMLElement>('.workspace,.workbench,.theater,.scene-column').forEach(node => node.classList.add('presentation-note-group'));
  body.append(stage, notes);
  root.classList.add('presentation-frame'); root.append(body);
  const mode = mountObservationMode(root, { enter: t('沉浸演示'), exit: t('退出沉浸 · Esc') }, {
    fit: true, panels: [{ label: t('解说与设置'), elements: [notes] }],
  });
  if (choices.length) {
    const strip = document.createElement('div'); strip.className = 'presentation-choices';
    strip.append(...choices); mode.toolbar.after(strip);
  }
  document.documentElement.classList.add('presentation-page');
  return { root, notes, stage, mode };
}

/** Wrap an explicitly selected, contiguous set of topic-owned chapter nodes. */
export function presentationGroup(first: string, last: string): HTMLElement {
  const start = document.querySelector<HTMLElement>(first)!;
  const end = document.querySelector<HTMLElement>(last)!;
  if (!start || !end || start.parentElement !== end.parentElement) throw new Error('Presentation group must have sibling bounds');
  const nodes: Node[] = [];
  for (let node: ChildNode | null = start; node; node = node.nextSibling) { nodes.push(node); if (node === end) break; }
  if (nodes.at(-1) !== end) throw new Error('Presentation group bounds are reversed');
  const group = document.createElement('section'); start.before(group); group.append(...nodes);
  return group;
}

/** Keep a long introductory comparison available without pushing the experiment off screen. */
export function foldPresentationContext(selector: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach(node => {
    if (node.parentElement?.classList.contains('presentation-context')) return;
    const details = document.createElement('details'); details.className = 'presentation-context';
    const summary = document.createElement('summary');
    summary.textContent = node.querySelector('h2,h3')?.textContent || t('观察线索与原理');
    node.before(details); details.append(summary, node);
  });
}
