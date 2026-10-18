import {BEE_VISIT,pollinationFrame} from './model.ts';
import {create2DMotion} from '@glenzli/wiki-reader/animation2d';

const clamp=(p:number)=>Math.max(0,Math.min(1,p));
const smooth=(p:number)=>{const q=clamp(p);return q*q*(3-2*q);};
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;

/** Authored 2D articulation, not an aerodynamic solver. Motion is a pure
 * projection of the existing observation progress: pause, scrub, case return
 * and reduced motion need no additional RAF, timer or background animation.
 * The apparent wing phase plus exposure envelope is deliberately illustrative;
 * it is not a replay at a honeybee's measured wingbeat frequency. */
export function createBeeMotion(){
  // One authored stroke, sampled by the existing process clock. The downstroke
  // and return have different durations; projection narrows at each reversal.
  const stroke={sweep:-42,projection:.3};
  const wings=create2DMotion({duration:100})
    .add(stroke,{sweep:[-42,44],duration:42,ease:'inOutSine'},0)
    .add(stroke,{sweep:[44,-42],duration:58,ease:'inOutSine'},42)
    .add(stroke,{projection:[.3,1],duration:21,ease:'outSine'},0)
    .add(stroke,{projection:[1,.3],duration:21,ease:'inSine'},21)
    .add(stroke,{projection:[.3,1],duration:29,ease:'outSine'},42)
    .add(stroke,{projection:[1,.3],duration:29,ease:'inSine'},71);
  return {dispose:()=>wings.dispose(),sample(progress:number,reducedMotion=false){
  const p=Number.isFinite(progress)?Math.max(0,Math.min(3,progress)):0;
  const route=pollinationFrame(p),seconds=p*8;
  const landing=smooth((p-.27)/.15),takeoff=smooth((p-.62)/.15);
  const flight=clamp(1-landing+takeoff);
  const departure=smooth((p-BEE_VISIT.departure)/(BEE_VISIT.exit-BEE_VISIT.departure));
  wings.seek(reducedMotion?21:(seconds*1000)%100);
  const slow=reducedMotion?0:Math.sin(seconds*Math.PI*2*.71);
  const wingProjection=stroke.projection;
  const pitch=(-7+4*slow)*(1-landing)-(17*Math.sin(Math.PI*departure)+5*departure)*takeoff;
  // The thorax pitches around the tracked pollen site (41,-2). A grain carried
  // there follows the same route as the insect, with no offset at deposition.
  const nearWing={angle:mix(-57,-12+stroke.sweep,flight),
    x:mix(.75,1,flight),y:mix(.52,wingProjection,flight),opacity:mix(.76,.52,flight)};
  const farWing={angle:mix(-60,12-stroke.sweep*.87,flight),
    x:mix(.68,.87,flight),y:mix(.46,wingProjection*.83,flight),opacity:mix(.36,.29,flight)};
  const rest=landing*(1-takeoff);
  const legs=[
    {a:{x:8,y:8},k:{x:mix(19,26,rest),y:mix(27,14,rest)},f:{x:mix(29,41,rest),y:mix(37,-2,rest)}},
    {a:{x:-3,y:11},k:{x:mix(-3,-9,rest),y:mix(29,21,rest)},f:{x:mix(6,-18,rest),y:mix(42,31,rest)}},
    {a:{x:-13,y:9},k:{x:mix(-30,-29,rest),y:mix(25,21,rest)},f:{x:mix(-39,-44,rest),y:mix(40,30,rest)}}
  ];
  return {x:route.beeX,y:route.beeY,pitch,nearWing,farWing,legs,
    abdomenPitch:flight*slow*2.3,antenna:slow*(.5+flight)*2,
    blur:reducedMotion?0:flight*.13,contact:rest,contactFlex:reducedMotion?0:rest*slow*.8,
    opacity:1-smooth((p-1.12)/.3),
    leafSway:reducedMotion?0:Math.sin(Math.PI*p/3)*Math.sin(seconds*Math.PI*2*.23)*1.1};
  }};
}
