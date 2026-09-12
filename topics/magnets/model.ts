export type ObjectKind = 'iron' | 'copper' | 'aluminum' | 'wood' | 'magnet';
export type MotionPhase = 'ready' | 'pulling' | 'attached' | 'repelled' | 'unaffected';
export interface Settings { kind: ObjectKind; near: number; flipped: boolean }
export interface Motion { x: number; velocity: number; attached: boolean; impact: number; phase: MotionPhase }
export const homeX = 660;
export const magnetX = (near: number) => 120 + Math.max(0, Math.min(1, near)) * 310;
export const magnetEdge = (near: number) => magnetX(near) + 160;
export const initialMotion = (): Motion => ({ x: homeX, velocity: 0, attached: false, impact: 0, phase: 'ready' });

// Qualitative damped motion, not a numerical magnetic-field model. The small-motion
// threshold represents tray friction; magnetic influence does not start at it.
export function stepMotion(previous: Motion, settings: Settings, elapsed: number): Motion {
  const state = { ...previous };
  const dt = Math.max(0, Math.min(.04, elapsed));
  const contact = magnetEdge(settings.near) + 2;
  const repels = settings.kind === 'magnet' && settings.flipped;
  const attracts = settings.kind === 'iron' || (settings.kind === 'magnet' && !settings.flipped);
  state.impact = Math.max(0, state.impact - dt * 1.8);
  if (!attracts && !repels) {
    return { ...state, x: homeX, velocity: 0, attached: false, phase: settings.near > .65 ? 'unaffected' : 'ready' };
  }
  if (state.attached && attracts) return { ...state, x: contact, velocity: 0, phase: 'attached' };
  if (state.attached && repels) {
    state.attached = false; state.velocity = 330; state.impact = 1; state.phase = 'repelled';
  }
  const gap = Math.max(0, state.x - contact);
  if (attracts && (gap < 175 || state.phase === 'pulling')) {
    state.velocity -= 2100 / (1 + (gap / 74) ** 2) * dt;
    state.phase = 'pulling';
  } else if (repels && gap < 215) {
    state.velocity += 2500 / (1 + (gap / 95) ** 2) * dt;
    state.phase = 'repelled';
  }
  state.velocity *= Math.exp(-3.8 * dt);
  state.x += state.velocity * dt;
  if (attracts && state.x <= contact + 1) {
    state.x = contact; state.velocity = 0; state.attached = true; state.impact = 1; state.phase = 'attached';
  } else if (repels) {
    // Visible wooden end stops bound this one-axis teaching tray.
    if (state.x > 750) {
      state.x = 750;
      state.velocity = Math.abs(state.velocity) < 24 ? 0 : state.velocity * -.24;
    }
    if (state.x < contact + 3) state.x = contact + 3;
  }
  return state;
}
