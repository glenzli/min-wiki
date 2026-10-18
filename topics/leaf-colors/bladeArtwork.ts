import { bladePoint, type BladePose } from './leafMotion.ts';
import { leafRGB, mix, rgb, type Pigments } from './model.ts';

type Point = [number, number];
type Side = -1 | 1;
interface Curve { a: Point; b: Point; c: Point; d: Point }
interface Vein { body: Path2D; line: Path2D; width: number }
type Veinlet = [Point, Point, Point];
interface Mottle { transform: [number, number, number, number, number, number]; tone: number; strength: number }
interface BladeGeometry {
  outline: Path2D;
  leftHalf: Path2D;
  rimLight: Path2D;
  midrib: Path2D;
  ribLight: Path2D;
  petiole: Path2D;
  petioleLight: Path2D;
  veins: Vein[];
  crossVeins: Path2D;
  fineVeins: Path2D;
  reticulum: Path2D;
  lightGrain: Path2D;
  darkGrain: Path2D;
  dryFlecks: Path2D;
  mottles: Mottle[];
}

const fraction = (x: number) => x - Math.floor(x);
const noise = (seed: number) => fraction(Math.sin(seed * 127.1 + 31.7) * 43758.5453);
const between = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const spine = (t: number): Point => [4 * Math.sin(Math.PI * t) - 3 * t, -204 + 368 * t];

// An authored ovate blade, rather than a sine envelope. The broad shoulders
// continue into a rounded lower blade; only the last part of the tip is narrow.
const profile = [0, .055, .14, .28, .43, .56, .69, .81, .91, 1];
const leftWidths = [0, 9, 35, 82, 122, 138, 133, 107, 57, 0];
const rightWidths = [0, 9.5, 38, 86, 127, 139, 136, 111, 60, 0];

function profileSlopes(widths: number[]) {
  const deltas = widths.slice(1).map((width, i) => (width - widths[i]) / (profile[i + 1] - profile[i]));
  return widths.map((_, i) => {
    if (i === 0) return deltas[0];
    if (i === widths.length - 1) return deltas[i - 1];
    if (deltas[i - 1] * deltas[i] <= 0) return 0;
    const before = profile[i] - profile[i - 1], after = profile[i + 1] - profile[i];
    const a = 2 * after + before, b = after + 2 * before;
    return (a + b) / (a / deltas[i - 1] + b / deltas[i]);
  });
}
const leftSlopes = profileSlopes(leftWidths), rightSlopes = profileSlopes(rightWidths);

function widthAt(t: number, side: Side) {
  const widths = side < 0 ? leftWidths : rightWidths, slopes = side < 0 ? leftSlopes : rightSlopes;
  let i = 0;
  while (i < profile.length - 2 && t > profile[i + 1]) i++;
  const h = profile[i + 1] - profile[i], u = (t - profile[i]) / h;
  return (2 * u ** 3 - 3 * u ** 2 + 1) * widths[i]
    + (u ** 3 - 2 * u ** 2 + u) * h * slopes[i]
    + (-2 * u ** 3 + 3 * u ** 2) * widths[i + 1]
    + (u ** 3 - u ** 2) * h * slopes[i + 1];
}

function margin(t: number, side: Side): Point {
  if (t <= 0) return [0, -204];
  if (t >= 1) return [-3, 164];
  const [x, y] = spine(t), taper = Math.sin(Math.PI * t) ** .82;
  const phase = 29.4 * t + .19 * Math.sin(t * 18 + side) + side * .21;
  const tooth = (Math.max(0, Math.cos(phase * Math.PI * 2)) ** 5 - .17) * 1.3 * taper;
  const drift = 1 + .006 * Math.sin(t * 22 + side * 1.2) + .003 * Math.sin(t * 47 - side);
  return [x + side * (widthAt(t, side) * drift + tooth), y];
}

function curveAt(curve: Curve, t: number): Point {
  const s = 1 - t;
  return [
    s ** 3 * curve.a[0] + 3 * s * s * t * curve.b[0] + 3 * s * t * t * curve.c[0] + t ** 3 * curve.d[0],
    s ** 3 * curve.a[1] + 3 * s * s * t * curve.b[1] + 3 * s * t * t * curve.c[1] + t ** 3 * curve.d[1],
  ];
}

function trace(path: Path2D, curve: Curve, bend: (p: Point) => Point) {
  path.moveTo(...bend(curve.a));
  for (let i = 1; i <= 24; i++) path.lineTo(...bend(curveAt(curve, i / 24)));
}

