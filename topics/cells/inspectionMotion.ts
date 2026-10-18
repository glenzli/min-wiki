import { create2DMotion } from '@glenzli/wiki-reader/animation2d';
import { clamp, type Box } from './model.ts';

/** Presentation only. The caller owns the finite camera clock; this sampler
 * never advances a process, schedules a frame or changes a specimen identity. */
export function createInspectionMotion() {
  const pose = { travel: 0, context: 0 };
  const motion = create2DMotion({ duration: 1000 })
    .add(pose, { travel: [0, 1], duration: 1000, ease: 'linear' }, 0)
    .add(pose, { context: [0, 1], duration: 430, ease: 'outSine' }, 0)
    .add(pose, { context: [1, 0], duration: 570, ease: 'inOutSine' }, 430);
  return {
    sample(from: Box, to: Box, fraction: number): Box {
      const p = clamp(fraction);
      motion.seek(p * 1000);
      if (p === 0) return { ...from };
      if (p === 1) return { ...to };
      const f = pose.travel;
      const cx = from.x + from.width / 2 + (to.x + to.width / 2 - from.x - from.width / 2) * f;
      const cy = from.y + from.height / 2 + (to.y + to.height / 2 - from.y - from.height / 2) * f;
      // A little context while changing inspection sites; logarithmic size
      // interpolation makes a close view settle without a sudden final rush.
      const travel = Math.hypot(to.x + to.width / 2 - from.x - from.width / 2,
        to.y + to.height / 2 - from.y - from.height / 2);
      const lift = Math.min(.13, travel / Math.max(from.width, to.width) * .11);
      const width = Math.exp(Math.log(from.width) * (1 - f) + Math.log(to.width) * f + pose.context * lift);
      const ratio = (from.height / from.width) * (1 - f) + (to.height / to.width) * f;
      const height = width * ratio;
      return { x: cx - width / 2, y: cy - height / 2, width, height };
    },
    dispose: () => motion.dispose(),
  };
}

/** The veil reveals the retained cutaway; no organelle is created or removed. */
export function createCutawayMotion(from: number, to: number) {
  const pose = { opacity: from };
  const motion = create2DMotion({ duration: 1000 })
    .add(pose, { opacity: [from, to], duration: 1000, ease: 'inOutSine' });
  return {
    sample(fraction: number) { motion.seek(clamp(fraction) * 1000); return pose.opacity; },
    dispose: () => motion.dispose(),
  };
}
