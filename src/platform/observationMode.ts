import './observationMode.css';

type ObservationPanel = { label: string; elements: HTMLElement[]; open?: boolean };
type ObservationOptions = { panels?: ObservationPanel[]; fit?: boolean };

/** Owns presentation, focus and scroll only. Never remounts or changes the topic experiment. */
export function mountObservationMode(root: HTMLElement, labels: { enter: string; exit: string }, options: ObservationOptions = {}) {
  const toolbar = document.createElement('div');
  toolbar.className = 'observation-toolbar';
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'observation-toggle';
  button.textContent = labels.enter; button.setAttribute('aria-pressed', 'false');
  toolbar.append(button); root.prepend(toolbar);
  let active = false, scroll = 0;
  let fitFrame = 0, restoreFrame = 0;
  const measure = () => {
    if (active) return;
    const top = Math.ceil(root.getBoundingClientRect().top + window.scrollY + 12);
    root.style.setProperty('--observation-top', `${top}px`);
  };
  const resize = options.fit ? new ResizeObserver(() => { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(measure); }) : null;
  if (resize && root.parentElement) resize.observe(root.parentElement);
  if (options.fit) { window.addEventListener('resize', measure); measure(); }

  const concealed: { element: HTMLElement; inert: boolean }[] = [];
  const ancestors: HTMLElement[] = [];
  const panels = (options.panels ?? []).map((panel, index) => {
    const control = document.createElement('button'); control.type = 'button'; control.textContent = panel.label;
    panel.elements.forEach((element, i) => { element.id ||= `observation-panel-${index}-${i}`; });
    control.setAttribute('aria-controls', panel.elements.map(element => element.id).join(' '));
    const state = { ...panel, control, open: panel.open ?? true, readingOpen: panel.open ?? true };
    const render = () => {
      control.setAttribute('aria-expanded', String(state.open));
      panel.elements.forEach(element => element.classList.toggle('observation-panel-hidden', !state.open));
    };
    control.addEventListener('click', () => { state.open = !state.open; render(); });
    toolbar.insertBefore(control, button); render();
    return { ...state, setOpen(open: boolean) { state.open = open; render(); }, getOpen: () => state.open };
  });
  function setActive(next: boolean) {
    if (active === next) return;
    cancelAnimationFrame(restoreFrame);
    active = next;
    if (active) {
      scroll = window.scrollY;
      for (const panel of panels) { panel.readingOpen = panel.getOpen(); panel.setOpen(false); }
      // Conceal siblings along the ancestor chain, keeping the original experiment DOM alive.
      for (let child: HTMLElement = root; child.parentElement; child = child.parentElement) {
        ancestors.push(child.parentElement); child.parentElement.classList.add('observation-ancestor');
        for (const sibling of child.parentElement.children) {
          if (sibling !== child && sibling instanceof HTMLElement) {
            concealed.push({ element: sibling, inert: sibling.inert }); sibling.inert = true;
            sibling.classList.add('observation-concealed');
          }
        }
        if (child.parentElement === document.body) break;
      }
    } else {
      for (const ancestor of ancestors.splice(0)) ancestor.classList.remove('observation-ancestor');
      for (const { element, inert } of concealed.splice(0)) { element.inert = inert; element.classList.remove('observation-concealed'); }
      for (const panel of panels) panel.setOpen(panel.readingOpen);
    }
    root.classList.toggle('observation-expanded', active);
    document.body.classList.toggle('observation-active', active);
    button.textContent = active ? labels.exit : labels.enter;
    button.setAttribute('aria-pressed', String(active));
    button.focus({ preventScroll: true });
    if (!active) {
      // Wait for fixed-to-flow layout and browser scroll anchoring before restoring reading position.
      restoreFrame = requestAnimationFrame(() => {
        measure(); window.scrollTo({ top: scroll, behavior: 'instant' }); button.focus({ preventScroll: true });
      });
    }
  }
  button.addEventListener('click', () => setActive(!active));
  const escape = (event: KeyboardEvent) => { if (active && event.key === 'Escape') { event.preventDefault(); setActive(false); } };
  document.addEventListener('keydown', escape);
  function dispose() { resize?.disconnect(); cancelAnimationFrame(fitFrame); cancelAnimationFrame(restoreFrame); window.removeEventListener('resize', measure); setActive(false); document.removeEventListener('keydown', escape); window.removeEventListener('pagehide', leave); }
  function leave(event: PageTransitionEvent) { if (!event.persisted) dispose(); }
  window.addEventListener('pagehide', leave);
  return { toolbar, button, setActive, dispose, get active() { return active; } };
}
