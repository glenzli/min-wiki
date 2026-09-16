export type BloodProcess = 'oxygen' | 'defence' | 'repair';
export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (v: number) => { const p = clamp(v); return p * p * (3 - 2 * p); };
export function redCell(progress: number) {
  const p = clamp(progress);
  return { x: 205 + 520 * p, y: 237 + 9 * Math.sin(p * Math.PI * 2) };
}
export function oxygenPacket(index: number, progress: number) {
  const p = clamp(progress), release = .34 + index * .045;
  const start = redCell(release), current = redCell(p);
  const angle = index * Math.PI / 3;
  const dx = Math.cos(angle) * 25, dy = Math.sin(angle) * 12;
  const f = ease((p - release) / .28);
  return { x: p <= release ? current.x + dx : start.x + dx + (645 + index * 17 - start.x - dx) * f,
    y: p <= release ? current.y + dy : start.y + dy + (414 + index % 2 * 14 - start.y - dy) * f,
    released: p > release, arrived: f === 1 };
}
export function defenceState(progress: number) {
  const p = clamp(progress), exit = ease((p - .16) / .4), approach = ease((p - .56) / .24);
  return { x: 295 + 166 * ease(p / .3) + 152 * approach, y: 232 + 167 * exit,
    squeeze: Math.sin(Math.PI * exit), engulf: ease((p - .77) / .2), exit };
}
export function platelet(index: number, progress: number) {
  const delay = index * .048, p = ease((clamp(progress) - delay) / .44);
  const start = { x: 140 + index * 54, y: 208 + index % 3 * 31 };
  const end = { x: 496 + (index % 4) * 17, y: 314 - Math.floor(index / 4) * 11 };
  return { x: start.x + (end.x - start.x) * p, y: start.y + (end.y - start.y) * p, activation: p, attached: p === 1 };
}
export function repairState(progress: number) {
  const p = clamp(progress);
  return { fibrin: ease((p - .58) / .42), platelets: Array.from({ length: 12 }, (_, i) => platelet(i, p)) };
}

/** A transient endothelial junction, or a fixed injury covered by the plug. */
export function vesselGap(kind: BloodProcess, progress: number) {
  return { center: kind === 'defence' ? 461 : 524,
    halfWidth: kind === 'defence' ? 36 * defenceState(progress).squeeze : kind === 'repair' ? 41 : 0 };
}
export function engulfedTarget(progress: number) {
  const s = defenceState(progress);
  return { x: 651 + (s.x + 22 - 651) * s.engulf, y: 405 + (s.y + 7 - 405) * s.engulf,
    inside: s.engulf === 1 };
}
