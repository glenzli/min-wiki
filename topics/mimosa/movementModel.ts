/** Distinct teaching experiments: illustrative calcium integration and directional shoot growth. */
export type PlantCase = 'mimosa' | 'flytrap' | 'seedling';
export type LightDirection = 'left' | 'right' | 'both';
export type TouchPattern = 'once' | 'twice';
export const plantCase = (value: string | null): PlantCase => value === 'flytrap' || value === 'seedling' ? value : 'mimosa';
const unit = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const smooth = (n: number) => { const p=unit(n); return p*p*(3-2*p); };
export const MEMORY_WINDOW = 30;
export const FIRST_TOUCH = 2;
export const SIGNAL_THRESHOLD = .62*(1+Math.exp(-MEMORY_WINDOW/25));
export function flytrapDuration(pattern: TouchPattern, gap: number) { return pattern === 'once' ? 40 : FIRST_TOUCH + Math.max(1,Math.min(45,gap)) + 8; }
export function flytrapFrame(progress: number, pattern: TouchPattern, gap: number) {
  const interval=Math.max(1,Math.min(45,Number.isFinite(gap)?gap:5));
  const time=unit(progress)*flytrapDuration(pattern,interval);
  const touches=pattern==='once'?[FIRST_TOUCH]:[FIRST_TOUCH,FIRST_TOUCH+interval];
  const occurred=touches.filter(t=>t<=time);
  const signal=Math.min(1.2,occurred.reduce((sum,t)=>sum+.62*Math.exp(-(time-t)/25),0));
  const closureTime=pattern==='twice' && interval<=MEMORY_WINDOW ? touches[1]! : Infinity;
  const closure=smooth((time-closureTime-.25)/1.5);
  const stage:'ready'|'first'|'triggered'|'closing'|'closed'|'late'=closure>0 ? closure<1?'closing':'closed' : occurred.length===0?'ready':occurred.length===1?'first':interval<=MEMORY_WINDOW?'triggered':'late';
  return {time,touches,signal,closure,stage,count:occurred.length,trigger:occurred.some(t=>time>=t&&time-t<1.1)};
}
export function growthFrame(progress: number, direction: LightDirection) {
  const p=unit(progress), sign=direction==='left'?-1:direction==='right'?1:0;
  // Relative side lengths, not measured auxin or growth rates. The shaded side elongates more.
  const left=1+.3*p+(sign===1?.09*p:0), right=1+.3*p+(sign===-1?.09*p:0);
  const baseLength=180, halfWidth=baseLength*.05;
  const length=baseLength*(left+right)/2, bend=baseLength*(left-right)/(2*halfWidth);
  return {progress:p,left,right,length,bend,halfWidth,signal:sign*unit(p/.25)};
}
export function growthPoint(state: ReturnType<typeof growthFrame>, t: number, side=0): [number,number] {
  const a=state.bend*unit(t), length=state.length, b=state.bend;
  const x=Math.abs(b)<1e-8?0:length/b*(1-Math.cos(a));
  const y=Math.abs(b)<1e-8?-length*unit(t):-length/b*Math.sin(a);
  return [x+side*state.halfWidth*Math.cos(a),y+side*state.halfWidth*Math.sin(a)];
}
