export type Process = 'melt' | 'freeze' | 'evaporate' | 'condense';
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export function phaseState(kind: Process, progress: number) {
  const p = clamp(progress);
  const ice = kind === 'melt' ? 1-p : kind === 'freeze' ? p : 0;
  const liquidDepth = kind === 'evaporate' ? 164*(1-.5*p) : 164*(1-ice);
  const iceDepth = 164*1.09*ice;
  const top = 404-liquidDepth-iceDepth;
  return { ice, liquidDepth, iceDepth, top, front: top+iceDepth };
}
export function icePosition(index: number) {
  const row=Math.floor(index/6),col=index%6;
  return {x:54+col*48+([0,3,4].includes(row)?24:0),y:225+[0,14,42,56,84,98][row]!};
}
export function moleculePosition(index: number, kind: Process, progress: number) {
  const p = clamp(progress), {ice} = phaseState(kind,p);
  const col=index%6, row=Math.floor(index/6);
  const liquidX=76+col*40+Math.sin(index*13.7+p*9)*7;
  const liquidY=238+row*23+Math.cos(index*7.3+p*11)*6;
  if(kind==='freeze'||kind==='melt') {
    // Freeze rows progressively; each existing molecule settles instead of being replaced.
    const order=clamp((ice*7-row)/1.2);
    const smooth=order*order*(3-2*order), solid=icePosition(index);
    return {x:liquidX*(1-smooth)+solid.x*smooth,
      y:liquidY*(1-smooth)+solid.y*smooth, order:smooth, gas:0};
  }
  const gasX=32+((index*83)%292), gasY=35+((index*67)%165);
  if(kind==='condense') {
    const f=clamp((p*1.3-index/36)/.3), ease=f*f*(3-2*f);
    const local=index%12;
    const dropX=74+Math.floor(index/12)*104+(local%3-1)*16+Math.sin(index*7+p*8)*3;
    const dropY=103+Math.floor(local/3)*14+Math.cos(index*3+p*7)*3.6;
    return {x:gasX*(1-ease)+dropX*ease,
      y:(gasY+90)*(1-ease)+dropY*ease,order:0,gas:1-ease};
  }
  const f=clamp((p*1.25-index/24)/.25);
  // The first part carries the molecule to the liquid surface, then into the air.
  const y=f<.3 ? liquidY+(220-liquidY)*f/.3 : 220+(gasY-220)*(f-.3)/.7;
  return {x:liquidX+(gasX-liquidX)*f,y,order:0,gas:f};
}
