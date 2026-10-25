import * as THREE from 'three';

export type WaptiaPart = 'whole' | 'shield' | 'head' | 'limbs' | 'tail';
export interface WaptiaAsset {
  group: THREE.Group;
  setPose(progress: number, active: boolean): void;
  setEvidence(part: WaptiaPart, enabled: boolean): void;
  dispose(): void;
}
type V = [number, number, number];
type Color = THREE.Color;
const vec = (a: V) => new THREE.Vector3(...a);
const tuple = (a: THREE.Vector3): V => [a.x, a.y, a.z];
const mix = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const plus = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const color = (hex: string) => new THREE.Color(hex);
const palette = {
  shell: color('#756244'), edge: color('#a69b7b'), body: color('#6b7768'),
  joint: color('#414c45'), limb: color('#899174'), leaf: color('#7d8d78'),
  leafEdge: color('#99a38a'), seta: color('#b1ad90'), tooth: color('#76684c'), eye: color('#222e30'),
};

/** Indexed authored surfaces. Small structures are merged into their anatomical owner. */
class Surface {
  positions: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  skin: number[] = [];
  vertex(p: V, c: Color, tone = 1, bone = 0) {
    const index = this.positions.length / 3;
    this.positions.push(...p); this.colors.push(c.r * tone, c.g * tone, c.b * tone); this.skin.push(bone, 0, 0, 0);
    return index;
  }
  tri(a: number, b: number, c: number) { this.indices.push(a, b, c); }
  quad(a: number, b: number, c: number, d: number) { this.tri(a, b, c); this.tri(a, c, d); }
  geometry(skinned = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    g.setIndex(this.indices); g.computeVertexNormals();
    if (skinned) {
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.skin, 4));
      const weights = new Float32Array(this.skin.length);
      for (let i = 0; i < weights.length; i += 4) weights[i] = 1;
      g.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
    }
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }
}

function tube(s: Surface, path: (t: number) => V, radius: (t: number) => number,
  sections: number, sides: number, c: Color, flatten = 1, bone = 0) {
  const rows: number[][] = [];
  for (let j = 0; j <= sections; j++) {
    const t = j / sections, p = vec(path(t));
    const tangent = vec(path(Math.min(1, t + .0001))).sub(vec(path(Math.max(0, t - .0001)))).normalize();
    const ref = Math.abs(tangent.z) > .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const u = tangent.clone().cross(ref).normalize(), v = tangent.clone().cross(u).normalize();
    rows[j] = [];
    for (let k = 0; k < sides; k++) {
      const a = k / sides * Math.PI * 2, r = radius(t);
      const p2 = p.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r * flatten);
      rows[j].push(s.vertex(tuple(p2), c, .96 + .035 * Math.cos(a) + .015 * Math.sin(17 * t), bone));
      if (j && k) s.quad(rows[j - 1][k - 1], rows[j - 1][k], rows[j][k], rows[j][k - 1]);
    }
    if (j) s.quad(rows[j - 1][sides - 1], rows[j - 1][0], rows[j][0], rows[j][sides - 1]);
  }
  const start = s.vertex(path(0), c, .92, bone), end = s.vertex(path(1), c, .92, bone);
  for (let k = 0; k < sides; k++) {
    s.tri(start, rows[0][(k + 1) % sides], rows[0][k]);
    s.tri(end, rows[sections][k], rows[sections][(k + 1) % sides]);
  }
}

/** A tiny solid, tapered bristle, never a screen-space line. */
function bristle(s: Surface, base: V, tip: V, r: number, c = palette.seta, bone = 0) {
  const axis = vec(tip).sub(vec(base)).normalize(), ref = Math.abs(axis.z) > .92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  const u = axis.clone().cross(ref).normalize(), v = axis.clone().cross(u).normalize();
  const ring: number[] = [];
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * Math.PI * 2;
    ring.push(s.vertex(tuple(vec(base).addScaledVector(u, r * Math.cos(a)).addScaledVector(v, r * Math.sin(a))), c, .92 + k * .04, bone));
  }
  const end = s.vertex(tip, c, 1, bone);
  for (let k = 0; k < 3; k++) s.tri(ring[k], ring[(k + 1) % 3], end);
  s.tri(ring[2], ring[1], ring[0]);
}