function ribbon(curve: Curve, width: (t: number) => number, bend: (p: Point) => Point) {
  const edges: [Point[], Point[]] = [[], []];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32, p = curveAt(curve, t);
    const before = curveAt(curve, Math.max(0, t - .002)), after = curveAt(curve, Math.min(1, t + .002));
    const dx = after[0] - before[0], dy = after[1] - before[1], length = Math.hypot(dx, dy) || 1;
    const w = width(t) / 2, nx = -dy / length * w, ny = dx / length * w;
    edges[0].push(bend([p[0] + nx, p[1] + ny]));
    edges[1].push(bend([p[0] - nx, p[1] - ny]));
  }
  const path = new Path2D();
  path.moveTo(...edges[0][0]);
  for (const point of edges[0].slice(1)) path.lineTo(...point);
  for (const point of edges[1].reverse()) path.lineTo(...point);
  path.closePath();
  return path;
}

// A fine vascular net is fitted between neighbouring secondary veins. Its
// irregular areoles share edges and end on those veins, unlike scattered marks
// or a regular lattice painted over the blade. It is generated once, unposed.
function reticulate(lower: Curve, upper: Curve, seed: number): Veinlet[] {
  const span = (Math.abs(lower.d[0] - lower.a[0]) + Math.abs(upper.d[0] - upper.a[0])) * .5;
  const gap = Math.abs(lower.a[1] - upper.a[1]) * .65 + Math.abs(lower.d[1] - upper.d[1]) * .35;
  const columns = Math.max(3, Math.round(span / 10.5)), rows = Math.max(2, Math.round(gap / 8.5));
  const sites: Point[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const n = seed + y * 103 + x * 7;
    sites.push([.035 + (x + .17 + noise(n) * .66) / columns * .965, (y + .17 + noise(n + 1) * .66) / rows]);
  }
  const at = ([u, v]: Point): Point => between(curveAt(lower, u), curveAt(upper, u), v);
  const edges: Veinlet[] = [], seen = new Set<string>();
  for (const site of sites) {
    let cell: Point[] = [[.035, 0], [1, 0], [1, 1], [.035, 1]];
    for (const neighbour of sites) {
      if (neighbour === site) continue;
      const nx = (neighbour[0] - site[0]) * span ** 2, ny = (neighbour[1] - site[1]) * gap ** 2;
      const limit = ((neighbour[0] ** 2 - site[0] ** 2) * span ** 2 + (neighbour[1] ** 2 - site[1] ** 2) * gap ** 2) * .5;
      const clipped: Point[] = [];
      for (let i = 0; i < cell.length; i++) {
        const a = cell[i], b = cell[(i + 1) % cell.length];
        const da = a[0] * nx + a[1] * ny - limit, db = b[0] * nx + b[1] * ny - limit;
        if (da <= 1e-8) clipped.push(a);
        if ((da < 0) !== (db < 0)) clipped.push(between(a, b, da / (da - db)));
      }
      cell = clipped;
      if (!cell.length) break;
    }
    for (let i = 0; i < cell.length; i++) {
      const a = cell[i], b = cell[(i + 1) % cell.length];
      const names = [a.map(n => n.toFixed(4)).join(','), b.map(n => n.toFixed(4)).join(',')].sort();
      const key = names.join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      const middle = between(a, b, .5), p = at(a), q = at(b), m = at(middle);
      const dx = q[0] - p[0], dy = q[1] - p[1], length = Math.hypot(dx, dy) || 1;
      const bow = (noise(seed + a[0] * 319 + b[1] * 71) - .5) * Math.min(1.1, length * .16);
      edges.push([p, [m[0] - dy / length * bow, m[1] + dx / length * bow], q]);
    }
  }
  return edges;
}

/** Botanical surface illustration for the retained leaf. Its venation is an
 * authored general dicot pattern, not a species map or a calibrated relief.
 * All geometry shares the lifecycle deformation; this owner has no clock. */
export class BladeArtwork {
  private poseKey = '';
  private geometry?: BladeGeometry;
  private rawReticulum?: Veinlet[];

  outline(pose: BladePose): Path2D { return this.prepare(pose).outline; }

