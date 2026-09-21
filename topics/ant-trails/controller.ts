import { clamp, type State, type Chapter, type Condition } from './model';
export type Scheduler = { request(callback: (time: number) => void): number; cancel(id: number): void };
/** One finite clock owns all worker trajectories. Views never own separate ant simulations. */
export function createAntController(initial: State, scheduler: Scheduler, draw: (state: State, playing: boolean) => void) {
  let state = { ...initial }, playing = false, visible = true, disposed = false, frame = 0, epoch = 0, previous: number | null = null;
  const saved: Record<Condition, number> = { intact: 0, faded: 0, blocked: 0 }; saved[state.condition] = state.time;
  const render = () => { if (!disposed) draw({ ...state }, playing); };
  const pause = () => { playing = false; epoch++; scheduler.cancel(frame); frame = 0; previous = null; render(); };
  function queue() {
    const current = epoch;
    frame = scheduler.request(now => {
      if (disposed || !visible || !playing || epoch !== current) return;
      const elapsed = previous === null ? 0 : clamp(now - previous, 0, 80); previous = now;
      state.time = clamp(state.time + elapsed / 360, 0, 100); saved[state.condition] = state.time;
      if (state.time >= 100) { pause(); return; }
      render(); queue();
    });
  }
  const seek = (time: number) => { pause(); state.time = clamp(time, 0, 100); saved[state.condition] = state.time; render(); };
  render();
  return {
    get state(): State { return { ...state }; },
    get playing() { return playing; },
    play() { if (disposed || !visible || playing || state.chapter === 'body') return; if (state.time >= 100) state.time = 0; playing = true; previous = null; epoch++; render(); queue(); },
    pause, seek,
    chapter(chapter: Chapter) { pause(); state.chapter = chapter; render(); },
    condition(condition: Condition) { pause(); saved[state.condition] = state.time; state.condition = condition; state.time = saved[condition]; render(); },
    patch(patch: Partial<Pick<State, 'part' | 'labels' | 'scent' | 'brood'>>) { state = { ...state, ...patch }; state.brood = clamp(state.brood); render(); },
    visible(active: boolean) { visible = active; if (!active) pause(); },
    dispose() { if (disposed) return; pause(); disposed = true; epoch++; },
  };
}
