export interface Settings { distanceKm:number; temperature:number; }
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const soundSpeed=(temperature:number)=>331.3+.606*temperature;
export const thunderDelay=(distanceKm:number,temperature=20)=>Math.max(0,distanceKm)*1000*(1/soundSpeed(temperature)-1/299792458);
export function lightningState(progress:number,settings:Settings){
 const p=clamp(progress),leader=clamp((p-.3)/.27),returnStroke=clamp((p-.58)/.08),soundSeconds=Math.max(0,(p-.68)/.32*30);
 return {stage:p<.22?0:p<.46?1:p<.68?2:3,leader,returnStroke,soundSeconds,delay:thunderDelay(settings.distanceKm,settings.temperature),soundRadiusKm:soundSeconds*soundSpeed(settings.temperature)/1000,heard:p>=.68&&soundSeconds>=thunderDelay(settings.distanceKm,settings.temperature)};
}
/** A stable branching channel supports reversible scrubbing; points are teaching geometry, not electric-field solutions. */
export function leaderPath(){return Array.from({length:30},(_,i)=>{const u=i/29;return[-67+82*u+(i===0||i===29?0:Math.sin(i*12.9898)*17+Math.sin(i*5.2)*8),-94+u*235] as [number,number];});}