  draw(c: CanvasRenderingContext2D, p: Pigments, pose: BladePose, browning: number): void {
    const g = this.prepare(pose), dry = Math.max(0, Math.min(1, browning));
    const color = mix(mix(leafRGB(p), [81, 102, 46], .10), [126, 83, 45], dry * .79);
    const light = mix(color, [199, 208, 108], .52);
    const dark = mix(color, [22, 53, 30], .62);
    const warm = mix(leafRGB({ ...p, chlorophyll: p.chlorophyll * .55, anthocyanins: p.anthocyanins * .72 }), [126, 83, 45], dry * .79);
    const cool = mix(color, [19, 66, 40], .43);
    const veinColor = mix(color, [200, 207, 119], .48 - dry * .12);
    c.save();
    c.lineJoin = 'round'; c.lineCap = 'round';

    // The stalk sits behind the blade, with a continuous tapered attachment.
    const stalk = c.createLinearGradient(-8, 180, 1, 183);
    stalk.addColorStop(0, rgb(mix(color, [86, 84, 40], .65)));
    stalk.addColorStop(.42, rgb(mix(color, [174, 173, 89], .68)));
    stalk.addColorStop(1, rgb(mix(color, [67, 75, 36], .72)));
    c.fillStyle = stalk; c.fill(g.petiole);
    c.strokeStyle = rgb(mix(color, [222, 218, 143], .7), .6); c.lineWidth = .8; c.stroke(g.petioleLight);

    const body = c.createLinearGradient(-128, -112, 127, 82);
    body.addColorStop(0, rgb(mix(color, light, .88)));
    body.addColorStop(.24, rgb(mix(color, light, .52)));
    body.addColorStop(.49, rgb(mix(color, light, .08)));
    body.addColorStop(.77, rgb(mix(color, dark, .35)));
    body.addColorStop(1, rgb(mix(color, dark, .78)));
    c.shadowColor = '#243d2b24'; c.shadowBlur = 10; c.shadowOffsetY = 5;
    c.fillStyle = body; c.fill(g.outline);
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;

    c.save(); c.clip(g.outline);
    c.fillStyle = rgb(mix(color, light, .7), .08); c.fill(g.leftHalf);
    for (const patch of g.mottles) {
      const patchColor = patch.tone > .14 ? mix(warm, light, .16) : patch.tone < -.14 ? cool : mix(color, dark, .54);
      c.save(); c.transform(...patch.transform);
      const tint = c.createRadialGradient(0, 0, .04, 0, 0, 1);
      tint.addColorStop(0, rgb(patchColor, patch.strength));
      tint.addColorStop(.37, rgb(patchColor, patch.strength * .72));
      tint.addColorStop(1, rgb(patchColor, 0));
      c.fillStyle = tint; c.fillRect(-1, -1, 2, 2); c.restore();
    }

    // Quiet, branching venation reads as structure rather than raised strips.
    c.strokeStyle = rgb(mix(color, dark, .65), .12); c.lineWidth = .72; c.stroke(g.reticulum);
    c.strokeStyle = rgb(mix(color, veinColor, .77), .34); c.lineWidth = .27; c.stroke(g.reticulum);
    c.strokeStyle = rgb(mix(color, veinColor, .73), .32); c.lineWidth = .44; c.stroke(g.crossVeins);
    c.strokeStyle = rgb(mix(color, veinColor, .65), .24); c.lineWidth = .24; c.stroke(g.fineVeins);
    for (const vein of g.veins) {
      c.fillStyle = rgb(veinColor, .36); c.fill(vein.body);
      c.strokeStyle = rgb(veinColor, .45); c.lineWidth = vein.width * .31; c.stroke(vein.line);
    }

    c.strokeStyle = rgb(mix(color, [223, 224, 158], .68), .09); c.lineWidth = .36; c.stroke(g.lightGrain);
    c.strokeStyle = rgb(mix(color, [33, 61, 29], .6), .08); c.lineWidth = .30; c.stroke(g.darkGrain);
    c.fillStyle = rgb(mix(color, [70, 48, 25], .75), dry * .22); c.fill(g.dryFlecks);

    const sheen = c.createRadialGradient(-68, -113, 5, -40, -72, 192);
    sheen.addColorStop(0, '#eef0be22');
    sheen.addColorStop(.48, '#eef0be08');
    sheen.addColorStop(1, '#1d392500');
    c.fillStyle = sheen; c.fill(g.outline);
    if (pose.foldShade > 0) {
      const folded = c.createLinearGradient(-28, 0, 27, 0);
      folded.addColorStop(0, '#1a352600');
      folded.addColorStop(.47, rgb([27, 45, 24], pose.foldShade * .31));
      folded.addColorStop(.56, rgb([224, 225, 147], pose.foldShade * .16));
      folded.addColorStop(1, '#e0e19300');
      c.fillStyle = folded; c.fill(g.outline);
    }

    const rib = c.createLinearGradient(-3, 0, 4, 0);
    rib.addColorStop(0, rgb(mix(color, [86, 108, 46], .58)));
    rib.addColorStop(.37, rgb(mix(color, [199, 207, 117], .74)));
    rib.addColorStop(.64, rgb(mix(color, [224, 220, 137], .74)));
    rib.addColorStop(1, rgb(mix(color, [116, 139, 62], .63)));
    c.fillStyle = rib; c.fill(g.midrib);
    c.strokeStyle = rgb(mix(color, [236, 233, 160], .76), .6); c.lineWidth = .55; c.stroke(g.ribLight);
    c.lineWidth = 1.6; c.strokeStyle = rgb(light, .19); c.stroke(g.outline);
    c.restore();
    c.lineWidth = .72; c.strokeStyle = rgb(mix(color, [40, 66, 29], .51), .61); c.stroke(g.outline);
    c.lineWidth = .8; c.strokeStyle = rgb(mix(color, [228, 228, 151], .68), .39); c.stroke(g.rimLight);
    c.restore();
  }

