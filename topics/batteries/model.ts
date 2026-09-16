export const clamp=(v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export interface BatteryState {used:number;remaining:number;conducting:boolean;current:number;work:number;heat:number;electronTravel:number;ionTravel:number;rotorAngle:number}
/** A bounded discharge illustration: values are not measured voltage, current or runtime. */
export function batteryState(used:number,closed:boolean):BatteryState{
 const p=clamp(used),remaining=1-p,conducting=closed&&remaining>1e-8;
 return {used:p,remaining,conducting,current:conducting?Math.min(1,remaining/.18):0,work:p*.65,heat:p*.35,electronTravel:p*2.4,ionTravel:p*2.2,rotorAngle:p*2160};
}
/** Opening a circuit cannot spend chemical energy; view changes never call this reducer. */
export function advanceDischarge(used:number,requested:number,closed:boolean){return closed?clamp(requested):clamp(used);}
export function carrierPosition(index:number,travel:number,count:number){return ((index/count+travel)%1+1)%1;}
