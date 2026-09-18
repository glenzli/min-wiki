/** Illustrative expansion after emergence, followed by a waiting interval; not flight kinematics. */
export function wingPreparation(value: number) {
  const p=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
  const v=Math.min(1,p/.72),extension=v*v*(3-2*v);
  return { width:.22+.78*extension,length:.46+.54*extension,phase:p<.08?0:p<.72?1:2 };
}
