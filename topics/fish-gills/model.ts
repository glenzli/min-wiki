const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { x = clamp(x); return x*x*(3-2*x); };

/** Follow one marked dissolved oxygen parcel across the exchange surface. */
export function oxygenAt(progress: number) {
  const p = clamp(progress), enter = smooth(p/.3), cross = smooth((p-.3)/.4), carry = smooth((p-.7)/.3);
  return { enter, cross, carry, x: 706-100*enter+125*carry, y: 72+65*cross,
    stage: p < .23 ? 0 : p < .38 ? 1 : p < .74 ? 2 : 3,
    waterX: 870-290*p, bloodX: 510+350*p };
}
