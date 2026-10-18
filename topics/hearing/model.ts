export const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const segment = (p:number,a:number,b:number) => clamp((p-a)/(b-a));
/** Qualitative place code: 0 = low pitch near apex, 1 = high pitch near base. */
export function responsePlace(pitch:number) { return .78 - .56 * clamp(pitch); }
export function hearingSequence(progress:number,pitch=.0,strength=.55) {
  const p=clamp(progress), amplitude=clamp(strength), hasInput=amplitude>0;
  // Stages show this input's evoked response, not spontaneous neural activity.
  // Positive input preserves the teaching sequence; no hearing threshold or
  // relationship between amplitude and neural firing rate is inferred here.
  const air=hasInput?segment(p,.02,.23):0, middle=hasInput?segment(p,.18,.43):0, cochlea=hasInput?segment(p,.35,.66):0;
  const transduction=hasInput?segment(p,.57,.78):0, nerve=hasInput?segment(p,.73,.95):0, brain=hasInput?segment(p,.92,1):0;
  // The envelope is a slowed teaching packet, not a frequency, latency or pressure measurement.
  const envelope=Math.sin(Math.PI*segment(p,.18,.76));
  return { p, air, middle, cochlea, transduction, nerve, brain, amplitude,
    place:responsePlace(pitch), deflection:Math.sin(p*Math.PI*(10+8*clamp(pitch)))*envelope*amplitude,
    phase:p<.23?0:p<.43?1:p<.73?2:3 };
}
/** Normalized positions of the retained cells in the uncoiled observation window. */
export const HAIR_CELL_POSITIONS = Array.from({length:18},(_,i)=>(34+i*24)/492);
export function membraneState(x:number,progress:number,pitch:number,strength:number) {
  const s=hearingSequence(progress,pitch,strength);
  const wavefront=s.cochlea*1.45,front=clamp((wavefront-x)*5);
  const envelope=Math.exp(-Math.pow((x-s.place)/.18,2));
  const packet=clamp((s.p-.35)/.48);
  const active=s.amplitude===0||packet===0||packet===1?0:Math.sin(Math.PI*packet);
  return {arrived:s.amplitude>0&&wavefront>=x,active,displacement:Math.sin(x*24-s.p*37)*envelope*front*active*s.amplitude};
}
export function membraneDisplacement(x:number,progress:number,pitch:number,strength:number) {
  return membraneState(x,progress,pitch,strength).displacement;
}
/** B follows one retained cell nearest the response peak. Arrival is geometric,
 * so a displacement zero crossing cannot turn an arrived packet back off.
 * Its enlarged bundle/fluid motion is a qualitative projection, not a solved
 * phase relation between basilar-membrane motion and stereociliary deflection. */
export function selectedHairCell(progress:number,pitch:number,strength:number) {
  const s=hearingSequence(progress,pitch,strength);
  const index=HAIR_CELL_POSITIONS.reduce((closest,x,i)=>
    Math.abs(x-s.place)<Math.abs(HAIR_CELL_POSITIONS[closest]-s.place)?i:closest,0);
  const x=HAIR_CELL_POSITIONS[index],local=membraneState(x,progress,pitch,strength);
  return {index,x,...local,transduction:local.arrived?s.transduction:0,nerve:local.arrived?s.nerve:0};
}
