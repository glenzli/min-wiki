import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { iceCrystalSegments, GRAUPEL_CONTACT_RADIUS, type CloudParticle } from './cloudModel.ts';

/** The actual shared particle buffers and pose used by the cloud renderer. */
export function createCloudParticleGeometry() {
  const merge = (pieces: THREE.BufferGeometry[]) => {
    const geometry = mergeGeometries(pieces, false); pieces.forEach(piece => piece.dispose());
    if (!geometry) throw new Error('Particle geometry unavailable');
    return geometry;
  };
  const core = new THREE.CylinderGeometry(.075, .075, .045, 6);
  const iceParts = [core.clone().applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2))];
  for (const { start, end, top, bottom } of iceCrystalSegments) {
    const angle = Math.atan2(end[0] - start[0], end[1] - start[1]), length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const part = new THREE.CylinderGeometry(top, bottom, length, 5);
    iceParts.push(part.applyMatrix4(new THREE.Matrix4().makeRotationZ(-angle).setPosition((start[0] + end[0]) / 2, (start[1] + end[1]) / 2, 0)));
  }
  core.dispose();
  // All visible rime is contained by R. One real spherical cap reaches the
  // -x contact pole exactly; irregular detail cannot cross that support plane.
  const grainRadius = .07, grainCenter = GRAUPEL_CONTACT_RADIUS - grainRadius;
  const crust = new THREE.SphereGeometry(grainRadius, 12, 8);
  const rimeParts: THREE.BufferGeometry[] = [crust.clone().translate(-grainCenter, 0, 0)];
  for (let j = 0; j < 9; j++) {
    const azimuth = j * 2.39996, height = 1 - 2 * (j + .5) / 9, radius = Math.sqrt(1 - height * height) * grainCenter;
    rimeParts.push(crust.clone().translate(Math.cos(azimuth) * radius, height * grainCenter, Math.sin(azimuth) * radius));
  }
  crust.dispose();
  return { ice: merge(iceParts), graupel: new THREE.SphereGeometry(GRAUPEL_CONTACT_RADIUS * .88, 16, 10),
    rime: merge(rimeParts), droplet: new THREE.SphereGeometry(1, 10, 7) };
}

export function cloudParticleRotation(particle: CloudParticle, progress: number): readonly [number, number, number] {
  if (progress <= .14) return [0, 0, 0];
  return particle.kind === 'ice' ? [0, Math.max(0, progress - .14) * .45, Math.max(0, progress - .14) * .35]
    : particle.kind === 'graupel' ? [0, Math.max(0, progress - .14) * (particle.position[2] + .5), 0] : [0, 0, 0];
}
