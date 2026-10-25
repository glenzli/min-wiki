import { IcosahedronGeometry, Vector3 } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SpecimenId } from './model';

const planes = [
  [1, .05, .09, .98], [-1, .06, .05, .9], [.08, 1, .03, .69], [.03, -1, -.02, .7],
  [.06, .03, 1, .81], [.04, -.06, -1, .83], [1, .8, .7, 1.45], [-1, .8, .6, 1.35],
  [.7, -.8, 1, 1.35], [-.8, -.7, -1, 1.36], [1, .5, -1, 1.5], [-1, -.3, .8, 1.4],
].map(([x, y, z, distance]) => ({ normal: new Vector3(x, y, z).normalize(), distance: distance / Math.hypot(x, y, z) }));

export function rockRelief(x: number, y: number, z: number): number {
  return Math.sin(x * 17 + Math.sin(y * 11)) * Math.cos(z * 16 - y * 9) * .008
    + Math.sin(x * 43 + z * 31) * Math.sin(y * 39 - z * 27) * .0035;
}

/** Radial intersections with irregular fracture planes, rather than a displayed primitive. */
export function buildSpecimenGeometry(specimen: SpecimenId, detailed: boolean) {
  const geometry = new IcosahedronGeometry(1, detailed ? 24 : 14);
  const specimenSeed = ['granite', 'basalt', 'sandstone', 'limestone', 'slate', 'marble', 'gneiss'].indexOf(specimen) + 1;
  const position = geometry.getAttribute('position');
  const direction = new Vector3();
  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize();
    let distance = Infinity;
    for (const [j, plane] of planes.entries()) {
      const dot = plane.normal.dot(direction);
      const offset = 1 + Math.sin(specimenSeed * 7.31 + j * 3.71) * .065;
      if (dot > .00001) distance = Math.min(distance, plane.distance * offset / dot);
    }
    let x = direction.x * distance, y = direction.y * distance, z = direction.z * distance;
    const relief = rockRelief(x, y, z);
    x += direction.x * relief; y += direction.y * relief; z += direction.z * relief;
    if (specimen === 'slate') { y *= .46; y += Math.sin(z * 22 + x * 7) * .006; }
    if (specimen === 'sandstone') y *= .8;
    if (specimen === 'gneiss') y *= .87;
    position.setXYZ(i, x, y, z);
  }
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv');
  const merged = mergeVertices(geometry, .00001); geometry.dispose();
  merged.computeVertexNormals(); merged.computeBoundingBox(); merged.computeBoundingSphere();
  return merged;
}
