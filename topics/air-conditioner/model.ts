export const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
export type Point = readonly [number, number];
// One closed circuit, in flow order. Each section owns its thermodynamic change.
export const circuit: readonly (readonly Point[])[] = [
 [[190,165],[110,165],[110,195],[245,195],[245,225],[110,225],[110,255],[190,255]],
 [[190,255],[190,355],[500,355],[500,440],[590,440],[590,320]],
 [[590,320],[590,300],[520,300],[520,270],[685,270],[685,240],[520,240],[520,210],[610,210]],
 [[610,210],[715,210],[715,130],[350,130],[350,90],[190,90],[190,165]],
];
export function along(points: readonly Point[], fraction: number): Point {
 const lengths=points.slice(1).map((b,i)=>Math.hypot(b[0]-points[i][0],b[1]-points[i][1]));
 let left=clamp01(fraction)*lengths.reduce((a,b)=>a+b,0);
 for(let i=0;i<lengths.length;i++){if(left<=lengths[i]||i===lengths.length-1){const k=left/lengths[i];return [points[i][0]+(points[i+1][0]-points[i][0])*k,points[i][1]+(points[i+1][1]-points[i][1])*k];} left-=lengths[i];}
 return points[points.length-1];
}
export function cycleState(progress: number) {
 const p=clamp01(progress), stage=Math.min(3,Math.floor(p*4)), local=p===1?1:p*4-stage;
 // Stylized enthalpy units: evaporator +3, compressor +1, condenser -4,
 // expansion is approximately isenthalpic; not calibrated refrigerant data.
 const enthalpy = stage===0 ? 1+3*local : stage===1 ? 4+clamp01((local-.65)/.2) : stage===2 ? 5-4*local : 1;
 const pressure=stage===0?0:stage===1?clamp01((local-.65)/.2):stage===2?1:1-clamp01((local-.66)/.06);
 const liquid=stage===0?.8*(1-local):stage===1?0:stage===2?local:1-.2*clamp01((local-.66)/.06);
 return {p,stage,local,point:along(circuit[stage],local),enthalpy,pressure,liquid};
}
export function energyBalance(cooling:number) {
 const c=clamp01(cooling);
 return {roomHeat:3*c,electricWork:c,outdoorHeat:4*c,indoorFanHeat:.1*(1-c)};
}
export function condensation(progress:number,cooling:number,humid:number) {
 // Qualitative amount only: a cooler coil can condense room-air vapor.
 // Dry comparison stays above its dew point; humidity is not a measured RH.
 return clamp01(cooling)*clamp01(humid)*clamp01(progress);
}
export function tracer(progress:number,offset=0):Point {
 const p=((progress+offset)%1+1)%1; return cycleState(p).point;
}