/** Closed, cupped, lanceolate lamina; its thickness does not rely on DoubleSide. */
function lance(s: Surface, path: (t: number) => V, across: V, normal: V, width: number,
  thickness: number, rows: number, c: Color, bone = 0,
  widthProfile: (t: number) => number = t => .018 + .982 * Math.pow(Math.sin(Math.PI * t), .68)) {
  const a = vec(across).normalize(), n = vec(normal).normalize();
  const forward = vec(path(.501)).sub(vec(path(.499))).cross(a).dot(n) > 0;
  const quad = (i: number, j: number, k: number, l: number) => forward ? s.quad(i, j, k, l) : s.quad(l, k, j, i);
  const top: number[][] = [], bottom: number[][] = [];
  const at = (t: number, q: number, upper: boolean) => {
    const profile = widthProfile(t);
    const p = vec(path(t)).addScaledVector(a, q * width * profile)
      .addScaledVector(n, (upper ? 1 : -1) * thickness * (.6 + .4 * (1 - Math.abs(q))) + width * .12 * q * q * Math.sin(Math.PI * t));
    return tuple(p);
  };
  for (let j = 0; j <= rows; j++) {
    top[j] = []; bottom[j] = [];
    for (let k = 0; k < 3; k++) {
      const t = .5 - .5 * Math.cos(Math.PI * j / rows), q = k - 1;
      top[j].push(s.vertex(at(t, q, true), c, k === 1 ? 1.035 : .94 + .025 * Math.sin(j * 2.2), bone));
      bottom[j].push(s.vertex(at(t, q, false), c, k === 1 ? .9 : .95, bone));
      if (j && k) {
        quad(top[j - 1][k - 1], top[j][k - 1], top[j][k], top[j - 1][k]);
        quad(bottom[j - 1][k - 1], bottom[j - 1][k], bottom[j][k], bottom[j][k - 1]);
      }
    }
    if (j) {
      quad(top[j - 1][0], bottom[j - 1][0], bottom[j][0], top[j][0]);
      quad(top[j - 1][2], top[j][2], bottom[j][2], bottom[j - 1][2]);
    }
  }
  for (let k = 0; k < 2; k++) {
    quad(top[0][k], top[0][k + 1], bottom[0][k + 1], bottom[0][k]);
    quad(top[rows][k], bottom[rows][k], bottom[rows][k + 1], top[rows][k + 1]);
  }
}

function article(s: Surface, a: V, b: V, radius: number, c: Color, sides: number, bone = 0) {
  tube(s, t => mix(a, b, .025 + t * .95), t => radius * (.83 + .17 * Math.sin(t * Math.PI)), 4, sides, c, .78, bone);
  tube(s, t => mix(a, b, t * .03), () => radius * .79, 1, sides, palette.joint, .76, bone);
}

function makeShield(mobile: boolean) {
  const s = new Surface(), nx = mobile ? 32 : 48, nv = mobile ? 28 : 40;
  const sample = (u: number, v: number): V => {
    const side = Math.abs(v), sine = Math.sin(Math.PI * u);
    const front = -2.265 + .18 * Math.pow(side, 1.6);
    const rear = -1.28 + .58 * Math.pow(side, 1.8);
    const fold = .0038 * Math.sin((u * .94 + side * .15) * 38) * Math.pow(sine, .6) * side;
    return [front + (rear - front) * u,
      .465 + .09 * sine - (.32 + .68 * Math.pow(sine, .62)) * side * side + fold,
      v * (.26 + .105 * sine) * (1 + .014 * Math.sin(u * 36) * side)];
  };
  const outer: number[][] = [], inner: number[][] = [];
  for (let i = 0; i <= nx; i++) {
    outer[i] = []; inner[i] = [];
    for (let j = 0; j <= nv; j++) {
      const u = i / nx, v = j / nv * 2 - 1, p = sample(u, v);
      const du = vec(sample(Math.min(1, u + .0001), v)).sub(vec(sample(Math.max(0, u - .0001), v)));
      const dv = vec(sample(u, Math.min(1, v + .0001))).sub(vec(sample(u, Math.max(-1, v - .0001))));
      const normal = dv.cross(du).normalize();
      const edge = Math.min(i, nx - i) < 2 || j < 2 || j > nv - 2;
      const c = edge ? palette.edge : palette.shell;
      const tone = .97 + .045 * Math.sin(u * 8 + Math.abs(v) * 2.1) + .015 * Math.cos(u * 41 + v * 13);
      outer[i][j] = s.vertex(p, c, tone);
      inner[i][j] = s.vertex(tuple(vec(p).addScaledVector(normal, -.012)), palette.shell, .8 + .03 * Math.sin(u * 12));
      if (i && j) {
        s.quad(outer[i - 1][j - 1], outer[i - 1][j], outer[i][j], outer[i][j - 1]);
        s.quad(inner[i - 1][j - 1], inner[i][j - 1], inner[i][j], inner[i - 1][j]);
      }
    }
  }
  for (let i = 1; i <= nx; i++) {
    s.quad(outer[i - 1][0], outer[i][0], inner[i][0], inner[i - 1][0]);
    s.quad(outer[i - 1][nv], inner[i - 1][nv], inner[i][nv], outer[i][nv]);
  }
  for (let j = 1; j <= nv; j++) {
    s.quad(outer[0][j - 1], inner[0][j - 1], inner[0][j], outer[0][j]);
    s.quad(outer[nx][j - 1], outer[nx][j], inner[nx][j], inner[nx][j - 1]);
  }
  return s;
}

const axis: V[] = [[-2.43, .205, 0], [-1.56, .21, 0], [-.50, .24, 0],
  [-.08, .23, 0], [.37, .20, 0], [.86, .15, 0], [1.37, .10, 0], [1.91, .08, 0], [2.16, .10, 0]];
const tailTip: V = [2.82, .12, .40];
const bodyLength = axis.slice(1).reduce((sum, p, i) => sum + vec(p).distanceTo(vec(axis[i])), 0) + vec(tailTip).distanceTo(vec(axis[axis.length - 1]));
const calibratedScale = 5 / bodyLength;

