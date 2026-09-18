const clamp = (x: number) => Math.max(0, Math.min(1, x));
export function riverPoint(q: number, condition: number): [number, number] {
 const bend = [92, -190, 16][condition] ?? 92;
 const control = [[400,88],[370+bend,176],[370+bend,201],[373+bend,250],[376+bend,299],[310-bend,360],[438,449]];
 const bounded = clamp(q), j = bounded < .5 ? 0 : 3, u = bounded < .5 ? bounded * 2 : (bounded - .5) * 2, v = 1 - u;
 return [0,1].map(k => v**3*control[j]![k]! + 3*v*v*u*control[j+1]![k]! + 3*v*u*u*control[j+2]![k]! + u**3*control[j+3]![k]!) as [number, number];
}
export function bankPoint(q: number, condition: number, offset: number): [number, number] {
 const center = riverPoint(q, condition), before = riverPoint(q - .002, condition), after = riverPoint(q + .002, condition);
 const a = riverPoint(.26, condition), b = riverPoint(.28, condition), c = riverPoint(.30, condition);
 const side = Math.sign((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])) || 1;
 const dx = after[0]-before[0], dy = after[1]-before[1], length = Math.hypot(dx,dy);
 return [center[0] + dy / length * side * offset, center[1] - dx / length * side * offset];
}
/** One selected bend, not a complete sediment budget or a hydrodynamic solver. */
export function riverGrain(progress: number, index: number, condition: number) {
 const raw = clamp((clamp(progress) - .25 - index * .012) / .45), f = raw * raw * (3 - 2 * raw);
 const start = bankPoint(.235 + index*.004,condition,35 + index%3*2);
 const middle = riverPoint(.37 + index*.002,condition);
 const end = bankPoint(.415 + index*.004,condition,-29 + index%3*3);
 const x = (1-f)**2*start[0] + 2*(1-f)*f*middle[0] + f*f*end[0];
 const y = (1-f)**2*start[1] + 2*(1-f)*f*middle[1] + f*f*end[1];
 return { id:index, x,y, departed:raw>0, deposited:raw>=1, fraction:f };
}
export function riverParcel(progress: number, index: number, condition: number) {
 const q = .012 + index*.013 + clamp(progress) * (.65 - index*.002);
 const [x,y] = riverPoint(q,condition);
 return {id:index,x,y};
}
