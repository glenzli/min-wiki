export type CellKind = 'barrier' | 'muscle' | 'neuron';
export const clamp = (v:number)=>Math.max(0,Math.min(1,v));
export function muscleState(progress:number) {
  const activation=Math.sin(Math.PI*clamp(progress))**2;
  return { activation, left:185+80*activation, right:795-80*activation, filamentLength:178 };
}
export function nerveSignal(progress:number) {
  const p=clamp(progress);
  return { x:251+604*Math.min(1,p/.8), transmitter:clamp((p*100-80)/10), response:clamp((p*100-90)/10) };
}
export function barrierParticle(index:number,progress:number) {
  const p=clamp(progress),x=154+index*88;
  // The intact, multilayer surface blocks these external particles; they never pass through the skin.
  return {x:x+Math.sin(p*Math.PI)*24,y:82+Math.min(.6,p)/.6*(90+index%2*9),blocked:p>=.6};
}