function ring(s: Surface, a: V, b: V, r1: number, r2: number, sides: number, endSpines: boolean) {
  const d = vec(b).sub(vec(a)), length = d.length(), t = d.clone().normalize();
  const z = new THREE.Vector3(0, 0, 1), y = z.clone().cross(t).normalize();
  const rows: number[][] = [], profiles = [0, .05, .12, .4, .72, .88, .94, 1];
  for (let j = 0; j < profiles.length; j++) {
    const u = profiles[j], r = (r1 + (r2 - r1) * u) * (j === 0 ? .87 : j === 6 ? 1.045 : j === 7 ? .94 : 1);
    rows[j] = [];
    for (let k = 0; k < sides; k++) {
      const angle = k / sides * Math.PI * 2, p = vec(mix(a, b, u));
      p.addScaledVector(y, Math.cos(angle) * r).addScaledVector(z, Math.sin(angle) * r * .78);
      const c = j < 1 ? palette.joint : j > 5 ? palette.edge : palette.body;
      rows[j].push(s.vertex(tuple(p), c, .88 + .09 * Math.cos(angle * 2 + u * 2) + .035 * Math.sin(u * 31 + angle * 9) + .015 * Math.cos(u * 67 - angle * 17)));
      if (j && k) s.quad(rows[j - 1][k - 1], rows[j - 1][k], rows[j][k], rows[j][k - 1]);
    }
    if (j) s.quad(rows[j - 1][sides - 1], rows[j - 1][0], rows[j][0], rows[j][sides - 1]);
  }
  const p0 = s.vertex(a, palette.joint), p1 = s.vertex(b, palette.body);
  for (let k = 0; k < sides; k++) {
    s.tri(p0, rows[0][(k + 1) % sides], rows[0][k]);
    s.tri(p1, rows[7][k], rows[7][(k + 1) % sides]);
  }
  if (endSpines) for (const dorsal of [-1, 1]) for (const side of [-1, 1]) {
    const root = vec(mix(a, b, .91)).addScaledVector(y, dorsal * r2 * .75).addScaledVector(z, side * r2 * .52);
    const tip = root.clone().addScaledVector(t, Math.min(.075, length * .16)).addScaledVector(y, dorsal * .025).addScaledVector(z, side * .014);
    bristle(s, tuple(root), tuple(tip), .012, palette.tooth);
  }
}

function makeBody(mobile: boolean) {
  const middle = new Surface(), abdomen = new Surface(), sides = mobile ? 20 : 32;
  tube(middle, t => mix([-2.27, .18, 0], axis[1], t), t => .11 + .09 * Math.sin(t * Math.PI * .5), 14, sides, palette.body, .74);
  const bounds = [-1.56, -1.35, -1.15, -.95, -.75, -.50];
  for (let i = 0; i < 5; i++) {
    const y = .21 + .03 * i / 5;
    ring(middle, [bounds[i], y, 0], [bounds[i + 1], y + .006, 0], .205, .202, sides, false);
  }
  const radii = [.205, .191, .176, .157, .140, .117, .134];
  for (let i = 0; i < 6; i++) ring(abdomen, axis[i + 2], axis[i + 3], radii[i], radii[i + 1], sides, true);
  return { middle, abdomen };
}

