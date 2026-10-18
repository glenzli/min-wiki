import {create2DMotion} from '@glenzli/wiki-reader/animation2d';

// Equal command topology keeps the petal's base and its original node fixed.
// These authored curl poses do not reconstruct tissue mechanics.
function outline(c:number){return `M0 9 C-27 -12 ${-57+12*c} -51 ${-48+10*c} ${-81+20*c} C${-42+12*c} ${-106+30*c} -17 ${-119+40*c} ${-4+15*c} ${-112+48*c} Q${17*c} ${-103+52*c} ${5+14*c} ${-112+48*c} C${29+8*c} ${-117+40*c} ${51-20*c} ${-98+22*c} ${49-24*c} ${-76+10*c} C${51-18*c} -44 22 -7 0 9Z`;}
export function createPetalCurl(){
  const pose={d:outline(0),curl:0};
  const motion=create2DMotion({duration:1000})
    .add(pose,{d:[outline(0),outline(.45)],curl:[0,.45],duration:420,ease:'inOutSine'},0)
    .add(pose,{d:[outline(.45),outline(1)],curl:[.45,1],duration:580,ease:'inOutSine'},420);
  return {sample(curl:number){motion.seek(curl*1000);return pose;},dispose:()=>motion.dispose()};
}
