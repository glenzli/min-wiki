const running = new WeakMap<HTMLDetailsElement, { animation: Animation; open: boolean }>();

/** Keep native details semantics and focus; rapidly reversed clicks start at the visible height. */
export function setDisclosureOpen(details: HTMLDetailsElement, open: boolean, animate = true): void {
  const current = running.get(details);
  if ((!current && details.open === open) || current?.open === open) return;
  const start = details.getBoundingClientRect().height;
  current?.animation.cancel();
  running.delete(details);
  details.style.removeProperty('height');
  details.style.removeProperty('overflow');
  if (!animate || !details.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    details.open = open;
    return;
  }
  // Measure the actual closed box including topic-specific summary padding/borders.
  details.open = open;
  const end = details.getBoundingClientRect().height;
  details.open = true;
  details.style.overflow = 'hidden';
  const animation = details.animate([
    { height: `${start}px`, boxSizing: 'border-box' },
    { height: `${end}px`, boxSizing: 'border-box' },
  ], {
    duration: 260, easing: 'cubic-bezier(.22,1,.36,1)',
  });
  running.set(details, { animation, open });
  animation.onfinish = () => {
    if (running.get(details)?.animation !== animation) return;
    details.open = open;
    details.style.removeProperty('height');
    details.style.removeProperty('overflow');
    running.delete(details);
  };
}

export function enhanceDisclosure(details: HTMLDetailsElement): void {
  details.querySelector(':scope > summary')?.addEventListener('click', event => {
    if ((event.target as Element).closest('a, button, input')) return;
    event.preventDefault();
    setDisclosureOpen(details, !(running.get(details)?.open ?? details.open));
  });
}
