import * as THREE from 'three';
import type { LifeState } from './model.ts';

type V = [number, number, number];
/** Authored morphology, not a specimen scan or a calibrated allometric model. */
class Surface {
  positions: number[] = []; colors: number[] = [];
  constructor(readonly color: THREE.Color) {}
  tri(a: V, b: V, c: V, tone = 1) {
    for (const point of [a, b, c]) { this.positions.push(...point); this.colors.push(this.color.r * tone, this.color.g * tone, this.color.b * tone); }
  }
  quad(a: V, b: V, c: V, d: V, tone = 1) { this.tri(a, b, c, tone); this.tri(a, c, d, tone); }
  mesh(double = false) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    // Weld shared vertices before normal generation so branches stay round at low resolution.
    const smooth = weld(geometry); geometry.dispose(); smooth.computeVertexNormals();
    return new THREE.Mesh(smooth, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88, side: double ? THREE.DoubleSide : THREE.FrontSide }));
  }
}
function weld(source: THREE.BufferGeometry) {
  const p = source.getAttribute('position'), c = source.getAttribute('color');
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], seen = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(5)},${p.getY(i).toFixed(5)},${p.getZ(i).toFixed(5)}`;
    let index = seen.get(key);
    if (index === undefined) { index = positions.length / 3; seen.set(key, index); positions.push(p.getX(i), p.getY(i), p.getZ(i)); colors.push(c.getX(i), c.getY(i), c.getZ(i)); }
    indices.push(index);
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    .setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)).setIndex(indices);
}
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
function tube(surface: Surface, path: (t: number) => V, radius: (t: number) => number, rings = 12, sides = 10, rib = 0) {
  const row: V[][] = [];
  for (let j = 0; j <= rings; j++) {
    const t = j / rings, p = new THREE.Vector3(...path(t)), tangent = new THREE.Vector3(...path(Math.min(1, t + .001))).sub(new THREE.Vector3(...path(Math.max(0, t - .001)))).normalize();
    const axis = new THREE.Vector3(0, 0, 1);
    if (Math.abs(tangent.dot(axis)) > .92) axis.set(1, 0, 0);
    const u = tangent.clone().cross(axis).normalize(), v = tangent.clone().cross(u).normalize();
    row[j] = [];
    for (let k = 0; k <= sides; k++) {
      const a = k / sides * Math.PI * 2, r = radius(t) * (1 + rib * Math.cos(a * 12));
      row[j][k] = p.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r).toArray() as V;
      if (j && k) surface.quad(row[j - 1][k - 1], row[j - 1][k], row[j][k], row[j][k - 1], .96 + .04 * Math.sin(k * 2.1));
    }
  }
  const first = path(0), last = path(1);
  for (let k = 1; k <= sides; k++) { surface.tri(first, row[0][k], row[0][k - 1]); surface.tri(last, row[rings][k - 1], row[rings][k]); }
}
/** A folded lamina, with width taper and a non-planar midrib. */
function blade(surface: Surface, base: V, direction: V, width: number, lobed = false, divisions = 6) {
  const d = new THREE.Vector3(...direction), length = d.length(), along = d.clone().normalize();
  let across = new THREE.Vector3(0, 0, 1).cross(along).normalize();
  if (across.lengthSq() < .2) across = new THREE.Vector3(1, 0, 0);
  const normal = along.clone().cross(across).normalize();
  const row: V[][] = [];
  for (let j = 0; j <= divisions; j++) {
    const t = j / divisions;
    const shape = lobed ? Math.pow(Math.sin(Math.PI * Math.max(.012, t)), .6) * (1 + .05 * Math.sin(t * 22)) : Math.sin(Math.PI * Math.pow(t, .65));
    const center = new THREE.Vector3(...base).addScaledVector(along, length * t).addScaledVector(normal, Math.sin(t * Math.PI) * length * .12);
    row[j] = [-1, 0, 1].map(side => center.clone().addScaledVector(across, side * width * shape)
      .addScaledVector(normal, side ? -width * .13 * Math.sin(t * Math.PI) : .006).toArray() as V);
    if (j) for (let k = 0; k < 2; k++) surface.quad(row[j - 1][k], row[j][k], row[j][k + 1], row[j - 1][k + 1], k ? .92 : 1.06);
  }
  return { along, across, normal, length };
}
function cushions(surface: Surface, scar: Surface, height: number, radius: number, rows: number, columns: number) {
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const angle = (col + (row % 2) / 2) / columns * Math.PI * 2;
    const y = .12 + row / rows * height, h = height / rows * .47, a = Math.PI / columns * .87;
    const at = (theta: number, yy: number, relief = 0): V => [(radius * (1 - yy / (height + .1) * .22) + relief) * Math.cos(theta), yy, (radius * (1 - yy / (height + .1) * .22) + relief) * Math.sin(theta)];
    const relief = radius > .5 ? .014 : .008;
    const center = at(angle, y, relief), tips = [at(angle, y + h), at(angle + a, y), at(angle, y - h), at(angle - a, y)];
    for (let j = 0; j < 4; j++) surface.tri(center, tips[j], tips[(j + 1) % 4], .9 + .045 * j);
    // The small leaf scar occupies only the upper part of the larger leaf cushion.
    const yy = y + h * .25, ar = a * .34;
    scar.quad(at(angle - ar, yy, relief + .003), at(angle, yy + h * .16, relief + .003), at(angle + ar, yy, relief + .003), at(angle, yy - h * .12, relief + .003));
  }
}
function buildLycopsid(detail: boolean, mobile: boolean) {
  const bark = new Surface(new THREE.Color('#675f3b')), relief = new Surface(new THREE.Color('#a3a16a')),
    scar = new Surface(new THREE.Color('#3d4c30')), leaf = new Surface(new THREE.Color('#668345'));
  const height = detail ? 3.8 : 3.1, radius = detail ? .71 : .24;
  tube(bark, t => [0, t * height, 0], t => radius * (1 - t * .22), detail ? 28 : 22, mobile ? 24 : 32, .012);
  cushions(relief, scar, height - .1, radius, detail ? 12 : 21, detail ? 24 : 14);
  if (!detail) {
    for (let j = 0; j < 6; j++) {
      const a = j / 6 * Math.PI * 2;
      tube(bark, t => [Math.cos(a) * .95 * t, .12 - .16 * t + .08 * Math.sin(t * Math.PI), Math.sin(a) * .95 * t], t => .15 * (1 - t * .85), 8, 8);
    }
    for (const side of [-1, 1]) {
      const branch = (t: number): V => [side * .67 * t, 3 + .84 * t, .15 * Math.sin(t * 2)];
      tube(bark, branch, t => .15 * (1 - t * .65), 12, 12);
      for (const fork of [-1, 1]) {
        const start = branch(1), dir: V = [side * .31 + fork * .32, .69, fork * .33];
        tube(bark, t => add(start, [dir[0] * t, dir[1] * t, dir[2] * t]), t => .06 * (1 - t * .75), 8, 8);
        // Helical insertion along terminal axes: narrow microphylls, not a palm crown.
        for (let j = 0; j < (mobile ? 36 : 48); j++) {
          const t = .13 + j / (mobile ? 36 : 48) * .82, a = j * 2.39996;
          const base = add(start, [dir[0] * t, dir[1] * t, dir[2] * t]);
          blade(leaf, base, [Math.cos(a) * .45, .15 + .2 * t, Math.sin(a) * .45], .017, false, 5);
        }
      }
    }
  } else {
    // A few retained leaves demonstrate the attachment without concealing the surface.
    for (let j = 0; j < 9; j++) {
      const a = j * 2.4;
      blade(leaf, [Math.cos(a) * radius * .8, 3.35 + j * .04, Math.sin(a) * radius * .8], [Math.cos(a) * .8, .45, Math.sin(a) * .8], .03, false, 7);
    }
  }
  return [bark.mesh(), relief.mesh(), scar.mesh(), leaf.mesh(true)];
}
function buildCalamite(detail: boolean, mobile: boolean) {
  const stem = new Surface(new THREE.Color('#65704b')), nodes = new Surface(new THREE.Color('#858969')),
    leaves = new Surface(new THREE.Color('#668846'));
  const h = 4.2, radius = detail ? .44 : .14, count = detail ? 5 : 9;
  tube(stem, t => [Math.sin(t * 1.6) * .06, h * t, 0], t => radius * (1 - t * .32), 45, mobile ? 24 : 36, .018);
  for (let n = 1; n < count; n++) {
    const y = n / count * h, r = radius * (1 - n / count * .32);
    tube(nodes, t => [.06 * Math.sin(y / h * 1.6), y + (t - .5) * .05, 0], t => r * (1.02 + .08 * Math.sin(t * Math.PI)), 3, mobile ? 24 : 36);
    if (detail && n !== 3) continue;
    const arms = detail ? 6 : 7;
    for (let a = 0; a < arms; a++) {
      const angle = a / arms * Math.PI * 2 + n * .3, length = detail ? 1.05 : .55 + .16 * Math.sin(n * 1.4);
      const base: V = [.06 * Math.sin(y / h * 1.6) + r * Math.cos(angle), y, r * Math.sin(angle)];
      const path = (t: number): V => add(base, [Math.cos(angle) * t * length, .35 * t + .11 * t * t, Math.sin(angle) * t * length]);
      tube(stem, path, t => (detail ? .025 : .016) * (1 - .8 * t), 6, 6);
      for (let whorl = 1; whorl <= (mobile ? 2 : 3); whorl++) {
        const at = path(whorl / 3.4);
        for (let j = 0; j < 6; j++) {
          const theta = j / 6 * Math.PI * 2 + angle;
          blade(leaves, at, [Math.cos(theta) * .23, .1, Math.sin(theta) * .23], .012, false, 4);
        }
      }
    }
  }
  return [stem.mesh(), nodes.mesh(), leaves.mesh(true)];
}
function buildSeedFern(detail: boolean, mobile: boolean) {
  const stem = new Surface(new THREE.Color('#6b7042')), lamina = new Surface(new THREE.Color('#688845')),
    veins = new Surface(new THREE.Color('#9baa66'));
  const rachis = (t: number): V => [.13 * Math.sin(t * 3), .15 + t * 4, -.18 * Math.sin(t * Math.PI)];
  tube(stem, rachis, t => .052 * (1 - .82 * t), 24, 9);
  const count = detail ? 4 : 8;
  for (let i = 0; i < count; i++) for (const side of [-1, 1]) {
    const t = .13 + i / count * .76, origin = rachis(t), span = detail ? 1.34 : .42 + .91 * Math.sin(t * Math.PI);
    const pinna = (u: number): V => add(origin, [side * span * u, .45 * u + .17 * u * u, .12 * Math.sin(u * 3 + i)]);
    tube(stem, pinna, u => .02 * (1 - u * .84), 10, 6);
    const pairs = mobile ? 5 : 9;
    for (let j = 1; j < pairs; j++) for (const edge of [-1, 1]) {
      const u = j / pairs, base = pinna(u), len = (.26 + .13 * Math.sin(u * Math.PI)) * (detail ? 1.25 : 1);
      const direction: V = [side * len * .33, edge * len, .03 * Math.sin(j * 2)];
      const shape = blade(lamina, base, direction, .075 * (1 - .25 * u), true, 7);
      // A midvein and branching lateral veins are separate visible structures.
      const mid = (v: number): V => add(base, [direction[0] * v + shape.normal.x * Math.sin(v * Math.PI) * len * .12,
        direction[1] * v + shape.normal.y * Math.sin(v * Math.PI) * len * .12,
        direction[2] * v + shape.normal.z * Math.sin(v * Math.PI) * len * .12 + .006]);
      tube(veins, mid, v => .0025 * (1 - .7 * v), 5, 3);
      for (let k = 1; k <= (mobile ? 2 : 3); k++) for (const lr of [-1, 1]) {
        const v = k / 5.5, start = mid(v), width = .052 * Math.sin(v * Math.PI);
        const lateral = (q: number): V => add(start, [shape.across.x * lr * width * q + direction[0] * .15 * q,
          shape.across.y * lr * width * q + direction[1] * .15 * q,
          shape.across.z * lr * width * q + direction[2] * .15 * q]);
        tube(veins, q => lateral(q * .6), q => .0018 * (1 - .6 * q), 2, 3);
        // Distal dichotomy is expressed in the mesh rather than claimed in the caption alone.
        const fork = lateral(.6), end = lateral(1);
        for (const sign of [-1, 1]) {
          const tip: V = [end[0] + shape.along.x * .024 * sign, end[1] + shape.along.y * .024 * sign, end[2] + shape.along.z * .024 * sign];
          const tangent = new THREE.Vector3(...tip).sub(new THREE.Vector3(...fork));
          const side = shape.normal.clone().cross(tangent).normalize().multiplyScalar(.0012);
          veins.quad(add(fork, side.toArray() as V), add(tip, side.toArray() as V), add(tip, side.clone().negate().toArray() as V), add(fork, side.clone().negate().toArray() as V));
        }
      }
    }
  }
  const tip = rachis(1); blade(lamina, tip, [0, .35, .02], .075, true, 7);
  return [stem.mesh(), lamina.mesh(true), veins.mesh(true)];
}
export function createPlantGeometry(plant: LifeState['plant'], detail: LifeState['detail'], mobile: boolean): THREE.Group {
  const group = new THREE.Group(), zoom = detail === 'surface';
  group.add(...(plant === 'lycopsid' ? buildLycopsid(zoom, mobile) : plant === 'calamite' ? buildCalamite(zoom, mobile) : buildSeedFern(zoom, mobile)));
  group.position.y = -2.1;
  group.userData = { authoredReconstruction: true, plant, detail, calibratedScale: false };
  return group;
}
export function triangleCount(group: THREE.Object3D): number {
  let result = 0;
  group.traverse(object => { if (object instanceof THREE.Mesh) result += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3; });
  return result;
}
export function disposePlantGeometry(group: THREE.Group) {
  group.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); } });
  group.removeFromParent();
}
