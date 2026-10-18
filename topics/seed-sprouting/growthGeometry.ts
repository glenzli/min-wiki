const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const p=clamp(v);return p*p*(3-2*p);};
const phase=(p:number,start:number,end:number)=>smooth((p-start)/(end-start));
export interface Point{x:number;y:number}
/** Qualitative common-bean morphology, not a growth-rate or force model.
 * Root origin, cotyledon node and the first opposite leaf node are shared
 * attachment points. All intermediate geometry is continuous in progress. */
export function beanGeometry(progress:number){
  const p=Number.isFinite(progress)?Math.max(0,Math.min(3,progress)):0;
  const lift=phase(p,.95,2.15),shoot=phase(p,1.9,2.85);
  const cot:Point={x:380+15*Math.sin(Math.PI*lift),y:350-103*lift};
  const leafNode:Point={x:cot.x,y:cot.y-67*shoot};
  const root=phase(p,.3,2.35),hook=43*Math.sin(Math.PI*lift);
  const leafLeft=phase(p,2.05,2.9),leafRight=phase(p,2.18,3);
  const coatFall=phase(p,1.78,2.65),split=phase(p,.22,1.2);
  return {p,rootOrigin:{x:380,y:350},cot,leafNode,root,shoot,lift,split,coatFall,
    swell:1+.12*phase(p,0,.45),cotOpen:phase(p,1.55,2.45),
    cotGreen:phase(p,.9,2.45),leafLeft,leafRight,
    leafAngleLeft:-154-10*(1-leafLeft),leafAngleRight:-26+10*(1-leafRight),
    hypocotyl:`M380 350 C${380-hook} ${350-45*lift} ${cot.x-2*hook} ${cot.y-60*Math.sin(Math.PI*lift)} ${cot.x} ${cot.y}`,
    epicotyl:`M${cot.x} ${cot.y} Q${cot.x+4*shoot} ${cot.y-36*shoot} ${leafNode.x} ${leafNode.y}`,
    coats:[-1,1].map(sign=>({x:cot.x+sign*(3*split+55*coatFall),y:cot.y+(318-cot.y)*coatFall,
      angle:sign*(12*split+25*coatFall),scale:(1-.2*lift)*(1-.5*coatFall)})),
    phase:p<.3?0:p<.95?1:p<1.7?2:p<2.2?3:p<2.85?4:5};
}
/** Same primary root at every frame; lateral roots start on this curve. */
export function primaryRootPoint(t:number):Point{
  const u=clamp(t),v=1-u;
  return {x:380*v*v*v+3*382*v*v*u+3*361*v*u*u+389*u*u*u,
    y:350*v*v*v+3*397*v*v*u+3*449*v*u*u+502*u*u*u};
}
