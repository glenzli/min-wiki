/** Keep live model state in memory at every observation while bounding URL and
 * link rewrites during an explicitly playing finite process. */
export function createRoutePersistence(options: {
  url: () => URL;
  afterWrite: () => void;
  isPlaying: () => boolean;
}) {
  const events = new AbortController();
  let timer = 0, lastWrite = -Infinity, disposed = false;
  const interval = 500;
  function cancel() { clearTimeout(timer); timer = 0; }
  function flush(push = false) {
    if (disposed) return;
    cancel();
    const url = options.url();
    if (push) history.pushState(null, '', url);
    else history.replaceState(null, '', url);
    lastWrite = performance.now(); options.afterWrite();
  }
  function write(push = false) {
    if (disposed) return;
    const elapsed = performance.now() - lastWrite;
    if (push || !options.isPlaying() || elapsed >= interval) { flush(push); return; }
    if (!timer) timer = window.setTimeout(() => { timer = 0; flush(); }, interval - elapsed);
  }
  // The window capture phase runs before Reader's document-level link handler,
  // so normal links, modified clicks, language changes and copied destinations
  // receive the latest live snapshot rather than the last throttled URL.
  const beforeNavigation = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('a[href]') || target.closest('#language')) { if (timer) flush(); }
  };
  for (const name of ['pointerdown', 'click', 'auxclick', 'contextmenu', 'focusin', 'change'])
    window.addEventListener(name, beforeNavigation, { capture: true, signal: events.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden && timer) flush(); }, { signal: events.signal });
  return { write, flush, cancel, dispose() { if (disposed) return; cancel(); disposed = true; events.abort(); } };
}
