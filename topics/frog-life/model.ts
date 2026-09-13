const smooth = (p: number, a: number, b: number) => {
  const x = Math.max(0, Math.min(1, (p - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
export function growthState(progress: number) {
  const p = Math.max(0, Math.min(4, progress));
  const hatch = smooth(p, 0.1, 1);
  const climb = smooth(p, 3.65, 4);
  return {
    hatch, climb, body: smooth(p, 1.6, 3.4),
    hind: smooth(p, 1.15, 2.5), front: smooth(p, 2.25, 3.2),
    tail: smooth(p, 0.15, 0.95) * (1 - smooth(p, 2.5, 3.95)),
    eggs: 1 - smooth(p, 0.35, 0.95),
    x: 457 + 78 * hatch + 217 * climb,
    y: 263 + 21 * hatch - 212 * climb,
    scale: (0.18 + 0.82 * hatch) * (1 + 0.2 * climb),
  };
}
// Corresponding Bézier control points maintain one silhouette throughout metamorphosis.
const tad = [478,266,497,238,552,236,582,259,600,270,605,282,600,290,597,303,579,313,561,316,536,323,498,319,479,306,468,297,468,280,478,266];
const frog = [463,284,468,248,545,228,594,253,603,263,613,271,619,278,628,292,615,300,602,307,549,338,477,334,463,300,460,294,460,289,463,284];
export function bodyPath(amount: number) {
  const points = tad.map((v, i) => v + (frog[i]! - v) * amount);
  return `M${points.slice(0,2).join(' ')}C${points.slice(2).join(' ')}Z`;
}
