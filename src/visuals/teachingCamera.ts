import type { PerspectiveCamera, Vector3 } from 'three';

/** Bound the whole screen, including wide desktop corners, rather than just its height. */
export const TEACHING_DIAGONAL_FOV = 24;
const radians = Math.PI / 180;
export function teachingVerticalFov(aspect: number) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return 2 * Math.atan(Math.tan(TEACHING_DIAGONAL_FOV * radians / 2) / Math.hypot(1, ratio)) / radians;
}
export function teachingDistanceScale(aspect: number, referenceVerticalFov = 42) {
  return Math.tan(referenceVerticalFov * radians / 2) / Math.tan(teachingVerticalFov(aspect) * radians / 2);
}
/** Preserve the current target plane and viewing direction when a viewport changes shape. */
export function updateTeachingLens(camera: PerspectiveCamera, focus: Vector3) {
  const fov = teachingVerticalFov(camera.aspect);
  const scale = Math.tan(camera.fov * radians / 2) / Math.tan(fov * radians / 2);
  camera.position.sub(focus).multiplyScalar(scale).add(focus);
  camera.fov = fov;
  camera.updateProjectionMatrix();
}
/** Apply to a freshly calculated, topic-owned camera pose; never repeatedly to the same pose. */
export function retreatPosition(position: Vector3, focus: Vector3, aspect: number, referenceVerticalFov = 42) {
  position.sub(focus).multiplyScalar(teachingDistanceScale(aspect, referenceVerticalFov)).add(focus);
}
