export const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const segment = (p:number,a:number,b:number) => clamp((p-a)/(b-a));
/** Qualitative place code: 0 = low pitch near apex, 1 = high pitch near base. */
export function responsePlace(pitch:number) { return .78 - .56 * clamp(pitch); }
export function hearingSequence(progress:number,pitch=.0,strength=.55) {
  const p=clamp(progress), amplitude=.35+.65*clamp(strength);
  const air=segment(p,.02,.23), middle=segment(p,.18,.43), cochlea=segment(p,.35,.66);
  const transduction=segment(p,.57,.78), nerve=segment(p,.73,.95), brain=segment(p,.92,1);
  // The envelope is a slowed teaching packet, not a frequency, latency or pressure measurement.
  const envelope=Math.sin(Math.PI*segment(p,.18,.76));
  return { p, air, middle, cochlea, transduction, nerve, brain, amplitude,
    place:responsePlace(pitch), deflection:Math.sin(p*Math.PI*(10+8*clamp(pitch)))*envelope*amplitude,
    phase:p<.23?0:p<.43?1:p<.73?2:3 };
}
export function membraneDisplacement(x:number,progress:number,pitch:number,strength:number) {
  const s=hearingSequence(progress,pitch,strength);
  const front=clamp((s.cochlea*1.45-x)*5);
  const envelope=Math.exp(-Math.pow((x-s.place)/.18,2));
  const active=Math.sin(Math.PI*clamp((s.p-.35)/.48));
  return Math.sin(x*24-s.p*37)*envelope*front*active*s.amplitude;
}