function makeHead(mobile: boolean) {
  const head = new Surface(), eyes = new Surface(), sides = mobile ? 10 : 14;
  // Ocular unit, paired peduncular lobes and the median triangular sclerite.
  tube(head, t => [-2.33 + .16 * t, .15, 0], () => .095, 5, sides, palette.body, 1.45);
  for (const side of [-1, 1]) {
    tube(head, t => [-2.31 - .065 * t, .15 + .012 * t, side * (.07 + .132 * t)], t => .027 + .009 * t, 5, sides, palette.limb);
    lance(head, t => [-2.27 - .115 * t, .205 + .018 * Math.sin(t * Math.PI), side * (.085 + .024 * t)],
      [0, 0, side], [0, 1, 0], .039, .011, 7, palette.edge);
    const rows = mobile ? 12 : 18, columns = mobile ? 20 : 28, grid: number[][] = [];
    for (let j = 0; j <= rows; j++) {
      grid[j] = [];
      // Avoid a collapsed latitude at either pole.
      const latitude = .008 + j / rows * (Math.PI - .016);
      for (let k = 0; k < columns; k++) {
        const a = k / columns * Math.PI * 2;
        const kidney = 1 - .31 * Math.exp(-Math.pow(Math.cos(latitude) / .43, 2)) * Math.max(0, Math.cos(a));
        const lens = 1 + .012 * Math.cos(k * 2.399 + j * 3.18);
        const p: V = [-2.399 + Math.cos(a) * Math.sin(latitude) * .056 * kidney * lens,
          .168 + Math.cos(latitude) * .061 * lens, side * (.209 + Math.sin(a) * Math.sin(latitude) * .048 * lens)];
        grid[j].push(eyes.vertex(p, palette.eye, .9 + .15 * Math.sin(j * 4.1 + k * 2.6) ** 2));
        if (j && k) {
          if (side < 0) eyes.quad(grid[j - 1][k - 1], grid[j][k - 1], grid[j][k], grid[j - 1][k]);
          else eyes.quad(grid[j - 1][k], grid[j][k], grid[j][k - 1], grid[j - 1][k - 1]);
        }
      }
      if (j) {
        if (side < 0) eyes.quad(grid[j - 1][columns - 1], grid[j][columns - 1], grid[j][0], grid[j - 1][0]);
        else eyes.quad(grid[j - 1][0], grid[j][0], grid[j][columns - 1], grid[j - 1][columns - 1]);
      }
    }
    const north = eyes.vertex([-2.399, .229, side * .209], palette.eye);
    const south = eyes.vertex([-2.399, .107, side * .209], palette.eye);
    for (let k = 0; k < columns; k++) {
      const next = (k + 1) % columns;
      if (side > 0) { eyes.tri(north, grid[0][next], grid[0][k]); eyes.tri(south, grid[rows][k], grid[rows][next]); }
      else { eyes.tri(north, grid[0][k], grid[0][next]); eyes.tri(south, grid[rows][next], grid[rows][k]); }
    }
  }
  lance(head, t => [-2.43 + .19 * t, .205 + .027 * Math.sin(t * Math.PI), 0],
    [0, 0, 1], [0, 1, 0], .075, .012, 8, palette.edge, 0, t => .018 + .982 * t);
  // The plate is pointed anteriorly; this low keel is not a rostral hinge or a third eye.
  tube(head, t => [-2.423 + .17 * t, .224 + .026 * Math.sin(t * Math.PI), 0], t => .004 * (.3 + .7 * Math.sin(t * Math.PI)), 8, 5, palette.shell);
  return { head, eyes };
}

function makeFeeding(side: number, mobile: boolean) {
  const s = new Surface(), sides = mobile ? 8 : 10;
  // Broad gnathal element, with a small toothed medial margin.
  lance(s, t => [-.015 - .015 * t, -.02 - .22 * t, -side * .025 * t],
    [.7, -.2, side * .5], [0, 0, side], .072, .015, 8, palette.limb);
  for (let i = 0; i < 10; i++) {
    const t = .2 + i / 10 * .68;
    bristle(s, [-.04, -.03 - .22 * t, -side * .055], [-.052, -.035 - .22 * t, -side * .074], .006, palette.tooth);
  }
  const palp: V[] = [[-.02, -.075, side * .04], [-.075, -.16, side * .065], [-.16, -.205, side * .05], [-.235, -.19, side * .025]];
  for (let j = 0; j < 3; j++) article(s, palp[j], palp[j + 1], j === 2 ? .034 : .027, palette.limb, sides);
  const brushCount = mobile ? 24 : 38;
  for (let j = 0; j < brushCount; j++) {
    const angle = j * 2.399963, root: V = [-.205 - .035 * Math.cos(angle), -.19 - .026 * Math.sin(angle), side * (.027 + .014 * Math.sin(angle * 1.4))];
    bristle(s, root, [root[0] - .06 * (.65 + .35 * Math.cos(angle)), root[1] - .045 * Math.sin(angle), root[2] + side * .025 * Math.sin(angle * .7)], .0017);
  }
  // Nine is an explicit interpretation: proximal maxillular boundaries are uncertain.
  const mx: V[] = [];
  for (let j = 0; j <= 9; j++) {
    const t = j / 9;
    mx.push([.075 - .12 * t - .09 * t * t, -.04 - .40 * t, -side * (.018 + .040 * t)]);
    if (j) article(s, mx[j - 1], mx[j], .028 - .009 * t, palette.limb, sides);
  }
  const end = mx[9];
  for (const fork of [-1, 1]) bristle(s, plus(end, [0, .008, fork * .012]), plus(end, [-.052, -.032, fork * .024]), .005, palette.tooth);
  for (let j = 0; j < (mobile ? 22 : 32); j++) {
    const angle = j * 2.39996, t = .83 + .17 * ((j % 7) / 6), root = mix(mx[8], end, (t - .83) / .17);
    bristle(s, plus(root, [Math.cos(angle) * .021, 0, Math.sin(angle) * .016]),
      plus(root, [Math.cos(angle) * .055 - .018, -.034, Math.sin(angle) * .035]), .0015);
  }
  return s;
}

