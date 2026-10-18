import {create2DMotion} from '@glenzli/wiki-reader/animation2d';

const folded='M0 0 C30 -2 34 -8 77 -9 C111 -10 130 -5 158 0 C125 3 113 7 77 6 C38 6 29 2 0 0Z';
const opening='M0 0 C30 -8 34 -32 77 -31 C111 -30 130 -16 158 0 C125 7 113 23 77 22 C38 21 29 6 0 0Z';
const open='M0 0 C30 -15 34 -43 77 -43 C111 -44 130 -21 158 0 C125 15 113 43 77 41 C38 40 29 11 0 0Z';
/** Blade opens from a retained midrib; the topic geometry still owns its
 * attachment, growth extent and species. No independent sway or growth clock. */
export function createLeafUnfold(){
  const pose={d:folded};
  const motion=create2DMotion({duration:1000})
    .add(pose,{d:[folded,opening],duration:550,ease:'inOutSine'},0)
    .add(pose,{d:[opening,open],duration:450,ease:'outSine'},550);
  return {sample(unfold:number){motion.seek(unfold*1000);return pose.d;},dispose:()=>motion.dispose()};
}
