export function partition(rain:number,surface:number){
 const total=Math.max(0,Math.round(rain));
 const [infiltration,runoff]=[[.72,.18],[.24,.36],[.03,.67]][surface]??[.72,.18];
 const soaked=Math.round(total*infiltration!),flowed=Math.round(total*runoff!);
 return {total,soaked,flowed,stored:total-soaked-flowed};
}