function makeRaptorial(pair: number, side: number, mobile: boolean) {
  const s = new Surface(), sides = mobile ? 8 : 12, f = 1 + pair * .035;
  const p: V[] = [[0, 0, 0], [-.018, -.145, side * .025], [-.04, -.29, side * .045],
    [-.07, -.43, side * .062], [-.105, -.57, side * .08], [-.14, -.665, side * .08],
    [-.19, -.746, side * .066], [-.245, -.805, side * .045], [-.294, -.847, side * .025], [-.33, -.872, side * .015]];
  for (let j = 0; j < p.length; j++) p[j] = [p[j][0], p[j][1] * f, p[j][2]];
  for (let j = 0; j < 9; j++) {
    const r = j < 4 ? .062 - j * .006 : .033 - (j - 4) * .0045;
    article(s, p[j], p[j + 1], r, palette.limb, sides);
    if (j < 4) {
      const root = mix(p[j], p[j + 1], .76), len = (pair === 0 ? .15 + .027 * j : .17 + .02 * j);
      const end = plus(root, [-.075 - .012 * j, -.028, -side * len]);
      lance(s, t => mix(root, end, t), [0, 1, side * .08], [1, 0, 0], pair === 0 ? .043 : .027, .009, 4, palette.limb);
      for (let tooth = 0; tooth < (pair === 0 ? 3 : 2); tooth++) {
        const base = mix(root, end, .78 + tooth * .07);
        bristle(s, base, plus(base, [-.038, -.018 + tooth * .012, -side * .018]), .004, palette.tooth);
      }
    } else for (let seta = 0; seta < 3; seta++) {
      const root = mix(p[j], p[j + 1], .35 + seta * .2);
      bristle(s, plus(root, [0, 0, side * r * .6]), plus(root, [.025, -.035, side * (r + .02)]), .0017);
    }
  }
  for (const fork of [-1, 1]) {
    const a = plus(p[9], [0, 0, fork * .008]), b = plus(p[9], [-.07, -.045, fork * .021]);
    tube(s, t => plus(mix(a, b, t), [0, -.012 * Math.sin(t * Math.PI), 0]), t => .009 * (1 - t * .94), 5, 5, palette.tooth);
  }
  return s;
}

function makeLamellate(side: number, index: number, mobile: boolean, transition = false) {
  const s = new Surface(), count = transition ? 18 : mobile ? 24 : 30;
  const length = transition ? .67 : .86 * (1 - .045 * index), spread = transition ? .16 : .44;
  const path = (t: number): V => [transition ? .055 * Math.sin(t * Math.PI) + .055 * t * t : -.14 * Math.sin(t * Math.PI) + .20 * t * t,
    -length * t, side * (spread * t + .045 * Math.sin(t * Math.PI))];
  tube(s, path, t => (transition ? .047 : .055) * (1 - .81 * t) * (1 + .065 * Math.cos(t * count * Math.PI * 2)), count * 2, mobile ? 6 : 8, palette.limb, .9);
  for (let j = 0; j < count; j++) {
    const t = .055 + .91 * j / (count - 1), base = path(t);
    const lamellaLength = transition ? .11 + .12 * Math.sin(Math.PI * t) : (.14 + .36 * Math.pow(Math.sin(t * Math.PI), .75)) * (1 - index * .025);
    const direction: V = [lamellaLength, lamellaLength * (.43 - .86 * t), side * .12 * lamellaLength];
    const tangent = vec(path(Math.min(1, t + .001))).sub(vec(path(t - .001))).normalize();
    const normal = vec(direction).cross(tangent).normalize();
    if (normal.z * side < 0) normal.negate();
    const across = normal.clone().cross(vec(direction)).normalize();
    const leafPath = (u: number): V => tuple(vec(base).addScaledVector(normal, j * .0009).addScaledVector(vec(direction), u)
      .addScaledVector(normal, Math.sin(u * Math.PI) * (transition ? .012 : .025))
      .addScaledVector(tangent, u * u * .045));
    const width = transition ? .019 : .018;
    lance(s, leafPath, tuple(across), tuple(normal), width, .0018, mobile ? 4 : 5, j % 4 === 0 ? palette.leafEdge : palette.leaf);
    // Marginal setae are sampled, not an asserted fossil count. Length is exaggerated for legibility.
    const hairs = mobile ? 5 : 9;
    for (let h = 0; h < hairs; h++) {
      const u = .44 + .54 * h / (hairs - 1), edge = h % 2 ? -1 : 1;
      const q = width * Math.pow(Math.sin(Math.PI * u), .68), root = vec(leafPath(u)).addScaledVector(across, edge * q);
      const end = root.clone().addScaledVector(across, edge * .017).addScaledVector(vec(direction).normalize(), .009);
      bristle(s, tuple(root), tuple(end), .00125);
    }
  }
  if (transition) {
    const begin = path(1), end: V = [-.22, -.97, side * .15], points: V[] = [];
    for (let j = 0; j <= 5; j++) points.push(mix(begin, end, j / 5));
    for (let j = 0; j < 5; j++) article(s, points[j], points[j + 1], .024 - j * .0036, palette.limb, mobile ? 7 : 10);
    for (const fork of [-1, 1]) bristle(s, plus(end, [0, 0, fork * .008]), plus(end, [-.05, -.032, fork * .019]), .005, palette.tooth);
  } else bristle(s, path(.99), plus(path(1), [.015, -.035, side * .006]), .004, palette.tooth);
  return { surface: s, annulations: count };
}

