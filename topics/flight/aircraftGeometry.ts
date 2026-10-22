import { BufferGeometry, Float32BufferAttribute } from 'three';
import { airfoilContour } from './airfoil.ts';

export function createCamberedWing(side: -1 | 1, halfSpan = 5.25, rootChord = 2.0, tipChord = 1.2): BufferGeometry {
  const sections = 8, contour = airfoilContour();
  const ring = contour.length, positions: number[] = [], indices: number[] = [];
  for (let j = 0; j <= sections; j++) {
    const span = j / sections, chord = rootChord + (tipChord - rootChord) * span;
    for (const [x, y] of contour) positions.push((x - .38) * chord + .42 * span, y * chord + .24 * span, side * halfSpan * span);
  }
  for (let j = 0; j < sections; j++) for (let i = 0; i < ring; i++) {
    const a = j * ring + i, b = j * ring + (i + 1) % ring, c = a + ring, d = b + ring;
    if (side > 0) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
  }
  // Retain both end faces: no exposed hollow tip or root during orbit inspection.
  for (const j of [0, sections]) {
    const base = j * ring, center = positions.length / 3;
    const span = j / sections, chord = rootChord + (tipChord - rootChord) * span;
    positions.push(.12 * chord + .42 * span, .035 * chord + .24 * span, side * halfSpan * span);
    for (let i = 0; i < ring; i++) {
      const a = base + i, b = base + (i + 1) % ring;
      if ((j === 0) === (side > 0)) indices.push(center, a, b); else indices.push(center, b, a);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function createFuselage(): BufferGeometry {
  const stations = [
    [-4.12, .025, .02, -.03], [-3.98, .23, .24, -.015], [-3.65, .40, .39, .015],
    [-2.9, .52, .51, .035], [-2.15, .59, .57, .06], [-1.3, .59, .58, .06],
    [-.35, .52, .53, .035], [.65, .43, .44, 0], [1.65, .30, .31, -.015],
    [2.55, .20, .205, 0], [3.35, .105, .105, .035], [3.75, .015, .02, .06],
  ];
  const count = 40, positions: number[] = [], indices: number[] = [];
  stations.forEach(([x, ry, rz, cy]) => {
    for (let i = 0; i <= count; i++) { const a = i / count * Math.PI * 2; positions.push(x!, cy! + Math.sin(a) * ry!, Math.cos(a) * rz!); }
  });
  for (let j = 0; j < stations.length - 1; j++) for (let i = 0; i < count; i++) {
    const a = j * (count + 1) + i, b = a + 1, c = a + count + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  for (const j of [0, stations.length - 1]) {
    const center = positions.length / 3, station = stations[j]!;
    positions.push(station[0]!, station[3]!, 0);
    for (let i = 0; i < count; i++) {
      const a = j * (count + 1) + i;
      if (j === 0) indices.push(center, a, a + 1); else indices.push(center, a + 1, a);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}
