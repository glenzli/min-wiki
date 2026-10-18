import { create2DMotion } from '@glenzli/wiki-reader/animation2d';

const bounded = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
export interface BladePose {
  leftSpread: number;
  rightSpread: number;
  tipLean: number;
  tipDrop: number;
  foldShade: number;
}

/** Authored botanical poses, not a tissue-mechanics solver. The petiole and
 * midrib base stay fixed. Expansion finishes before microscopic inspection is
 * available; dry curling begins only after this leaf has detached. */
export function createLeafMotion() {
  const opening: BladePose = { leftSpread: .16, rightSpread: .1, tipLean: 24, tipDrop: 52, foldShade: .7 };
  const drying = { spread: 1, tipLean: 0, tipDrop: 0, shade: 0 };
  const unfold = create2DMotion({ duration: 1000 })
    .add(opening, { leftSpread: [.16, .64], rightSpread: [.1, .46], tipLean: [24, 11], tipDrop: [52, 18], foldShade: [.7, .3], duration: 560, ease: 'inOutSine' }, 0)
    .add(opening, { leftSpread: [.64, 1], rightSpread: [.46, 1], tipLean: [11, 0], tipDrop: [18, 0], foldShade: [.3, 0], duration: 440, ease: 'outSine' }, 560);
  const curl = create2DMotion({ duration: 1000 })
    .add(drying, { spread: [1, .9], tipLean: [0, -13], tipDrop: [0, 24], shade: [0, .13], ease: 'inOutSine' });
  return {
    sample(growth: number, fall: number): BladePose {
      unfold.seek(bounded(growth / .88) * 1000);
      curl.seek(bounded(fall) * 1000);
      return {
        leftSpread: opening.leftSpread * drying.spread,
        rightSpread: opening.rightSpread * (1 - (1 - drying.spread) * .55),
        tipLean: opening.tipLean + drying.tipLean,
        tipDrop: opening.tipDrop + drying.tipDrop,
        foldShade: opening.foldShade + drying.shade,
      };
    },
    dispose() { unfold.dispose(); curl.dispose(); },
  };
}

/** All blade detail uses this same deformation, including vein junctions.
 * The base at y=165 and the petiole never move relative to one another. */
export function bladePoint(x: number, y: number, pose: BladePose): [number, number] {
  const distance = Math.max(0, Math.min(1, (165 - y) / 369));
  const spread = 1 - (1 - (x < 0 ? pose.leftSpread : pose.rightSpread)) * Math.min(1, distance * 3);
  return [x * spread + pose.tipLean * distance ** 1.7, y + pose.tipDrop * distance ** 2];
}