function makeTail(side: number, mobile: boolean) {
  const s = new Surface(), base: V = [2.14, .102, side * .048], end: V = [tailTip[0], tailTip[1], side * tailTip[2]];
  const direction = vec(end).sub(vec(base)).normalize(), across = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
  const path = (t: number): V => tuple(vec(mix(base, end, t)).add(new THREE.Vector3(0, .025 * Math.sin(t * Math.PI), 0)));
  const halfWidth = .185;
  lance(s, path, tuple(across), [0, 1, 0], halfWidth, .011, mobile ? 16 : 24, palette.body);
  // Two oblique superficial boundaries, within one continuous ramus: three pseudo-segments.
  for (const at of [.40, .70]) {
    const width = halfWidth * (.018 + .982 * Math.pow(Math.sin(Math.PI * at), .68));
    tube(s, t => {
      const q = t * 2 - 1, u = at + (t - .5) * .075;
      const surfaceY = .011 * (.6 + .4 * (1 - Math.abs(q))) + halfWidth * .12 * q * q * Math.sin(Math.PI * u) + .002;
      return tuple(vec(path(u)).addScaledVector(across, q * width * .96).add(new THREE.Vector3(0, surfaceY, 0)));
    },
      () => .003, mobile ? 6 : 10, 4, palette.joint);
  }
  for (let j = 0; j < (mobile ? 5 : 8); j++) {
    const t = .88 + .105 * j / (mobile ? 4 : 7), edge = j % 2 ? -1 : 1;
    const root = vec(path(t)).addScaledVector(across, edge * halfWidth * Math.pow(Math.sin(Math.PI * t), .68));
    const end2 = root.clone().addScaledVector(direction, .018).addScaledVector(across, edge * .009);
    bristle(s, tuple(root), tuple(end2), .0016, palette.tooth);
  }
  return s;
}

function makeAntennule(side: number, mobile: boolean, material: THREE.MeshStandardMaterial) {
  const s = new Surface(), points: V[] = [[0, 0, 0]], bones: THREE.Bone[] = [];
  const lengths = [.10, .12, .17, .175, .175, .175, .17, .165, .16, .155];
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < 10; i++) {
    x -= lengths[i]; y -= .018 + .004 * i; z += side * (.065 - i * .003);
    points.push([x, y, z]);
    const bone = new THREE.Bone(); bone.name = `antennule-${side < 0 ? 'R' : 'L'}-podomere-${i + 1}`;
    bone.position.copy(vec(points[i]).sub(i ? vec(points[i - 1]) : new THREE.Vector3()));
    if (i) bones[i - 1].add(bone);
    bones.push(bone);
    const r = .035 * (1 - i / 10) ** 1.5 + .002;
    article(s, points[i], points[i + 1], r, palette.limb, mobile ? 8 : 12, i);
    if (i < 9) {
      const tangent = vec(points[i + 1]).sub(vec(points[i])).normalize();
      const u = tangent.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), v = tangent.clone().cross(u).normalize();
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2 + i * .43, radial = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
        const root = vec(mix(points[i], points[i + 1], .90)).addScaledVector(radial, r);
        const tip = root.clone().addScaledVector(radial, .060).addScaledVector(tangent, -.007);
        bristle(s, tuple(root), tuple(tip), .0016, palette.seta, i);
      }
    }
  }
  // The basal paired spines differ from the radiating setal crowns.
  for (const divergence of [-1, 1]) bristle(s, [.01, -.01, -side * .015], [-.035, -.065, -side * .06 + divergence * .015], .006, palette.tooth, 0);
  const mesh = new THREE.SkinnedMesh(s.geometry(true), material);
  mesh.name = `waptia-antennule-${side < 0 ? 'R' : 'L'}`;
  mesh.add(bones[0]); mesh.bind(new THREE.Skeleton(bones)); mesh.frustumCulled = false;
  mesh.userData = { part: 'head', partId: mesh.name, appendagePair: 1, side, podomeres: 10, setalCrowns: 9 };
  return { mesh, bones };
}

/**
 * Original procedural Waptia fieldensis, constrained by Vannier et al. (2018),
 * doi:10.1098/rsos.172206, figs 3–23, and ROM's fossil account.
 * No external model, image, scan, texture or image-derived geometry is used.
 */