  private prepare(pose: BladePose): BladeGeometry {
    const key = [pose.leftSpread, pose.rightSpread, pose.tipLean, pose.tipDrop, pose.foldShade].map(value => value.toFixed(3)).join(':');
    if (this.geometry && key === this.poseKey) return this.geometry;
    const bend = ([x, y]: Point): Point => bladePoint(x, y, pose);
    const outline = new Path2D(), leftHalf = new Path2D(), rimLight = new Path2D();
    outline.moveTo(...bend(margin(0, 1)));
    for (let i = 1; i <= 384; i++) outline.lineTo(...bend(margin(i / 384, 1)));
    for (let i = 383; i >= 0; i--) outline.lineTo(...bend(margin(i / 384, -1)));
    outline.closePath();
    leftHalf.moveTo(...bend(spine(0)));
    for (let i = 1; i <= 192; i++) leftHalf.lineTo(...bend(margin(i / 192, -1)));
    for (let i = 191; i >= 0; i--) leftHalf.lineTo(...bend(spine(i / 192)));
    leftHalf.closePath();
    rimLight.moveTo(...bend(margin(.07, -1)));
    for (let i = 1; i <= 170; i++) rimLight.lineTo(...bend(margin(.07 + i / 170 * .59, -1)));

    const petioleCurve: Curve = { a: [-3, 164], b: [-2, 195], c: [-1, 225], d: [-18, 246] };
    const petiole = ribbon(petioleCurve, t => 5.8 - 2.1 * t, bend), petioleLight = new Path2D();
    const stalkHighlight: Curve = { a: [-4, 165], b: [-3.2, 195], c: [-2.2, 225], d: [-18.6, 244.7] };
    trace(petioleLight, stalkHighlight, bend);
    const midrib = new Path2D(), ribLight = new Path2D();
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i <= 160; i++) {
        const t = side < 0 ? i / 160 : 1 - i / 160, [x, y] = spine(t);
        const point = bend([x + side * (.08 + 2.8 * t ** 1.55), y]);
        if (side < 0 && i === 0) midrib.moveTo(...point); else midrib.lineTo(...point);
      }
    }
    midrib.closePath();
    ribLight.moveTo(...bend(spine(.08)));
    for (let i = 1; i <= 110; i++) {
      const [x, y] = spine(.08 + i / 110 * .91); ribLight.lineTo(...bend([x - .55, y]));
    }

    const veins: Vein[] = [], crossVeins = new Path2D(), fineVeins = new Path2D(), reticulum = new Path2D();
    const rawReticulum: Veinlet[] = [];
    const starts = [[.205, .316, .426, .543, .654, .761, .855, .934], [.184, .287, .407, .518, .631, .738, .833, .918]];
    const ends = [[.105, .192, .278, .377, .477, .583, .694, .814], [.092, .176, .269, .358, .455, .563, .672, .792]];
    for (const side of [-1, 1] as const) {
      const index = side < 0 ? 0 : 1;
      const curves = starts[index].map((t, row): Curve => {
        const a = spine(t), target = margin(ends[index][row], side);
        const d = between(spine(ends[index][row]), target, .94 + noise(row + index * 19) * .025);
        const span = d[0] - a[0], rise = a[1] - d[1];
        return {
          a,
          b: [a[0] + span * (.28 + noise(row + 8) * .08), a[1] - rise * .15 - 5],
          c: [d[0] - span * .17, d[1] + rise * .24 + 2],
          d,
        };
      });
      curves.forEach((curve, row) => {
        const width = .78 + row * .12 + noise(row + index * 13) * .15, line = new Path2D();
        trace(line, curve, bend);
        veins.push({ body: ribbon(curve, t => width * (.96 - .80 * t ** .76), bend), line, width });
        // A short terminal fork reaches the margin without turning every vein
        // into an identical straight spoke or continuing beyond the blade.
        const branch = curveAt(curve, .79), tooth = margin(ends[index][row] + .025, side);
        fineVeins.moveTo(...bend(branch));
        fineVeins.quadraticCurveTo(...bend(between(branch, tooth, .57)), ...bend(between(spine(ends[index][row] + .025), tooth, .985)));
        const top = curves[row - 1];
        if (!top) return;
        if (!this.rawReticulum) rawReticulum.push(...reticulate(curve, top, 2500 + index * 997 + row * 79));
        const count = 4 + Math.round(Math.abs(curve.d[0] - curve.a[0]) / 26);
        for (let j = 0; j < count; j++) {
          const seed = row * 43 + j * 7 + index * 317;
          const u = .12 + (j + .3 + noise(seed) * .4) / count * .77;
          const v = Math.min(.97, Math.max(.09, u + (noise(seed + 1) - .42) * .12));
          const a = curveAt(curve, u), d = curveAt(top, v);
          const b: Point = [a[0] + side * (2 + noise(seed + 2) * 4), a[1] + (d[1] - a[1]) * .38];
          const control: Point = [d[0] - side * (1 + noise(seed + 3) * 5), d[1] - (d[1] - a[1]) * .27];
          const link: Curve = { a, b, c: control, d };
          trace(crossVeins, link, bend);
          if (j > 0 && j < count - 1) {
            const fork = curveAt(link, .36 + noise(seed + 4) * .28), target = curveAt(curve, Math.min(.98, u + .068 + noise(seed + 5) * .04));
            const midpoint = between(fork, target, .5);
            fineVeins.moveTo(...bend(fork));
            fineVeins.quadraticCurveTo(...bend([midpoint[0] + side * 2, midpoint[1] - 1.6]), ...bend(target));
          }
        }
      });
    }
    if (!this.rawReticulum) this.rawReticulum = rawReticulum;
    for (const [a, control, b] of this.rawReticulum) {
      reticulum.moveTo(...bend(a)); reticulum.quadraticCurveTo(...bend(control), ...bend(b));
    }

    const lightGrain = new Path2D(), darkGrain = new Path2D(), dryFlecks = new Path2D();
    for (let i = 0; i < 2700; i++) {
      const t = .025 + noise(i + 500) * .95, side: Side = noise(i + 501) < .5 ? -1 : 1;
      const [mx, y] = spine(t), x = mx + side * widthAt(t, side) * (.025 + noise(i + 502) * .962);
      const length = .45 + noise(i + 503) * 1.2, path = i % 3 ? lightGrain : darkGrain;
      path.moveTo(...bend([x, y])); path.lineTo(...bend([x + length * .73, y - length * .52]));
      if (i % 19 === 0) {
        const size = .22 + noise(i + 506) * .65;
        dryFlecks.moveTo(...bend([x - size, y]));
        dryFlecks.lineTo(...bend([x + size * .6, y - size * .65]));
        dryFlecks.lineTo(...bend([x + size, y + size * .2]));
        dryFlecks.lineTo(...bend([x - size * .2, y + size * .8])); dryFlecks.closePath();
      }
    }

    const mottles: Mottle[] = [];
    for (let i = 0; i < 104; i++) {
      const t = .06 + noise(i + 1100) * .88, side: Side = noise(i + 1101) < .5 ? -1 : 1;
      const [mx, y] = spine(t), x = mx + side * widthAt(t, side) * (.1 + noise(i + 1102) * .87);
      const broad = i < 30;
      const angle = -.65 + noise(i + 1103) * 1.5;
      const rx = broad ? 27 + noise(i + 1104) * 43 : 7 + noise(i + 1104) * 18;
      const ry = broad ? 14 + noise(i + 1105) * 27 : 4 + noise(i + 1105) * 13;
      const center = bend([x, y]), axisX = bend([x + Math.cos(angle) * rx, y + Math.sin(angle) * rx]);
      const axisY = bend([x - Math.sin(angle) * ry, y + Math.cos(angle) * ry]);
      mottles.push({
        transform: [axisX[0] - center[0], axisX[1] - center[1], axisY[0] - center[0], axisY[1] - center[1], ...center],
        tone: noise(i + 1106) - .48, strength: broad ? .24 + noise(i + 1107) * .31 : .14 + noise(i + 1107) * .19,
      });
    }
    this.poseKey = key;
    this.geometry = { outline, leftHalf, rimLight, midrib, ribLight, petiole, petioleLight, veins, crossVeins, fineVeins, reticulum, lightGrain, darkGrain, dryFlecks, mottles };
    return this.geometry;
  }
}
