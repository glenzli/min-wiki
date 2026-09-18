export function partition(rain:number,surface:number){
 const total=Math.max(0,Math.round(rain));
 const [infiltration,runoff]=[[.72,.18],[.24,.36],[.03,.67]][surface]??[.72,.18];
 const soaked=Math.round(total*infiltration!),flowed=Math.round(total*runoff!);
 return {total,soaked,flowed,stored:total-soaked-flowed};
}

export type WaterRoute = 'soaked' | 'flowed' | 'stored';
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const q = clamp(x); return q * q * (3 - 2 * q); };
/** A closed batch of 100 symbolic parcels. Each one keeps its identity and destination. */
export function rainParcel(progress: number, index: number, surface: number) {
 const p = clamp(progress), allocation = partition(100, surface), rank = index * 37 % 100;
 const route: WaterRoute = rank < allocation.soaked ? 'soaked' : rank < allocation.soaked + allocation.flowed ? 'flowed' : 'stored';
 const x0 = 121 + (index % 9) * 66, groundY = 273 + (x0 - 70) / 656 * 9;
 const born = (index % 10) * .011 + Math.floor(index / 10) * .009;
 const fall = smooth((p - born) / .22), travel = clamp((p - born - .22) / .48);
 let x = x0, y = 119 - Math.floor(index / 10) * 4 + (groundY - 119 + Math.floor(index / 10) * 4) * fall;
 if (travel > 0 && route === 'soaked') {
  const f = smooth(travel);
  const depth=f * (41 + index % 7 * 19);
  x += poreOffset(depth,index%9);
  y = groundY + depth;
 } else if (travel > 0 && route === 'flowed') {
  const endX = 742 + rank % 7 * 8, endY = 467 - Math.floor(rank / 7) * 3;
  if (travel < .65) { const f = smooth(travel / .65); x = x0 + (758 - x0) * f; y = groundY + (291 - groundY) * f - Math.sin(f * Math.PI) * 8; }
  else { const f = smooth((travel - .65) / .35); x = 758 + (endX - 758) * f; y = 291 + (endY - 291) * f; }
 } else if (travel > 0) { x += smooth(travel) * 13; y = groundY - smooth(travel) * (2 + index % 3 * 2); }
 return { id: index, route, x, y, airborne: fall < 1, arrived: travel >= 1 };
}
export function rainJourney(progress: number, surface: number) {
 const parcels = Array.from({ length: 100 }, (_, i) => rainParcel(progress, i, surface));
 const counts = { total: 100, soaked: 0, flowed: 0, stored: 0, airborne: 0, collected: 0 };
 for (const parcel of parcels) {
  if (parcel.airborne) counts.airborne++; else counts[parcel.route]++;
  if (parcel.route === 'flowed' && parcel.arrived) counts.collected++;
 }
 return { parcels, ...counts };
}

export function poreOffset(depth:number,lane:number){return Math.sin(depth*Math.PI/(33+lane%3*5))*(6+lane%3*1.5)+Math.sin(depth*Math.PI/(18+lane%2*5))*2;}
