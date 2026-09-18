export type CactusEvent = 'rain' | 'dry' | 'exchange';
const clamp = (x:number) => Math.max(0,Math.min(1,x));
const smooth = (x:number) => { x=clamp(x);return x*x*(3-2*x); };
export function cactusAt(event:CactusEvent, progress:number, initial:number) {
  const p=clamp(progress), start=Math.max(0,Math.min(3,initial));
  const uptake=smooth((p-.5)/.5), loss=smooth(p);
  return { reserve:event==='rain'?start+(3-start)*uptake:event==='dry'?start-Math.min(1,start)*loss:start,
    rain:event==='rain'?Math.sin(Math.PI*clamp(p/.52)):0,
    uptake:event==='rain'?clamp((p-.16)/.7):0,
    gas:clamp(p), stage:event==='rain'?(p<.24?0:p<.5?1:2):event==='dry'?3:4 };
}