export function createWaptiaAsset(mobile: boolean): WaptiaAsset {
  const group = new THREE.Group(); group.name = 'waptia-fieldensis-50mm'; group.scale.setScalar(calibratedScale);
  const materials: { material: THREE.MeshStandardMaterial; part: WaptiaPart }[] = [];
  const makeMaterial = (part: WaptiaPart, roughness = .71) => {
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0, side: THREE.FrontSide });
    material.name = `waptia-${part}`; materials.push({ material, part }); return material;
  };
  const shellMaterial = makeMaterial('shield', .57), headMaterial = makeMaterial('head', .69), eyeMaterial = makeMaterial('head', .39);
  const limbMaterial = makeMaterial('limbs', .73), trunkMaterial = makeMaterial('whole', .76), tailMaterial = makeMaterial('tail', .72);
  const geometries = new Set<THREE.BufferGeometry>(), skeletons: THREE.Skeleton[] = [];
  const addMesh = (surface: Surface, material: THREE.MeshStandardMaterial, part: WaptiaPart, id: string, parent: THREE.Object3D = group) => {
    const geometry = surface.geometry(), mesh = new THREE.Mesh(geometry, material);
    geometries.add(geometry); mesh.name = id; mesh.userData = { part, partId: id }; parent.add(mesh); return mesh;
  };
  const shell = addMesh(makeShield(mobile), shellMaterial, 'shield', 'carapace-continuous-saddle');
  shell.renderOrder = 3;
  shell.userData = { ...shell.userData, continuousDorsum: true, hinge: false, thickness: .012 * calibratedScale,
    thicknessMeaning: 'Slightly exaggerated cuticle thickness for visibility; not a fossil measurement.',
    transparencyMeaning: 'Reduced opacity is an observation aid, not an observed physiological change.' };
  const body = makeBody(mobile);
  const middle = addMesh(body.middle, trunkMaterial, 'whole', 'cephalothorax-and-five-postcephalothoracic-rings');
  middle.userData = { ...middle.userData, postCephalothoracicExternalRings: 5, appendagePairs: 6, lastRingFused: true };
  const abdomen = addMesh(body.abdomen, tailMaterial, 'tail', 'six-limbless-abdominal-segments');
  abdomen.userData = { ...abdomen.userData, segments: 6, appendages: 0, terminalShape: 'short posteriorly expanded truncated cone' };
  const frontal = makeHead(mobile);
  addMesh(frontal.head, headMaterial, 'head', 'ocular-and-interocular-unit');
  addMesh(frontal.eyes, eyeMaterial, 'head', 'paired-reniform-eyes').userData = { part: 'head', partId: 'paired-reniform-eyes', eyes: 2, unsegmentedStalks: true, eyeLongAxisApproxMm: 1.2 };
  const strokers: { pivot: THREE.Group; side: number; phase: number; amplitude: number; sweep: number }[] = [];
  const antennae: { mesh: THREE.SkinnedMesh; bones: THREE.Bone[]; side: number }[] = [];
  for (const side of [-1, 1]) {
    const sideName = side < 0 ? 'R' : 'L';
    const feeding = new THREE.Group(); feeding.name = `mandible-maxillule-${sideName}`; feeding.position.set(-2.205, .015, side * .085);
    feeding.userData = { part: 'head', partId: feeding.name, appendagePairs: [2, 3], mandibularPalpPodomeres: 3,
      maxillulePodomeres: 9, maxillulePodomereCertainty: 'Interpretation; proximal boundaries not clearly preserved.' };
    group.add(feeding); addMesh(makeFeeding(side, mobile), headMaterial, 'head', `${feeding.name}-cuticle-brush-and-claws`, feeding);
    const antenna = makeAntennule(side, mobile, headMaterial);
    antenna.mesh.position.set(-2.285, .07, side * .10); group.add(antenna.mesh);
    geometries.add(antenna.mesh.geometry); skeletons.push(antenna.mesh.skeleton); antennae.push({ ...antenna, side });
    for (let pair = 0; pair < 4; pair++) {
      const pivot = new THREE.Group(); pivot.name = `post-maxillular-${pair + 1}-${sideName}`;
      pivot.position.set(-2.115 + pair * .174, .045 + pair * .015, side * .15);
      pivot.userData = { part: 'limbs', partId: pivot.name, appendagePair: pair + 4, side,
        basisSegments: pair < 3 ? 4 : null, endopodSegments: 5,
        morphology: pair < 3 ? 'enditic basipod and five-podomere endopod, with paired terminal claws' : 'annulated short-lamellate basipod and five-podomere endopod' };
      group.add(pivot);
      const surface = pair < 3 ? makeRaptorial(pair, side, mobile) : makeLamellate(side, 0, mobile, true).surface;
      addMesh(surface, limbMaterial, 'limbs', `${pivot.name}-segmented-cuticle`, pivot);
      strokers.push({ pivot, side, phase: pair * .16, amplitude: pair < 3 ? .035 : .11, sweep: pair < 3 ? .025 : .055 });
    }
    const origins = [-1.445, -1.245, -1.045, -.845, -.675, -.545];
    for (let pair = 0; pair < 6; pair++) {
      const pivot = new THREE.Group(); pivot.name = `lamellate-${pair + 1}-${sideName}`;
      pivot.position.set(origins[pair], .075 + pair * .004, side * .130);
      const lamella = makeLamellate(side, pair, mobile);
      pivot.userData = { part: 'limbs', partId: pivot.name, appendagePair: pair + 8, side,
        postCephalothoracicRing: Math.min(pair + 1, 5), annulated: true, displayAnnulations: lamella.annulations,
        lamellaRows: 1, displayLamellae: lamella.annulations,
        countMeaning: 'Sampling of the many annuli and lamellae; not a measured species-wide count.',
        attachmentMeaning: 'Exact basalmost attachment is uncertain in fossils.' };
      group.add(pivot); addMesh(lamella.surface, limbMaterial, 'limbs', `${pivot.name}-annuli-lanceolate-lamellae-and-setae`, pivot);
      strokers.push({ pivot, side, phase: .55, amplitude: .16 - pair * .005, sweep: .075 });
    }
    const ramus = addMesh(makeTail(side, mobile), tailMaterial, 'tail', `caudal-ramus-${sideName}`);
    ramus.userData = { ...ramus.userData, side, pseudoSegments: 3, transverseBoundaries: 2, articulatedSegments: false, longFringe: false };
  }
  const partIds: Record<WaptiaPart, string[]> = { whole: [], shield: [], head: [], limbs: [], tail: [] };
  group.traverse(object => { if (object.userData.partId) { partIds.whole.push(object.userData.partId); const p = object.userData.part as WaptiaPart; if (p !== 'whole') partIds[p].push(object.userData.partId); } });
  let triangles = 0, meshCount = 0;
  group.traverse(object => { if (object instanceof THREE.Mesh) { triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3; meshCount++; } });
  group.userData = {
    identity: 'Waptia fieldensis — one persistent representative reconstruction', species: 'Waptia fieldensis',
    locality: 'Walcott Quarry, Burgess Shale, British Columbia, Canada', ageMaApprox: 508,
    authoredReconstruction: true, specimenScan: false, externalAssets: false, mobile,
    scale: { millimetersPerWorldUnit: 10, representativeBodyLengthMm: 50, representativeBodyLengthUnits: 5 },
    lengthDefinition: 'Curve from the median triangular sclerite, along the body centreline, to the tip of either caudal ramus; antennules excluded. Vannier et al. 2018 §5.2.1.',
    neutralLengthPath: [...axis, tailTip].map(p => p.map(n => n * calibratedScale)),
    shapeBoundaries: 'Original 3D completion of mostly flattened fossils; depth, colours, exact posture, spacing and locomotor timing are inferred or chosen for display.',
    visibilityExaggerations: 'Thin cuticle thickness and marginal lamellar setae are enlarged for legibility; fine setae are sampled. No measured ommatidial or lamellar count is asserted.',
    anatomy: { antennulePairs: 1, antennulePodomeres: 10, secondAntennulePairs: 0, mandiblePairs: 1, mandibularPalpPodomeres: 3,
      maxillulePairs: 1, enditicLimbPairs: 3, transitionalLimbPairs: 1, lamellateLimbPairs: 6,
      appendagePairs: 13, postCephalothoracicExternalRings: 5, abdominalSegments: 6, caudalRami: 2, ramusPseudoSegments: 3 },
    poseMeaning: 'Finite, reversible illustrative paddling and gentle antennule probing. No measured gait, cycle, speed, predation or tail-fin beat.',
    sources: ['https://burgess-shale.rom.on.ca/fossils/waptia-fieldensis/', 'https://doi.org/10.1098/rsos.172206'],
    partIds, triangles, drawMeshes: meshCount,
  };
  const selected = new Set<WaptiaPart>(); let disposed = false;
  function setEvidence(part: WaptiaPart, enabled: boolean) {
    if (disposed) return;
    if (enabled) selected.add(part); else selected.delete(part);
    for (const entry of materials) {
      const highlight = selected.has(entry.part) || selected.has('whole');
      entry.material.emissive.set(highlight ? '#c6a351' : '#000000');
      entry.material.emissiveIntensity = highlight ? .12 : 0;
      entry.material.color.set(highlight ? '#fff4d8' : '#ffffff');
    }
    const inspectUnderShield = selected.has('head') || selected.has('limbs');
    shellMaterial.opacity = inspectUnderShield ? .24 : 1;
    shellMaterial.transparent = inspectUnderShield; shellMaterial.depthWrite = !inspectUnderShield;
    shellMaterial.needsUpdate = true;
    group.userData.evidenceParts = [...selected];
    group.userData.shieldObservationOpacity = shellMaterial.opacity;
  }
  function setPose(progress: number, active: boolean) {
    if (disposed) return;
    const p = Number.isFinite(progress) ? THREE.MathUtils.clamp(progress, 0, 1) : 0;
    // Both ends settle. This is one bounded authored gesture, never an autonomous oscillator.
    const envelope = active ? Math.sin(Math.PI * p) ** 2 : 0;
    for (const { pivot, side, phase, amplitude, sweep } of strokers) {
      const stroke = Math.sin(p * Math.PI * 2.4 - phase);
      pivot.rotation.set(side * amplitude * envelope * stroke, side * sweep * envelope * Math.cos(p * Math.PI * 2.4 - phase),
        sweep * .5 * envelope * Math.sin(p * Math.PI * 2.4 - phase + .4));
    }
    for (const { bones, side } of antennae) for (let i = 0; i < bones.length; i++) {
      const probe = envelope * Math.sin(p * Math.PI * 1.6 + i * .25);
      bones[i].rotation.set(side * .009 * probe, side * .012 * probe, .009 * probe * Math.cos(i * .4));
    }
    group.userData.pose = { progress: p, active, illustrative: true };
    group.updateMatrixWorld(true);
  }
  function dispose() {
    if (disposed) return; disposed = true;
    geometries.forEach(g => g.dispose()); materials.forEach(({ material }) => material.dispose());
    skeletons.forEach(skeleton => skeleton.dispose()); group.removeFromParent(); group.clear();
    group.userData.disposed = true;
  }
  setPose(0, false);
  return { group, setPose, setEvidence, dispose };
}
