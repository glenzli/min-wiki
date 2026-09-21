import './observationMode.css';

/** Presentation only: retain the original DOM, controls and topic experiment state. */
export function mountObservationMode(root: HTMLElement, labels: { enter: string; exit: string }) {
  const bar = document.createElement('div');
  bar.className = 'observation-toolbar';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = labels.enter;
  button.setAttribute('aria-pressed', 'false');
  bar.append(button);
  root.prepend(bar);
  let active = false;
  let scroll = 0;
  const concealed: { element: HTMLElement; inert: boolean }[] = [];
  const ancestors: HTMLElement[] = [];
  function setActive(next: boolean) {
    if (active === next) return;
    active = next;
    if (active) {
      scroll = window.scrollY;
      // Hide only siblings along the root's ancestor chain; never hide the experiment.
      for (let child: HTMLElement = root; child.parentElement; child = child.parentElement) {
        ancestors.push(child.parentElement);
        child.parentElement.classList.add('observation-ancestor');
        for (const sibling of child.parentElement.children) {
          if (sibling !== child && sibling instanceof HTMLElement) {
            concealed.push({ element: sibling, inert: sibling.inert });
            sibling.inert = true;
            sibling.classList.add('observation-concealed');
          }
        }
        if (child.parentElement === document.body) break;
      }
    } else {
      for (const ancestor of ancestors.splice(0)) ancestor.classList.remove('observation-ancestor');
      for (const { element, inert } of concealed.splice(0)) {
        element.inert = inert;
        element.classList.remove('observation-concealed');
      }
    }
    root.classList.toggle('observation-expanded', active);
    document.body.classList.toggle('observation-active', active);
    button.textContent = active ? labels.exit : labels.enter;
    button.setAttribute('aria-pressed', String(active));
    if (!active) { window.scrollTo({ top: scroll, behavior: 'instant' }); button.focus({ preventScroll: true }); }
  }
  button.addEventListener('click', () => setActive(!active));
  const escape = (event: KeyboardEvent) => { if (active && event.key === 'Escape') { event.preventDefault(); setActive(false); } };
  document.addEventListener('keydown', escape);
  const leave = (event: PageTransitionEvent) => { if (!event.persisted) document.removeEventListener('keydown', escape); };
  window.addEventListener('pagehide', leave, { once: true });
}
